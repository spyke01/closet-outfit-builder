import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import {
  resolveAiPolicy,
  maxTaskCostMicros,
  type AiTask,
} from "./ai-policy.ts";

export type AiDb = SupabaseClient;
export interface EdgeJob {
  id: string;
  created_at: string;
  user_id: string;
  task: AiTask;
  status: string;
  scope_key: string;
  worker_lease_until?: string | null;
  prediction_id: string | null;
  result_json: Record<string, unknown> | null;
}
export class PendingJob extends Error {
  constructor(public jobId: string) {
    super("Request is processing");
  }
}
export class GuardError extends Error {
  constructor(
    public code: string,
    public status = 429,
  ) {
    super(code);
  }
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function reserveJob(
  db: AiDb,
  input: {
    userId: string;
    task: AiTask;
    key: string;
    payload: unknown;
    scope?: string;
    model: string;
    retryParent?: string;
  },
): Promise<{ job: EdgeJob; created: boolean }> {
  const policy = resolveAiPolicy((key) => Deno.env.get(key));
  if (!policy.enabled && input.task !== "media_upload")
    throw new GuardError("AI_DISABLED", 503);
  if (!/^[\w:.-]{1,160}$/.test(input.key))
    throw new GuardError("VALIDATION_ERROR", 400);
  const { data, error } = await db.rpc("reserve_ai_job", {
    p_user_id: input.userId,
    p_task: input.task,
    p_key: input.key,
    p_hash: await sha256(JSON.stringify(input.payload)),
    p_scope: input.scope || "",
    p_provider: "replicate",
    p_model: input.model,
    p_max_cost_micros: maxTaskCostMicros(input.task, input.model),
    p_global_daily_micros: policy.globalDailyMicros,
    p_global_monthly_micros: policy.globalMonthlyMicros,
    p_user_monthly_micros: policy.userMonthlyMicros,
    p_max_inflight: policy.maxInflight,
    p_retry_parent: input.retryParent || null,
  });
  if (error || !data) throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
  if (!data.allowed)
    throw new GuardError(
      data.code || "AI_POLICY_UNAVAILABLE",
      data.code === "PLAN_REQUIRED" ? 403 : 429,
    );
  return { job: data.job as EdgeJob, created: Boolean(data.created) };
}
export async function readJob(
  db: AiDb,
  userId: string,
  id: string,
): Promise<EdgeJob> {
  const { data, error } = await db
    .from("ai_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new GuardError("NOT_FOUND", 404);
  return data as EdgeJob;
}
export async function updateJob(
  db: AiDb,
  job: EdgeJob,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from("ai_jobs")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("user_id", job.user_id);
  if (error) throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
}

/** Every phase has a CAS claim before POST. A lost HTTP response never causes
 * another POST for that phase; a known handle is resumed with GET. */
export async function runReplicatePhase(
  db: AiDb,
  initial: EdgeJob,
  phase: string,
  model: string,
  input: Record<string, unknown>,
  version?: string,
): Promise<string> {
  let job = await readJob(db, initial.user_id, initial.id);
  const meta = job.result_json || {};
  const outputs = (meta.outputs || {}) as Record<string, string>;
  if (outputs[phase]) return outputs[phase];
  let id = meta.phase === phase ? job.prediction_id : null;
  const token = Deno.env.get("REPLICATE_API_TOKEN");
  if (!token) throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
  if (!id) {
    if (meta.phase === phase)
      throw new GuardError("AMBIGUOUS_PROVIDER_REQUEST", 502);
    let claim = db
      .from("ai_jobs")
      .update({
        status: "processing",
        prediction_id: null,
        result_json: {
          ...meta,
          phase,
          phases: {
            ...((meta.phases || {}) as Record<string, unknown>),
            [phase]: {
              model,
              version: version || null,
              status: "submitting",
              startedAt: new Date().toISOString(),
            },
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("user_id", job.user_id)
      .in("status", ["reserved", "processing"]);
    claim =
      typeof meta.phase === "string"
        ? claim
            .eq("result_json->>phase", meta.phase)
            .eq("prediction_id", job.prediction_id)
        : claim.is("result_json->phase", null).is("prediction_id", null);
    const { data: claimed, error } = await claim.select("id").maybeSingle();
    if (error) throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
    if (!claimed) throw new PendingJob(job.id);
    const endpoint = version
      ? "https://api.replicate.com/v1/predictions"
      : `https://api.replicate.com/v1/models/${model}/predictions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=5",
        "Cancel-After": "60s",
      },
      body: JSON.stringify(version ? { version, input } : { input }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok)
      throw new GuardError(
        response.status === 429
          ? "UPSTREAM_RATE_LIMIT"
          : "UPSTREAM_UNAVAILABLE",
        502,
      );
    const prediction = await response.json();
    if (
      typeof prediction.id !== "string" ||
      !/^[\w-]{1,160}$/.test(prediction.id)
    )
      throw new GuardError("UPSTREAM_UNAVAILABLE", 502);
    id = prediction.id;
    job = await readJob(db, job.user_id, job.id);
    const phases = (job.result_json?.phases || {}) as Record<
      string,
      Record<string, unknown>
    >;
    await updateJob(db, job, {
      prediction_id: id,
      result_json: {
        ...job.result_json,
        phases: {
          ...phases,
          [phase]: {
            ...phases[phase],
            model,
            version: prediction.version || version || null,
            predictionId: id,
            status: "processing",
          },
        },
      },
    });
  }
  const until = Date.now() + 65_000;
  while (Date.now() < until) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${encodeURIComponent(id!)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      if (response.status >= 500) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      throw new GuardError("UPSTREAM_UNAVAILABLE", 502);
    }
    const prediction = await response.json();
    if (prediction.status === "succeeded") {
      const output = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;
      if (typeof output !== "string")
        throw new GuardError("INVALID_PROVIDER_OUTPUT", 502);
      const url = new URL(output);
      if (
        url.protocol !== "https:" ||
        !(
          url.hostname === "replicate.delivery" ||
          url.hostname.endsWith(".replicate.delivery")
        )
      )
        throw new GuardError("INVALID_PROVIDER_OUTPUT", 502);
      job = await readJob(db, job.user_id, job.id);
      const phases = (job.result_json?.phases || {}) as Record<
        string,
        Record<string, unknown>
      >;
      await updateJob(db, job, {
        result_json: {
          ...job.result_json,
          phases: {
            ...phases,
            [phase]: {
              ...phases[phase],
              model,
              version:
                prediction.version || version || phases[phase]?.version || null,
              predictionId: id,
              status: "succeeded",
              finishedAt: new Date().toISOString(),
              predictSeconds:
                typeof prediction.metrics?.predict_time === "number"
                  ? prediction.metrics.predict_time
                  : null,
            },
          },
          outputs: {
            ...((job.result_json?.outputs || {}) as Record<string, string>),
            [phase]: output,
          },
        },
      });
      return output;
    }
    if (["failed", "canceled"].includes(prediction.status)) {
      job = await readJob(db, job.user_id, job.id);
      const phases = (job.result_json?.phases || {}) as Record<
        string,
        Record<string, unknown>
      >;
      await updateJob(db, job, {
        result_json: {
          ...job.result_json,
          phases: {
            ...phases,
            [phase]: {
              ...phases[phase],
              model,
              predictionId: id,
              status: prediction.status,
              finishedAt: new Date().toISOString(),
            },
          },
        },
      });
      throw new GuardError("GENERATION_FAILED", 502);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new PendingJob(job.id);
}

export async function finishJob(
  db: AiDb,
  job: EdgeJob,
  result: Record<string, unknown>,
  errorCode?: string,
): Promise<void> {
  await updateJob(db, job, {
    status: errorCode ? "failed" : "succeeded",
    result_json: result,
    error_code: errorCode || null,
  });
}
export async function background(work: Promise<unknown>): Promise<boolean> {
  const runtime = (
    globalThis as unknown as {
      EdgeRuntime?: { waitUntil(work: Promise<unknown>): void };
    }
  ).EdgeRuntime;
  if (runtime) {
    runtime.waitUntil(work);
    return true;
  }
  await work;
  return false;
}

export async function claimWorker(db: AiDb, job: EdgeJob): Promise<boolean> {
  const now = new Date();
  let query = db
    .from("ai_jobs")
    .update({
      worker_lease_until: new Date(now.getTime() + 90_000).toISOString(),
    })
    .eq("id", job.id)
    .eq("user_id", job.user_id)
    .in("status", ["reserved", "processing"]);
  query = job.worker_lease_until
    ? query
        .eq("worker_lease_until", job.worker_lease_until)
        .lt("worker_lease_until", now.toISOString())
    : query.is("worker_lease_until", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
  return Boolean(data);
}
export async function boundedDownload(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
  });
  if (!response.ok || !response.body)
    throw new GuardError("IMAGE_DOWNLOAD_FAILED", 502);
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 5 * 1024 * 1024) {
      await reader.cancel();
      throw new GuardError("IMAGE_TOO_LARGE", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export function canResumeItemImage(
  item: { image_processing_job_id?: string | null; updated_at: string },
  job: Pick<EdgeJob, "id" | "created_at">,
): boolean {
  return (
    item.image_processing_job_id === job.id ||
    Date.parse(item.updated_at) <= Date.parse(job.created_at)
  );
}

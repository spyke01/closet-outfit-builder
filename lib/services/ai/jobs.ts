import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AI_PUBLIC_ERRORS,
  maxTaskCostMicros,
  resolveAiPolicy,
  type AiTask,
} from "./policy";

export interface AiJob {
  id: string;
  user_id: string;
  task: AiTask;
  provider: string;
  model: string;
  status: "reserved" | "processing" | "succeeded" | "failed" | "canceled";
  prediction_id: string | null;
  reserved_cost_micros: number;
  result_json: Record<string, unknown> | null;
  error_code: string | null;
  created_at: string;
  scope_key: string;
  worker_lease_until?: string | null;
}

export class AiJobError extends Error {
  constructor(
    public code: string,
    public status = 429,
  ) {
    super(AI_PUBLIC_ERRORS[code] || "The AI request could not be completed.");
  }
}

export function aiRequestHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function reserveAiJob(input: {
  userId: string;
  task: AiTask;
  key?: string;
  payload: unknown;
  scope?: string;
  provider: string;
  model: string;
  retryParent?: string;
}): Promise<{ job: AiJob; created: boolean }> {
  const policy = resolveAiPolicy((key) => process.env[key]);
  if (!policy.enabled) throw new AiJobError("AI_DISABLED", 503);
  const key = input.key || randomUUID();
  if (key.length > 160 || !/^[\w:.-]+$/.test(key))
    throw new AiJobError("IDEMPOTENCY_CONFLICT", 400);
  const { data, error } = await createAdminClient().rpc("reserve_ai_job", {
    p_user_id: input.userId,
    p_task: input.task,
    p_key: key,
    p_hash: aiRequestHash(input.payload),
    p_scope: input.scope || "",
    p_provider: input.provider,
    p_model: input.model,
    p_max_cost_micros: maxTaskCostMicros(input.task, input.model),
    p_global_daily_micros: policy.globalDailyMicros,
    p_global_monthly_micros: policy.globalMonthlyMicros,
    p_user_monthly_micros: policy.userMonthlyMicros,
    p_max_inflight: policy.maxInflight,
    p_retry_parent: input.retryParent || null,
  });
  if (error || !data) throw new AiJobError("AI_POLICY_UNAVAILABLE", 503);
  if (!data.allowed)
    throw new AiJobError(
      String(data.code || "AI_POLICY_UNAVAILABLE"),
      data.code === "PLAN_REQUIRED" ? 403 : 429,
    );
  return { job: data.job as AiJob, created: Boolean(data.created) };
}

export async function ownedAiJob(
  userId: string,
  id: string,
): Promise<AiJob | null> {
  const { data, error } = await createAdminClient()
    .from("ai_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new AiJobError("AI_POLICY_UNAVAILABLE", 503);
  return data as AiJob | null;
}

export async function aiJobByRequest(
  userId: string,
  task: AiTask,
  key: string,
): Promise<AiJob | null> {
  const { data, error } = await createAdminClient()
    .from("ai_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("task", task)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (error) throw new AiJobError("AI_POLICY_UNAVAILABLE", 503);
  return data as AiJob | null;
}

export async function recordAiPrediction(
  jobId: string,
  userId: string,
  predictionId: string,
  model: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("ai_jobs")
    .update({
      prediction_id: predictionId,
      model,
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .in("status", ["reserved", "processing"]);
  if (error) throw new AiJobError("AI_POLICY_UNAVAILABLE", 503);
}

export async function finishAiJob(
  jobId: string,
  userId: string,
  result: Record<string, unknown> | null,
  errorCode?: string,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("ai_jobs")
    .update({
      status: errorCode ? "failed" : "succeeded",
      result_json: result,
      error_code: errorCode || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId)
    .in("status", ["reserved", "processing"]);
  // A client timeout is not proof of zero provider cost. Keep the reservation
  // until reliable provider usage can be reconciled; never silently release it.
  if (error) throw new AiJobError("AI_POLICY_UNAVAILABLE", 503);
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import {
  handleCorsPreflightRequest,
  createCorsResponse,
} from "../_shared/cors.ts";
import {
  background,
  boundedDownload,
  claimWorker,
  finishJob,
  GuardError,
  PendingJob,
  readJob,
  reserveJob,
  runReplicatePhase,
  sha256,
  updateJob,
  type AiDb,
  type EdgeJob,
} from "../_shared/ai-guard.ts";
import { isBoundedClothingImage } from "../_shared/image-metadata.ts";

const bucket = "wardrobe-private-images";
const imageUrl = (path: string) =>
  "/api/clothing-images/" + path.split("/").map(encodeURIComponent).join("/");
function result(job: EdgeJob) {
  const meta = job.result_json || {};
  return {
    success: true,
    imageUrl:
      job.status === "succeeded" && meta.preparedImageUrl
        ? meta.preparedImageUrl
        : meta.originalImageUrl,
    originalImageUrl: meta.originalImageUrl,
    preparedImageUrl: meta.preparedImageUrl || null,
    bgRemovalStatus: meta.preparationUnavailable
      ? "failed"
      : job.status === "succeeded"
        ? "completed"
        : job.status === "failed"
          ? "failed"
          : "processing",
    jobId: job.id,
  };
}
async function prepare(db: AiDb, job: EdgeJob): Promise<void> {
  const meta = job.result_json || {};
  const { data: signed, error } = await db.storage
    .from(bucket)
    .createSignedUrl(String(meta.originalPath), 300);
  if (error || !signed?.signedUrl)
    throw new GuardError("IMAGE_UNAVAILABLE", 503);
  const rawModel =
    Deno.env.get("REPLICATE_BG_MODEL") || "851-labs/background-remover";
  const [model, embeddedVersion] = rawModel.split(":");
  if (model !== "851-labs/background-remover")
    throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
  let version = embeddedVersion || Deno.env.get("REPLICATE_BG_VERSION");
  if (!version) {
    const response = await fetch(
      `https://api.replicate.com/v1/models/${model}`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get("REPLICATE_API_TOKEN")}`,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) throw new GuardError("UPSTREAM_UNAVAILABLE", 502);
    version = (await response.json()).latest_version?.id;
    if (!version) throw new GuardError("UPSTREAM_UNAVAILABLE", 502);
  }
  const output = await runReplicatePhase(
    db,
    job,
    "cleanup",
    model,
    { image: signed.signedUrl, format: "png", background_type: "rgba" },
    version,
  );
  const bytes = await boundedDownload(output);
  if (!isBoundedClothingImage(bytes))
    throw new GuardError("INVALID_PROVIDER_OUTPUT", 502);
  const path = `${job.user_id}/prepared/${job.id}.png`;
  const { error: uploadError } = await db.storage
    .from(bucket)
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (uploadError) throw new GuardError("STORAGE_UNAVAILABLE", 503);
  const preparedImageUrl = imageUrl(path);
  const latest = await readJob(db, job.user_id, job.id);
  await finishJob(db, latest, { ...latest.result_json, preparedImageUrl });
  // A saved item can keep its original while a prepared candidate is reviewed.
  await db
    .from("wardrobe_items")
    .update({
      prepared_image_url: preparedImageUrl,
      bg_removal_status: "completed",
      bg_removal_completed_at: new Date().toISOString(),
    })
    .eq("user_id", job.user_id)
    .eq("image_processing_job_id", job.id);
}
serve(async (req: Request) => {
  const origin = req.headers.get("origin") || undefined;
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  const reply = (body: unknown, status = 200) =>
    createCorsResponse(
      JSON.stringify(body),
      { status, headers: { "Content-Type": "application/json" } },
      origin,
    );
  let db: AiDb | undefined, job: EdgeJob | undefined;
  try {
    if (req.method !== "POST")
      return reply({ success: false, error: "Method not allowed" }, 405);
    const url = Deno.env.get("SUPABASE_URL"),
      key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
    db = createClient(url, key);
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!bearer)
      return reply({ success: false, error: "Authentication required" }, 401);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(bearer);
    if (authError || !user)
      return reply({ success: false, error: "Authentication required" }, 401);
    if (req.headers.get("content-type")?.includes("application/json")) {
      const input = await req.json();
      if (typeof input.jobId !== "string")
        throw new GuardError("VALIDATION_ERROR", 400);
      job = await readJob(db, user.id, input.jobId);
      if (job.task !== "background_removal")
        throw new GuardError("NOT_FOUND", 404);
      if (["succeeded", "failed"].includes(job.status))
        return reply(result(job));
    } else {
      const form = await req.formData(),
        file = form.get("image");
      if (!(file instanceof File))
        throw new GuardError("VALIDATION_ERROR", 400);
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new GuardError("INVALID_IMAGE", 400);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isBoundedClothingImage(bytes))
        throw new GuardError("INVALID_IMAGE", 400);
      const itemId = form.get("itemId");
      if (itemId) {
        const { data: owned, error } = await db
          .from("wardrobe_items")
          .select("id")
          .eq("id", String(itemId))
          .eq("user_id", user.id)
          .maybeSingle();
        if (error || !owned) throw new GuardError("NOT_FOUND", 404);
      }
      const avatar = form.get("uploadType") === "avatar";
      let removeBackground =
        !avatar && form.get("removeBackground") !== "false";
      let preparationUnavailable = false;
      const hash = await sha256(bytes.buffer as ArrayBuffer),
        requestKey = String(
          form.get("requestId") ||
            req.headers.get("Idempotency-Key") ||
            crypto.randomUUID(),
        );
      if (removeBackground && !Deno.env.get("REPLICATE_API_TOKEN")) {
        removeBackground = false;
        preparationUnavailable = true;
      }
      let reserved;
      try {
        reserved = await reserveJob(db, {
          userId: user.id,
          task: removeBackground ? "background_removal" : "media_upload",
          key: requestKey,
          payload: { hash, removeBackground, avatar },
          scope: hash,
          model: removeBackground ? "851-labs/background-remover" : "none",
        });
      } catch (error) {
        if (
          !removeBackground ||
          !(error instanceof GuardError) ||
          ![
            "AI_DISABLED",
            "AI_BUDGET_EXCEEDED",
            "AI_USER_BUDGET_EXCEEDED",
            "USAGE_LIMIT_EXCEEDED",
            "BURST_LIMIT_EXCEEDED",
            "AI_BUSY",
          ].includes(error.code)
        )
          throw error;
        removeBackground = false;
        preparationUnavailable = true;
        reserved = await reserveJob(db, {
          userId: user.id,
          task: "media_upload",
          key: requestKey,
          payload: { hash, removeBackground: false, avatar },
          scope: hash,
          model: "none",
        });
      }
      job = reserved.job;
      if (!reserved.created && ["succeeded", "failed"].includes(job.status))
        return reply(result(job));
      if (!reserved.created) {
        if (!job.prediction_id) return reply(result(job), 202);
      } else {
        const extension =
          file.type === "image/jpeg"
            ? "jpg"
            : file.type === "image/png"
              ? "png"
              : "webp";
        const path = `${user.id}/original/${hash}.${extension}`;
        if (avatar) {
          // Avatars retain the established public URL behavior; clothing does not.
          const avatarPath = `avatars/${user.id}/${hash}.${extension}`;
          const { error } = await db.storage
            .from("wardrobe-images")
            .upload(avatarPath, bytes, {
              contentType: file.type,
              upsert: true,
            });
          if (error) throw new GuardError("STORAGE_UNAVAILABLE", 503);
          const avatarUrl = db.storage
            .from("wardrobe-images")
            .getPublicUrl(avatarPath).data.publicUrl;
          await finishJob(db, job, { originalImageUrl: avatarUrl });
          return reply({
            ...result({
              ...job,
              status: "succeeded",
              result_json: { originalImageUrl: avatarUrl },
            }),
            bgRemovalStatus: "completed",
          });
        }
        const { error } = await db.storage
          .from(bucket)
          .upload(path, bytes, { contentType: file.type, upsert: true });
        if (error) throw new GuardError("STORAGE_UNAVAILABLE", 503);
        job = {
          ...job,
          result_json: {
            originalPath: path,
            originalImageUrl: imageUrl(path),
            preparationUnavailable,
          },
        };
        await updateJob(db, job, { result_json: job.result_json });
        if (!removeBackground) {
          await finishJob(db, job, job.result_json!);
          return reply(result({ ...job, status: "succeeded" }));
        }
      }
    }
    const current = job!;
    const admin = db!;
    if (!(await claimWorker(admin, current)))
      return reply(result(current), 202);
    const work = prepare(admin, current).catch(async (error: unknown) => {
      if (
        error instanceof PendingJob ||
        error instanceof TypeError ||
        (error instanceof DOMException &&
          ["TimeoutError", "AbortError"].includes(error.name))
      )
        return;
      const latest = await readJob(admin, current.user_id, current.id);
      await finishJob(
        admin,
        latest,
        latest.result_json || {},
        error instanceof GuardError ? error.code : "PREPARATION_FAILED",
      );
      await admin
        .from("wardrobe_items")
        .update({
          bg_removal_status: "failed",
          bg_removal_completed_at: new Date().toISOString(),
        })
        .eq("user_id", current.user_id)
        .eq("image_processing_job_id", current.id);
    });
    const running = await background(work);
    const latest = running
      ? current
      : await readJob(admin, current.user_id, current.id);
    return reply(
      result(latest),
      ["succeeded", "failed"].includes(latest.status) ? 200 : 202,
    );
  } catch (error) {
    if (db && job)
      await finishJob(
        db,
        job,
        job.result_json || {},
        error instanceof GuardError ? error.code : "UPLOAD_FAILED",
      ).catch(() => undefined);
    return reply(
      {
        success: false,
        error:
          "The image could not be prepared. Your existing clothing is unchanged.",
        error_code: error instanceof GuardError ? error.code : "UPLOAD_FAILED",
      },
      error instanceof GuardError ? error.status : 500,
    );
  }
});

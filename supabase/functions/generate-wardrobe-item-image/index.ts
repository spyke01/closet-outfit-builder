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
  canResumeItemImage,
  finishJob,
  GuardError,
  PendingJob,
  readJob,
  reserveJob,
  runReplicatePhase,
  type AiDb,
  type EdgeJob,
} from "../_shared/ai-guard.ts";
import { buildWardrobeItemPrompt } from "../_shared/wardrobe-item-prompt-builder.ts";
import { isBoundedClothingImage } from "../_shared/image-metadata.ts";
import {
  resolveWardrobeImageModel,
  wardrobeImageInput,
} from "../_shared/wardrobe-image-model.ts";
async function generate(
  db: AiDb,
  job: EdgeJob,
  prompt: string,
  itemId: string,
) {
  const generated = await runReplicatePhase(
    db,
    job,
    "generate",
    job.model,
    wardrobeImageInput(job.model, prompt),
  );
  let version = Deno.env.get("REPLICATE_BG_VERSION");
  if (!version) {
    const response = await fetch(
      "https://api.replicate.com/v1/models/851-labs/background-remover",
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get("REPLICATE_API_TOKEN")}`,
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new GuardError("UPSTREAM_UNAVAILABLE", 502);
    version = (await response.json()).latest_version?.id;
  }
  if (!version) throw new GuardError("UPSTREAM_UNAVAILABLE", 502);
  const cutout = await runReplicatePhase(
    db,
    job,
    "cleanup",
    "851-labs/background-remover",
    { image: generated, format: "png", background_type: "rgba" },
    version,
  );
  const bytes = await boundedDownload(cutout);
  if (!isBoundedClothingImage(bytes))
    throw new GuardError("INVALID_PROVIDER_OUTPUT", 502);
  const path = `${job.user_id}/generated/${job.id}.png`;
  const { error } = await db.storage
    .from("wardrobe-private-images")
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (error) throw new GuardError("STORAGE_UNAVAILABLE", 503);
  const image_url = "/api/clothing-images/" + path;
  const { data: savedItem, error: saveError } = await db
    .from("wardrobe_items")
    .update({
      image_url,
      bg_removal_status: "completed",
      bg_removal_completed_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", job.user_id)
    .eq("image_processing_job_id", job.id)
    .select("id")
    .maybeSingle();
  if (!savedItem && !saveError) throw new GuardError("ITEM_CHANGED", 409);
  if (saveError) throw new GuardError("SAVE_FAILED", 503);
  const latest = await readJob(db, job.user_id, job.id);
  await finishJob(db, latest, { ...latest.result_json, image_url });
  const { error: logError } = await db.from("generation_log").insert({
    user_id: job.user_id,
    wardrobe_item_id: itemId,
    model_used: job.model,
    status: "success",
    is_retry: false,
    prompt_text: prompt,
  });
  if (logError)
    console.warn("Generation audit write failed", { jobId: job.id });
}
serve(async (req: Request) => {
  const origin = req.headers.get("origin") || undefined,
    preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const reply = (value: unknown, status = 200) =>
    createCorsResponse(
      JSON.stringify(value),
      { status, headers: { "Content-Type": "application/json" } },
      origin,
    );
  try {
    if (req.method !== "POST")
      return reply({ success: false, error: "Method not allowed" }, 405);
    const url = Deno.env.get("SUPABASE_URL"),
      key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !Deno.env.get("REPLICATE_API_TOKEN"))
      throw new GuardError("AI_POLICY_UNAVAILABLE", 503);
    const db = createClient(url, key),
      token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token)
      return reply({ success: false, error: "Authentication required" }, 401);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user)
      return reply({ success: false, error: "Authentication required" }, 401);
    const input = await req.json();
    if (input.jobId) {
      const existing = await readJob(db, user.id, String(input.jobId));
      if (existing.task !== "wardrobe_image")
        throw new GuardError("NOT_FOUND", 404);
      input.wardrobe_item_id = existing.scope_key;
      input.requestId = undefined;
    }
    if (
      typeof input.wardrobe_item_id !== "string" ||
      !/^[-a-f0-9]{36}$/i.test(input.wardrobe_item_id)
    )
      throw new GuardError("VALIDATION_ERROR", 400);
    const { data: item, error } = await db
      .from("wardrobe_items")
      .select(
        "id,name,color,brand,material,image_url,original_image_url,image_processing_job_id,updated_at,category:categories(name)",
      )
      .eq("id", input.wardrobe_item_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !item) throw new GuardError("NOT_FOUND", 404);
    if (!item.color) throw new GuardError("MISSING_ITEM_DATA", 400);
    // Derive the request from the owned row; do not accept arbitrary paid prompts.
    const prompt = buildWardrobeItemPrompt({
      name: String(item.name).slice(0, 100),
      category: String(
        (item.category as { name?: string })?.name || "Clothing",
      ),
      color: String(item.color).slice(0, 50),
      brand: String(item.brand || "").slice(0, 80),
      material: String(item.material || "").slice(0, 80),
    });
    const model = resolveWardrobeImageModel(
      Deno.env.get("REPLICATE_WARDROBE_MODEL"),
    );
    let retryParent: string | undefined;
    if (input.is_retry) {
      const { data: parent } = await db
        .from("ai_jobs")
        .select("id")
        .eq("user_id", user.id)
        .eq("task", "wardrobe_image")
        .eq("scope_key", item.id)
        .eq("status", "succeeded")
        .is("retry_parent_id", null)
        .gte("created_at", new Date(Date.now() - 300000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!parent) throw new GuardError("RETRY_LIMIT_EXCEEDED");
      retryParent = parent.id;
    }
    const reservation = input.jobId
      ? { job: await readJob(db, user.id, String(input.jobId)), created: false }
      : await reserveJob(db, {
          userId: user.id,
          task: "wardrobe_image",
          key: String(input.requestId || crypto.randomUUID()),
          payload: {
            itemId: item.id,
            prompt,
            isRetry: Boolean(input.is_retry),
          },
          scope: item.id,
          model,
          retryParent,
        });
    const { job } = reservation;
    if (!canResumeItemImage(item, job)) {
      if (!["succeeded", "failed"].includes(job.status))
        await finishJob(db, job, job.result_json || {}, "ITEM_CHANGED");
      throw new GuardError("ITEM_CHANGED", 409);
    }
    if (job.status === "succeeded")
      return reply({ success: true, ...job.result_json, job_id: job.id });
    if (job.status === "failed")
      return reply(
        {
          success: false,
          error: "Image generation could not finish.",
          error_code: "GENERATION_FAILED",
        },
        502,
      );
    if (!(await claimWorker(db, job)))
      return reply(
        { success: true, pending: true, job_id: job.id, image_url: "" },
        202,
      );
    const { data: claimedItem, error: claimError } = await db
      .from("wardrobe_items")
      .update({
        image_processing_job_id: job.id,
        original_image_url: item.original_image_url || item.image_url || null,
        prepared_image_url: null,
        bg_removal_status: "processing",
        bg_removal_started_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", user.id)
      .eq("updated_at", item.updated_at)
      .select("id")
      .maybeSingle();
    if (claimError || !claimedItem) {
      await finishJob(db, job, job.result_json || {}, "ITEM_CHANGED");
      throw new GuardError("ITEM_CHANGED", 409);
    }
    const work = generate(db, job, prompt, item.id).catch(
      async (error: unknown) => {
        if (
          error instanceof PendingJob ||
          error instanceof TypeError ||
          (error instanceof DOMException &&
            ["TimeoutError", "AbortError"].includes(error.name))
        )
          return;
        const latest = await readJob(db, user.id, job.id);
        await finishJob(
          db,
          latest,
          latest.result_json || {},
          error instanceof GuardError ? error.code : "GENERATION_FAILED",
        );
        await db
          .from("wardrobe_items")
          .update({
            bg_removal_status: "failed",
            bg_removal_completed_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("user_id", user.id)
          .eq("image_processing_job_id", job.id);
      },
    );
    const running = await background(work);
    if (!running) {
      const latest = await readJob(db, user.id, job.id);
      if (latest.status === "succeeded")
        return reply({ success: true, ...latest.result_json, job_id: job.id });
    }
    return reply(
      { success: true, pending: true, job_id: job.id, image_url: "" },
      202,
    );
  } catch (error) {
    const code = error instanceof GuardError ? error.code : "GENERATION_FAILED";
    return reply(
      {
        success: false,
        error: "The image request could not be completed.",
        error_code: code,
      },
      error instanceof GuardError ? error.status : 500,
    );
  }
});

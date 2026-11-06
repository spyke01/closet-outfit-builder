import { boundedJson, RequestBodyError } from "@/lib/utils/bounded-request";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserEntitlements } from "@/lib/services/billing/entitlements";
import {
  buildSebastianSystemPrompt,
  SEBASTIAN_REFUSAL_TEMPLATES,
} from "@/lib/services/assistant/persona";
import { AssistantChatRequestSchema } from "@/lib/services/assistant/types";
import {
  buildAssistantContextPack,
  summarizeContextForPrompt,
} from "@/lib/services/assistant/context-builder";
import {
  moderateInput,
  moderateOutput,
} from "@/lib/services/assistant/moderation";
import { resolveAssistantConfig } from "@/lib/services/assistant/provider";
import { aiJobByRequest, AiJobError } from "@/lib/services/ai/jobs";
import {
  assistantJobOutput,
  startAssistantJob,
  waitForAssistantJob,
} from "@/lib/services/ai/assistant-job";
import { signOwnedImage } from "@/lib/services/ai/owned-image";
import { requireSameOrigin } from "@/lib/utils/request-security";
import { mapPublicAiError } from "@/lib/utils/public-ai-errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const started = Date.now();
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    const parsed = AssistantChatRequestSchema.safeParse(
      await boundedJson(request),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid request payload", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    const input = parsed.data;
    const entitlements = await resolveUserEntitlements(supabase, user.id);
    if (entitlements.effectivePlanCode === "free")
      return NextResponse.json(
        {
          error: "Sebastian is available on Plus and Pro.",
          code: "PLAN_REQUIRED",
        },
        { status: 403 },
      );
    const requestKey = input.requestId || randomUUID();
    const task = input.imageUrl ? "assistant_vision" : "assistant_text";
    const previous = input.requestId
      ? await aiJobByRequest(user.id, task, requestKey)
      : null;
    const admin = createAdminClient();
    let threadId = input.threadId || previous?.scope_key || null;
    if (threadId) {
      const { data: thread, error } = await supabase
        .from("assistant_threads")
        .select("id")
        .eq("id", threadId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !thread)
        return NextResponse.json(
          { error: "Thread not found", code: "THREAD_NOT_FOUND" },
          { status: 404 },
        );
    } else {
      const { data, error } = await supabase
        .from("assistant_threads")
        .insert({ user_id: user.id, title: input.message.slice(0, 80) })
        .select("id")
        .single();
      if (error || !data) throw new Error("Unable to create conversation");
      threadId = data.id;
    }
    const { data: messages, error: historyError } = await supabase
      .from("assistant_messages")
      .select("role,content")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);
    if (historyError) throw new Error("Unable to load conversation");
    const history = [...(messages || [])].reverse() as Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }>;
    const safety = moderateInput(input.message, input.imageUrl);
    const storeMessage = async (
      role: "user" | "assistant",
      content: string,
      metadata: Record<string, unknown>,
    ) => {
      const { error } = await admin.from("assistant_messages").upsert(
        {
          user_id: user.id,
          thread_id: threadId,
          role,
          content,
          request_key: requestKey,
          image_url: role === "user" ? input.imageUrl || null : null,
          metadata_json: metadata,
        },
        { onConflict: "user_id,thread_id,role,request_key" },
      );
      if (error) throw new Error("Unable to save conversation");
    };
    if (safety.blocked) {
      const reply =
        safety.safeReply || SEBASTIAN_REFUSAL_TEMPLATES.safetyBlocked;
      await storeMessage("user", input.message, { safety_flags: safety.flags });
      await storeMessage("assistant", reply, { blocked: true });
      return NextResponse.json({ threadId, assistantMessage: reply });
    }
    let imageUrl: string | undefined;
    if (input.imageUrl) {
      try {
        imageUrl = await signOwnedImage(input.imageUrl, user.id);
      } catch {
        return NextResponse.json(
          {
            error: "Choose an image uploaded to your account.",
            code: "VALIDATION_ERROR",
          },
          { status: 400 },
        );
      }
    }
    const { pack } = await buildAssistantContextPack(supabase, user.id, input);
    const config = resolveAssistantConfig();
    let job = await startAssistantJob({
      userId: user.id,
      task,
      key: requestKey,
      scope: threadId || "",
      payload: {
        message: input.message,
        imageUrl: input.imageUrl || null,
        contextHints: input.contextHints || null,
      },
      providerInput: {
        model: config.defaultModel,
        systemPrompt: buildSebastianSystemPrompt(),
        userPrompt: `${input.message}\n\nContext:\n${summarizeContextForPrompt(pack)}`,
        context: pack,
        history,
        imageUrl,
      },
    });
    if (job.scope_key) threadId = job.scope_key;
    await storeMessage("user", input.message, {});
    if (job.status === "processing")
      job = await waitForAssistantJob(job, input.imageUrl ? 0 : 18_000);
    const output = assistantJobOutput(job);
    if (job.status === "failed")
      return NextResponse.json(
        {
          error:
            "Sebastian could not complete this request. Please try again later.",
          code: "UPSTREAM_UNAVAILABLE",
        },
        { status: 503 },
      );
    const outputSafety = output ? moderateOutput(output.text) : null;
    const reply = output
      ? outputSafety?.blocked
        ? outputSafety.safeReply || SEBASTIAN_REFUSAL_TEMPLATES.outOfScope
        : output.text
      : "I’m working on your request. You can keep this conversation open.";
    await storeMessage("assistant", reply, {
      job_id: job.id,
      pending: !output,
      model: job.model,
      reserved_usage: true,
    });
    if (output) {
      const { error } = await admin.from("assistant_inference_events").upsert(
        {
          job_id: job.id,
          user_id: user.id,
          thread_id: threadId,
          provider: job.provider,
          model: output.model,
          status: outputSafety?.blocked ? "blocked" : "succeeded",
          latency_ms: Date.now() - started,
          input_tokens: output.inputTokens,
          output_tokens: output.outputTokens,
        },
        { onConflict: "job_id" },
      );
      if (error) throw new Error("Unable to save inference event");
    }
    return NextResponse.json({
      threadId,
      assistantMessage: reply,
      pending: !output,
      jobId: job.id,
      requestId: requestKey,
    });
  } catch (error) {
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    if (error instanceof AiJobError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    const mapped = mapPublicAiError(
      error instanceof Error ? error.message : "",
    );
    return NextResponse.json(
      { error: mapped.error, code: mapped.code },
      { status: mapped.status },
    );
  }
}

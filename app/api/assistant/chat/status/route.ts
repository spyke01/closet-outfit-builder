import { boundedJson, RequestBodyError } from "@/lib/utils/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownedAiJob, AiJobError } from "@/lib/services/ai/jobs";
import {
  assistantJobOutput,
  refreshAssistantJob,
} from "@/lib/services/ai/assistant-job";
import { moderateOutput } from "@/lib/services/assistant/moderation";
import { SEBASTIAN_REFUSAL_TEMPLATES } from "@/lib/services/assistant/persona";
import { requireSameOriginWithOptions } from "@/lib/utils/request-security";

export const dynamic = "force-dynamic";
const Schema = z.object({ threadId: z.string().uuid() });
export async function POST(request: NextRequest) {
  const originError = requireSameOriginWithOptions(request, {
    mode: "enforce",
    reasonTag: "assistant-status",
  });
  if (originError) return originError;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const parsed = Schema.safeParse(await boundedJson(request));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    const threadId = parsed.data.threadId;
    const { data: thread } = await supabase
      .from("assistant_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!thread)
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    const { data: message, error } = await supabase
      .from("assistant_messages")
      .select("id,content,metadata_json")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .eq("role", "assistant")
      .contains("metadata_json", { pending: true })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("Unable to load conversation");
    if (!message) {
      const { data: latest } = await supabase
        .from("assistant_messages")
        .select("content")
        .eq("thread_id", threadId)
        .eq("user_id", user.id)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return NextResponse.json({
        threadId,
        pending: false,
        assistantMessage: latest?.content,
      });
    }
    const metadata = message.metadata_json || {};
    // Pre-migration metadata was client-writable. Never use an old raw provider
    // handle as authorization to read an inference result.
    if (typeof metadata.job_id !== "string")
      return NextResponse.json({
        threadId,
        pending: false,
        assistantMessage: "Please send that request again to continue.",
      });
    const owned = await ownedAiJob(user.id, metadata.job_id);
    if (
      !owned ||
      owned.scope_key !== threadId ||
      !["assistant_text", "assistant_vision"].includes(owned.task)
    )
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const job = await refreshAssistantJob(owned);
    const output = assistantJobOutput(job);
    if (!output && job.status !== "failed")
      return NextResponse.json({ threadId, pending: true });
    const safety = output ? moderateOutput(output.text) : null;
    const reply = output
      ? safety?.blocked
        ? safety.safeReply || SEBASTIAN_REFUSAL_TEMPLATES.outOfScope
        : output.text
      : "I couldn’t complete that request. Please try again later.";
    const { error: writeError } = await createAdminClient()
      .from("assistant_messages")
      .update({
        content: reply,
        metadata_json: {
          ...metadata,
          pending: false,
          blocked: safety?.blocked || false,
        },
      })
      .eq("id", message.id)
      .eq("user_id", user.id);
    if (writeError) throw new Error("Unable to save conversation");
    if (output) {
      const { error: auditError } = await createAdminClient()
        .from("assistant_inference_events")
        .upsert(
          {
            job_id: job.id,
            user_id: user.id,
            thread_id: threadId,
            provider: job.provider,
            model: output.model,
            status: safety?.blocked ? "blocked" : "succeeded",
            input_tokens: output.inputTokens,
            output_tokens: output.outputTokens,
          },
          { onConflict: "job_id" },
        );
      if (auditError) throw new Error("Unable to save inference event");
    }
    return NextResponse.json({
      threadId,
      pending: false,
      assistantMessage: reply,
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
    return NextResponse.json(
      { error: "This request is temporarily unavailable." },
      { status: 503 },
    );
  }
}

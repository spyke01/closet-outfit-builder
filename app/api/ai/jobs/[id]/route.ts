import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ownedAiJob } from "@/lib/services/ai/jobs";
import { refreshAssistantJob } from "@/lib/services/ai/assistant-job";
import {
  ADMIN_IMPERSONATION_COOKIE,
  parseImpersonationToken,
} from "@/lib/services/admin/impersonation";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const { id } = await context.params;
    if (!/^[a-f0-9-]{36}$/i.test(id))
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    let job = await ownedAiJob(user.id, id);
    if (!job)
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const readOnly = Boolean(
      parseImpersonationToken(
        request.cookies.get(ADMIN_IMPERSONATION_COOKIE)?.value,
      ),
    );
    if (
      !readOnly &&
      ["assistant_text", "assistant_vision", "today_outfit"].includes(job.task)
    )
      job = await refreshAssistantJob(job);
    if (
      !readOnly &&
      ["background_removal", "wardrobe_image"].includes(job.task) &&
      ["reserved", "processing"].includes(job.status) &&
      (!job.worker_lease_until ||
        new Date(job.worker_lease_until).getTime() < Date.now())
    ) {
      // The Edge worker claims a lease and resumes stored predictions; it never
      // reserves a new paid operation for a status request.
      await supabase.functions.invoke(
        job.task === "background_removal"
          ? "process-image"
          : "generate-wardrobe-item-image",
        { body: { jobId: job.id } },
      );
      job = (await ownedAiJob(user.id, id)) || job;
    }
    const safeResult = Object.fromEntries(
      Object.entries(job.result_json || {}).filter(([key]) =>
        [
          "text",
          "model",
          "inputTokens",
          "outputTokens",
          "image_url",
          "originalImageUrl",
          "preparedImageUrl",
        ].includes(key),
      ),
    );
    return NextResponse.json(
      {
        id: job.id,
        status: job.status,
        result: job.status === "succeeded" ? safeResult : null,
        errorCode: job.error_code,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Request status is temporarily unavailable." },
      { status: 503 },
    );
  }
}

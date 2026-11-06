"use server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySession } from "./auth";
import { GenerateWardrobeItemImageRequestSchema } from "@/lib/schemas";
import { resolveUserEntitlements } from "@/lib/services/billing/entitlements";

type GenerateResult =
  | {
      success: true;
      image_url: string;
      pending?: boolean;
      job_id?: string;
      quota_remaining: { monthly: number; hourly: number };
    }
  | { success: false; error: string; error_code: string };
export async function generateWardrobeItemImage(input: {
  wardrobe_item_id: string;
  is_retry?: boolean;
  request_id?: string;
}): Promise<GenerateResult> {
  try {
    const user = await verifySession(),
      validated = GenerateWardrobeItemImageRequestSchema.parse(input),
      supabase = await createClient();
    const { data: item, error } = await supabase
      .from("wardrobe_items")
      .select("id")
      .eq("id", validated.wardrobe_item_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !item)
      return {
        success: false,
        error: "Clothing item not found.",
        error_code: "NOT_FOUND",
      };
    const { data, error: invokeError } = await supabase.functions.invoke(
      "generate-wardrobe-item-image",
      {
        body: {
          wardrobe_item_id: item.id,
          requestId: input.request_id || randomUUID(),
          is_retry: validated.is_retry,
        },
      },
    );
    if (invokeError || !data?.success)
      return {
        success: false,
        error: "The image could not be generated. Please try again later.",
        error_code: data?.error_code || "GENERATION_FAILED",
      };
    const quota = await getImageGenerationQuota();
    return {
      success: true,
      image_url: data.image_url || "",
      pending: Boolean(data.pending),
      job_id: data.job_id,
      quota_remaining: {
        monthly: quota.success ? quota.limits.monthly_remaining : 0,
        hourly: quota.success ? quota.limits.hourly_remaining : 0,
      },
    };
  } catch {
    return {
      success: false,
      error: "The image request is temporarily unavailable.",
      error_code: "GENERATION_FAILED",
    };
  }
}
export async function getImageGenerationQuota() {
  try {
    const user = await verifySession(),
      supabase = await createClient(),
      entitlements = await resolveUserEntitlements(supabase, user.id);
    const limit = entitlements.plan.limits.ai_image_generations_monthly;
    const { count, error } = await createAdminClient()
      .from("ai_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString())
      .not("task", "in", "(background_removal,media_upload)");
    if (error) throw new Error("Usage unavailable");
    return {
      success: true as const,
      tier: entitlements.effectivePlanCode,
      limits: {
        monthly_limit: limit,
        monthly_remaining: Math.max(
          0,
          limit - (entitlements.usage.ai_wardrobe_image_generations || 0),
        ),
        monthly_reset_at: entitlements.period.end.toISOString(),
        hourly_limit: entitlements.plan.limits.ai_burst_per_hour,
        hourly_remaining: Math.max(
          0,
          entitlements.plan.limits.ai_burst_per_hour - (count || 0),
        ),
      },
    };
  } catch {
    return {
      success: false as const,
      error: "Image usage is temporarily unavailable.",
    };
  }
}

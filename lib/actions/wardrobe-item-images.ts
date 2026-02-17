'use server';

import { createClient } from '@/lib/supabase/server';
import { verifySession, verifyOwnership } from './auth';
import { GenerateWardrobeItemImageRequestSchema } from '@/lib/schemas';
import {
  resolveUserEntitlements,
  canUseFeature,
  isUsageExceeded,
  incrementUsageCounter,
  getAiBurstHourKey,
} from '@/lib/services/billing/entitlements';
import { buildWardrobeItemPrompt } from '@/lib/utils/wardrobe-item-prompt-builder';

const HOURLY_BURST_LIMIT = 5;

interface GenerateSuccess {
  success: true;
  image_url: string;
  quota_remaining: { monthly: number; hourly: number };
}

interface GenerateFailure {
  success: false;
  error: string;
  error_code: string;
}

type GenerateResult = GenerateSuccess | GenerateFailure;

interface QuotaSuccess {
  success: true;
  tier: string;
  limits: {
    monthly_limit: number;
    monthly_remaining: number;
    monthly_reset_at: string;
    hourly_limit: number;
    hourly_remaining: number;
  };
}

interface QuotaFailure {
  success: false;
  error: string;
}

type QuotaResult = QuotaSuccess | QuotaFailure;

async function getHourlyBurstCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  burstKey: string,
): Promise<number> {
  const { data } = await supabase
    .from('usage_counters')
    .select('count')
    .eq('user_id', userId)
    .eq('metric_key', burstKey)
    .eq('period_key', burstKey)
    .maybeSingle();

  return (data as { count?: number } | null)?.count ?? 0;
}

async function extractFunctionInvokeError(error: unknown): Promise<{ message: string; code?: string }> {
  if (!error || typeof error !== 'object') {
    return { message: 'Image generation failed' };
  }

  const fallbackMessage = typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : 'Image generation failed';

  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) {
    return { message: fallbackMessage };
  }

  try {
    const payload = await context.clone().json() as { error?: unknown; error_code?: unknown };
    const message = typeof payload.error === 'string' && payload.error.trim().length > 0
      ? payload.error
      : fallbackMessage;
    const code = typeof payload.error_code === 'string' ? payload.error_code : undefined;
    return { message, code };
  } catch {
    return { message: fallbackMessage };
  }
}

export async function generateWardrobeItemImage(input: {
  wardrobe_item_id: string;
  is_retry?: boolean;
}): Promise<GenerateResult> {
  try {
    // 1. Authenticate
    const user = await verifySession();

    // 2. Validate input
    const validated = GenerateWardrobeItemImageRequestSchema.parse(input);

    // 3. Create DB client
    const supabase = await createClient();

    // 4. Fetch wardrobe item and verify ownership
    const { data: item, error: itemError } = await supabase
      .from('wardrobe_items')
      .select('id, user_id, name, color, brand, material, category_id, category:categories(id, name)')
      .eq('id', validated.wardrobe_item_id)
      .single();

    if (itemError || !item) {
      return { success: false, error: 'Wardrobe item not found', error_code: 'NOT_FOUND' };
    }

    await verifyOwnership(user.id, (item as { user_id: string }).user_id);

    // 5. Resolve entitlements
    const entitlements = await resolveUserEntitlements(supabase, user.id);

    // 6. Check feature availability (free tier gate)
    if (!canUseFeature(entitlements, 'ai_image_generation')) {
      return {
        success: false,
        error: 'AI image generation is not available on your plan. Upgrade to Plus or Pro.',
        error_code: 'FEATURE_NOT_AVAILABLE',
      };
    }

    // 7. Check monthly quota (skip if retry within window)
    if (!validated.is_retry) {
      if (isUsageExceeded(entitlements, 'ai_wardrobe_image_generations')) {
        return {
          success: false,
          error: 'Monthly image generation limit reached. Upgrade your plan or wait until next period.',
          error_code: 'USAGE_LIMIT_EXCEEDED',
        };
      }

      // 8. Check hourly burst limit
      const burstKey = getAiBurstHourKey();
      const hourlyCount = await getHourlyBurstCount(supabase, user.id, burstKey);
      if (hourlyCount >= HOURLY_BURST_LIMIT) {
        return {
          success: false,
          error: 'Hourly generation limit reached. Try again later.',
          error_code: 'BURST_LIMIT_EXCEEDED',
        };
      }
    } else {
      // Verify retry is within 5-minute window
      const { data: recentLog } = await supabase
        .from('generation_log')
        .select('created_at')
        .eq('wardrobe_item_id', validated.wardrobe_item_id)
        .eq('user_id', user.id)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentLog) {
        return {
          success: false,
          error: 'No recent generation found to retry.',
          error_code: 'RETRY_WINDOW_EXPIRED',
        };
      }

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (new Date((recentLog as { created_at: string }).created_at) < fiveMinutesAgo) {
        return {
          success: false,
          error: 'Free retry window has expired (5 minutes).',
          error_code: 'RETRY_WINDOW_EXPIRED',
        };
      }
    }

    // 9. Validate item has required data (category + color)
    const typedItem = item as unknown as {
      id: string;
      user_id: string;
      name: string;
      color: string | null;
      brand: string | null;
      material: string | null;
      category_id: string;
      category: { id: string; name: string } | null;
    };

    if (!typedItem.color || !typedItem.category) {
      return {
        success: false,
        error: 'Item must have a color and category to generate an image.',
        error_code: 'MISSING_ITEM_DATA',
      };
    }

    // 10. Build prompt
    const prompt = buildWardrobeItemPrompt({
      name: typedItem.name,
      category: typedItem.category.name,
      color: typedItem.color,
      brand: typedItem.brand ?? undefined,
      material: typedItem.material ?? undefined,
    });

    // 11. Mark item as actively generating so UI can show processing state.
    await supabase
      .from('wardrobe_items')
      .update({
        bg_removal_status: 'processing',
        bg_removal_started_at: new Date().toISOString(),
        bg_removal_completed_at: null,
      })
      .eq('id', validated.wardrobe_item_id)
      .eq('user_id', user.id);

    // 12. Invoke Edge Function
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'generate-wardrobe-item-image',
      {
        body: {
          wardrobe_item_id: validated.wardrobe_item_id,
          user_id: user.id,
          prompt,
        },
      },
    );

    const fnResult = fnData as {
      success: boolean;
      image_url?: string;
      generation_duration_ms?: number;
      cost_cents?: number;
      error?: string;
      error_code?: string;
    } | null;

    if (fnError || !fnResult?.success || !fnResult?.image_url) {
      const invokeError = fnError ? await extractFunctionInvokeError(fnError) : null;
      const errorMessage = invokeError?.message ?? fnResult?.error ?? 'Image generation failed';

      // Log failure (quota NOT incremented)
      await supabase.from('generation_log').insert({
        user_id: user.id,
        wardrobe_item_id: validated.wardrobe_item_id,
        model_used: 'google-deepmind/imagen-4',
        prompt_text: prompt,
        status: 'failed',
        error_message: errorMessage,
        is_retry: validated.is_retry,
      });

      await supabase
        .from('wardrobe_items')
        .update({
          bg_removal_status: 'failed',
          bg_removal_completed_at: new Date().toISOString(),
        })
        .eq('id', validated.wardrobe_item_id)
        .eq('user_id', user.id);

      return {
        success: false,
        error: errorMessage,
        error_code: invokeError?.code ?? fnResult?.error_code ?? 'GENERATION_FAILED',
      };
    }

    // 13. Update wardrobe_items.image_url and mark generation complete.
    const { error: updateError } = await supabase
      .from('wardrobe_items')
      .update({
        image_url: fnResult.image_url,
        bg_removal_status: 'completed',
        bg_removal_completed_at: new Date().toISOString(),
      })
      .eq('id', validated.wardrobe_item_id)
      .eq('user_id', user.id);

    if (updateError) {
      return {
        success: false,
        error: 'Failed to save generated image to item.',
        error_code: 'DB_UPDATE_FAILED',
      };
    }

    // 14. Increment usage (skip if retry)
    if (!validated.is_retry) {
      await incrementUsageCounter(
        supabase,
        user.id,
        'ai_wardrobe_image_generations',
        entitlements.period,
      );

      // Also track hourly burst
      const burstKey = getAiBurstHourKey();
      await supabase.from('usage_counters').upsert(
        {
          user_id: user.id,
          metric_key: burstKey,
          period_key: burstKey,
          period_start_at: new Date().toISOString(),
          period_end_at: new Date(Date.now() + 3600_000).toISOString(),
          count: 1,
        },
        { onConflict: 'user_id,metric_key,period_key', ignoreDuplicates: false },
      );
    }

    // 15. Log success
    await supabase.from('generation_log').insert({
      user_id: user.id,
      wardrobe_item_id: validated.wardrobe_item_id,
      model_used: 'google-deepmind/imagen-4',
      prompt_text: prompt,
      status: 'success',
      api_response_time_ms: fnResult.generation_duration_ms ?? null,
      cost_cents: fnResult.cost_cents ?? null,
      is_retry: validated.is_retry,
    });

    // 16. Calculate remaining quota
    const monthlyUsed = (entitlements.usage['ai_wardrobe_image_generations'] ?? 0) + (validated.is_retry ? 0 : 1);
    const monthlyLimit = entitlements.plan.limits.ai_image_generations_monthly;
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);

    return {
      success: true,
      image_url: fnResult.image_url,
      quota_remaining: {
        monthly: monthlyRemaining,
        hourly: HOURLY_BURST_LIMIT - 1, // conservative estimate
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      error_code: 'INTERNAL_ERROR',
    };
  }
}

export async function getImageGenerationQuota(): Promise<QuotaResult> {
  try {
    const user = await verifySession();
    const supabase = await createClient();
    const entitlements = await resolveUserEntitlements(supabase, user.id);

    const monthlyUsed = entitlements.usage['ai_wardrobe_image_generations'] ?? 0;
    const monthlyLimit = entitlements.plan.limits.ai_image_generations_monthly;
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);

    const burstKey = getAiBurstHourKey();
    const hourlyCount = await getHourlyBurstCount(supabase, user.id, burstKey);
    const hourlyRemaining = Math.max(0, HOURLY_BURST_LIMIT - hourlyCount);

    // Reset date: end of current period
    const resetAt = entitlements.period.end.toISOString();

    return {
      success: true,
      tier: entitlements.effectivePlanCode,
      limits: {
        monthly_limit: monthlyLimit,
        monthly_remaining: monthlyRemaining,
        monthly_reset_at: resetAt,
        hourly_limit: HOURLY_BURST_LIMIT,
        hourly_remaining: hourlyRemaining,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quota',
    };
  }
}

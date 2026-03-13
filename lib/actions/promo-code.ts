'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { verifySession } from './auth';
import { getPlanByCodeAndInterval } from '@/lib/services/billing/plans';
import type { PromoCodeValidationResult } from '@/lib/types/promo-code';

const ValidateSchema = z.object({
  code: z.string().min(1).max(20).toUpperCase(),
  plan: z.enum(['plus', 'pro']),
  interval: z.enum(['month', 'year']),
});

/**
 * Validates a promotional code for the given plan and interval.
 * Returns discounted pricing on success; reason on failure.
 * Never exposes the Stripe coupon ID directly to the client.
 */
export async function validatePromoCode(
  code: string,
  plan: 'plus' | 'pro',
  interval: 'month' | 'year'
): Promise<PromoCodeValidationResult> {
  // 1. Authenticate
  const user = await verifySession();

  // 2. Validate input
  const parsed = ValidateSchema.safeParse({ code, plan, interval });
  if (!parsed.success) {
    return { valid: false, reason: 'not_found', message: 'Invalid promo code.' };
  }

  // 3. Yearly plans are not eligible
  if (parsed.data.interval === 'year') {
    return {
      valid: false,
      reason: 'yearly_not_eligible',
      message: 'Promo codes apply to monthly plans only.',
    };
  }

  const supabase = await createClient();

  // 4. Fetch the promo code (read-only, authenticated RLS allows this)
  const { data: promoCode, error } = await supabase
    .from('promotional_codes')
    .select('id, discount_percent, duration_months, max_redemptions, current_redemptions, expires_at, revoked_at')
    .eq('code', parsed.data.code)
    .maybeSingle();

  if (error || !promoCode) {
    return { valid: false, reason: 'not_found', message: 'Invalid promo code.' };
  }

  // 5. Check validity conditions
  if (promoCode.revoked_at) {
    return { valid: false, reason: 'not_found', message: 'Invalid promo code.' };
  }

  if (promoCode.expires_at && new Date(promoCode.expires_at) <= new Date()) {
    return { valid: false, reason: 'expired', message: 'This code has expired.' };
  }

  if (promoCode.current_redemptions >= promoCode.max_redemptions) {
    return { valid: false, reason: 'exhausted', message: 'This code is no longer available.' };
  }

  // 6. Check if this user already redeemed it
  const { data: redemption } = await supabase
    .from('code_redemptions')
    .select('id')
    .eq('code_id', promoCode.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (redemption) {
    return {
      valid: false,
      reason: 'already_used',
      message: 'This code has already been used on your account.',
    };
  }

  // 7. Compute pricing
  const billingPlan = getPlanByCodeAndInterval(parsed.data.plan, parsed.data.interval);
  const fullPriceCents = billingPlan.priceCents;
  const discountedPriceCents = Math.round(fullPriceCents * (1 - promoCode.discount_percent / 100));

  return {
    valid: true,
    discountPercent: promoCode.discount_percent,
    durationMonths: promoCode.duration_months,
    fullPriceCents,
    discountedPriceCents,
    promoCodeDbId: promoCode.id,
  };
}

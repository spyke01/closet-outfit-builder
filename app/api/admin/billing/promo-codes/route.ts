import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-api-admin-billing-promo-codes-route' });

export const dynamic = 'force-dynamic';

const CreatePromoCodeSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{4,20}$/, 'Code must be 4–20 uppercase alphanumeric characters'),
  discountPercent: z.number().int().min(1).max(99),
  durationMonths: z.number().int().min(1).max(12),
  maxRedemptions: z.number().int().min(1).max(10000),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

async function requireBillingAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return { user: null, supabase, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const canManageBilling = await hasAdminPermission(supabase, user.id, 'billing.write');
  if (!canManageBilling) {
    return { user: null, supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const hasRecentAuth = await hasRecentAdminAuth(supabase, {
    maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200),
  });
  if (!hasRecentAuth) {
    return {
      user: null,
      supabase,
      error: NextResponse.json(
        { error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-billing-promo-codes');
  if (!rateLimit.allowed) {
    return {
      user: null,
      supabase,
      error: NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      ),
    };
  }

  return { user, supabase, error: null };
}

async function createStripeCoupon(input: {
  code: string;
  discountPercent: number;
  durationMonths: number;
}): Promise<{ id: string }> {
  const stripeKey = process.env.STRIPE_MODE === 'live'
    ? (process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY)
    : (process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY);

  if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY');

  const body = new URLSearchParams({
    name: input.code,
    percent_off: String(input.discountPercent),
    duration: 'repeating',
    duration_in_months: String(input.durationMonths),
  });

  const response = await fetch('https://api.stripe.com/v1/coupons', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message || 'Stripe coupon creation failed';
    throw new Error(message);
  }

  return data as { id: string };
}

export async function GET() {
  try {
    const { error } = await requireBillingAdmin();
    if (error) return error;

    const admin = createAdminClient();
    const { data: codes, error: dbError } = await admin
      .from('promotional_codes')
      .select('id, code, discount_percent, duration_months, max_redemptions, current_redemptions, expires_at, revoked_at, created_at')
      .order('created_at', { ascending: false });

    if (dbError) {
      logger.error('Failed to list promo codes', { error: dbError.message });
      return NextResponse.json({ error: 'Failed to retrieve promotional codes' }, { status: 500 });
    }

    const now = new Date();
    const formattedCodes = (codes || []).map((c) => {
      const isExpired = c.expires_at ? new Date(c.expires_at) <= now : false;
      const isExhausted = c.current_redemptions >= c.max_redemptions;
      const isRevoked = c.revoked_at !== null;
      return {
        id: c.id,
        code: c.code,
        discountPercent: c.discount_percent,
        durationMonths: c.duration_months,
        maxRedemptions: c.max_redemptions,
        currentRedemptions: c.current_redemptions,
        expiresAt: c.expires_at,
        revokedAt: c.revoked_at,
        createdAt: c.created_at,
        isActive: !isRevoked && !isExpired && !isExhausted,
      };
    });

    return NextResponse.json({ codes: formattedCodes });
  } catch (error) {
    logger.error('GET /api/admin/billing/promo-codes failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireBillingAdmin();
    if (error || !user) return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = CreatePromoCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code, discountPercent, durationMonths, maxRedemptions, expiresAt } = parsed.data;

    const admin = createAdminClient();

    // Check for duplicate code
    const { data: existing } = await admin
      .from('promotional_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A promotional code with this name already exists.' }, { status: 409 });
    }

    // Create Stripe coupon
    const coupon = await createStripeCoupon({ code, discountPercent, durationMonths });

    // Insert into DB
    const { data: created, error: insertError } = await admin
      .from('promotional_codes')
      .insert({
        code,
        stripe_coupon_id: coupon.id,
        discount_percent: discountPercent,
        duration_months: durationMonths,
        max_redemptions: maxRedemptions,
        current_redemptions: 0,
        expires_at: expiresAt ?? null,
      })
      .select('id, code, stripe_coupon_id, created_at')
      .single();

    if (insertError) {
      logger.error('Failed to insert promo code', { error: insertError.message });
      return NextResponse.json({ error: 'Failed to save promotional code' }, { status: 500 });
    }

    logger.info('Promo code created', { code, createdBy: user.id });

    return NextResponse.json({
      id: created.id,
      code: created.code,
      stripeCouponId: created.stripe_coupon_id,
      createdAt: created.created_at,
    }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/admin/billing/promo-codes failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

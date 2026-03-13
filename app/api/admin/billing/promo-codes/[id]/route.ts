import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-api-admin-billing-promo-codes-id-route' });

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManageBilling = await hasAdminPermission(supabase, user.id, 'billing.write');
    if (!canManageBilling) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, {
      maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200),
    });
    if (!hasRecentAuth) {
      return NextResponse.json(
        { error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' },
        { status: 401 }
      );
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-billing-promo-codes-revoke');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      );
    }

    const admin = createAdminClient();

    const { data: existing, error: fetchError } = await admin
      .from('promotional_codes')
      .select('id, code, revoked_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Promotional code not found' }, { status: 404 });
    }

    if (existing.revoked_at) {
      return NextResponse.json({ error: 'Promotional code is already revoked' }, { status: 409 });
    }

    const { error: updateError } = await admin
      .from('promotional_codes')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      logger.error('Failed to revoke promo code', { id, error: updateError.message });
      return NextResponse.json({ error: 'Failed to revoke promotional code' }, { status: 500 });
    }

    logger.info('Promo code revoked', { id, code: existing.code, revokedBy: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/admin/billing/promo-codes/[id] failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

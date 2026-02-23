import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { hasAdminPermission } from '@/lib/services/admin/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadBilling = await hasAdminPermission(supabase, user.id, 'billing.read');
    if (!canReadBilling) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, { maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200) });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-billing-users-list');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      );
    }

    const admin = createAdminClient();
    const query = request.nextUrl.searchParams.get('q')?.toLowerCase().trim() || '';
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 200);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 200;

    const { data: subscriptions } = await admin
      .from('user_subscriptions')
      .select('user_id, plan_code, billing_state, current_period_end, stripe_customer_id, stripe_subscription_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    const usersResponse = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
    const userMap = new Map((usersResponse.data.users || []).map((u) => [u.id, u]));

    const rows = (subscriptions || []).map((sub) => {
      const account = userMap.get(sub.user_id);
      return {
        user_id: sub.user_id,
        email: account?.email || null,
        plan_code: sub.plan_code,
        billing_state: sub.billing_state,
        current_period_end: sub.current_period_end,
        stripe_customer_id: sub.stripe_customer_id,
        stripe_subscription_id: sub.stripe_subscription_id,
        updated_at: sub.updated_at,
      };
    }).filter((row) => {
      if (!query) return true;
      return row.email?.toLowerCase().includes(query) || row.user_id.includes(query);
    });

    return NextResponse.json({ users: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load billing users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

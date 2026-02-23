import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const canReadSupport = await hasAdminPermission(supabase, user.id, 'support.read');
    if (!canReadSupport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const hasRecentAuth = await hasRecentAdminAuth(supabase, { maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200) });
    if (!hasRecentAuth) return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-users-list');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const query = request.nextUrl.searchParams.get('q')?.toLowerCase().trim() || '';
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 200);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 200;

    const admin = createAdminClient();
    const [usersResponse, subscriptionResponse] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: limit }),
      admin
        .from('user_subscriptions')
        .select('user_id, plan_code, billing_state, updated_at'),
    ]);

    const subMap = new Map((subscriptionResponse.data || []).map((sub) => [sub.user_id, sub]));

    const rows = (usersResponse.data.users || []).map((u) => {
      const sub = subMap.get(u.id);
      return {
        user_id: u.id,
        email: u.email || null,
        plan_code: sub?.plan_code || 'free',
        billing_state: sub?.billing_state || 'active',
        updated_at: sub?.updated_at || null,
      };
    }).filter((row) => {
      if (!query) return true;
      return (row.email || '').toLowerCase().includes(query) || row.user_id.includes(query);
    });

    return NextResponse.json({ users: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

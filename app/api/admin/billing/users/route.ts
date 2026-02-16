import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasBillingAdminRole } from '@/lib/services/billing/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await hasBillingAdminRole(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const query = request.nextUrl.searchParams.get('q')?.toLowerCase().trim() || '';

    const { data: subscriptions } = await admin
      .from('user_subscriptions')
      .select('user_id, plan_code, billing_state, current_period_end, stripe_customer_id, stripe_subscription_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200);

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

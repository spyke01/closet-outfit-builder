import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasAdminPermission, listUserAdminRoles } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadSupport = await hasAdminPermission(supabase, user.id, 'support.read');
    if (!canReadSupport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, { maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200) });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-user-overview');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const admin = createAdminClient();
    const [
      authUser,
      roleRows,
      subscription,
      issues,
      notes,
      supportCases,
      recentEvents,
    ] = await Promise.all([
      admin.auth.admin.getUserById(id),
      listUserAdminRoles(admin, id),
      admin.from('user_subscriptions').select('*').eq('user_id', id).maybeSingle(),
      admin.from('billing_issues').select('*').eq('user_id', id).order('opened_at', { ascending: false }).limit(10),
      admin.from('admin_notes').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(25),
      admin.from('support_cases').select('*').eq('user_id', id).order('updated_at', { ascending: false }).limit(20),
      admin.from('billing_events').select('id, event_type, processing_status, created_at, error_text').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    ]);

    return NextResponse.json({
      user: {
        id,
        email: authUser.data.user?.email || null,
        last_sign_in_at: authUser.data.user?.last_sign_in_at || null,
        created_at: authUser.data.user?.created_at || null,
        app_metadata: authUser.data.user?.app_metadata || null,
        user_metadata: authUser.data.user?.user_metadata || null,
      },
      roles: roleRows,
      subscription: subscription.data || null,
      billing_issues: issues.data || [],
      admin_notes: notes.data || [],
      support_cases: supportCases.data || [],
      billing_events: recentEvents.data || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load user overview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

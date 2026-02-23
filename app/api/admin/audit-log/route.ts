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
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadAudit = await hasAdminPermission(supabase, user.id, 'audit.read');
    if (!canReadAudit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, { maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200) });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-audit-log-read');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const q = request.nextUrl.searchParams;
    const limitRaw = Number(q.get('limit') || 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 100;
    const actor = q.get('actor');
    const target = q.get('target');
    const action = q.get('action');
    const outcome = q.get('outcome');

    const admin = createAdminClient();
    let query = admin
      .from('admin_audit_log')
      .select('id, occurred_at, actor_user_id, target_user_id, action, resource_type, resource_id, outcome, error_code, reason, request_id, metadata_json')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (actor) query = query.eq('actor_user_id', actor);
    if (target) query = query.eq('target_user_id', target);
    if (action) query = query.eq('action', action);
    if (outcome) query = query.eq('outcome', outcome);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rows: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load audit log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

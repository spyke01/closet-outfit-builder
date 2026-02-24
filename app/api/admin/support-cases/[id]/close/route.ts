import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { buildCloseCasePatch, getSupportCaseById } from '@/lib/services/admin/support-cases';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'admin_support_case_close',
  });
  if (sameOriginError) return sameOriginError;

  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const canWriteSupport = await hasAdminPermission(supabase, user.id, 'support.write');
    if (!canWriteSupport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const hasRecentAuth = await hasRecentAdminAuth(supabase, {
      maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200),
    });
    if (!hasRecentAuth) return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-support-case-close');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const admin = createAdminClient();
    const supportCase = await getSupportCaseById(admin, id);
    if (!supportCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    if (supportCase.status === 'closed') return NextResponse.json({ case: supportCase, already_closed: true });

    const patch = buildCloseCasePatch(user.id);
    const { data, error } = await admin
      .from('support_cases')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Failed to close support case' }, { status: 500 });

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: supportCase.user_id,
      action: 'support.case.close',
      outcome: 'success',
      resourceType: 'support_case',
      resourceId: id,
    });

    return NextResponse.json({ case: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to close support case';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

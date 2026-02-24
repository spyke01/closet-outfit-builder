import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable } from '@/lib/services/billing/admin-security';
import { buildReopenCasePatch, canReopenCase, getSupportCaseById } from '@/lib/services/admin/support-cases';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'user_support_case_reopen',
  });
  if (sameOriginError) return sameOriginError;

  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'user-support-case-reopen');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const admin = createAdminClient();
    const supportCase = await getSupportCaseById(admin, id);
    if (!supportCase || supportCase.user_id !== user.id) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    if (supportCase.status !== 'closed') {
      return NextResponse.json({ case: supportCase, already_open: true });
    }
    if (!canReopenCase(supportCase)) {
      return NextResponse.json({ error: 'Reopen window has expired', code: 'SUPPORT_REOPEN_WINDOW_EXPIRED' }, { status: 400 });
    }

    const patch = buildReopenCasePatch();
    const { data, error } = await admin
      .from('support_cases')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Failed to reopen support case' }, { status: 500 });

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      action: 'support.case.reopen',
      outcome: 'success',
      resourceType: 'support_case',
      resourceId: id,
      metadata: { actor_role: 'user' },
    });

    return NextResponse.json({ case: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reopen support case';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

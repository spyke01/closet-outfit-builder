import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

const CommentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'admin_support_case_comment',
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

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-support-case-comment');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await request.json();
    const parsed = CommentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid comment payload' }, { status: 400 });

    const admin = createAdminClient();
    const { data: supportCase } = await admin.from('support_cases').select('id, user_id').eq('id', id).maybeSingle();
    if (!supportCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const { data, error } = await admin
      .from('support_case_comments')
      .insert({
        case_id: id,
        author_user_id: user.id,
        author_role: 'admin',
        body: parsed.data.body,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Failed to add support comment' }, { status: 500 });

    await admin.from('support_cases').update({ updated_at: new Date().toISOString() }).eq('id', id);

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: supportCase.user_id,
      action: 'support.case.comment',
      outcome: 'success',
      resourceType: 'support_case_comment',
      resourceId: data.id,
      metadata: { case_id: id },
    });

    return NextResponse.json({ comment: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add support comment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

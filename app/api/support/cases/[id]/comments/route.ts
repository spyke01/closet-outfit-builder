import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceAdminRateLimitDurable } from '@/lib/services/billing/admin-security';
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
    reasonTag: 'user_support_case_comment',
  });
  if (sameOriginError) return sameOriginError;

  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'user-support-case-comment');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await request.json();
    const parsed = CommentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid comment payload' }, { status: 400 });

    const admin = createAdminClient();
    const { data: supportCase } = await admin.from('support_cases').select('id, user_id').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (!supportCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const { data, error } = await admin
      .from('support_case_comments')
      .insert({
        case_id: id,
        author_user_id: user.id,
        author_role: 'user',
        body: parsed.data.body,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Failed to add support comment' }, { status: 500 });

    await admin.from('support_cases').update({ updated_at: new Date().toISOString() }).eq('id', id);

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: user.id,
      action: 'support.case.comment',
      outcome: 'success',
      resourceType: 'support_case_comment',
      resourceId: data.id,
      metadata: { actor_role: 'user', case_id: id },
    });

    return NextResponse.json({ comment: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add support comment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

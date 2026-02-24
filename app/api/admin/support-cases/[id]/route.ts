import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { buildCloseCasePatch, buildReopenCasePatch, canReopenCase, getSupportCaseById } from '@/lib/services/admin/support-cases';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

const UpdateCaseSchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  category: z.enum(['billing', 'account', 'bug', 'feature', 'other']).optional(),
  subject: z.string().min(1).max(160).optional(),
  summary: z.string().min(1).max(2000).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const canReadSupport = await hasAdminPermission(supabase, user.id, 'support.read');
    if (!canReadSupport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const hasRecentAuth = await hasRecentAdminAuth(supabase, { maxAgeSeconds: Number(process.env.ADMIN_LOW_RISK_MAX_AGE_SECONDS || 43_200) });
    if (!hasRecentAuth) return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-support-case-detail');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const admin = createAdminClient();
    const [{ data: supportCase }, { data: comments }] = await Promise.all([
      admin.from('support_cases').select('*').eq('id', id).maybeSingle(),
      admin.from('support_case_comments').select('*').eq('case_id', id).order('created_at', { ascending: true }),
    ]);

    if (!supportCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const userResponse = await admin.auth.admin.getUserById(supportCase.user_id);

    const authorIds = [...new Set((comments || []).map((comment) => comment.author_user_id))];
    const authorEntries = await Promise.all(
      authorIds.map(async (authorId) => {
        const response = await admin.auth.admin.getUserById(authorId);
        const authUser = response.data.user;
        const metadata = (authUser?.user_metadata || {}) as Record<string, unknown>;
        const firstName = typeof metadata.first_name === 'string' ? metadata.first_name : '';
        const lastName = typeof metadata.last_name === 'string' ? metadata.last_name : '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        const authorName = fullName || authUser?.email || 'User';
        const avatarUrlRaw = metadata.avatar_url || metadata.picture;
        const avatarUrl = typeof avatarUrlRaw === 'string' && avatarUrlRaw.trim().length > 0 ? avatarUrlRaw.trim() : null;
        return [authorId, { name: authorName, avatar_url: avatarUrl }] as const;
      })
    );
    const authorMap = new Map(authorEntries);
    const enrichedComments = (comments || []).map((comment) => ({
      ...comment,
      author_name: authorMap.get(comment.author_user_id)?.name || 'User',
      author_avatar_url: authorMap.get(comment.author_user_id)?.avatar_url || null,
    }));

    return NextResponse.json({
      case: supportCase,
      comments: enrichedComments,
      user: {
        id: supportCase.user_id,
        email: userResponse.data.user?.email || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load support case';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['PATCH'],
    reasonTag: 'admin_support_case_update',
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

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-support-case-update');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await request.json();
    const parsed = UpdateCaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const admin = createAdminClient();
    const supportCase = await getSupportCaseById(admin, id);
    if (!supportCase) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      ...parsed.data,
      owner_admin_user_id: user.id,
      updated_at: nowIso,
    };

    if (parsed.data.status === 'closed') {
      Object.assign(updatePayload, buildCloseCasePatch(user.id));
    } else if (parsed.data.status === 'open' && supportCase.status === 'closed') {
      if (!canReopenCase(supportCase)) {
        return NextResponse.json({ error: 'Reopen window has expired', code: 'SUPPORT_REOPEN_WINDOW_EXPIRED' }, { status: 400 });
      }
      Object.assign(updatePayload, buildReopenCasePatch());
    }

    const { data, error } = await admin
      .from('support_cases')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'Failed to update support case' }, { status: 500 });

    await writeAdminAuditLog({
      actorUserId: user.id,
      targetUserId: data.user_id,
      action: 'support.case.update',
      outcome: 'success',
      resourceType: 'support_case',
      resourceId: data.id,
      metadata: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ case: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update support case';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

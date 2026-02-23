import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

const UpdateCaseSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  summary: z.string().min(1).max(2000).optional(),
});

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
      maxAgeSeconds: Number(process.env.ADMIN_PRIVILEGED_AUTH_MAX_AGE_SECONDS || 900),
      requireAal2: true,
    });
    if (!hasRecentAuth) return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-support-case-update');
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await request.json();
    const parsed = UpdateCaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    if (Object.keys(parsed.data).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from('support_cases')
      .update({
        ...parsed.data,
        owner_admin_user_id: user.id,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

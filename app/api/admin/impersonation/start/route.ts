import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { ADMIN_IMPERSONATION_COOKIE } from '@/lib/services/admin/impersonation';
import { startReadOnlyImpersonation } from '@/lib/services/admin/impersonation-session';
import { writeAdminAuditLog } from '@/lib/services/admin/audit';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

const StartSchema = z.object({
  target_user_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
  ticket_id: z.string().min(1).max(120).optional().nullable(),
});

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || null;
}

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'admin_impersonation_start',
  });
  if (sameOriginError) return sameOriginError;

  const ip = getClientIp(request);
  try {
    const body = await request.json();
    const parsed = StartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid impersonation request' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (parsed.data.target_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot impersonate your own account' }, { status: 400 });
    }

    const canImpersonate = await hasAdminPermission(supabase, user.id, 'impersonation.start');
    if (!canImpersonate) {
      await writeAdminAuditLog({
        actorUserId: user.id,
        targetUserId: parsed.data.target_user_id,
        action: 'impersonation.start',
        outcome: 'denied',
        resourceType: 'admin_impersonation_session',
        errorCode: 'ADMIN_PERMISSION_DENIED',
        ip,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, {
      maxAgeSeconds: Number(process.env.ADMIN_PRIVILEGED_AUTH_MAX_AGE_SECONDS || 900),
      requireAal2: true,
    });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-impersonation-start');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const result = await startReadOnlyImpersonation({
      actorUserId: user.id,
      targetUserId: parsed.data.target_user_id,
      reason: parsed.data.reason,
      ticketId: parsed.data.ticket_id || null,
      request,
    });

    const response = NextResponse.json({
      ok: true,
      session_id: result.sessionId,
      expires_at: result.expiresAt,
      mode: 'read_only',
      target_user_id: parsed.data.target_user_id,
    });
    response.cookies.set(ADMIN_IMPERSONATION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(result.expiresAt),
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start impersonation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

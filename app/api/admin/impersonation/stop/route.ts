import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { enforceAdminRateLimitDurable, hasRecentAdminAuth } from '@/lib/services/billing/admin-security';
import { ADMIN_IMPERSONATION_COOKIE } from '@/lib/services/admin/impersonation';
import { stopImpersonationByToken } from '@/lib/services/admin/impersonation-session';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'admin_impersonation_stop',
  });
  if (sameOriginError) return sameOriginError;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canStopImpersonation = await hasAdminPermission(supabase, user.id, 'impersonation.stop');
    if (!canStopImpersonation) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasRecentAuth = await hasRecentAdminAuth(supabase, {
      maxAgeSeconds: Number(process.env.ADMIN_PRIVILEGED_AUTH_MAX_AGE_SECONDS || 900),
      requireAal2: true,
    });
    if (!hasRecentAuth) {
      return NextResponse.json({ error: 'Recent authentication required', code: 'ADMIN_STEP_UP_REQUIRED' }, { status: 401 });
    }

    const rateLimit = await enforceAdminRateLimitDurable(user.id, 'admin-impersonation-stop');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const token = request.cookies.get(ADMIN_IMPERSONATION_COOKIE)?.value || null;
    await stopImpersonationByToken(user.id, token, 'manually_stopped');

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_IMPERSONATION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to stop impersonation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

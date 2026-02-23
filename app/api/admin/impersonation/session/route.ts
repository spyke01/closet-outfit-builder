import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAdminPermission } from '@/lib/services/admin/permissions';
import { ADMIN_IMPERSONATION_COOKIE } from '@/lib/services/admin/impersonation';
import { getValidatedImpersonationFromToken } from '@/lib/services/admin/impersonation-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ session: null });
    }

    const canReadSupport = await hasAdminPermission(supabase, user.id, 'support.read');
    if (!canReadSupport) {
      return NextResponse.json({ session: null });
    }

    const token = request.cookies.get(ADMIN_IMPERSONATION_COOKIE)?.value;
    const active = await getValidatedImpersonationFromToken(token);
    if (!active || active.session.actor_user_id !== user.id) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        id: active.session.id,
        target_user_id: active.session.target_user_id,
        reason: active.session.reason,
        ticket_id: active.session.ticket_id,
        expires_at: active.session.expires_at,
        mode: active.tokenPayload.mode,
      },
    });
  } catch {
    return NextResponse.json({ session: null });
  }
}

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADMIN_IMPERSONATION_COOKIE, ImpersonationTokenPayload, createImpersonationToken, parseImpersonationToken } from './impersonation';
import { writeAdminAuditLog } from './audit';

export interface StartImpersonationInput {
  actorUserId: string;
  targetUserId: string;
  reason: string;
  ticketId?: string | null;
  request: NextRequest;
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || null;
}

export async function startReadOnlyImpersonation(input: StartImpersonationInput): Promise<{ token: string; sessionId: string; expiresAt: string }> {
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + Number(process.env.ADMIN_IMPERSONATION_MAX_MINUTES || 30) * 60_000).toISOString();
  const ip = getClientIp(input.request);
  const userAgent = input.request.headers.get('user-agent');

  const { data: inserted, error } = await admin
    .from('admin_impersonation_sessions')
    .insert({
      actor_user_id: input.actorUserId,
      target_user_id: input.targetUserId,
      mode: 'read_only',
      reason: input.reason,
      ticket_id: input.ticketId || null,
      expires_at: expiresAt,
      created_ip: ip,
      user_agent: userAgent,
      status: 'active',
    })
    .select('id, expires_at')
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || 'Failed to start impersonation session');
  }

  const tokenPayload: ImpersonationTokenPayload = {
    sessionId: inserted.id,
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    mode: 'read_only',
    exp: new Date(inserted.expires_at).getTime(),
  };
  const token = createImpersonationToken(tokenPayload);

  await writeAdminAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    action: 'impersonation.start',
    outcome: 'success',
    resourceType: 'admin_impersonation_session',
    resourceId: inserted.id,
    reason: input.reason,
    ip,
    metadata: {
      ticket_id: input.ticketId || null,
      mode: 'read_only',
      expires_at: inserted.expires_at,
    },
  });

  return {
    token,
    sessionId: inserted.id,
    expiresAt: inserted.expires_at,
  };
}

export async function stopImpersonationByToken(actorUserId: string, token: string | null, endedReason: string): Promise<boolean> {
  const parsed = parseImpersonationToken(token);
  if (!parsed) return false;

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from('admin_impersonation_sessions')
    .update({
      ended_at: nowIso,
      ended_reason: endedReason,
      status: 'ended',
      updated_at: nowIso,
    })
    .eq('id', parsed.sessionId)
    .eq('actor_user_id', actorUserId)
    .eq('status', 'active');

  if (error) {
    return false;
  }

  await writeAdminAuditLog({
    actorUserId,
    targetUserId: parsed.targetUserId,
    action: 'impersonation.stop',
    outcome: 'success',
    resourceType: 'admin_impersonation_session',
    resourceId: parsed.sessionId,
    reason: endedReason,
    metadata: { mode: parsed.mode },
  });

  return true;
}

export async function getValidatedImpersonationFromToken(token: string | null | undefined) {
  const parsed = parseImpersonationToken(token);
  if (!parsed) return null;

  const admin = createAdminClient();
  const { data: session } = await admin
    .from('admin_impersonation_sessions')
    .select('id, actor_user_id, target_user_id, status, expires_at, reason, ticket_id')
    .eq('id', parsed.sessionId)
    .maybeSingle();

  if (!session || session.status !== 'active') return null;
  const expiresAt = new Date(session.expires_at).getTime();
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    await admin
      .from('admin_impersonation_sessions')
      .update({
        status: 'expired',
        ended_at: new Date().toISOString(),
        ended_reason: 'expired',
      })
      .eq('id', session.id)
      .eq('status', 'active');
    return null;
  }

  return {
    cookieName: ADMIN_IMPERSONATION_COOKIE,
    tokenPayload: parsed,
    session,
  };
}

import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_IMPERSONATION_COOKIE = 'admin_impersonation_token';

export interface ImpersonationTokenPayload {
  sessionId: string;
  actorUserId: string;
  targetUserId: string;
  mode: 'read_only';
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSecret(): string {
  const secret = process.env.ADMIN_IMPERSONATION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_IMPERSONATION_SECRET is required for impersonation');
  }
  return secret;
}

function sign(payloadBase64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

export function createImpersonationToken(payload: ImpersonationTokenPayload): string {
  const secret = getSecret();
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function parseImpersonationToken(token: string | null | undefined): ImpersonationTokenPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }
  const expectedSignature = sign(encodedPayload, secret);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expectedSignature, 'utf8');

  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as ImpersonationTokenPayload;
    if (!payload.sessionId || !payload.actorUserId || !payload.targetUserId || payload.mode !== 'read_only') return null;
    if (!payload.exp || Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

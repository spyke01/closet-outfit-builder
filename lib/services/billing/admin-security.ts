import type { SupabaseClient } from '@supabase/supabase-js';

const adminRateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getAdminRateLimitConfig() {
  const maxRequests = Number(process.env.ADMIN_API_RATE_LIMIT_MAX || 120);
  const windowMs = Number(process.env.ADMIN_API_RATE_LIMIT_WINDOW_MS || 60_000);
  return { maxRequests, windowMs };
}

export function enforceAdminRateLimit(userId: string, scope: string): { allowed: boolean; retryAfterSeconds?: number } {
  const { maxRequests, windowMs } = getAdminRateLimitConfig();
  const now = Date.now();
  const key = `${userId}:${scope}`;
  const current = adminRateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    adminRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  adminRateLimitStore.set(key, current);
  return { allowed: true };
}

export async function hasRecentAdminAuth(supabase: SupabaseClient): Promise<boolean> {
  const maxAgeSeconds = Number(process.env.ADMIN_AUTH_MAX_AGE_SECONDS || 43_200);
  const requireAal2 = process.env.ADMIN_REQUIRE_AAL2 === 'true';

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return false;
  }

  const claims = data.claims as Record<string, unknown>;
  const nowEpoch = Math.floor(Date.now() / 1000);
  const authTime = Number(claims.auth_time || claims.iat || 0);
  const aal = typeof claims.aal === 'string' ? claims.aal : '';

  if (!authTime || nowEpoch - authTime > maxAgeSeconds) {
    return false;
  }

  if (requireAal2 && aal !== 'aal2') {
    return false;
  }

  return true;
}


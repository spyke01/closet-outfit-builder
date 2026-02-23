import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/utils/logger';

const adminRateLimitStore = new Map<string, { count: number; resetAt: number }>();
const logger = createLogger({ component: 'admin-security' });

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

export async function enforceAdminRateLimitDurable(
  userId: string,
  scope: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const { maxRequests, windowMs } = getAdminRateLimitConfig();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const resetAtIso = new Date(now + windowMs).toISOString();

  try {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('admin_rate_limits')
      .select('id, count, reset_at')
      .eq('user_id', userId)
      .eq('scope', scope)
      .maybeSingle();

    if (error) {
      logger.warn('Falling back to in-memory admin rate limit after DB read failure', { error: error.message, scope });
      return enforceAdminRateLimit(userId, scope);
    }

    if (!row) {
      const { error: insertError } = await admin
        .from('admin_rate_limits')
        .insert({
          user_id: userId,
          scope,
          count: 1,
          reset_at: resetAtIso,
        });

      if (insertError) {
        logger.warn('Falling back to in-memory admin rate limit after DB insert failure', { error: insertError.message, scope });
        return enforceAdminRateLimit(userId, scope);
      }

      return { allowed: true };
    }

    const resetAtEpoch = new Date(row.reset_at).getTime();
    if (!Number.isFinite(resetAtEpoch) || now > resetAtEpoch) {
      const { error: resetError } = await admin
        .from('admin_rate_limits')
        .update({ count: 1, reset_at: resetAtIso, updated_at: nowIso })
        .eq('id', row.id);

      if (resetError) {
        logger.warn('Falling back to in-memory admin rate limit after DB reset failure', { error: resetError.message, scope });
        return enforceAdminRateLimit(userId, scope);
      }

      return { allowed: true };
    }

    if (row.count >= maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtEpoch - now) / 1000)),
      };
    }

    const { error: updateError } = await admin
      .from('admin_rate_limits')
      .update({ count: row.count + 1, updated_at: nowIso })
      .eq('id', row.id);

    if (updateError) {
      logger.warn('Falling back to in-memory admin rate limit after DB update failure', { error: updateError.message, scope });
      return enforceAdminRateLimit(userId, scope);
    }

    return { allowed: true };
  } catch (error) {
    logger.warn('Falling back to in-memory admin rate limit after DB exception', { error, scope });
    return enforceAdminRateLimit(userId, scope);
  }
}

interface AdminAuthOptions {
  maxAgeSeconds?: number;
  requireAal2?: boolean;
}

export async function hasRecentAdminAuth(supabase: SupabaseClient, options: AdminAuthOptions = {}): Promise<boolean> {
  const maxAgeSeconds = options.maxAgeSeconds ?? Number(process.env.ADMIN_AUTH_MAX_AGE_SECONDS || 43_200);
  const requireAal2 = options.requireAal2 ?? (process.env.ADMIN_REQUIRE_AAL2 === 'true');

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

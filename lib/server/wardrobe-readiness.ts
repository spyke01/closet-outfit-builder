import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeInternalRedirectPath } from '@/lib/utils/redirect';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'lib-server-wardrobe-readiness' });


const DEFAULT_POST_AUTH_REDIRECT = '/today';

interface PostAuthRouteParams {
  hasItems: boolean;
  requestedNext?: string | null;
  fallback?: string;
}

export async function hasActiveWardrobeItems(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1);

  if (error) {
    logger.error('Wardrobe readiness check failed:', error.message);
    // Fail-open so users are not blocked by transient DB issues.
    return true;
  }

  return (data?.length ?? 0) > 0;
}

export function getPostAuthRoute({
  hasItems,
  requestedNext,
  fallback = DEFAULT_POST_AUTH_REDIRECT,
}: PostAuthRouteParams): string {
  if (!hasItems) {
    return '/onboarding';
  }

  return sanitizeInternalRedirectPath(requestedNext ?? null, fallback);
}


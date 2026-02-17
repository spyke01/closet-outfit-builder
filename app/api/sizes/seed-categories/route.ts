import { NextResponse } from 'next/server';
import { withSecurity, SecurityConfigs, SecureRequest } from '@/lib/middleware/security-middleware';
import { logError } from '@/lib/utils/error-logging';
import { createClient } from '@/lib/supabase/server';
import { requireSameOriginWithOptions } from '@/lib/utils/request-security';

/**
 * Seed System Categories API Route
 * 
 * Creates pre-defined system categories for authenticated users.
 * This endpoint calls the seed_system_categories database function
 * which creates 16 categories (8 men's, 8 women's) with measurement guides.
 * 
 * The function is idempotent - safe to call multiple times without creating duplicates.
 */

async function securePostHandler(request: SecureRequest): Promise<NextResponse> {
  const sameOriginError = requireSameOriginWithOptions(request, {
    mode: (process.env.SECURITY_CSRF_MODE as 'off' | 'report' | 'enforce' | undefined) || 'enforce',
    protectMethods: ['POST'],
    reasonTag: 'seed_categories',
  });
  if (sameOriginError) {
    return sameOriginError;
  }

  try {
    const { user } = request;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Call the seed_system_categories database function
    const { error: seedError } = await supabase.rpc('seed_system_categories', {
      p_user_id: user.id
    });

    if (seedError) {
      logError(seedError, 'database', 'high', {
        userId: user.id,
        component: 'seed-categories-api',
        action: 'seed_system_categories',
        metadata: { error: seedError.message },
      });

      return NextResponse.json(
        { error: 'Failed to seed categories', details: seedError.message },
        { status: 500 }
      );
    }

    // Fetch the seeded categories to return to the client
    const { data: categories, error: fetchError } = await supabase
      .from('size_categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_system_category', true)
      .order('created_at', { ascending: true });

    if (fetchError) {
      logError(fetchError, 'database', 'medium', {
        userId: user.id,
        component: 'seed-categories-api',
        action: 'fetch_seeded_categories',
        metadata: { error: fetchError.message },
      });

      // Seeding succeeded but fetch failed - still return success
      return NextResponse.json({
        success: true,
        message: 'Categories seeded successfully',
        data: [],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Categories seeded successfully',
      data: categories,
      count: categories?.length || 0,
    });

  } catch (error) {
    const errorId = logError(
      error instanceof Error ? error : new Error('Unknown error'),
      'system',
      'high',
      {
        userId: request.user?.id,
        component: 'seed-categories-api',
        action: 'post_handler',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error', errorId },
      { status: 500 }
    );
  }
}

// Apply security middleware with rate limiting
// Rate limit: 10 requests per 15 minutes to prevent abuse
export const POST = withSecurity({
  ...SecurityConfigs.authenticated,
  rateLimit: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
})(securePostHandler);

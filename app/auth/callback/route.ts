import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from "@supabase/ssr"
import { getPostAuthRoute, hasActiveWardrobeItems } from '@/lib/server/wardrobe-readiness';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'app-auth-callback-route' });


export const dynamic = 'force-dynamic';
const DEFAULT_REDIRECT_PATH = '/today';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const requestedNext = searchParams.get('next');

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase environment variables')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Configuration error')}`)
    }

    // Handle OAuth errors from provider
    if (error) {
      logger.error('OAuth provider error', { error, error_description })
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Authentication failed')}`)
    }

    // Handle missing code
    if (!code) {
      logger.error('No authorization code received')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No authorization code received')}`)
    }

    // Create response object first so Supabase can attach cookies during code exchange.
    const response = NextResponse.redirect(`${origin}${DEFAULT_REDIRECT_PATH}`)
    
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Preserve secure defaults from Supabase cookie options.
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      logger.error('Code exchange error:', exchangeError.message)
      
      // Handle specific PKCE errors
      if (exchangeError.message?.includes('code verifier') || 
          exchangeError.message?.includes('invalid request')) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Authentication session expired. Please try signing in again.')}`)
      }
      
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Authentication failed')}`)
    }

    if (!data?.session) {
      logger.error('No session returned from code exchange')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No session created. Please try again.')}`)
    }

    const userId = data.user?.id;
    const hasItems = userId
      ? await hasActiveWardrobeItems(supabase, userId)
      : true;
    const redirectPath = getPostAuthRoute({
      hasItems,
      requestedNext,
      fallback: DEFAULT_REDIRECT_PATH,
    });
    response.headers.set('Location', `${origin}${redirectPath}`);

    return response
    
  } catch (globalError) {
    logger.error('OAuth callback failed:', globalError instanceof Error ? globalError.message : 'Unknown error')
    
    // Fallback URL construction
    try {
      const url = new URL(request.url)
      const baseUrl = url.origin
      return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${encodeURIComponent('Internal server error. Please try again.')}`)
    } catch {
      // Last resort - return a basic error response
      return new NextResponse('Internal Server Error', { status: 500 })
    }
  }
}

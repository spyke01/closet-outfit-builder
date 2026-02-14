import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from "@supabase/ssr"
import { sanitizeInternalRedirectPath } from "@/lib/utils/redirect";

export const dynamic = 'force-dynamic';
const DEFAULT_REDIRECT_PATH = '/today';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const redirectPath = sanitizeInternalRedirectPath(
      searchParams.get('next'),
      DEFAULT_REDIRECT_PATH
    )

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Configuration error')}`)
    }

    // Handle OAuth errors from provider
    if (error) {
      console.error('OAuth provider error:', error, error_description)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error_description || error)}`)
    }

    // Handle missing code
    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No authorization code received')}`)
    }

    // Create response object first so we can set cookies
    const redirectUrl = `${origin}${redirectPath}`
    const response = NextResponse.redirect(redirectUrl)
    
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
      console.error('Code exchange error:', exchangeError.message)
      
      // Handle specific PKCE errors
      if (exchangeError.message?.includes('code verifier') || 
          exchangeError.message?.includes('invalid request')) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Authentication session expired. Please try signing in again.')}`)
      }
      
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError.message || 'Authentication failed')}`)
    }

    if (!data?.session) {
      console.error('No session returned from code exchange')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No session created. Please try again.')}`)
    }

    // Seed new user data (non-blocking)
    try {
      const { error: seedError } = await supabase.functions.invoke('seed-user', {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      })
      
      if (seedError) {
        console.error('Failed to seed user data:', seedError)
      }
    } catch (seedError) {
      console.error('Error seeding user (non-blocking):', seedError)
    }

    return response
    
  } catch (globalError) {
    console.error('OAuth callback failed:', globalError instanceof Error ? globalError.message : 'Unknown error')
    
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

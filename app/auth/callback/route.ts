import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from "@supabase/ssr"

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== OAuth Callback Start ===')
  
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const next = searchParams.get('next') ?? '/today'

    console.log('Request details:', {
      code: !!code,
      error,
      error_description,
      origin,
      next,
      url: request.url
    })

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      nodeEnv: process.env.NODE_ENV
    })

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

    console.log('Creating Supabase client with cookie handling...')
    
    // Create response object first so we can set cookies
    const redirectUrl = `${origin}${next}`
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
            // Set cookies on the response object with proper Supabase format
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                httpOnly: false, // Allow client-side access for Supabase
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              });
            });
          },
        },
      },
    );
    
    console.log('Attempting code exchange...')
    
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Code exchange error:', {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name
      })
      
      // Handle specific PKCE errors
      if (exchangeError.message?.includes('code verifier') || 
          exchangeError.message?.includes('invalid request')) {
        console.error('PKCE verification failed')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Authentication session expired. Please try signing in again.')}`)
      }
      
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError.message || 'Authentication failed')}`)
    }

    if (!data?.session) {
      console.error('No session returned from code exchange')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No session created. Please try again.')}`)
    }

    console.log('OAuth success:', {
      userId: data.user?.id,
      email: data.user?.email,
      provider: data.user?.app_metadata?.provider
    })
    
    // Seed new user data (non-blocking)
    try {
      const { error: seedError } = await supabase.functions.invoke('seed-user', {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      })
      
      if (seedError) {
        console.error('Failed to seed user data:', seedError)
      } else {
        console.log('User seeded successfully')
      }
    } catch (seedError) {
      console.error('Error seeding user (non-blocking):', seedError)
    }
    
    console.log('Redirecting to:', redirectUrl)
    console.log('=== OAuth Callback Success ===')
    
    return response
    
  } catch (globalError) {
    console.error('=== Global error in OAuth callback ===')
    console.error('Error details:', {
      message: globalError instanceof Error ? globalError.message : 'Unknown error',
      stack: globalError instanceof Error ? globalError.stack : undefined,
      name: globalError instanceof Error ? globalError.name : undefined
    })
    
    // Fallback URL construction
    try {
      const url = new URL(request.url)
      const baseUrl = url.origin
      return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${encodeURIComponent('Internal server error. Please try again.')}`)
    } catch (urlError) {
      console.error('Failed to construct fallback URL:', urlError)
      // Last resort - return a basic error response
      return new NextResponse('Internal Server Error', { status: 500 })
    }
  }
}
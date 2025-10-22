import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function seedNewUser(accessToken: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.functions.invoke('seed-user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    if (error) {
      console.error('Failed to seed user data:', error)
    } else {
      console.log('User seeded successfully:', data)
    }
  } catch (error) {
    console.error('Error seeding user:', error)
  }
}

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/wardrobe'

  console.log('OAuth callback received:', { code: !!code, error, error_description })

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error_description || error)}`)
  }

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError.message)}`)
      }

      if (data.session) {
        console.log('OAuth success, redirecting to:', next)
        
        // Seed the new user with default data
        await seedNewUser(data.session.access_token)
        
        const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        if (isLocalEnv) {
          // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      }
    } catch (err) {
      console.error('Unexpected error in OAuth callback:', err)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Unexpected error occurred')}`)
    }
  }

  // No code parameter - this shouldn't happen in a proper OAuth flow
  console.error('No code parameter in OAuth callback')
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No authorization code received')}`)
}
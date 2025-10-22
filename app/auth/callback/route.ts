import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/utils/url-config'

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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/wardrobe'

  // Use our URL configuration utility instead of request origin
  const baseUrl = getBaseUrl()
  
  console.log('OAuth callback received:', { 
    code: !!code, 
    error, 
    error_description,
    baseUrl,
    requestUrl: request.url 
  })

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${encodeURIComponent(error_description || error)}`)
  }

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${encodeURIComponent(exchangeError.message)}`)
      }

      if (data.session) {
        console.log('OAuth success, redirecting to:', next)
        
        // Seed the new user with default data
        await seedNewUser(data.session.access_token)
        
        // Always use our base URL configuration for consistent redirects
        return NextResponse.redirect(`${baseUrl}${next}`)
      }
    } catch (err) {
      console.error('Unexpected error in OAuth callback:', err)
      return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${encodeURIComponent('Unexpected error occurred')}`)
    }
  }

  // No code parameter - this shouldn't happen in a proper OAuth flow
  console.error('No code parameter in OAuth callback')
  return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${encodeURIComponent('No authorization code received')}`)
}
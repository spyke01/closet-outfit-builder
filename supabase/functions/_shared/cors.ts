/**
 * Secure CORS configuration for Supabase Edge Functions
 */

/**
 * Get allowed origins based on environment
 * 
 * To configure your production domain:
 * 1. Set PRODUCTION_URL environment variable in your Supabase project settings
 * 2. Or add your domain directly to the origins array below
 */
function getAllowedOrigins(): string[] {
  const origins = [];
  
  // Always allow localhost for development (since Edge Functions run on Supabase servers)
  origins.push('http://localhost:3000');
  origins.push('http://localhost:8888'); // Netlify dev
  origins.push('http://127.0.0.1:3000');
  origins.push('http://127.0.0.1:8888');
  
  // Production domain - set this in your Supabase project environment variables
  // Example: https://your-app.netlify.app or https://your-domain.com
  if (Deno.env.get('PRODUCTION_URL')) {
    origins.push(Deno.env.get('PRODUCTION_URL')!);
  }
  
  // Netlify production URL (automatically set by Netlify)
  if (Deno.env.get('URL')) {
    origins.push(Deno.env.get('URL')!);
  }
  
  // Netlify deploy previews (automatically set by Netlify)
  if (Deno.env.get('DEPLOY_PRIME_URL')) {
    origins.push(Deno.env.get('DEPLOY_PRIME_URL')!);
  }
  
  // Add your production domain here if environment variables aren't working
  origins.push('https://chic-granita-fee33b.netlify.app');
  
  return origins;
}

/**
 * Get CORS headers with secure origin validation
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  // Debug logging
  console.log('🌐 CORS Debug:', {
    requestOrigin,
    allowedOrigins,
    env: {
      NODE_ENV: Deno.env.get('NODE_ENV'),
      PRODUCTION_URL: Deno.env.get('PRODUCTION_URL'),
      URL: Deno.env.get('URL'),
      DEPLOY_PRIME_URL: Deno.env.get('DEPLOY_PRIME_URL'),
    }
  });
  
  // Determine the allowed origin
  let allowedOrigin = 'null';
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    allowedOrigin = requestOrigin;
    console.log('✅ Origin allowed:', requestOrigin);
  } else {
    console.log('❌ Origin not allowed:', requestOrigin, 'Allowed origins:', allowedOrigins);
    // For development, be more permissive with localhost
    if (requestOrigin && (
      requestOrigin.startsWith('http://localhost:') || 
      requestOrigin.startsWith('http://127.0.0.1:')
    )) {
      allowedOrigin = requestOrigin;
      console.log('🔧 Development override - allowing localhost origin:', requestOrigin);
    } else if (allowedOrigins.length > 0) {
      // Fallback to first allowed origin if no match
      allowedOrigin = allowedOrigins[0];
    }
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(request: Request): Response {
  const origin = request.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Create a response with CORS headers
 */
export function createCorsResponse(
  body: string | null,
  init: ResponseInit,
  requestOrigin?: string
): Response {
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  return new Response(body, {
    ...init,
    headers: {
      ...init.headers,
      ...corsHeaders,
    },
  });
}
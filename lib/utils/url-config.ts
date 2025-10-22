/**
 * URL configuration utilities for consistent URL handling across environments
 */

/**
 * Get the base URL for the application
 * Priority: NETLIFY_URL > NETLIFY_URL > localhost
 */
export function getBaseUrl(): string {
  // Server-side environment variables
  if (typeof window === 'undefined') {
    if (process.env.NETLIFY_URL) {
      return `https://${process.env.NETLIFY_URL}`;
    }
    if (process.env.NETLIFY_URL) {
      return `https://${process.env.NETLIFY_URL}`;
    }
    return 'http://localhost:3000';
  }
  
  // Client-side: use window.location.origin
  return window.location.origin;
}

/**
 * Get the auth callback URL
 */
export function getAuthCallbackUrl(next: string = '/wardrobe'): string {
  return `${getBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

/**
 * Get the auth confirm URL
 */
export function getAuthConfirmUrl(): string {
  return `${getBaseUrl()}/auth/confirm`;
}

/**
 * Log current URL configuration (for debugging)
 */
export function logUrlConfig(): void {
  if (typeof window !== 'undefined') {
    console.log('🌐 URL Configuration:', {
      'window.location.origin': window.location.origin,
      'window.location.href': window.location.href,
      'baseUrl': getBaseUrl(),
      'authCallbackUrl': getAuthCallbackUrl(),
    });
  } else {
    console.log('🌐 Server URL Configuration:', {
      'NETLIFY_URL': process.env.NETLIFY_URL,
      'NODE_ENV': process.env.NODE_ENV,
      'baseUrl': getBaseUrl(),
    });
  }
}
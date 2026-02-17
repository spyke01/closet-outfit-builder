/**
 * URL configuration utilities for consistent URL handling across environments
 */
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'url-config' });

/**
 * Get the base URL for the application
 * Priority: URL > DEPLOY_PRIME_URL > localhost
 */
export function getBaseUrl(): string {
  // Server-side environment variables
  if (typeof window === 'undefined') {
    // Check for Netlify production deployment
    if (process.env.URL) {
      return process.env.URL;
    }
    // Check for Netlify deploy preview
    if (process.env.DEPLOY_PRIME_URL) {
      return process.env.DEPLOY_PRIME_URL;
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
    logger.debug('URL Configuration', {
      'window.location.origin': window.location.origin,
      'window.location.href': window.location.href,
      'baseUrl': getBaseUrl(),
      'authCallbackUrl': getAuthCallbackUrl(),
    });
  } else {
    logger.debug('Server URL Configuration', {
      'URL': process.env.URL,
      'DEPLOY_PRIME_URL': process.env.DEPLOY_PRIME_URL,
      'NODE_ENV': process.env.NODE_ENV,
      'baseUrl': getBaseUrl(),
    });
  }
}

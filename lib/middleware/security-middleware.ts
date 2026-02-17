import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { 
  validateAndSanitizeInput, 
  checkRateLimit, 
  logSecurityEvent, 
  detectMaliciousInput
} from '@/lib/utils/security';
import { createLogger } from '@/lib/utils/logger';

/**
 * Security middleware for API routes
 */

export interface SecurityConfig {
  requireAuth?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  validateInput?: z.ZodSchema<unknown>;
  allowedMethods?: readonly string[];
  requirePermissions?: {
    resource: string;
    action: 'read' | 'write' | 'delete';
  };
}

export interface SecureRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
  };
  validatedData?: unknown;
}

/**
 * Create security middleware with configuration
 */
export function createSecurityMiddleware(config: SecurityConfig = {}) {
  return async function securityMiddleware(
    request: NextRequest,
    handler: (req: SecureRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    let user: { id: string; email: string } | undefined;
    
    try {
      // Method validation
      if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
        logSecurityEvent({
          eventType: 'suspicious_activity',
          ipAddress: clientIp,
          userAgent,
          details: { method: request.method, allowedMethods: config.allowedMethods },
          severity: 'medium',
        });
        
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      // Rate limiting
      if (config.rateLimit) {
        const rateLimitResult = checkRateLimit(
          clientIp,
          config.rateLimit.maxRequests,
          config.rateLimit.windowMs
        );

        if (!rateLimitResult.allowed) {
          logSecurityEvent({
            eventType: 'rate_limit_exceeded',
            ipAddress: clientIp,
            userAgent,
            details: { limit: config.rateLimit.maxRequests, window: config.rateLimit.windowMs },
            severity: 'medium',
          });

          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { 
              status: 429,
              headers: {
                'X-RateLimit-Limit': config.rateLimit.maxRequests.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
              }
            }
          );
        }
      }

      // Authentication
      if (config.requireAuth) {
        const authResult = await validateAuthentication();
        if (!authResult.success) {
          logSecurityEvent({
            eventType: 'auth_failure',
            ipAddress: clientIp,
            userAgent,
            details: { reason: authResult.error },
            severity: 'high',
          });

          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
        user = authResult.user;
      }

      // Input validation and sanitization
      let validatedData: unknown;
      if (config.validateInput) {
        const inputValidationResult = await validateRequestInput(request, config.validateInput);
        if (!inputValidationResult.success) {
          logSecurityEvent({
            eventType: 'validation_error',
            userId: user?.id,
            ipAddress: clientIp,
            userAgent,
            details: { error: inputValidationResult.error },
            severity: 'medium',
          });

          return NextResponse.json(
            { error: 'Invalid input', details: inputValidationResult.error },
            { status: 400 }
          );
        }
        validatedData = inputValidationResult.data;
      }

      // Permission validation
      if (config.requirePermissions && user) {
        const permissionResult = await validatePermissions(
          user.id,
          config.requirePermissions.resource,
          config.requirePermissions.action,
          request
        );

        if (!permissionResult.allowed) {
          logSecurityEvent({
            eventType: 'permission_denied',
            userId: user.id,
            ipAddress: clientIp,
            userAgent,
            details: { 
              resource: config.requirePermissions.resource,
              action: config.requirePermissions.action,
              reason: permissionResult.reason 
            },
            severity: 'high',
          });

          return NextResponse.json(
            { error: 'Permission denied' },
            { status: 403 }
          );
        }
      }

      // Create secure request object
      const secureRequest = request as SecureRequest;
      secureRequest.user = user;
      secureRequest.validatedData = validatedData;

      // Call the actual handler
      const response = await handler(secureRequest);

      // Add security headers
      const secureResponse = addSecurityHeaders(response);

      // Log successful request (in development only)
      logger.debug('Secure API request completed', {
        method: request.method,
        url: request.url,
        durationMs: Date.now() - startTime,
      });

      return secureResponse;

    } catch (error) {
      logSecurityEvent({
        eventType: 'suspicious_activity',
        userId: user?.id,
        ipAddress: clientIp,
        userAgent,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'high',
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Validate authentication from request
 */
async function validateAuthentication(): Promise<
  | { success: true; user: { id: string; email: string } }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false, error: 'Invalid or missing authentication' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
      },
    };
  } catch {
    return { success: false, error: 'Authentication validation failed' };
  }
}

/**
 * Validate and sanitize request input
 */
async function validateRequestInput(
  request: NextRequest,
  schema: z.ZodSchema<unknown>
): Promise<
  | { success: true; data: unknown }
  | { success: false; error: string }
> {
  try {
    let inputData: unknown;

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      inputData = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      inputData = Object.fromEntries(formData.entries());
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      inputData = Object.fromEntries(formData.entries());
    } else {
      // For GET requests, use URL parameters
      const url = new URL(request.url);
      inputData = Object.fromEntries(url.searchParams.entries());
    }

    // Check for malicious input patterns
    const inputString = JSON.stringify(inputData);
    const maliciousCheck = detectMaliciousInput(inputString);
    
    if (maliciousCheck.isMalicious) {
      logSecurityEvent({
        eventType: 'suspicious_activity',
        ipAddress: getClientIp(request),
        details: { 
          patterns: maliciousCheck.patterns,
          severity: maliciousCheck.severity 
        },
        severity: maliciousCheck.severity,
      });

      return { success: false, error: 'Malicious input detected' };
    }

    // Validate and sanitize with Zod
    const validationResult = validateAndSanitizeInput(schema, inputData, true);
    
    if (!validationResult.success) {
      return { success: false, error: validationResult.error };
    }

    return { success: true, data: validationResult.data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Input validation failed' 
    };
  }
}

/**
 * Validate user permissions for resource access
 */
async function validatePermissions(
  userId: string,
  resource: string,
  _action: 'read' | 'write' | 'delete',
  request: NextRequest
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = await createClient();
    
    // Extract resource ID from URL or request body
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const resourceId = pathSegments[pathSegments.length - 1];

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resourceId)) {
      return { allowed: false, reason: 'Invalid resource ID format' };
    }

    // Check resource ownership through RLS
    let query;
    switch (resource) {
      case 'wardrobe_item':
        query = supabase.from('wardrobe_items').select('user_id').eq('id', resourceId);
        break;
      case 'outfit':
        query = supabase.from('outfits').select('user_id').eq('id', resourceId);
        break;
      case 'category':
        query = supabase.from('categories').select('user_id').eq('id', resourceId);
        break;
      default:
        return { allowed: false, reason: 'Unknown resource type' };
    }

    const { data, error } = await query.single();
    
    if (error) {
      return { allowed: false, reason: 'Resource not found or access denied' };
    }

    if (data.user_id !== userId) {
      return { allowed: false, reason: 'User does not own this resource' };
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Permission validation failed' };
  }
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Clone response to modify headers
  const secureResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  // Security headers
  secureResponse.headers.set('X-Content-Type-Options', 'nosniff');
  secureResponse.headers.set('X-Frame-Options', 'DENY');
  secureResponse.headers.set('X-XSS-Protection', '1; mode=block');
  secureResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secureResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: *.supabase.co; font-src 'self' data:; connect-src 'self' https://api.openweathermap.org https://maps.googleapis.com https://*.supabase.co wss://*.supabase.co https://ahjwzpyammiqelloazvn.supabase.co; frame-ancestors 'none'; object-src 'none';"
  );

  return secureResponse;
}

/**
 * Extract client IP address from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}

/**
 * Middleware wrapper for easy use in API routes
 */
export function withSecurity(config: SecurityConfig = {}) {
  return function (handler: (req: SecureRequest) => Promise<NextResponse>) {
    const middleware = createSecurityMiddleware(config);
    
    return async function secureHandler(request: NextRequest) {
      return middleware(request, handler);
    };
  };
}

/**
 * Common security configurations
 */
export const SecurityConfigs = {
  // For public endpoints that don't require auth
  public: {
    rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
    allowedMethods: ['GET', 'POST'],
  },
  
  // For authenticated endpoints
  authenticated: {
    requireAuth: true,
    rateLimit: { maxRequests: 200, windowMs: 15 * 60 * 1000 }, // 200 requests per 15 minutes
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  
  // For file upload endpoints
  fileUpload: {
    requireAuth: true,
    rateLimit: { maxRequests: 20, windowMs: 15 * 60 * 1000 }, // 20 uploads per 15 minutes
    allowedMethods: ['POST'],
  },
  
  // For sensitive operations
  sensitive: {
    requireAuth: true,
    rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 }, // 50 requests per 15 minutes
    allowedMethods: ['POST', 'PUT', 'DELETE'],
  },
} as const;
const logger = createLogger({ component: 'security-middleware' });

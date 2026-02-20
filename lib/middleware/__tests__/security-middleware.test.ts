import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  createSecurityMiddleware, 
  withSecurity, 
  SecurityConfigs,
  SecureRequest 
} from '../security-middleware';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

// Mock security utilities
vi.mock('@/lib/utils/security', () => ({
  validateAndSanitizeInput: vi.fn(),
  checkRateLimit: vi.fn(),
  logSecurityEvent: vi.fn(),
  detectMaliciousInput: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { 
  validateAndSanitizeInput, 
  checkRateLimit, 
  logSecurityEvent, 
  detectMaliciousInput 
} from '@/lib/utils/security';

describe('Security Middleware', () => {
  type MockSupabase = {
    auth: { getUser: Mock };
    from: Mock;
  };

  let mockSupabase: MockSupabase;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    };
    
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 });
    vi.mocked(validateAndSanitizeInput).mockReturnValue({ success: true, data: {} });
    vi.mocked(detectMaliciousInput).mockReturnValue({ isMalicious: false, patterns: [], severity: 'low' });
  });

  describe('Method Validation', () => {
    it('should allow requests with permitted methods', async () => {
      const middleware = createSecurityMiddleware({
        allowedMethods: ['GET', 'POST'],
      });

      const request = new NextRequest('https://example.com/api/test', { method: 'GET' });
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should reject requests with forbidden methods', async () => {
      const middleware = createSecurityMiddleware({
        allowedMethods: ['GET', 'POST'],
      });

      const request = new NextRequest('https://example.com/api/test', { method: 'DELETE' });
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(405);
      expect(logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'suspicious_activity',
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: { method: 'DELETE', allowedMethods: ['GET', 'POST'] },
        severity: 'medium',
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 5, resetTime: Date.now() + 60000 });

      const middleware = createSecurityMiddleware({
        rateLimit: { maxRequests: 10, windowMs: 60000 },
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should reject requests exceeding rate limit', async () => {
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 60000 });

      const middleware = createSecurityMiddleware({
        rateLimit: { maxRequests: 10, windowMs: 60000 },
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
      expect(logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'rate_limit_exceeded',
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: { limit: 10, window: 60000 },
        severity: 'medium',
      });
    });

    it('should include rate limit headers in response', async () => {
      const resetTime = Date.now() + 60000;
      vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetTime });

      const middleware = createSecurityMiddleware({
        rateLimit: { maxRequests: 10, windowMs: 60000 },
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
    });
  });

  describe('Authentication', () => {
    it('should allow requests when authentication is not required', async () => {
      const middleware = createSecurityMiddleware({
        requireAuth: false,
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should allow authenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const middleware = createSecurityMiddleware({
        requireAuth: true,
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      
      // Check that user was passed to handler
      const secureRequest = handler.mock.calls[0][0] as SecureRequest;
      expect(secureRequest.user).toEqual({ id: 'user123', email: 'test@example.com' });
    });

    it('should reject unauthenticated requests when auth is required', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No user'),
      });

      const middleware = createSecurityMiddleware({
        requireAuth: true,
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'auth_failure',
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: { reason: 'Invalid or missing authentication' },
        severity: 'high',
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate and sanitize input successfully', async () => {
      const validatedData = { name: 'John', email: 'john@example.com' };
      vi.mocked(validateAndSanitizeInput).mockReturnValue({ success: true, data: validatedData });

      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const middleware = createSecurityMiddleware({
        validateInput: schema,
      });

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      });

      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      
      // Check that validated data was passed to handler
      const secureRequest = handler.mock.calls[0][0] as SecureRequest;
      expect(secureRequest.validatedData).toEqual(validatedData);
    });

    it('should reject invalid input', async () => {
      vi.mocked(validateAndSanitizeInput).mockReturnValue({ 
        success: false, 
        error: 'Invalid email format' 
      });

      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const middleware = createSecurityMiddleware({
        validateInput: schema,
      });

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'John', email: 'invalid-email' }),
      });

      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
      expect(logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'validation_error',
        userId: undefined,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: { error: 'Invalid email format' },
        severity: 'medium',
      });
    });

    it('should detect and reject malicious input', async () => {
      vi.mocked(detectMaliciousInput).mockReturnValue({
        isMalicious: true,
        patterns: ['sql_injection'],
        severity: 'high',
      });

      const schema = z.object({ query: z.string() });

      const middleware = createSecurityMiddleware({
        validateInput: schema,
      });

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: "'; DROP TABLE users; --" }),
      });

      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
      expect(logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'suspicious_activity',
        ipAddress: 'unknown',
        details: { patterns: ['sql_injection'], severity: 'high' },
        severity: 'high',
      });
    });
  });

  describe('Permission Validation', () => {
    it('should allow access when user owns the resource', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user123' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockQuery),
        }),
      });

      const middleware = createSecurityMiddleware({
        requireAuth: true,
        requirePermissions: {
          resource: 'wardrobe_item',
          action: 'read',
        },
      });

      const request = new NextRequest('https://example.com/api/wardrobe_items/550e8400-e29b-41d4-a716-446655440000');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should deny access when user does not own the resource', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const mockQuery = {
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'different-user' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockQuery),
        }),
      });

      const middleware = createSecurityMiddleware({
        requireAuth: true,
        requirePermissions: {
          resource: 'wardrobe_item',
          action: 'read',
        },
      });

      const request = new NextRequest('https://example.com/api/wardrobe_items/550e8400-e29b-41d4-a716-446655440000');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'permission_denied',
        userId: 'user123',
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: {
          resource: 'wardrobe_item',
          action: 'read',
          reason: 'User does not own this resource',
        },
        severity: 'high',
      });
    });

    it('should deny access for invalid resource ID format', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const middleware = createSecurityMiddleware({
        requireAuth: true,
        requirePermissions: {
          resource: 'wardrobe_item',
          action: 'read',
        },
      });

      const request = new NextRequest('https://example.com/api/wardrobe_items/invalid-id');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to responses', async () => {
      const middleware = createSecurityMiddleware({});

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });
  });

  describe('Client IP Detection', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      const middleware = createSecurityMiddleware({
        rateLimit: { maxRequests: 1, windowMs: 60000 },
      });

      const request = new NextRequest('https://example.com/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      await middleware(request, handler);

      expect(checkRateLimit).toHaveBeenCalledWith('192.168.1.1', 1, 60000);
    });

    it('should extract IP from X-Real-IP header', async () => {
      const middleware = createSecurityMiddleware({
        rateLimit: { maxRequests: 1, windowMs: 60000 },
      });

      const request = new NextRequest('https://example.com/api/test', {
        headers: { 'x-real-ip': '192.168.1.2' },
      });
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      await middleware(request, handler);

      expect(checkRateLimit).toHaveBeenCalledWith('192.168.1.2', 1, 60000);
    });

    it('should extract IP from CF-Connecting-IP header', async () => {
      const middleware = createSecurityMiddleware({
        rateLimit: { maxRequests: 1, windowMs: 60000 },
      });

      const request = new NextRequest('https://example.com/api/test', {
        headers: { 'cf-connecting-ip': '192.168.1.3' },
      });
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      await middleware(request, handler);

      expect(checkRateLimit).toHaveBeenCalledWith('192.168.1.3', 1, 60000);
    });

    it('should use "unknown" when no IP headers are present', async () => {
      const middleware = createSecurityMiddleware({
        rateLimit: { maxRequests: 1, windowMs: 60000 },
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      await middleware(request, handler);

      expect(checkRateLimit).toHaveBeenCalledWith('unknown', 1, 60000);
    });
  });

  describe('withSecurity Wrapper', () => {
    it('should create a secure handler with configuration', async () => {
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));
      const secureHandler = withSecurity({
        requireAuth: false,
        rateLimit: { maxRequests: 10, windowMs: 60000 },
      })(handler);

      const request = new NextRequest('https://example.com/api/test');
      const response = await secureHandler(request);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('Security Configurations', () => {
    it('should provide public endpoint configuration', () => {
      expect(SecurityConfigs.public).toEqual({
        rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 },
        allowedMethods: ['GET', 'POST'],
      });
    });

    it('should provide authenticated endpoint configuration', () => {
      expect(SecurityConfigs.authenticated).toEqual({
        requireAuth: true,
        rateLimit: { maxRequests: 200, windowMs: 15 * 60 * 1000 },
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      });
    });

    it('should provide file upload configuration', () => {
      expect(SecurityConfigs.fileUpload).toEqual({
        requireAuth: true,
        rateLimit: { maxRequests: 20, windowMs: 15 * 60 * 1000 },
        allowedMethods: ['POST'],
      });
    });

    it('should provide sensitive operations configuration', () => {
      expect(SecurityConfigs.sensitive).toEqual({
        requireAuth: true,
        rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 },
        allowedMethods: ['POST', 'PUT', 'DELETE'],
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      const middleware = createSecurityMiddleware({});
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      const request = new NextRequest('https://example.com/api/test');
      const response = await middleware(request, handler);

      expect(response.status).toBe(500);
      expect(logSecurityEvent).toHaveBeenCalledWith({
        eventType: 'suspicious_activity',
        userId: undefined,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: { error: 'Handler error' },
        severity: 'high',
      });
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth service error'));

      const middleware = createSecurityMiddleware({
        requireAuth: true,
      });

      const request = new NextRequest('https://example.com/api/test');
      const handler = vi.fn().mockResolvedValue(new NextResponse('OK'));

      const response = await middleware(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });
});

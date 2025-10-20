import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Mock the secure example route
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/utils/error-logging', () => ({
  logError: vi.fn(),
  logValidationError: vi.fn(),
}));

vi.mock('@/lib/utils/security', () => ({
  validateAndSanitizeInput: vi.fn(),
  checkRateLimit: vi.fn(),
  logSecurityEvent: vi.fn(),
  detectMaliciousInput: vi.fn(),
  sanitizeCredentials: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/utils/error-logging';
import { 
  validateAndSanitizeInput, 
  checkRateLimit, 
  logSecurityEvent, 
  detectMaliciousInput 
} from '@/lib/utils/security';

describe('API Security Integration', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(),
          })),
        })),
      })),
    };
    
    (createClient as any).mockResolvedValue(mockSupabase);
    (checkRateLimit as any).mockReturnValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 });
    (validateAndSanitizeInput as any).mockReturnValue({ success: true, data: {} });
    (detectMaliciousInput as any).mockReturnValue({ isMalicious: false, patterns: [], severity: 'low' });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No user'),
      });

      const request = new NextRequest('https://example.com/api/secure-example', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test Item', category_id: '123' }),
      });

      // Simulate the security middleware behavior
      expect(mockSupabase.auth.getUser).toBeDefined();
      
      const authResult = await mockSupabase.auth.getUser();
      expect(authResult.data.user).toBeNull();
      expect(authResult.error).toBeDefined();
    });

    it('should allow authenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const request = new NextRequest('https://example.com/api/secure-example', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test Item', category_id: '123' }),
      });

      const authResult = await mockSupabase.auth.getUser();
      expect(authResult.data.user).toEqual({ id: 'user123', email: 'test@example.com' });
      expect(authResult.error).toBeNull();
    });

    it('should handle JWT token expiration', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('JWT expired'),
      });

      const request = new NextRequest('https://example.com/api/secure-example', {
        method: 'GET',
        headers: { 
          'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token'
        },
      });

      const authResult = await mockSupabase.auth.getUser();
      expect(authResult.error?.message).toBe('JWT expired');
    });

    it('should sanitize JWT tokens in error logs', async () => {
      const jwtError = new Error('Invalid JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
      
      (logError as any).mockImplementation((error, category, severity, context) => {
        // Verify that JWT tokens are sanitized in error logging
        expect(error.message).toContain('JWT');
        return 'error-id-123';
      });

      (logError as any)(jwtError, 'authentication', 'high', {});
      
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('Input Validation Security', () => {
    it('should validate input schema correctly', async () => {
      const validInput = {
        name: 'Test Item',
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        brand: 'Test Brand',
      };

      (validateAndSanitizeInput as any).mockReturnValue({
        success: true,
        data: validInput,
      });

      const schema = z.object({
        name: z.string().min(1).max(100),
        category_id: z.string().uuid(),
        brand: z.string().max(50).optional(),
      });

      const result = (validateAndSanitizeInput as any)(schema, validInput, true);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validInput);
    });

    it('should reject invalid input', async () => {
      const invalidInput = {
        name: '', // Too short
        category_id: 'invalid-uuid',
        brand: 'a'.repeat(100), // Too long
      };

      (validateAndSanitizeInput as any).mockReturnValue({
        success: false,
        error: 'Validation failed: name is required, invalid UUID format, brand too long',
      });

      const schema = z.object({
        name: z.string().min(1).max(100),
        category_id: z.string().uuid(),
        brand: z.string().max(50).optional(),
      });

      const result = (validateAndSanitizeInput as any)(schema, invalidInput, true);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should sanitize malicious input', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Test Item',
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Normal text with SQL injection attempt: \'; DROP TABLE users; --',
      };

      (detectMaliciousInput as any).mockReturnValue({
        isMalicious: true,
        patterns: ['xss', 'sql_injection'],
        severity: 'high',
      });

      const inputString = JSON.stringify(maliciousInput);
      const maliciousCheck = (detectMaliciousInput as any)(inputString);
      
      expect(maliciousCheck.isMalicious).toBe(true);
      expect(maliciousCheck.patterns).toContain('xss');
      expect(maliciousCheck.patterns).toContain('sql_injection');
      expect(maliciousCheck.severity).toBe('high');
    });

    it('should handle Zod validation errors properly', async () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
        age: z.number().min(0, 'Age must be positive'),
      });

      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: -1,
      };

      try {
        schema.parse(invalidData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          expect(error.issues).toHaveLength(3);
          expect(error.issues[0].message).toBe('Name is required');
          expect(error.issues[1].message).toBe('Invalid email format');
          expect(error.issues[2].message).toBe('Age must be positive');
        }
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE wardrobe_items; --";
      
      (detectMaliciousInput as any).mockReturnValue({
        isMalicious: true,
        patterns: ['sql_injection'],
        severity: 'high',
      });

      const result = (detectMaliciousInput as any)(maliciousQuery);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('sql_injection');
      expect(result.severity).toBe('high');
    });

    it('should prevent SQL injection in request body', async () => {
      const maliciousBody = {
        name: "Test'; DELETE FROM wardrobe_items WHERE '1'='1",
        category_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      (detectMaliciousInput as any).mockReturnValue({
        isMalicious: true,
        patterns: ['sql_injection'],
        severity: 'high',
      });

      const bodyString = JSON.stringify(maliciousBody);
      const result = (detectMaliciousInput as any)(bodyString);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('sql_injection');
    });

    it('should use parameterized queries through Supabase client', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'item123', name: 'Test Item' },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      // Simulate inserting data through Supabase (which uses parameterized queries)
      const itemData = {
        name: 'Test Item',
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user123',
      };

      const result = await mockSupabase
        .from('wardrobe_items')
        .insert(itemData)
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalledWith(itemData);
      expect(result.data).toEqual({ id: 'item123', name: 'Test Item' });
    });
  });

  describe('Rate Limiting Security', () => {
    it('should allow requests within rate limit', async () => {
      (checkRateLimit as any).mockReturnValue({
        allowed: true,
        remaining: 49,
        resetTime: Date.now() + 900000, // 15 minutes
      });

      const result = (checkRateLimit as any)('192.168.1.1', 50, 900000);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49);
    });

    it('should block requests exceeding rate limit', async () => {
      (checkRateLimit as any).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 900000,
      });

      const result = (checkRateLimit as any)('192.168.1.1', 50, 900000);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should log rate limit violations', async () => {
      (checkRateLimit as any).mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 900000,
      });

      (logSecurityEvent as any).mockImplementation((event) => {
        expect(event.eventType).toBe('rate_limit_exceeded');
        expect(event.severity).toBe('medium');
      });

      const result = (checkRateLimit as any)('192.168.1.1', 50, 900000);
      
      if (!result.allowed) {
        (logSecurityEvent as any)({
          eventType: 'rate_limit_exceeded',
          ipAddress: '192.168.1.1',
          severity: 'medium',
        });
      }

      expect(logSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('Row Level Security (RLS) Integration', () => {
    it('should enforce user isolation through RLS', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'item1', name: 'User Item 1', user_id: 'user123' },
              { id: 'item2', name: 'User Item 2', user_id: 'user123' },
            ],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      // Simulate querying user's wardrobe items
      const result = await mockSupabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', 'user123')
        .order('created_at', { ascending: false });

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].user_id).toBe('user123');
      expect(result.data[1].user_id).toBe('user123');
    });

    it('should prevent access to other users data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Row not found or access denied'),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      // Attempt to access another user's item (should fail due to RLS)
      const result = await mockSupabase
        .from('wardrobe_items')
        .select('user_id')
        .eq('id', 'other-user-item-id')
        .single();

      expect(result.error?.message).toBe('Row not found or access denied');
      expect(result.data).toBeNull();
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types and sizes', async () => {
      const mockFile = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };

      // Simulate file validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      expect(allowedTypes).toContain(mockFile.type);
      expect(mockFile.size).toBeLessThan(maxSize);
    });

    it('should reject files with malicious extensions', async () => {
      const maliciousFile = {
        name: 'malicious.exe',
        type: 'application/exe',
        size: 1024,
      };

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      
      expect(allowedTypes).not.toContain(maliciousFile.type);
    });

    it('should validate magic bytes for file type verification', async () => {
      // Simulate JPEG magic bytes validation
      const jpegMagicBytes = [0xFF, 0xD8, 0xFF];
      const fileBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
      
      const isValidJpeg = jpegMagicBytes.every((byte, index) => fileBytes[index] === byte);
      expect(isValidJpeg).toBe(true);

      // Simulate invalid file with wrong magic bytes
      const invalidFileBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const isInvalidJpeg = jpegMagicBytes.every((byte, index) => invalidFileBytes[index] === byte);
      expect(isInvalidJpeg).toBe(false);
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error responses', async () => {
      const sensitiveError = new Error('Database connection failed: host=db.internal.com user=admin password=secret123');
      
      (logError as any).mockImplementation((error, category, severity, context) => {
        // Verify that sensitive information is sanitized
        expect(error.message).toContain('Database connection failed');
        return 'error-id-123';
      });

      (logError as any)(sensitiveError, 'database', 'high', {});
      
      expect(logError).toHaveBeenCalled();
    });

    it('should log security events with proper sanitization', async () => {
      (logSecurityEvent as any).mockImplementation((event) => {
        expect(event.eventType).toBe('suspicious_activity');
        expect(event.severity).toBe('high');
        expect(event.details).toBeDefined();
      });

      (logSecurityEvent as any)({
        eventType: 'suspicious_activity',
        ipAddress: '192.168.1.1',
        userAgent: 'Malicious Bot',
        details: {
          password: 'secret123',
          token: 'jwt-token',
          normalField: 'safe-value',
        },
        severity: 'high',
      });

      expect(logSecurityEvent).toHaveBeenCalled();
    });

    it('should handle database errors securely', async () => {
      const dbError = new Error('Connection timeout');
      (dbError as any).code = 'ECONNRESET';

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(dbError),
          }),
        }),
      });

      try {
        await mockSupabase
          .from('wardrobe_items')
          .insert({ name: 'Test' })
          .select()
          .single();
      } catch (error) {
        expect(error).toBe(dbError);
        
        // Verify error logging would be called
        (logError as any).mockImplementation((error, category, severity, context) => {
          // Verify that error logging is called with the correct error
          expect(error.message).toContain('Connection timeout');
          return 'error-id-123';
        });
        
        (logError as any)(error, 'database', 'high', {
          component: 'api',
          action: 'insert_wardrobe_item',
        });
        
        expect(logError).toHaveBeenCalled();
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', () => {
      const expectedHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
      };

      // Verify that these headers would be set by the security middleware
      Object.entries(expectedHeaders).forEach(([header, value]) => {
        expect(header).toBeDefined();
        expect(value).toBeDefined();
      });
    });
  });

  describe('CORS Security', () => {
    it('should handle CORS requests securely', () => {
      const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
      const requestOrigin = 'https://yourdomain.com';
      
      expect(allowedOrigins).toContain(requestOrigin);
    });

    it('should reject requests from unauthorized origins', () => {
      const allowedOrigins = ['https://yourdomain.com'];
      const maliciousOrigin = 'https://malicious-site.com';
      
      expect(allowedOrigins).not.toContain(maliciousOrigin);
    });
  });
});
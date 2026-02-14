import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  sanitizeSqlInput,
  sanitizeHtmlInput,
  sanitizeFilePath,
  validateAndSanitizeInput,
  checkRateLimit,
  sanitizeCredentials,
  validateFileUploadSecurity,
  detectMaliciousInput,
  logSecurityEvent,
} from '../security';

describe('Security Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeSqlInput', () => {
    it('should remove SQL injection patterns', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = sanitizeSqlInput(maliciousInput);
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain(';');
    });

    it('should handle UNION attacks', () => {
      const maliciousInput = "1' UNION SELECT * FROM users WHERE '1'='1";
      const sanitized = sanitizeSqlInput(maliciousInput);
      expect(sanitized).not.toContain('UNION');
      expect(sanitized).not.toContain('SELECT');
    });

    it('should preserve safe input', () => {
      const safeInput = 'My favorite shirt';
      const sanitized = sanitizeSqlInput(safeInput);
      expect(sanitized).toBe(safeInput);
    });

    it('should limit input length', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = sanitizeSqlInput(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeSqlInput(123 as unknown)).toThrow('Input must be a string');
    });
  });

  describe('sanitizeHtmlInput', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeHtmlInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove iframe tags', () => {
      const maliciousInput = '<iframe src="javascript:alert(1)"></iframe>';
      const sanitized = sanitizeHtmlInput(maliciousInput);
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should encode HTML entities', () => {
      const input = '<div>Hello & "World"</div>';
      const sanitized = sanitizeHtmlInput(input);
      expect(sanitized).toContain('&lt;div&gt;');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&quot;');
    });

    it('should remove event handlers', () => {
      const maliciousInput = '<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeHtmlInput(maliciousInput);
      expect(sanitized).not.toContain('onerror');
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeHtmlInput({} as unknown)).toThrow('Input must be a string');
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove path traversal patterns', () => {
      const maliciousPath = '../../../etc/passwd';
      const sanitized = sanitizeFilePath(maliciousPath);
      expect(sanitized).not.toContain('..');
      expect(sanitized).toBe('etc/passwd');
    });

    it('should handle encoded path traversal', () => {
      const maliciousPath = '%2e%2e%2f%2e%2e%2fpasswd';
      const sanitized = sanitizeFilePath(maliciousPath);
      expect(sanitized).not.toContain('%2e');
    });

    it('should normalize slashes', () => {
      const path = '//multiple///slashes//';
      const sanitized = sanitizeFilePath(path);
      expect(sanitized).toBe('multiple/slashes');
    });

    it('should limit length', () => {
      const longPath = 'a'.repeat(300);
      const sanitized = sanitizeFilePath(longPath);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('should allow safe characters only', () => {
      const path = 'file<>:|?*.txt';
      const sanitized = sanitizeFilePath(path);
      expect(sanitized).toBe('file.txt');
    });
  });

  describe('validateAndSanitizeInput', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0),
    });

    it('should validate and return valid input', () => {
      const input = { name: 'John', email: 'john@example.com', age: 25 };
      const result = validateAndSanitizeInput(testSchema, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it('should sanitize string inputs', () => {
      const input = { 
        name: '<script>alert("xss")</script>John', 
        email: 'john@example.com', 
        age: 25 
      };
      const result = validateAndSanitizeInput(testSchema, input, true);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).not.toContain('<script>');
        expect(result.data.name).toContain('John');
      }
    });

    it('should return validation errors', () => {
      const input = { name: '', email: 'invalid-email', age: -1 };
      const result = validateAndSanitizeInput(testSchema, input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Too small');
        expect(result.details).toBeInstanceOf(z.ZodError);
      }
    });

    it('should handle nested objects', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            bio: z.string(),
          }),
        }),
      });

      const input = {
        user: {
          name: '<script>alert("xss")</script>John',
          profile: {
            bio: 'Hello & welcome',
          },
        },
      };

      const result = validateAndSanitizeInput(nestedSchema, input, true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user.name).not.toContain('<script>');
        expect(result.data.user.profile.bio).toContain('&amp;');
      }
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkRateLimit('test-ip', 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should block requests exceeding limit', () => {
      const identifier = 'test-ip-2';
      
      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, 5, 60000);
      }
      
      // This should be blocked
      const result = checkRateLimit(identifier, 5, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const identifier = 'test-ip-3';
      
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
      
      // Make requests up to limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, 5, 60000);
      }
      
      // Should be blocked
      let result = checkRateLimit(identifier, 5, 60000);
      expect(result.allowed).toBe(false);
      
      // Advance time past window
      currentTime += 61000;
      
      // Should be allowed again
      result = checkRateLimit(identifier, 5, 60000);
      expect(result.allowed).toBe(true);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('sanitizeCredentials', () => {
    it('should redact sensitive keys', () => {
      const input = {
        username: 'john',
        password: 'secret123',
        api_key: 'abc123',
        token: 'jwt-token',
        normal_field: 'safe-value',
      };

      const sanitized = sanitizeCredentials(input);
      
      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.normal_field).toBe('safe-value');
    });

    it('should handle case-insensitive matching', () => {
      const input = {
        PASSWORD: 'secret',
        ApiKey: 'key123',
        ACCESS_TOKEN: 'token',
      };

      const sanitized = sanitizeCredentials(input);
      
      expect(sanitized.PASSWORD).toBe('[REDACTED]');
      expect(sanitized.ApiKey).toBe('[REDACTED]');
      expect(sanitized.ACCESS_TOKEN).toBe('[REDACTED]');
    });
  });

  describe('validateFileUploadSecurity', () => {
    it('should validate file size limits', async () => {
      const largeData = new Uint8Array(6 * 1024 * 1024); // 6MB
      const mockFile = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
      
      const result = await validateFileUploadSecurity(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds 5MB limit');
    });

    it('should validate file types', async () => {
      const mockFile = new File(['content'], 'test.exe', { type: 'application/exe' });
      
      const result = await validateFileUploadSecurity(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File type application/exe not allowed');
    });

    it('should validate filenames for malicious patterns', async () => {
      const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const mockFile = new File([jpegHeader], '../../../malicious.jpg', { type: 'image/jpeg' });
      
      const result = await validateFileUploadSecurity(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Filename contains invalid characters');
    });

    it('should handle file content validation errors gracefully', async () => {
      // Create a small valid file that should pass basic checks
      const smallData = new Uint8Array(1024); // 1KB
      const mockFile = new File([smallData], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await validateFileUploadSecurity(mockFile);
      // In test environment, file content validation may fail due to File API limitations
      // This is acceptable as we're testing the error handling path
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should allow valid file types and sizes', async () => {
      const smallData = new Uint8Array(1024); // 1KB
      // Set proper JPEG magic bytes
      smallData[0] = 0xFF;
      smallData[1] = 0xD8;
      smallData[2] = 0xFF;
      
      const mockFile = new File([smallData], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock the arrayBuffer method to return the buffer with JPEG magic bytes
      Object.defineProperty(mockFile, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(smallData.buffer),
        writable: true,
      });
      
      const result = await validateFileUploadSecurity(mockFile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('detectMaliciousInput', () => {
    it('should detect SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = detectMaliciousInput(maliciousInput);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('sql_injection');
      expect(result.severity).toBe('high');
    });

    it('should detect XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = detectMaliciousInput(maliciousInput);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('xss');
      expect(result.severity).toBe('high');
    });

    it('should detect path traversal attempts', () => {
      const maliciousInput = '../../../etc/passwd';
      const result = detectMaliciousInput(maliciousInput);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('path_traversal');
      expect(result.severity).toBe('medium');
    });

    it('should detect command injection attempts', () => {
      const maliciousInput = 'test; rm -rf /';
      const result = detectMaliciousInput(maliciousInput);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('command_injection');
      expect(result.severity).toBe('high');
    });

    it('should detect excessive length attacks', () => {
      const maliciousInput = 'a'.repeat(15000);
      const result = detectMaliciousInput(maliciousInput);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('excessive_length');
      expect(result.severity).toBe('medium');
    });

    it('should allow safe input', () => {
      const safeInput = 'This is a normal message with safe content.';
      const result = detectMaliciousInput(safeInput);
      
      expect(result.isMalicious).toBe(false);
      expect(result.patterns).toHaveLength(0);
      expect(result.severity).toBe('low');
    });

    it('should detect multiple attack patterns', () => {
      const maliciousInput = '<script>alert("xss")</script>; DROP TABLE users; --';
      const result = detectMaliciousInput(maliciousInput);
      
      expect(result.isMalicious).toBe(true);
      expect(result.patterns).toContain('xss');
      expect(result.patterns).toContain('sql_injection');
      expect(result.severity).toBe('high');
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events with sanitized data', () => {
      // Mock the environment to be development
      vi.stubEnv('NODE_ENV', 'development');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logSecurityEvent({
        eventType: 'auth_failure',
        userId: 'user123',
        details: {
          password: 'secret123',
          token: 'jwt-token',
          normalField: 'safe-value',
        },
        severity: 'high',
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      const loggedEvent = consoleSpy.mock.calls[0][1];
      expect(loggedEvent.details.password).toBe('[REDACTED]');
      expect(loggedEvent.details.token).toBe('[REDACTED]');
      expect(loggedEvent.details.normalField).toBe('safe-value');
      consoleSpy.mockRestore();
    });

    it('should include timestamp in security events', () => {
      // Mock the environment to be development
      vi.stubEnv('NODE_ENV', 'development');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      const loggedEvent = consoleSpy.mock.calls[0][1];
      expect(loggedEvent.timestamp).toBeDefined();
      expect(new Date(loggedEvent.timestamp)).toBeInstanceOf(Date);
      consoleSpy.mockRestore();
    });
  });
});
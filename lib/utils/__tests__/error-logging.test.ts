import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  ErrorLogger,
  errorLogger,
  logAuthError,
  logValidationError,
  logSecurityEvent,
  logDatabaseError,
  logFileUploadError,
} from '../error-logging';

describe('Error Logging System', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
    vi.clearAllMocks();
  });

  describe('ErrorLogger', () => {
    it('should be a singleton', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should generate unique error IDs', () => {
      const error1 = new Error('Test error 1');
      const error2 = new Error('Test error 2');
      
      const id1 = errorLogger.logError(error1, 'system', 'medium');
      const id2 = errorLogger.logError(error2, 'system', 'medium');
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^err_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^err_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('should sanitize error messages', () => {
      const sensitiveError = new Error('JWT token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test and API key: abcdef123456789012345678901234567890');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(sensitiveError, 'security', 'high');
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].message).toContain('[JWT_REDACTED]');
      expect(logs[0].message).toContain('[API_KEY_REDACTED]');
      expect(logs[0].message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(logs[0].message).not.toContain('abcdef123456789012345678901234567890');
      
      consoleSpy.mockRestore();
    });

    it('should sanitize stack traces', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
        at /home/user/sensitive/path/file.js:10:5
        at /another/sensitive/path/handler.js:20:10
        at /third/path/controller.js:30:15`;
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'system', 'medium');
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].error?.stack).toContain('[PATH_REDACTED]');
      expect(logs[0].error?.stack).not.toContain('/home/user/sensitive');
      
      consoleSpy.mockRestore();
    });

    it('should handle Zod validation errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0),
      });

      try {
        schema.parse({ name: '', email: 'invalid', age: -1 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
          errorLogger.logError(error, 'validation', 'medium');
          
          const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
          const zodErrorDetails = logs[0].context.metadata?.zodErrorDetails as {
            fieldErrors?: unknown;
            affectedFields?: string[];
          } | undefined;
          expect(logs[0].error?.name).toBe('ZodError');
          expect(zodErrorDetails).toBeDefined();
          expect(zodErrorDetails?.fieldErrors).toBeDefined();
          expect(zodErrorDetails?.affectedFields).toContain('name');
          expect(zodErrorDetails?.affectedFields).toContain('email');
          expect(zodErrorDetails?.affectedFields).toContain('age');
          
          consoleSpy.mockRestore();
        }
      }
    });

    it('should sanitize context data', () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user123',
        metadata: {
          password: 'secret123',
          token: 'jwt-token',
          safeField: 'safe-value',
        },
        userAgent: 'Mozilla/5.0 (Version 1.2.3)',
        url: 'https://example.com/api?token=secret&safe=value',
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'system', 'medium', context);
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].context.metadata?.password).toBe('[REDACTED]');
      expect(logs[0].context.metadata?.token).toBe('[REDACTED]');
      expect(logs[0].context.metadata?.safeField).toBe('safe-value');
      expect(logs[0].context.userAgent).toContain('X.X.X');
      // URL encoding may change the format, so check for the presence of REDACTED
      expect(logs[0].context.url).toContain('REDACTED');
      expect(logs[0].context.url).toContain('safe=value');
      
      consoleSpy.mockRestore();
    });

    it('should maintain log buffer with size limit', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Log more than buffer size (100)
      for (let i = 0; i < 150; i++) {
        errorLogger.logError(new Error(`Error ${i}`), 'system', 'low');
      }
      
      const logs = errorLogger.getRecentLogs(200) as import("../error-logging").ErrorLogEntry[];
      expect(logs.length).toBeLessThanOrEqual(100);
      
      consoleSpy.mockRestore();
    });

    it('should provide error statistics', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      errorLogger.logError(new Error('Error 1'), 'system', 'low');
      errorLogger.logError(new Error('Error 2'), 'validation', 'medium');
      errorLogger.logError(new Error('Error 3'), 'authentication', 'high');
      errorLogger.logError(new Error('Error 4'), 'system', 'critical');
      
      const stats = errorLogger.getErrorStats();
      expect(stats.total).toBe(4);
      expect(stats.bySeverity.low).toBe(1);
      expect(stats.bySeverity.medium).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.byCategory.system).toBe(2);
      expect(stats.byCategory.validation).toBe(1);
      expect(stats.byCategory.authentication).toBe(1);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Convenience Functions', () => {
    it('should log authentication errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logAuthError('Invalid credentials', { userId: 'user123' });
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].category).toBe('authentication');
      expect(logs[0].severity).toBe('high');
      expect(logs[0].context.component).toBe('auth');
      expect(logs[0].context.userId).toBe('user123');
      
      consoleSpy.mockRestore();
    });

    it('should log validation errors with Zod details', () => {
      const schema = z.object({ name: z.string().min(1) });
      
      try {
        schema.parse({ name: '' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
          
          logValidationError(error, { component: 'form' });
          
          const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
          expect(logs[0].category).toBe('validation');
          expect(logs[0].severity).toBe('medium');
          expect(logs[0].context.component).toBe('form');
          expect(logs[0].error?.name).toBe('ZodError');
          
          consoleSpy.mockRestore();
        }
      }
    });

    it('should log security events', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logSecurityEvent('Suspicious activity detected', 'high', {
        ipAddress: '192.168.1.1',
        userAgent: 'Malicious Bot',
      });
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].category).toBe('security');
      expect(logs[0].severity).toBe('high');
      expect(logs[0].context.component).toBe('security');
      expect(logs[0].context.ipAddress).toBe('192.168.1.1');
      
      consoleSpy.mockRestore();
    });

    it('should log database errors', () => {
      const dbError = new Error('Connection timeout');
      (dbError as Error & { code?: string }).code = 'ECONNRESET';
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logDatabaseError(dbError, { 
        component: 'supabase',
        action: 'query_wardrobe_items',
      });
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].category).toBe('database');
      expect(logs[0].severity).toBe('high');
      expect(logs[0].context.component).toBe('supabase');
      expect(logs[0].context.action).toBe('query_wardrobe_items');
      expect(logs[0].error?.code).toBe('ECONNRESET');
      
      consoleSpy.mockRestore();
    });

    it('should log file upload errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logFileUploadError('File size exceeds limit', {
        component: 'image_upload',
        metadata: { fileSize: 10485760, maxSize: 5242880 },
      });
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].category).toBe('file_upload');
      expect(logs[0].severity).toBe('medium');
      expect(logs[0].context.component).toBe('image_upload');
      expect(logs[0].context.metadata?.fileSize).toBe(10485760);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Message Sanitization', () => {
    it('should sanitize JWT tokens in error messages', () => {
      const error = new Error('Invalid JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'authentication', 'high');
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].message).toContain('[JWT_REDACTED]');
      expect(logs[0].message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      
      consoleSpy.mockRestore();
    });

    it('should sanitize email addresses in error messages', () => {
      const error = new Error('User john.doe@example.com not found');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'authentication', 'medium');
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].message).toContain('[EMAIL_REDACTED]');
      expect(logs[0].message).not.toContain('john.doe@example.com');
      
      consoleSpy.mockRestore();
    });

    it('should sanitize phone numbers in error messages', () => {
      const error = new Error('Invalid phone number: 555-123-4567');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'validation', 'medium');
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].message).toContain('[PHONE_REDACTED]');
      expect(logs[0].message).not.toContain('555-123-4567');
      
      consoleSpy.mockRestore();
    });

    it('should sanitize credit card numbers in error messages', () => {
      const error = new Error('Invalid card: 4532-1234-5678-9012');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'validation', 'high');
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].message).toContain('[CARD_REDACTED]');
      expect(logs[0].message).not.toContain('4532-1234-5678-9012');
      
      consoleSpy.mockRestore();
    });

    it('should sanitize UUIDs in error messages', () => {
      const error = new Error('User ID 550e8400-e29b-41d4-a716-446655440000 not found');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'database', 'medium');
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].message).toContain('[UUID_REDACTED]');
      expect(logs[0].message).not.toContain('550e8400-e29b-41d4-a716-446655440000');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Context Sanitization', () => {
    it('should sanitize sensitive URL parameters', () => {
      const error = new Error('Request failed');
      const context = {
        url: 'https://api.example.com/users?token=secret123&password=mypass&id=123',
      };
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'network', 'medium', context);
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      // URL encoding may change the format, so check for the presence of REDACTED
      expect(logs[0].context.url).toContain('REDACTED');
      expect(logs[0].context.url).toContain('id=123');
      expect(logs[0].context.url).not.toContain('secret123');
      expect(logs[0].context.url).not.toContain('mypass');
      
      consoleSpy.mockRestore();
    });

    it('should sanitize user agent version numbers', () => {
      const error = new Error('Browser compatibility issue');
      const context = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'system', 'low', context);
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].context.userAgent).toContain('X.X.X');
      expect(logs[0].context.userAgent).not.toContain('91.0.4472.124');
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed URLs gracefully', () => {
      const error = new Error('Invalid URL');
      const context = {
        url: 'not-a-valid-url-with-token=abcdef123456789012345678901234567890',
      };
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      errorLogger.logError(error, 'network', 'medium', context);
      
      const logs = errorLogger.getRecentLogs(1) as import("../error-logging").ErrorLogEntry[];
      expect(logs[0].context.url).toContain('[API_KEY_REDACTED]');
      expect(logs[0].context.url).not.toContain('abcdef123456789012345678901234567890');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Production vs Development Behavior', () => {
    it('should log to console in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      
      // Mock all console methods that might be called
      const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      
      errorLogger.logError(new Error('Test error'), 'system', 'medium');
      
      // Check that console.group was called (which is what the logger actually uses)
      expect(consoleGroupSpy).toHaveBeenCalled();
      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it('should not log to console in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      errorLogger.logError(new Error('Test error'), 'system', 'medium');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

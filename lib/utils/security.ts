import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Security utilities for input sanitization and validation
 */

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /(--|\/\*|\*\/|;|'|"|`)/g,
  /(\bOR\b|\bAND\b).*?[=<>]/gi,
  /\b(WAITFOR|DELAY)\b/gi,
  /\b(XP_|SP_)/gi,
];

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./g,
  /\.\\/g,
  /\.\/\./g,
  /%2e%2e/gi,
  /%252e%252e/gi,
  /\0/g,
];

/**
 * Sanitize string input to prevent SQL injection
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;
  
  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 1000);

  return sanitized;
}

/**
 * Sanitize HTML input to prevent XSS attacks
 */
export function sanitizeHtmlInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;

  // Remove XSS patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize file path to prevent path traversal attacks
 */
export function sanitizeFilePath(path: string): string {
  if (typeof path !== 'string') {
    throw new Error('Path must be a string');
  }

  let sanitized = path;

  // Remove path traversal patterns
  PATH_TRAVERSAL_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove leading/trailing slashes and normalize
  sanitized = sanitized.replace(/^\/+|\/+$/g, '');
  sanitized = sanitized.replace(/\/+/g, '/');

  // Limit length and ensure safe characters only
  sanitized = sanitized.substring(0, 255);
  sanitized = sanitized.replace(/[^a-zA-Z0-9._/-]/g, '');

  return sanitized;
}

/**
 * Validate and sanitize user input with Zod schema
 */
export function validateAndSanitizeInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  sanitizeStrings = true
): { success: true; data: T } | { success: false; error: string; details?: z.ZodError } {
  try {
    // Pre-sanitize string inputs if requested
    let sanitizedInput = input;
    
    if (sanitizeStrings && typeof input === 'object' && input !== null) {
      sanitizedInput = sanitizeObjectStrings(input);
    } else if (sanitizeStrings && typeof input === 'string') {
      sanitizedInput = sanitizeHtmlInput(input);
    }

    const result = schema.safeParse(sanitizedInput);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: formatValidationError(result.error),
        details: result.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Recursively sanitize string values in an object
 */
function sanitizeObjectStrings(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeHtmlInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectStrings(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Format validation errors for user display
 */
function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  
  return issues.join(', ');
}

/**
 * Rate limiting utilities
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Reset or initialize
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  rateLimitStore.set(key, current);
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime };
}

/**
 * Secure credential handling
 */
export function sanitizeCredentials(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'jwt',
    'session',
    'cookie',
    'api_key',
    'access_token',
    'refresh_token',
  ];

  const sanitized = { ...obj };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Validate file upload security
 */
export async function validateFileUploadSecurity(file: File): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    errors.push('File size exceeds 5MB limit');
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  // Check filename for malicious patterns
  const filename = sanitizeFilePath(file.name);
  if (filename !== file.name) {
    errors.push('Filename contains invalid characters');
  }

  // Validate magic bytes
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));
    
    const magicBytes = {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      webp: [0x52, 0x49, 0x46, 0x46],
    };

    const isValidImage = Object.values(magicBytes).some(signature => 
      signature.every((byte, index) => bytes[index] === byte)
    );

    if (!isValidImage) {
      errors.push('File content does not match declared type');
    }
  } catch {
    errors.push('Failed to validate file content');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user permissions for resource access
 */
export async function validateUserPermissions(
  userId: string,
  resourceType: 'wardrobe_item' | 'outfit' | 'category',
  resourceId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = await createClient();
    
    // Check if user exists and is authenticated
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user.user || user.user.id !== userId) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    // Check resource ownership through RLS
    let query;
    switch (resourceType) {
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
        return { allowed: false, reason: 'Invalid resource type' };
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
    return { allowed: false, reason: 'Permission check failed' };
  }
}

/**
 * Audit log entry for security events
 */
export interface SecurityAuditEntry {
  eventType: 'auth_failure' | 'permission_denied' | 'validation_error' | 'rate_limit_exceeded' | 'suspicious_activity';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log security events (in production, this would send to a monitoring service)
 */
export function logSecurityEvent(entry: Omit<SecurityAuditEntry, 'timestamp'>): void {
  const auditEntry: SecurityAuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Sanitize sensitive information
  if (auditEntry.details) {
    auditEntry.details = sanitizeCredentials(auditEntry.details);
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('Security Event:', auditEntry);
  }

  // In production, send to monitoring service
  // await sendToMonitoringService(auditEntry);
}

/**
 * Detect potentially malicious input patterns
 */
export function detectMaliciousInput(input: string): {
  isMalicious: boolean;
  patterns: string[];
  severity: 'low' | 'medium' | 'high';
} {
  const detectedPatterns: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  // Check for SQL injection
  if (SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))) {
    detectedPatterns.push('sql_injection');
    severity = 'high';
  }

  // Check for XSS
  if (XSS_PATTERNS.some(pattern => pattern.test(input))) {
    detectedPatterns.push('xss');
    severity = 'high';
  }

  // Check for path traversal
  if (PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input))) {
    detectedPatterns.push('path_traversal');
    severity = 'medium';
  }

  // Check for command injection
  if (/[;&|`$(){}[\]\\]/.test(input)) {
    detectedPatterns.push('command_injection');
    severity = 'high';
  }

  // Check for excessive length (potential DoS)
  if (input.length > 10000) {
    detectedPatterns.push('excessive_length');
    severity = 'medium';
  }

  return {
    isMalicious: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity,
  };
}

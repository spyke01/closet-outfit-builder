import { z } from 'zod';
import { sanitizeCredentials } from './security';

/**
 * Comprehensive error logging system with structured logging and sanitization
 */

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error categories
export type ErrorCategory = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'database'
  | 'network'
  | 'file_upload'
  | 'business_logic'
  | 'system'
  | 'security'
  | 'performance';

// Error context interface
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

// Structured error log entry
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context: ErrorContext;
  sanitized: boolean;
  environment: string;
}

// Zod validation error details
export interface ZodErrorDetails {
  fieldErrors: Record<string, string>;
  formattedMessage: string;
  issueCount: number;
  affectedFields: string[];
}

/**
 * Main error logger class
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logBuffer: ErrorLogEntry[] = [];
  private maxBufferSize = 100;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with full context and sanitization
   */
  logError(
    error: Error | z.ZodError | string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext = {}
  ): string {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    const environment = process.env.NODE_ENV || 'unknown';

    let errorDetails: ErrorLogEntry['error'];
    let message: string;

    // Handle different error types
    if (error instanceof z.ZodError) {
      const zodDetails = this.processZodError(error);
      message = zodDetails.formattedMessage;
      errorDetails = {
        name: 'ZodError',
        message: zodDetails.formattedMessage,
        code: 'VALIDATION_ERROR',
      };
      
      // Add Zod-specific context
      context.metadata = {
        ...context.metadata,
        zodErrorDetails: zodDetails,
      };
    } else if (error instanceof Error) {
      message = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: this.sanitizeStackTrace(error.stack),
        code: (error as any).code,
      };
    } else {
      message = String(error);
      errorDetails = {
        name: 'GenericError',
        message: String(error),
      };
    }

    // Sanitize context
    const sanitizedContext = this.sanitizeContext(context);

    // Create log entry
    const logEntry: ErrorLogEntry = {
      id: errorId,
      timestamp,
      severity,
      category,
      message: this.sanitizeMessage(message),
      error: errorDetails,
      context: sanitizedContext,
      sanitized: true,
      environment,
    };

    // Add to buffer
    this.addToBuffer(logEntry);

    // Log to console in development
    if (environment === 'development') {
      this.logToConsole(logEntry);
    }

    // In production, would send to monitoring service
    if (environment === 'production') {
      this.sendToMonitoringService(logEntry);
    }

    return errorId;
  }

  /**
   * Log authentication errors with special handling
   */
  logAuthError(
    error: Error | string,
    context: ErrorContext = {}
  ): string {
    return this.logError(error, 'authentication', 'high', {
      ...context,
      component: context.component || 'auth',
    });
  }

  /**
   * Log validation errors with Zod details
   */
  logValidationError(
    error: z.ZodError,
    context: ErrorContext = {}
  ): string {
    return this.logError(error, 'validation', 'medium', {
      ...context,
      component: context.component || 'validation',
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    message: string,
    severity: ErrorSeverity,
    context: ErrorContext = {}
  ): string {
    return this.logError(message, 'security', severity, {
      ...context,
      component: context.component || 'security',
    });
  }

  /**
   * Log database errors
   */
  logDatabaseError(
    error: Error,
    context: ErrorContext = {}
  ): string {
    return this.logError(error, 'database', 'high', {
      ...context,
      component: context.component || 'database',
    });
  }

  /**
   * Log file upload errors
   */
  logFileUploadError(
    error: Error | string,
    context: ErrorContext = {}
  ): string {
    return this.logError(error, 'file_upload', 'medium', {
      ...context,
      component: context.component || 'file_upload',
    });
  }

  /**
   * Get recent error logs (for debugging)
   */
  getRecentLogs(count = 10): ErrorLogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recentCount: number;
  } {
    const stats = {
      total: this.logBuffer.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<ErrorSeverity, number>,
      byCategory: {} as Record<ErrorCategory, number>,
      recentCount: 0,
    };

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    this.logBuffer.forEach(entry => {
      stats.bySeverity[entry.severity]++;
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
      
      if (new Date(entry.timestamp).getTime() > oneHourAgo) {
        stats.recentCount++;
      }
    });

    return stats;
  }

  /**
   * Clear error logs (for testing)
   */
  clearLogs(): void {
    this.logBuffer = [];
  }

  // Private methods

  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `err_${timestamp}_${random}`;
  }

  private processZodError(error: z.ZodError): ZodErrorDetails {
    const fieldErrors: Record<string, string> = {};
    const affectedFields: string[] = [];

    error.issues.forEach(issue => {
      const fieldPath = issue.path.join('.');
      if (fieldPath) {
        fieldErrors[fieldPath] = issue.message;
        affectedFields.push(fieldPath);
      }
    });

    const formattedMessage = error.issues
      .map(issue => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      })
      .join(', ');

    return {
      fieldErrors,
      formattedMessage,
      issueCount: error.issues.length,
      affectedFields: [...new Set(affectedFields)],
    };
  }

  private sanitizeMessage(message: string): string {
    let sanitized = message;

    // Remove JWT tokens
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT_REDACTED]');
    
    // Remove API keys
    sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[API_KEY_REDACTED]');
    
    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    
    // Remove phone numbers
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
    
    // Remove credit card numbers
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]');
    
    // Remove UUIDs that might be sensitive
    sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID_REDACTED]');

    return sanitized;
  }

  private sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Limit stack trace length and remove sensitive paths
    const lines = stack.split('\n').slice(0, 10);
    return lines
      .map(line => {
        // Remove absolute paths, keep relative paths
        return line.replace(/\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+/g, '[PATH_REDACTED]');
      })
      .join('\n');
  }

  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized = { ...context };

    // Sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = sanitizeCredentials(sanitized.metadata);
    }

    // Sanitize user agent (remove version numbers that might be sensitive)
    if (sanitized.userAgent) {
      sanitized.userAgent = sanitized.userAgent.replace(/\d+\.\d+\.\d+/g, 'X.X.X');
    }

    // Sanitize URL parameters
    if (sanitized.url) {
      try {
        const url = new URL(sanitized.url);
        // Remove sensitive query parameters
        const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
        sensitiveParams.forEach(param => {
          if (url.searchParams.has(param)) {
            url.searchParams.set(param, '[REDACTED]');
          }
        });
        sanitized.url = url.toString();
      } catch {
        // If URL parsing fails, just sanitize as string
        sanitized.url = this.sanitizeMessage(sanitized.url);
      }
    }

    return sanitized;
  }

  private addToBuffer(entry: ErrorLogEntry): void {
    this.logBuffer.push(entry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  private logToConsole(entry: ErrorLogEntry): void {
    const logMethod = this.getConsoleMethod(entry.severity);
    
    console.group(`🚨 ${entry.severity.toUpperCase()} ERROR [${entry.category}]`);
    console.log(`ID: ${entry.id}`);
    console.log(`Time: ${entry.timestamp}`);
    console.log(`Message: ${entry.message}`);
    
    if (entry.error) {
      console.log(`Error: ${entry.error.name} - ${entry.error.message}`);
      if (entry.error.stack) {
        console.log(`Stack: ${entry.error.stack}`);
      }
    }
    
    if (Object.keys(entry.context).length > 0) {
      console.log('Context:', entry.context);
    }
    
    console.groupEnd();
  }

  private getConsoleMethod(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low':
        return 'log';
      case 'medium':
        return 'warn';
      case 'high':
      case 'critical':
        return 'error';
      default:
        return 'log';
    }
  }

  private async sendToMonitoringService(entry: ErrorLogEntry): Promise<void> {
    // In production, this would send to a monitoring service like Sentry, DataDog, etc.
    // For now, we'll just log that it would be sent
    if (process.env.NODE_ENV === 'development') {
      console.log(`Would send to monitoring service:`, entry.id);
    }
  }
}

// Singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Convenience functions
export function logError(
  error: Error | z.ZodError | string,
  category: ErrorCategory,
  severity: ErrorSeverity,
  context?: ErrorContext
): string {
  return errorLogger.logError(error, category, severity, context);
}

export function logAuthError(error: Error | string, context?: ErrorContext): string {
  return errorLogger.logAuthError(error, context);
}

export function logValidationError(error: z.ZodError, context?: ErrorContext): string {
  return errorLogger.logValidationError(error, context);
}

export function logSecurityEvent(message: string, severity: ErrorSeverity, context?: ErrorContext): string {
  return errorLogger.logSecurityEvent(message, severity, context);
}

export function logDatabaseError(error: Error, context?: ErrorContext): string {
  return errorLogger.logDatabaseError(error, context);
}

export function logFileUploadError(error: Error | string, context?: ErrorContext): string {
  return errorLogger.logFileUploadError(error, context);
}
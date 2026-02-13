'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { z } from 'zod';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';



import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'auth' | 'permission' | 'network' | 'validation' | 'general';
  errorId: string;
}

// Error classification schema
const SupabaseErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.string().optional(),
  hint: z.string().optional(),
});

export class SupabaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'general',
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Classify Supabase errors
    let errorType: State['errorType'] = 'general';
    
    if (error.message.includes('JWT') || error.message.includes('token')) {
      errorType = 'auth';
    } else if (error.message.includes('RLS') || error.message.includes('permission') || error.message.includes('unauthorized')) {
      errorType = 'permission';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.message.includes('validation') || error.message.includes('ZodError')) {
      errorType = 'validation';
    }

    return {
      hasError: true,
      error,
      errorType,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Structured error logging without sensitive information
    const sanitizedError = this.sanitizeError(error);
    const logEntry = {
      errorId: this.state.errorId,
      type: this.state.errorType,
      message: sanitizedError.message,
      stack: sanitizedError.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    // Log to console in development, would send to monitoring service in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Supabase Error Boundary:', logEntry);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private sanitizeError(error: Error): { message: string; stack?: string } {
    // Remove sensitive information from error messages
    let message = error.message;
    
    // Remove JWT tokens
    message = message.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT_TOKEN_REDACTED]');
    
    // Remove API keys
    message = message.replace(/[a-zA-Z0-9]{32,}/g, '[API_KEY_REDACTED]');
    
    // Remove email addresses from error messages
    message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    
    // Remove UUIDs that might be sensitive
    message = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID_REDACTED]');

    return {
      message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
    };
  }

  private getErrorMessage(): string {
    switch (this.state.errorType) {
      case 'auth':
        return 'Authentication error. Please sign in again.';
      case 'permission':
        return 'You don\'t have permission to access this resource.';
      case 'network':
        return 'Network error. Please check your connection and try again.';
      case 'validation':
        return 'Invalid data format. Please check your input and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private getErrorIcon() {
    switch (this.state.errorType) {
      case 'auth':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'permission':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'network':
        return <AlertTriangle className="h-5 w-5 text-secondary" />;
      case 'validation':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'general',
      errorId: '',
    });
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert>
              <div className="flex items-center space-x-2">
                {this.getErrorIcon()}
                <AlertDescription className="flex-1">
                  {this.getErrorMessage()}
                </AlertDescription>
              </div>
            </Alert>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert>
                <AlertDescription>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {this.sanitizeError(this.state.error).message}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-1">
                      Error ID: {this.state.errorId}
                    </p>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for programmatic error reporting
export function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: Record<string, any>) => {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Sanitize error
    const sanitizedError = {
      message: error.message.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT_TOKEN_REDACTED]'),
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    };

    const logEntry = {
      errorId,
      ...sanitizedError,
      context: context ? JSON.stringify(context) : undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('Manual Error Report:', logEntry);
    }

    return errorId;
  }, []);

  return { reportError };
}
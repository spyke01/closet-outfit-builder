'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react';



import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onAuthError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  authErrorType: 'expired' | 'invalid' | 'missing' | 'network' | 'unknown';
  errorId: string;
  retryCount: number;
}

export class AuthErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      authErrorType: 'unknown',
      errorId: '',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `auth_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Classify authentication errors
    let authErrorType: State['authErrorType'] = 'unknown';
    const message = error.message.toLowerCase();
    
    if (message.includes('expired') || message.includes('token expired')) {
      authErrorType = 'expired';
    } else if (message.includes('invalid') || message.includes('malformed')) {
      authErrorType = 'invalid';
    } else if (message.includes('missing') || message.includes('no token')) {
      authErrorType = 'missing';
    } else if (message.includes('network') || message.includes('fetch failed')) {
      authErrorType = 'network';
    }

    return {
      hasError: true,
      error,
      authErrorType,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Sanitize and log authentication errors
    const sanitizedError = this.sanitizeAuthError(error);
    
    const logEntry = {
      errorId: this.state.errorId,
      type: 'authentication',
      subType: this.state.authErrorType,
      message: sanitizedError.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    };

    // Log without sensitive information
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary:', logEntry);
    }

    // Call custom auth error handler
    this.props.onAuthError?.(error);
  }

  private sanitizeAuthError(error: Error): { message: string } {
    let message = error.message;
    
    // Remove JWT tokens
    message = message.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT_REDACTED]');
    
    // Remove session IDs
    message = message.replace(/session[_-]?id[:\s]*[a-zA-Z0-9-_]+/gi, 'session_id: [REDACTED]');
    
    // Remove refresh tokens
    message = message.replace(/refresh[_-]?token[:\s]*[a-zA-Z0-9-_]+/gi, 'refresh_token: [REDACTED]');
    
    // Remove access tokens
    message = message.replace(/access[_-]?token[:\s]*[a-zA-Z0-9-_]+/gi, 'access_token: [REDACTED]');

    return { message };
  }

  private getAuthErrorMessage(): string {
    switch (this.state.authErrorType) {
      case 'expired':
        return 'Your session has expired. Please sign in again to continue.';
      case 'invalid':
        return 'Invalid authentication credentials. Please sign in again.';
      case 'missing':
        return 'Authentication required. Please sign in to access this feature.';
      case 'network':
        return 'Network error during authentication. Please check your connection and try again.';
      default:
        return 'Authentication error occurred. Please sign in again.';
    }
  }

  private getAuthErrorAction(): string {
    switch (this.state.authErrorType) {
      case 'expired':
      case 'invalid':
      case 'missing':
        return 'Sign In';
      case 'network':
        return 'Retry';
      default:
        return 'Sign In';
    }
  }

  private handleAuthAction = () => {
    if (this.state.authErrorType === 'network' && this.state.retryCount < this.maxRetries) {
      // Retry for network errors
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      // Redirect to login for auth errors
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      authErrorType: 'unknown',
      errorId: '',
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const showRetryOption = this.state.authErrorType === 'network' && this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {this.getAuthErrorMessage()}
              </AlertDescription>
            </Alert>

            {this.state.retryCount > 0 && (
              <Alert variant="info">
                <AlertDescription>
                  Retry attempt {this.state.retryCount} of {this.maxRetries}
                </AlertDescription>
              </Alert>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert variant="info">
                <AlertDescription>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Auth Error Details (Development)
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {this.sanitizeAuthError(this.state.error).message}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-1">
                      Error ID: {this.state.errorId}
                    </p>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button onClick={this.handleAuthAction} className="flex-1">
                {this.state.authErrorType === 'network' ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {this.getAuthErrorAction()}
              </Button>
              
              {showRetryOption && (
                <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling auth errors in components
export function useAuthErrorHandler() {
  const handleAuthError = React.useCallback((error: Error) => {
    const errorId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Sanitize error message
    const sanitizedMessage = error.message.replace(
      /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
      '[JWT_REDACTED]'
    );

    const logEntry = {
      errorId,
      type: 'auth_handler',
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Handler:', logEntry);
    }

    // Determine if this is a session expiry that requires redirect
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }

    return errorId;
  }, []);

  return { handleAuthError };
}

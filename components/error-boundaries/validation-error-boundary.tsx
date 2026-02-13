'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { z } from 'zod';
import { AlertTriangle, RefreshCw, Info } from 'lucide-react';



import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatZodError, getFieldErrors } from '@/lib/utils/validation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onValidationError?: (error: z.ZodError, fieldErrors: Record<string, string>) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  zodError: z.ZodError | null;
  fieldErrors: Record<string, string>;
  errorId: string;
  validationContext: string;
}

export class ValidationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      zodError: null,
      fieldErrors: {},
      errorId: '',
      validationContext: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `val_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if this is a Zod validation error
    if (error instanceof z.ZodError) {
      const fieldErrors = getFieldErrors(error);
      return {
        hasError: true,
        error,
        zodError: error,
        fieldErrors,
        errorId,
        validationContext: 'zod_validation',
      };
    }

    // Check if error message contains validation-related keywords
    const message = error.message.toLowerCase();
    let validationContext = 'unknown';
    
    if (message.includes('validation')) {
      validationContext = 'general_validation';
    } else if (message.includes('schema')) {
      validationContext = 'schema_validation';
    } else if (message.includes('required')) {
      validationContext = 'required_field';
    } else if (message.includes('invalid')) {
      validationContext = 'invalid_format';
    }

    return {
      hasError: true,
      error,
      zodError: null,
      fieldErrors: {},
      errorId,
      validationContext,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log validation errors with sanitized information
    const logEntry = {
      errorId: this.state.errorId,
      type: 'validation',
      context: this.state.validationContext,
      message: this.sanitizeValidationError(error.message),
      fieldErrors: this.state.fieldErrors,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('Validation Error Boundary:', logEntry);
    }

    // Call custom validation error handler
    if (this.state.zodError) {
      this.props.onValidationError?.(this.state.zodError, this.state.fieldErrors);
    }
  }

  private sanitizeValidationError(message: string): string {
    // Remove potentially sensitive data from validation error messages
    let sanitized = message;
    
    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    
    // Remove phone numbers
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
    
    // Remove credit card numbers
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]');
    
    // Remove SSNs
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');
    
    // Remove UUIDs that might contain sensitive info
    sanitized = sanitized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID_REDACTED]');

    return sanitized;
  }

  private getValidationErrorMessage(): string {
    if (this.state.zodError) {
      return formatZodError(this.state.zodError);
    }

    switch (this.state.validationContext) {
      case 'general_validation':
        return 'The data provided does not meet the required format. Please check your input and try again.';
      case 'schema_validation':
        return 'The data structure is invalid. Please ensure all required fields are provided correctly.';
      case 'required_field':
        return 'Some required fields are missing. Please fill in all required information.';
      case 'invalid_format':
        return 'Some fields contain invalid data. Please check the format and try again.';
      default:
        return 'Validation error occurred. Please check your input and try again.';
    }
  }

  private renderFieldErrors() {
    if (Object.keys(this.state.fieldErrors).length === 0) {
      return null;
    }

    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">Field Errors:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {Object.entries(this.state.fieldErrors).map(([field, error]) => (
                <li key={field}>
                  <span className="font-medium">{field}:</span> {error}
                </li>
              ))}
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      zodError: null,
      fieldErrors: {},
      errorId: '',
      validationContext: '',
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="space-y-4 p-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {this.getValidationErrorMessage()}
            </AlertDescription>
          </Alert>

          {this.renderFieldErrors()}

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Alert>
              <AlertDescription>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Validation Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {this.sanitizeValidationError(this.state.error.message)}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-1">
                    Error ID: {this.state.errorId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Context: {this.state.validationContext}
                  </p>
                </details>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={this.handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling validation errors in forms
export function useValidationErrorHandler() {
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = React.useState(false);

  const handleValidationError = React.useCallback((error: z.ZodError) => {
    const fieldErrors = getFieldErrors(error);
    setValidationErrors(fieldErrors);
    
    const errorId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const logEntry = {
      errorId,
      type: 'form_validation',
      fieldErrors,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('Form Validation Error:', logEntry);
    }

    return errorId;
  }, []);

  const clearValidationErrors = React.useCallback(() => {
    setValidationErrors({});
  }, []);

  const validateField = React.useCallback(<T,>(
    schema: z.ZodSchema<T>,
    value: unknown,
    fieldName: string
  ): T | null => {
    setIsValidating(true);
    
    try {
      const result = schema.parse(value);
      
      // Clear error for this field if validation passes
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      
      setIsValidating(false);
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = getFieldErrors(error);
        setValidationErrors(prev => ({
          ...prev,
          [fieldName]: fieldErrors[fieldName] || 'Validation failed',
        }));
      }
      
      setIsValidating(false);
      return null;
    }
  }, []);

  return {
    validationErrors,
    isValidating,
    handleValidationError,
    clearValidationErrors,
    validateField,
  };
}
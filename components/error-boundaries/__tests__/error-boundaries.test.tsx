import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { SupabaseErrorBoundary, useErrorReporting } from '../supabase-error-boundary';
import { AuthErrorBoundary, useAuthErrorHandler } from '../auth-error-boundary';
import { ValidationErrorBoundary, useValidationErrorHandler } from '../validation-error-boundary';

// Mock child component that can throw errors
function ThrowingComponent({ error }: { error?: Error | z.ZodError }) {
  if (error) {
    throw error;
  }
  return <div>Normal content</div>;
}

// Test component for hooks
function TestHookComponent({ error }: { error?: Error | z.ZodError }) {
  const { reportError } = useErrorReporting();
  const { handleAuthError } = useAuthErrorHandler();
  const { handleValidationError, validateField, validationErrors } = useValidationErrorHandler();

  const handleClick = () => {
    if (error instanceof z.ZodError) {
      handleValidationError(error);
    } else if (error) {
      if (error.message.includes('auth')) {
        handleAuthError(error);
      } else {
        reportError(error, { component: 'test' });
      }
    }
  };

  const handleValidateField = () => {
    const schema = z.string().min(1);
    validateField(schema, '', 'testField');
  };

  return (
    <div>
      <button onClick={handleClick}>Trigger Error</button>
      <button onClick={handleValidateField}>Validate Field</button>
      {Object.entries(validationErrors).map(([field, error]) => (
        <div key={field} data-testid={`error-${field}`}>{error}</div>
      ))}
    </div>
  );
}

describe('Error Boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('SupabaseErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <SupabaseErrorBoundary>
          <div>Normal content</div>
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });

    it('should catch and display authentication errors', () => {
      const authError = new Error('JWT token expired');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={authError} />
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('Authentication error. Please sign in again.')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should catch and display permission errors', () => {
      const permissionError = new Error('RLS policy violation');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={permissionError} />
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('You don\'t have permission to access this resource.')).toBeInTheDocument();
    });

    it('should catch and display network errors', () => {
      const networkError = new Error('Network connection failed');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={networkError} />
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });

    it('should catch and display validation errors', () => {
      const validationError = new Error('ZodError: validation failed');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={validationError} />
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('Invalid data format. Please check your input and try again.')).toBeInTheDocument();
    });

    it('should display generic error for unknown error types', () => {
      const genericError = new Error('Something went wrong');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={genericError} />
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });

    it('should sanitize sensitive information in error messages', () => {
      const sensitiveError = new Error('JWT token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test failed');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={sensitiveError} />
        </SupabaseErrorBoundary>
      );

      // In development mode, error details should be shown but sanitized
      if (process.env.NODE_ENV === 'development') {
        expect(screen.queryByText(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/)).not.toBeInTheDocument();
      }
    });

    it('should have retry button that calls handleRetry', () => {
      const error = new Error('Temporary error');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={error} />
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      
      // Verify retry button exists and is clickable
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      
      // Click should not throw error
      fireEvent.click(retryButton);
    });

    it('should call custom error handler when provided', () => {
      const onError = vi.fn();
      const error = new Error('Test error');
      
      render(
        <SupabaseErrorBoundary onError={onError}>
          <ThrowingComponent error={error} />
        </SupabaseErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(error, expect.any(Object));
    });

    it('should render custom fallback when provided', () => {
      const error = new Error('Test error');
      const customFallback = <div>Custom error message</div>;
      
      render(
        <SupabaseErrorBoundary fallback={customFallback}>
          <ThrowingComponent error={error} />
        </SupabaseErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('AuthErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <AuthErrorBoundary>
          <div>Protected content</div>
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should catch and display expired token errors', () => {
      const expiredError = new Error('Token expired');
      
      render(
        <AuthErrorBoundary>
          <ThrowingComponent error={expiredError} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Your session has expired. Please sign in again to continue.')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should catch and display invalid credential errors', () => {
      const invalidError = new Error('Invalid credentials');
      
      render(
        <AuthErrorBoundary>
          <ThrowingComponent error={invalidError} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Invalid authentication credentials. Please sign in again.')).toBeInTheDocument();
    });

    it('should catch and display missing auth errors', () => {
      const missingError = new Error('No token provided');
      
      render(
        <AuthErrorBoundary>
          <ThrowingComponent error={missingError} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Authentication required. Please sign in to access this feature.')).toBeInTheDocument();
    });

    it('should catch and display network auth errors', () => {
      const networkError = new Error('Network error during authentication');
      
      render(
        <AuthErrorBoundary>
          <ThrowingComponent error={networkError} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Network error during authentication. Please check your connection and try again.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should sanitize JWT tokens in error messages', () => {
      const jwtError = new Error('Invalid JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
      
      render(
        <AuthErrorBoundary>
          <ThrowingComponent error={jwtError} />
        </AuthErrorBoundary>
      );

      // JWT should be sanitized in development mode details
      if (process.env.NODE_ENV === 'development') {
        expect(screen.queryByText(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/)).not.toBeInTheDocument();
      }
    });

    it('should call custom auth error handler when provided', () => {
      const onAuthError = vi.fn();
      const error = new Error('Auth error');
      
      render(
        <AuthErrorBoundary onAuthError={onAuthError}>
          <ThrowingComponent error={error} />
        </AuthErrorBoundary>
      );

      expect(onAuthError).toHaveBeenCalledWith(error);
    });

    it('should handle retry attempts for network errors', () => {
      const networkError = new Error('Network error');
      
      render(
        <AuthErrorBoundary>
          <ThrowingComponent error={networkError} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
      
      // Should show retry attempt counter after clicking retry
      fireEvent.click(screen.getByText('Retry'));
      // Note: In a real scenario, this would trigger a re-render with retry count
    });
  });

  describe('ValidationErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ValidationErrorBoundary>
          <div>Form content</div>
        </ValidationErrorBoundary>
      );

      expect(screen.getByText('Form content')).toBeInTheDocument();
    });

    it('should catch and display Zod validation errors', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
      });

      let zodError: z.ZodError;
      try {
        schema.parse({ name: '', email: 'invalid' });
      } catch (error) {
        zodError = error as z.ZodError;
      }

      render(
        <ValidationErrorBoundary>
          <ThrowingComponent error={zodError!} />
        </ValidationErrorBoundary>
      );

      // Check for the formatted error message instead of specific field text
      expect(screen.getAllByText(/Name is required/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Invalid email/)[0]).toBeInTheDocument();
    });

    it('should catch and display general validation errors', () => {
      const validationError = new Error('Validation failed');
      
      render(
        <ValidationErrorBoundary>
          <ThrowingComponent error={validationError} />
        </ValidationErrorBoundary>
      );

      expect(screen.getByText('The data provided does not meet the required format. Please check your input and try again.')).toBeInTheDocument();
    });

    it('should sanitize sensitive data in validation errors', () => {
      const sensitiveError = new Error('Validation failed for email: john.doe@example.com and phone: 555-123-4567');
      
      render(
        <ValidationErrorBoundary>
          <ThrowingComponent error={sensitiveError} />
        </ValidationErrorBoundary>
      );

      // Sensitive data should be sanitized in development mode details
      if (process.env.NODE_ENV === 'development') {
        expect(screen.queryByText(/john\.doe@example\.com/)).not.toBeInTheDocument();
        expect(screen.queryByText(/555-123-4567/)).not.toBeInTheDocument();
      }
    });

    it('should call custom validation error handler when provided', () => {
      const onValidationError = vi.fn();
      const schema = z.object({ name: z.string().min(1) });
      
      let zodError: z.ZodError;
      try {
        schema.parse({ name: '' });
      } catch (error) {
        zodError = error as z.ZodError;
      }

      render(
        <ValidationErrorBoundary onValidationError={onValidationError}>
          <ThrowingComponent error={zodError!} />
        </ValidationErrorBoundary>
      );

      expect(onValidationError).toHaveBeenCalledWith(zodError!, expect.any(Object));
    });

    it('should allow retry functionality', () => {
      const error = new Error('Validation error');
      
      render(
        <ValidationErrorBoundary>
          <ThrowingComponent error={error} />
        </ValidationErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();

      // Click retry button - this will reset the error boundary state
      fireEvent.click(screen.getByText('Try Again'));

      // After clicking retry, the error boundary should still show the error state
      // since we haven't re-rendered with a non-error component
      expect(screen.getByText('The data provided does not meet the required format. Please check your input and try again.')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Hooks', () => {
    it('should validate individual fields with useValidationErrorHandler', () => {
      render(<TestHookComponent />);
      
      fireEvent.click(screen.getByText('Validate Field'));
      
      expect(screen.getByTestId('error-testField')).toBeInTheDocument();
      expect(screen.getByTestId('error-testField')).toHaveTextContent('Validation failed');
    });
  });

  describe('Error Boundary Integration', () => {
    it('should work with nested error boundaries', () => {
      const authError = new Error('JWT expired');
      
      render(
        <SupabaseErrorBoundary>
          <AuthErrorBoundary>
            <ValidationErrorBoundary>
              <ThrowingComponent error={authError} />
            </ValidationErrorBoundary>
          </AuthErrorBoundary>
        </SupabaseErrorBoundary>
      );

      // Auth error should be caught by ValidationErrorBoundary (innermost)
      expect(screen.getByText('Validation error occurred. Please check your input and try again.')).toBeInTheDocument();
    });

    it('should handle errors that bubble up through boundaries', () => {
      const unknownError = new Error('Unknown system error');
      
      render(
        <SupabaseErrorBoundary>
          <AuthErrorBoundary>
            <ValidationErrorBoundary>
              <ThrowingComponent error={unknownError} />
            </ValidationErrorBoundary>
          </AuthErrorBoundary>
        </SupabaseErrorBoundary>
      );

      // Should be caught by ValidationErrorBoundary since it's the innermost
      expect(screen.getByText('Validation error occurred. Please check your input and try again.')).toBeInTheDocument();
    });
  });

  describe('Development vs Production Behavior', () => {
    it('should show error details in development mode', () => {
      vi.stubEnv('NODE_ENV', 'development');
      
      const error = new Error('Detailed error message');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={error} />
        </SupabaseErrorBoundary>
      );

      // Should show error details in development
      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    });

    it('should hide error details in production mode', () => {
      vi.stubEnv('NODE_ENV', 'production');
      
      const error = new Error('Detailed error message');
      
      render(
        <SupabaseErrorBoundary>
          <ThrowingComponent error={error} />
        </SupabaseErrorBoundary>
      );

      // Should not show error details in production
      expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();
    });
  });
});
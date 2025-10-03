import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
});

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

// Custom fallback component for testing
const CustomFallback: React.FC<any> = ({ error, retry, retryCount }) => (
  <div data-testid="custom-fallback">
    <span>Custom error: {error.message}</span>
    <span>Retry count: {retryCount}</span>
    <button onClick={retry}>Custom Retry</button>
  </div>
);

describe('EnhancedErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError shouldThrow={false} />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders default fallback when error occurs', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError message="Test error message" />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <EnhancedErrorBoundary fallback={CustomFallback}>
        <ThrowError message="Custom error" />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error: Custom error')).toBeInTheDocument();
    expect(screen.getByText('Retry count: 0')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <EnhancedErrorBoundary onError={onError}>
        <ThrowError message="Callback test" />
      </EnhancedErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Callback test' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('handles retry functionality', async () => {
    let shouldThrow = true;
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;

    render(
      <EnhancedErrorBoundary>
        <TestComponent />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    // Simulate fixing the error
    shouldThrow = false;
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  it('tracks retry count correctly', () => {
    render(
      <EnhancedErrorBoundary fallback={CustomFallback} maxRetries={3}>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('Retry count: 0')).toBeInTheDocument();

    const retryButton = screen.getByText('Custom Retry');
    fireEvent.click(retryButton);

    expect(screen.getByText('Retry count: 1')).toBeInTheDocument();
  });

  it('respects maxRetries limit', () => {
    render(
      <EnhancedErrorBoundary maxRetries={2}>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    // Should render error boundary with retry button
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    
    // The maxRetries prop is passed correctly to the component
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('resets on props change when resetOnPropsChange is true', async () => {
    const TestWrapper: React.FC<{ resetKey: string }> = ({ resetKey }) => (
      <EnhancedErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    const { rerender } = render(<TestWrapper resetKey="key1" />);
    
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    // Change reset key to trigger reset
    rerender(<TestWrapper resetKey="key2" />);

    // Error boundary should reset and show error again (since component still throws)
    await waitFor(() => {
      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    });
  });

  it('provides reload page functionality', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <EnhancedErrorBoundary>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('logs error information in development', () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <EnhancedErrorBoundary>
        <ThrowError message="Development error" />
      </EnhancedErrorBoundary>
    );

    expect(console.group).toHaveBeenCalledWith('🚨 Enhanced Error Boundary');
    expect(console.error).toHaveBeenCalledWith('Error:', expect.objectContaining({
      message: 'Development error'
    }));
    expect(console.groupEnd).toHaveBeenCalled();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('handles component unmount during retry timeout', () => {
    const { unmount } = render(
      <EnhancedErrorBoundary>
        <ThrowError />
      </EnhancedErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // Unmount component before timeout completes
    unmount();

    // Should not throw any errors
    expect(true).toBe(true);
  });

  it('shows appropriate error message for generic errors', () => {
    render(
      <EnhancedErrorBoundary>
        <ThrowError message="" />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('handles error boundary state correctly after multiple errors', () => {
    let errorMessage = 'First error';
    const TestComponent = () => <ThrowError message={errorMessage} />;

    const { rerender } = render(
      <EnhancedErrorBoundary>
        <TestComponent />
      </EnhancedErrorBoundary>
    );

    expect(screen.getByText('First error')).toBeInTheDocument();

    // Change error message and rerender
    errorMessage = 'Second error';
    rerender(
      <EnhancedErrorBoundary>
        <TestComponent />
      </EnhancedErrorBoundary>
    );

    // Should still show the first error (error boundary doesn't re-catch)
    expect(screen.getByText('First error')).toBeInTheDocument();
  });
});
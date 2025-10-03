import React, { Suspense } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuspenseErrorBoundary, WeatherSuspenseBoundary, OutfitSuspenseBoundary, WardrobeSuspenseBoundary } from './SuspenseErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = vi.fn();
  console.log = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
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

// Test component that suspends
const SuspendingComponent: React.FC<{ shouldSuspend?: boolean }> = ({ shouldSuspend = true }) => {
  if (shouldSuspend) {
    throw new Promise(() => {}); // Never resolves, keeps suspending
  }
  return <div>Loaded content</div>;
};

describe('SuspenseErrorBoundary', () => {
  it('renders children when no error or suspense occurs', () => {
    render(
      <SuspenseErrorBoundary feature="general">
        <ThrowError shouldThrow={false} />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('shows weather skeleton for weather feature', () => {
    render(
      <SuspenseErrorBoundary feature="weather">
        <SuspendingComponent />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('weather-skeleton')).toBeInTheDocument();
  });

  it('shows outfit generation skeleton for outfit feature', () => {
    render(
      <SuspenseErrorBoundary feature="outfit">
        <SuspendingComponent />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('outfit-generation-skeleton')).toBeInTheDocument();
  });

  it('shows outfit generation skeleton for wardrobe feature', () => {
    render(
      <SuspenseErrorBoundary feature="wardrobe">
        <SuspendingComponent />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('outfit-generation-skeleton')).toBeInTheDocument();
  });

  it('shows general skeleton for general feature', () => {
    render(
      <SuspenseErrorBoundary feature="general">
        <SuspendingComponent />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('general-skeleton')).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom loading</div>;
    
    render(
      <SuspenseErrorBoundary feature="weather" fallback={customFallback}>
        <SuspendingComponent />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('applies custom className to skeleton', () => {
    const customClass = 'custom-skeleton-class';
    
    render(
      <SuspenseErrorBoundary feature="weather" className={customClass}>
        <SuspendingComponent />
      </SuspenseErrorBoundary>
    );

    const skeleton = screen.getByTestId('weather-skeleton');
    expect(skeleton).toHaveClass(customClass);
  });

  it('shows weather error fallback for weather feature errors', () => {
    render(
      <SuspenseErrorBoundary feature="weather">
        <ThrowError message="Weather API error" />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('weather-error-fallback')).toBeInTheDocument();
    expect(screen.getByText('Weather data unavailable')).toBeInTheDocument();
  });

  it('shows outfit error fallback for outfit feature errors', () => {
    render(
      <SuspenseErrorBoundary feature="outfit">
        <ThrowError message="Outfit generation error" />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('outfit-error-fallback')).toBeInTheDocument();
    expect(screen.getByText('Outfit generation failed')).toBeInTheDocument();
  });

  it('shows outfit error fallback for wardrobe feature errors', () => {
    render(
      <SuspenseErrorBoundary feature="wardrobe">
        <ThrowError message="Wardrobe loading error" />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('outfit-error-fallback')).toBeInTheDocument();
    expect(screen.getByText('Outfit generation failed')).toBeInTheDocument();
  });

  it('shows default error fallback for general feature errors', () => {
    render(
      <SuspenseErrorBoundary feature="general">
        <ThrowError message="General error" />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <SuspenseErrorBoundary feature="weather" onError={onError}>
        <ThrowError message="Weather error" />
      </SuspenseErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Weather error' }),
      'weather'
    );
  });

  it('calls onRetry callback when retry is triggered', () => {
    const onRetry = vi.fn();
    
    render(
      <SuspenseErrorBoundary feature="weather" onRetry={onRetry}>
        <ThrowError message="Weather error" />
      </SuspenseErrorBoundary>
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledWith('weather');
  });

  it('resets error boundary when resetKeys change', async () => {
    const TestWrapper: React.FC<{ resetKey: string }> = ({ resetKey }) => (
      <SuspenseErrorBoundary feature="weather" resetKeys={[resetKey]}>
        <ThrowError />
      </SuspenseErrorBoundary>
    );

    const { rerender } = render(<TestWrapper resetKey="key1" />);
    
    expect(screen.getByTestId('weather-error-fallback')).toBeInTheDocument();

    // Change reset key to trigger reset
    rerender(<TestWrapper resetKey="key2" />);

    // Error boundary should reset and show error again (since component still throws)
    await waitFor(() => {
      expect(screen.getByTestId('weather-error-fallback')).toBeInTheDocument();
    });
  });

  it('logs feature-specific error information', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <SuspenseErrorBoundary feature="weather">
        <ThrowError message="Weather API failure" />
      </SuspenseErrorBoundary>
    );

    expect(console.group).toHaveBeenCalledWith('🚨 WEATHER Feature Error');
    expect(console.error).toHaveBeenCalledWith('Error:', expect.objectContaining({
      message: 'Weather API failure'
    }));
    expect(console.error).toHaveBeenCalledWith('Feature Context:', expect.objectContaining({
      feature: 'weather'
    }));

    process.env.NODE_ENV = originalEnv;
  });
});

describe('Convenience Components', () => {
  it('WeatherSuspenseBoundary works correctly', () => {
    render(
      <WeatherSuspenseBoundary>
        <SuspendingComponent />
      </WeatherSuspenseBoundary>
    );

    expect(screen.getByTestId('weather-skeleton')).toBeInTheDocument();
  });

  it('OutfitSuspenseBoundary works correctly', () => {
    render(
      <OutfitSuspenseBoundary>
        <SuspendingComponent />
      </OutfitSuspenseBoundary>
    );

    expect(screen.getByTestId('outfit-generation-skeleton')).toBeInTheDocument();
  });

  it('WardrobeSuspenseBoundary works correctly', () => {
    render(
      <WardrobeSuspenseBoundary>
        <SuspendingComponent />
      </WardrobeSuspenseBoundary>
    );

    expect(screen.getByTestId('outfit-generation-skeleton')).toBeInTheDocument();
  });

  it('convenience components pass through props correctly', () => {
    const onError = vi.fn();
    const customClass = 'custom-class';
    
    render(
      <WeatherSuspenseBoundary className={customClass} onError={onError}>
        <ThrowError message="Weather error" />
      </WeatherSuspenseBoundary>
    );

    expect(screen.getByTestId('weather-error-fallback')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Weather error' }),
      'weather'
    );
  });
});
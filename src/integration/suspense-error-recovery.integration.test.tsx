/**
 * Integration tests for Suspense boundaries and error recovery
 * Tests the complete error handling and recovery flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Suspense } from 'react';
import { EnhancedErrorBoundary } from '../components/EnhancedErrorBoundary';
import { SuspenseErrorBoundary } from '../components/SuspenseErrorBoundary';
import { WeatherSkeleton } from '../components/WeatherSkeleton';
import { OutfitGenerationSkeleton } from '../components/OutfitGenerationSkeleton';
import { WeatherErrorFallback } from '../components/WeatherErrorFallback';
import { OutfitErrorFallback } from '../components/OutfitErrorFallback';

// Mock components that throw errors for testing
const ThrowingWeatherComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Weather API failed');
  }
  return <div data-testid="weather-success">Weather loaded successfully</div>;
};

const ThrowingOutfitComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Outfit generation failed');
  }
  return <div data-testid="outfit-success">Outfits loaded successfully</div>;
};

// Async component that simulates loading
const AsyncWeatherComponent = ({ delay = 100 }: { delay?: number }) => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setData('weather data');
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  if (!data) {
    throw new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return <div data-testid="async-weather">Async weather loaded</div>;
};

describe('Suspense and Error Recovery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any error boundary state
    vi.clearAllTimers();
  });

  describe('Suspense boundary integration', () => {
    it('should show skeleton while loading async components', async () => {
      render(
        <Suspense fallback={<WeatherSkeleton />}>
          <AsyncWeatherComponent delay={200} />
        </Suspense>
      );

      // Should show skeleton initially
      expect(screen.getByTestId('weather-skeleton')).toBeInTheDocument();

      // Should show content after loading
      await waitFor(() => {
        expect(screen.getByTestId('async-weather')).toBeInTheDocument();
      }, { timeout: 500 });

      // Skeleton should be gone
      expect(screen.queryByTestId('weather-skeleton')).not.toBeInTheDocument();
    });

    it('should handle multiple suspense boundaries independently', async () => {
      render(
        <div>
          <Suspense fallback={<WeatherSkeleton />}>
            <AsyncWeatherComponent delay={100} />
          </Suspense>
          <Suspense fallback={<OutfitGenerationSkeleton />}>
            <AsyncWeatherComponent delay={200} />
          </Suspense>
        </div>
      );

      expect(screen.getByTestId('weather-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('outfit-skeleton')).toBeInTheDocument();

      // First should resolve faster
      await waitFor(() => {
        expect(screen.getByTestId('async-weather')).toBeInTheDocument();
      }, { timeout: 200 });

      // Second should still be loading
      expect(screen.getByTestId('outfit-skeleton')).toBeInTheDocument();
    });
  });
});  descri
be('Error boundary integration', () => {
    it('should catch and display weather errors with recovery options', async () => {
      render(
        <SuspenseErrorBoundary feature="weather">
          <ThrowingWeatherComponent />
        </SuspenseErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/weather data unavailable/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Use Cached Data')).toBeInTheDocument();
    });

    it('should catch and display outfit generation errors', async () => {
      render(
        <SuspenseErrorBoundary feature="outfit">
          <ThrowingOutfitComponent />
        </SuspenseErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/outfit generation failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should allow error recovery through retry button', async () => {
      let shouldThrow = true;
      
      const RecoverableComponent = () => {
        if (shouldThrow) {
          throw new Error('Temporary error');
        }
        return <div data-testid="recovered">Component recovered</div>;
      };

      render(
        <EnhancedErrorBoundary
          fallback={({ retry }) => (
            <div>
              <span>Error occurred</span>
              <button onClick={retry}>Retry</button>
            </div>
          )}
        >
          <RecoverableComponent />
        </EnhancedErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText('Error occurred')).toBeInTheDocument();

      // Simulate recovery
      shouldThrow = false;
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByTestId('recovered')).toBeInTheDocument();
      });
    });
  });

  describe('Combined Suspense and Error handling', () => {
    it('should handle both loading and error states correctly', async () => {
      const AsyncThrowingComponent = ({ shouldThrow = false, delay = 100 }) => {
        const [loaded, setLoaded] = useState(false);
        
        useEffect(() => {
          const timer = setTimeout(() => {
            setLoaded(true);
          }, delay);
          
          return () => clearTimeout(timer);
        }, [delay]);
        
        if (!loaded) {
          throw new Promise(resolve => setTimeout(resolve, delay));
        }
        
        if (shouldThrow) {
          throw new Error('Component error after loading');
        }
        
        return <div data-testid="success">Component loaded successfully</div>;
      };

      render(
        <SuspenseErrorBoundary feature="test">
          <Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <AsyncThrowingComponent shouldThrow={true} delay={100} />
          </Suspense>
        </SuspenseErrorBoundary>
      );

      // Should show loading first
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Should show error after loading fails
      await waitFor(() => {
        expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
      }, { timeout: 300 });
    });
  });

  describe('Error reporting and logging', () => {
    it('should call error reporting callback', async () => {
      const onError = vi.fn();

      render(
        <EnhancedErrorBoundary onError={onError}>
          <ThrowingWeatherComponent />
        </EnhancedErrorBoundary>
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            componentStack: expect.any(String)
          })
        );
      });
    });

    it('should log errors to console for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <SuspenseErrorBoundary feature="test">
          <ThrowingWeatherComponent />
        </SuspenseErrorBoundary>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
# React 19 & Tailwind 4 Enhancement Patterns

This document provides comprehensive examples and best practices for implementing React 19 and Tailwind 4 enhancements in the Closet Outfit Builder application.

## Table of Contents

1. [React 19 useOptimistic Pattern](#react-19-useoptimistic-pattern)
2. [Enhanced Suspense Boundaries](#enhanced-suspense-boundaries)
3. [Concurrent Features Implementation](#concurrent-features-implementation)
4. [Tailwind 4 Dark Mode Enhancement](#tailwind-4-dark-mode-enhancement)
5. [Container Queries Implementation](#container-queries-implementation)
6. [Performance Optimization Patterns](#performance-optimization-patterns)
7. [Error Handling Best Practices](#error-handling-best-practices)
8. [Testing Strategies](#testing-strategies)

## React 19 useOptimistic Pattern

### Basic Implementation

The `useOptimistic` hook provides immediate UI feedback while async operations are in progress:

```typescript
import { useOptimistic, useState, useCallback } from 'react';

interface OptimisticState<T> {
  data: T[];
  isUpdating: boolean;
  error: Error | null;
}

const useOptimisticData = <T>(initialData: T[] = []) => {
  const [data, setData] = useState<T[]>(initialData);
  const [error, setError] = useState<Error | null>(null);
  
  // useOptimistic for immediate UI updates
  const [optimisticData, addOptimisticItem] = useOptimistic(
    data,
    (state: T[], newItem: T) => [newItem, ...state]
  );
  
  const addItem = useCallback(async (item: T) => {
    try {
      setError(null);
      
      // Show optimistic result immediately
      addOptimisticItem(item);
      
      // Perform actual operation
      const result = await performAsyncOperation(item);
      
      // Update with real data
      setData(prev => [result, ...prev]);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Optimistic update automatically reverts on error
    }
  }, [addOptimisticItem]);
  
  return {
    data: optimisticData,
    isUpdating: optimisticData.length > data.length,
    error,
    addItem
  };
};
```

### Weather Prediction Example

```typescript
// src/hooks/useOptimisticWeather.ts
export const useOptimisticWeather = () => {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [optimisticWeather, setOptimisticWeather] = useOptimistic(
    weatherData,
    (state, prediction: WeatherData[]) => prediction
  );

  const updateLocation = useCallback(async (location: string) => {
    if (!location.trim()) return;
    
    // Generate immediate prediction
    const prediction = predictWeatherFromLocation(location);
    setOptimisticWeather(prediction);
    
    try {
      // Fetch actual weather data
      const actualWeather = await fetchWeatherData(location);
      setWeatherData(actualWeather);
    } catch (error) {
      handleWeatherError(error);
      // Optimistic update reverts automatically
    }
  }, [setOptimisticWeather]);

  return {
    weather: optimisticWeather,
    isUpdating: optimisticWeather !== weatherData,
    updateLocation
  };
};
```

### Best Practices

1. **Always provide immediate feedback**: Show optimistic results instantly
2. **Handle errors gracefully**: Let optimistic updates revert automatically
3. **Use realistic optimistic data**: Make predictions as accurate as possible
4. **Combine with startTransition**: Use for non-urgent state updates

```typescript
const generateOutfit = useCallback(async (anchorItem: WardrobeItem) => {
  const optimisticResult = createOptimisticOutfit(anchorItem);
  
  // Use startTransition for non-urgent updates
  startTransition(() => {
    addOptimisticOutfit(optimisticResult);
  });
  
  try {
    const actualResults = await performOutfitGeneration(anchorItem);
    setGeneratedOutfits(prev => [...actualResults, ...prev]);
  } catch (error) {
    setGenerationError(error);
  }
}, [addOptimisticOutfit, createOptimisticOutfit]);
```

## Enhanced Suspense Boundaries

### Skeleton Components

Create meaningful loading states that match your content structure:

```typescript
// src/components/WeatherSkeleton.tsx
export const WeatherSkeleton = () => (
  <div className="animate-pulse bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm rounded-lg p-4">
    <div className="flex items-center space-x-3">
      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

// src/components/OutfitGenerationSkeleton.tsx
export const OutfitGenerationSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gray-300 dark:bg-gray-600 rounded-lg h-64 mb-3"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
      </div>
    ))}
  </div>
);
```

### Error Boundary Implementation

```typescript
// src/components/EnhancedErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error reporting
    this.reportError(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}
```

### Suspense Integration Pattern

```typescript
// src/components/SuspenseErrorBoundary.tsx
export const SuspenseErrorBoundary = ({ 
  children, 
  feature 
}: { 
  children: ReactNode; 
  feature: string; 
}) => {
  return (
    <EnhancedErrorBoundary
      fallback={({ error, retry }) => (
        <ErrorRecoveryUI 
          error={error}
          feature={feature}
          onRetry={retry}
        />
      )}
      onError={(error, errorInfo) => {
        reportError(error, { feature, ...errorInfo });
      }}
    >
      <Suspense fallback={<FeatureSkeleton feature={feature} />}>
        {children}
      </Suspense>
    </EnhancedErrorBoundary>
  );
};

// Usage
<SuspenseErrorBoundary feature="weather">
  <WeatherWidget />
</SuspenseErrorBoundary>
```

## Concurrent Features Implementation

### useDeferredValue for Search

```typescript
// src/hooks/useOptimizedOutfitGeneration.ts
export const useOptimizedOutfitGeneration = () => {
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Defer expensive filtering
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  // Memoize expensive filtering operation
  const filteredOutfits = useMemo(() => {
    return outfits.filter(outfit => 
      matchesSearchCriteria(outfit, deferredSearchTerm)
    );
  }, [outfits, deferredSearchTerm]);
  
  return {
    outfits: filteredOutfits,
    searchTerm,
    setSearchTerm,
    isStale: searchTerm !== deferredSearchTerm
  };
};
```

### startTransition for Heavy Operations

```typescript
const generateOutfits = useCallback((anchorItem: WardrobeItem) => {
  setIsGenerating(true);
  
  // Mark as non-urgent update
  startTransition(() => {
    const newOutfits = computeOutfitCombinations(anchorItem);
    setOutfits(prev => [...prev, ...newOutfits]);
    setIsGenerating(false);
  });
}, []);
```

### Performance Monitoring

```typescript
// src/hooks/usePerformanceMonitoring.ts
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitor Core Web Vitals
    getCLS(onCLS);
    getFID(onFID);
    getFCP(onFCP);
    getLCP(onLCP);
    
    // Custom metrics
    measureInteractionResponse();
    measureBundleSize();
  }, []);

  const measureInteractionResponse = () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          analytics.track('Interaction Response', {
            name: entry.name,
            duration: entry.duration,
            target: entry.duration < 100 ? 'met' : 'missed'
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
  };
};
```

## Tailwind 4 Dark Mode Enhancement

### Enhanced Color System

```css
/* src/index.css */
@layer base {
  :root {
    /* Light mode colors */
    --color-primary: 59 130 246; /* blue-500 */
    --color-surface: 255 255 255; /* white */
    --color-text: 17 24 39; /* gray-900 */
    --color-border: 229 231 235; /* gray-200 */
  }
  
  .dark {
    /* Dark mode colors */
    --color-primary: 59 130 246; /* blue-500 */
    --color-surface: 17 24 39; /* gray-900 */
    --color-text: 243 244 246; /* gray-100 */
    --color-border: 75 85 99; /* gray-600 */
  }
}

@layer components {
  .outfit-card {
    @apply bg-[rgb(var(--color-surface))] border-[rgb(var(--color-border))];
    @apply text-[rgb(var(--color-text))] transition-colors duration-200;
  }
}
```

### System Preference Integration

```typescript
// src/hooks/useEnhancedTheme.ts
export const useEnhancedTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');
  
  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateSystemPreference = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', updateSystemPreference);
    
    return () => mediaQuery.removeEventListener('change', updateSystemPreference);
  }, []);
  
  // Resolve actual theme
  const resolvedTheme = theme === 'system' ? systemPreference : theme;
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);
  
  return {
    theme,
    resolvedTheme,
    systemPreference,
    isDark: resolvedTheme === 'dark',
    setTheme: (newTheme: 'light' | 'dark' | 'system') => {
      setTheme(newTheme);
      localStorage.setItem('enhanced-theme-preference', newTheme);
    },
    toggleTheme: () => {
      const newTheme = theme === 'system' 
        ? (systemPreference === 'light' ? 'dark' : 'light')
        : theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
    }
  };
};
```

### Theme Toggle Component

```typescript
// src/components/EnhancedThemeToggle.tsx
export const EnhancedThemeToggle = () => {
  const { theme, isDark, toggleTheme } = useEnhancedTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]
                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-[rgb(var(--color-text))]" />
      ) : (
        <Moon className="w-5 h-5 text-[rgb(var(--color-text))]" />
      )}
    </button>
  );
};
```## Containe
r Queries Implementation

### Tailwind 4 Configuration

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      containers: {
        'xs': '20rem',
        'sm': '24rem',
        'md': '28rem',
        'lg': '32rem',
        'xl': '36rem',
        '2xl': '42rem',
      }
    }
  }
} satisfies Config;
```

### Container Query Utilities

```css
/* Container query utilities */
@layer components {
  .outfit-grid {
    @apply grid gap-4;
    @container;
  }
  
  .outfit-card {
    @apply @xs:grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4;
    @apply transition-all duration-200;
  }
  
  .responsive-layout {
    @apply @container;
  }
  
  .responsive-content {
    @apply @sm:flex @sm:items-center @sm:space-x-4;
    @apply @md:flex-col @md:space-x-0 @md:space-y-2;
  }
}
```

### Responsive Component Example

```typescript
// src/components/ResponsiveOutfitCard.tsx
export const ResponsiveOutfitCard = ({ outfit }: { outfit: GeneratedOutfit }) => {
  return (
    <div className="outfit-card @container" data-testid="outfit-card">
      <div className="@sm:flex @sm:items-start @sm:space-x-4 @md:block @md:space-x-0">
        <div className="@sm:flex-shrink-0 @md:w-full">
          <img 
            src={outfit.shirt?.image} 
            alt={outfit.shirt?.name}
            className="w-full @sm:w-24 @sm:h-24 @md:w-full @md:h-48 object-cover rounded-lg"
          />
        </div>
        <div className="@sm:flex-1 @md:mt-4">
          <h3 className="font-medium text-[rgb(var(--color-text))] @sm:text-lg @md:text-xl">
            {outfit.shirt?.name}
          </h3>
          <p className="text-[rgb(var(--color-text-secondary))] @sm:text-sm @md:text-base">
            Score: {outfit.score}%
          </p>
        </div>
      </div>
    </div>
  );
};
```

### Feature Detection and Fallbacks

```typescript
// src/hooks/useFeatureSupport.ts
export const useFeatureSupport = () => {
  const [support, setSupport] = useState({
    containerQueries: false,
    optimistic: false,
    suspense: false,
    transitions: false
  });
  
  useEffect(() => {
    setSupport({
      containerQueries: CSS.supports('container-type: inline-size'),
      optimistic: 'useOptimistic' in React,
      suspense: 'Suspense' in React,
      transitions: 'startTransition' in React
    });
  }, []);
  
  return support;
};

// Conditional rendering based on feature support
export const ConditionalEnhancement = ({ 
  feature, 
  children, 
  fallback 
}: {
  feature: keyof FeatureSupport;
  children: ReactNode;
  fallback: ReactNode;
}) => {
  const support = useFeatureSupport();
  return support[feature] ? children : fallback;
};
```

## Performance Optimization Patterns

### Bundle Size Optimization

```typescript
// tailwind.config.ts - Enhanced purging
export default {
  content: {
    files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    extract: {
      js: (content: string) => {
        const matches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        return matches.filter(match => 
          match.includes('bg-') || 
          match.includes('text-') || 
          match.includes('border-') ||
          match.includes('@')
        );
      }
    }
  },
  corePlugins: {
    preflight: true,
    container: false, // Using container queries instead
    accessibility: true
  }
};
```

### Performance Monitoring

```typescript
// src/utils/performanceMetrics.ts
export const measureBundleOptimization = () => {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'navigation') {
        const nav = entry as PerformanceNavigationTiming;
        
        analytics.track('Bundle Performance', {
          loadTime: nav.loadEventEnd - nav.loadEventStart,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
          firstPaint: nav.responseEnd - nav.requestStart
        });
      }
    });
  });
  
  observer.observe({ entryTypes: ['navigation'] });
};

export const measureInteractionResponse = () => {
  let interactionStart = 0;
  
  document.addEventListener('click', () => {
    interactionStart = performance.now();
  });
  
  // Measure response time
  const observer = new MutationObserver(() => {
    if (interactionStart > 0) {
      const responseTime = performance.now() - interactionStart;
      
      analytics.track('Interaction Response', {
        duration: responseTime,
        target: responseTime < 100 ? 'met' : 'missed'
      });
      
      interactionStart = 0;
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
};
```

## Error Handling Best Practices

### Graceful Degradation

```typescript
// src/components/GracefulEnhancement.tsx
export const GracefulEnhancement = ({ children }: { children: ReactNode }) => {
  const support = useFeatureSupport();
  
  if (!support.optimistic) {
    // Fallback to traditional loading states
    return (
      <div className="traditional-loading">
        {children}
      </div>
    );
  }
  
  return (
    <SuspenseErrorBoundary feature="enhancement">
      {children}
    </SuspenseErrorBoundary>
  );
};
```

### Error Recovery Strategies

```typescript
// src/hooks/useErrorRecovery.ts
export const useErrorRecovery = () => {
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const retry = useCallback(async (operation: () => Promise<any>) => {
    if (retryCount >= 3) {
      throw new Error('Maximum retry attempts reached');
    }
    
    try {
      setLastError(null);
      const result = await operation();
      setRetryCount(0);
      return result;
    } catch (error) {
      setLastError(error instanceof Error ? error : new Error('Unknown error'));
      setRetryCount(prev => prev + 1);
      
      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      throw error;
    }
  }, [retryCount]);
  
  return { retry, retryCount, lastError };
};
```

## Testing Strategies

### Optimistic Updates Testing

```typescript
// Test optimistic behavior
describe('Optimistic Updates', () => {
  it('should show optimistic result immediately', async () => {
    const { result } = renderHook(() => useOptimisticWeather());
    
    act(() => {
      result.current.updateLocation('Miami, FL');
    });
    
    // Should show optimistic result immediately
    expect(result.current.weather).toHaveLength(3);
    expect(result.current.isUpdating).toBe(true);
    
    // Wait for actual result
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
  
  it('should revert optimistic update on error', async () => {
    // Mock error condition
    mockAPI.mockRejectedValueOnce(new Error('API Error'));
    
    const { result } = renderHook(() => useOptimisticWeather());
    
    act(() => {
      result.current.updateLocation('Test City');
    });
    
    // Should show optimistic result
    expect(result.current.weather).toHaveLength(3);
    
    // Should revert on error
    await waitFor(() => {
      expect(result.current.weather).toHaveLength(0);
      expect(result.current.error).toBeTruthy();
    });
  });
});
```

### Accessibility Testing

```typescript
// Test accessibility compliance
describe('Accessibility', () => {
  it('should meet WCAG AA contrast requirements', async () => {
    const { container } = render(<EnhancedThemeToggle />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('should support keyboard navigation', () => {
    render(<ResponsiveOutfitCard outfit={mockOutfit} />);
    
    const button = screen.getByRole('button');
    button.focus();
    
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockOnSelect).toHaveBeenCalled();
  });
});
```

### Performance Testing

```typescript
// Test performance targets
describe('Performance', () => {
  it('should maintain responsive interactions during heavy operations', async () => {
    const { result } = renderHook(() => useOptimizedOutfitGeneration());
    
    const startTime = performance.now();
    
    act(() => {
      result.current.generateOutfits(mockAnchorItem);
    });
    
    const responseTime = performance.now() - startTime;
    expect(responseTime).toBeLessThan(100); // 100ms target
  });
  
  it('should optimize CSS bundle size', () => {
    const bundleSize = getBundleSize('css');
    const previousSize = getPreviousBundleSize('css');
    
    const reduction = (previousSize - bundleSize) / previousSize;
    expect(reduction).toBeGreaterThan(0.1); // 10% reduction target
  });
});
```

## Migration Guide

### From React 18 to React 19

1. **Update useOptimistic usage**:
```typescript
// Before (React 18 - custom implementation)
const [optimisticState, setOptimisticState] = useState(initialState);

// After (React 19 - built-in hook)
const [optimisticState, addOptimistic] = useOptimistic(
  state,
  (currentState, optimisticValue) => [...currentState, optimisticValue]
);
```

2. **Enhanced Suspense boundaries**:
```typescript
// Before
<Suspense fallback={<div>Loading...</div>}>
  <Component />
</Suspense>

// After
<SuspenseErrorBoundary feature="component">
  <Suspense fallback={<ComponentSkeleton />}>
    <Component />
  </Suspense>
</SuspenseErrorBoundary>
```

### From Tailwind 3 to Tailwind 4

1. **Update configuration**:
```typescript
// Before (Tailwind 3)
module.exports = {
  darkMode: 'class',
  // ...
}

// After (Tailwind 4)
export default {
  darkMode: 'class',
  theme: {
    extend: {
      containers: {
        'xs': '20rem',
        // ...
      }
    }
  }
} satisfies Config;
```

2. **Container queries**:
```css
/* Before (viewport-based) */
@media (min-width: 768px) {
  .card { grid-template-columns: repeat(2, 1fr); }
}

/* After (container-based) */
.card {
  @apply @md:grid-cols-2;
}
```

This documentation provides comprehensive patterns and examples for implementing React 19 and Tailwind 4 enhancements. Each pattern includes practical examples, best practices, and testing strategies to ensure robust implementation.
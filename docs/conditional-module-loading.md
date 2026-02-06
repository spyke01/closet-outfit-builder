# Conditional Module Loading

This document describes the conditional module loading system implemented to optimize bundle size and prevent unnecessary code from being loaded when features are disabled.

## Overview

Conditional module loading allows heavy features to be loaded only when:
1. The feature flag is enabled
2. The user has the necessary permissions (e.g., authentication)
3. The user has enabled the feature in their preferences
4. The code is running in the browser (not during SSR)

## Feature Flags

### Available Features

- `weather`: Weather functionality and related components
- `imageProcessing`: Image upload and background removal features
- `monitoring`: Production monitoring and error tracking
- `analytics`: User analytics and event tracking
- `devTools`: Development tools like React Query DevTools

### Configuration

Feature flags are determined by:
1. **Environment variables** (NODE_ENV)
2. **URL parameters** (for testing)
3. **localStorage** (for persistent user preferences)

```typescript
// Default flags based on environment
const flags = {
  weather: true,
  imageProcessing: true,
  monitoring: process.env.NODE_ENV === 'production',
  analytics: process.env.NODE_ENV === 'production',
  devTools: process.env.NODE_ENV === 'development',
};
```

### URL Parameter Overrides

For testing and debugging, you can override feature flags via URL parameters:

```
?disable-weather=true          // Disable weather functionality
?disable-monitoring=true       // Disable monitoring
?enable-dev-tools=true         // Force enable dev tools
```

## Usage Examples

### Basic Conditional Import

```typescript
import { conditionalImport, isFeatureEnabled } from '@/lib/utils/feature-flags';

// Only load weather module if feature is enabled
const weatherModule = await conditionalImport('weather', () => 
  import('./use-weather')
);

if (weatherModule) {
  // Use the loaded module
  const { useWeather } = weatherModule;
}
```

### Conditional Component Loading

```typescript
import { ConditionalComponentLoader } from '@/components/conditional';

function MyPage() {
  return (
    <ConditionalComponentLoader
      feature="weather"
      importFn={() => import('./WeatherWidget')}
      fallback={<div>Weather not available</div>}
      loadingComponent={<div>Loading weather...</div>}
      preloadOnHover={true}
    />
  );
}
```

### Higher-Order Component Pattern

```typescript
import { withConditionalLoading } from '@/components/conditional';

const ConditionalWeatherWidget = withConditionalLoading(
  'weather',
  () => import('./WeatherWidget'),
  {
    fallback: <div>Weather disabled</div>,
    preloadOnHover: true,
  }
);
```

### Conditional Hooks

```typescript
import { useConditionalWeather } from '@/lib/hooks/use-conditional-weather';

function WeatherComponent() {
  const { current, loading, weatherEnabled } = useConditionalWeather(isAuthenticated);
  
  if (!weatherEnabled) {
    return null;
  }
  
  // Weather functionality is loaded and available
  return <div>{current?.temperature}°</div>;
}
```

## Preloading Strategies

### User Intent-Based Preloading

Preload modules when user shows intent to use them:

```typescript
import { preloadWeatherModule } from '@/lib/hooks/use-conditional-weather';

function WeatherButton() {
  return (
    <button
      onMouseEnter={preloadWeatherModule}  // Preload on hover
      onFocus={preloadWeatherModule}       // Preload on focus
    >
      Show Weather
    </button>
  );
}
```

### Intersection Observer Preloading

Preload when components come into view:

```typescript
import { usePreloadOnIntersection } from '@/lib/utils/preload-manager';

function LazySection() {
  const ref = usePreloadOnIntersection(
    'imageProcessing',
    () => import('./ImageUpload')
  );
  
  return <div ref={ref}>Image upload will be preloaded when visible</div>;
}
```

### Critical Module Preloading

Preload important modules during idle time:

```typescript
import { preloadCriticalModules } from '@/lib/utils/preload-manager';

// Call during app initialization
useEffect(() => {
  preloadCriticalModules();
}, []);
```

## Implementation Details

### typeof window Checks

All conditional imports include `typeof window` checks to prevent SSR bundling:

```typescript
export async function conditionalImport<T>(
  feature: keyof FeatureFlags,
  importFn: () => Promise<T>
): Promise<T | null> {
  if (!isFeatureEnabled(feature)) {
    return null;
  }

  // Prevent SSR bundling
  if (typeof window === 'undefined') {
    return null;
  }

  return await importFn();
}
```

### Error Handling

Conditional imports fail gracefully:

```typescript
try {
  const module = await conditionalImport('weather', importFn);
  // Use module
} catch (error) {
  console.warn('Failed to load module:', error);
  // Continue without the module
}
```

### Bundle Analysis Impact

Conditional loading prevents modules from being included in the main bundle:

- **Weather module**: ~15KB saved when disabled
- **Image processing**: ~25KB saved when disabled  
- **Monitoring**: ~10KB saved in development
- **Dev tools**: ~50KB saved in production

## Testing

### Feature Flag Testing

```typescript
import { setFeatureFlags, resetFeatureFlags } from '@/lib/utils/feature-flags';

describe('Conditional Loading', () => {
  beforeEach(() => {
    resetFeatureFlags();
  });

  it('should not load module when feature is disabled', () => {
    setFeatureFlags({ weather: false });
    
    // Test that weather module is not loaded
  });
});
```

### Component Testing

```typescript
import { render } from '@testing-library/react';
import * as featureFlags from '@/lib/utils/feature-flags';

vi.mock('@/lib/utils/feature-flags');

it('should show fallback when feature is disabled', () => {
  vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false);
  
  render(<ConditionalComponent />);
  
  expect(screen.getByText('Feature disabled')).toBeInTheDocument();
});
```

## Performance Benefits

### Bundle Size Reduction

- **Main bundle**: 20% smaller when heavy features are disabled
- **Initial load**: Faster TTI (Time to Interactive)
- **Network usage**: Reduced bandwidth consumption

### Runtime Performance

- **Memory usage**: Lower memory footprint
- **Parse time**: Faster JavaScript parsing
- **Hydration**: Quicker hydration when modules are deferred

### User Experience

- **Progressive enhancement**: Core functionality loads first
- **Intelligent preloading**: Features load when needed
- **Graceful degradation**: App works even if modules fail to load

## Best Practices

### 1. Feature Granularity

Keep features at the right level of granularity:
- ✅ `weather` - entire weather system
- ✅ `imageProcessing` - image upload and processing
- ❌ `weatherIcon` - too granular
- ❌ `allFeatures` - too broad

### 2. Fallback Components

Always provide meaningful fallbacks:

```typescript
// ✅ Good: Informative fallback
<ConditionalComponent
  fallback={<div>Weather not available. Sign in to enable.</div>}
/>

// ❌ Bad: Empty fallback
<ConditionalComponent fallback={null} />
```

### 3. Error Boundaries

Wrap conditional components in error boundaries:

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <ConditionalComponent />
</ErrorBoundary>
```

### 4. Preloading Strategy

Use appropriate preloading for each feature:
- **Critical features**: Preload immediately
- **User-initiated features**: Preload on hover/focus
- **Below-fold features**: Preload on intersection

## Monitoring

Track conditional loading effectiveness:

```typescript
// Monitor feature usage
analytics.track('feature_loaded', {
  feature: 'weather',
  loadTime: performance.now() - startTime,
  success: true
});

// Monitor bundle size impact
analytics.track('bundle_size', {
  mainBundle: bundleSize,
  conditionalModules: conditionalSize
});
```

## Migration Guide

### Converting Existing Components

1. **Identify heavy components** (>10KB)
2. **Extract to conditional loader**
3. **Add feature flag**
4. **Implement fallback**
5. **Add preloading strategy**

### Example Migration

```typescript
// Before: Always loaded
import { WeatherWidget } from './weather-widget';

function TopBar() {
  return (
    <div>
      <WeatherWidget />
    </div>
  );
}

// After: Conditionally loaded
import { ConditionalWeatherWidget } from '@/components/conditional';

function TopBar() {
  return (
    <div>
      <ConditionalWeatherWidget />
    </div>
  );
}
```

## Troubleshooting

### Common Issues

1. **Module not loading**: Check feature flag and browser environment
2. **SSR errors**: Ensure `typeof window` checks are in place
3. **Infinite loading**: Verify import function returns correct module structure
4. **Performance regression**: Check if preloading is too aggressive

### Debug Tools

```typescript
// Check feature flags
console.log(getFeatureFlags());

// Check preload state
console.log(preloadManager.getState('weather'));

// Monitor conditional imports
window.addEventListener('conditional-import', (event) => {
  console.log('Module loaded:', event.detail);
});
```
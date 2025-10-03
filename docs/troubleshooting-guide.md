# Troubleshooting Guide

This guide provides solutions to common issues encountered when implementing React 19 and Tailwind 4 enhancements in the Closet Outfit Builder application.

## Table of Contents

1. [React 19 Issues](#react-19-issues)
2. [Tailwind 4 Issues](#tailwind-4-issues)
3. [Performance Issues](#performance-issues)
4. [Testing Issues](#testing-issues)
5. [Build and Deployment Issues](#build-and-deployment-issues)
6. [Browser Compatibility](#browser-compatibility)
7. [Development Environment](#development-environment)

## React 19 Issues

### useOptimistic Hook Issues

#### Issue: Optimistic updates not reverting on error

**Symptoms:**
- Optimistic state remains even after API errors
- UI shows stale optimistic data
- Error handling not working properly

**Solution:**
```typescript
// ❌ Incorrect: Manual state management
const [optimisticData, setOptimisticData] = useState(data);
const [actualData, setActualData] = useState(data);

const updateData = async (newItem) => {
  setOptimisticData(prev => [...prev, newItem]);
  try {
    const result = await api.update(newItem);
    setActualData(prev => [...prev, result]);
  } catch (error) {
    // Manual revert - error prone
    setOptimisticData(actualData);
  }
};

// ✅ Correct: Use useOptimistic properly
const [data, setData] = useState([]);
const [optimisticData, addOptimistic] = useOptimistic(
  data,
  (state, newItem) => [...state, newItem]
);

const updateData = async (newItem) => {
  // Add optimistic update
  addOptimistic(newItem);
  
  try {
    const result = await api.update(newItem);
    // Update actual data - optimistic automatically resolves
    setData(prev => [...prev, result]);
  } catch (error) {
    // Optimistic update automatically reverts
    console.error('Update failed:', error);
  }
};
```

#### Issue: Multiple optimistic updates causing conflicts

**Symptoms:**
- Optimistic updates overwriting each other
- Inconsistent state during concurrent operations
- Race conditions in optimistic updates

**Solution:**
```typescript
// ❌ Incorrect: No conflict resolution
const [optimisticOutfits, addOptimistic] = useOptimistic(
  outfits,
  (state, newOutfit) => [...state, newOutfit]
);

// ✅ Correct: Handle conflicts with unique IDs
const [optimisticOutfits, addOptimistic] = useOptimistic(
  outfits,
  (state, newOutfit) => {
    // Remove any existing optimistic version
    const filtered = state.filter(outfit => 
      !outfit.id.startsWith('optimistic-') || 
      outfit.id !== newOutfit.id
    );
    return [newOutfit, ...filtered];
  }
);

const generateOutfit = useCallback(async (anchorItem) => {
  const optimisticId = `optimistic-${anchorItem.id}-${Date.now()}`;
  const optimisticOutfit = {
    ...createOptimisticOutfit(anchorItem),
    id: optimisticId
  };
  
  addOptimistic(optimisticOutfit);
  
  try {
    const actualOutfits = await performGeneration(anchorItem);
    setOutfits(prev => [...actualOutfits, ...prev]);
  } catch (error) {
    console.error('Generation failed:', error);
  }
}, [addOptimistic]);
```

### Suspense Boundary Issues

#### Issue: Suspense boundaries not catching errors

**Symptoms:**
- Errors not being caught by error boundaries
- White screen instead of error fallback
- Suspense fallback not showing

**Solution:**
```typescript
// ❌ Incorrect: Missing error boundary
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>

// ✅ Correct: Combine Suspense with Error Boundary
<ErrorBoundary fallback={ErrorFallback}>
  <Suspense fallback={<Loading />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>

// Better: Use combined component
<SuspenseErrorBoundary feature="weather">
  <WeatherWidget />
</SuspenseErrorBoundary>
```

#### Issue: Suspense fallback flickering

**Symptoms:**
- Loading state flickers briefly
- Poor user experience with rapid state changes
- Suspense boundary triggering unnecessarily

**Solution:**
```typescript
// ❌ Incorrect: No delay for fast operations
<Suspense fallback={<LoadingSkeleton />}>
  <FastComponent />
</Suspense>

// ✅ Correct: Add minimum delay for better UX
const DelayedSuspense = ({ children, fallback, delay = 200 }) => {
  const [showFallback, setShowFallback] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <Suspense fallback={showFallback ? fallback : null}>
      {children}
    </Suspense>
  );
};
```

### Concurrent Features Issues

#### Issue: startTransition not improving performance

**Symptoms:**
- UI still blocking during heavy operations
- No performance improvement with startTransition
- Interactions still slow

**Solution:**
```typescript
// ❌ Incorrect: Using startTransition for urgent updates
startTransition(() => {
  setSearchResults(newResults); // User expects immediate feedback
});

// ✅ Correct: Use for non-urgent updates only
const handleSearch = (query) => {
  // Immediate update for input value (urgent)
  setSearchQuery(query);
  
  // Deferred update for results (non-urgent)
  startTransition(() => {
    const results = performExpensiveSearch(query);
    setSearchResults(results);
  });
};

// Better: Combine with useDeferredValue
const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  
  const results = useMemo(() => {
    return performExpensiveSearch(deferredQuery);
  }, [deferredQuery]);
  
  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <div className={query !== deferredQuery ? 'opacity-50' : ''}>
        {results.map(result => <ResultItem key={result.id} {...result} />)}
      </div>
    </div>
  );
};
```

## Tailwind 4 Issues

### Configuration Issues

#### Issue: Container queries not working

**Symptoms:**
- `@container` classes not applying
- Container query breakpoints not responsive
- Styles not updating based on container size

**Solution:**
```typescript
// ❌ Incorrect: Missing container context
<div className="@md:grid-cols-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// ✅ Correct: Establish container context
<div className="@container">
  <div className="@md:grid-cols-2">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
</div>

// Check browser support
const supportsContainerQueries = CSS.supports('container-type: inline-size');

if (!supportsContainerQueries) {
  console.warn('Container queries not supported, falling back to viewport queries');
}
```

#### Issue: Dark mode not working properly

**Symptoms:**
- Dark mode styles not applying
- Inconsistent theming across components
- System preference not detected

**Solution:**
```typescript
// ❌ Incorrect: Missing dark class management
const toggleTheme = () => {
  setTheme(theme === 'light' ? 'dark' : 'light');
};

// ✅ Correct: Proper dark mode implementation
const useEnhancedTheme = () => {
  const [theme, setTheme] = useState('system');
  const [systemPreference, setSystemPreference] = useState('light');
  
  // Listen for system changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateSystemPreference = (e) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', updateSystemPreference);
    
    return () => mediaQuery.removeEventListener('change', updateSystemPreference);
  }, []);
  
  // Apply theme to document
  useEffect(() => {
    const resolvedTheme = theme === 'system' ? systemPreference : theme;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [theme, systemPreference]);
  
  return { theme, setTheme, systemPreference };
};
```

### CSS Bundle Issues

#### Issue: Large CSS bundle size

**Symptoms:**
- CSS bundle larger than expected
- Unused styles included in production
- Poor loading performance

**Solution:**
```typescript
// ❌ Incorrect: Broad content scanning
// tailwind.config.ts
export default {
  content: ['./src/**/*'], // Too broad
};

// ✅ Correct: Specific content configuration
export default {
  content: {
    files: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    extract: {
      js: (content) => {
        // Extract only Tailwind classes
        const matches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        return matches.filter(match => 
          /^[a-z-]+:/.test(match) || // Modifiers (hover:, dark:)
          /^[a-z-]+-\d+/.test(match) || // Numbered (text-lg, p-4)
          /^[a-z-]+$/.test(match) // Base classes (flex, grid)
        );
      }
    }
  },
  corePlugins: {
    // Disable unused plugins
    backdropOpacity: false,
    backgroundOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    placeholderOpacity: false,
    textOpacity: false,
  }
};
```

#### Issue: CSS custom properties not working

**Symptoms:**
- Custom properties not resolving
- Inconsistent theming
- CSS variables showing as literal values

**Solution:**
```css
/* ❌ Incorrect: Invalid CSS custom property usage */
.card {
  @apply bg-[var(--color-surface)]; /* Won't work */
}

/* ✅ Correct: Proper CSS custom property usage */
@layer base {
  :root {
    --color-surface: 255 255 255; /* RGB values without commas */
  }
  
  .dark {
    --color-surface: 17 24 39;
  }
}

@layer components {
  .card {
    @apply bg-[rgb(var(--color-surface))]; /* Proper RGB function */
  }
}
```

## Performance Issues

### Bundle Size Issues

#### Issue: JavaScript bundle too large

**Symptoms:**
- Slow initial page load
- Poor performance on mobile
- Bundle size exceeding budget

**Solution:**
```typescript
// ❌ Incorrect: Importing entire libraries
import * as React from 'react';
import _ from 'lodash';
import moment from 'moment';

// ✅ Correct: Tree-shaking friendly imports
import { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash-es';
import { format } from 'date-fns';

// Use dynamic imports for large dependencies
const LazyComponent = lazy(() => import('./HeavyComponent'));

// Code splitting by route
const OutfitGenerator = lazy(() => import('./pages/OutfitGenerator'));
const Settings = lazy(() => import('./pages/Settings'));
```

#### Issue: Memory leaks in optimistic updates

**Symptoms:**
- Memory usage increasing over time
- Browser becoming slow after extended use
- Optimistic state accumulating

**Solution:**
```typescript
// ❌ Incorrect: Unbounded optimistic state
const [optimisticOutfits, addOptimistic] = useOptimistic(
  outfits,
  (state, newOutfit) => [...state, newOutfit] // Grows indefinitely
);

// ✅ Correct: Bounded optimistic state with cleanup
const [optimisticOutfits, addOptimistic] = useOptimistic(
  outfits,
  (state, newOutfit) => {
    const newState = [newOutfit, ...state];
    return newState.slice(0, 50); // Limit to 50 items
  }
);

// Clean up on unmount
useEffect(() => {
  return () => {
    // Clear any pending optimistic updates
    setOutfits([]);
  };
}, []);
```

### Rendering Performance Issues

#### Issue: Excessive re-renders

**Symptoms:**
- Components re-rendering unnecessarily
- Slow interactions
- High CPU usage

**Solution:**
```typescript
// ❌ Incorrect: Creating new objects in render
const OutfitCard = ({ outfit, onSelect }) => {
  const handleClick = () => onSelect(outfit); // New function every render
  const style = { backgroundColor: getColor(outfit.score) }; // New object every render
  
  return <div style={style} onClick={handleClick}>...</div>;
};

// ✅ Correct: Memoize expensive operations
const OutfitCard = memo(({ outfit, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(outfit);
  }, [outfit.id, onSelect]); // Stable dependencies
  
  const style = useMemo(() => ({
    backgroundColor: getColor(outfit.score)
  }), [outfit.score]);
  
  return <div style={style} onClick={handleClick}>...</div>;
});
```

## Testing Issues

### Test Environment Issues

#### Issue: Tests failing with React 19 features

**Symptoms:**
- `useOptimistic` not found in test environment
- Suspense tests not working
- Mock issues with new hooks

**Solution:**
```typescript
// ❌ Incorrect: Missing React 19 features in tests
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    // Missing React 19 support
  },
});

// ✅ Correct: Proper test configuration
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});

// src/test/setup.ts
import { vi } from 'vitest';

// Mock React 19 features if not available
if (!React.useOptimistic) {
  React.useOptimistic = vi.fn((state, updateFn) => {
    const [optimisticState, setOptimisticState] = React.useState(state);
    const addOptimistic = React.useCallback((action) => {
      setOptimisticState(current => updateFn(current, action));
    }, [updateFn]);
    
    return [optimisticState, addOptimistic];
  });
}
```

#### Issue: Accessibility tests failing

**Symptoms:**
- axe-core violations in tests
- Color contrast issues
- Missing ARIA attributes

**Solution:**
```typescript
// ❌ Incorrect: No accessibility testing
test('renders outfit card', () => {
  render(<OutfitCard outfit={mockOutfit} />);
  expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
});

// ✅ Correct: Include accessibility testing
test('renders outfit card with accessibility compliance', async () => {
  const { container } = render(<OutfitCard outfit={mockOutfit} />);
  
  // Check basic functionality
  expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
  
  // Check accessibility
  const results = await axe(container);
  expect(results).toHaveNoViolations();
  
  // Check specific accessibility features
  const button = screen.getByRole('button');
  expect(button).toHaveAttribute('aria-label');
  
  const image = screen.getByRole('img');
  expect(image).toHaveAttribute('alt');
  expect(image.getAttribute('alt')).not.toBe('');
});
```

## Build and Deployment Issues

### Build Configuration Issues

#### Issue: Build failing with Tailwind 4

**Symptoms:**
- Build errors with Tailwind configuration
- CSS not generating properly
- PostCSS errors

**Solution:**
```typescript
// ❌ Incorrect: Old Tailwind 3 configuration
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

// ✅ Correct: Tailwind 4 configuration
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};

// vite.config.ts
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
});
```

#### Issue: Environment variables not working

**Symptoms:**
- API keys not loading
- Environment-specific configuration failing
- Build-time variables undefined

**Solution:**
```typescript
// ❌ Incorrect: Direct process.env usage
const API_KEY = process.env.REACT_APP_API_KEY; // Won't work in Vite

// ✅ Correct: Vite environment variables
// .env.local
VITE_API_KEY=your_api_key_here
VITE_WEATHER_API_URL=https://api.openweathermap.org

// src/config/env.ts
export const config = {
  apiKey: import.meta.env.VITE_API_KEY,
  weatherApiUrl: import.meta.env.VITE_WEATHER_API_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
```

## Browser Compatibility

### Feature Detection Issues

#### Issue: Container queries not supported

**Symptoms:**
- Layout not responsive in older browsers
- Container query styles not applying
- Fallback styles not working

**Solution:**
```typescript
// ❌ Incorrect: No feature detection
const ResponsiveCard = () => (
  <div className="@container">
    <div className="@md:grid-cols-2">Content</div>
  </div>
);

// ✅ Correct: Feature detection with fallbacks
const ResponsiveCard = () => {
  const supportsContainerQueries = useMemo(() => 
    CSS.supports('container-type: inline-size'), []
  );
  
  if (!supportsContainerQueries) {
    return (
      <div className="responsive-fallback">
        <div className="md:grid-cols-2">Content</div>
      </div>
    );
  }
  
  return (
    <div className="@container">
      <div className="@md:grid-cols-2">Content</div>
    </div>
  );
};
```

#### Issue: React 19 features not available

**Symptoms:**
- `useOptimistic` not found
- Suspense features not working
- Build errors with React 19 features

**Solution:**
```typescript
// ❌ Incorrect: Assuming React 19 features exist
import { useOptimistic } from 'react';

// ✅ Correct: Feature detection and fallbacks
const useOptimisticFallback = (state, updateFn) => {
  if (React.useOptimistic) {
    return React.useOptimistic(state, updateFn);
  }
  
  // Fallback implementation
  const [optimisticState, setOptimisticState] = useState(state);
  
  const addOptimistic = useCallback((action) => {
    setOptimisticState(current => updateFn(current, action));
    
    // Auto-revert after timeout (simple fallback)
    setTimeout(() => {
      setOptimisticState(state);
    }, 5000);
  }, [state, updateFn]);
  
  return [optimisticState, addOptimistic];
};
```

## Development Environment

### Hot Reload Issues

#### Issue: Hot reload not working with new features

**Symptoms:**
- Changes not reflecting in browser
- Full page refresh required
- Development server errors

**Solution:**
```typescript
// ❌ Incorrect: Missing fast refresh configuration
// vite.config.ts
export default defineConfig({
  plugins: [react()],
});

// ✅ Correct: Proper fast refresh configuration
// vite.config.ts
export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      include: "**/*.{jsx,tsx}",
    })
  ],
  server: {
    hmr: {
      overlay: true,
    },
  },
});
```

### TypeScript Issues

#### Issue: Type errors with React 19 features

**Symptoms:**
- TypeScript errors for new hooks
- Missing type definitions
- Build failing due to type issues

**Solution:**
```typescript
// ❌ Incorrect: Missing type definitions
const [optimisticData, addOptimistic] = useOptimistic(data, updateFn);

// ✅ Correct: Proper type definitions
// types/react.d.ts
declare module 'react' {
  function useOptimistic<S, A>(
    state: S,
    updateFn: (currentState: S, optimisticValue: A) => S
  ): [S, (action: A) => void];
}

// Usage with proper types
const [optimisticOutfits, addOptimistic] = useOptimistic<
  GeneratedOutfit[],
  GeneratedOutfit
>(outfits, (state, newOutfit) => [newOutfit, ...state]);
```

This troubleshooting guide covers the most common issues encountered when implementing React 19 and Tailwind 4 enhancements. Each issue includes symptoms, root causes, and detailed solutions with code examples.
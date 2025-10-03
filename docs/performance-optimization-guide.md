# Performance Optimization Guide

This guide provides comprehensive strategies for optimizing performance in the React 19 and Tailwind 4 enhanced Closet Outfit Builder application.

## Table of Contents

1. [Performance Targets](#performance-targets)
2. [React 19 Performance Features](#react-19-performance-features)
3. [Tailwind 4 Bundle Optimization](#tailwind-4-bundle-optimization)
4. [Core Web Vitals Optimization](#core-web-vitals-optimization)
5. [Memory Management](#memory-management)
6. [Network Performance](#network-performance)
7. [Monitoring and Measurement](#monitoring-and-measurement)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Performance Targets

### Key Metrics

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Interaction Response Time**: < 100ms
- **Bundle Size Reduction**: > 10% from Tailwind 3
- **Memory Usage**: Stable, no memory leaks

### Performance Budget

```typescript
// Performance budget configuration
export const PERFORMANCE_BUDGET = {
  javascript: 250, // KB
  css: 50, // KB
  images: 500, // KB per page
  fonts: 100, // KB
  total: 1000 // KB
};

// Core Web Vitals targets
export const CORE_WEB_VITALS_TARGETS = {
  fcp: 1800, // ms
  lcp: 2500, // ms
  fid: 100, // ms
  cls: 0.1, // score
  ttfb: 600 // ms
};
```

## React 19 Performance Features

### Concurrent Rendering Optimization

#### startTransition for Non-Urgent Updates

```typescript
// src/hooks/useOptimizedOutfitGeneration.ts
export const useOptimizedOutfitGeneration = () => {
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateOutfits = useCallback((anchorItem: WardrobeItem) => {
    setIsGenerating(true);
    
    // Mark heavy computation as non-urgent
    startTransition(() => {
      const newOutfits = computeOutfitCombinations(anchorItem);
      setOutfits(prev => [...prev, ...newOutfits]);
      setIsGenerating(false);
    });
  }, []);
  
  return { outfits, generateOutfits, isGenerating };
};
```

#### useDeferredValue for Expensive Operations

```typescript
// Defer expensive filtering to maintain responsiveness
export const useOptimizedSearch = (items: WardrobeItem[], searchTerm: string) => {
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const filteredItems = useMemo(() => {
    if (!deferredSearchTerm) return items;
    
    return items.filter(item => 
      item.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(deferredSearchTerm.toLowerCase())
    );
  }, [items, deferredSearchTerm]);
  
  return {
    filteredItems,
    isStale: searchTerm !== deferredSearchTerm
  };
};
```

#### Optimistic Updates Performance

```typescript
// Minimize re-renders with optimistic updates
export const useOptimisticOutfitEngine = () => {
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>([]);
  
  const [optimisticOutfits, addOptimisticOutfit] = useOptimistic(
    outfits,
    (state, newOutfit: GeneratedOutfit) => {
      // Efficient array update - prepend new outfit
      return [newOutfit, ...state.slice(0, 49)]; // Limit to 50 items
    }
  );
  
  const generateOutfit = useCallback(async (anchorItem: WardrobeItem) => {
    // Create lightweight optimistic result
    const optimisticResult = {
      id: `optimistic-${Date.now()}`,
      [categoryToKey(anchorItem.category)]: anchorItem,
      score: 75, // Reasonable default
      source: 'generated' as const,
      loved: false
    };
    
    // Add optimistically without blocking
    startTransition(() => {
      addOptimisticOutfit(optimisticResult);
    });
    
    try {
      const actualResults = await performOutfitGeneration(anchorItem);
      setOutfits(prev => [...actualResults, ...prev.slice(0, 49)]);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }, [addOptimisticOutfit]);
  
  return {
    outfits: optimisticOutfits,
    generateOutfit,
    isGenerating: optimisticOutfits.length > outfits.length
  };
};
```

### Memory Management

#### Efficient State Updates

```typescript
// Avoid unnecessary re-renders with proper memoization
export const OutfitList = memo(({ outfits, onSelect }: OutfitListProps) => {
  const memoizedOutfits = useMemo(() => 
    outfits.slice(0, 20), // Virtualize large lists
    [outfits]
  );
  
  return (
    <div className="outfit-list">
      {memoizedOutfits.map(outfit => (
        <OutfitCard 
          key={outfit.id} 
          outfit={outfit} 
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

// Memoize expensive calculations
const OutfitCard = memo(({ outfit, onSelect }: OutfitCardProps) => {
  const memoizedScore = useMemo(() => 
    calculateDetailedScore(outfit), 
    [outfit.id, outfit.score]
  );
  
  const handleSelect = useCallback(() => {
    onSelect(outfit);
  }, [outfit.id, onSelect]);
  
  return (
    <div className="outfit-card" onClick={handleSelect}>
      <ScoreDisplay score={memoizedScore} />
    </div>
  );
});
```

#### Cache Management

```typescript
// Implement LRU cache for expensive operations
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// Use cache in outfit engine
export const useOutfitEngineWithCache = () => {
  const compatibilityCache = useMemo(() => new LRUCache<string, WardrobeItem[]>(50), []);
  
  const getCompatibleItems = useCallback((
    category: Category,
    selection: OutfitSelection
  ): WardrobeItem[] => {
    const cacheKey = `${category}-${JSON.stringify(selection)}`;
    
    let result = compatibilityCache.get(cacheKey);
    if (!result) {
      result = computeCompatibleItems(category, selection);
      compatibilityCache.set(cacheKey, result);
    }
    
    return result;
  }, [compatibilityCache]);
  
  return { getCompatibleItems };
};
```

## Tailwind 4 Bundle Optimization

### Advanced Purging Configuration

```typescript
// tailwind.config.ts
export default {
  content: {
    files: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    extract: {
      // Enhanced extraction for dynamic classes
      js: (content: string) => {
        const matches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        
        // Filter for Tailwind classes
        return matches.filter(match => {
          return (
            match.includes('bg-') ||
            match.includes('text-') ||
            match.includes('border-') ||
            match.includes('hover:') ||
            match.includes('dark:') ||
            match.includes('@') || // Container queries
            match.includes('sm:') ||
            match.includes('md:') ||
            match.includes('lg:')
          );
        });
      }
    },
    transform: {
      // Transform dynamic class generation
      js: (content: string) => {
        // Handle template literals and dynamic classes
        return content.replace(/`([^`]*)`/g, (match, template) => {
          // Extract potential Tailwind classes from template literals
          const classes = template.match(/\b[\w-]+:/g) || [];
          return classes.join(' ');
        });
      }
    }
  },
  corePlugins: {
    // Disable unused core plugins
    preflight: true,
    container: false, // Using container queries instead
    accessibility: true,
    backdropOpacity: false,
    backgroundOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    placeholderOpacity: false,
    textOpacity: false
  }
} satisfies Config;
```

### CSS Optimization Strategies

```css
/* Optimize CSS custom properties */
@layer base {
  :root {
    /* Use shorter variable names for smaller bundle */
    --p: 59 130 246; /* primary */
    --s: 255 255 255; /* surface */
    --t: 17 24 39; /* text */
    --b: 229 231 235; /* border */
  }
  
  .dark {
    --p: 59 130 246;
    --s: 17 24 39;
    --t: 243 244 246;
    --b: 75 85 99;
  }
}

@layer components {
  /* Use component classes to reduce repetition */
  .card-base {
    @apply bg-[rgb(var(--s))] border border-[rgb(var(--b))];
    @apply text-[rgb(var(--t))] rounded-lg p-4;
    @apply transition-colors duration-200;
  }
  
  .btn-primary {
    @apply bg-[rgb(var(--p))] text-white px-4 py-2 rounded-lg;
    @apply hover:opacity-90 transition-opacity duration-200;
  }
}
```

### Bundle Analysis

```typescript
// scripts/analyze-bundle.js
import { analyzeBundle } from './bundle-analyzer';

export const measureBundleOptimization = async () => {
  const analysis = await analyzeBundle();
  
  const metrics = {
    totalSize: analysis.totalSize,
    cssSize: analysis.cssSize,
    jsSize: analysis.jsSize,
    compressionRatio: analysis.gzipSize / analysis.totalSize,
    unusedCSS: analysis.unusedCSS,
    duplicateCode: analysis.duplicateCode
  };
  
  // Compare with previous build
  const previousMetrics = await loadPreviousMetrics();
  const improvement = {
    totalReduction: (previousMetrics.totalSize - metrics.totalSize) / previousMetrics.totalSize,
    cssReduction: (previousMetrics.cssSize - metrics.cssSize) / previousMetrics.cssSize,
    jsReduction: (previousMetrics.jsSize - metrics.jsSize) / previousMetrics.jsSize
  };
  
  console.log('Bundle Optimization Results:', {
    metrics,
    improvement,
    targetsMet: {
      totalSize: metrics.totalSize < PERFORMANCE_BUDGET.total * 1024,
      cssSize: metrics.cssSize < PERFORMANCE_BUDGET.css * 1024,
      jsSize: metrics.jsSize < PERFORMANCE_BUDGET.javascript * 1024
    }
  });
  
  return { metrics, improvement };
};
```

## Core Web Vitals Optimization

### First Contentful Paint (FCP)

```typescript
// Optimize initial render
export const App = () => {
  // Preload critical resources
  useEffect(() => {
    // Preload critical images
    const criticalImages = [
      '/images/wardrobe/shirt-1.png',
      '/images/wardrobe/pants-1.png'
    ];
    
    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }, []);
  
  return (
    <div className="app">
      {/* Critical above-the-fold content */}
      <TopBar />
      <Suspense fallback={<AppSkeleton />}>
        <MainContent />
      </Suspense>
    </div>
  );
};

// Optimize font loading
const FontOptimization = () => {
  useEffect(() => {
    // Use font-display: swap for better FCP
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.as = 'font';
    fontLink.type = 'font/woff2';
    fontLink.href = '/fonts/inter-var.woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);
  }, []);
  
  return null;
};
```

### Largest Contentful Paint (LCP)

```typescript
// Optimize largest content element
export const OutfitDisplay = ({ outfit }: { outfit: GeneratedOutfit }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Preload LCP image
  useEffect(() => {
    if (outfit.shirt?.image) {
      const img = new Image();
      img.onload = () => setImageLoaded(true);
      img.src = outfit.shirt.image;
    }
  }, [outfit.shirt?.image]);
  
  return (
    <div className="outfit-display">
      {imageLoaded ? (
        <img
          src={outfit.shirt?.image}
          alt={outfit.shirt?.name}
          className="w-full h-64 object-cover rounded-lg"
          // Optimize for LCP
          loading="eager"
          decoding="sync"
        />
      ) : (
        <div className="w-full h-64 bg-gray-200 rounded-lg animate-pulse" />
      )}
    </div>
  );
};
```

### Cumulative Layout Shift (CLS)

```typescript
// Prevent layout shifts with proper sizing
export const ResponsiveImage = ({ 
  src, 
  alt, 
  width, 
  height 
}: ImageProps) => {
  return (
    <div 
      className="relative"
      style={{ 
        aspectRatio: `${width} / ${height}`,
        width: '100%'
      }}
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover rounded-lg"
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

// Reserve space for dynamic content
export const OutfitCard = ({ outfit }: { outfit: GeneratedOutfit }) => {
  return (
    <div className="outfit-card min-h-[300px]"> {/* Reserve minimum height */}
      <div className="aspect-w-3 aspect-h-4 mb-4">
        <ResponsiveImage 
          src={outfit.shirt?.image || '/placeholder.png'}
          alt={outfit.shirt?.name || 'Outfit'}
          width={300}
          height={400}
        />
      </div>
      <div className="h-16"> {/* Reserve space for text content */}
        <h3 className="font-medium truncate">{outfit.shirt?.name}</h3>
        <p className="text-sm text-gray-600">Score: {outfit.score}%</p>
      </div>
    </div>
  );
};
```

## Network Performance

### Resource Optimization

```typescript
// Implement resource hints
export const ResourceOptimization = () => {
  useEffect(() => {
    // DNS prefetch for external resources
    const dnsPrefetch = (hostname: string) => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${hostname}`;
      document.head.appendChild(link);
    };
    
    // Preconnect to critical origins
    const preconnect = (origin: string) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    };
    
    dnsPrefetch('api.openweathermap.org');
    dnsPrefetch('maps.googleapis.com');
    preconnect('https://fonts.googleapis.com');
  }, []);
  
  return null;
};
```

### Image Optimization

```typescript
// Implement responsive images with WebP support
export const OptimizedImage = ({ 
  src, 
  alt, 
  sizes = "100vw" 
}: OptimizedImageProps) => {
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/, '.webp');
  
  return (
    <picture>
      <source 
        srcSet={`${webpSrc} 1x, ${webpSrc.replace('.webp', '@2x.webp')} 2x`}
        type="image/webp"
      />
      <img
        src={src}
        srcSet={`${src} 1x, ${src.replace(/\.(\w+)$/, '@2x.$1')} 2x`}
        alt={alt}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        className="w-full h-auto"
      />
    </picture>
  );
};
```

## Monitoring and Measurement

### Performance Monitoring Hook

```typescript
// src/hooks/usePerformanceMonitoring.ts
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Core Web Vitals monitoring
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onCLS);
      getFID(onFID);
      getFCP(onFCP);
      getLCP(onLCP);
      getTTFB(onTTFB);
    });
    
    // Custom performance metrics
    measureInteractionResponse();
    measureBundlePerformance();
    measureMemoryUsage();
  }, []);
  
  const onCLS = (metric: CLSMetric) => {
    analytics.track('Core Web Vital', {
      name: 'CLS',
      value: metric.value,
      rating: metric.rating,
      target: metric.value < 0.1 ? 'met' : 'missed'
    });
  };
  
  const measureInteractionResponse = () => {
    let interactionStart = 0;
    
    const startMeasurement = () => {
      interactionStart = performance.now();
    };
    
    const endMeasurement = () => {
      if (interactionStart > 0) {
        const duration = performance.now() - interactionStart;
        
        analytics.track('Interaction Response', {
          duration,
          target: duration < 100 ? 'met' : 'missed'
        });
        
        interactionStart = 0;
      }
    };
    
    document.addEventListener('click', startMeasurement);
    document.addEventListener('keydown', startMeasurement);
    
    // Measure after DOM updates
    const observer = new MutationObserver(endMeasurement);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  };
  
  const measureMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      setInterval(() => {
        analytics.track('Memory Usage', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          utilization: memory.usedJSHeapSize / memory.totalJSHeapSize
        });
      }, 30000); // Every 30 seconds
    }
  };
};
```

### Performance Dashboard

```typescript
// src/components/PerformanceDashboard.tsx
export const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  
  useEffect(() => {
    const collectMetrics = async () => {
      const bundleMetrics = await measureBundleOptimization();
      const vitalsMetrics = await collectCoreWebVitals();
      const customMetrics = await collectCustomMetrics();
      
      setMetrics({
        ...bundleMetrics,
        ...vitalsMetrics,
        ...customMetrics,
        timestamp: Date.now()
      });
    };
    
    collectMetrics();
    const interval = setInterval(collectMetrics, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);
  
  if (!metrics) return <div>Loading performance data...</div>;
  
  return (
    <div className="performance-dashboard">
      <h2>Performance Metrics</h2>
      
      <div className="metrics-grid">
        <MetricCard
          title="Bundle Size"
          value={`${(metrics.bundleSize / 1024).toFixed(1)}KB`}
          target={`${PERFORMANCE_BUDGET.total}KB`}
          status={metrics.bundleSize < PERFORMANCE_BUDGET.total * 1024 ? 'good' : 'poor'}
        />
        
        <MetricCard
          title="FCP"
          value={`${metrics.fcp}ms`}
          target="< 1800ms"
          status={metrics.fcp < 1800 ? 'good' : 'poor'}
        />
        
        <MetricCard
          title="LCP"
          value={`${metrics.lcp}ms`}
          target="< 2500ms"
          status={metrics.lcp < 2500 ? 'good' : 'poor'}
        />
        
        <MetricCard
          title="CLS"
          value={metrics.cls.toFixed(3)}
          target="< 0.1"
          status={metrics.cls < 0.1 ? 'good' : 'poor'}
        />
      </div>
    </div>
  );
};
```## T
roubleshooting Common Issues

### Performance Bottlenecks

#### Issue: Slow Outfit Generation
```typescript
// Problem: Synchronous outfit computation blocking UI
const generateOutfits = (anchorItem: WardrobeItem) => {
  const outfits = computeAllCombinations(anchorItem); // Blocking operation
  setOutfits(outfits);
};

// Solution: Use startTransition and chunked processing
const generateOutfits = useCallback((anchorItem: WardrobeItem) => {
  setIsGenerating(true);
  
  startTransition(() => {
    // Process in chunks to avoid blocking
    const processChunk = (items: WardrobeItem[], chunkSize = 10) => {
      const chunks = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
      }
      return chunks;
    };
    
    const chunks = processChunk(allItems);
    let processedOutfits: GeneratedOutfit[] = [];
    
    const processNextChunk = (index: number) => {
      if (index >= chunks.length) {
        setOutfits(processedOutfits);
        setIsGenerating(false);
        return;
      }
      
      const chunkOutfits = computeCombinations(anchorItem, chunks[index]);
      processedOutfits = [...processedOutfits, ...chunkOutfits];
      
      // Schedule next chunk
      setTimeout(() => processNextChunk(index + 1), 0);
    };
    
    processNextChunk(0);
  });
}, []);
```

#### Issue: Memory Leaks in Optimistic Updates
```typescript
// Problem: Accumulating optimistic state
const [optimisticOutfits, addOptimistic] = useOptimistic(
  outfits,
  (state, newOutfit) => [...state, newOutfit] // Grows indefinitely
);

// Solution: Implement cleanup and limits
const [optimisticOutfits, addOptimistic] = useOptimistic(
  outfits,
  (state, newOutfit) => {
    // Limit optimistic items and clean up old ones
    const newState = [newOutfit, ...state];
    return newState.slice(0, 50); // Keep only 50 most recent
  }
);

// Clean up on unmount
useEffect(() => {
  return () => {
    // Clear optimistic state on unmount
    setOutfits([]);
  };
}, []);
```

#### Issue: Excessive Re-renders
```typescript
// Problem: Creating new objects in render
const OutfitCard = ({ outfit }) => {
  const style = { backgroundColor: getColor(outfit.score) }; // New object every render
  return <div style={style}>...</div>;
};

// Solution: Memoize expensive calculations
const OutfitCard = memo(({ outfit }) => {
  const style = useMemo(() => ({
    backgroundColor: getColor(outfit.score)
  }), [outfit.score]);
  
  return <div style={style}>...</div>;
});
```

### Bundle Size Issues

#### Issue: Large CSS Bundle
```typescript
// Problem: Including unused Tailwind classes
// tailwind.config.ts
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'], // Too broad
  // No purging configuration
};

// Solution: Optimize content scanning and purging
export default {
  content: {
    files: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    extract: {
      js: (content) => {
        // Extract only actual Tailwind classes
        const matches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        return matches.filter(match => 
          /^[a-z-]+:/.test(match) || // Modifiers
          /^[a-z-]+$/.test(match) || // Base classes
          /^[a-z-]+-\d+/.test(match) // Numbered classes
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
    textOpacity: false
  }
};
```

#### Issue: Duplicate Code in Bundle
```typescript
// Problem: Multiple imports of same utilities
import { calculateScore } from '../utils/scoring';
import { calculateScore as calcScore } from '../utils/scoring'; // Duplicate

// Solution: Centralized exports and consistent imports
// src/utils/index.ts
export { calculateScore } from './scoring';
export { formatDate } from './date';
export { optimizeImage } from './image';

// Use consistent imports
import { calculateScore } from '../utils';
```

### Core Web Vitals Issues

#### Issue: Poor LCP Score
```typescript
// Problem: Large images blocking LCP
<img src="/large-image.jpg" alt="Outfit" /> // Blocks LCP

// Solution: Optimize image loading
const OptimizedHeroImage = ({ src, alt }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  useEffect(() => {
    // Preload critical image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = src;
  }, [src]);
  
  return (
    <>
      {/* Optimized image with proper sizing */}
      <img
        src={src}
        alt={alt}
        loading="eager" // Load immediately for LCP
        decoding="sync" // Synchronous decoding
        width={400}
        height={300}
        style={{ 
          aspectRatio: '4/3',
          objectFit: 'cover'
        }}
      />
    </>
  );
};
```

#### Issue: High CLS Score
```typescript
// Problem: Layout shifts from dynamic content
const OutfitCard = ({ outfit }) => {
  const [details, setDetails] = useState(null);
  
  useEffect(() => {
    fetchOutfitDetails(outfit.id).then(setDetails);
  }, [outfit.id]);
  
  return (
    <div>
      <img src={outfit.image} alt={outfit.name} />
      {details && <div>{details.description}</div>} {/* Causes layout shift */}
    </div>
  );
};

// Solution: Reserve space for dynamic content
const OutfitCard = ({ outfit }) => {
  const [details, setDetails] = useState(null);
  
  useEffect(() => {
    fetchOutfitDetails(outfit.id).then(setDetails);
  }, [outfit.id]);
  
  return (
    <div className="outfit-card">
      <div className="aspect-w-3 aspect-h-4">
        <img 
          src={outfit.image} 
          alt={outfit.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-h-[60px] p-4"> {/* Reserve space */}
        {details ? (
          <div>{details.description}</div>
        ) : (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Container Query Issues

#### Issue: Container Queries Not Working
```typescript
// Problem: Missing container context
const ResponsiveCard = () => {
  return (
    <div className="@md:grid-cols-2"> {/* No container context */}
      Content
    </div>
  );
};

// Solution: Establish container context
const ResponsiveCard = () => {
  return (
    <div className="@container"> {/* Establish container */}
      <div className="@md:grid-cols-2">
        Content
      </div>
    </div>
  );
};
```

#### Issue: Container Query Fallbacks
```typescript
// Problem: No fallback for unsupported browsers
const ResponsiveLayout = () => {
  return (
    <div className="@container">
      <div className="@md:flex"> {/* May not work in all browsers */}
        Content
      </div>
    </div>
  );
};

// Solution: Provide fallbacks
const ResponsiveLayout = () => {
  const supportsContainerQueries = CSS.supports('container-type: inline-size');
  
  return (
    <div className={supportsContainerQueries ? '@container' : ''}>
      <div className={
        supportsContainerQueries 
          ? '@md:flex' 
          : 'md:flex' // Fallback to viewport queries
      }>
        Content
      </div>
    </div>
  );
};
```

## Performance Testing

### Automated Performance Testing

```typescript
// tests/performance.test.ts
describe('Performance Tests', () => {
  it('should meet Core Web Vitals targets', async () => {
    const metrics = await measureCoreWebVitals();
    
    expect(metrics.fcp).toBeLessThan(1800);
    expect(metrics.lcp).toBeLessThan(2500);
    expect(metrics.cls).toBeLessThan(0.1);
    expect(metrics.fid).toBeLessThan(100);
  });
  
  it('should maintain bundle size budget', async () => {
    const bundleSize = await getBundleSize();
    
    expect(bundleSize.total).toBeLessThan(PERFORMANCE_BUDGET.total * 1024);
    expect(bundleSize.css).toBeLessThan(PERFORMANCE_BUDGET.css * 1024);
    expect(bundleSize.js).toBeLessThan(PERFORMANCE_BUDGET.javascript * 1024);
  });
  
  it('should respond to interactions within 100ms', async () => {
    const { user } = render(<OutfitGenerator />);
    
    const startTime = performance.now();
    await user.click(screen.getByText('Generate Outfit'));
    
    await waitFor(() => {
      expect(screen.getByTestId('optimistic-outfit')).toBeInTheDocument();
    });
    
    const responseTime = performance.now() - startTime;
    expect(responseTime).toBeLessThan(100);
  });
});
```

### Continuous Performance Monitoring

```typescript
// scripts/performance-ci.js
export const runPerformanceTests = async () => {
  const lighthouse = await import('lighthouse');
  const chromeLauncher = await import('chrome-launcher');
  
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };
  
  const runnerResult = await lighthouse('http://localhost:3000', options);
  
  const { lhr } = runnerResult;
  const { categories, audits } = lhr;
  
  const performanceScore = categories.performance.score * 100;
  const metrics = {
    performanceScore,
    fcp: audits['first-contentful-paint'].numericValue,
    lcp: audits['largest-contentful-paint'].numericValue,
    cls: audits['cumulative-layout-shift'].numericValue,
    fid: audits['max-potential-fid'].numericValue,
  };
  
  await chrome.kill();
  
  // Fail CI if performance targets not met
  const targetsMet = {
    performanceScore: performanceScore >= 90,
    fcp: metrics.fcp < 1800,
    lcp: metrics.lcp < 2500,
    cls: metrics.cls < 0.1,
    fid: metrics.fid < 100,
  };
  
  const allTargetsMet = Object.values(targetsMet).every(Boolean);
  
  if (!allTargetsMet) {
    console.error('Performance targets not met:', targetsMet);
    process.exit(1);
  }
  
  console.log('All performance targets met:', metrics);
  return metrics;
};
```

## Best Practices Summary

### React 19 Performance
1. Use `startTransition` for non-urgent updates
2. Implement `useDeferredValue` for expensive operations
3. Optimize `useOptimistic` with proper cleanup
4. Memoize expensive calculations with `useMemo`
5. Use `memo` for component optimization

### Tailwind 4 Optimization
1. Configure advanced content extraction
2. Disable unused core plugins
3. Use CSS custom properties efficiently
4. Implement proper container query fallbacks
5. Monitor bundle size continuously

### Core Web Vitals
1. Optimize images for LCP
2. Reserve space to prevent CLS
3. Preload critical resources for FCP
4. Use proper loading strategies
5. Monitor metrics continuously

### General Performance
1. Implement performance budgets
2. Use automated testing
3. Monitor real user metrics
4. Optimize for mobile first
5. Implement proper error boundaries

This comprehensive guide provides the tools and strategies needed to maintain optimal performance while implementing React 19 and Tailwind 4 enhancements.
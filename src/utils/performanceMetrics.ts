/**
 * Performance metrics utilities for measuring CSS bundle size and performance improvements
 */

export interface BundleMetrics {
  css: {
    size: number;
    gzipSize: number;
    reduction: number;
    previousSize?: number;
  };
  javascript: {
    size: number;
    gzipSize: number;
    reduction: number;
    previousSize?: number;
  };
  total: {
    size: number;
    gzipSize: number;
    reduction: number;
  };
}

export interface PerformanceMetrics {
  renderTime: {
    initial: number;
    update: number;
    optimistic: number;
  };
  interactionResponse: {
    average: number;
    p95: number;
    target: number;
  };
  coreWebVitals: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    cls: number; // Cumulative Layout Shift
    fid: number; // First Input Delay
    inp: number; // Interaction to Next Paint
  };
  bundleMetrics: BundleMetrics;
  featureSupport: {
    containerQueries: boolean;
    cssCustomProperties: boolean;
    backdropFilter: boolean;
    optimisticUpdates: boolean;
  };
}

/**
 * Measure CSS bundle size and calculate reduction
 */
export const measureBundleSize = async (): Promise<BundleMetrics> => {
  const metrics: BundleMetrics = {
    css: { size: 0, gzipSize: 0, reduction: 0 },
    javascript: { size: 0, gzipSize: 0, reduction: 0 },
    total: { size: 0, gzipSize: 0, reduction: 0 },
  };

  try {
    // In development, we can estimate based on build output
    if (import.meta.env.DEV) {
      // Estimate CSS size based on Tailwind configuration
      const estimatedCSSSize = await estimateCSSSizeFromConfig();
      metrics.css.size = estimatedCSSSize;
      metrics.css.gzipSize = Math.round(estimatedCSSSize * 0.3); // Typical gzip ratio
    } else {
      // In production, measure actual bundle sizes
      const bundleSizes = await fetchBundleSizes();
      metrics.css = bundleSizes.css;
      metrics.javascript = bundleSizes.javascript;
    }

    // Calculate total
    metrics.total.size = metrics.css.size + metrics.javascript.size;
    metrics.total.gzipSize = metrics.css.gzipSize + metrics.javascript.gzipSize;

    // Calculate reduction if previous size is available
    const previousMetrics = getPreviousBundleMetrics();
    if (previousMetrics) {
      metrics.css.reduction = calculateReduction(previousMetrics.css.size, metrics.css.size);
      metrics.javascript.reduction = calculateReduction(previousMetrics.javascript.size, metrics.javascript.size);
      metrics.total.reduction = calculateReduction(previousMetrics.total.size, metrics.total.size);
    }

    // Store current metrics for future comparison
    storeBundleMetrics(metrics);

    return metrics;
  } catch (error) {
    console.warn('Failed to measure bundle size:', error);
    return metrics;
  }
};

/**
 * Estimate CSS size based on Tailwind configuration and usage
 */
const estimateCSSSizeFromConfig = async (): Promise<number> => {
  // Base Tailwind CSS size estimation
  const baseTailwindSize = 50000; // ~50KB base
  
  // Estimate based on custom properties and components
  const customPropertiesSize = 2000; // ~2KB for CSS custom properties
  const componentStylesSize = 5000; // ~5KB for component styles
  const animationsSize = 1500; // ~1.5KB for animations
  
  // Estimate purging effectiveness (should reduce by ~80%)
  const purgingReduction = 0.8;
  
  const totalEstimated = baseTailwindSize + customPropertiesSize + componentStylesSize + animationsSize;
  return Math.round(totalEstimated * (1 - purgingReduction));
};

/**
 * Fetch actual bundle sizes in production
 */
const fetchBundleSizes = async (): Promise<{ css: any; javascript: any }> => {
  // This would typically fetch from build manifest or analyze actual files
  // For now, return placeholder values
  return {
    css: { size: 15000, gzipSize: 4500, reduction: 0 },
    javascript: { size: 120000, gzipSize: 35000, reduction: 0 },
  };
};

/**
 * Calculate percentage reduction
 */
const calculateReduction = (previous: number, current: number): number => {
  if (previous === 0) return 0;
  return Math.round(((previous - current) / previous) * 100);
};

/**
 * Store bundle metrics in localStorage for comparison
 */
const storeBundleMetrics = (metrics: BundleMetrics): void => {
  try {
    localStorage.setItem('bundleMetrics', JSON.stringify({
      ...metrics,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Failed to store bundle metrics:', error);
  }
};

/**
 * Get previous bundle metrics from localStorage
 */
const getPreviousBundleMetrics = (): BundleMetrics | null => {
  try {
    const stored = localStorage.getItem('bundleMetrics');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only use if less than 7 days old
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to retrieve previous bundle metrics:', error);
  }
  return null;
};

/**
 * Measure Core Web Vitals
 */
export const measureCoreWebVitals = (): Promise<PerformanceMetrics['coreWebVitals']> => {
  return new Promise((resolve) => {
    const metrics: PerformanceMetrics['coreWebVitals'] = {
      fcp: 0,
      lcp: 0,
      cls: 0,
      fid: 0,
      inp: 0,
    };

    // Measure FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        metrics.fcp = fcpEntry.startTime;
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Measure LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      metrics.lcp = lastEntry.startTime;
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Measure CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      metrics.cls = clsValue;
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Measure FID (First Input Delay) / INP (Interaction to Next Paint)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metrics.fid = (entry as any).processingStart - entry.startTime;
        metrics.inp = (entry as any).duration || 0;
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Resolve after a reasonable time to collect metrics
    setTimeout(() => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
      fidObserver.disconnect();
      resolve(metrics);
    }, 5000);
  });
};

/**
 * Measure interaction response times
 */
export const measureInteractionResponse = (): Promise<PerformanceMetrics['interactionResponse']> => {
  return new Promise((resolve) => {
    const responseTimes: number[] = [];
    const target = 100; // 100ms target

    const measureInteraction = (startTime: number) => {
      const responseTime = performance.now() - startTime;
      responseTimes.push(responseTime);
    };

    // Add event listeners to measure common interactions
    const addInteractionListeners = () => {
      document.addEventListener('click', (e) => {
        const startTime = performance.now();
        requestAnimationFrame(() => measureInteraction(startTime));
      });

      document.addEventListener('input', (e) => {
        const startTime = performance.now();
        requestAnimationFrame(() => measureInteraction(startTime));
      });
    };

    addInteractionListeners();

    // Resolve after collecting some data
    setTimeout(() => {
      const average = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;
      
      const sorted = responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index] || 0;

      resolve({
        average: Math.round(average),
        p95: Math.round(p95),
        target,
      });
    }, 10000); // Collect for 10 seconds
  });
};

/**
 * Generate comprehensive performance report
 */
export const generatePerformanceReport = async (): Promise<PerformanceMetrics> => {
  const [bundleMetrics, coreWebVitals, interactionResponse] = await Promise.all([
    measureBundleSize(),
    measureCoreWebVitals(),
    measureInteractionResponse(),
  ]);

  const featureSupport = {
    containerQueries: CSS?.supports?.('container-type: inline-size') ?? false,
    cssCustomProperties: CSS?.supports?.('color: var(--test)') ?? false,
    backdropFilter: CSS?.supports?.('backdrop-filter: blur(10px)') ?? false,
    optimisticUpdates: typeof React !== 'undefined' && 'useOptimistic' in React,
  };

  return {
    renderTime: {
      initial: 0, // Would be measured during app initialization
      update: 0,  // Would be measured during state updates
      optimistic: 0, // Would be measured during optimistic updates
    },
    interactionResponse,
    coreWebVitals,
    bundleMetrics,
    featureSupport,
  };
};

/**
 * Log performance metrics to console in development
 */
export const logPerformanceMetrics = (metrics: PerformanceMetrics): void => {
  if (import.meta.env.DEV) {
    console.group('🚀 Performance Metrics');
    
    console.group('📦 Bundle Size');
    console.log(`CSS: ${(metrics.bundleMetrics.css.size / 1024).toFixed(1)}KB (${(metrics.bundleMetrics.css.gzipSize / 1024).toFixed(1)}KB gzipped)`);
    console.log(`JavaScript: ${(metrics.bundleMetrics.javascript.size / 1024).toFixed(1)}KB (${(metrics.bundleMetrics.javascript.gzipSize / 1024).toFixed(1)}KB gzipped)`);
    console.log(`Total: ${(metrics.bundleMetrics.total.size / 1024).toFixed(1)}KB (${(metrics.bundleMetrics.total.gzipSize / 1024).toFixed(1)}KB gzipped)`);
    if (metrics.bundleMetrics.css.reduction > 0) {
      console.log(`CSS Reduction: ${metrics.bundleMetrics.css.reduction}%`);
    }
    console.groupEnd();

    console.group('⚡ Core Web Vitals');
    console.log(`FCP: ${metrics.coreWebVitals.fcp.toFixed(0)}ms`);
    console.log(`LCP: ${metrics.coreWebVitals.lcp.toFixed(0)}ms`);
    console.log(`CLS: ${metrics.coreWebVitals.cls.toFixed(3)}`);
    console.log(`FID: ${metrics.coreWebVitals.fid.toFixed(0)}ms`);
    console.log(`INP: ${metrics.coreWebVitals.inp.toFixed(0)}ms`);
    console.groupEnd();

    console.group('🎯 Interaction Response');
    console.log(`Average: ${metrics.interactionResponse.average}ms`);
    console.log(`95th Percentile: ${metrics.interactionResponse.p95}ms`);
    console.log(`Target: ${metrics.interactionResponse.target}ms`);
    console.log(`Meeting Target: ${metrics.interactionResponse.p95 <= metrics.interactionResponse.target ? '✅' : '❌'}`);
    console.groupEnd();

    console.group('🔧 Feature Support');
    console.log(`Container Queries: ${metrics.featureSupport.containerQueries ? '✅' : '❌'}`);
    console.log(`CSS Custom Properties: ${metrics.featureSupport.cssCustomProperties ? '✅' : '❌'}`);
    console.log(`Backdrop Filter: ${metrics.featureSupport.backdropFilter ? '✅' : '❌'}`);
    console.log(`Optimistic Updates: ${metrics.featureSupport.optimisticUpdates ? '✅' : '❌'}`);
    console.groupEnd();

    console.groupEnd();
  }
};
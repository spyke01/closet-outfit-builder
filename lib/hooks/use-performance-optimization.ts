import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { serverOptimizer, startCacheCleanup, serverPerformanceMonitor } from '../utils/server-optimization';
import { imageOptimizer, imagePerformanceMonitor } from '../utils/image-optimization';
import { cacheUtils } from '../query-client';

// Performance optimization hook
export function usePerformanceOptimization(userId?: string) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);
  const performanceMetrics = useRef({
    queryHits: 0,
    queryMisses: 0,
    imageLoads: 0,
    edgeFunctionCalls: 0,
  });

  // Initialize performance optimizations
  useEffect(() => {
    // Start cache cleanup interval
    startCacheCleanup();
    
    // Set up query client monitoring
    const originalGetQueryData = queryClient.getQueryData.bind(queryClient);
    queryClient.getQueryData = (queryKey: any): any => {
      const data = originalGetQueryData(queryKey);
      if (data !== undefined) {
        performanceMetrics.current.queryHits++;
      } else {
        performanceMetrics.current.queryMisses++;
      }
      return data;
    };
    
    // Clean up on unmount
    cleanupRef.current = () => {
      imageOptimizer.clearCache();
      serverOptimizer.cleanupCache();
    };
    
    return cleanupRef.current;
  }, [queryClient]);

  // Prefetch common data when user is available
  useEffect(() => {
    if (userId) {
      serverOptimizer.prefetchCommonData(userId, queryClient);
    }
  }, [userId, queryClient]);

  // Optimized outfit scoring
  const scoreOutfit = useCallback(async (selection: Record<string, any>) => {
    if (!userId) return { score: 0, breakdown: {} };
    
    const operationId = serverPerformanceMonitor.startOperation('scoreOutfit');
    performanceMetrics.current.edgeFunctionCalls++;
    
    try {
      const result = await serverOptimizer.scoreOutfitOptimized(selection, userId);
      return result;
    } finally {
      serverPerformanceMonitor.endOperation(operationId);
    }
  }, [userId]);

  // Optimized anchor filtering
  const filterByAnchor = useCallback(async (anchorItemId: string) => {
    if (!userId) return [];
    
    const operationId = serverPerformanceMonitor.startOperation('filterByAnchor');
    performanceMetrics.current.edgeFunctionCalls++;
    
    try {
      const result = await serverOptimizer.filterByAnchorOptimized(anchorItemId, userId, queryClient);
      return result;
    } finally {
      serverPerformanceMonitor.endOperation(operationId);
    }
  }, [userId, queryClient]);

  // Optimized image loading
  const loadOptimizedImage = useCallback((
    imagePath: string,
    size: 'thumbnail' | 'medium' | 'large' = 'medium'
  ) => {
    performanceMetrics.current.imageLoads++;
    imagePerformanceMonitor.startLoad(imagePath);
    
    return {
      src: imageOptimizer.generateOptimizedUrl('wardrobe-images', imagePath, {
        width: size === 'thumbnail' ? 150 : size === 'medium' ? 400 : 800,
        height: size === 'thumbnail' ? 150 : size === 'medium' ? 400 : 800,
        quality: 85,
        format: 'webp',
        resize: 'cover',
      }),
      onLoad: () => imagePerformanceMonitor.endLoad(imagePath),
      onError: () => imagePerformanceMonitor.endLoad(imagePath),
    };
  }, []);

  // Cache management utilities
  const cacheManagement = useCallback(() => ({
    // Invalidate wardrobe data efficiently
    invalidateWardrobeData: () => {
      if (userId) {
        return cacheUtils.invalidateWardrobeData(queryClient, userId);
      }
    },
    
    // Clear stale queries
    clearStaleQueries: () => {
      cacheUtils.clearStaleQueries(queryClient);
    },
    
    // Get cache statistics
    getCacheStats: () => ({
      queryCache: {
        size: queryClient.getQueryCache().getAll().length,
        hits: performanceMetrics.current.queryHits,
        misses: performanceMetrics.current.queryMisses,
        hitRate: performanceMetrics.current.queryHits / 
          (performanceMetrics.current.queryHits + performanceMetrics.current.queryMisses) || 0,
      },
      imageCache: {
        size: imageOptimizer.getCacheSize(),
        loads: performanceMetrics.current.imageLoads,
        averageLoadTime: imagePerformanceMonitor.getAverageLoadTime(),
      },
      serverCache: serverOptimizer.getCacheStats(),
      edgeFunctions: {
        calls: performanceMetrics.current.edgeFunctionCalls,
        averageTimes: serverPerformanceMonitor.getStats(),
      },
    }),
  }), [userId, queryClient]);

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    const stats = cacheManagement().getCacheStats();
    
    return {
      ...stats,
      recommendations: generatePerformanceRecommendations(stats),
    };
  }, [cacheManagement]);

  // Batch operations for better performance
  const batchOperations = useCallback(() => ({
    // Batch duplicate checks
    checkDuplicates: async (outfitCombinations: Array<{ items: string[]; userId: string }>) => {
      return serverOptimizer.batchDuplicateChecks(outfitCombinations);
    },
    
    // Batch image preloading
    preloadImages: (imagePaths: string[]) => {
      imagePaths.forEach(path => {
        const url = imageOptimizer.generateOptimizedUrl('wardrobe-images', path, {
          width: 400,
          quality: 80,
          format: 'webp',
        });
        imageOptimizer.preloadImage(url, 'low');
      });
    },
  }), []);

  return {
    scoreOutfit,
    filterByAnchor,
    loadOptimizedImage,
    cacheManagement: cacheManagement(),
    getPerformanceMetrics,
    batchOperations: batchOperations(),
  };
}

// Generate performance recommendations based on metrics
function generatePerformanceRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  // Query cache recommendations
  if (stats.queryCache.hitRate < 0.7) {
    recommendations.push('Consider increasing query stale time for better cache hit rates');
  }
  
  if (stats.queryCache.size > 100) {
    recommendations.push('Query cache is large, consider clearing stale queries');
  }
  
  // Image cache recommendations
  if (stats.imageCache.averageLoadTime > 2000) {
    recommendations.push('Image load times are slow, consider optimizing image sizes');
  }
  
  if (stats.imageCache.size > 200) {
    recommendations.push('Image cache is large, consider clearing unused images');
  }
  
  // Edge function recommendations
  if (stats.edgeFunctions.calls > 50) {
    recommendations.push('High number of Edge Function calls, consider client-side optimization');
  }
  
  // Server cache recommendations
  if (stats.serverCache.size > 500) {
    recommendations.push('Server cache is large, cleanup may be needed');
  }
  
  return recommendations;
}

// Hook for monitoring page performance
export function usePagePerformance() {
  const metricsRef = useRef({
    navigationStart: 0,
    domContentLoaded: 0,
    loadComplete: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capture navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metricsRef.current.navigationStart = navigation.startTime;
      metricsRef.current.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime;
      metricsRef.current.loadComplete = navigation.loadEventEnd - navigation.startTime;
    }

    // Capture paint timing
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metricsRef.current.firstContentfulPaint = entry.startTime;
        }
        if (entry.entryType === 'largest-contentful-paint') {
          metricsRef.current.largestContentfulPaint = entry.startTime;
        }
      }
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

    return () => observer.disconnect();
  }, []);

  const getPageMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      // Core Web Vitals assessment
      coreWebVitals: {
        lcp: {
          value: metricsRef.current.largestContentfulPaint,
          rating: metricsRef.current.largestContentfulPaint < 2500 ? 'good' : 
                  metricsRef.current.largestContentfulPaint < 4000 ? 'needs-improvement' : 'poor',
        },
        fcp: {
          value: metricsRef.current.firstContentfulPaint,
          rating: metricsRef.current.firstContentfulPaint < 1800 ? 'good' : 
                  metricsRef.current.firstContentfulPaint < 3000 ? 'needs-improvement' : 'poor',
        },
      },
    };
  }, []);

  return { getPageMetrics };
}
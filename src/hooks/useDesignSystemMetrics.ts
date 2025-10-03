import { useEffect, useState } from 'react';
import { generatePerformanceReport, logPerformanceMetrics, type PerformanceMetrics } from '../utils/performanceMetrics';
import { useFeatureSupport } from './useFeatureSupport';

/**
 * Hook for monitoring design system performance and bundle optimization
 */
export const useDesignSystemMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const featureSupport = useFeatureSupport();

  const measurePerformance = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const performanceMetrics = await generatePerformanceReport();
      setMetrics(performanceMetrics);
      
      // Log metrics in development
      if (import.meta.env.DEV) {
        logPerformanceMetrics(performanceMetrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to measure performance'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Measure performance on mount
    measurePerformance();

    // Set up periodic measurement in development
    if (import.meta.env.DEV) {
      const interval = setInterval(measurePerformance, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, []);

  return {
    metrics,
    isLoading,
    error,
    featureSupport,
    measurePerformance,
  };
};

/**
 * Hook for tracking CSS bundle size reduction
 */
export const useBundleOptimization = () => {
  const [bundleMetrics, setBundleMetrics] = useState<PerformanceMetrics['bundleMetrics'] | null>(null);
  const [optimizationScore, setOptimizationScore] = useState<number>(0);

  useEffect(() => {
    const trackBundleSize = async () => {
      try {
        const report = await generatePerformanceReport();
        setBundleMetrics(report.bundleMetrics);

        // Calculate optimization score based on bundle size and reduction
        const cssReduction = report.bundleMetrics.css.reduction || 0;
        const totalSize = report.bundleMetrics.total.size;
        const targetSize = 200000; // 200KB target

        const sizeScore = Math.max(0, 100 - (totalSize / targetSize) * 100);
        const reductionScore = Math.min(100, cssReduction * 2); // Up to 50% reduction = 100 points
        
        setOptimizationScore(Math.round((sizeScore + reductionScore) / 2));
      } catch (error) {
        console.warn('Failed to track bundle optimization:', error);
      }
    };

    trackBundleSize();
  }, []);

  return {
    bundleMetrics,
    optimizationScore,
    isOptimized: optimizationScore >= 70, // 70+ is considered well optimized
  };
};

/**
 * Hook for monitoring design system feature adoption
 */
export const useDesignSystemAdoption = () => {
  const featureSupport = useFeatureSupport();
  const [adoptionScore, setAdoptionScore] = useState<number>(0);

  useEffect(() => {
    // Calculate adoption score based on feature support
    const features = Object.values(featureSupport);
    const supportedFeatures = features.filter(Boolean).length;
    const totalFeatures = features.length;
    
    setAdoptionScore(Math.round((supportedFeatures / totalFeatures) * 100));
  }, [featureSupport]);

  const getFeatureStatus = () => {
    return {
      modernFeatures: {
        containerQueries: featureSupport.containerQueries,
        cssCustomProperties: featureSupport.cssCustomProperties,
        backdropFilter: featureSupport.backdropFilter,
        gridSubgrid: featureSupport.gridSubgrid,
        viewTransitions: featureSupport.viewTransitions,
      },
      reactFeatures: {
        optimistic: featureSupport.optimistic,
        suspense: featureSupport.suspense,
        transitions: featureSupport.transitions,
      },
      adoptionScore,
      isModern: adoptionScore >= 80, // 80%+ feature support is considered modern
    };
  };

  return {
    featureSupport,
    adoptionScore,
    getFeatureStatus,
  };
};

/**
 * Hook for performance-aware component rendering
 */
export const usePerformanceAwareRendering = () => {
  const [renderMetrics, setRenderMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });

  const measureRender = (componentName: string) => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      setRenderMetrics(prev => {
        const newRenderCount = prev.renderCount + 1;
        const newAverageRenderTime = 
          (prev.averageRenderTime * prev.renderCount + renderTime) / newRenderCount;

        return {
          renderCount: newRenderCount,
          averageRenderTime: newAverageRenderTime,
          lastRenderTime: renderTime,
        };
      });

      // Log slow renders in development
      if (import.meta.env.DEV && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  };

  return {
    renderMetrics,
    measureRender,
    isPerformant: renderMetrics.averageRenderTime < 16, // 60fps target
  };
};
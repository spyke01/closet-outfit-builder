import { useEffect, useCallback, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: {
    initial: number;
    update: number;
    optimistic: number;
  };
  interactionResponse: {
    average: number;
    p95: number;
    target: number;
    samples: number[];
  };
  coreWebVitals: {
    fcp: number | null; // First Contentful Paint
    lcp: number | null; // Largest Contentful Paint
    cls: number | null; // Cumulative Layout Shift
    fid: number | null; // First Input Delay
    inp: number | null; // Interaction to Next Paint (new in 2024)
  };
  customMetrics: {
    outfitGenerationTime: number[];
    searchResponseTime: number[];
    filterResponseTime: number[];
  };
}

interface PerformanceMonitoringHook {
  metrics: PerformanceMetrics;
  measureInteraction: (name: string, fn: () => void | Promise<void>) => Promise<void>;
  measureRenderTime: (componentName: string, renderFn: () => void) => void;
  recordCustomMetric: (metricName: keyof PerformanceMetrics['customMetrics'], value: number) => void;
  getPerformanceReport: () => string;
  resetMetrics: () => void;
}

export const usePerformanceMonitoring = (): PerformanceMonitoringHook => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: {
      initial: 0,
      update: 0,
      optimistic: 0
    },
    interactionResponse: {
      average: 0,
      p95: 0,
      target: 100, // 100ms target
      samples: []
    },
    coreWebVitals: {
      fcp: null,
      lcp: null,
      cls: null,
      fid: null,
      inp: null
    },
    customMetrics: {
      outfitGenerationTime: [],
      searchResponseTime: [],
      filterResponseTime: []
    }
  });

  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  const interactionStartRef = useRef<number>(0);

  // Initialize Core Web Vitals monitoring
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Monitor paint metrics (FCP, LCP)
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({
                ...prev,
                coreWebVitals: { ...prev.coreWebVitals, fcp: entry.startTime }
              }));
            }
          } else if (entry.entryType === 'largest-contentful-paint') {
            setMetrics(prev => ({
              ...prev,
              coreWebVitals: { ...prev.coreWebVitals, lcp: entry.startTime }
            }));
          }
        }
      });

      paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

      // Monitor layout shifts (CLS)
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        if (clsValue > 0) {
          setMetrics(prev => ({
            ...prev,
            coreWebVitals: { ...prev.coreWebVitals, cls: clsValue }
          }));
        }
      });

      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });

      // Monitor first input delay (FID) and interaction to next paint (INP)
      const inputObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = entry.processingStart - entry.startTime;
            setMetrics(prev => ({
              ...prev,
              coreWebVitals: { ...prev.coreWebVitals, fid }
            }));
          } else if (entry.entryType === 'event' && entry.name === 'click') {
            // Approximate INP measurement
            const inp = entry.processingEnd - entry.startTime;
            setMetrics(prev => ({
              ...prev,
              coreWebVitals: { ...prev.coreWebVitals, inp }
            }));
          }
        }
      });

      try {
        inputObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Fallback for browsers that don't support first-input
        console.warn('first-input observation not supported');
      }

      performanceObserverRef.current = paintObserver;

      return () => {
        paintObserver.disconnect();
        layoutShiftObserver.disconnect();
        inputObserver.disconnect();
      };
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }, []);

  // Measure interaction response time
  const measureInteraction = useCallback(async (name: string, fn: () => void | Promise<void>) => {
    const startTime = performance.now();
    
    try {
      await fn();
    } catch (error) {
      console.error(`Error in interaction ${name}:`, error);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setMetrics(prev => {
      const newSamples = [...prev.interactionResponse.samples, duration].slice(-100); // Keep last 100 samples
      const average = newSamples.reduce((sum, val) => sum + val, 0) / newSamples.length;
      const sorted = [...newSamples].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index] || 0;
      
      return {
        ...prev,
        interactionResponse: {
          ...prev.interactionResponse,
          average,
          p95,
          samples: newSamples
        }
      };
    });
    
    // Log slow interactions
    if (duration > 100) {
      console.warn(`Slow interaction detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }, []);

  // Measure render time
  const measureRenderTime = useCallback((componentName: string, renderFn: () => void) => {
    const startTime = performance.now();
    
    renderFn();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setMetrics(prev => ({
      ...prev,
      renderTime: {
        ...prev.renderTime,
        update: duration
      }
    }));
    
    // Log slow renders
    if (duration > 16.67) { // 60fps threshold
      console.warn(`Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  }, []);

  // Record custom metrics
  const recordCustomMetric = useCallback((
    metricName: keyof PerformanceMetrics['customMetrics'], 
    value: number
  ) => {
    setMetrics(prev => ({
      ...prev,
      customMetrics: {
        ...prev.customMetrics,
        [metricName]: [...prev.customMetrics[metricName], value].slice(-50) // Keep last 50 samples
      }
    }));
  }, []);

  // Generate performance report
  const getPerformanceReport = useCallback(() => {
    const { renderTime, interactionResponse, coreWebVitals, customMetrics } = metrics;
    
    const report = `
Performance Report
==================

Core Web Vitals:
- First Contentful Paint (FCP): ${coreWebVitals.fcp?.toFixed(2) || 'N/A'}ms
- Largest Contentful Paint (LCP): ${coreWebVitals.lcp?.toFixed(2) || 'N/A'}ms
- Cumulative Layout Shift (CLS): ${coreWebVitals.cls?.toFixed(4) || 'N/A'}
- First Input Delay (FID): ${coreWebVitals.fid?.toFixed(2) || 'N/A'}ms
- Interaction to Next Paint (INP): ${coreWebVitals.inp?.toFixed(2) || 'N/A'}ms

Interaction Response:
- Average: ${interactionResponse.average.toFixed(2)}ms
- 95th Percentile: ${interactionResponse.p95.toFixed(2)}ms
- Target: ${interactionResponse.target}ms
- Samples: ${interactionResponse.samples.length}

Render Performance:
- Initial Render: ${renderTime.initial.toFixed(2)}ms
- Update Render: ${renderTime.update.toFixed(2)}ms
- Optimistic Render: ${renderTime.optimistic.toFixed(2)}ms

Custom Metrics:
- Outfit Generation (avg): ${customMetrics.outfitGenerationTime.length > 0 
  ? (customMetrics.outfitGenerationTime.reduce((a, b) => a + b, 0) / customMetrics.outfitGenerationTime.length).toFixed(2) 
  : 'N/A'}ms
- Search Response (avg): ${customMetrics.searchResponseTime.length > 0 
  ? (customMetrics.searchResponseTime.reduce((a, b) => a + b, 0) / customMetrics.searchResponseTime.length).toFixed(2) 
  : 'N/A'}ms
- Filter Response (avg): ${customMetrics.filterResponseTime.length > 0 
  ? (customMetrics.filterResponseTime.reduce((a, b) => a + b, 0) / customMetrics.filterResponseTime.length).toFixed(2) 
  : 'N/A'}ms

Performance Status:
- Interaction Response: ${interactionResponse.average <= interactionResponse.target ? '✅ GOOD' : '❌ NEEDS IMPROVEMENT'}
- Core Web Vitals: ${
  (coreWebVitals.fcp || 0) <= 1800 && 
  (coreWebVitals.lcp || 0) <= 2500 && 
  (coreWebVitals.cls || 0) <= 0.1 && 
  (coreWebVitals.fid || 0) <= 100 
    ? '✅ GOOD' : '❌ NEEDS IMPROVEMENT'
}
    `.trim();
    
    return report;
  }, [metrics]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      renderTime: {
        initial: 0,
        update: 0,
        optimistic: 0
      },
      interactionResponse: {
        average: 0,
        p95: 0,
        target: 100,
        samples: []
      },
      coreWebVitals: {
        fcp: null,
        lcp: null,
        cls: null,
        fid: null,
        inp: null
      },
      customMetrics: {
        outfitGenerationTime: [],
        searchResponseTime: [],
        filterResponseTime: []
      }
    });
  }, []);

  return {
    metrics,
    measureInteraction,
    measureRenderTime,
    recordCustomMetric,
    getPerformanceReport,
    resetMetrics
  };
};
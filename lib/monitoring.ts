import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'lib-monitoring' });


/**
 * Production monitoring and error tracking utilities
 * Optimized for deferred loading after hydration
 */

import React from 'react';

// Performance API type extensions
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

// Error tracking interface
interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  context?: Record<string, unknown>;
}

// Performance metrics interface
interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  url: string;
  timestamp: string;
}

// Monitoring data type
type MonitoringData = ErrorReport | PerformanceMetrics | Record<string, unknown>;

class ProductionMonitoring {
  private isProduction = process.env.NODE_ENV === 'production';
  private apiEndpoint = '/api/monitoring';
  private initialized = false;

  /**
   * Initialize monitoring (called after hydration)
   */
  initialize() {
    if (this.initialized || typeof window === 'undefined') return;
    
    this.initialized = true;
    this.setupGlobalErrorHandlers();
    this.logPerformanceMetrics();
    
    // Track initial page load
    this.logUserEvent('app_start', {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer,
    });
  }

  /**
   * Setup global error handlers (deferred)
   */
  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    const handleError = (event: ErrorEvent) => {
      this.logError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      this.logError(new Error(String(event.reason)), {
        type: 'unhandledRejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup function (though it's rarely needed for global handlers)
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }

  /**
   * Log error to monitoring service
   */
  logError(error: Error, context?: Record<string, unknown>) {
    if (!this.isProduction) {
      logger.error('Error', { error, context });
      return;
    }

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      timestamp: new Date().toISOString(),
      context,
    };

    // Send to monitoring endpoint (non-blocking)
    this.sendToMonitoring('error', errorReport).catch(() => {
      // Silently fail to avoid cascading errors
    });
  }

  /**
   * Log performance metrics (deferred)
   */
  logPerformanceMetrics() {
    if (!this.isProduction || typeof window === 'undefined') return;

    // Use Performance Observer API if available
    if ('PerformanceObserver' in window) {
      this.observeWebVitals();
    }

    // Fallback to Navigation Timing API
    window.addEventListener('load', () => {
      // Use requestIdleCallback to defer until browser is idle
      const collectMetrics = () => {
        this.collectNavigationMetrics();
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(collectMetrics, { timeout: 2000 });
      } else {
        setTimeout(collectMetrics, 100);
      }
    });
  }

  /**
   * Observe Core Web Vitals (deferred)
   */
  private observeWebVitals() {
    try {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.reportMetric('LCP', lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // PerformanceEventTiming has processingStart and startTime
          const eventEntry = entry as PerformanceEventTiming;
          if ('processingStart' in eventEntry) {
            this.reportMetric('FID', eventEntry.processingStart - eventEntry.startTime);
          }
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let cumulativeScore = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // Layout shift entries have hadRecentInput and value properties
          const layoutEntry = entry as LayoutShift;
          if ('hadRecentInput' in layoutEntry && !layoutEntry.hadRecentInput && 'value' in layoutEntry) {
            cumulativeScore += layoutEntry.value;
          }
        });
        this.reportMetric('CLS', cumulativeScore);
      }).observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      // Silently fail if Performance Observer is not supported
      logger.warn('Performance Observer not supported:', error);
    }
  }

  /**
   * Collect navigation timing metrics
   */
  private collectNavigationMetrics() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics: PerformanceMetrics = {
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          firstContentfulPaint: this.getMetricValue('first-contentful-paint'),
          largestContentfulPaint: this.getMetricValue('largest-contentful-paint'),
          cumulativeLayoutShift: 0, // Will be updated by observer
          firstInputDelay: 0, // Will be updated by observer
          url: typeof window !== 'undefined' ? window.location.href : 'server',
          timestamp: new Date().toISOString(),
        };

        this.sendToMonitoring('performance', metrics).catch(() => {
          // Silently fail
        });
      }
    } catch {
      // Silently fail if navigation timing is not supported
    }
  }

  /**
   * Get performance metric value by name
   */
  private getMetricValue(metricName: string): number {
    try {
      const entries = performance.getEntriesByName(metricName);
      return entries.length > 0 ? entries[0].startTime : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Report individual metric
   */
  private reportMetric(name: string, value: number) {
    this.sendToMonitoring('metric', {
      name,
      value,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // Silently fail
    });
  }

  /**
   * Send data to monitoring endpoint (non-blocking)
   */
  private async sendToMonitoring(type: string, data: MonitoringData) {
    try {
      // Use fetch with no-cors for fire-and-forget
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
        keepalive: true, // Ensure request completes even if page unloads
      });
    } catch (error) {
      // Silently fail in production to avoid cascading errors
      if (!this.isProduction) {
        logger.warn('Failed to send monitoring data:', error);
      }
    }
  }

  /**
   * Log user interaction events (deferred)
   */
  logUserEvent(eventName: string, properties?: Record<string, unknown>) {
    if (!this.isProduction) return;

    // Use requestIdleCallback to defer non-critical tracking
    const logEvent = () => {
      this.sendToMonitoring('event', {
        name: eventName,
        properties,
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        timestamp: new Date().toISOString(),
      }).catch(() => {
        // Silently fail
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(logEvent, { timeout: 1000 });
    } else {
      setTimeout(logEvent, 0);
    }
  }

  /**
   * Log API call metrics (deferred)
   */
  logApiCall(endpoint: string, method: string, duration: number, status: number) {
    if (!this.isProduction) return;

    // Defer API call logging to avoid blocking
    setTimeout(() => {
      this.sendToMonitoring('api', {
        endpoint,
        method,
        duration,
        status,
        timestamp: new Date().toISOString(),
      }).catch(() => {
        // Silently fail
      });
    }, 0);
  }
}

// Global monitoring instance
export const monitoring = new ProductionMonitoring();

// Error boundary helper (lightweight, no deferred loading needed)
export function withErrorBoundary<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  return function ErrorBoundaryWrapper(props: T) {
    React.useEffect(() => {
      // Only setup if monitoring is initialized
      if (!monitoring['initialized']) return;

      const handleError = (event: ErrorEvent) => {
        monitoring.logError(new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        monitoring.logError(new Error(String(event.reason)), {
          type: 'unhandledRejection',
        });
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
          window.removeEventListener('error', handleError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
      }
    }, []);

    return React.createElement(Component, props);
  };
}

// Hook for tracking user interactions (deferred)
export function useAnalytics() {
  const trackEvent = React.useCallback((eventName: string, properties?: Record<string, unknown>) => {
    monitoring.logUserEvent(eventName, properties);
  }, []);

  const trackPageView = React.useCallback((pageName: string) => {
    monitoring.logUserEvent('page_view', { page: pageName });
  }, []);

  return { trackEvent, trackPageView };
}

// Hook for tracking API calls (deferred)
export function useApiTracking() {
  const trackApiCall = React.useCallback(
    (endpoint: string, method: string, duration: number, status: number) => {
      monitoring.logApiCall(endpoint, method, duration, status);
    },
    []
  );

  return { trackApiCall };
}

// Initialize monitoring (called after hydration)
export function initializeMonitoring() {
  if (typeof window !== 'undefined') {
    monitoring.initialize();
  }
}

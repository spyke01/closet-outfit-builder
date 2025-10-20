/**
 * Production monitoring and error tracking utilities
 */

import React from 'react';

// Error tracking interface
interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  context?: Record<string, any>;
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

class ProductionMonitoring {
  private isProduction = process.env.NODE_ENV === 'production';
  private apiEndpoint = '/api/monitoring';

  /**
   * Log error to monitoring service
   */
  logError(error: Error, context?: Record<string, any>) {
    if (!this.isProduction) {
      console.error('Error:', error, context);
      return;
    }

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      context,
    };

    // Send to monitoring endpoint (non-blocking)
    this.sendToMonitoring('error', errorReport).catch(console.error);
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics() {
    if (!this.isProduction || typeof window === 'undefined') return;

    // Use Performance Observer API
    if ('PerformanceObserver' in window) {
      this.observeWebVitals();
    }

    // Fallback to Navigation Timing API
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.collectNavigationMetrics();
      }, 0);
    });
  }

  /**
   * Observe Core Web Vitals
   */
  private observeWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.reportMetric('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.reportMetric('FID', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let cumulativeScore = 0;
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          cumulativeScore += entry.value;
        }
      });
      this.reportMetric('CLS', cumulativeScore);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Collect navigation timing metrics
   */
  private collectNavigationMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics: PerformanceMetrics = {
        pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        firstContentfulPaint: this.getMetricValue('first-contentful-paint'),
        largestContentfulPaint: this.getMetricValue('largest-contentful-paint'),
        cumulativeLayoutShift: 0, // Will be updated by observer
        firstInputDelay: 0, // Will be updated by observer
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      this.sendToMonitoring('performance', metrics).catch(console.error);
    }
  }

  /**
   * Get performance metric value by name
   */
  private getMetricValue(metricName: string): number {
    const entries = performance.getEntriesByName(metricName);
    return entries.length > 0 ? entries[0].startTime : 0;
  }

  /**
   * Report individual metric
   */
  private reportMetric(name: string, value: number) {
    this.sendToMonitoring('metric', {
      name,
      value,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }).catch(console.error);
  }

  /**
   * Send data to monitoring endpoint
   */
  private async sendToMonitoring(type: string, data: any) {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
      });
    } catch (error) {
      // Silently fail in production to avoid cascading errors
      if (!this.isProduction) {
        console.error('Failed to send monitoring data:', error);
      }
    }
  }

  /**
   * Log user interaction events
   */
  logUserEvent(eventName: string, properties?: Record<string, any>) {
    if (!this.isProduction) return;

    this.sendToMonitoring('event', {
      name: eventName,
      properties,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }).catch(console.error);
  }

  /**
   * Log API call metrics
   */
  logApiCall(endpoint: string, method: string, duration: number, status: number) {
    if (!this.isProduction) return;

    this.sendToMonitoring('api', {
      endpoint,
      method,
      duration,
      status,
      timestamp: new Date().toISOString(),
    }).catch(console.error);
  }
}

// Global monitoring instance
export const monitoring = new ProductionMonitoring();

// Error boundary helper
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  return function ErrorBoundaryWrapper(props: T) {
    React.useEffect(() => {
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

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, []);

    return React.createElement(Component, props);
  };
}

// Hook for tracking user interactions
export function useAnalytics() {
  const trackEvent = React.useCallback((eventName: string, properties?: Record<string, any>) => {
    monitoring.logUserEvent(eventName, properties);
  }, []);

  const trackPageView = React.useCallback((pageName: string) => {
    monitoring.logUserEvent('page_view', { page: pageName });
  }, []);

  return { trackEvent, trackPageView };
}

// Hook for tracking API calls
export function useApiTracking() {
  const trackApiCall = React.useCallback(
    (endpoint: string, method: string, duration: number, status: number) => {
      monitoring.logApiCall(endpoint, method, duration, status);
    },
    []
  );

  return { trackApiCall };
}

// Initialize monitoring on app start
export function initializeMonitoring() {
  if (typeof window !== 'undefined') {
    monitoring.logPerformanceMetrics();
    
    // Track initial page load
    monitoring.logUserEvent('app_start', {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer,
    });
  }
}
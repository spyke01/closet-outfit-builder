/**
 * Conditional monitoring module loader
 * Only loads monitoring functionality when enabled via feature flags
 */

import React from 'react';
import { conditionalImport, isFeatureEnabled } from './feature-flags';

// Type definitions for monitoring functionality
export interface MonitoringInstance {
  initialize: () => void;
  logError: (error: Error, context?: Record<string, any>) => void;
  logUserEvent: (eventName: string, properties?: Record<string, any>) => void;
  logApiCall: (endpoint: string, method: string, duration: number, status: number) => void;
}

export interface AnalyticsHooks {
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  trackPageView: (pageName: string) => void;
  trackApiCall: (endpoint: string, method: string, duration: number, status: number) => void;
}

let monitoringModule: any = null;
let monitoringInstance: MonitoringInstance | null = null;
let isLoading = false;

/**
 * Conditionally load and initialize monitoring
 */
export async function initializeConditionalMonitoring(): Promise<MonitoringInstance | null> {
  // Check if monitoring is enabled
  if (!isFeatureEnabled('monitoring')) {
    return null;
  }

  // Prevent SSR bundling
  if (typeof window === 'undefined') {
    return null;
  }

  // Return existing instance if already loaded
  if (monitoringInstance) {
    return monitoringInstance;
  }

  // Prevent multiple simultaneous loads
  if (isLoading) {
    return null;
  }

  isLoading = true;

  try {
    // Conditionally import monitoring module
    monitoringModule = await conditionalImport('monitoring', () => import('../monitoring'));
    
    if (monitoringModule) {
      monitoringInstance = monitoringModule.monitoring;
      
      // Initialize monitoring after successful load
      if (monitoringInstance) {
        monitoringInstance.initialize();
      }
    }
  } catch (error) {
    console.warn('Failed to load monitoring module:', error);
  } finally {
    isLoading = false;
  }

  return monitoringInstance;
}

/**
 * Get monitoring instance (returns null if not loaded or disabled)
 */
export function getMonitoringInstance(): MonitoringInstance | null {
  return monitoringInstance;
}

/**
 * Conditionally log error (no-op if monitoring disabled)
 */
export function conditionalLogError(error: Error, context?: Record<string, any>): void {
  if (monitoringInstance) {
    monitoringInstance.logError(error, context);
  }
}

/**
 * Conditionally log user event (no-op if monitoring disabled)
 */
export function conditionalLogUserEvent(eventName: string, properties?: Record<string, any>): void {
  if (monitoringInstance) {
    monitoringInstance.logUserEvent(eventName, properties);
  }
}

/**
 * Conditionally log API call (no-op if monitoring disabled)
 */
export function conditionalLogApiCall(
  endpoint: string, 
  method: string, 
  duration: number, 
  status: number
): void {
  if (monitoringInstance) {
    monitoringInstance.logApiCall(endpoint, method, duration, status);
  }
}

/**
 * Hook for conditional analytics (loads module on first use)
 */
export function useConditionalAnalytics(): AnalyticsHooks {
  // Initialize monitoring if not already done
  if (!monitoringInstance && isFeatureEnabled('analytics')) {
    initializeConditionalMonitoring().catch(() => {
      // Silently fail initialization
    });
  }

  return {
    trackEvent: (eventName: string, properties?: Record<string, any>) => {
      conditionalLogUserEvent(eventName, properties);
    },
    trackPageView: (pageName: string) => {
      conditionalLogUserEvent('page_view', { page: pageName });
    },
    trackApiCall: (endpoint: string, method: string, duration: number, status: number) => {
      conditionalLogApiCall(endpoint, method, duration, status);
    },
  };
}

/**
 * Preload monitoring module based on user intent
 */
export function preloadMonitoringModule(): void {
  if (!isFeatureEnabled('monitoring') || typeof window === 'undefined') {
    return;
  }

  // Use requestIdleCallback to preload during idle time
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      initializeConditionalMonitoring().catch(() => {
        // Silently fail preloading
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      initializeConditionalMonitoring().catch(() => {
        // Silently fail preloading
      });
    }, 100);
  }
}

/**
 * Error boundary helper with conditional monitoring
 */
export function withConditionalErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  return function ConditionalErrorBoundaryWrapper(props: T) {
    React.useEffect(() => {
      // Only setup error handling if monitoring is enabled and loaded
      if (!isFeatureEnabled('monitoring') || !monitoringInstance) {
        return;
      }

      const handleError = (event: ErrorEvent) => {
        conditionalLogError(new Error(event.message), {
          type: 'javascript',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        conditionalLogError(new Error(String(event.reason)), {
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
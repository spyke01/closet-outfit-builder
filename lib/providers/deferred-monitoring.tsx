'use client';

import React from 'react';

/**
 * Deferred monitoring component that loads after hydration
 * This ensures monitoring libraries don't block initial page load
 */
export function DeferredMonitoring() {
  React.useEffect(() => {
    // Only run in browser after hydration
    if (typeof window === 'undefined') return;

    // Use requestIdleCallback to defer until browser is idle
    const initializeWhenIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(
          async () => {
            await initializeMonitoringLibraries();
          },
          { timeout: 5000 } // Fallback timeout
        );
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          await initializeMonitoringLibraries();
        }, 2000);
      }
    };

    // Further defer initialization to prioritize critical rendering
    setTimeout(initializeWhenIdle, 1000);
  }, []);

  return null; // This component renders nothing
}

/**
 * Initialize all monitoring and analytics libraries after hydration
 */
async function initializeMonitoringLibraries() {
  try {
    // Load core monitoring functionality
    const { initializeMonitoring } = await import('@/lib/monitoring');
    initializeMonitoring();

    // Load third-party integrations (deferred)
    const { 
      initializeErrorTracking, 
      initializeAnalytics, 
      initializePerformanceMonitoring 
    } = await import('./third-party-integrations');

    // Initialize all third-party services
    await Promise.allSettled([
      initializeErrorTracking(),
      initializeAnalytics(),
      initializePerformanceMonitoring(),
    ]);

    console.log('✅ Monitoring libraries initialized after hydration');
  } catch (error) {
    // Silently fail to avoid breaking the app
    console.warn('Failed to initialize monitoring libraries:', error);
  }
}

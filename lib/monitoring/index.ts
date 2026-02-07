/**
 * Core Monitoring Module
 * 
 * Initializes all monitoring functionality including:
 * - Core Web Vitals tracking
 * - Performance monitoring
 * - Error tracking
 */

import { initWebVitals } from './web-vitals'

/**
 * Initialize all core monitoring functionality
 * Called after hydration to avoid blocking initial page load
 */
export function initializeMonitoring(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    // Initialize Core Web Vitals tracking
    initWebVitals()

    console.log('✅ Core monitoring initialized')
  } catch (error) {
    console.error('Failed to initialize core monitoring:', error)
  }
}

// Re-export monitoring utilities
export * from './web-vitals'

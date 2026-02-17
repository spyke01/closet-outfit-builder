/**
 * Core Monitoring Module
 * 
 * Initializes all monitoring functionality including:
 * - Core Web Vitals tracking
 * - Performance monitoring
 * - Error tracking
 */

import { initWebVitals } from './web-vitals'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ component: 'monitoring-core' })

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

    logger.info('Core monitoring initialized')
  } catch (error) {
    logger.error('Failed to initialize core monitoring:', error)
  }
}

// Re-export monitoring utilities
export * from './web-vitals'

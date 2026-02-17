/**
 * Core Web Vitals Tracking
 * 
 * Implements comprehensive performance monitoring using the web-vitals library.
 * Tracks LCP, CLS, FCP, TTFB, and INP metrics.
 * Note: FID has been deprecated in favor of INP (Interaction to Next Paint)
 * 
 * **Validates: Requirements 13.1**
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ component: 'monitoring-web-vitals' })

export interface WebVitalsMetric {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  navigationType: string
  timestamp: number
}

export interface AnalyticsPayload {
  metrics: WebVitalsMetric[]
  url: string
  userAgent: string
  timestamp: number
}

/**
 * Send metrics to analytics service
 * This can be configured to send to various analytics platforms
 */
function sendToAnalytics(metric: Metric): void {
  const body: WebVitalsMetric = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    timestamp: Date.now()
  }

  // Send to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Web vitals metric captured', { body })
  }

  // Send to analytics endpoint
  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    const url = '/api/monitoring/web-vitals'
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
    navigator.sendBeacon(url, blob)
  } else {
    // Fallback to fetch for browsers that don't support sendBeacon
    fetch('/api/monitoring/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(error => {
      logger.error('Failed to send web vitals:', error)
    })
  }
}

/**
 * Initialize Core Web Vitals tracking
 * Should be called once when the application loads
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    // Track Largest Contentful Paint (LCP)
    onLCP(sendToAnalytics)

    // Track Cumulative Layout Shift (CLS)
    onCLS(sendToAnalytics)

    // Track First Contentful Paint (FCP)
    onFCP(sendToAnalytics)

    // Track Time to First Byte (TTFB)
    onTTFB(sendToAnalytics)

    // Track Interaction to Next Paint (INP) - replaces deprecated FID
    onINP(sendToAnalytics)
  } catch (error) {
    logger.error('Failed to initialize web vitals tracking:', error)
  }
}

/**
 * Get current performance metrics
 * Useful for debugging and manual checks
 */
export function getPerformanceMetrics(): PerformanceEntry[] {
  if (typeof window === 'undefined' || !window.performance) {
    return []
  }

  return window.performance.getEntriesByType('navigation')
}

/**
 * Calculate performance score based on Core Web Vitals
 * Returns a score from 0-100
 */
export function calculatePerformanceScore(metrics: {
  lcp?: number
  fid?: number
  cls?: number
}): number {
  let score = 0
  let count = 0

  // LCP scoring (good: ≤2500ms, poor: >4000ms)
  if (metrics.lcp !== undefined) {
    if (metrics.lcp <= 2500) score += 100
    else if (metrics.lcp <= 4000) score += 50
    count++
  }

  // FID scoring (good: ≤100ms, poor: >300ms)
  if (metrics.fid !== undefined) {
    if (metrics.fid <= 100) score += 100
    else if (metrics.fid <= 300) score += 50
    count++
  }

  // CLS scoring (good: ≤0.1, poor: >0.25)
  if (metrics.cls !== undefined) {
    if (metrics.cls <= 0.1) score += 100
    else if (metrics.cls <= 0.25) score += 50
    count++
  }

  return count > 0 ? Math.round(score / count) : 0
}

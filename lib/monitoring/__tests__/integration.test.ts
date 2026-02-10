/**
 * Integration tests for monitoring system
 */

import { describe, it, expect, vi } from 'vitest'
import { initializeMonitoring } from '../index'
import { calculatePerformanceScore } from '../web-vitals'

describe('Monitoring Integration', () => {
  it('should initialize monitoring without errors in browser-like environment', () => {
    expect(() => {
      initializeMonitoring()
    }).not.toThrow()
  })

  it('should handle missing window gracefully', () => {
    // Simulate SSR-only context for this assertion without mutating globals permanently
    vi.stubGlobal('window', undefined)

    expect(() => {
      initializeMonitoring()
    }).not.toThrow()
    vi.unstubAllGlobals()
  })

  it('should calculate performance scores correctly', () => {
    // Excellent performance
    const excellentScore = calculatePerformanceScore({
      lcp: 2000,
      fid: 50,
      cls: 0.05
    })
    expect(excellentScore).toBe(100)

    // Poor performance
    const poorScore = calculatePerformanceScore({
      lcp: 5000,
      fid: 400,
      cls: 0.3
    })
    expect(poorScore).toBe(0)

    // Mixed performance
    const mixedScore = calculatePerformanceScore({
      lcp: 2000, // good
      fid: 400,  // poor
      cls: 0.05  // good
    })
    expect(mixedScore).toBeGreaterThan(0)
    expect(mixedScore).toBeLessThan(100)
  })

  it('should export all necessary functions', () => {
    expect(typeof initializeMonitoring).toBe('function')
    expect(typeof calculatePerformanceScore).toBe('function')
  })
})

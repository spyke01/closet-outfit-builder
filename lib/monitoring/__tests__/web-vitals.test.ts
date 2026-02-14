/**
 * Tests for Core Web Vitals tracking
 */

import { describe, it, expect } from 'vitest'
import { calculatePerformanceScore, getPerformanceMetrics } from '../web-vitals'

describe('Web Vitals Monitoring', () => {
  describe('calculatePerformanceScore', () => {
    it('should return 100 for excellent metrics', () => {
      const score = calculatePerformanceScore({
        lcp: 2000,
        fid: 50,
        cls: 0.05
      })
      expect(score).toBe(100)
    })

    it('should return 50 for needs-improvement metrics', () => {
      const score = calculatePerformanceScore({
        lcp: 3500,
        fid: 200,
        cls: 0.2
      })
      expect(score).toBe(50)
    })

    it('should return 0 for poor metrics', () => {
      const score = calculatePerformanceScore({
        lcp: 5000,
        fid: 400,
        cls: 0.3
      })
      expect(score).toBe(0)
    })

    it('should handle partial metrics', () => {
      const score = calculatePerformanceScore({
        lcp: 2000
      })
      expect(score).toBe(100)
    })

    it('should return 0 for empty metrics', () => {
      const score = calculatePerformanceScore({})
      expect(score).toBe(0)
    })

    it('should calculate average score for mixed metrics', () => {
      const score = calculatePerformanceScore({
        lcp: 2000, // good: 100
        fid: 400,  // poor: 0
        cls: 0.05  // good: 100
      })
      expect(score).toBe(67) // (100 + 0 + 100) / 3 = 66.67 rounded to 67
    })
  })

  describe('getPerformanceMetrics', () => {
    it('should return empty array in non-browser environment', () => {
      const metrics = getPerformanceMetrics()
      expect(Array.isArray(metrics)).toBe(true)
    })
  })
})

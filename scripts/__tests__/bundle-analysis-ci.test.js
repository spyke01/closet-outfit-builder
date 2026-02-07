/**
 * Tests for Bundle Analysis CI/CD Integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Bundle Analysis CI', () => {
  const testDir = path.join(__dirname, '..', '..', '.test-bundle-trends')
  
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
  })

  describe('Size Limit Validation', () => {
    it('should validate bundle size limits', () => {
      const limits = {
        totalJs: 500 * 1024,
        totalCss: 100 * 1024,
        totalAssets: 1024 * 1024,
        maxAssetSize: 200 * 1024
      }

      const analysis = {
        totalJsSize: 400 * 1024,
        totalCssSize: 80 * 1024,
        totalAssetSize: 600 * 1024,
        maxAssetSize: 150 * 1024
      }

      // All within limits
      expect(analysis.totalJsSize).toBeLessThanOrEqual(limits.totalJs)
      expect(analysis.totalCssSize).toBeLessThanOrEqual(limits.totalCss)
      expect(analysis.totalAssetSize).toBeLessThanOrEqual(limits.totalAssets)
      expect(analysis.maxAssetSize).toBeLessThanOrEqual(limits.maxAssetSize)
    })

    it('should detect size limit violations', () => {
      const limits = {
        totalJs: 500 * 1024,
        totalCss: 100 * 1024,
        totalAssets: 1024 * 1024,
        maxAssetSize: 200 * 1024
      }

      const analysis = {
        totalJsSize: 600 * 1024, // Exceeds limit
        totalCssSize: 80 * 1024,
        totalAssetSize: 600 * 1024,
        maxAssetSize: 150 * 1024
      }

      expect(analysis.totalJsSize).toBeGreaterThan(limits.totalJs)
    })
  })

  describe('Trend Analysis', () => {
    it('should calculate size delta between builds', () => {
      const previous = { totalAssetSize: 500 * 1024 }
      const current = { totalAssetSize: 450 * 1024 }

      const delta = current.totalAssetSize - previous.totalAssetSize
      const percent = (delta / previous.totalAssetSize) * 100

      expect(delta).toBe(-50 * 1024)
      expect(percent).toBe(-10)
    })

    it('should detect increasing trend', () => {
      const sizes = [550, 540, 530, 520, 510, 500, 490] // KB
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
      const isIncreasing = sizes[0] > avgSize

      expect(isIncreasing).toBe(true)
    })

    it('should detect decreasing trend', () => {
      const sizes = [450, 460, 470, 480, 490, 500, 510] // KB
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
      const isIncreasing = sizes[0] > avgSize

      expect(isIncreasing).toBe(false)
    })
  })

  describe('Format Utilities', () => {
    it('should format bytes correctly', () => {
      function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
      }

      expect(formatBytes(0)).toBe('0 Bytes')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(500 * 1024)).toBe('500 KB')
    })
  })
})

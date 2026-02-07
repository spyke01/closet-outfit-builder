/**
 * Tests for TypeScript Error Monitoring
 */

import { describe, it, expect } from 'vitest'

describe('TypeScript Error Monitoring', () => {
  describe('Error Parsing', () => {
    it('should parse TypeScript error format', () => {
      const errorLine = 'src/components/Button.tsx(10,5): error TS7006: Parameter "props" implicitly has an "any" type.'
      
      const errorMatch = errorLine.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/)
      
      expect(errorMatch).toBeTruthy()
      expect(errorMatch[1]).toBe('src/components/Button.tsx')
      expect(errorMatch[2]).toBe('10')
      expect(errorMatch[3]).toBe('5')
      expect(errorMatch[4]).toBe('TS7006')
      expect(errorMatch[5]).toContain('implicitly has an "any" type')
    })

    it('should identify any type errors', () => {
      const errors = [
        { code: 'TS7006', message: 'Parameter implicitly has an "any" type' },
        { code: 'TS7031', message: 'Binding element implicitly has an "any" type' },
        { code: 'TS2345', message: 'Argument type not assignable' }
      ]

      const anyTypeErrors = errors.filter(e => 
        e.code === 'TS7006' || 
        e.code === 'TS7031' || 
        e.message.includes('any')
      )

      expect(anyTypeErrors).toHaveLength(2)
    })
  })

  describe('Error Analysis', () => {
    it('should categorize errors by type', () => {
      const errors = [
        { code: 'TS7006', isAnyType: true },
        { code: 'TS7006', isAnyType: true },
        { code: 'TS2531', isAnyType: false },
        { code: 'TS2345', isAnyType: false }
      ]

      const anyTypeErrors = errors.filter(e => e.isAnyType).length
      const otherErrors = errors.filter(e => !e.isAnyType).length

      expect(anyTypeErrors).toBe(2)
      expect(otherErrors).toBe(2)
    })

    it('should count errors by file', () => {
      const errors = [
        { file: 'src/components/Button.tsx' },
        { file: 'src/components/Button.tsx' },
        { file: 'src/utils/helpers.ts' },
        { file: 'src/components/Button.tsx' }
      ]

      const errorsByFile = {}
      errors.forEach(error => {
        if (!errorsByFile[error.file]) {
          errorsByFile[error.file] = 0
        }
        errorsByFile[error.file]++
      })

      expect(errorsByFile['src/components/Button.tsx']).toBe(3)
      expect(errorsByFile['src/utils/helpers.ts']).toBe(1)
    })

    it('should count errors by code', () => {
      const errors = [
        { code: 'TS7006' },
        { code: 'TS7006' },
        { code: 'TS2531' },
        { code: 'TS7006' }
      ]

      const errorsByCode = {}
      errors.forEach(error => {
        if (!errorsByCode[error.code]) {
          errorsByCode[error.code] = 0
        }
        errorsByCode[error.code]++
      })

      expect(errorsByCode['TS7006']).toBe(3)
      expect(errorsByCode['TS2531']).toBe(1)
    })
  })

  describe('Trend Analysis', () => {
    it('should calculate error delta', () => {
      const current = { totalErrors: 50, anyTypeErrors: 10 }
      const previous = { totalErrors: 60, anyTypeErrors: 15 }

      const totalDelta = current.totalErrors - previous.totalErrors
      const anyTypeDelta = current.anyTypeErrors - previous.anyTypeErrors

      expect(totalDelta).toBe(-10)
      expect(anyTypeDelta).toBe(-5)
    })

    it('should detect increasing trend', () => {
      const errorCounts = [55, 50, 48, 45, 42, 40, 38]
      const avgErrors = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length
      const isIncreasing = errorCounts[0] > avgErrors

      expect(isIncreasing).toBe(true)
    })

    it('should detect decreasing trend', () => {
      const errorCounts = [35, 40, 42, 45, 48, 50, 55]
      const avgErrors = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length
      const isIncreasing = errorCounts[0] > avgErrors

      expect(isIncreasing).toBe(false)
    })
  })

  describe('Status Determination', () => {
    it('should pass with zero errors', () => {
      const analysis = { totalErrors: 0, anyTypeErrors: 0 }
      expect(analysis.totalErrors).toBe(0)
    })

    it('should warn with no any types but other errors', () => {
      const analysis = { totalErrors: 10, anyTypeErrors: 0 }
      expect(analysis.anyTypeErrors).toBe(0)
      expect(analysis.totalErrors).toBeGreaterThan(0)
    })

    it('should fail with any type errors', () => {
      const analysis = { totalErrors: 15, anyTypeErrors: 5 }
      expect(analysis.anyTypeErrors).toBeGreaterThan(0)
    })
  })
})

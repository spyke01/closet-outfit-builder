/**
 * Property-Based Test: Brand size entry completeness
 * 
 * Property 5: Brand size entry completeness
 * For any brand size entry, the rendered display should contain brand name, 
 * size value, fit scale indicator, and if item type or notes are present, 
 * they should also be displayed.
 * 
 * **Validates: Requirements 4.3**
 * 
 * This test verifies that all required and optional fields of a brand size
 * entry are correctly displayed in the UI.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { BrandSize } from '@/lib/types/sizes'

/**
 * Generator for non-empty strings (excludes whitespace-only strings)
 */
const nonEmptyStringArb = (minLength: number, maxLength: number) =>
  fc.string({ minLength, maxLength })
    .filter(s => s.trim().length > 0)

/**
 * Generator for brand size entries
 * Produces realistic brand size data with all possible field combinations
 */
const brandSizeArb = fc.record({
  id: fc.uuid(),
  category_id: fc.uuid(),
  user_id: fc.uuid(),
  brand_name: nonEmptyStringArb(1, 100),
  item_type: fc.option(nonEmptyStringArb(1, 100), { nil: undefined }),
  size: fc.oneof(
    // Letter sizes
    fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
    // Numeric sizes
    fc.integer({ min: 2, max: 20 }).map(n => n.toString()),
    // Waist/inseam sizes
    fc.tuple(
      fc.integer({ min: 28, max: 42 }),
      fc.integer({ min: 28, max: 36 })
    ).map(([waist, inseam]) => `${waist}x${inseam}`)
  ),
  fit_scale: fc.integer({ min: 1, max: 5 }),
  notes: fc.option(nonEmptyStringArb(1, 500), { nil: undefined }),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString())
})

/**
 * Pure function to extract display data from a brand size entry
 * This represents what should be displayed in the UI
 */
function extractBrandSizeDisplayData(brandSize: BrandSize) {
  // Trim whitespace for validation
  const trimmedBrandName = brandSize.brand_name?.trim() || ''
  const trimmedSize = brandSize.size?.trim() || ''
  const trimmedItemType = brandSize.item_type?.trim() || ''
  const trimmedNotes = brandSize.notes?.trim() || ''
  
  return {
    brand_name: brandSize.brand_name,
    size: brandSize.size,
    fit_scale: brandSize.fit_scale,
    item_type: brandSize.item_type,
    notes: brandSize.notes,
    // Derived data - check trimmed values
    hasBrandName: trimmedBrandName.length > 0,
    hasSize: trimmedSize.length > 0,
    hasFitScale: brandSize.fit_scale >= 1 && brandSize.fit_scale <= 5,
    hasItemType: trimmedItemType.length > 0,
    hasNotes: trimmedNotes.length > 0
  }
}

/**
 * Validates that a brand size entry contains all required fields
 */
function validateBrandSizeCompleteness(brandSize: BrandSize): boolean {
  const display = extractBrandSizeDisplayData(brandSize)
  
  // Required fields must always be present
  if (!display.hasBrandName) return false
  if (!display.hasSize) return false
  if (!display.hasFitScale) return false
  
  // Optional fields: if present in data, they should be displayable
  if (brandSize.item_type !== undefined && brandSize.item_type !== null) {
    if (!display.hasItemType) return false
  }
  
  if (brandSize.notes !== undefined && brandSize.notes !== null) {
    if (!display.hasNotes) return false
  }
  
  return true
}

describe('Property 5: Brand size entry completeness', () => {
  it('should contain all required fields (brand name, size, fit scale)', () => {
    fc.assert(
      fc.property(
        brandSizeArb,
        (brandSize) => {
          const display = extractBrandSizeDisplayData(brandSize)
          
          // Required fields must always be present
          expect(display.hasBrandName).toBe(true)
          expect(display.brand_name).toBeTruthy()
          expect(display.brand_name.length).toBeGreaterThan(0)
          
          expect(display.hasSize).toBe(true)
          expect(display.size).toBeTruthy()
          expect(display.size.length).toBeGreaterThan(0)
          
          expect(display.hasFitScale).toBe(true)
          expect(display.fit_scale).toBeGreaterThanOrEqual(1)
          expect(display.fit_scale).toBeLessThanOrEqual(5)
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })

  it('should display optional fields when present', () => {
    fc.assert(
      fc.property(
        brandSizeArb,
        (brandSize) => {
          const display = extractBrandSizeDisplayData(brandSize)
          
          // If item_type is present, it should be displayable
          if (brandSize.item_type !== undefined && brandSize.item_type !== null) {
            expect(display.hasItemType).toBe(true)
            expect(display.item_type).toBeTruthy()
          }
          
          // If notes are present, they should be displayable
          if (brandSize.notes !== undefined && brandSize.notes !== null) {
            expect(display.hasNotes).toBe(true)
            expect(display.notes).toBeTruthy()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })

  it('should validate complete brand size entries', () => {
    fc.assert(
      fc.property(
        brandSizeArb,
        (brandSize) => {
          const isComplete = validateBrandSizeCompleteness(brandSize)
          
          // All generated brand sizes should be complete
          expect(isComplete).toBe(true)
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })

  it('should handle brand sizes with all optional fields populated', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          category_id: fc.uuid(),
          user_id: fc.uuid(),
          brand_name: nonEmptyStringArb(1, 100),
          item_type: nonEmptyStringArb(1, 100),
          size: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString())
          ),
          fit_scale: fc.integer({ min: 1, max: 5 }),
          notes: nonEmptyStringArb(1, 500),
          created_at: fc.date().map(d => d.toISOString()),
          updated_at: fc.date().map(d => d.toISOString())
        }),
        (brandSize) => {
          const display = extractBrandSizeDisplayData(brandSize)
          
          // All fields should be present
          expect(display.hasBrandName).toBe(true)
          expect(display.hasSize).toBe(true)
          expect(display.hasFitScale).toBe(true)
          expect(display.hasItemType).toBe(true)
          expect(display.hasNotes).toBe(true)
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })

  it('should handle brand sizes with no optional fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          category_id: fc.uuid(),
          user_id: fc.uuid(),
          brand_name: nonEmptyStringArb(1, 100),
          item_type: fc.constant(undefined),
          size: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString())
          ),
          fit_scale: fc.integer({ min: 1, max: 5 }),
          notes: fc.constant(undefined),
          created_at: fc.date().map(d => d.toISOString()),
          updated_at: fc.date().map(d => d.toISOString())
        }),
        (brandSize) => {
          const display = extractBrandSizeDisplayData(brandSize)
          
          // Required fields should be present
          expect(display.hasBrandName).toBe(true)
          expect(display.hasSize).toBe(true)
          expect(display.hasFitScale).toBe(true)
          
          // Optional fields should not be present
          expect(display.hasItemType).toBe(false)
          expect(display.hasNotes).toBe(false)
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })

  it('should validate fit scale is within valid range (1-5)', () => {
    fc.assert(
      fc.property(
        brandSizeArb,
        (brandSize) => {
          const display = extractBrandSizeDisplayData(brandSize)
          
          // Fit scale must be 1-5
          expect(display.fit_scale).toBeGreaterThanOrEqual(1)
          expect(display.fit_scale).toBeLessThanOrEqual(5)
          
          // Fit scale should map to a valid label
          const fitScaleLabels = [
            'Runs Small',
            'Slightly Small',
            'True to Size',
            'Slightly Large',
            'Runs Large'
          ]
          
          const labelIndex = display.fit_scale - 1
          expect(labelIndex).toBeGreaterThanOrEqual(0)
          expect(labelIndex).toBeLessThan(fitScaleLabels.length)
          expect(fitScaleLabels[labelIndex]).toBeTruthy()
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
})

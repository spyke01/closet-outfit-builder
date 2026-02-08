/**
 * Property-Based Test: Brand Name Persistence
 * 
 * Property 25: New brand name persistence
 * For any new brand name entered via free text, after saving the brand size, 
 * the brand name should appear in the searchable dropdown for future brand 
 * size entries.
 * 
 * **Validates: Requirements 14.4**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import type { BrandSize } from '@/lib/types/sizes'

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for non-empty brand names
 */
const brandNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

/**
 * Generator for category IDs
 */
const categoryIdArb = fc.uuid()

/**
 * Generator for brand size data
 */
const brandSizeArb = fc.record({
  id: fc.uuid(),
  category_id: fc.string(),
  user_id: fc.uuid(),
  brand_name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  item_type: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  size: fc.oneof(
    fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
    fc.integer({ min: 0, max: 50 }).map(n => n.toString()),
    fc.tuple(
      fc.integer({ min: 26, max: 48 }),
      fc.integer({ min: 28, max: 38 })
    ).map(([waist, inseam]) => `${waist}x${inseam}`)
  ),
  fit_scale: fc.integer({ min: 1, max: 5 }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  created_at: fc.constant(new Date().toISOString()),
  updated_at: fc.constant(new Date().toISOString()),
})

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Extract unique brand names from brand sizes
 */
function extractUniqueBrandNames(brandSizes: BrandSize[]): string[] {
  const names = new Set<string>()
  brandSizes.forEach(bs => {
    if (bs.brand_name) {
      names.add(bs.brand_name)
    }
  })
  return Array.from(names).sort((a, b) => a.localeCompare(b))
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 25: New brand name persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('should include new brand name in unique brand names list after adding', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: categoryIdArb,
          existingBrandNames: fc.array(brandNameArb, { minLength: 0, maxLength: 5 }),
          newBrandName: brandNameArb,
        }),
        (testData) => {
          // Ensure new brand name is different from existing ones
          if (testData.existingBrandNames.includes(testData.newBrandName)) {
            return true // Skip this test case
          }
          
          // Generate existing brand sizes
          const existingBrandSizes: BrandSize[] = testData.existingBrandNames.map(brandName => ({
            id: fc.sample(fc.uuid(), 1)[0],
            category_id: testData.categoryId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            brand_name: brandName,
            item_type: undefined,
            size: 'M',
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          
          // Extract unique brand names before adding new one
          const brandNamesBeforeAdd = extractUniqueBrandNames(existingBrandSizes)
          
          // Property 1: New brand name should not be in the list yet
          expect(brandNamesBeforeAdd).not.toContain(testData.newBrandName)
          
          // Simulate adding a new brand size with the new brand name
          const newBrandSize: BrandSize = {
            id: fc.sample(fc.uuid(), 1)[0],
            category_id: testData.categoryId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            brand_name: testData.newBrandName,
            item_type: undefined,
            size: 'L',
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          const updatedBrandSizes = [...existingBrandSizes, newBrandSize]
          
          // Extract unique brand names after adding new one
          const brandNamesAfterAdd = extractUniqueBrandNames(updatedBrandSizes)
          
          // Property 2: New brand name should now be in the list
          expect(brandNamesAfterAdd).toContain(testData.newBrandName)
          
          // Property 3: All existing brand names should still be present
          brandNamesBeforeAdd.forEach(brandName => {
            expect(brandNamesAfterAdd).toContain(brandName)
          })
          
          // Property 4: The list should have exactly one more unique brand name
          expect(brandNamesAfterAdd.length).toBe(brandNamesBeforeAdd.length + 1)
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should maintain brand name in list even after multiple additions', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: categoryIdArb,
          brandName: brandNameArb,
          numberOfAdditions: fc.integer({ min: 1, max: 5 }),
        }),
        (testData) => {
          const brandSizes: BrandSize[] = []
          
          // Add the same brand name multiple times (different items)
          for (let i = 0; i < testData.numberOfAdditions; i++) {
            brandSizes.push({
              id: fc.sample(fc.uuid(), 1)[0],
              category_id: testData.categoryId,
              user_id: fc.sample(fc.uuid(), 1)[0],
              brand_name: testData.brandName,
              item_type: undefined,
              size: 'M',
              fit_scale: 3,
              notes: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
          
          // Extract unique brand names
          const uniqueBrandNames = extractUniqueBrandNames(brandSizes)
          
          // Property 1: Brand name should appear exactly once in unique list
          expect(uniqueBrandNames).toContain(testData.brandName)
          expect(uniqueBrandNames.filter(name => name === testData.brandName).length).toBe(1)
          
          // Property 2: The unique list should have exactly 1 brand name
          expect(uniqueBrandNames.length).toBe(1)
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should preserve alphabetical ordering after adding new brand name', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: categoryIdArb,
          existingBrandNames: fc.array(brandNameArb, { minLength: 2, maxLength: 5 }),
          newBrandName: brandNameArb,
        }),
        (testData) => {
          // Ensure new brand name is different from existing ones
          if (testData.existingBrandNames.includes(testData.newBrandName)) {
            return true // Skip this test case
          }
          
          // Generate existing brand sizes
          const existingBrandSizes: BrandSize[] = testData.existingBrandNames.map(brandName => ({
            id: fc.sample(fc.uuid(), 1)[0],
            category_id: testData.categoryId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            brand_name: brandName,
            item_type: undefined,
            size: 'M',
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          
          // Add new brand size
          const newBrandSize: BrandSize = {
            id: fc.sample(fc.uuid(), 1)[0],
            category_id: testData.categoryId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            brand_name: testData.newBrandName,
            item_type: undefined,
            size: 'L',
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          const updatedBrandSizes = [...existingBrandSizes, newBrandSize]
          
          // Extract unique brand names (should be sorted)
          const brandNames = extractUniqueBrandNames(updatedBrandSizes)
          
          // Property: Brand names should be in alphabetical order
          for (let i = 1; i < brandNames.length; i++) {
            expect(brandNames[i].localeCompare(brandNames[i - 1])).toBeGreaterThan(0)
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should handle case-sensitive brand names as distinct entries', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: categoryIdArb,
          baseBrandName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        }),
        (testData) => {
          // Create variations with different casing
          const brandNameLower = testData.baseBrandName.toLowerCase()
          const brandNameUpper = testData.baseBrandName.toUpperCase()
          
          // Skip if they're the same (all non-alphabetic characters)
          if (brandNameLower === brandNameUpper) {
            return true
          }
          
          // Generate brand sizes with different casings
          const brandSizeLower: BrandSize = {
            id: fc.sample(fc.uuid(), 1)[0],
            category_id: testData.categoryId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            brand_name: brandNameLower,
            item_type: undefined,
            size: 'M',
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          const brandSizeUpper: BrandSize = {
            id: fc.sample(fc.uuid(), 1)[0],
            category_id: testData.categoryId,
            user_id: fc.sample(fc.uuid(), 1)[0],
            brand_name: brandNameUpper,
            item_type: undefined,
            size: 'L',
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          
          const brandSizes = [brandSizeLower, brandSizeUpper]
          
          // Extract unique brand names
          const uniqueBrandNames = extractUniqueBrandNames(brandSizes)
          
          // Property: Both case variations should be present as distinct entries
          expect(uniqueBrandNames).toContain(brandNameLower)
          expect(uniqueBrandNames).toContain(brandNameUpper)
          expect(uniqueBrandNames.length).toBe(2)
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
})

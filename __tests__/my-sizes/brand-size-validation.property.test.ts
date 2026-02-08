/**
 * Property-Based Test: Brand Size Validation
 * 
 * Property 8: Brand size validation
 * For any brand size submission, the system should reject entries missing 
 * brand_name or size fields, and should accept entries with or without 
 * optional item_type and notes fields.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.4**
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { brandSizeInputSchema } from '@/lib/schemas/sizes'

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for non-empty strings with length constraints
 */
const nonEmptyStringArb = (minLength: number, maxLength: number) =>
  fc.string({ minLength, maxLength }).filter(s => s.trim().length > 0)

/**
 * Generator for valid size values (letter, numeric, or waist/inseam format)
 */
const validSizeArb = fc.oneof(
  // Letter sizes
  fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'),
  // Numeric sizes
  fc.integer({ min: 0, max: 50 }).map(n => n.toString()),
  // Waist/inseam sizes
  fc.tuple(
    fc.integer({ min: 26, max: 48 }),
    fc.integer({ min: 28, max: 38 })
  ).map(([waist, inseam]) => `${waist}x${inseam}`)
)

/**
 * Generator for valid fit scale values (1-5)
 */
const validFitScaleArb = fc.integer({ min: 1, max: 5 })

/**
 * Generator for valid brand size input with all required fields
 */
const validBrandSizeInputArb = fc.record({
  category_id: fc.uuid(),
  brand_name: nonEmptyStringArb(1, 100),
  item_type: fc.option(nonEmptyStringArb(1, 100), { nil: undefined }),
  size: validSizeArb,
  fit_scale: validFitScaleArb,
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
})

/**
 * Generator for brand size input missing brand_name
 */
const missingBrandNameArb = fc.record({
  category_id: fc.uuid(),
  brand_name: fc.constantFrom('', '   ', undefined as any),
  item_type: fc.option(nonEmptyStringArb(1, 100), { nil: undefined }),
  size: validSizeArb,
  fit_scale: validFitScaleArb,
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
})

/**
 * Generator for brand size input missing size
 */
const missingSizeArb = fc.record({
  category_id: fc.uuid(),
  brand_name: nonEmptyStringArb(1, 100),
  item_type: fc.option(nonEmptyStringArb(1, 100), { nil: undefined }),
  size: fc.constantFrom('', '   ', undefined as any),
  fit_scale: validFitScaleArb,
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
})

/**
 * Generator for brand size input with invalid fit_scale
 */
const invalidFitScaleArb = fc.record({
  category_id: fc.uuid(),
  brand_name: nonEmptyStringArb(1, 100),
  item_type: fc.option(nonEmptyStringArb(1, 100), { nil: undefined }),
  size: validSizeArb,
  fit_scale: fc.oneof(
    fc.integer({ max: 0 }),
    fc.integer({ min: 6 }),
    fc.constant(null as any),
    fc.constant(undefined as any)
  ),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
})

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 8: Brand size validation', () => {
  it('should accept valid brand size input with all required fields', () => {
    fc.assert(
      fc.property(
        validBrandSizeInputArb,
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Valid input should pass validation
          expect(result.success).toBe(true)
          
          if (result.success) {
            // Verify required fields are present
            expect(result.data.brand_name).toBeTruthy()
            expect(result.data.brand_name.length).toBeGreaterThan(0)
            expect(result.data.size).toBeTruthy()
            expect(result.data.size.length).toBeGreaterThan(0)
            expect(result.data.fit_scale).toBeGreaterThanOrEqual(1)
            expect(result.data.fit_scale).toBeLessThanOrEqual(5)
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should accept brand size input with optional fields omitted', () => {
    fc.assert(
      fc.property(
        fc.record({
          category_id: fc.uuid(),
          brand_name: nonEmptyStringArb(1, 100),
          size: validSizeArb,
          fit_scale: validFitScaleArb,
          // Omit optional fields
        }),
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Input without optional fields should pass validation
          expect(result.success).toBe(true)
          
          if (result.success) {
            // Verify required fields are present
            expect(result.data.brand_name).toBeTruthy()
            expect(result.data.size).toBeTruthy()
            expect(result.data.fit_scale).toBeGreaterThanOrEqual(1)
            expect(result.data.fit_scale).toBeLessThanOrEqual(5)
            
            // Optional fields should be undefined or empty
            expect(result.data.item_type).toBeUndefined()
            expect(result.data.notes).toBeUndefined()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should accept brand size input with optional fields present', () => {
    fc.assert(
      fc.property(
        fc.record({
          category_id: fc.uuid(),
          brand_name: nonEmptyStringArb(1, 100),
          item_type: nonEmptyStringArb(1, 100),
          size: validSizeArb,
          fit_scale: validFitScaleArb,
          notes: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Input with optional fields should pass validation
          expect(result.success).toBe(true)
          
          if (result.success) {
            // Verify all fields are present
            expect(result.data.brand_name).toBeTruthy()
            expect(result.data.size).toBeTruthy()
            expect(result.data.fit_scale).toBeGreaterThanOrEqual(1)
            expect(result.data.fit_scale).toBeLessThanOrEqual(5)
            expect(result.data.item_type).toBeTruthy()
            expect(result.data.notes).toBeTruthy()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should reject brand size input missing brand_name', () => {
    fc.assert(
      fc.property(
        missingBrandNameArb,
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Input missing brand_name should fail validation
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Verify error is about brand_name
            const brandNameError = result.error.issues.find(
              (err) => err.path.includes('brand_name')
            )
            expect(brandNameError).toBeDefined()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should reject brand size input missing size', () => {
    fc.assert(
      fc.property(
        missingSizeArb,
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Input missing size should fail validation
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Verify error is about size
            const sizeError = result.error.issues.find(
              (err) => err.path.includes('size')
            )
            expect(sizeError).toBeDefined()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should reject brand size input with invalid fit_scale', () => {
    fc.assert(
      fc.property(
        invalidFitScaleArb,
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Input with invalid fit_scale should fail validation
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Verify error is about fit_scale
            const fitScaleError = result.error.issues.find(
              (err) => err.path.includes('fit_scale')
            )
            expect(fitScaleError).toBeDefined()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should reject brand size input with brand_name exceeding max length', () => {
    fc.assert(
      fc.property(
        fc.record({
          category_id: fc.uuid(),
          brand_name: fc.string({ minLength: 101, maxLength: 200 }),
          size: validSizeArb,
          fit_scale: validFitScaleArb,
        }),
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Input with brand_name > 100 chars should fail validation
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Verify error is about brand_name length
            const brandNameError = result.error.issues.find(
              (err) => err.path.includes('brand_name')
            )
            expect(brandNameError).toBeDefined()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
  
  it('should reject brand size input with notes exceeding max length', () => {
    fc.assert(
      fc.property(
        fc.record({
          category_id: fc.uuid(),
          brand_name: nonEmptyStringArb(1, 100),
          size: validSizeArb,
          fit_scale: validFitScaleArb,
          notes: fc.string({ minLength: 501, maxLength: 1000 }),
        }),
        (input) => {
          // Attempt to validate with Zod schema
          const result = brandSizeInputSchema.safeParse(input)
          
          // Property: Input with notes > 500 chars should fail validation
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Verify error is about notes length
            const notesError = result.error.issues.find(
              (err) => err.path.includes('notes')
            )
            expect(notesError).toBeDefined()
          }
          
          return true
        }
      ),
      { numRuns: 5 }
    )
  })
})

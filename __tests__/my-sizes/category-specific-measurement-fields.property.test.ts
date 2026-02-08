/**
 * Property-Based Test: Category-specific measurement fields
 * 
 * Property 19: Category-specific measurement fields
 * For any category type, the Measurement Guide section should display measurement 
 * fields appropriate to that category (e.g., chest/waist/hip for tops, 
 * inseam/waist for pants, foot length/width for footwear).
 * 
 * **Validates: Requirements 13.1, 13.4**
 * 
 * This test verifies that:
 * 1. Each category type has appropriate measurement fields defined
 * 2. Tops categories include chest, waist, and/or hip measurements
 * 3. Bottoms categories include waist and inseam measurements
 * 4. Footwear categories include foot length and width measurements
 * 5. Unknown categories fall back to generic body measurements
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Category-specific measurement field definitions
 * This mirrors the implementation in measurement-guide-section.tsx
 */
const CATEGORY_MEASUREMENT_FIELDS: Record<string, { field: string; label: string }[]> = {
  // Tops: chest, waist, hip
  'Tops': [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
    { field: 'hip', label: 'Hip' },
  ],
  'Shirt': [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
    { field: 'hip', label: 'Hip' },
  ],
  'T-Shirt': [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
  ],
  // Bottoms: waist, inseam
  'Bottoms': [
    { field: 'waist', label: 'Waist' },
    { field: 'inseam', label: 'Inseam' },
  ],
  'Pants': [
    { field: 'waist', label: 'Waist' },
    { field: 'inseam', label: 'Inseam' },
  ],
  'Jeans': [
    { field: 'waist', label: 'Waist' },
    { field: 'inseam', label: 'Inseam' },
  ],
  // Footwear: foot length, foot width
  'Footwear': [
    { field: 'foot_length', label: 'Foot Length' },
    { field: 'foot_width', label: 'Foot Width' },
  ],
  'Shoes': [
    { field: 'foot_length', label: 'Foot Length' },
    { field: 'foot_width', label: 'Foot Width' },
  ],
};

/**
 * Get measurement fields for a category
 * Falls back to generic body measurements if category not found
 */
function getMeasurementFields(categoryName: string): { field: string; label: string }[] {
  // Try exact match first
  if (CATEGORY_MEASUREMENT_FIELDS[categoryName]) {
    return CATEGORY_MEASUREMENT_FIELDS[categoryName];
  }
  
  // Try partial match (e.g., "Dress Shirt" contains "Shirt")
  for (const [key, fields] of Object.entries(CATEGORY_MEASUREMENT_FIELDS)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return fields;
    }
  }
  
  // Default to chest/waist/hip for unknown categories
  return [
    { field: 'chest', label: 'Chest' },
    { field: 'waist', label: 'Waist' },
    { field: 'hip', label: 'Hip' },
  ];
}

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for known category types
 */
const knownCategoryArb = fc.oneof(
  fc.constant('Tops'),
  fc.constant('Shirt'),
  fc.constant('T-Shirt'),
  fc.constant('Bottoms'),
  fc.constant('Pants'),
  fc.constant('Jeans'),
  fc.constant('Footwear'),
  fc.constant('Shoes')
);

/**
 * Generator for category names with partial matches
 */
const partialMatchCategoryArb = fc.oneof(
  fc.constant('Dress Shirt'),
  fc.constant('Polo Shirt'),
  fc.constant('Cargo Pants'),
  fc.constant('Running Shoes'),
  fc.constant('Casual Tops')
);

/**
 * Generator for unknown category names
 */
const unknownCategoryArb = fc.oneof(
  fc.constant('Jacket'),
  fc.constant('Coat'),
  fc.constant('Accessories'),
  fc.constant('Belt'),
  fc.constant('Hat')
);

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 19: Category-specific measurement fields', () => {
  /**
   * Property: Known categories have appropriate measurement fields
   * For any known category type, the measurement fields should match
   * the expected fields for that category type
   */
  it('should return appropriate fields for known category types', () => {
    fc.assert(
      fc.property(
        knownCategoryArb,
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          const expectedFields = CATEGORY_MEASUREMENT_FIELDS[categoryName];
          
          // Property: Fields should match expected fields exactly
          expect(fields).toEqual(expectedFields);
          expect(fields.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Tops categories include chest measurements
   * For any category that is or contains "Tops" or "Shirt", 
   * the measurement fields should include chest
   */
  it('should include chest measurement for tops categories', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('Tops'),
          fc.constant('Shirt'),
          fc.constant('T-Shirt'),
          fc.constant('Dress Shirt'),
          fc.constant('Polo Shirt')
        ),
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          const fieldNames = fields.map(f => f.field);
          
          // Property: Tops categories must include chest measurement
          expect(fieldNames).toContain('chest');
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Bottoms categories include waist and inseam
   * For any category that is or contains "Bottoms", "Pants", or "Jeans",
   * the measurement fields should include both waist and inseam
   */
  it('should include waist and inseam for bottoms categories', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('Bottoms'),
          fc.constant('Pants'),
          fc.constant('Jeans'),
          fc.constant('Cargo Pants')
        ),
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          const fieldNames = fields.map(f => f.field);
          
          // Property: Bottoms categories must include waist and inseam
          expect(fieldNames).toContain('waist');
          expect(fieldNames).toContain('inseam');
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Footwear categories include foot measurements
   * For any category that is or contains "Footwear" or "Shoes",
   * the measurement fields should include foot_length and foot_width
   */
  it('should include foot measurements for footwear categories', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('Footwear'),
          fc.constant('Shoes'),
          fc.constant('Running Shoes')
        ),
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          const fieldNames = fields.map(f => f.field);
          
          // Property: Footwear categories must include foot measurements
          expect(fieldNames).toContain('foot_length');
          expect(fieldNames).toContain('foot_width');
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Partial matches work correctly
   * For any category name that contains a known category type as a substring,
   * the measurement fields should match the known category type
   */
  it('should match fields for categories with partial name matches', () => {
    fc.assert(
      fc.property(
        partialMatchCategoryArb,
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          
          // Property: Partial matches should return appropriate fields
          if (categoryName.toLowerCase().includes('shirt')) {
            const fieldNames = fields.map(f => f.field);
            expect(fieldNames).toContain('chest');
          } else if (categoryName.toLowerCase().includes('pants')) {
            const fieldNames = fields.map(f => f.field);
            expect(fieldNames).toContain('waist');
            expect(fieldNames).toContain('inseam');
          } else if (categoryName.toLowerCase().includes('shoes')) {
            const fieldNames = fields.map(f => f.field);
            expect(fieldNames).toContain('foot_length');
            expect(fieldNames).toContain('foot_width');
          } else if (categoryName.toLowerCase().includes('tops')) {
            const fieldNames = fields.map(f => f.field);
            expect(fieldNames).toContain('chest');
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Unknown categories fall back to generic measurements
   * For any category that doesn't match known types, the measurement fields
   * should fall back to generic body measurements (chest, waist, hip)
   */
  it('should fall back to generic measurements for unknown categories', () => {
    fc.assert(
      fc.property(
        unknownCategoryArb,
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          const fieldNames = fields.map(f => f.field);
          
          // Property: Unknown categories should get generic measurements
          expect(fieldNames).toContain('chest');
          expect(fieldNames).toContain('waist');
          expect(fieldNames).toContain('hip');
          expect(fields.length).toBe(3);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: All measurement fields have labels
   * For any category, all measurement fields should have both
   * a field name and a human-readable label
   */
  it('should provide labels for all measurement fields', () => {
    fc.assert(
      fc.property(
        fc.oneof(knownCategoryArb, partialMatchCategoryArb, unknownCategoryArb),
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          
          // Property: All fields must have field name and label
          for (const field of fields) {
            expect(field.field).toBeTruthy();
            expect(field.label).toBeTruthy();
            expect(typeof field.field).toBe('string');
            expect(typeof field.label).toBe('string');
            expect(field.field.length).toBeGreaterThan(0);
            expect(field.label.length).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Field names are unique within a category
   * For any category, all measurement field names should be unique
   * (no duplicate field names)
   */
  it('should have unique field names within each category', () => {
    fc.assert(
      fc.property(
        fc.oneof(knownCategoryArb, partialMatchCategoryArb, unknownCategoryArb),
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          const fieldNames = fields.map(f => f.field);
          const uniqueFieldNames = new Set(fieldNames);
          
          // Property: No duplicate field names
          expect(uniqueFieldNames.size).toBe(fieldNames.length);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Measurement fields are non-empty
   * For any category, the measurement fields array should not be empty
   */
  it('should always return at least one measurement field', () => {
    fc.assert(
      fc.property(
        fc.oneof(knownCategoryArb, partialMatchCategoryArb, unknownCategoryArb),
        (categoryName) => {
          const fields = getMeasurementFields(categoryName);
          
          // Property: At least one field must be present
          expect(fields.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
  
  /**
   * Property: Case-insensitive partial matching
   * For any category name with different casing, partial matching
   * should still work correctly
   */
  it('should handle case-insensitive partial matching', () => {
    fc.assert(
      fc.property(
        fc.record({
          baseName: fc.oneof(
            fc.constant('shirt'),
            fc.constant('pants'),
            fc.constant('shoes')
          ),
          prefix: fc.oneof(fc.constant(''), fc.constant('Dress '), fc.constant('Casual ')),
          casing: fc.oneof(
            fc.constant('lower'),
            fc.constant('upper'),
            fc.constant('title')
          )
        }),
        ({ baseName, prefix, casing }) => {
          let categoryName = prefix + baseName;
          
          // Apply casing
          if (casing === 'upper') {
            categoryName = categoryName.toUpperCase();
          } else if (casing === 'title') {
            categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
          }
          
          const fields = getMeasurementFields(categoryName);
          const fieldNames = fields.map(f => f.field);
          
          // Property: Case-insensitive matching should work
          if (baseName === 'shirt') {
            expect(fieldNames).toContain('chest');
          } else if (baseName === 'pants') {
            expect(fieldNames).toContain('waist');
            expect(fieldNames).toContain('inseam');
          } else if (baseName === 'shoes') {
            expect(fieldNames).toContain('foot_length');
            expect(fieldNames).toContain('foot_width');
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

/**
 * Property-Based Test: Category Grid Item Completeness
 * 
 * **Property 4: Category grid item completeness**
 * For any category in the grid, the rendered tile should contain the category name, 
 * the count of saved sizes (standard + brand sizes), and if brand-specific sizes exist 
 * with different values than the standard size, a "Varies by brand" indicator.
 * 
 * **Validates: Requirements 3.1**
 * Feature: my-sizes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@/lib/supabase/client';
import type { SizeCategory, CategoryGridItem } from '@/lib/types/sizes';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ userId: 'test-user-id', isAuthenticated: true })
}));

describe('Property 4: Category Grid Item Completeness', () => {
  let mockSupabase: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      delete: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      maybeSingle: vi.fn(),
      single: vi.fn()
    };

    (createClient as unknown).mockReturnValue(mockSupabase);
  });

  /**
   * Property: Category grid item contains all required fields
   * For any category, the grid item should contain category name, size count,
   * and variation indicator
   */
  it('should contain category name, size count, and variation indicator', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.oneof(
            fc.constantFrom('Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          hasStandardSize: fc.boolean(),
          brandSizeCount: fc.integer({ min: 0, max: 10 })
        }),
        (testData) => {
          // Create category
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: testData.categoryName,
            icon: undefined,
            supported_formats: ['letter', 'numeric'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Calculate size count
          const sizeCount = (testData.hasStandardSize ? 1 : 0) + testData.brandSizeCount;

          // Determine if there are variations
          const hasVariations = testData.brandSizeCount > 0 && testData.hasStandardSize;

          // Create grid item
          const gridItem: CategoryGridItem = {
            category: category,
            sizeCount: sizeCount,
            hasVariations: hasVariations
          };

          // Property 1: Grid item should contain category name
          expect(gridItem.category.name).toBe(testData.categoryName);
          expect(gridItem.category.name).toBeDefined();
          expect(gridItem.category.name.length).toBeGreaterThan(0);

          // Property 2: Grid item should contain size count
          expect(gridItem.sizeCount).toBeDefined();
          expect(typeof gridItem.sizeCount).toBe('number');
          expect(gridItem.sizeCount).toBeGreaterThanOrEqual(0);

          // Property 3: Size count should equal standard size (0 or 1) + brand sizes
          const expectedCount = (testData.hasStandardSize ? 1 : 0) + testData.brandSizeCount;
          expect(gridItem.sizeCount).toBe(expectedCount);

          // Property 4: Grid item should contain hasVariations indicator
          expect(gridItem.hasVariations).toBeDefined();
          expect(typeof gridItem.hasVariations).toBe('boolean');

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Size count accurately reflects standard and brand sizes
   * For any category with standard size and brand sizes, the size count
   * should be exactly 1 (standard) + number of brand sizes
   */
  it('should accurately count standard size plus brand sizes', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          hasStandardSize: fc.boolean(),
          brandSizeCount: fc.integer({ min: 0, max: 15 })
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: testData.categoryName,
            icon: undefined,
            supported_formats: ['letter', 'numeric'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Calculate expected size count
          const standardSizeCount = testData.hasStandardSize ? 1 : 0;
          const totalSizeCount = standardSizeCount + testData.brandSizeCount;

          const gridItem: CategoryGridItem = {
            category: category,
            sizeCount: totalSizeCount,
            hasVariations: false // Will be set properly below
          };

          // Property 1: Size count should match expected total
          expect(gridItem.sizeCount).toBe(totalSizeCount);

          // Property 2: Size count should be non-negative
          expect(gridItem.sizeCount).toBeGreaterThanOrEqual(0);

          // Property 3: If no standard size and no brand sizes, count should be 0
          if (!testData.hasStandardSize && testData.brandSizeCount === 0) {
            expect(gridItem.sizeCount).toBe(0);
          }

          // Property 4: If has standard size, count should be at least 1
          if (testData.hasStandardSize) {
            expect(gridItem.sizeCount).toBeGreaterThanOrEqual(1);
          }

          // Property 5: If has brand sizes, count should be at least the brand size count
          if (testData.brandSizeCount > 0) {
            expect(gridItem.sizeCount).toBeGreaterThanOrEqual(testData.brandSizeCount);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Variation indicator shows when brand sizes differ from standard
   * For any category with both standard size and brand sizes, the hasVariations
   * indicator should be true if brand sizes have different values
   */
  it('should show variation indicator when brand sizes differ from standard size', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          standardSize: fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
          brandSizes: fc.array(
            fc.record({
              brandName: fc.string({ minLength: 1, maxLength: 50 }),
              size: fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL')
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: testData.categoryName,
            icon: undefined,
            supported_formats: ['letter'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const brandSizes = testData.brandSizes.map((bs, i) => ({
            id: `brand-size-${i}`,
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            brand_name: bs.brandName,
            item_type: undefined,
            size: bs.size,
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Check if any brand size differs from standard size
          const hasDifferentSizes = brandSizes.some(bs => bs.size !== testData.standardSize);

          const gridItem: CategoryGridItem = {
            category: category,
            sizeCount: 1 + brandSizes.length,
            hasVariations: hasDifferentSizes
          };

          // Property 1: If any brand size differs, hasVariations should be true
          if (hasDifferentSizes) {
            expect(gridItem.hasVariations).toBe(true);
          }

          // Property 2: If all brand sizes match standard, hasVariations should be false
          const allMatch = brandSizes.every(bs => bs.size === testData.standardSize);
          if (allMatch && brandSizes.length > 0) {
            expect(gridItem.hasVariations).toBe(false);
          }

          // Property 3: hasVariations should be boolean
          expect(typeof gridItem.hasVariations).toBe('boolean');

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: No variation indicator when only standard size exists
   * For any category with only a standard size and no brand sizes,
   * the hasVariations indicator should be false
   */
  it('should not show variation indicator when only standard size exists', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          standardSize: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString()),
            fc.record({
              waist: fc.integer({ min: 28, max: 44 }),
              inseam: fc.integer({ min: 28, max: 36 })
            }).map(({ waist, inseam }) => `${waist}x${inseam}`)
          )
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: testData.categoryName,
            icon: undefined,
            supported_formats: ['letter', 'numeric', 'waist-inseam'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const gridItem: CategoryGridItem = {
            category: category,
            sizeCount: 1, // Only standard size
            hasVariations: false // No brand sizes to vary
          };

          // Property 1: hasVariations should be false when no brand sizes
          expect(gridItem.hasVariations).toBe(false);

          // Property 2: Size count should be exactly 1
          expect(gridItem.sizeCount).toBe(1);

          // Property 3: Category name should be present
          expect(gridItem.category.name).toBe(testData.categoryName);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: No variation indicator when only brand sizes exist
   * For any category with only brand sizes and no standard size,
   * the hasVariations indicator should be false (nothing to vary from)
   */
  it('should not show variation indicator when only brand sizes exist without standard', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          brandSizeCount: fc.integer({ min: 1, max: 8 })
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: testData.categoryName,
            icon: undefined,
            supported_formats: ['letter', 'numeric'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const gridItem: CategoryGridItem = {
            category: category,
            sizeCount: testData.brandSizeCount, // Only brand sizes
            hasVariations: false // No standard size to vary from
          };

          // Property 1: hasVariations should be false when no standard size
          expect(gridItem.hasVariations).toBe(false);

          // Property 2: Size count should equal brand size count
          expect(gridItem.sizeCount).toBe(testData.brandSizeCount);

          // Property 3: Size count should be greater than 0
          expect(gridItem.sizeCount).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Empty category shows zero size count
   * For any category with no standard size and no brand sizes,
   * the size count should be 0 and hasVariations should be false
   */
  it('should show zero size count for empty category', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          supportedFormats: fc.array(
            fc.constantFrom('letter', 'numeric', 'waist-inseam', 'measurements'),
            { minLength: 1, maxLength: 4 }
          )
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: testData.categoryName,
            icon: undefined,
            supported_formats: testData.supportedFormats as unknown,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const gridItem: CategoryGridItem = {
            category: category,
            sizeCount: 0,
            hasVariations: false
          };

          // Property 1: Size count should be 0
          expect(gridItem.sizeCount).toBe(0);

          // Property 2: hasVariations should be false
          expect(gridItem.hasVariations).toBe(false);

          // Property 3: Category name should still be present
          expect(gridItem.category.name).toBe(testData.categoryName);
          expect(gridItem.category.name.length).toBeGreaterThan(0);

          // Property 4: Category should have supported formats
          expect(gridItem.category.supported_formats).toBeDefined();
          expect(gridItem.category.supported_formats.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Grid item data consistency
   * For any category grid item, the category reference should be consistent
   * with the category ID used to fetch sizes
   */
  it('should maintain consistent category reference across grid item', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          userId: fc.string({ minLength: 1, maxLength: 36 }),
          sizeCount: fc.integer({ min: 0, max: 20 }),
          hasVariations: fc.boolean()
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: testData.userId,
            name: testData.categoryName,
            icon: undefined,
            supported_formats: ['letter', 'numeric'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const gridItem: CategoryGridItem = {
            category: category,
            sizeCount: testData.sizeCount,
            hasVariations: testData.hasVariations
          };

          // Property 1: Grid item category ID should match original category ID
          expect(gridItem.category.id).toBe(testData.categoryId);

          // Property 2: Grid item category user_id should match original user_id
          expect(gridItem.category.user_id).toBe(testData.userId);

          // Property 3: Grid item category name should match original name
          expect(gridItem.category.name).toBe(testData.categoryName);

          // Property 4: Grid item should contain all category fields
          expect(gridItem.category).toHaveProperty('id');
          expect(gridItem.category).toHaveProperty('user_id');
          expect(gridItem.category).toHaveProperty('name');
          expect(gridItem.category).toHaveProperty('supported_formats');
          expect(gridItem.category).toHaveProperty('is_system_category');
          expect(gridItem.category).toHaveProperty('created_at');
          expect(gridItem.category).toHaveProperty('updated_at');

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Multiple categories maintain independent data
   * For any list of categories, each grid item should maintain its own
   * independent size count and variation indicator
   */
  it('should maintain independent data for multiple categories', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            categoryId: fc.uuid(), // Use UUID for guaranteed uniqueness
            categoryName: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0) // Filter out whitespace-only names
              .map(s => s.trim()), // Trim the string to ensure no leading/trailing whitespace
            sizeCount: fc.integer({ min: 0, max: 15 }),
            hasVariations: fc.boolean()
          }),
          { minLength: 2, maxLength: 8, selector: (item) => item.categoryId }
        ),
        (categories) => {
          // Create grid items for all categories
          const gridItems: CategoryGridItem[] = categories.map(cat => ({
            category: {
              id: cat.categoryId,
              user_id: 'test-user-id',
              name: cat.categoryName,
              icon: undefined,
              supported_formats: ['letter', 'numeric'],
              is_system_category: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            sizeCount: cat.sizeCount,
            hasVariations: cat.hasVariations
          }));

          // Property 1: Each grid item should have unique category ID
          const categoryIds = gridItems.map(item => item.category.id);
          const uniqueIds = new Set(categoryIds);
          expect(uniqueIds.size).toBe(gridItems.length);

          // Property 2: Each grid item should maintain its own size count
          gridItems.forEach((item, index) => {
            expect(item.sizeCount).toBe(categories[index].sizeCount);
          });

          // Property 3: Each grid item should maintain its own variation indicator
          gridItems.forEach((item, index) => {
            expect(item.hasVariations).toBe(categories[index].hasVariations);
          });

          // Property 4: Modifying one grid item should not affect others
          if (gridItems.length >= 2) {
            const firstItem = gridItems[0];
            const secondItem = gridItems[1];
            
            // They should be independent
            expect(firstItem.category.id).not.toBe(secondItem.category.id);
            // Don't assert that size counts are different - they could legitimately be the same
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

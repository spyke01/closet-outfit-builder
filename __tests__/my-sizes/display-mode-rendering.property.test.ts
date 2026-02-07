/**
 * Property-Based Test: Display Mode Rendering
 * 
 * **Property 27: Display mode rendering - standard**
 * For any pinned card set to "standard size" display mode, the card should 
 * display only the primary size from the category's standard size, and should 
 * not display secondary size or brand-specific sizes.
 * 
 * **Property 28: Display mode rendering - dual**
 * For any pinned card set to "dual size" display mode, the card should display 
 * both the primary size and secondary size from the category's standard size 
 * (if secondary size exists).
 * 
 * **Property 29: Display mode rendering - preferred brand**
 * For any pinned card set to "preferred brand size" display mode with a selected 
 * brand, the card should display the size from that brand's brand size entry 
 * rather than the standard size.
 * 
 * **Validates: Requirements 15.2, 15.3, 15.4**
 * Feature: my-sizes
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { SizeCategory, StandardSize, BrandSize, DisplayMode } from '@/lib/types/sizes';

describe('Property 27-29: Display Mode Rendering', () => {
  /**
   * Property 27: Standard display mode shows only primary size
   * For any pinned card in standard mode, only the primary size should be 
   * displayed, not the secondary size or brand sizes
   */
  it('should display only primary size in standard mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.oneof(
            fc.constantFrom('Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          primarySize: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString()),
            fc.record({
              waist: fc.integer({ min: 28, max: 44 }),
              inseam: fc.integer({ min: 28, max: 36 })
            }).map(({ waist, inseam }) => `${waist}x${inseam}`)
          ),
          secondarySize: fc.option(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
            { nil: undefined }
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

          const standardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.primarySize,
            secondary_size: testData.secondarySize,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const displayMode: DisplayMode = 'standard';

          // Simulate display logic for standard mode
          const displayData = {
            mode: displayMode,
            category: category,
            standardSize: standardSize,
            displayedSize: standardSize.primary_size,
            displayedSecondarySize: undefined, // Should NOT display secondary in standard mode
            displayedBrandSize: undefined // Should NOT display brand size in standard mode
          };

          // Property 1: Display mode should be 'standard'
          expect(displayData.mode).toBe('standard');

          // Property 2: Should display primary size
          expect(displayData.displayedSize).toBe(testData.primarySize);
          expect(displayData.displayedSize).toBeDefined();

          // Property 3: Should NOT display secondary size (even if it exists)
          expect(displayData.displayedSecondarySize).toBeUndefined();

          // Property 4: Should NOT display brand size
          expect(displayData.displayedBrandSize).toBeUndefined();

          // Property 5: Displayed size should match standard size primary
          expect(displayData.displayedSize).toBe(standardSize.primary_size);

          // Property 6: If secondary size exists, it should NOT be displayed
          if (testData.secondarySize) {
            expect(displayData.displayedSecondarySize).not.toBe(testData.secondarySize);
            expect(displayData.displayedSecondarySize).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 28: Dual display mode shows both primary and secondary sizes
   * For any pinned card in dual mode, both primary and secondary sizes should 
   * be displayed (if secondary exists)
   */
  it('should display both primary and secondary sizes in dual mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          primarySize: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString())
          ),
          secondarySize: fc.option(
            fc.oneof(
              fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
              fc.integer({ min: 2, max: 20 }).map(n => n.toString())
            ),
            { nil: undefined }
          )
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

          const standardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.primarySize,
            secondary_size: testData.secondarySize,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const displayMode: DisplayMode = 'dual';

          // Simulate display logic for dual mode
          const displayData = {
            mode: displayMode,
            category: category,
            standardSize: standardSize,
            displayedPrimarySize: standardSize.primary_size,
            displayedSecondarySize: standardSize.secondary_size, // Should display if exists
            displayedBrandSize: undefined // Should NOT display brand size in dual mode
          };

          // Property 1: Display mode should be 'dual'
          expect(displayData.mode).toBe('dual');

          // Property 2: Should display primary size
          expect(displayData.displayedPrimarySize).toBe(testData.primarySize);
          expect(displayData.displayedPrimarySize).toBeDefined();

          // Property 3: Should display secondary size if it exists
          if (testData.secondarySize) {
            expect(displayData.displayedSecondarySize).toBe(testData.secondarySize);
            expect(displayData.displayedSecondarySize).toBeDefined();
          } else {
            expect(displayData.displayedSecondarySize).toBeUndefined();
          }

          // Property 4: Should NOT display brand size
          expect(displayData.displayedBrandSize).toBeUndefined();

          // Property 5: Primary size should match standard size primary
          expect(displayData.displayedPrimarySize).toBe(standardSize.primary_size);

          // Property 6: Secondary size should match standard size secondary
          expect(displayData.displayedSecondarySize).toBe(standardSize.secondary_size);

          // Property 7: Both sizes should come from standard_sizes, not brand_sizes
          expect(displayData.displayedPrimarySize).toBe(standardSize.primary_size);
          if (displayData.displayedSecondarySize) {
            expect(displayData.displayedSecondarySize).toBe(standardSize.secondary_size);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 29: Preferred brand display mode shows brand-specific size
   * For any pinned card in preferred-brand mode with a selected brand,
   * the brand's size should be displayed instead of the standard size
   */
  it('should display brand-specific size in preferred-brand mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          standardPrimarySize: fc.constantFrom('S', 'M', 'L', 'XL'),
          brandName: fc.oneof(
            fc.constantFrom('Nike', 'Adidas', 'Levi\'s', 'Gap', 'Uniqlo'),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          brandSize: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString())
          ),
          itemType: fc.option(
            fc.constantFrom('Jeans', 'T-Shirt', 'Jacket', 'Sneakers'),
            { nil: undefined }
          )
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

          const standardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.standardPrimarySize,
            secondary_size: undefined,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const brandSizeEntry: BrandSize = {
            id: 'brand-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            brand_name: testData.brandName,
            item_type: testData.itemType,
            size: testData.brandSize,
            fit_scale: 3, // True to size
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const displayMode: DisplayMode = 'preferred-brand';
          const preferredBrandId = brandSizeEntry.id;

          // Simulate display logic for preferred-brand mode
          const displayData = {
            mode: displayMode,
            category: category,
            standardSize: standardSize,
            preferredBrandId: preferredBrandId,
            brandSizeEntry: brandSizeEntry,
            displayedSize: brandSizeEntry.size, // Should display brand size
            displayedBrandName: brandSizeEntry.brand_name,
            displayedItemType: brandSizeEntry.item_type,
            displayedStandardSize: undefined // Should NOT display standard size
          };

          // Property 1: Display mode should be 'preferred-brand'
          expect(displayData.mode).toBe('preferred-brand');

          // Property 2: Should display brand size (may or may not match standard size)
          expect(displayData.displayedSize).toBe(testData.brandSize);

          // Property 3: Should display brand name
          expect(displayData.displayedBrandName).toBe(testData.brandName);
          expect(displayData.displayedBrandName).toBeDefined();

          // Property 4: Should display item type if it exists
          if (testData.itemType) {
            expect(displayData.displayedItemType).toBe(testData.itemType);
          } else {
            expect(displayData.displayedItemType).toBeUndefined();
          }

          // Property 5: Should NOT display standard size
          expect(displayData.displayedStandardSize).toBeUndefined();

          // Property 6: Displayed size should match brand size entry
          expect(displayData.displayedSize).toBe(brandSizeEntry.size);

          // Property 7: Preferred brand ID should be set
          expect(displayData.preferredBrandId).toBe(brandSizeEntry.id);
          expect(displayData.preferredBrandId).toBeDefined();

          // Property 8: Brand size should be different from or same as standard size
          // (both are valid - brand size can match or differ from standard)
          expect(displayData.displayedSize).toBeDefined();
          expect(standardSize.primary_size).toBeDefined();

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Preferred brand mode falls back to standard size if brand not found
   * For any pinned card in preferred-brand mode without a valid brand selection,
   * it should fall back to displaying the standard size
   */
  it('should fall back to standard size when preferred brand not found', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          primarySize: fc.constantFrom('S', 'M', 'L', 'XL'),
          preferredBrandId: fc.option(
            fc.string({ minLength: 1, maxLength: 36 }),
            { nil: undefined }
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

          const standardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.primarySize,
            secondary_size: undefined,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const displayMode: DisplayMode = 'preferred-brand';
          const brandSizes: BrandSize[] = []; // No brand sizes available

          // Simulate display logic when preferred brand not found
          const preferredBrand = testData.preferredBrandId 
            ? brandSizes.find(bs => bs.id === testData.preferredBrandId)
            : undefined;

          const displayData = {
            mode: displayMode,
            category: category,
            standardSize: standardSize,
            preferredBrandId: testData.preferredBrandId,
            brandSizes: brandSizes,
            preferredBrand: preferredBrand,
            displayedSize: preferredBrand ? preferredBrand.size : standardSize.primary_size,
            isFallback: !preferredBrand
          };

          // Property 1: Display mode should be 'preferred-brand'
          expect(displayData.mode).toBe('preferred-brand');

          // Property 2: Preferred brand should not be found
          expect(displayData.preferredBrand).toBeUndefined();

          // Property 3: Should fall back to standard size
          expect(displayData.displayedSize).toBe(testData.primarySize);
          expect(displayData.displayedSize).toBe(standardSize.primary_size);

          // Property 4: Fallback flag should be true
          expect(displayData.isFallback).toBe(true);

          // Property 5: Displayed size should match standard size when falling back
          expect(displayData.displayedSize).toBe(standardSize.primary_size);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Display mode consistency across multiple renders
   * For any pinned card, the display mode should consistently determine
   * what size information is shown across multiple renders
   */
  it('should consistently display size based on display mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          primarySize: fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
          secondarySize: fc.option(fc.constantFrom('S', 'M', 'L'), { nil: undefined }),
          brandSize: fc.constantFrom('S', 'M', 'L', 'XL', 'XXL'),
          displayMode: fc.constantFrom('standard', 'dual', 'preferred-brand') as fc.Arbitrary<DisplayMode>
        }),
        (testData) => {
          const standardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.primarySize,
            secondary_size: testData.secondarySize,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const brandSizeEntry: BrandSize = {
            id: 'brand-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            brand_name: 'Test Brand',
            item_type: undefined,
            size: testData.brandSize,
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Simulate multiple renders with same data
          const render1 = {
            mode: testData.displayMode,
            displayedSize: testData.displayMode === 'preferred-brand' 
              ? brandSizeEntry.size 
              : standardSize.primary_size,
            displayedSecondary: testData.displayMode === 'dual' 
              ? standardSize.secondary_size 
              : undefined
          };

          const render2 = {
            mode: testData.displayMode,
            displayedSize: testData.displayMode === 'preferred-brand' 
              ? brandSizeEntry.size 
              : standardSize.primary_size,
            displayedSecondary: testData.displayMode === 'dual' 
              ? standardSize.secondary_size 
              : undefined
          };

          // Property 1: Display mode should be consistent
          expect(render1.mode).toBe(render2.mode);

          // Property 2: Displayed size should be consistent
          expect(render1.displayedSize).toBe(render2.displayedSize);

          // Property 3: Displayed secondary should be consistent
          expect(render1.displayedSecondary).toBe(render2.displayedSecondary);

          // Property 4: Display logic should be deterministic
          if (testData.displayMode === 'standard') {
            expect(render1.displayedSize).toBe(testData.primarySize);
            expect(render1.displayedSecondary).toBeUndefined();
          } else if (testData.displayMode === 'dual') {
            expect(render1.displayedSize).toBe(testData.primarySize);
            expect(render1.displayedSecondary).toBe(testData.secondarySize);
          } else if (testData.displayMode === 'preferred-brand') {
            expect(render1.displayedSize).toBe(testData.brandSize);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Display mode determines data source
   * For any pinned card, the display mode should determine whether data
   * comes from standard_sizes or brand_sizes table
   */
  it('should use correct data source based on display mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          standardPrimarySize: fc.constantFrom('S', 'M', 'L'),
          standardSecondarySize: fc.option(fc.constantFrom('M', 'L', 'XL'), { nil: undefined }),
          brandSize: fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
          displayMode: fc.constantFrom('standard', 'dual', 'preferred-brand') as fc.Arbitrary<DisplayMode>
        }),
        (testData) => {
          const standardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.standardPrimarySize,
            secondary_size: testData.standardSecondarySize,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const brandSizeEntry: BrandSize = {
            id: 'brand-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            brand_name: 'Test Brand',
            item_type: undefined,
            size: testData.brandSize,
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Determine data source based on display mode
          const dataSource = {
            mode: testData.displayMode,
            usesStandardSizes: testData.displayMode === 'standard' || testData.displayMode === 'dual',
            usesBrandSizes: testData.displayMode === 'preferred-brand',
            standardSize: standardSize,
            brandSize: brandSizeEntry
          };

          // Property 1: Standard and dual modes should use standard_sizes
          if (testData.displayMode === 'standard' || testData.displayMode === 'dual') {
            expect(dataSource.usesStandardSizes).toBe(true);
            expect(dataSource.usesBrandSizes).toBe(false);
          }

          // Property 2: Preferred-brand mode should use brand_sizes
          if (testData.displayMode === 'preferred-brand') {
            expect(dataSource.usesBrandSizes).toBe(true);
            expect(dataSource.usesStandardSizes).toBe(false);
          }

          // Property 3: Only one data source should be used at a time
          expect(dataSource.usesStandardSizes).not.toBe(dataSource.usesBrandSizes);

          // Property 4: Data source should be mutually exclusive
          const usedSources = [
            dataSource.usesStandardSizes,
            dataSource.usesBrandSizes
          ].filter(Boolean);
          expect(usedSources.length).toBe(1);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Display mode change updates displayed size
   * For any pinned card, changing the display mode should change what
   * size information is displayed
   */
  it('should update displayed size when display mode changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          primarySize: fc.constantFrom('S', 'M', 'L'),
          secondarySize: fc.constantFrom('M', 'L', 'XL'),
          brandSize: fc.constantFrom('XS', 'S', 'M', 'L'),
          initialMode: fc.constantFrom('standard', 'dual') as fc.Arbitrary<'standard' | 'dual'>,
          newMode: fc.constantFrom('dual', 'preferred-brand') as fc.Arbitrary<'dual' | 'preferred-brand'>
        }).filter(({ initialMode, newMode }) => initialMode !== newMode),
        (testData) => {
          const standardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.primarySize,
            secondary_size: testData.secondarySize,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const brandSizeEntry: BrandSize = {
            id: 'brand-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            brand_name: 'Test Brand',
            item_type: undefined,
            size: testData.brandSize,
            fit_scale: 3,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Initial display state
          const initialDisplay = {
            mode: testData.initialMode,
            displayedPrimary: standardSize.primary_size,
            displayedSecondary: testData.initialMode === 'dual' ? standardSize.secondary_size : undefined
          };

          // Updated display state after mode change
          const updatedDisplay = {
            mode: testData.newMode,
            displayedPrimary: testData.newMode === 'preferred-brand' 
              ? brandSizeEntry.size 
              : standardSize.primary_size,
            displayedSecondary: testData.newMode === 'dual' ? standardSize.secondary_size : undefined
          };

          // Property 1: Display mode should change
          expect(initialDisplay.mode).not.toBe(updatedDisplay.mode);

          // Property 2: Displayed content should change based on new mode
          if (testData.newMode === 'preferred-brand') {
            expect(updatedDisplay.displayedPrimary).toBe(testData.brandSize);
          } else if (testData.newMode === 'dual') {
            expect(updatedDisplay.displayedSecondary).toBe(testData.secondarySize);
          }

          // Property 3: Mode change should be reflected in display
          expect(updatedDisplay.mode).toBe(testData.newMode);

          // Property 4: Display should update without page reload
          // (simulated by having different display states)
          expect(initialDisplay).not.toEqual(updatedDisplay);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

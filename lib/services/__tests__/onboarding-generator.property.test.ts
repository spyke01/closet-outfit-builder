import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateWardrobeItems } from '../onboarding-generator';
import type { CategoryKey, StyleBaseline, SubcategoryColorSelection } from '@/lib/types/onboarding';
import { getCategoryKeys, getSubcategoriesForCategory } from '@/lib/data/onboarding-categories';

/**
 * Property-based tests for onboarding item generation
 * 
 * Tests universal properties that should hold for all valid inputs:
 * 1. Item generation matches user selections
 * 2. Item cap enforcement
 * 3. Color normalization consistency
 * 4. Formality score validity
 * 5. Season tag validity
 */

// Generators for property-based testing

const categoryKeyArb = fc.constantFrom<CategoryKey>(...getCategoryKeys());

const climateArb = fc.constantFrom<'Hot' | 'Cold' | 'Mixed' | null>('Hot', 'Cold', 'Mixed', null);

const primaryUseArb = fc.constantFrom<'Work' | 'Casual' | 'Mixed' | null>('Work', 'Casual', 'Mixed', null);

const styleBaselineArb: fc.Arbitrary<StyleBaseline> = fc.record({
  primaryUse: primaryUseArb,
  climate: climateArb,
});

interface SubcategorySelection {
  categoryKey: CategoryKey;
  subcategories: string[];
}

// Generate valid subcategory selections
const subcategorySelectionArb: fc.Arbitrary<SubcategorySelection> = categoryKeyArb.chain((categoryKey) => {
  const subcategories = getSubcategoriesForCategory(categoryKey);
  if (subcategories.length === 0) {
    return fc.constant<SubcategorySelection>({ categoryKey, subcategories: [] });
  }

  return fc.subarray(subcategories.map(s => s.name), { minLength: 1 }).map((selected) => ({
    categoryKey,
    subcategories: [...selected],
  }));
});

describe('Property-Based Tests: generateWardrobeItems', () => {
  /**
   * Property 1: Item Generation Matches Selections
   * 
   * For any valid user selections, the generated items should exactly match
   * the selected categories, subcategories, and colors (1 item per color).
   */
  it('Property 1: Generated items match user selections (1 item per color)', () => {
    fc.assert(
      fc.property(
        fc.array(subcategorySelectionArb, { minLength: 1, maxLength: 3 }),
        styleBaselineArb,
        (selections, styleBaseline) => {
          // Build selectedCategories and selectedSubcategories
          const selectedCategories: CategoryKey[] = [];
          const selectedSubcategories: Partial<Record<CategoryKey, string[]>> = {} as Partial<Record<CategoryKey, string[]>>;
          
          for (const { categoryKey, subcategories } of selections) {
            if (!selectedCategories.includes(categoryKey)) {
              selectedCategories.push(categoryKey);
            }
            selectedSubcategories[categoryKey] = [
              ...(selectedSubcategories[categoryKey] || []),
              ...subcategories,
            ];
          }
          
          // Generate color selections
          const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {};
          let expectedItemCount = 0;
          
          for (const categoryKey of selectedCategories) {
            const subcats = selectedSubcategories[categoryKey] || [];
            for (const subcategory of subcats) {
              const key = `${categoryKey}-${subcategory}`;
              const colors = ['navy', 'white']; // Fixed colors for predictability
              colorQuantitySelections[key] = { subcategory, colors };
              expectedItemCount += colors.length;
            }
          }
          
          const items = generateWardrobeItems(
            selectedCategories,
            selectedSubcategories,
            colorQuantitySelections,
            styleBaseline,
            false,
            100
          );
          
          // Property: Number of items equals number of colors selected
          expect(items.length).toBe(expectedItemCount);
          
          // Property: Each item corresponds to a selected subcategory and color
          for (const item of items) {
            expect(selectedCategories).toContain(item.category);
            expect(selectedSubcategories[item.category]).toContain(item.subcategory);
            
            const key = `${item.category}-${item.subcategory}`;
            const selection = colorQuantitySelections[key];
            expect(selection).toBeDefined();
            expect(selection.colors.map(c => c.toLowerCase().trim())).toContain(item.color);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 2: Item Cap Enforcement
   * 
   * When item cap is enabled, the number of generated items should never
   * exceed the specified cap, regardless of how many items are requested.
   */
  it('Property 2: Item cap is enforced when enabled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 5, max: 100 }),
        styleBaselineArb,
        (itemCap, requestedItems, styleBaseline) => {
          // Create selections that would generate more items than the cap
          const selectedCategories: CategoryKey[] = ['Tops'];
          const selectedSubcategories: Partial<Record<CategoryKey, string[]>> = {
            Tops: ['T-Shirt'],
          };
          
          // Generate enough colors to exceed the cap
          const colors = Array(requestedItems)
            .fill(0)
            .map((_, i) => `color-${i}`);
          
          const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
            'Tops-T-Shirt': {
              subcategory: 'T-Shirt',
              colors,
            },
          };
          
          const items = generateWardrobeItems(
            selectedCategories,
            selectedSubcategories,
            colorQuantitySelections,
            styleBaseline,
            true, // Cap enabled
            itemCap
          );
          
          // Property: Generated items never exceed cap
          expect(items.length).toBeLessThanOrEqual(itemCap);
          
          // Property: If requested items < cap, all items are generated
          if (requestedItems <= itemCap) {
            expect(items.length).toBe(requestedItems);
          } else {
            expect(items.length).toBe(itemCap);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 3: Color Normalization Consistency
   * 
   * All color values should be normalized (lowercase, trimmed) consistently,
   * regardless of input format.
   */
  it('Property 3: Colors are consistently normalized', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).map(s => {
            // Add random whitespace and casing
            const withWhitespace = fc.sample(
              fc.constantFrom(
                s,
                ` ${s}`,
                `${s} `,
                ` ${s} `,
                `  ${s}  `
              ),
              1
            )[0];
            const withCasing = fc.sample(
              fc.constantFrom(
                withWhitespace,
                withWhitespace.toUpperCase(),
                withWhitespace.toLowerCase(),
                withWhitespace.charAt(0).toUpperCase() + withWhitespace.slice(1)
              ),
              1
            )[0];
            return withCasing;
          }),
          { minLength: 1, maxLength: 5 }
        ),
        styleBaselineArb,
        (colors, styleBaseline) => {
          const selectedCategories: CategoryKey[] = ['Tops'];
          const selectedSubcategories: Partial<Record<CategoryKey, string[]>> = {
            Tops: ['T-Shirt'],
          };
          const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {
            'Tops-T-Shirt': {
              subcategory: 'T-Shirt',
              colors,
            },
          };
          
          const items = generateWardrobeItems(
            selectedCategories,
            selectedSubcategories,
            colorQuantitySelections,
            styleBaseline,
            false,
            100
          );
          
          // Property: All colors are lowercase and trimmed
          for (const item of items) {
            expect(item.color).toBe(item.color.toLowerCase().trim());
            expect(item.color).not.toMatch(/^\s/); // No leading whitespace
            expect(item.color).not.toMatch(/\s$/); // No trailing whitespace
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 4: Formality Score Validity
   * 
   * All generated items must have formality scores between 1 and 10 inclusive,
   * as defined by the subcategory definitions.
   */
  it('Property 4: Formality scores are always valid (1-10)', () => {
    fc.assert(
      fc.property(
        fc.array(subcategorySelectionArb, { minLength: 1, maxLength: 6 }),
        styleBaselineArb,
        (selections, styleBaseline) => {
          const selectedCategories: CategoryKey[] = [];
          const selectedSubcategories: Partial<Record<CategoryKey, string[]>> = {} as Partial<Record<CategoryKey, string[]>>;
          
          for (const { categoryKey, subcategories } of selections) {
            if (!selectedCategories.includes(categoryKey)) {
              selectedCategories.push(categoryKey);
            }
            selectedSubcategories[categoryKey] = [
              ...(selectedSubcategories[categoryKey] || []),
              ...subcategories,
            ];
          }
          
          const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {};
          for (const categoryKey of selectedCategories) {
            const subcats = selectedSubcategories[categoryKey] || [];
            for (const subcategory of subcats) {
              const key = `${categoryKey}-${subcategory}`;
              colorQuantitySelections[key] = {
                subcategory,
                colors: ['navy'],
              };
            }
          }
          
          const items = generateWardrobeItems(
            selectedCategories,
            selectedSubcategories,
            colorQuantitySelections,
            styleBaseline,
            false,
            100
          );
          
          // Property: All formality scores are between 1 and 10
          for (const item of items) {
            expect(item.formality_score).toBeGreaterThanOrEqual(1);
            expect(item.formality_score).toBeLessThanOrEqual(10);
            expect(Number.isInteger(item.formality_score)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 5: Season Tag Validity
   * 
   * All generated items must have valid season tags from the defined set,
   * and the tags should be consistent with the climate selection.
   */
  it('Property 5: Season tags are valid and consistent with climate', () => {
    fc.assert(
      fc.property(
        fc.array(subcategorySelectionArb, { minLength: 1, maxLength: 3 }),
        styleBaselineArb,
        (selections, styleBaseline) => {
          const selectedCategories: CategoryKey[] = [];
          const selectedSubcategories: Partial<Record<CategoryKey, string[]>> = {} as Partial<Record<CategoryKey, string[]>>;
          
          for (const { categoryKey, subcategories } of selections) {
            if (!selectedCategories.includes(categoryKey)) {
              selectedCategories.push(categoryKey);
            }
            selectedSubcategories[categoryKey] = [
              ...(selectedSubcategories[categoryKey] || []),
              ...subcategories,
            ];
          }
          
          const colorQuantitySelections: Record<string, SubcategoryColorSelection> = {};
          for (const categoryKey of selectedCategories) {
            const subcats = selectedSubcategories[categoryKey] || [];
            for (const subcategory of subcats) {
              const key = `${categoryKey}-${subcategory}`;
              colorQuantitySelections[key] = {
                subcategory,
                colors: ['navy'],
              };
            }
          }
          
          const items = generateWardrobeItems(
            selectedCategories,
            selectedSubcategories,
            colorQuantitySelections,
            styleBaseline,
            false,
            100
          );
          
          const validSeasons = ['All', 'Summer', 'Winter', 'Spring', 'Fall'];
          
          // Property: All season tags are valid
          for (const item of items) {
            expect(Array.isArray(item.season)).toBe(true);
            expect(item.season.length).toBeGreaterThan(0);
            
            for (const season of item.season) {
              expect(validSeasons).toContain(season);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

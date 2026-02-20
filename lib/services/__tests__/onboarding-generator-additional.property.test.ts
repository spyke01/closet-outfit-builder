import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateWardrobeItems } from '../onboarding-generator';
import type { CategoryKey, StyleBaseline, SubcategoryColorSelection } from '@/lib/types/onboarding';
import { getCategoryKeys, getSubcategoriesForCategory } from '@/lib/data/onboarding-categories';

/**
 * Additional Property-based tests for onboarding item generation
 * 
 * Tests remaining universal properties:
 * 9. Item names are descriptive
 * 12. Image URLs are valid or null
 */

// Generators
const categoryKeyArb = fc.constantFrom<CategoryKey>(...getCategoryKeys());

const climateArb = fc.constantFrom<'Hot' | 'Cold' | 'Mixed' | null>('Hot', 'Cold', 'Mixed', null);

const primaryUseArb = fc.constantFrom<'Work' | 'Casual' | 'Mixed' | null>('Work', 'Casual', 'Mixed', null);

const styleBaselineArb: fc.Arbitrary<StyleBaseline> = fc.record({
  primaryUse: primaryUseArb,
  climate: climateArb,
});

const colorArb = fc.oneof(
  fc.constantFrom('navy', 'white', 'black', 'grey', 'blue', 'brown', 'green', 'red'),
  fc.constant(''), // Empty color
);

// Generate valid subcategory selections
interface SubcategorySelection {
  categoryKey: CategoryKey;
  subcategories: string[];
}

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

describe('Property-Based Tests: Additional Properties', () => {
  /**
   * Property 9: Item Names Are Descriptive
   * 
   * For any generated item, the name follows the pattern "{color} {subcategory}"
   * or "{subcategory}" if color is unspecified.
   * 
   * **Validates: Requirements 3.4.2**
   */
  it('Property 9: Item names follow descriptive pattern', () => {
    fc.assert(
      fc.property(
        fc.array(subcategorySelectionArb, { minLength: 1, maxLength: 3 }),
        fc.array(colorArb, { minLength: 1, maxLength: 5 }),
        styleBaselineArb,
        (selections, colors, styleBaseline) => {
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
                colors,
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
          
          // Property: All item names follow the pattern
          for (const item of items) {
            if (item.color && item.color.trim() !== '') {
              // Name should be "{Color} {Subcategory}" with capitalized color
              const expectedName = `${item.color.charAt(0).toUpperCase() + item.color.slice(1)} ${item.subcategory}`;
              expect(item.name).toBe(expectedName);
              
              // Name should contain both color and subcategory
              expect(item.name.toLowerCase()).toContain(item.color.toLowerCase());
              expect(item.name).toContain(item.subcategory);
            } else {
              // Name should be just the subcategory
              expect(item.name).toBe(item.subcategory);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 12: Image URLs Are Valid or Null
   * 
   * For any generated item, the image_url is either a valid string path or null.
   * 
   * **Validates: Requirements 3.4.3, 3.4.4**
   */
  it('Property 12: Image URLs are valid strings or null', () => {
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
          
          // Property: All image URLs are either null or valid strings
          for (const item of items) {
            const isNull = item.image_url === null;
            const isString = typeof item.image_url === 'string';
            
            expect(isNull || isString).toBe(true);
            
            // If it's a string, it should not be empty
            if (isString) {
              expect(item.image_url).not.toBe('');
            }
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

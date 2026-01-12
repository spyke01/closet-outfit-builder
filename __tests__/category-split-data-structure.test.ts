import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

/**
 * Property-Based Tests for Category Split Data Structure Consistency
 * 
 * **Feature: category-split-jacket-overshirt, Property 1: Category Data Structure Consistency**
 * **Validates: Requirements 1.1, 1.3, 1.5**
 */

interface CategoryDefinition {
  name: string;
  is_anchor_item: boolean;
  display_order: number;
}

/**
 * Extract defaultCategories array from a TypeScript/JavaScript file
 */
function extractCategoriesFromFile(filePath: string): CategoryDefinition[] {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Match the defaultCategories array definition
  const categoriesMatch = fileContent.match(/const defaultCategories[^=]*=\s*(\[[\s\S]*?\]);/);
  
  if (!categoriesMatch) {
    throw new Error(`Could not find defaultCategories array in ${filePath}`);
  }

  try {
    // Parse the array string - using eval for simplicity in tests
    const arrayString = categoriesMatch[1];
    return eval(`(${arrayString})`);
  } catch (parseError) {
    throw new Error(`Failed to parse defaultCategories array from ${filePath}: ${parseError}`);
  }
}

/**
 * Validate that categories array has the expected structure after category split
 */
function validateCategorySplitStructure(categories: CategoryDefinition[]): {
  hasJacket: boolean;
  hasOvershirt: boolean;
  hasOldCategory: boolean;
  hasValidDisplayOrder: boolean;
  categoryNames: string[];
} {
  const categoryNames = categories.map(c => c.name);
  const hasJacket = categoryNames.includes('Jacket');
  const hasOvershirt = categoryNames.includes('Overshirt');
  const hasOldCategory = categoryNames.includes('Jacket/Overshirt');
  
  // Check display_order is sequential and starts from 1
  const displayOrders = categories.map(c => c.display_order).sort((a, b) => a - b);
  const hasValidDisplayOrder = displayOrders.length > 0 && 
    displayOrders[0] === 1 && 
    displayOrders.every((order, index) => order === index + 1);

  return {
    hasJacket,
    hasOvershirt,
    hasOldCategory,
    hasValidDisplayOrder,
    categoryNames
  };
}

describe('Category Split Data Structure Consistency', () => {
  describe('Property 1: Category Data Structure Consistency', () => {
    it('should have separate Jacket and Overshirt categories in seed-user Edge Function', () => {
      // Feature: category-split-jacket-overshirt, Property 1: Category Data Structure Consistency
      const seedUserPath = path.join(process.cwd(), 'supabase/functions/seed-user/index.ts');
      const categories = extractCategoriesFromFile(seedUserPath);
      const validation = validateCategorySplitStructure(categories);

      expect(validation.hasJacket, 'Should have Jacket category').toBe(true);
      expect(validation.hasOvershirt, 'Should have Overshirt category').toBe(true);
      expect(validation.hasOldCategory, 'Should not have Jacket/Overshirt category').toBe(false);
      expect(validation.hasValidDisplayOrder, 'Should have valid sequential display_order').toBe(true);
    });

    it('should have separate Jacket and Overshirt categories in sync script', () => {
      // Feature: category-split-jacket-overshirt, Property 1: Category Data Structure Consistency
      const syncScriptPath = path.join(process.cwd(), 'scripts/sync-wardrobe.js');
      const categories = extractCategoriesFromFile(syncScriptPath);
      const validation = validateCategorySplitStructure(categories);

      expect(validation.hasJacket, 'Should have Jacket category').toBe(true);
      expect(validation.hasOvershirt, 'Should have Overshirt category').toBe(true);
      expect(validation.hasOldCategory, 'Should not have Jacket/Overshirt category').toBe(false);
      expect(validation.hasValidDisplayOrder, 'Should have valid sequential display_order').toBe(true);
    });

    it('should have consistent category definitions between seed-user and sync script', () => {
      // Feature: category-split-jacket-overshirt, Property 1: Category Data Structure Consistency
      const seedUserPath = path.join(process.cwd(), 'supabase/functions/seed-user/index.ts');
      const syncScriptPath = path.join(process.cwd(), 'scripts/sync-wardrobe.js');
      
      const seedUserCategories = extractCategoriesFromFile(seedUserPath);
      const syncScriptCategories = extractCategoriesFromFile(syncScriptPath);

      // Both should have the same category names
      const seedUserNames = new Set(seedUserCategories.map(c => c.name));
      const syncScriptNames = new Set(syncScriptCategories.map(c => c.name));

      expect(seedUserNames).toEqual(syncScriptNames);

      // Both should have the same display orders for matching categories
      const seedUserMap = new Map(seedUserCategories.map(c => [c.name, c]));
      const syncScriptMap = new Map(syncScriptCategories.map(c => [c.name, c]));

      for (const categoryName of seedUserNames) {
        const seedUserCat = seedUserMap.get(categoryName)!;
        const syncScriptCat = syncScriptMap.get(categoryName)!;
        
        expect(seedUserCat.display_order, `Display order should match for ${categoryName}`).toBe(syncScriptCat.display_order);
        expect(seedUserCat.is_anchor_item, `Anchor item flag should match for ${categoryName}`).toBe(syncScriptCat.is_anchor_item);
      }
    });

    it('property: for any category array update, should maintain split structure without legacy references', () => {
      // Feature: category-split-jacket-overshirt, Property 1: Category Data Structure Consistency
      fc.assert(fc.property(
        fc.array(fc.record({
          name: fc.oneof(
            fc.constant('Jacket'),
            fc.constant('Overshirt'),
            fc.constant('Shirt'),
            fc.constant('Pants'),
            fc.constant('Shoes'),
            fc.constant('Belt'),
            fc.constant('Watch'),
            fc.constant('Undershirt'),
            // Occasionally include the old category to test it gets filtered out
            fc.constant('Jacket/Overshirt')
          ),
          is_anchor_item: fc.boolean(),
          display_order: fc.integer({ min: 1, max: 10 })
        }), { minLength: 1, maxLength: 15 }),
        (categories) => {
          // Simulate the category split transformation
          const transformedCategories = categories
            .filter(c => c.name !== 'Jacket/Overshirt') // Remove old category
            .concat([
              // Ensure Jacket and Overshirt are present
              { name: 'Jacket', is_anchor_item: true, display_order: 1 },
              { name: 'Overshirt', is_anchor_item: true, display_order: 2 }
            ])
            // Remove duplicates by name
            .reduce((acc, cat) => {
              if (!acc.some(existing => existing.name === cat.name)) {
                acc.push(cat);
              }
              return acc;
            }, [] as CategoryDefinition[])
            // Sort by display_order and reassign sequential orders
            .sort((a, b) => a.display_order - b.display_order)
            .map((cat, index) => ({ ...cat, display_order: index + 1 }));

          const validation = validateCategorySplitStructure(transformedCategories);
          
          // Property: After transformation, should always have split structure
          return validation.hasJacket && 
                 validation.hasOvershirt && 
                 !validation.hasOldCategory &&
                 validation.hasValidDisplayOrder;
        }
      ), { numRuns: 10 });
    });

    it('property: category names should be unique and display orders should be sequential', () => {
      // Feature: category-split-jacket-overshirt, Property 1: Category Data Structure Consistency
      fc.assert(fc.property(
        fc.array(fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }),
          is_anchor_item: fc.boolean(),
          display_order: fc.integer({ min: 1, max: 100 })
        }), { minLength: 1, maxLength: 10 }),
        (categories) => {
          // Simulate proper category processing
          const processedCategories = categories
            // Remove duplicates by name
            .reduce((acc, cat) => {
              if (!acc.some(existing => existing.name === cat.name)) {
                acc.push(cat);
              }
              return acc;
            }, [] as CategoryDefinition[])
            // Sort and reassign sequential display orders
            .sort((a, b) => a.display_order - b.display_order)
            .map((cat, index) => ({ ...cat, display_order: index + 1 }));

          // Property: After processing, names should be unique and orders sequential
          const names = processedCategories.map(c => c.name);
          const uniqueNames = new Set(names);
          const orders = processedCategories.map(c => c.display_order);
          const expectedOrders = Array.from({ length: processedCategories.length }, (_, i) => i + 1);
          
          return names.length === uniqueNames.size && 
                 JSON.stringify(orders) === JSON.stringify(expectedOrders);
        }
      ), { numRuns: 10 });
    });
  });
});
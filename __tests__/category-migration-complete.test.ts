/**
 * Property-Based Tests for Complete Category Migration
 * 
 * Tests Property 3: Complete Migration Without Data Loss
 * Validates: Requirements 1.6, 6.5, 8.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { WardrobeItemClassifier } from '../lib/utils/wardrobe-item-classifier.js';

// Mock database state for testing
interface MockCategory {
  id: string;
  user_id: string;
  name: string;
  is_anchor_item: boolean;
  display_order: number;
}

interface MockWardrobeItem {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  brand?: string;
  color?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  active: boolean;
}

interface MockDatabaseState {
  categories: MockCategory[];
  wardrobe_items: MockWardrobeItem[];
}

interface MigrationResult {
  success: boolean;
  itemsMigrated: {
    jacket: number;
    overshirt: number;
    total: number;
  };
  classifications: Array<{
    itemId: string;
    itemName: string;
    originalCategory: string;
    newCategory: string;
    reason: string;
  }>;
  errors: string[];
}

/**
 * Simulate complete category migration on mock database state
 */
function simulateCompleteMigration(
  userId: string,
  oldCategoryId: string,
  initialState: MockDatabaseState
): { migratedState: MockDatabaseState; result: MigrationResult } {
  const classifier = new WardrobeItemClassifier();
  const migratedState: MockDatabaseState = {
    categories: [...initialState.categories],
    wardrobe_items: [...initialState.wardrobe_items]
  };

  const result: MigrationResult = {
    success: false,
    itemsMigrated: { jacket: 0, overshirt: 0, total: 0 },
    classifications: [],
    errors: []
  };

  try {
    // Step 1: Create new categories
    const jacketCategory: MockCategory = {
      id: `jacket-${userId}`,
      user_id: userId,
      name: 'Jacket',
      is_anchor_item: true,
      display_order: 1
    };

    const overshirtCategory: MockCategory = {
      id: `overshirt-${userId}`,
      user_id: userId,
      name: 'Overshirt',
      is_anchor_item: true,
      display_order: 2
    };

    migratedState.categories.push(jacketCategory, overshirtCategory);

    // Step 2: Migrate items
    const itemsToMigrate = migratedState.wardrobe_items.filter(item => 
      item.user_id === userId && 
      item.category_id === oldCategoryId && 
      item.active
    );

    result.itemsMigrated.total = itemsToMigrate.length;

    for (const item of itemsToMigrate) {
      const classification = classifier.classifyItem(item);
      const reason = classifier.getClassificationReason(item);
      const newCategoryId = classification === 'Jacket' ? jacketCategory.id : overshirtCategory.id;
      
      // Update item's category
      const itemIndex = migratedState.wardrobe_items.findIndex(i => i.id === item.id);
      if (itemIndex !== -1) {
        migratedState.wardrobe_items[itemIndex] = {
          ...item,
          category_id: newCategoryId
        };

        result.classifications.push({
          itemId: item.id,
          itemName: item.name,
          originalCategory: 'Jacket/Overshirt',
          newCategory: classification,
          reason: reason
        });

        if (classification === 'Jacket') {
          result.itemsMigrated.jacket++;
        } else {
          result.itemsMigrated.overshirt++;
        }
      }
    }

    // Step 3: Remove old category
    const oldCategoryIndex = migratedState.categories.findIndex(cat => cat.id === oldCategoryId);
    if (oldCategoryIndex !== -1) {
      migratedState.categories.splice(oldCategoryIndex, 1);
    }

    // Step 4: Update display orders
    const userCategories = migratedState.categories.filter(cat => cat.user_id === userId);
    const displayOrderMap: Record<string, number> = {
      'Jacket': 1,
      'Overshirt': 2,
      'Shirt': 3,
      'Pants': 4,
      'Shoes': 5,
      'Belt': 6,
      'Watch': 7,
      'Undershirt': 8
    };

    for (const category of userCategories) {
      const newOrder = displayOrderMap[category.name];
      if (newOrder !== undefined) {
        category.display_order = newOrder;
      }
    }

    result.success = true;

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return { migratedState, result };
}

describe('Category Migration Complete Property Tests', () => {
  /**
   * Property 3: Complete Migration Without Data Loss
   * For any migration operation, all wardrobe items originally in "Jacket/Overshirt" category 
   * should be migrated to either "Jacket" or "Overshirt", with no items remaining in the old 
   * category and no items lost
   */
  it('Property 3: Complete Migration Without Data Loss', async () => {
    await fc.assert(
      fc.property(
        // Generate random wardrobe items for the old category
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
          items: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              brand: fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0)),
              color: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)),
              formality_score: fc.option(fc.integer({ min: 1, max: 10 })),
              capsule_tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { maxLength: 5 })),
              season: fc.option(fc.array(fc.constantFrom('Spring', 'Summer', 'Fall', 'Winter'), { maxLength: 4 }))
            }),
            { minLength: 0, maxLength: 20 }
          ).map(items => {
            // Ensure unique IDs by adding index suffix if needed
            const seenIds = new Set<string>();
            return items.map((item, index) => {
              let uniqueId = item.id;
              let counter = 0;
              while (seenIds.has(uniqueId)) {
                counter++;
                uniqueId = `${item.id}_${counter}`;
              }
              seenIds.add(uniqueId);
              return { ...item, id: uniqueId };
            });
          })
        }),
        (testData) => {
          const userId = testData.userId;
          const oldCategoryId = `old-cat-${userId}`;

          // Create initial database state
          const initialState: MockDatabaseState = {
            categories: [
              {
                id: oldCategoryId,
                user_id: userId,
                name: 'Jacket/Overshirt',
                is_anchor_item: true,
                display_order: 1
              }
            ],
            wardrobe_items: testData.items.map(itemData => ({
              id: itemData.id,
              user_id: userId,
              category_id: oldCategoryId,
              name: itemData.name,
              brand: itemData.brand || undefined,
              color: itemData.color || undefined,
              formality_score: itemData.formality_score || undefined,
              capsule_tags: itemData.capsule_tags || undefined,
              season: itemData.season || undefined,
              active: true
            }))
          };

          const originalItemCount = testData.items.length;

          // Perform the migration
          const { migratedState, result } = simulateCompleteMigration(userId, oldCategoryId, initialState);

          // Verify migration success
          expect(result.success).toBe(true);
          expect(result.errors).toHaveLength(0);

          // Verify no items lost: total items migrated should equal original count
          expect(result.itemsMigrated.total).toBe(originalItemCount);

          // Verify all items are accounted for in new categories
          const jacketCount = result.itemsMigrated.jacket;
          const overshirtCount = result.itemsMigrated.overshirt;
          expect(jacketCount + overshirtCount).toBe(originalItemCount);

          // Verify no items remain in old category
          const remainingItems = migratedState.wardrobe_items.filter(item =>
            item.user_id === userId && 
            item.category_id === oldCategoryId && 
            item.active
          );
          expect(remainingItems).toHaveLength(0);

          // Verify old category is removed
          const oldCategories = migratedState.categories.filter(cat => 
            cat.user_id === userId && cat.name === 'Jacket/Overshirt'
          );
          expect(oldCategories).toHaveLength(0);

          // Verify new categories exist
          const newCategories = migratedState.categories.filter(cat => 
            cat.user_id === userId && (cat.name === 'Jacket' || cat.name === 'Overshirt')
          );
          expect(newCategories).toHaveLength(2);

          const categoryNames = new Set(newCategories.map(cat => cat.name));
          expect(categoryNames.has('Jacket')).toBe(true);
          expect(categoryNames.has('Overshirt')).toBe(true);

          // Verify all items are now in new categories
          const allUserItems = migratedState.wardrobe_items.filter(item => 
            item.user_id === userId && item.active
          );
          expect(allUserItems).toHaveLength(originalItemCount);

          // All items should be in either Jacket or Overshirt category
          const newCategoryIds = new Set(newCategories.map(cat => cat.id));
          for (const item of allUserItems) {
            expect(newCategoryIds.has(item.category_id)).toBe(true);
          }

          // Verify classification consistency
          const classifier = new WardrobeItemClassifier();
          for (const classification of result.classifications) {
            // Find the original item data
            const originalItem = testData.items.find(item => item.id === classification.itemId);
            if (originalItem) {
              // Re-classify the item and verify it matches the migration result
              const mockItem = {
                id: originalItem.id,
                name: originalItem.name,
                brand: originalItem.brand,
                color: originalItem.color,
                formality_score: originalItem.formality_score,
                capsule_tags: originalItem.capsule_tags,
                season: originalItem.season
              } as any;
              
              const expectedCategory = classifier.classifyItem(mockItem);
              expect(classification.newCategory).toBe(expectedCategory);
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Edge case: Migration with no items should still create categories and remove old category
   */
  it('Property 3 Edge Case: Migration with empty category completes successfully', () => {
    const userId = 'test-user';
    const oldCategoryId = `old-cat-${userId}`;

    const initialState: MockDatabaseState = {
      categories: [
        {
          id: oldCategoryId,
          user_id: userId,
          name: 'Jacket/Overshirt',
          is_anchor_item: true,
          display_order: 1
        }
      ],
      wardrobe_items: []
    };

    // Perform migration with no items in the old category
    const { migratedState, result } = simulateCompleteMigration(userId, oldCategoryId, initialState);

    // Verify migration success even with no items
    expect(result.success).toBe(true);
    expect(result.itemsMigrated.total).toBe(0);
    expect(result.itemsMigrated.jacket).toBe(0);
    expect(result.itemsMigrated.overshirt).toBe(0);

    // Verify old category is removed
    const oldCategories = migratedState.categories.filter(cat => 
      cat.user_id === userId && cat.name === 'Jacket/Overshirt'
    );
    expect(oldCategories).toHaveLength(0);

    // Verify new categories exist
    const newCategories = migratedState.categories.filter(cat => 
      cat.user_id === userId && (cat.name === 'Jacket' || cat.name === 'Overshirt')
    );
    expect(newCategories).toHaveLength(2);
  });

  /**
   * Edge case: Items with special characters and edge case data should migrate correctly
   */
  it('Property 3 Edge Case: Items with special characters migrate without data corruption', () => {
    const userId = 'test-user';
    const oldCategoryId = `old-cat-${userId}`;

    const specialItems = [
      { 
        id: 'item1',
        name: 'Café Racer Jacket (Vintage)', 
        brand: 'Schöne Marke', 
        color: 'Röd',
        capsule_tags: ['special-chars', 'ümlaut', 'café'] 
      },
      { 
        id: 'item2',
        name: 'Shirt with "Quotes" & Symbols', 
        brand: 'Brand & Co.', 
        formality_score: 5 
      },
      { 
        id: 'item3',
        name: '100% Cotton Overshirt', 
        brand: undefined, 
        color: undefined 
      }
    ];

    const initialState: MockDatabaseState = {
      categories: [
        {
          id: oldCategoryId,
          user_id: userId,
          name: 'Jacket/Overshirt',
          is_anchor_item: true,
          display_order: 1
        }
      ],
      wardrobe_items: specialItems.map(itemData => ({
        id: itemData.id,
        user_id: userId,
        category_id: oldCategoryId,
        name: itemData.name,
        brand: itemData.brand,
        color: itemData.color,
        formality_score: itemData.formality_score,
        capsule_tags: itemData.capsule_tags,
        active: true
      }))
    };

    // Perform migration
    const { migratedState, result } = simulateCompleteMigration(userId, oldCategoryId, initialState);
    
    expect(result.success).toBe(true);
    expect(result.itemsMigrated.total).toBe(specialItems.length);

    // Verify all items still exist with correct data
    const migratedItems = migratedState.wardrobe_items.filter(item => 
      item.user_id === userId && item.active
    );
    expect(migratedItems).toHaveLength(specialItems.length);

    // Verify data integrity for each item
    for (const originalItem of specialItems) {
      const migratedItem = migratedItems.find(item => item.id === originalItem.id);
      expect(migratedItem).toBeDefined();
      expect(migratedItem!.name).toBe(originalItem.name);
      expect(migratedItem!.brand).toBe(originalItem.brand);
      expect(migratedItem!.color).toBe(originalItem.color);
      expect(migratedItem!.formality_score).toBe(originalItem.formality_score);
      expect(migratedItem!.capsule_tags).toEqual(originalItem.capsule_tags);
    }
  });

  /**
   * Edge case: Classification determinism - same item should always get same classification
   */
  it('Property 3 Edge Case: Classification is deterministic', () => {
    const classifier = new WardrobeItemClassifier();
    
    const testItem = {
      id: 'test-item',
      name: 'Leather Jacket',
      formality_score: 7,
      brand: 'Test Brand'
    } as any;

    // Classify the same item multiple times
    const classifications = Array.from({ length: 10 }, () => classifier.classifyItem(testItem));
    
    // All classifications should be identical
    const firstClassification = classifications[0];
    for (const classification of classifications) {
      expect(classification).toBe(firstClassification);
    }
  });
});

// Feature: category-split-jacket-overshirt, Property 3: Complete Migration Without Data Loss
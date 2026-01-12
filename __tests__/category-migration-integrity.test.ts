/**
 * Property-Based Tests for Database Integrity After Migration
 * 
 * Tests Property 6: Database Integrity After Migration
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
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
  material?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface MockDatabaseState {
  categories: MockCategory[];
  wardrobe_items: MockWardrobeItem[];
}

/**
 * Simulate category migration on mock database state
 */
function simulateCategoryMigration(initialState: MockDatabaseState): MockDatabaseState {
  const classifier = new WardrobeItemClassifier();
  const newState: MockDatabaseState = {
    categories: [...initialState.categories],
    wardrobe_items: [...initialState.wardrobe_items]
  };

  // Find users with "Jacket/Overshirt" category
  const oldCategories = newState.categories.filter(cat => cat.name === 'Jacket/Overshirt');
  const usersWithOldCategory = new Set(oldCategories.map(cat => cat.user_id));

  for (const userId of usersWithOldCategory) {
    const oldCategory = newState.categories.find(cat => 
      cat.user_id === userId && cat.name === 'Jacket/Overshirt'
    );

    if (!oldCategory) continue;

    // Create new categories for this user
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

    // Add new categories
    newState.categories.push(jacketCategory, overshirtCategory);

    // Migrate items from old category to new categories
    const itemsToMigrate = newState.wardrobe_items.filter(item => 
      item.user_id === userId && 
      item.category_id === oldCategory.id && 
      item.active
    );

    for (const item of itemsToMigrate) {
      const classification = classifier.classifyItem(item);
      const newCategoryId = classification === 'Jacket' ? jacketCategory.id : overshirtCategory.id;
      
      // Update item's category
      const itemIndex = newState.wardrobe_items.findIndex(i => i.id === item.id);
      if (itemIndex !== -1) {
        newState.wardrobe_items[itemIndex] = {
          ...item,
          category_id: newCategoryId
        };
      }
    }

    // Remove old category
    const oldCategoryIndex = newState.categories.findIndex(cat => cat.id === oldCategory.id);
    if (oldCategoryIndex !== -1) {
      newState.categories.splice(oldCategoryIndex, 1);
    }

    // Update display orders for remaining categories
    const userCategories = newState.categories.filter(cat => cat.user_id === userId);
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
  }

  return newState;
}

/**
 * Validate database integrity after migration
 */
function validateDatabaseIntegrity(state: MockDatabaseState): {
  isValid: boolean;
  errors: string[];
  statistics: {
    totalCategories: number;
    totalItems: number;
    orphanedItems: number;
    usersWithOldCategory: number;
    usersWithNewCategories: number;
  };
} {
  const result = {
    isValid: false,
    errors: [] as string[],
    statistics: {
      totalCategories: state.categories.length,
      totalItems: state.wardrobe_items.filter(item => item.active).length,
      orphanedItems: 0,
      usersWithOldCategory: 0,
      usersWithNewCategories: 0
    }
  };

  // Check for old categories that should have been removed
  const oldCategories = state.categories.filter(cat => cat.name === 'Jacket/Overshirt');
  result.statistics.usersWithOldCategory = new Set(oldCategories.map(cat => cat.user_id)).size;

  if (oldCategories.length > 0) {
    result.errors.push(`${oldCategories.length} "Jacket/Overshirt" categories still exist`);
  }

  // Count users who have BOTH Jacket and Overshirt categories
  const usersWithJacket = new Set(
    state.categories.filter(cat => cat.name === 'Jacket').map(cat => cat.user_id)
  );
  const usersWithOvershirt = new Set(
    state.categories.filter(cat => cat.name === 'Overshirt').map(cat => cat.user_id)
  );
  
  // Users with new categories are those who have BOTH Jacket and Overshirt
  const usersWithBothCategories = [...usersWithJacket].filter(userId => 
    usersWithOvershirt.has(userId)
  );
  result.statistics.usersWithNewCategories = usersWithBothCategories.length;

  // Check for orphaned items (items with invalid category references)
  const categoryIds = new Set(state.categories.map(cat => cat.id));
  const orphanedItems = state.wardrobe_items.filter(item => 
    item.active && !categoryIds.has(item.category_id)
  );
  result.statistics.orphanedItems = orphanedItems.length;

  if (orphanedItems.length > 0) {
    result.errors.push(`${orphanedItems.length} items have invalid category references`);
  }

  // Check that all users have both new categories if they had the old one
  // Find users who have either category but not both
  const allUsersWithEitherCategory = new Set([...usersWithJacket, ...usersWithOvershirt]);
  
  for (const userId of allUsersWithEitherCategory) {
    if (!usersWithJacket.has(userId)) {
      result.errors.push(`User ${userId} missing "Jacket" category`);
    }
    if (!usersWithOvershirt.has(userId)) {
      result.errors.push(`User ${userId} missing "Overshirt" category`);
    }
  }

  // Check display orders are correct
  for (const userId of usersWithBothCategories) {
    const jacketCategory = state.categories.find(cat => 
      cat.user_id === userId && cat.name === 'Jacket'
    );
    const overshirtCategory = state.categories.find(cat => 
      cat.user_id === userId && cat.name === 'Overshirt'
    );

    if (jacketCategory && jacketCategory.display_order !== 1) {
      result.errors.push(`User ${userId} "Jacket" category has incorrect display_order: ${jacketCategory.display_order}`);
    }
    if (overshirtCategory && overshirtCategory.display_order !== 2) {
      result.errors.push(`User ${userId} "Overshirt" category has incorrect display_order: ${overshirtCategory.display_order}`);
    }
  }

  // Check that items are properly classified
  const classifier = new WardrobeItemClassifier();
  for (const item of state.wardrobe_items.filter(item => item.active)) {
    const category = state.categories.find(cat => cat.id === item.category_id);
    if (category && (category.name === 'Jacket' || category.name === 'Overshirt')) {
      const expectedCategory = classifier.classifyItem(item);
      if (category.name !== expectedCategory) {
        result.errors.push(`Item ${item.id} in wrong category: expected ${expectedCategory}, got ${category.name}`);
      }
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

describe('Database Integrity After Migration Property Tests', () => {
  /**
   * Property 6: Database Integrity After Migration
   * For any database operation after migration, no references to "Jacket/Overshirt" category 
   * should exist, all category references should be valid, and queries by new categories 
   * should return correct results
   */
  it('Property 6: Database Integrity After Migration', () => {
    fc.assert(
      fc.property(
        // Generate random database state with users and categories
        fc.record({
          users: fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }).map((s, index) => `user-${s}-${index}`),
              hasOldCategory: fc.boolean()
            }),
            { minLength: 1, maxLength: 10 }
          ).map(users => {
            // Ensure unique user IDs
            const uniqueUsers = users.map((user, index) => ({
              ...user,
              id: `user-${index}-${user.id.replace(/[^a-zA-Z0-9]/g, '')}`
            }));
            return uniqueUsers;
          }),
          itemsPerUser: fc.integer({ min: 0, max: 15 })
        }),
        (testData) => {
          // Create initial database state
          const initialState: MockDatabaseState = {
            categories: [],
            wardrobe_items: []
          };

          // Create categories for each user
          for (const user of testData.users) {
            if (user.hasOldCategory) {
              // User has old "Jacket/Overshirt" category
              initialState.categories.push({
                id: `old-cat-${user.id}`,
                user_id: user.id,
                name: 'Jacket/Overshirt',
                is_anchor_item: true,
                display_order: 1
              });

              // Create some items in the old category
              for (let i = 0; i < testData.itemsPerUser; i++) {
                const itemNames = [
                  'Leather Jacket', 'Cotton Overshirt', 'Wool Blazer', 'Denim Jacket',
                  'Cardigan', 'Bomber Jacket', 'Flannel Shirt', 'Pea Coat'
                ];
                const randomName = itemNames[i % itemNames.length];
                
                initialState.wardrobe_items.push({
                  id: `item-${user.id}-${i}`,
                  user_id: user.id,
                  category_id: `old-cat-${user.id}`,
                  name: `${randomName} ${i}`,
                  formality_score: Math.floor(Math.random() * 10) + 1,
                  active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            } else {
              // User already has new categories
              initialState.categories.push(
                {
                  id: `jacket-${user.id}`,
                  user_id: user.id,
                  name: 'Jacket',
                  is_anchor_item: true,
                  display_order: 1
                },
                {
                  id: `overshirt-${user.id}`,
                  user_id: user.id,
                  name: 'Overshirt',
                  is_anchor_item: true,
                  display_order: 2
                }
              );
            }

            // Add other standard categories
            const otherCategories = ['Shirt', 'Pants', 'Shoes', 'Belt', 'Watch'];
            for (let i = 0; i < otherCategories.length; i++) {
              initialState.categories.push({
                id: `${otherCategories[i].toLowerCase()}-${user.id}`,
                user_id: user.id,
                name: otherCategories[i],
                is_anchor_item: i < 2, // Shirt and Pants are anchor items
                display_order: (user.hasOldCategory ? 2 : 3) + i
              });
            }
          }

          // Perform migration simulation
          const migratedState = simulateCategoryMigration(initialState);

          // Validate database integrity after migration
          const integrityResult = validateDatabaseIntegrity(migratedState);

          // Assert that database integrity is maintained
          expect(integrityResult.isValid).toBe(true);
          expect(integrityResult.errors).toHaveLength(0);

          // Verify no old categories remain
          expect(integrityResult.statistics.usersWithOldCategory).toBe(0);

          // Verify no orphaned items
          expect(integrityResult.statistics.orphanedItems).toBe(0);

          // Verify all users who had old categories now have new categories
          const usersWithOldCategory = testData.users.filter(u => u.hasOldCategory);
          const usersWithoutOldCategory = testData.users.filter(u => !u.hasOldCategory);
          
          // Total users with new categories should be:
          // - Users who had old categories (migrated) + Users who already had new categories
          const expectedUsersWithNewCategories = usersWithOldCategory.length + usersWithoutOldCategory.length;
          expect(integrityResult.statistics.usersWithNewCategories).toBe(expectedUsersWithNewCategories);

          // Verify total item count is preserved
          const originalActiveItems = initialState.wardrobe_items.filter(item => item.active).length;
          const migratedActiveItems = migratedState.wardrobe_items.filter(item => item.active).length;
          expect(migratedActiveItems).toBe(originalActiveItems);

          // Verify all category references are valid
          const categoryIds = new Set(migratedState.categories.map(cat => cat.id));
          for (const item of migratedState.wardrobe_items.filter(item => item.active)) {
            expect(categoryIds.has(item.category_id)).toBe(true);
          }

          // Verify no "Jacket/Overshirt" categories exist
          const oldCategories = migratedState.categories.filter(cat => cat.name === 'Jacket/Overshirt');
          expect(oldCategories).toHaveLength(0);

          // Verify proper category structure for users who had migration
          for (const user of usersWithOldCategory) {
            const userCategories = migratedState.categories.filter(cat => cat.user_id === user.id);
            const categoryNames = new Set(userCategories.map(cat => cat.name));
            
            expect(categoryNames.has('Jacket')).toBe(true);
            expect(categoryNames.has('Overshirt')).toBe(true);
            expect(categoryNames.has('Jacket/Overshirt')).toBe(false);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Edge case: Empty database should remain valid after migration
   */
  it('Property 6 Edge Case: Empty database maintains integrity', () => {
    const emptyState: MockDatabaseState = {
      categories: [],
      wardrobe_items: []
    };

    const migratedState = simulateCategoryMigration(emptyState);
    const integrityResult = validateDatabaseIntegrity(migratedState);

    expect(integrityResult.isValid).toBe(true);
    expect(integrityResult.errors).toHaveLength(0);
    expect(integrityResult.statistics.totalCategories).toBe(0);
    expect(integrityResult.statistics.totalItems).toBe(0);
    expect(integrityResult.statistics.orphanedItems).toBe(0);
  });

  /**
   * Edge case: Database with only new categories should remain unchanged
   */
  it('Property 6 Edge Case: Database with only new categories remains unchanged', () => {
    const stateWithNewCategories: MockDatabaseState = {
      categories: [
        {
          id: 'jacket-user1',
          user_id: 'user1',
          name: 'Jacket',
          is_anchor_item: true,
          display_order: 1
        },
        {
          id: 'overshirt-user1',
          user_id: 'user1',
          name: 'Overshirt',
          is_anchor_item: true,
          display_order: 2
        }
      ],
      wardrobe_items: [
        {
          id: 'item1',
          user_id: 'user1',
          category_id: 'jacket-user1',
          name: 'Leather Jacket', // This will be classified as Jacket
          formality_score: 7,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };

    const migratedState = simulateCategoryMigration(stateWithNewCategories);
    const integrityResult = validateDatabaseIntegrity(migratedState);

    expect(integrityResult.isValid).toBe(true);
    expect(integrityResult.errors).toHaveLength(0);
    
    // State should be unchanged since no old categories exist
    expect(migratedState.categories).toHaveLength(stateWithNewCategories.categories.length);
    expect(migratedState.wardrobe_items).toHaveLength(stateWithNewCategories.wardrobe_items.length);
    
    // Verify the user has both new categories
    expect(integrityResult.statistics.usersWithNewCategories).toBe(1);
  });

  /**
   * Edge case: Multiple users with mixed category states
   */
  it('Property 6 Edge Case: Multiple users with mixed states maintain integrity', () => {
    const mixedState: MockDatabaseState = {
      categories: [
        // User 1 has old category
        {
          id: 'old-cat-user1',
          user_id: 'user1',
          name: 'Jacket/Overshirt',
          is_anchor_item: true,
          display_order: 1
        },
        // User 2 already has new categories
        {
          id: 'jacket-user2',
          user_id: 'user2',
          name: 'Jacket',
          is_anchor_item: true,
          display_order: 1
        },
        {
          id: 'overshirt-user2',
          user_id: 'user2',
          name: 'Overshirt',
          is_anchor_item: true,
          display_order: 2
        }
      ],
      wardrobe_items: [
        {
          id: 'item1',
          user_id: 'user1',
          category_id: 'old-cat-user1',
          name: 'Leather Jacket',
          formality_score: 7,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'item2',
          user_id: 'user2',
          category_id: 'jacket-user2',
          name: 'Blazer',
          formality_score: 8,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };

    const migratedState = simulateCategoryMigration(mixedState);
    const integrityResult = validateDatabaseIntegrity(migratedState);

    expect(integrityResult.isValid).toBe(true);
    expect(integrityResult.errors).toHaveLength(0);

    // User 1 should now have new categories
    const user1Categories = migratedState.categories.filter(cat => cat.user_id === 'user1');
    const user1CategoryNames = new Set(user1Categories.map(cat => cat.name));
    expect(user1CategoryNames.has('Jacket')).toBe(true);
    expect(user1CategoryNames.has('Overshirt')).toBe(true);
    expect(user1CategoryNames.has('Jacket/Overshirt')).toBe(false);

    // User 2 categories should be unchanged
    const user2Categories = migratedState.categories.filter(cat => cat.user_id === 'user2');
    expect(user2Categories).toHaveLength(2);

    // All items should have valid category references
    expect(integrityResult.statistics.orphanedItems).toBe(0);
  });

  /**
   * Classification consistency test
   */
  it('Property 6 Edge Case: Item classification consistency is maintained', () => {
    
    // Test items with known classifications
    const testItems = [
      { name: 'Leather Jacket', formality_score: 7, expectedCategory: 'Jacket' },
      { name: 'Cotton Overshirt', formality_score: 4, expectedCategory: 'Overshirt' },
      { name: 'Wool Blazer', formality_score: 9, expectedCategory: 'Jacket' },
      { name: 'Cardigan', formality_score: 5, expectedCategory: 'Overshirt' }
    ];

    const testState: MockDatabaseState = {
      categories: [
        {
          id: 'old-cat-user1',
          user_id: 'user1',
          name: 'Jacket/Overshirt',
          is_anchor_item: true,
          display_order: 1
        }
      ],
      wardrobe_items: testItems.map((item, index) => ({
        id: `item${index}`,
        user_id: 'user1',
        category_id: 'old-cat-user1',
        name: item.name,
        formality_score: item.formality_score,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    };

    const migratedState = simulateCategoryMigration(testState);
    const integrityResult = validateDatabaseIntegrity(migratedState);

    expect(integrityResult.isValid).toBe(true);
    expect(integrityResult.errors).toHaveLength(0);

    // Verify each item is in the correct category
    for (let i = 0; i < testItems.length; i++) {
      const migratedItem = migratedState.wardrobe_items[i];
      const category = migratedState.categories.find(cat => cat.id === migratedItem.category_id);
      const expectedCategory = testItems[i].expectedCategory;
      
      expect(category?.name).toBe(expectedCategory);
    }
  });
});

// Feature: category-split-jacket-overshirt, Property 6: Database Integrity After Migration
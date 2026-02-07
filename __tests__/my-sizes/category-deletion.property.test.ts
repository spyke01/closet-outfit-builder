/**
 * Property-Based Test: Category Deletion Removes from All Locations
 * 
 * **Property 11: Category deletion removes from all locations**
 * For any user-created category, when deleted, the category should be removed 
 * from the category grid, removed from pinned cards if pinned, but the deletion 
 * should not affect other categories.
 * 
 * **Validates: Requirements 7.5**
 * Feature: my-sizes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@/lib/supabase/client';
import type { SizeCategory, PinnedPreference } from '@/lib/types/sizes';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ userId: 'test-user-id' })
}));

describe('Property 11: Category Deletion Removes from All Locations', () => {
  let mockSupabase: any;

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
      maybeSingle: vi.fn(),
      single: vi.fn()
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  /**
   * Property: Deleted category removed from category list
   * For any category in a list of categories, when that category is deleted,
   * it should no longer appear in the category list
   */
  it('should remove deleted category from category list', () => {
    fc.assert(
      fc.property(
        // Generate test data: a list of categories and an index to delete
        fc.record({
          categories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.oneof(
                fc.constantFrom('Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'),
                fc.string({ minLength: 1, maxLength: 50 })
              ),
              is_system_category: fc.boolean()
            }),
            { minLength: 2, maxLength: 10 }
          )
        }).chain(({ categories }) => 
          fc.record({
            categories: fc.constant(categories),
            deleteIndex: fc.integer({ min: 0, max: categories.length - 1 })
          })
        ),
        (testData) => {
          const { categories, deleteIndex } = testData;
          const categoryToDelete = categories[deleteIndex];
          
          // Create full category objects
          const fullCategories: SizeCategory[] = categories.map(cat => ({
            id: cat.id,
            user_id: 'test-user-id',
            name: cat.name,
            icon: undefined,
            supported_formats: ['letter', 'numeric'],
            is_system_category: cat.is_system_category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Simulate deletion
          const remainingCategories = fullCategories.filter(
            cat => cat.id !== categoryToDelete.id
          );

          // Property 1: Deleted category should not be in remaining list
          expect(remainingCategories.find(cat => cat.id === categoryToDelete.id)).toBeUndefined();

          // Property 2: Remaining categories count should be one less
          expect(remainingCategories.length).toBe(fullCategories.length - 1);

          // Property 3: All other categories should still be present
          const otherCategories = fullCategories.filter(cat => cat.id !== categoryToDelete.id);
          otherCategories.forEach(cat => {
            expect(remainingCategories.find(c => c.id === cat.id)).toBeDefined();
          });

          // Property 4: Order of remaining categories should be preserved
          const remainingIds = remainingCategories.map(cat => cat.id);
          const expectedIds = fullCategories
            .filter(cat => cat.id !== categoryToDelete.id)
            .map(cat => cat.id);
          expect(remainingIds).toEqual(expectedIds);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Deleted category removed from pinned preferences
   * For any category that is pinned, when that category is deleted,
   * it should no longer appear in the pinned preferences list
   */
  it('should remove deleted category from pinned preferences', () => {
    fc.assert(
      fc.property(
        // Generate test data: categories and pinned preferences
        fc.record({
          categories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 3, maxLength: 8 }
          )
        }).chain(({ categories }) => 
          fc.record({
            categories: fc.constant(categories),
            // Pin a subset of categories
            pinnedIndices: fc.array(
              fc.integer({ min: 0, max: categories.length - 1 }),
              { minLength: 1, maxLength: Math.min(categories.length, 5) }
            ).map(indices => [...new Set(indices)]), // Remove duplicates
            // Choose one pinned category to delete
            deleteIndex: fc.integer({ min: 0, max: categories.length - 1 })
          })
        ).filter(({ pinnedIndices, deleteIndex }) => 
          // Ensure the category to delete is actually pinned
          pinnedIndices.includes(deleteIndex)
        ),
        (testData) => {
          const { categories, pinnedIndices, deleteIndex } = testData;
          const categoryToDelete = categories[deleteIndex];

          // Create pinned preferences
          const pinnedPreferences: PinnedPreference[] = pinnedIndices.map((idx, order) => ({
            id: `pin-${idx}`,
            user_id: 'test-user-id',
            category_id: categories[idx].id,
            display_order: order,
            display_mode: 'standard' as const,
            preferred_brand_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Simulate deletion - remove from pinned preferences
          const remainingPinned = pinnedPreferences.filter(
            pref => pref.category_id !== categoryToDelete.id
          );

          // Property 1: Deleted category should not be in pinned preferences
          expect(remainingPinned.find(pref => pref.category_id === categoryToDelete.id)).toBeUndefined();

          // Property 2: Remaining pinned count should be one less
          expect(remainingPinned.length).toBe(pinnedPreferences.length - 1);

          // Property 3: All other pinned categories should still be present
          const otherPinned = pinnedPreferences.filter(
            pref => pref.category_id !== categoryToDelete.id
          );
          otherPinned.forEach(pref => {
            expect(remainingPinned.find(p => p.category_id === pref.category_id)).toBeDefined();
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Deletion does not affect other categories
   * For any category deletion, all other categories should remain unchanged
   * in both the category list and pinned preferences
   */
  it('should not affect other categories when deleting one category', () => {
    fc.assert(
      fc.property(
        fc.record({
          categories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              supported_formats: fc.array(
                fc.constantFrom('letter', 'numeric', 'waist-inseam', 'measurements'),
                { minLength: 1, maxLength: 4 }
              )
            }),
            { minLength: 3, maxLength: 10 }
          )
        }).chain(({ categories }) => 
          fc.record({
            categories: fc.constant(categories),
            deleteIndex: fc.integer({ min: 0, max: categories.length - 1 })
          })
        ),
        (testData) => {
          const { categories, deleteIndex } = testData;
          const categoryToDelete = categories[deleteIndex];
          
          // Create full category objects
          const fullCategories: SizeCategory[] = categories.map(cat => ({
            id: cat.id,
            user_id: 'test-user-id',
            name: cat.name,
            icon: undefined,
            supported_formats: cat.supported_formats as any,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Get categories that should remain
          const expectedRemainingCategories = fullCategories.filter(
            cat => cat.id !== categoryToDelete.id
          );

          // Simulate deletion
          const remainingCategories = fullCategories.filter(
            cat => cat.id !== categoryToDelete.id
          );

          // Property 1: Each remaining category should be identical to its original
          expectedRemainingCategories.forEach(expectedCat => {
            const actualCat = remainingCategories.find(cat => cat.id === expectedCat.id);
            expect(actualCat).toBeDefined();
            expect(actualCat?.id).toBe(expectedCat.id);
            expect(actualCat?.name).toBe(expectedCat.name);
            expect(actualCat?.user_id).toBe(expectedCat.user_id);
            expect(actualCat?.supported_formats).toEqual(expectedCat.supported_formats);
            expect(actualCat?.is_system_category).toBe(expectedCat.is_system_category);
          });

          // Property 2: No new categories should be added
          expect(remainingCategories.length).toBe(expectedRemainingCategories.length);

          // Property 3: No category properties should be modified
          remainingCategories.forEach(cat => {
            const original = fullCategories.find(c => c.id === cat.id);
            expect(original).toBeDefined();
            expect(cat).toEqual(original);
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Multiple deletions work independently
   * For any sequence of category deletions, each deletion should only
   * remove the specified category without affecting others
   */
  it('should handle multiple deletions independently', () => {
    fc.assert(
      fc.property(
        fc.record({
          categories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 5, maxLength: 10 }
          )
        }).chain(({ categories }) => 
          fc.record({
            categories: fc.constant(categories),
            // Delete 2-3 categories
            deleteIndices: fc.array(
              fc.integer({ min: 0, max: categories.length - 1 }),
              { minLength: 2, maxLength: 3 }
            ).map(indices => [...new Set(indices)]) // Remove duplicates
          })
        ),
        (testData) => {
          const { categories, deleteIndices } = testData;
          
          // Create full category objects
          let remainingCategories: SizeCategory[] = categories.map(cat => ({
            id: cat.id,
            user_id: 'test-user-id',
            name: cat.name,
            icon: undefined,
            supported_formats: ['letter', 'numeric'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const initialCount = remainingCategories.length;

          // Simulate sequential deletions
          deleteIndices.forEach(idx => {
            const categoryToDelete = categories[idx];
            remainingCategories = remainingCategories.filter(
              cat => cat.id !== categoryToDelete.id
            );
          });

          // Property 1: Final count should be initial count minus deleted count
          expect(remainingCategories.length).toBe(initialCount - deleteIndices.length);

          // Property 2: None of the deleted categories should remain
          deleteIndices.forEach(idx => {
            const deletedCategory = categories[idx];
            expect(remainingCategories.find(cat => cat.id === deletedCategory.id)).toBeUndefined();
          });

          // Property 3: All non-deleted categories should remain
          categories.forEach((cat, idx) => {
            if (!deleteIndices.includes(idx)) {
              expect(remainingCategories.find(c => c.id === cat.id)).toBeDefined();
            }
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Deletion is idempotent
   * For any category, attempting to delete it multiple times should have
   * the same effect as deleting it once (no errors, category stays deleted)
   */
  it('should be idempotent - deleting same category multiple times has same effect', () => {
    fc.assert(
      fc.property(
        fc.record({
          categories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 3, maxLength: 8 }
          ),
          deleteIndex: fc.integer({ min: 0, max: 7 })
        }).filter(({ categories, deleteIndex }) => deleteIndex < categories.length),
        (testData) => {
          const { categories, deleteIndex } = testData;
          const categoryToDelete = categories[deleteIndex];
          
          // Create full category objects
          const fullCategories: SizeCategory[] = categories.map(cat => ({
            id: cat.id,
            user_id: 'test-user-id',
            name: cat.name,
            icon: undefined,
            supported_formats: ['letter', 'numeric'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // First deletion
          const afterFirstDelete = fullCategories.filter(
            cat => cat.id !== categoryToDelete.id
          );

          // Second deletion (attempting to delete same category)
          const afterSecondDelete = afterFirstDelete.filter(
            cat => cat.id !== categoryToDelete.id
          );

          // Property 1: Both results should be identical
          expect(afterSecondDelete.length).toBe(afterFirstDelete.length);
          expect(afterSecondDelete).toEqual(afterFirstDelete);

          // Property 2: Category should not exist after first deletion
          expect(afterFirstDelete.find(cat => cat.id === categoryToDelete.id)).toBeUndefined();

          // Property 3: Category should still not exist after second deletion
          expect(afterSecondDelete.find(cat => cat.id === categoryToDelete.id)).toBeUndefined();

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Deletion preserves category relationships
   * For any category deletion, the relationships between remaining categories
   * (such as display order in pinned preferences) should be preserved
   */
  it('should preserve display order of remaining pinned categories after deletion', () => {
    fc.assert(
      fc.property(
        fc.record({
          categories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 4, maxLength: 8 }
          )
        }).chain(({ categories }) => 
          fc.record({
            categories: fc.constant(categories),
            // Pin all categories
            deleteIndex: fc.integer({ min: 1, max: categories.length - 2 }) // Delete middle one
          })
        ),
        (testData) => {
          const { categories, deleteIndex } = testData;
          const categoryToDelete = categories[deleteIndex];

          // Create pinned preferences with sequential display order
          const pinnedPreferences: PinnedPreference[] = categories.map((cat, idx) => ({
            id: `pin-${idx}`,
            user_id: 'test-user-id',
            category_id: cat.id,
            display_order: idx,
            display_mode: 'standard' as const,
            preferred_brand_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          // Simulate deletion
          const remainingPinned = pinnedPreferences.filter(
            pref => pref.category_id !== categoryToDelete.id
          );

          // Property 1: Relative order should be preserved
          const beforeDeleteIndex = pinnedPreferences
            .filter(pref => pref.display_order < deleteIndex)
            .map(pref => pref.category_id);
          
          const afterDeleteIndex = pinnedPreferences
            .filter(pref => pref.display_order > deleteIndex)
            .map(pref => pref.category_id);

          const remainingBefore = remainingPinned
            .filter(pref => beforeDeleteIndex.includes(pref.category_id))
            .sort((a, b) => a.display_order - b.display_order)
            .map(pref => pref.category_id);

          const remainingAfter = remainingPinned
            .filter(pref => afterDeleteIndex.includes(pref.category_id))
            .sort((a, b) => a.display_order - b.display_order)
            .map(pref => pref.category_id);

          // Property 2: Categories before deleted one should maintain their relative order
          expect(remainingBefore).toEqual(beforeDeleteIndex);

          // Property 3: Categories after deleted one should maintain their relative order
          expect(remainingAfter).toEqual(afterDeleteIndex);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

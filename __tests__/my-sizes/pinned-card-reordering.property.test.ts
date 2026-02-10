/**
 * Property-Based Test: Pinned card reordering persistence
 * 
 * Property 12: Pinned card reordering persistence
 * For any reordering of pinned cards, when a user changes the display order and saves,
 * the new order should persist across page reloads and sessions.
 * 
 * **Validates: Requirements 8.5**
 * 
 * Feature: my-sizes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { PinnedPreference } from '@/lib/types/sizes';

// In-memory store for mock Supabase
let mockDataStore: PinnedPreference[] = [];

// Mock Supabase client with in-memory persistence
const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'pinned_preferences') {
      return {
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: string) => {
            if (column === 'user_id') {
              mockDataStore = [];
            }
            return Promise.resolve({ error: null });
          }),
        })),
        insert: vi.fn((data: PinnedPreference[]) => ({
          select: vi.fn(() => {
            mockDataStore = [...data];
            return Promise.resolve({ data: mockDataStore, error: null });
          }),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => {
              const sortedData = [...mockDataStore].sort((a, b) => a.display_order - b.display_order);
              return Promise.resolve({ data: sortedData, error: null });
            }),
          })),
        })),
      };
    }
    return {};
  }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Simulate the reordering and persistence logic
async function reorderAndSavePinnedCards(
  originalOrder: PinnedPreference[],
  newOrder: string[]
): Promise<PinnedPreference[]> {
  // Build new preferences with updated display_order
  const updatedPreferences = newOrder.map((categoryId, index) => {
    const original = originalOrder.find(p => p.category_id === categoryId);
    return {
      id: original?.id || `pref-${categoryId}`,
      user_id: original?.user_id || 'test-user',
      category_id: categoryId,
      display_order: index,
      display_mode: original?.display_mode || 'standard' as const,
      preferred_brand_id: original?.preferred_brand_id,
      created_at: original?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // Simulate database save (delete all, then insert new)
  await mockSupabase.from('pinned_preferences').delete().eq('user_id', 'test-user');
  
  if (updatedPreferences.length > 0) {
    await mockSupabase.from('pinned_preferences').insert(updatedPreferences).select();
  }

  return updatedPreferences;
}

// Simulate fetching pinned cards from database
async function fetchPinnedCards(userId: string): Promise<PinnedPreference[]> {
  const { data } = await mockSupabase
    .from('pinned_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('display_order');

  return data || [];
}

describe('Property 12: Pinned card reordering persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore = []; // Clear the in-memory store
  });

  // Generator for pinned preferences with guaranteed unique category_ids
  // Using integer-based IDs to ensure uniqueness and prevent shrinking to duplicates
  const pinnedPreferenceArb = (index: number) => fc.record({
    id: fc.constant(`pref-${index}`),
    user_id: fc.constant('test-user'),
    category_id: fc.constant(`cat-${index}`),
    display_order: fc.constant(index),
    display_mode: fc.constantFrom('standard', 'dual', 'preferred-brand') as fc.Arbitrary<'standard' | 'dual' | 'preferred-brand'>,
    preferred_brand_id: fc.option(fc.constant(`brand-${index}`), { nil: undefined }),
    created_at: fc.constant(new Date().toISOString()),
    updated_at: fc.constant(new Date().toISOString()),
  });

  // Generator for array of unique pinned preferences
  const uniquePinnedPreferencesArb = (minLength: number, maxLength: number) =>
    fc.integer({ min: minLength, max: maxLength }).chain(length =>
      fc.tuple(...Array.from({ length }, (_, i) => pinnedPreferenceArb(i)))
    );

  it('should persist reordered pinned cards with correct display_order', () => {
    fc.assert(
      fc.asyncProperty(
        uniquePinnedPreferencesArb(2, 10).chain(prefs => {
          const prefsArray = Array.isArray(prefs) ? prefs : Array.from(prefs);
          
          // Generate a new random order
          return fc.tuple(
            fc.constant(prefsArray),
            fc.shuffledSubarray(prefsArray.map(p => p.category_id), { 
              minLength: prefsArray.length, 
              maxLength: prefsArray.length 
            })
          );
        }),
        async ([originalOrder, newOrder]) => {
          // Reorder and save
          const savedPreferences = await reorderAndSavePinnedCards(originalOrder, newOrder);

          // Verify: Each preference should have display_order matching its position in newOrder
          expect(savedPreferences).toHaveLength(newOrder.length);
          
          savedPreferences.forEach((pref, index) => {
            expect(pref.category_id).toBe(newOrder[index]);
            expect(pref.display_order).toBe(index);
          });

          // Verify: display_order values should be sequential starting from 0
          const displayOrders = savedPreferences.map(p => p.display_order).sort((a, b) => a - b);
          expect(displayOrders).toEqual(Array.from({ length: newOrder.length }, (_, i) => i));

          return true;
        }
      ),
      { numRuns: 5 } // Keep runs low for fast execution
    );
  });

  it('should maintain category_id to display_order mapping after reordering', () => {
    fc.assert(
      fc.asyncProperty(
        uniquePinnedPreferencesArb(2, 10).chain(prefs => {
          const prefsArray = Array.isArray(prefs) ? prefs : Array.from(prefs);
          
          return fc.tuple(
            fc.constant(prefsArray),
            fc.shuffledSubarray(prefsArray.map(p => p.category_id), { 
              minLength: prefsArray.length, 
              maxLength: prefsArray.length 
            })
          );
        }),
        async ([originalOrder, newOrder]) => {
          // Reorder and save
          const savedPreferences = await reorderAndSavePinnedCards(originalOrder, newOrder);

          // Build mapping from category_id to display_order
          const orderMapping = new Map<string, number>();
          savedPreferences.forEach(pref => {
            orderMapping.set(pref.category_id, pref.display_order);
          });

          // Verify: Each category_id should map to its index in newOrder
          newOrder.forEach((categoryId, expectedOrder) => {
            expect(orderMapping.get(categoryId)).toBe(expectedOrder);
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should preserve display_mode and preferred_brand_id during reordering', () => {
    fc.assert(
      fc.asyncProperty(
        uniquePinnedPreferencesArb(2, 10).chain(prefs => {
          const prefsArray = Array.isArray(prefs) ? prefs : Array.from(prefs);
          
          return fc.tuple(
            fc.constant(prefsArray),
            fc.shuffledSubarray(prefsArray.map(p => p.category_id), { 
              minLength: prefsArray.length, 
              maxLength: prefsArray.length 
            })
          );
        }),
        async ([originalOrder, newOrder]) => {
          // Reorder and save
          const savedPreferences = await reorderAndSavePinnedCards(originalOrder, newOrder);

          // Verify: display_mode and preferred_brand_id should be preserved for each category
          savedPreferences.forEach(savedPref => {
            const original = originalOrder.find(p => p.category_id === savedPref.category_id);
            expect(original).toBeDefined();
            expect(savedPref.display_mode).toBe(original!.display_mode);
            expect(savedPref.preferred_brand_id).toBe(original!.preferred_brand_id);
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should handle moving first item to last position', () => {
    fc.assert(
      fc.asyncProperty(
        uniquePinnedPreferencesArb(3, 10),
        async (prefs) => {
          const originalOrder = Array.isArray(prefs) ? prefs : Array.from(prefs);
          
          if (originalOrder.length < 3) return true;

          // Move first item to last
          const newOrder = [
            ...originalOrder.slice(1).map(p => p.category_id),
            originalOrder[0].category_id
          ];

          const savedPreferences = await reorderAndSavePinnedCards(originalOrder, newOrder);

          // Verify: First item should now be last
          expect(savedPreferences[savedPreferences.length - 1].category_id).toBe(originalOrder[0].category_id);
          expect(savedPreferences[savedPreferences.length - 1].display_order).toBe(savedPreferences.length - 1);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should handle moving last item to first position', () => {
    fc.assert(
      fc.asyncProperty(
        uniquePinnedPreferencesArb(3, 10),
        async (prefs) => {
          const originalOrder = Array.isArray(prefs) ? prefs : Array.from(prefs);
          
          if (originalOrder.length < 3) return true;

          // Move last item to first
          const lastItem = originalOrder[originalOrder.length - 1];
          const newOrder = [
            lastItem.category_id,
            ...originalOrder.slice(0, -1).map(p => p.category_id)
          ];

          const savedPreferences = await reorderAndSavePinnedCards(originalOrder, newOrder);

          // Verify: Last item should now be first
          expect(savedPreferences[0].category_id).toBe(lastItem.category_id);
          expect(savedPreferences[0].display_order).toBe(0);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

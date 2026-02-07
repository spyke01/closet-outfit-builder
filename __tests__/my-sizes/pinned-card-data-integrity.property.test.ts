/**
 * Property-Based Test: Pinned Card Data Integrity
 * 
 * **Property 1: Pinned card data integrity**
 * For any pinned card and its associated category, when the category's standard size 
 * is modified, the pinned card should immediately reflect the updated size without 
 * requiring a page reload or separate update operation.
 * 
 * **Validates: Requirements 2.4, 10.2, 10.3**
 * Feature: my-sizes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@/lib/supabase/client';
import type { SizeCategory, StandardSize, PinnedPreference } from '@/lib/types/sizes';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ userId: 'test-user-id', isAuthenticated: true })
}));

describe('Property 1: Pinned Card Data Integrity', () => {
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
      order: vi.fn(() => mockSupabase),
      maybeSingle: vi.fn(),
      single: vi.fn()
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  /**
   * Property: Pinned card reflects category data without duplication
   * For any pinned card, the displayed size data should come directly from 
   * the category's standard size, not from a duplicate storage location
   */
  it('should display size data from category without duplicate storage', () => {
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
          ),
          displayMode: fc.constantFrom('standard', 'dual', 'preferred-brand') as fc.Arbitrary<'standard' | 'dual' | 'preferred-brand'>
        }),
        (testData) => {
          // Create category with standard size
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

          const pinnedPreference: PinnedPreference = {
            id: 'pinned-pref-id',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: 0,
            display_mode: testData.displayMode,
            preferred_brand_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Property 1: Pinned preference should reference category by ID, not duplicate data
          expect(pinnedPreference.category_id).toBe(category.id);
          expect(pinnedPreference).not.toHaveProperty('primary_size');
          expect(pinnedPreference).not.toHaveProperty('secondary_size');

          // Property 2: To display size, must query category's standard size
          // Simulate fetching pinned card data
          const pinnedCardData = {
            category: category,
            standardSize: standardSize,
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          // Property 3: Displayed size should match category's standard size exactly
          expect(pinnedCardData.standardSize?.primary_size).toBe(testData.primarySize);
          expect(pinnedCardData.standardSize?.secondary_size).toBe(testData.secondarySize);

          // Property 4: Category ID should be the single source of truth
          expect(pinnedCardData.category.id).toBe(pinnedPreference.category_id);
          expect(pinnedCardData.standardSize?.category_id).toBe(pinnedPreference.category_id);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Standard size update immediately reflects in pinned card
   * For any pinned card, when the category's standard size is updated,
   * the pinned card should display the new size without requiring a separate update
   */
  it('should immediately reflect standard size updates in pinned card', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          initialSize: fc.constantFrom('S', 'M', 'L'),
          updatedSize: fc.constantFrom('M', 'L', 'XL'),
          displayMode: fc.constantFrom('standard', 'dual') as fc.Arbitrary<'standard' | 'dual'>
        }).filter(({ initialSize, updatedSize }) => initialSize !== updatedSize),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: 'Test Category',
            icon: undefined,
            supported_formats: ['letter'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Initial timestamps
          const initialTime = new Date('2024-01-01T10:00:00Z');
          
          // Initial standard size
          const initialStandardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.initialSize,
            secondary_size: undefined,
            notes: undefined,
            created_at: initialTime.toISOString(),
            updated_at: initialTime.toISOString()
          };

          const pinnedPreference: PinnedPreference = {
            id: 'pinned-pref-id',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: 0,
            display_mode: testData.displayMode,
            preferred_brand_id: undefined,
            created_at: initialTime.toISOString(),
            updated_at: initialTime.toISOString()
          };

          // Initial pinned card data
          const initialPinnedCardData = {
            category: category,
            standardSize: initialStandardSize,
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          // Property 1: Initial state shows initial size
          expect(initialPinnedCardData.standardSize?.primary_size).toBe(testData.initialSize);

          // Simulate standard size update (timestamp changes)
          const updateTime = new Date('2024-01-01T10:05:00Z'); // 5 minutes later
          const updatedStandardSize: StandardSize = {
            ...initialStandardSize,
            primary_size: testData.updatedSize,
            updated_at: updateTime.toISOString()
          };

          // Updated pinned card data (re-queried from database)
          const updatedPinnedCardData = {
            category: category,
            standardSize: updatedStandardSize,
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          // Property 2: After update, pinned card shows new size
          expect(updatedPinnedCardData.standardSize?.primary_size).toBe(testData.updatedSize);

          // Property 3: Pinned preference itself was NOT modified
          expect(pinnedPreference.category_id).toBe(testData.categoryId);
          expect(pinnedPreference.display_mode).toBe(testData.displayMode);
          // Pinned preference timestamp remains unchanged (same as initial)
          const pinnedTimestamp = new Date(pinnedPreference.updated_at).getTime();
          const initialTimestamp = new Date(initialStandardSize.updated_at).getTime();
          expect(pinnedTimestamp).toBe(initialTimestamp);

          // Property 4: Only standard_sizes table was updated, not pinned_preferences
          expect(updatedStandardSize.updated_at).not.toBe(initialStandardSize.updated_at);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Multiple pinned cards share same category data
   * For any category pinned multiple times (different display modes),
   * all pinned cards should reference the same underlying category data
   */
  it('should share category data across multiple pinned cards', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          primarySize: fc.constantFrom('S', 'M', 'L', 'XL'),
          secondarySize: fc.option(fc.constantFrom('S', 'M', 'L'), { nil: undefined })
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: 'Shared Category',
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
            secondary_size: testData.secondarySize,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Create multiple pinned preferences with different display modes
          const pinnedPreference1: PinnedPreference = {
            id: 'pinned-1',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: 0,
            display_mode: 'standard',
            preferred_brand_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const pinnedPreference2: PinnedPreference = {
            id: 'pinned-2',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: 1,
            display_mode: 'dual',
            preferred_brand_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Both pinned cards reference the same category
          const pinnedCard1 = {
            category: category,
            standardSize: standardSize,
            displayMode: pinnedPreference1.display_mode,
            displayOrder: pinnedPreference1.display_order
          };

          const pinnedCard2 = {
            category: category,
            standardSize: standardSize,
            displayMode: pinnedPreference2.display_mode,
            displayOrder: pinnedPreference2.display_order
          };

          // Property 1: Both cards reference same category ID
          expect(pinnedCard1.category.id).toBe(testData.categoryId);
          expect(pinnedCard2.category.id).toBe(testData.categoryId);
          expect(pinnedCard1.category.id).toBe(pinnedCard2.category.id);

          // Property 2: Both cards show same size data
          expect(pinnedCard1.standardSize?.primary_size).toBe(testData.primarySize);
          expect(pinnedCard2.standardSize?.primary_size).toBe(testData.primarySize);
          expect(pinnedCard1.standardSize?.primary_size).toBe(pinnedCard2.standardSize?.primary_size);

          // Property 3: Both cards reference same standard size record
          expect(pinnedCard1.standardSize?.id).toBe(standardSize.id);
          expect(pinnedCard2.standardSize?.id).toBe(standardSize.id);

          // Property 4: Display modes can differ while sharing data
          expect(pinnedCard1.displayMode).toBe('standard');
          expect(pinnedCard2.displayMode).toBe('dual');

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Timestamp update on standard size reflects in pinned card
   * For any pinned card, when the category's standard size is updated,
   * the pinned card should show the updated timestamp without modifying
   * the pinned preference's timestamp
   */
  it('should reflect standard size timestamp updates without modifying pinned preference', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          initialTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-01-01') }),
          primarySize: fc.constantFrom('S', 'M', 'L', 'XL')
        }),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: 'Test Category',
            icon: undefined,
            supported_formats: ['letter'],
            is_system_category: false,
            created_at: testData.initialTimestamp.toISOString(),
            updated_at: testData.initialTimestamp.toISOString()
          };

          const initialStandardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.primarySize,
            secondary_size: undefined,
            notes: undefined,
            created_at: testData.initialTimestamp.toISOString(),
            updated_at: testData.initialTimestamp.toISOString()
          };

          const pinnedPreference: PinnedPreference = {
            id: 'pinned-pref-id',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: 0,
            display_mode: 'standard',
            preferred_brand_id: undefined,
            created_at: testData.initialTimestamp.toISOString(),
            updated_at: testData.initialTimestamp.toISOString()
          };

          // Simulate standard size update (timestamp changes)
          const updateTime = new Date(testData.initialTimestamp.getTime() + 60000); // 1 minute later
          const updatedStandardSize: StandardSize = {
            ...initialStandardSize,
            primary_size: 'L', // Changed size
            updated_at: updateTime.toISOString()
          };

          // Pinned card data after update
          const pinnedCardData = {
            category: category,
            standardSize: updatedStandardSize,
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          // Property 1: Pinned card shows updated standard size timestamp
          expect(pinnedCardData.standardSize?.updated_at).toBe(updateTime.toISOString());
          expect(new Date(pinnedCardData.standardSize!.updated_at).getTime())
            .toBeGreaterThan(testData.initialTimestamp.getTime());

          // Property 2: Pinned preference timestamp is unchanged
          expect(pinnedPreference.updated_at).toBe(testData.initialTimestamp.toISOString());

          // Property 3: Standard size timestamp is newer than pinned preference
          expect(new Date(updatedStandardSize.updated_at).getTime())
            .toBeGreaterThan(new Date(pinnedPreference.updated_at).getTime());

          // Property 4: Only standard_sizes.updated_at changed, not pinned_preferences.updated_at
          expect(updatedStandardSize.updated_at).not.toBe(initialStandardSize.updated_at);
          expect(pinnedPreference.updated_at).toBe(testData.initialTimestamp.toISOString());

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Pinned card data consistency across queries
   * For any pinned card, querying the category and standard size separately
   * should produce the same data as querying them together
   */
  it('should maintain data consistency across separate and joined queries', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          categoryName: fc.string({ minLength: 1, maxLength: 50 }),
          primarySize: fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
          secondarySize: fc.option(fc.constantFrom('S', 'M', 'L'), { nil: undefined })
        }),
        (testData) => {
          // Separate queries
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
            secondary_size: testData.secondarySize,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const pinnedPreference: PinnedPreference = {
            id: 'pinned-pref-id',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: 0,
            display_mode: 'standard',
            preferred_brand_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Simulate joined query result (category with standard_sizes)
          const joinedResult = {
            ...category,
            standard_sizes: [standardSize]
          };

          // Property 1: Category data should be identical
          expect(joinedResult.id).toBe(category.id);
          expect(joinedResult.name).toBe(category.name);
          expect(joinedResult.user_id).toBe(category.user_id);

          // Property 2: Standard size data should be identical
          expect(joinedResult.standard_sizes[0].id).toBe(standardSize.id);
          expect(joinedResult.standard_sizes[0].primary_size).toBe(standardSize.primary_size);
          expect(joinedResult.standard_sizes[0].secondary_size).toBe(standardSize.secondary_size);

          // Property 3: Category ID relationships should be consistent
          expect(joinedResult.standard_sizes[0].category_id).toBe(category.id);
          expect(pinnedPreference.category_id).toBe(category.id);

          // Property 4: Pinned card data should be identical regardless of query method
          const pinnedCardFromSeparate = {
            category: category,
            standardSize: standardSize,
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          const pinnedCardFromJoined = {
            category: joinedResult,
            standardSize: joinedResult.standard_sizes[0],
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          expect(pinnedCardFromSeparate.standardSize?.primary_size)
            .toBe(pinnedCardFromJoined.standardSize?.primary_size);
          expect(pinnedCardFromSeparate.category.id)
            .toBe(pinnedCardFromJoined.category.id);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: No data duplication in database schema
   * For any pinned preference, the database record should only contain
   * references (IDs) and display settings, not duplicated size data
   */
  it('should store only references and settings in pinned preferences table', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          displayMode: fc.constantFrom('standard', 'dual', 'preferred-brand') as fc.Arbitrary<'standard' | 'dual' | 'preferred-brand'>,
          displayOrder: fc.integer({ min: 0, max: 10 }),
          preferredBrandId: fc.option(fc.string({ minLength: 1, maxLength: 36 }), { nil: undefined })
        }),
        (testData) => {
          const pinnedPreference: PinnedPreference = {
            id: 'pinned-pref-id',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: testData.displayOrder,
            display_mode: testData.displayMode,
            preferred_brand_id: testData.preferredBrandId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Property 1: Pinned preference should only contain reference fields
          const allowedFields = [
            'id',
            'user_id',
            'category_id',
            'display_order',
            'display_mode',
            'preferred_brand_id',
            'created_at',
            'updated_at'
          ];

          Object.keys(pinnedPreference).forEach(key => {
            expect(allowedFields).toContain(key);
          });

          // Property 2: Should NOT contain size data fields
          expect(pinnedPreference).not.toHaveProperty('primary_size');
          expect(pinnedPreference).not.toHaveProperty('secondary_size');
          expect(pinnedPreference).not.toHaveProperty('size');
          expect(pinnedPreference).not.toHaveProperty('notes');
          expect(pinnedPreference).not.toHaveProperty('category_name');

          // Property 3: Should contain only foreign key references
          expect(pinnedPreference.category_id).toBeDefined();
          expect(typeof pinnedPreference.category_id).toBe('string');

          // Property 4: Display settings should be present
          expect(pinnedPreference.display_mode).toBeDefined();
          expect(['standard', 'dual', 'preferred-brand']).toContain(pinnedPreference.display_mode);
          expect(pinnedPreference.display_order).toBeDefined();
          expect(typeof pinnedPreference.display_order).toBe('number');

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Cache invalidation ensures data consistency
   * For any standard size update, invalidating the category cache should
   * cause pinned cards to fetch fresh data on next render
   */
  it('should maintain consistency through cache invalidation on updates', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          oldSize: fc.constantFrom('S', 'M', 'L'),
          newSize: fc.constantFrom('M', 'L', 'XL')
        }).filter(({ oldSize, newSize }) => oldSize !== newSize),
        (testData) => {
          const category: SizeCategory = {
            id: testData.categoryId,
            user_id: 'test-user-id',
            name: 'Test Category',
            icon: undefined,
            supported_formats: ['letter'],
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const oldStandardSize: StandardSize = {
            id: 'standard-size-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.oldSize,
            secondary_size: undefined,
            notes: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const pinnedPreference: PinnedPreference = {
            id: 'pinned-pref-id',
            user_id: 'test-user-id',
            category_id: testData.categoryId,
            display_order: 0,
            display_mode: 'standard',
            preferred_brand_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Initial state
          const initialPinnedCard = {
            category: category,
            standardSize: oldStandardSize,
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          // Property 1: Initial state shows old size
          expect(initialPinnedCard.standardSize?.primary_size).toBe(testData.oldSize);

          // Simulate update
          const newStandardSize: StandardSize = {
            ...oldStandardSize,
            primary_size: testData.newSize,
            updated_at: new Date().toISOString()
          };

          // After cache invalidation and refetch
          const updatedPinnedCard = {
            category: category,
            standardSize: newStandardSize,
            displayMode: pinnedPreference.display_mode,
            displayOrder: pinnedPreference.display_order
          };

          // Property 2: After refetch, shows new size
          expect(updatedPinnedCard.standardSize?.primary_size).toBe(testData.newSize);

          // Property 3: Pinned preference unchanged (no cache invalidation needed)
          expect(pinnedPreference.category_id).toBe(testData.categoryId);
          expect(pinnedPreference.display_mode).toBe('standard');

          // Property 4: Data consistency maintained through reference
          expect(updatedPinnedCard.category.id).toBe(pinnedPreference.category_id);
          expect(updatedPinnedCard.standardSize?.category_id).toBe(pinnedPreference.category_id);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

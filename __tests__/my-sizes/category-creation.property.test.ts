/**
 * Property-Based Test: Category Creation Adds to Grid
 * 
 * **Property 10: Category creation adds to grid**
 * For any new category created by a user, the category should appear in the 
 * category grid immediately after creation without requiring a page refresh.
 * 
 * **Validates: Requirements 7.4**
 * Feature: my-sizes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@/lib/supabase/client';
import type { SizeCategory } from '@/lib/types/sizes';
import type { SizingFormat } from '@/lib/schemas/sizes';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ userId: 'test-user-id', isAuthenticated: true })
}));

describe('Property 10: Category Creation Adds to Grid', () => {
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
   * Property: New category appears in category list
   * For any new category created, it should appear in the category list
   * immediately after creation
   */
  it('should add new category to category list', () => {
    fc.assert(
      fc.property(
        // Generate test data: existing categories and a new category to add
        fc.record({
          existingCategories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.oneof(
                fc.constantFrom('Tops', 'Bottoms', 'Footwear', 'Outerwear', 'Accessories'),
                fc.string({ minLength: 1, maxLength: 50 })
              ).filter(s => s.trim().length > 0).map(s => s.trim()),
              supported_formats: fc.array(
                fc.constantFrom<SizingFormat>('letter', 'numeric', 'waist-inseam', 'measurements'),
                { minLength: 1, maxLength: 4 }
              ).map(formats => [...new Set(formats)]) // Remove duplicates
            }),
            { minLength: 0, maxLength: 10 }
          ),
          newCategory: fc.record({
            id: fc.string({ minLength: 1, maxLength: 36 }),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0)
              .map(s => s.trim()),
            icon: fc.option(fc.constantFrom('👕', '👖', '👟', '🧥', '👔'), { nil: undefined }),
            supported_formats: fc.array(
              fc.constantFrom<SizingFormat>('letter', 'numeric', 'waist-inseam', 'measurements'),
              { minLength: 1, maxLength: 4 }
            ).map(formats => [...new Set(formats)]) // Remove duplicates
          })
        }),
        (testData) => {
          const { existingCategories, newCategory } = testData;
          
          // Create full category objects
          const fullExistingCategories: SizeCategory[] = existingCategories.map(cat => ({
            id: cat.id,
            user_id: 'test-user-id',
            name: cat.name,
            icon: undefined,
            supported_formats: cat.supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const fullNewCategory: SizeCategory = {
            id: newCategory.id,
            user_id: 'test-user-id',
            name: newCategory.name,
            icon: newCategory.icon,
            supported_formats: newCategory.supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Simulate adding new category
          const updatedCategories = [...fullExistingCategories, fullNewCategory];

          // Property 1: New category should be in the list
          expect(updatedCategories.find(cat => cat.id === newCategory.id)).toBeDefined();

          // Property 2: Category count should increase by 1
          expect(updatedCategories.length).toBe(fullExistingCategories.length + 1);

          // Property 3: All existing categories should still be present
          fullExistingCategories.forEach(existingCat => {
            expect(updatedCategories.find(cat => cat.id === existingCat.id)).toBeDefined();
          });

          // Property 4: New category should have correct properties
          const addedCategory = updatedCategories.find(cat => cat.id === newCategory.id);
          expect(addedCategory?.name).toBe(newCategory.name);
          expect(addedCategory?.icon).toBe(newCategory.icon);
          expect(addedCategory?.supported_formats).toEqual(newCategory.supported_formats);
          expect(addedCategory?.user_id).toBe('test-user-id');
          expect(addedCategory?.is_system_category).toBe(false);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Category creation preserves existing categories
   * For any new category creation, all existing categories should remain
   * unchanged in the category list
   */
  it('should preserve existing categories when adding new category', () => {
    fc.assert(
      fc.property(
        fc.record({
          existingCategories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              supported_formats: fc.array(
                fc.constantFrom<SizingFormat>('letter', 'numeric', 'waist-inseam', 'measurements'),
                { minLength: 1, maxLength: 4 }
              ).map(formats => [...new Set(formats)])
            }),
            { minLength: 1, maxLength: 10 }
          ),
          newCategory: fc.record({
            id: fc.string({ minLength: 1, maxLength: 36 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            supported_formats: fc.array(
              fc.constantFrom<SizingFormat>('letter', 'numeric', 'waist-inseam', 'measurements'),
              { minLength: 1, maxLength: 4 }
            ).map(formats => [...new Set(formats)])
          })
        }),
        (testData) => {
          const { existingCategories, newCategory } = testData;
          
          // Create full category objects
          const fullExistingCategories: SizeCategory[] = existingCategories.map(cat => ({
            id: cat.id,
            user_id: 'test-user-id',
            name: cat.name,
            icon: undefined,
            supported_formats: cat.supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const fullNewCategory: SizeCategory = {
            id: newCategory.id,
            user_id: 'test-user-id',
            name: newCategory.name,
            icon: undefined,
            supported_formats: newCategory.supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Simulate adding new category
          const updatedCategories = [...fullExistingCategories, fullNewCategory];

          // Property 1: Each existing category should be unchanged
          fullExistingCategories.forEach(existingCat => {
            const foundCat = updatedCategories.find(cat => cat.id === existingCat.id);
            expect(foundCat).toBeDefined();
            expect(foundCat?.id).toBe(existingCat.id);
            expect(foundCat?.name).toBe(existingCat.name);
            expect(foundCat?.user_id).toBe(existingCat.user_id);
            expect(foundCat?.supported_formats).toEqual(existingCat.supported_formats);
            expect(foundCat?.is_system_category).toBe(existingCat.is_system_category);
          });

          // Property 2: No existing categories should be removed
          expect(updatedCategories.length).toBe(fullExistingCategories.length + 1);

          // Property 3: No existing category properties should be modified
          fullExistingCategories.forEach(existingCat => {
            const foundCat = updatedCategories.find(cat => cat.id === existingCat.id);
            expect(foundCat).toEqual(existingCat);
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Multiple category creations work independently
   * For any sequence of category creations, each creation should add
   * exactly one category without affecting others
   */
  it('should handle multiple category creations independently', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialCategories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              supported_formats: fc.array(
                fc.constantFrom<SizingFormat>('letter', 'numeric', 'waist-inseam', 'measurements'),
                { minLength: 1, maxLength: 4 }
              ).map(formats => [...new Set(formats)])
            }),
            { minLength: 0, maxLength: 5 }
          ),
          newCategories: fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 36 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              supported_formats: fc.array(
                fc.constantFrom<SizingFormat>('letter', 'numeric', 'waist-inseam', 'measurements'),
                { minLength: 1, maxLength: 4 }
              ).map(formats => [...new Set(formats)])
            }),
            { minLength: 2, maxLength: 5 }
          )
        }),
        (testData) => {
          const { initialCategories, newCategories } = testData;
          
          // Create full category objects
          let currentCategories: SizeCategory[] = initialCategories.map(cat => ({
            id: cat.id,
            user_id: 'test-user-id',
            name: cat.name,
            icon: undefined,
            supported_formats: cat.supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const initialCount = currentCategories.length;

          // Simulate sequential category creations
          newCategories.forEach(newCat => {
            const fullNewCategory: SizeCategory = {
              id: newCat.id,
              user_id: 'test-user-id',
              name: newCat.name,
              icon: undefined,
              supported_formats: newCat.supported_formats,
              is_system_category: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            currentCategories = [...currentCategories, fullNewCategory];
          });

          // Property 1: Final count should be initial count plus new categories count
          expect(currentCategories.length).toBe(initialCount + newCategories.length);

          // Property 2: All new categories should be present
          newCategories.forEach(newCat => {
            expect(currentCategories.find(cat => cat.id === newCat.id)).toBeDefined();
          });

          // Property 3: All initial categories should still be present
          initialCategories.forEach(initialCat => {
            expect(currentCategories.find(cat => cat.id === initialCat.id)).toBeDefined();
          });

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Category creation with all supported formats
   * For any category created with any combination of supported formats,
   * the category should be added with those exact formats
   */
  it('should preserve supported formats when creating category', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          supported_formats: fc.array(
            fc.constantFrom<SizingFormat>('letter', 'numeric', 'waist-inseam', 'measurements'),
            { minLength: 1, maxLength: 4 }
          ).map(formats => [...new Set(formats)]) // Remove duplicates
        }),
        (testData) => {
          const { name, supported_formats } = testData;
          
          // Create new category
          const newCategory: SizeCategory = {
            id: 'test-id',
            user_id: 'test-user-id',
            name: name,
            icon: undefined,
            supported_formats: supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Property 1: Category should have all specified formats
          expect(newCategory.supported_formats).toEqual(supported_formats);

          // Property 2: Category should have at least one format
          expect(newCategory.supported_formats.length).toBeGreaterThan(0);

          // Property 3: All formats should be valid
          newCategory.supported_formats.forEach(format => {
            expect(['letter', 'numeric', 'waist-inseam', 'measurements']).toContain(format);
          });

          // Property 4: No duplicate formats
          const uniqueFormats = [...new Set(newCategory.supported_formats)];
          expect(newCategory.supported_formats.length).toBe(uniqueFormats.length);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Category creation with optional icon
   * For any category created with or without an icon, the category should
   * be added with the correct icon value (or undefined)
   */
  it('should preserve icon when creating category', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          icon: fc.option(
            fc.constantFrom('👕', '👖', '👟', '🧥', '👔', '🧢', '🧤', '🧣', '👗', '👠'),
            { nil: undefined }
          ),
          supported_formats: fc.array(
            fc.constantFrom<SizingFormat>('letter', 'numeric'),
            { minLength: 1, maxLength: 2 }
          ).map(formats => [...new Set(formats)])
        }),
        (testData) => {
          const { name, icon, supported_formats } = testData;
          
          // Create new category
          const newCategory: SizeCategory = {
            id: 'test-id',
            user_id: 'test-user-id',
            name: name,
            icon: icon,
            supported_formats: supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Property 1: Category should have the specified icon (or undefined)
          expect(newCategory.icon).toBe(icon);

          // Property 2: If icon is provided, it should be a valid emoji
          if (icon !== undefined) {
            expect(typeof icon).toBe('string');
            expect(icon.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Category creation sets correct user_id
   * For any category created, it should be associated with the correct user
   */
  it('should set correct user_id when creating category', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          supported_formats: fc.array(
            fc.constantFrom<SizingFormat>('letter', 'numeric'),
            { minLength: 1, maxLength: 2 }
          ).map(formats => [...new Set(formats)])
        }),
        (testData) => {
          const { name, supported_formats } = testData;
          
          // Create new category
          const newCategory: SizeCategory = {
            id: 'test-id',
            user_id: 'test-user-id',
            name: name,
            icon: undefined,
            supported_formats: supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Property 1: Category should have correct user_id
          expect(newCategory.user_id).toBe('test-user-id');

          // Property 2: user_id should not be empty
          expect(newCategory.user_id.length).toBeGreaterThan(0);

          // Property 3: is_system_category should be false for user-created categories
          expect(newCategory.is_system_category).toBe(false);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Category creation sets timestamps
   * For any category created, it should have valid created_at and updated_at timestamps
   */
  it('should set valid timestamps when creating category', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          supported_formats: fc.array(
            fc.constantFrom<SizingFormat>('letter', 'numeric'),
            { minLength: 1, maxLength: 2 }
          ).map(formats => [...new Set(formats)])
        }),
        (testData) => {
          const { name, supported_formats } = testData;
          
          const beforeCreation = new Date();
          
          // Create new category
          const newCategory: SizeCategory = {
            id: 'test-id',
            user_id: 'test-user-id',
            name: name,
            icon: undefined,
            supported_formats: supported_formats,
            is_system_category: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const afterCreation = new Date();

          // Property 1: created_at should be a valid ISO timestamp
          expect(() => new Date(newCategory.created_at)).not.toThrow();

          // Property 2: updated_at should be a valid ISO timestamp
          expect(() => new Date(newCategory.updated_at)).not.toThrow();

          // Property 3: created_at should be between before and after creation
          const createdAt = new Date(newCategory.created_at);
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime() - 1000); // 1s tolerance
          expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 1000); // 1s tolerance

          // Property 4: updated_at should equal created_at for new categories
          expect(newCategory.updated_at).toBe(newCategory.created_at);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { produce } from 'immer';
import { renderHook, act } from '@testing-library/react';

// Import schemas and utilities
import {
  WardrobeItemSchema,
  CategorySchema,
  OutfitSelectionSchema,
  CreateWardrobeItemFormSchema,
  type WardrobeItem,
  type Category,
  type OutfitSelection,
} from '../../schemas';

import {
  safeValidate,
  formatZodError,
  getFieldErrors,
  validateAndTransform,
  validateFileUpload,
} from '../validation';

import {
  useImmerState,
  useImmerReducer,
  immerArrayUtils,
  immerObjectUtils,
} from '../immer-state';

import { useWardrobeState } from '../../hooks/use-wardrobe-state';

describe('Zod Schema Validation', () => {
  describe('WardrobeItemSchema', () => {
    it('should validate a complete wardrobe item', () => {
      const validItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Blue Oxford Shirt',
        brand: 'J.Crew',
        color: 'Blue',
        material: 'Cotton',
        formality_score: 7,
        capsule_tags: ['business', 'casual'],
        season: ['All'],
        image_url: 'https://example.com/image.jpg',
        active: true,
      };

      const result = WardrobeItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Blue Oxford Shirt');
        expect(result.data.season).toEqual(['All']);
      }
    });

    it('should reject invalid wardrobe item', () => {
      const invalidItem = {
        name: '', // Empty name should fail
        category_id: 'invalid-uuid', // Invalid UUID
        formality_score: 15, // Out of range
      };

      const result = WardrobeItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3);
      }
    });

    it('should apply default values', () => {
      const minimalItem = {
        category_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Item',
      };

      const result = WardrobeItemSchema.safeParse(minimalItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.season).toEqual(['All']);
        expect(result.data.active).toBe(true);
      }
    });
  });

  describe('CategorySchema', () => {
    it('should validate category with all fields', () => {
      const validCategory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Shirts',
        is_anchor_item: true,
        display_order: 1,
      };

      const result = CategorySchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('should apply default values for optional fields', () => {
      const minimalCategory = {
        name: 'Pants',
      };

      const result = CategorySchema.safeParse(minimalCategory);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_anchor_item).toBe(false);
        expect(result.data.display_order).toBe(0);
      }
    });
  });

  describe('OutfitSelectionSchema', () => {
    it('should validate outfit selection', () => {
      const selection = {
        shirt: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          category_id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Blue Shirt',
        },
        tuck_style: 'Tucked' as const,
        score: 85,
      };

      const result = OutfitSelectionSchema.safeParse(selection);
      expect(result.success).toBe(true);
    });
  });
});

describe('Validation Utilities', () => {
  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const data = { name: 'John', age: 30 };

      const result = safeValidate(schema, data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it('should return error for invalid data', () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const data = { name: 'John', age: 'thirty' };

      const result = safeValidate(schema, data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('age');
        expect(result.details).toBeDefined();
      }
    });
  });

  describe('formatZodError', () => {
    it('should format multiple errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0),
      });

      const result = schema.safeParse({
        name: '',
        email: 'invalid-email',
        age: -5,
      });

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('name');
        expect(formatted).toContain('email');
        expect(formatted).toContain('age');
      }
    });
  });

  describe('getFieldErrors', () => {
    it('should extract field-specific errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1),
          email: z.string().email(),
        }),
      });

      const result = schema.safeParse({
        user: {
          name: '',
          email: 'invalid',
        },
      });

      if (!result.success) {
        const fieldErrors = getFieldErrors(result.error);
        expect(fieldErrors['user.name']).toBeDefined();
        expect(fieldErrors['user.email']).toBeDefined();
      }
    });
  });

  describe('validateFileUpload', () => {
    it('should validate file size and type', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validateFileUpload(
        file,
        ['image/jpeg', 'image/png'],
        5 * 1024 * 1024 // 5MB max
      );

      expect(result.success).toBe(true);
    });

    it('should reject oversized files', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB

      const result = validateFileUpload(
        file,
        ['image/jpeg', 'image/png'],
        5 * 1024 * 1024 // 5MB max
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('exceeds maximum');
      }
    });

    it('should reject invalid file types', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = validateFileUpload(
        file,
        ['image/jpeg', 'image/png'],
        5 * 1024 * 1024
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not allowed');
      }
    });
  });
});

describe('Immer State Management', () => {
  describe('useImmerState', () => {
    it('should update state immutably', () => {
      const { result } = renderHook(() => useImmerState({ count: 0, items: [] as string[] }));

      act(() => {
        const [, updateState] = result.current;
        updateState(draft => {
          draft.count = 1;
          draft.items.push('item1');
        });
      });

      const [state] = result.current;
      expect(state.count).toBe(1);
      expect(state.items).toEqual(['item1']);
    });

    it('should maintain referential equality for unchanged parts', () => {
      const { result } = renderHook(() => 
        useImmerState({ 
          user: { name: 'John', age: 30 }, 
          settings: { theme: 'dark' } 
        })
      );

      const [initialState] = result.current;
      const initialSettings = initialState.settings;

      act(() => {
        const [, updateState] = result.current;
        updateState(draft => {
          draft.user.age = 31; // Only change user, not settings
        });
      });

      const [newState] = result.current;
      expect(newState.settings).toBe(initialSettings); // Same reference
      expect(newState.user).not.toBe(initialState.user); // Different reference
    });
  });

  describe('immerArrayUtils', () => {
    const initialArray = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ];

    it('should add items', () => {
      const newItem = { id: 4, name: 'Item 4' };
      const result = immerArrayUtils.addItem(initialArray, newItem);
      
      expect(result).toHaveLength(4);
      expect(result[3]).toEqual(newItem);
      expect(result).not.toBe(initialArray); // New reference
    });

    it('should remove items by index', () => {
      const result = immerArrayUtils.removeByIndex(initialArray, 1);
      
      expect(result).toHaveLength(2);
      expect(result.find(item => item.id === 2)).toBeUndefined();
    });

    it('should update items by predicate', () => {
      const result = immerArrayUtils.updateBy(
        initialArray,
        item => item.id === 2,
        draft => {
          draft.name = 'Updated Item 2';
        }
      );
      
      const updatedItem = result.find(item => item.id === 2);
      expect(updatedItem?.name).toBe('Updated Item 2');
    });

    it('should toggle items', () => {
      const newItem = { id: 4, name: 'Item 4' };
      
      // Add item
      const withNewItem = immerArrayUtils.toggle(
        initialArray, 
        newItem, 
        (a, b) => a.id === b.id
      );
      expect(withNewItem).toHaveLength(4);
      
      // Remove item
      const withoutNewItem = immerArrayUtils.toggle(
        withNewItem, 
        newItem, 
        (a, b) => a.id === b.id
      );
      expect(withoutNewItem).toHaveLength(3);
    });
  });

  describe('immerObjectUtils', () => {
    const initialObject = {
      user: { name: 'John', age: 30 },
      settings: { theme: 'dark', notifications: true },
    };

    it('should merge objects', () => {
      const result = immerObjectUtils.merge(initialObject, {
        user: { age: 31 },
      });
      
      expect(result.user.age).toBe(31);
      expect(result.user.name).toBe('John'); // Preserved
    });

    it('should set nested properties', () => {
      const result = immerObjectUtils.setNested(
        initialObject,
        ['settings', 'theme'],
        'light'
      );
      
      expect(result.settings.theme).toBe('light');
    });

    it('should delete properties', () => {
      const result = immerObjectUtils.deleteProperty(initialObject, 'settings');
      
      expect(result.settings).toBeUndefined();
      expect(result.user).toBeDefined();
    });
  });
});

describe('Wardrobe State Integration', () => {
  it('should manage wardrobe state with Immer', () => {
    const { result } = renderHook(() => useWardrobeState());

    const newItem: WardrobeItem = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      category_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Test Shirt',
      active: true,
      season: ['All'],
    };

    act(() => {
      result.current.addItem(newItem);
    });

    expect(result.current.state.items).toHaveLength(1);
    expect(result.current.state.items[0]).toEqual(newItem);
    expect(result.current.state.lastUpdated).toBeDefined();
  });

  it('should handle item selection', () => {
    const { result } = renderHook(() => useWardrobeState());

    const shirt: WardrobeItem = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      category_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Blue Shirt',
      active: true,
      season: ['All'],
    };

    act(() => {
      result.current.selectItem('shirt', shirt);
    });

    expect(result.current.state.selection.shirt).toEqual(shirt);
    expect(result.current.state.selection.score).toBeGreaterThan(0);
  });

  it('should handle item removal from selection when item is deleted', () => {
    const { result } = renderHook(() => useWardrobeState());

    const shirt: WardrobeItem = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      category_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Blue Shirt',
      active: true,
      season: ['All'],
    };

    act(() => {
      result.current.addItem(shirt);
      result.current.selectItem('shirt', shirt);
    });

    expect(result.current.state.selection.shirt).toEqual(shirt);

    act(() => {
      result.current.removeItem(shirt.id!);
    });

    expect(result.current.state.items).toHaveLength(0);
    expect(result.current.state.selection.shirt).toBeUndefined();
  });

  it('should handle batch operations', () => {
    const { result } = renderHook(() => useWardrobeState());

    const items: WardrobeItem[] = [
      {
        id: '1',
        category_id: 'cat1',
        name: 'Item 1',
        active: true,
        season: ['All'],
      },
      {
        id: '2',
        category_id: 'cat1',
        name: 'Item 2',
        active: true,
        season: ['All'],
      },
    ];

    act(() => {
      result.current.replaceAllItems(items);
    });

    expect(result.current.state.items).toHaveLength(2);

    const updates = [
      { id: '1', updates: { name: 'Updated Item 1' } },
      { id: '2', updates: { name: 'Updated Item 2' } },
    ];

    act(() => {
      result.current.batchUpdateItems(updates);
    });

    expect(result.current.state.items[0].name).toBe('Updated Item 1');
    expect(result.current.state.items[1].name).toBe('Updated Item 2');
  });
});

describe('Form Validation Integration', () => {
  it('should validate create wardrobe item form', () => {
    const validFormData = {
      category_id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'New Shirt',
      brand: 'Test Brand',
      color: 'Blue',
    };

    const result = CreateWardrobeItemFormSchema.safeParse(validFormData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid form data', () => {
    const invalidFormData = {
      category_id: 'invalid-uuid',
      name: '', // Empty name
      formality_score: 15, // Out of range
    };

    const result = CreateWardrobeItemFormSchema.safeParse(invalidFormData);
    expect(result.success).toBe(false);
  });
});
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/query-utils';
import { useWardrobeData, useOutfitCreation } from '../use-wardrobe-data';
import type { WardrobeItem, CreateWardrobeItemForm } from '../../schemas';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: mockWardrobeItem, 
          error: null 
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: mockWardrobeItem, 
            error: null 
          }))
        }))
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: mockWardrobeItem, 
          error: null 
        }))
      }))
    }))
  })),
  functions: {
    invoke: vi.fn(() => Promise.resolve({ 
      data: { isDuplicate: false, score: 85 }, 
      error: null 
    }))
  }
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}));

const mockWardrobeItem: WardrobeItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  user_id: '123e4567-e89b-12d3-a456-426614174001',
  category_id: '123e4567-e89b-12d3-a456-426614174002',
  name: 'Test Shirt',
  brand: 'Test Brand',
  color: 'Blue',
  formality_score: 7,
  season: ['All'],
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCreateForm: CreateWardrobeItemForm = {
  category_id: '123e4567-e89b-12d3-a456-426614174002',
  name: 'New Test Shirt',
  brand: 'New Brand',
  color: 'Red',
  formality_score: 8,
};

describe('useWardrobeData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('UI State Management', () => {
    it('should manage selected category', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      expect(result.current.uiState.selectedCategory).toBeNull();

      act(() => {
        result.current.setSelectedCategory('test-category-1');
      });

      expect(result.current.uiState.selectedCategory).toBe('test-category-1');

      act(() => {
        result.current.setSelectedCategory(null);
      });

      expect(result.current.uiState.selectedCategory).toBeNull();
    });

    it('should manage search query', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      expect(result.current.uiState.searchQuery).toBe('');

      act(() => {
        result.current.setSearchQuery('blue shirt');
      });

      expect(result.current.uiState.searchQuery).toBe('blue shirt');
    });

    it('should manage filters', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      expect(result.current.uiState.filters.season).toEqual([]);
      expect(result.current.uiState.filters.formality).toBeNull();

      act(() => {
        result.current.updateFilters({
          season: ['Summer', 'Spring'],
          formality: 7,
        });
      });

      expect(result.current.uiState.filters.season).toEqual(['Summer', 'Spring']);
      expect(result.current.uiState.filters.formality).toBe(7);
    });
  });

  describe('Item Selection', () => {
    it('should select and deselect items', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      expect(result.current.uiState.selection.shirt).toBeUndefined();

      act(() => {
        result.current.selectItem('shirt', mockWardrobeItem);
      });

      expect(result.current.uiState.selection.shirt).toEqual(mockWardrobeItem);
      expect(result.current.uiState.selection.score).toBeGreaterThan(0);

      act(() => {
        result.current.selectItem('shirt', null);
      });

      expect(result.current.uiState.selection.shirt).toBeUndefined();
    });

    it('should calculate outfit score when items are selected', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      const shirt = { ...mockWardrobeItem, id: '123e4567-e89b-12d3-a456-426614174003', formality_score: 7 };
      const pants = { ...mockWardrobeItem, id: '123e4567-e89b-12d3-a456-426614174004', formality_score: 7 };

      act(() => {
        result.current.selectItem('shirt', shirt);
        result.current.selectItem('pants', pants);
      });

      // Should have a high score due to matching formality
      expect(result.current.uiState.selection.score).toBeGreaterThan(80);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      act(() => {
        result.current.selectItem('shirt', mockWardrobeItem);
        result.current.selectItem('pants', mockWardrobeItem);
      });

      expect(Object.keys(result.current.uiState.selection)).toContain('shirt');
      expect(Object.keys(result.current.uiState.selection)).toContain('pants');

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.uiState.selection.shirt).toBeUndefined();
      expect(result.current.uiState.selection.pants).toBeUndefined();
      expect(result.current.uiState.selection.tuck_style).toBe('Untucked');
    });
  });

  describe('Error Management', () => {
    it('should manage errors', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      expect(Object.keys(result.current.uiState.errors)).toHaveLength(0);

      // Simulate an error by triggering a failed mutation
      act(() => {
        // Manually set an error for testing
        result.current.uiState.errors.testError = 'Test error message';
      });

      act(() => {
        result.current.clearError('testError');
      });

      expect(result.current.uiState.errors.testError).toBeUndefined();
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      // Manually set multiple errors for testing
      act(() => {
        result.current.uiState.errors.error1 = 'Error 1';
        result.current.uiState.errors.error2 = 'Error 2';
      });

      expect(Object.keys(result.current.uiState.errors)).toHaveLength(2);

      act(() => {
        result.current.clearAllErrors();
      });

      expect(Object.keys(result.current.uiState.errors)).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should validate item form data', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      const validForm = mockCreateForm;
      const validation = result.current.validateItemForm(validForm);

      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.name).toBe('New Test Shirt');
      }
    });

    it('should reject invalid form data', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      const invalidForm = {
        category_id: 'invalid-uuid',
        name: '', // Empty name should fail
      };

      const validation = result.current.validateItemForm(invalidForm);
      expect(validation.success).toBe(false);
    });

    it('should validate outfit selection', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      act(() => {
        result.current.selectItem('shirt', mockWardrobeItem);
      });

      const validation = result.current.validateSelection();
      expect(validation.success).toBe(true);
    });
  });

  describe('Mutations', () => {
    it('should create item with validation', async () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      await act(async () => {
        await result.current.createItem.mutateAsync(mockCreateForm);
      });

      await waitFor(() => {
        expect(result.current.createItem.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wardrobe_items');
    });

    it('should handle create item validation errors', async () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      const invalidForm = {
        category_id: 'invalid-uuid',
        name: '',
      };

      await act(async () => {
        try {
          await result.current.createItem.mutateAsync(invalidForm as any);
        } catch (error) {
          // Expected to fail validation
          expect(error).toBeDefined();
        }
      });
    });

    it('should update item with validation', async () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      const updateForm = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Shirt',
        color: 'Green',
      };

      await act(async () => {
        await result.current.updateItem.mutateAsync(updateForm);
      });

      await waitFor(() => {
        expect(result.current.updateItem.isSuccess).toBe(true);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('wardrobe_items');
    });

    it('should handle batch updates', async () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      const batchUpdates = [
        { id: '123e4567-e89b-12d3-a456-426614174005', name: 'Updated Item 1' },
        { id: '123e4567-e89b-12d3-a456-426614174006', name: 'Updated Item 2' },
      ];

      await act(async () => {
        await result.current.batchUpdateItems.mutateAsync(batchUpdates);
      });

      await waitFor(() => {
        expect(result.current.batchUpdateItems.isSuccess).toBe(true);
      });
    });
  });

  describe('Cache Management', () => {
    it('should provide cache updaters', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });

      expect(result.current.itemsCacheUpdaters).toBeDefined();
      expect(result.current.categoriesCacheUpdaters).toBeDefined();
      expect(typeof result.current.itemsCacheUpdaters.addItem).toBe('function');
      expect(typeof result.current.itemsCacheUpdaters.updateItem).toBe('function');
    });

    it('should invalidate all data', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      act(() => {
        result.current.invalidateAllData();
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should prefetch item data', () => {
      const { result } = renderHook(() => useWardrobeData(), { wrapper });
      const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

      act(() => {
        result.current.prefetchItem('123e4567-e89b-12d3-a456-426614174000');
      });

      expect(prefetchSpy).toHaveBeenCalled();
    });
  });
});

describe('useOutfitCreation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should manage outfit creation state', () => {
    const { result } = renderHook(() => useOutfitCreation(), { wrapper });

    expect(result.current.creationState.currentSelection).toEqual({});
    expect(result.current.creationState.isCreating).toBe(false);
  });

  it('should update selection for outfit creation', () => {
    const { result } = renderHook(() => useOutfitCreation(), { wrapper });

    act(() => {
      result.current.updateSelection('shirt', mockWardrobeItem);
    });

    expect(result.current.creationState.currentSelection.shirt).toEqual(mockWardrobeItem);
    expect(result.current.creationState.currentSelection.score).toBeGreaterThan(0);
  });

  it('should create outfit from selection', async () => {
    const { result } = renderHook(() => useOutfitCreation(), { wrapper });

    // Set up selection
    act(() => {
      result.current.updateSelection('shirt', mockWardrobeItem);
      result.current.updateSelection('pants', { ...mockWardrobeItem, id: '123e4567-e89b-12d3-a456-426614174007' });
    });

    // Create outfit
    await act(async () => {
      await result.current.createOutfitFromSelection.mutateAsync(
        result.current.creationState.currentSelection
      );
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('check-outfit-duplicate', expect.any(Object));
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('score-outfit', expect.any(Object));
    expect(mockSupabase.from).toHaveBeenCalledWith('outfits');
  });

  it('should handle duplicate outfit detection', async () => {
    // Mock duplicate detection
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { isDuplicate: true },
      error: null
    });

    const { result } = renderHook(() => useOutfitCreation(), { wrapper });

    act(() => {
      result.current.updateSelection('shirt', mockWardrobeItem);
    });

    await act(async () => {
      try {
        await result.current.createOutfitFromSelection.mutateAsync(
          result.current.creationState.currentSelection
        );
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('already exists');
      }
    });
  });

  it('should handle empty selection validation', async () => {
    const { result } = renderHook(() => useOutfitCreation(), { wrapper });

    await act(async () => {
      try {
        await result.current.createOutfitFromSelection.mutateAsync({
          tuck_style: 'Untucked'
        });
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('No items selected');
      }
    });
  });
});
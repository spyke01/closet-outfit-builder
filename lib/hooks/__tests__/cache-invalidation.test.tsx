import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useWardrobeItems, 
  useCreateWardrobeItem, 
  useUpdateWardrobeItem,
  useDeleteWardrobeItem 
} from '../use-wardrobe-items';
import { useOutfits, useCreateOutfit } from '../use-outfits';
import { createTestQueryClient } from '../../test/query-utils';
import { mockSupabaseClient } from '../../test/setup';
import { queryKeys } from '../../query-client';
import type { WardrobeItem } from '../../types/database';

const mockUserId = 'test-user-id';

describe('Cache Invalidation and Optimistic Updates', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  describe('Optimistic Updates', () => {
    it('should optimistically add item to wardrobe list', async () => {
      const existingItems: WardrobeItem[] = [
        {
          id: '1',
          user_id: mockUserId,
          category_id: 'cat-1',
          name: 'Existing Item',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate the cache with existing items
      queryClient.setQueryData(queryKeys.wardrobe.items(mockUserId), existingItems);

      const newItem = {
        category_id: 'cat-1',
        name: 'New Item',
      };

      // Mock successful creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-id',
          user_id: mockUserId,
          ...newItem,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const { result: createResult } = renderHook(() => useCreateWardrobeItem(), { 
        wrapper: createWrapper() 
      });
      const { result: itemsResult } = renderHook(() => useWardrobeItems(), { 
        wrapper: createWrapper() 
      });

      // Check initial state
      expect(itemsResult.current.data).toHaveLength(1);

      // Trigger optimistic update
      createResult.current.mutate(newItem);

      // Should immediately see optimistic update
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<WardrobeItem[]>(
          queryKeys.wardrobe.items(mockUserId)
        );
        expect(cachedData).toHaveLength(2);
        expect(cachedData?.[1].name).toBe('New Item');
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });
    });

    it('should rollback optimistic update on error', async () => {
      const existingItems: WardrobeItem[] = [
        {
          id: '1',
          user_id: mockUserId,
          category_id: 'cat-1',
          name: 'Existing Item',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate the cache
      queryClient.setQueryData(queryKeys.wardrobe.items(mockUserId), existingItems);

      const newItem = {
        category_id: 'cat-1',
        name: 'Failed Item',
      };

      // Mock failed creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      const { result: createResult } = renderHook(() => useCreateWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      // Trigger optimistic update
      createResult.current.mutate(newItem);

      // Should see optimistic update initially
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<WardrobeItem[]>(
          queryKeys.wardrobe.items(mockUserId)
        );
        expect(cachedData).toHaveLength(2);
      });

      // Wait for mutation to fail and rollback
      await waitFor(() => {
        expect(createResult.current.isError).toBe(true);
      });

      // Should rollback to original state
      const finalCachedData = queryClient.getQueryData<WardrobeItem[]>(
        queryKeys.wardrobe.items(mockUserId)
      );
      expect(finalCachedData).toHaveLength(1);
      expect(finalCachedData?.[0].name).toBe('Existing Item');
    });

    it('should optimistically update item in wardrobe list', async () => {
      const existingItems: WardrobeItem[] = [
        {
          id: '1',
          user_id: mockUserId,
          category_id: 'cat-1',
          name: 'Original Name',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate the cache
      queryClient.setQueryData(queryKeys.wardrobe.items(mockUserId), existingItems);

      const updateData = {
        id: '1',
        name: 'Updated Name',
      };

      // Mock successful update
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: {
          ...existingItems[0],
          ...updateData,
          updated_at: '2024-01-01T01:00:00Z',
        },
        error: null,
      });

      const { result: updateResult } = renderHook(() => useUpdateWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      // Trigger optimistic update
      updateResult.current.mutate(updateData);

      // Should immediately see optimistic update
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<WardrobeItem[]>(
          queryKeys.wardrobe.items(mockUserId)
        );
        expect(cachedData?.[0].name).toBe('Updated Name');
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });
    });

    it('should optimistically remove item from wardrobe list', async () => {
      const existingItems: WardrobeItem[] = [
        {
          id: '1',
          user_id: mockUserId,
          category_id: 'cat-1',
          name: 'Item to Delete',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: mockUserId,
          category_id: 'cat-1',
          name: 'Item to Keep',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Pre-populate the cache
      queryClient.setQueryData(queryKeys.wardrobe.items(mockUserId), existingItems);

      // Mock successful deletion
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result: deleteResult } = renderHook(() => useDeleteWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      // Trigger optimistic update
      deleteResult.current.mutate('1');

      // Should immediately see optimistic update
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<WardrobeItem[]>(
          queryKeys.wardrobe.items(mockUserId)
        );
        expect(cachedData).toHaveLength(1);
        expect(cachedData?.[0].name).toBe('Item to Keep');
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate related queries after wardrobe item creation', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const newItem = {
        category_id: 'cat-1',
        name: 'New Item',
      };

      // Mock successful creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-id',
          user_id: mockUserId,
          ...newItem,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const { result } = renderHook(() => useCreateWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(newItem);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate wardrobe queries
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.wardrobe.all });
    });

    it('should invalidate outfit queries after wardrobe item deletion', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Mock successful deletion
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useDeleteWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate('item-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate both wardrobe and outfit queries
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.wardrobe.all });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.all });
    });

    it('should invalidate outfit queries after outfit creation', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const newOutfit = {
        name: 'New Outfit',
        items: ['item-1', 'item-2'],
      };

      // Mock all the required calls for outfit creation
      mockSupabaseClient.functions.invoke
        .mockResolvedValueOnce({ data: { isDuplicate: false }, error: null })
        .mockResolvedValueOnce({ data: { score: 85 }, error: null });

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-outfit-id',
          user_id: mockUserId,
          name: 'New Outfit',
          score: 85,
          weight: 1,
          loved: false,
          source: 'curated',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'new-outfit-id',
          name: 'New Outfit',
          outfit_items: []
        },
        error: null,
      });

      const { result } = renderHook(() => useCreateOutfit(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(newOutfit);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate outfit queries
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.outfits.all });
    });
  });
});
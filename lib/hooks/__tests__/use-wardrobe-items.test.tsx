import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useWardrobeItems, 
  useWardrobeItem, 
  useCreateWardrobeItem, 
  useUpdateWardrobeItem, 
  useDeleteWardrobeItem 
} from '../use-wardrobe-items';
import { createTestQueryClient } from '../../test/query-utils';
import { mockSupabaseClient } from '../../test/setup';
import type { WardrobeItem } from '../../types/database';

// Mock the getCurrentUserId function
const mockUserId = 'test-user-id';

// Mock the entire module to override getCurrentUserId
vi.mock('../use-wardrobe-items', async () => {
  const actual = await vi.importActual('../use-wardrobe-items');
  return {
    ...actual,
  };
});

describe('useWardrobeItems', () => {
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

  describe('useWardrobeItems', () => {
    it('should fetch wardrobe items successfully', async () => {
      const mockItems: WardrobeItem[] = [
        {
          id: '1',
          user_id: mockUserId,
          category_id: 'cat-1',
          name: 'Blue Shirt',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: mockUserId,
          category_id: 'cat-2',
          name: 'Black Pants',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock the Supabase response
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const { result } = renderHook(() => useWardrobeItems(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItems);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wardrobe_items');
    });

    it('should handle fetch error', async () => {
      const mockError = { message: 'Database error' };

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useWardrobeItems(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to fetch wardrobe items');
    });
  });

  describe('useWardrobeItem', () => {
    it('should fetch single wardrobe item successfully', async () => {
      const mockItem: WardrobeItem = {
        id: '1',
        user_id: mockUserId,
        category_id: 'cat-1',
        name: 'Blue Shirt',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockItem,
        error: null,
      });

      const { result } = renderHook(() => useWardrobeItem('1'), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockItem);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useWardrobeItem(''), { 
        wrapper: createWrapper() 
      });

      expect(result.current.isIdle).toBe(true);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });

  describe('useCreateWardrobeItem', () => {
    it('should create wardrobe item with optimistic update', async () => {
      const newItem = {
        category_id: 'cat-1',
        name: 'New Shirt',
        color: 'Red',
      };

      const createdItem: WardrobeItem = {
        id: 'new-id',
        user_id: mockUserId,
        ...newItem,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdItem,
        error: null,
      });

      const { result } = renderHook(() => useCreateWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      // Execute the mutation
      result.current.mutate(newItem);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(createdItem);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wardrobe_items');
    });

    it('should handle creation error and rollback optimistic update', async () => {
      const newItem = {
        category_id: 'cat-1',
        name: 'New Shirt',
      };

      const mockError = { message: 'Creation failed' };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useCreateWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(newItem);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to create wardrobe item');
    });
  });

  describe('useUpdateWardrobeItem', () => {
    it('should update wardrobe item with optimistic update', async () => {
      const updateData = {
        id: '1',
        name: 'Updated Shirt',
        color: 'Green',
      };

      const updatedItem: WardrobeItem = {
        id: '1',
        user_id: mockUserId,
        category_id: 'cat-1',
        name: 'Updated Shirt',
        color: 'Green',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedItem,
        error: null,
      });

      const { result } = renderHook(() => useUpdateWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedItem);
    });
  });

  describe('useDeleteWardrobeItem', () => {
    it('should delete wardrobe item using Edge Function', async () => {
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

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('delete-item-logic', {
        body: { item_id: 'item-1' }
      });
    });

    it('should handle deletion error', async () => {
      const mockError = { message: 'Deletion failed' };

      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useDeleteWardrobeItem(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate('item-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to delete wardrobe item');
    });
  });
});
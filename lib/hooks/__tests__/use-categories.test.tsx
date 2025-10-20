import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useCategories, 
  useCategory, 
  useAnchorCategories,
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  useReorderCategories
} from '../use-categories';
import { createTestQueryClient } from '../../test/query-utils';
import { mockSupabaseClient } from '../../test/setup';
import type { Category } from '../../types/database';

const mockUserId = 'test-user-id';

describe('useCategories', () => {
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

  describe('useCategories', () => {
    it('should fetch categories successfully', async () => {
      const mockCategories: Category[] = [
        {
          id: '1',
          user_id: mockUserId,
          name: 'Shirts',
          is_anchor_item: true,
          display_order: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: mockUserId,
          name: 'Pants',
          is_anchor_item: true,
          display_order: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabaseClient.from().select().order().mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const { result } = renderHook(() => useCategories(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories');
    });

    it('should handle fetch error', async () => {
      const mockError = { message: 'Database error' };

      mockSupabaseClient.from().select().order().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useCategories(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to fetch categories');
    });
  });

  describe('useCategory', () => {
    it('should fetch single category successfully', async () => {
      const mockCategory: Category = {
        id: '1',
        user_id: mockUserId,
        name: 'Jackets',
        is_anchor_item: true,
        display_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockCategory,
        error: null,
      });

      const { result } = renderHook(() => useCategory('1'), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCategory);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useCategory(''), { 
        wrapper: createWrapper() 
      });

      expect(result.current.isIdle).toBe(true);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });

  describe('useAnchorCategories', () => {
    it('should fetch anchor categories only', async () => {
      const mockAnchorCategories: Category[] = [
        {
          id: '1',
          user_id: mockUserId,
          name: 'Jackets',
          is_anchor_item: true,
          display_order: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockAnchorCategories,
        error: null,
      });

      const { result } = renderHook(() => useAnchorCategories(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAnchorCategories);
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('is_anchor_item', true);
    });
  });

  describe('useCreateCategory', () => {
    it('should create category with optimistic update', async () => {
      const newCategory = {
        name: 'Accessories',
        is_anchor_item: false,
        display_order: 5,
      };

      const createdCategory: Category = {
        id: 'new-id',
        user_id: mockUserId,
        ...newCategory,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: createdCategory,
        error: null,
      });

      const { result } = renderHook(() => useCreateCategory(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(newCategory);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(createdCategory);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories');
    });

    it('should handle creation error', async () => {
      const newCategory = {
        name: 'Invalid Category',
      };

      const mockError = { message: 'Creation failed' };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useCreateCategory(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(newCategory);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to create category');
    });
  });

  describe('useUpdateCategory', () => {
    it('should update category with optimistic update', async () => {
      const updateData = {
        id: '1',
        name: 'Updated Category',
        is_anchor_item: true,
      };

      const updatedCategory: Category = {
        id: '1',
        user_id: mockUserId,
        name: 'Updated Category',
        is_anchor_item: true,
        display_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedCategory,
        error: null,
      });

      const { result } = renderHook(() => useUpdateCategory(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedCategory);
    });
  });

  describe('useDeleteCategory', () => {
    it('should delete category after checking for items', async () => {
      // Mock empty items check
      mockSupabaseClient.from().select().eq().limit.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock successful deletion
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useDeleteCategory(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate('category-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wardrobe_items');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories');
    });

    it('should prevent deletion of category with items', async () => {
      // Mock items found
      mockSupabaseClient.from().select().eq().limit.mockResolvedValue({
        data: [{ id: 'item-1' }],
        error: null,
      });

      const { result } = renderHook(() => useDeleteCategory(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate('category-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Cannot delete category that contains wardrobe items');
    });
  });

  describe('useReorderCategories', () => {
    it('should reorder categories by updating display_order', async () => {
      const categoryOrders = [
        { id: '1', display_order: 2 },
        { id: '2', display_order: 1 },
      ];

      // Mock successful updates
      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useReorderCategories(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(categoryOrders);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseClient.from().update).toHaveBeenCalledTimes(2);
    });

    it('should handle reorder error', async () => {
      const categoryOrders = [
        { id: '1', display_order: 2 },
      ];

      const mockError = { message: 'Update failed' };

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useReorderCategories(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(categoryOrders);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to reorder categories');
    });
  });
});
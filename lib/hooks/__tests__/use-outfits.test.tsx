import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useOutfits, 
  useOutfit, 
  useOutfitsByAnchor,
  useCheckOutfitDuplicate,
  useScoreOutfit,
  useCreateOutfit, 
  useUpdateOutfit, 
  useDeleteOutfit 
} from '../use-outfits';
import { createTestQueryClient } from '../../test/query-utils';
import { mockSupabaseClient } from '../../test/setup';
import type { Outfit } from '../../types/database';

const mockUserId = 'test-user-id';

describe('useOutfits', () => {
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

  describe('useOutfits', () => {
    it('should fetch outfits successfully', async () => {
      const mockOutfits = [
        {
          id: '1',
          user_id: mockUserId,
          name: 'Casual Outfit',
          score: 85,
          weight: 1,
          loved: false,
          source: 'curated' as const,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          outfit_items: [
            {
              wardrobe_items: {
                id: 'item-1',
                name: 'Blue Shirt',
                category: { name: 'Shirts' }
              }
            }
          ]
        }
      ];

      mockSupabaseClient.from().select().order().mockResolvedValue({
        data: mockOutfits,
        error: null,
      });

      const { result } = renderHook(() => useOutfits(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].name).toBe('Casual Outfit');
      expect(result.current.data?.[0].items).toHaveLength(1);
    });

    it('should handle fetch error', async () => {
      const mockError = { message: 'Database error' };

      mockSupabaseClient.from().select().order().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useOutfits(), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to fetch outfits');
    });
  });

  describe('useOutfit', () => {
    it('should fetch single outfit successfully', async () => {
      const mockOutfit = {
        id: '1',
        user_id: mockUserId,
        name: 'Formal Outfit',
        score: 90,
        weight: 1,
        loved: true,
        source: 'curated' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        outfit_items: []
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockOutfit,
        error: null,
      });

      const { result } = renderHook(() => useOutfit('1'), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.name).toBe('Formal Outfit');
      expect(result.current.data?.loved).toBe(true);
    });
  });

  describe('useOutfitsByAnchor', () => {
    it('should fetch outfits by anchor item', async () => {
      const mockOutfits = [
        {
          id: '1',
          name: 'Outfit with Blue Jacket',
          items: []
        }
      ];

      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: mockOutfits,
        error: null,
      });

      const { result } = renderHook(() => useOutfitsByAnchor('jacket-1'), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOutfits);
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('filter-by-anchor', {
        body: { anchor_item_id: 'jacket-1' }
      });
    });

    it('should not fetch when itemId is empty', () => {
      const { result } = renderHook(() => useOutfitsByAnchor(''), { 
        wrapper: createWrapper() 
      });

      expect(result.current.isIdle).toBe(true);
      expect(mockSupabaseClient.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('useCheckOutfitDuplicate', () => {
    it('should check for duplicate outfits', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { isDuplicate: true },
        error: null,
      });

      const { result } = renderHook(() => useCheckOutfitDuplicate(['item-1', 'item-2']), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('check-outfit-duplicate', {
        body: { item_ids: ['item-1', 'item-2'] }
      });
    });

    it('should return false for empty item list', async () => {
      const { result } = renderHook(() => useCheckOutfitDuplicate([]), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(false);
    });
  });

  describe('useScoreOutfit', () => {
    it('should score outfit combination', async () => {
      const mockScore = { score: 85, breakdown: { formality: 8, color: 9 } };

      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: mockScore,
        error: null,
      });

      const { result } = renderHook(() => useScoreOutfit(['item-1', 'item-2']), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockScore);
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('score-outfit', {
        body: { item_ids: ['item-1', 'item-2'] }
      });
    });

    it('should return zero score for empty item list', async () => {
      const { result } = renderHook(() => useScoreOutfit([]), { 
        wrapper: createWrapper() 
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ score: 0, breakdown: {} });
    });
  });

  describe('useCreateOutfit', () => {
    it('should create outfit with duplicate check and scoring', async () => {
      const newOutfit = {
        name: 'New Outfit',
        items: ['item-1', 'item-2'],
        tuck_style: 'Tucked' as const,
      };

      // Mock duplicate check
      mockSupabaseClient.functions.invoke
        .mockResolvedValueOnce({
          data: { isDuplicate: false },
          error: null,
        })
        // Mock scoring
        .mockResolvedValueOnce({
          data: { score: 88 },
          error: null,
        });

      // Mock outfit creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-outfit-id',
          user_id: mockUserId,
          name: 'New Outfit',
          score: 88,
          weight: 1,
          loved: false,
          source: 'curated',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      // Mock outfit items creation
      mockSupabaseClient.from().insert().mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock complete outfit fetch
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

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('check-outfit-duplicate', {
        body: { item_ids: ['item-1', 'item-2'] }
      });
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('score-outfit', {
        body: { item_ids: ['item-1', 'item-2'] }
      });
    });

    it('should prevent creation of duplicate outfits', async () => {
      const newOutfit = {
        name: 'Duplicate Outfit',
        items: ['item-1', 'item-2'],
      };

      // Mock duplicate check returning true
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { isDuplicate: true },
        error: null,
      });

      const { result } = renderHook(() => useCreateOutfit(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(newOutfit);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('This outfit combination already exists');
    });
  });

  describe('useUpdateOutfit', () => {
    it('should update outfit with optimistic update', async () => {
      const updateData = {
        id: '1',
        name: 'Updated Outfit',
        loved: true,
      };

      const updatedOutfit: Outfit = {
        id: '1',
        user_id: mockUserId,
        name: 'Updated Outfit',
        weight: 1,
        loved: true,
        source: 'curated',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: updatedOutfit,
        error: null,
      });

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { ...updatedOutfit, outfit_items: [] },
        error: null,
      });

      const { result } = renderHook(() => useUpdateOutfit(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.name).toBe('Updated Outfit');
      expect(result.current.data?.loved).toBe(true);
    });
  });

  describe('useDeleteOutfit', () => {
    it('should delete outfit with optimistic update', async () => {
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useDeleteOutfit(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate('outfit-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('outfits');
    });

    it('should handle deletion error', async () => {
      const mockError = { message: 'Deletion failed' };

      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useDeleteOutfit(), { 
        wrapper: createWrapper() 
      });

      result.current.mutate('outfit-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Failed to delete outfit');
    });
  });
});
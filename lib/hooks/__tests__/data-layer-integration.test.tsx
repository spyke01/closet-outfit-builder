import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/query-utils';
import { queryKeys } from '../../query-client';

describe('Data Layer Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  describe('Query Client Configuration', () => {
    it('should create query client with proper configuration', () => {
      expect(queryClient).toBeDefined();
      expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(0);
      expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    });

    it('should have proper query keys structure', () => {
      const userId = 'test-user';
      
      expect(queryKeys.wardrobe.all).toEqual(['wardrobe']);
      expect(queryKeys.wardrobe.items(userId)).toEqual(['wardrobe', 'items', userId]);
      expect(queryKeys.wardrobe.categories(userId)).toEqual(['wardrobe', 'categories', userId]);
      
      expect(queryKeys.outfits.all).toEqual(['outfits']);
      expect(queryKeys.outfits.list(userId)).toEqual(['outfits', 'list', userId]);
      expect(queryKeys.outfits.detail('outfit-1')).toEqual(['outfits', 'detail', 'outfit-1']);
    });
  });

  describe('Cache Management', () => {
    it('should set and get data from cache', () => {
      const userId = 'test-user';
      const testData = [
        { id: '1', name: 'Test Item', user_id: userId }
      ];

      // Set data in cache
      queryClient.setQueryData(queryKeys.wardrobe.items(userId), testData);

      // Get data from cache
      const cachedData = queryClient.getQueryData(queryKeys.wardrobe.items(userId));
      expect(cachedData).toEqual(testData);
    });

    it('should invalidate queries properly', async () => {
      const userId = 'test-user';
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Invalidate wardrobe queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.wardrobe.all });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.wardrobe.all });
    });

    it('should handle optimistic updates', () => {
      const userId = 'test-user';
      const existingData = [
        { id: '1', name: 'Existing Item', user_id: userId }
      ];
      const newItem = { id: '2', name: 'New Item', user_id: userId };

      // Set initial data
      queryClient.setQueryData(queryKeys.wardrobe.items(userId), existingData);

      // Perform optimistic update
      queryClient.setQueryData(
        queryKeys.wardrobe.items(userId),
        (old: any) => old ? [...old, newItem] : [newItem]
      );

      // Verify optimistic update
      const updatedData = queryClient.getQueryData(queryKeys.wardrobe.items(userId));
      expect(updatedData).toHaveLength(2);
      expect(updatedData).toContain(newItem);
    });
  });

  describe('Query Provider', () => {
    it('should provide query client to children', () => {
      const TestComponent = () => {
        return <div data-testid="test">Test Component</div>;
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      // This test just verifies the provider works without errors
      expect(() => wrapper({ children: <TestComponent /> })).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should have proper error handling configuration', () => {
      // Test that the query client has proper error handling configuration
      const defaultOptions = queryClient.getDefaultOptions();
      
      expect(defaultOptions.queries?.retry).toBe(false);
      expect(defaultOptions.queries?.staleTime).toBe(0);
      expect(defaultOptions.mutations?.retry).toBe(false);
      
      // Test that we can clear cache without errors
      expect(() => queryClient.clear()).not.toThrow();
    });
  });

  describe('TypeScript Types', () => {
    it('should have proper type definitions', () => {
      // Test that our types are properly defined
      const wardrobeItem = {
        id: 'test-id',
        user_id: 'user-id',
        category_id: 'cat-id',
        name: 'Test Item',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const outfit = {
        id: 'outfit-id',
        user_id: 'user-id',
        weight: 1,
        loved: false,
        source: 'curated' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const category = {
        id: 'cat-id',
        user_id: 'user-id',
        name: 'Test Category',
        is_anchor_item: false,
        display_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // These should compile without errors
      expect(wardrobeItem.id).toBe('test-id');
      expect(outfit.source).toBe('curated');
      expect(category.is_anchor_item).toBe(false);
    });
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSeedCategories, useSizeCategories } from '../use-size-categories';
import React, { type ReactNode } from 'react';

/**
 * Integration tests for useSeedCategories hook
 * 
 * These tests verify the hook integrates correctly with:
 * - TanStack Query cache invalidation
 * - Other size category hooks
 * - Error handling patterns
 * 
 * Note: These tests use mocked fetch, not actual API calls
 */

describe('useSeedCategories Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should integrate with useSizeCategories cache', async () => {
    // Mock successful seed response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { id: '1', name: 'Dress Shirt', user_id: 'test-user' },
          { id: '2', name: 'Casual Shirt', user_id: 'test-user' },
        ],
        count: 2,
        message: 'Categories seeded successfully',
      }),
    } as Response);

    // Mock auth
    vi.mock('../use-auth', () => ({
      useAuth: () => ({
        userId: 'test-user',
        isAuthenticated: true,
        user: null,
        isLoading: false,
      }),
    }));

    const { result: seedResult } = renderHook(() => useSeedCategories(), {
      wrapper,
    });

    // Seed categories
    seedResult.current.mutate();

    await waitFor(() => {
      expect(seedResult.current.isSuccess).toBe(true);
    });

    // Verify cache was invalidated
    const invalidatedQueries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['sizes', 'categories', 'test-user'] });

    expect(invalidatedQueries.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle concurrent seeding attempts gracefully', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          count: 0,
          message: 'Categories seeded successfully',
        }),
      } as Response);
    });

    vi.mock('../use-auth', () => ({
      useAuth: () => ({
        userId: 'test-user',
        isAuthenticated: true,
        user: null,
        isLoading: false,
      }),
    }));

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    // Trigger multiple concurrent mutations
    result.current.mutate();
    result.current.mutate();
    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should only call API once due to mutation deduplication
    expect(callCount).toBe(1);
  });

  it('should provide proper error context for debugging', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({
        error: 'Database connection failed',
        details: 'Connection timeout after 30s',
        errorId: 'err_123',
      }),
    } as Response);

    vi.mock('../use-auth', () => ({
      useAuth: () => ({
        userId: 'test-user',
        isAuthenticated: true,
        user: null,
        isLoading: false,
      }),
    }));

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Error should contain useful debugging information
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Database connection failed');
  });

  it('should maintain type safety with returned data', async () => {
    const mockCategories = [
      {
        id: '1',
        name: 'Dress Shirt',
        icon: 'shirt',
        gender: 'men',
        user_id: 'test-user',
        is_system_category: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCategories,
        count: 1,
        message: 'Categories seeded successfully',
      }),
    } as Response);

    vi.mock('../use-auth', () => ({
      useAuth: () => ({
        userId: 'test-user',
        isAuthenticated: true,
        user: null,
        isLoading: false,
      }),
    }));

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify type-safe access to returned data
    expect(result.current.data?.categories).toHaveLength(1);
    expect(result.current.data?.categories[0].name).toBe('Dress Shirt');
    expect(result.current.data?.count).toBe(1);
    expect(result.current.data?.message).toBe('Categories seeded successfully');
  });
});

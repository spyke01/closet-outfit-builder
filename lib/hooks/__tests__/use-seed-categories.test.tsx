import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSeedCategories } from '../use-size-categories';
import { useAuth } from '../use-auth';
import React, { type ReactNode } from 'react';

// Mock the auth hook
vi.mock('../use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useSeedCategories', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default auth mock
    vi.mocked(useAuth).mockReturnValue({
      userId: 'test-user-id',
      isAuthenticated: true,
      user: null,
      isLoading: false,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should successfully seed categories', async () => {
    const mockCategories = [
      { id: '1', name: 'Dress Shirt', icon: 'shirt', gender: 'men' },
      { id: '2', name: 'Casual Shirt', icon: 'shirt', gender: 'men' },
    ];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCategories,
        count: 2,
        message: 'Categories seeded successfully',
      }),
    } as Response);

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith('/api/sizes/seed-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(result.current.data).toEqual({
      categories: mockCategories,
      count: 2,
      message: 'Categories seeded successfully',
    });
  });

  it('should invalidate categories cache after seeding', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        count: 0,
        message: 'Categories seeded successfully',
      }),
    } as Response);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['sizes', 'categories', 'test-user-id'],
    });
  });

  it('should provide loading state during seeding', async () => {
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: [],
                count: 0,
                message: 'Categories seeded successfully',
              }),
            } as Response);
          }, 100);
        })
    );

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    // Wait for pending state to be set
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });

  it('should handle authentication error', async () => {
    vi.mocked(useAuth).mockReturnValue({
      userId: null,
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(
      new Error('User must be authenticated to seed categories')
    );
  });

  it('should handle API error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({
        error: 'Failed to seed categories',
        details: 'Database error',
      }),
    } as Response);

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed to seed categories');
  });

  it('should handle API error without json body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as Response);

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toContain('Internal Server Error');
  });

  it('should handle success response with success: false', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Seeding failed',
      }),
    } as Response);

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Seeding failed');
  });

  it('should handle network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Network error');
  });

  it('should be idempotent - safe to call multiple times', async () => {
    const mockCategories = [
      { id: '1', name: 'Dress Shirt', icon: 'shirt', gender: 'men' },
    ];

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCategories,
        count: 1,
        message: 'Categories seeded successfully',
      }),
    } as Response);

    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    // First call
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Reset state
    result.current.reset();

    // Second call
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.data?.count).toBe(1);
  });

  it('should follow existing mutation patterns', () => {
    const { result } = renderHook(() => useSeedCategories(), { wrapper });

    // Should have standard mutation properties
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('mutateAsync');
    expect(result.current).toHaveProperty('isPending');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('isSuccess');
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('reset');
  });
});

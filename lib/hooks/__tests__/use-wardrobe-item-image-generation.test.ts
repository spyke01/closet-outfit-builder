import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/actions/wardrobe-item-images', () => ({
  generateWardrobeItemImage: vi.fn(),
  getImageGenerationQuota: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({})),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockItemId = '550e8400-e29b-41d4-a716-446655440001';

describe('useGenerateWardrobeItemImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers generation mutation and returns isGenerating state', async () => {
    const { generateWardrobeItemImage } = await import('@/lib/actions/wardrobe-item-images');
    vi.mocked(generateWardrobeItemImage).mockResolvedValue({
      success: true,
      image_url: 'https://example.com/generated.webp',
      quota_remaining: { monthly: 29, hourly: 4 },
    });

    const { useGenerateWardrobeItemImage } = await import('../use-wardrobe-item-image-generation');
    const { result } = renderHook(() => useGenerateWardrobeItemImage(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isGenerating).toBe(false);

    await act(async () => {
      result.current.generate({ wardrobe_item_id: mockItemId });
    });

    await waitFor(() =>
      expect(vi.mocked(generateWardrobeItemImage)).toHaveBeenCalledWith({
        wardrobe_item_id: mockItemId,
        is_retry: false,
      }),
    );
  });

  it('exposes error state when generation returns failure', async () => {
    const { generateWardrobeItemImage } = await import('@/lib/actions/wardrobe-item-images');
    vi.mocked(generateWardrobeItemImage).mockResolvedValue({
      success: false,
      error: 'Monthly limit reached',
      error_code: 'USAGE_LIMIT_EXCEEDED',
    });

    const { useGenerateWardrobeItemImage } = await import('../use-wardrobe-item-image-generation');
    const { result } = renderHook(() => useGenerateWardrobeItemImage(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.generate({ wardrobe_item_id: mockItemId });
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('Monthly limit reached');
  });

  it('enforces 3-second debounce: second rapid call is ignored', async () => {
    const { generateWardrobeItemImage } = await import('@/lib/actions/wardrobe-item-images');
    vi.mocked(generateWardrobeItemImage).mockResolvedValue({
      success: true,
      image_url: 'https://example.com/generated.webp',
      quota_remaining: { monthly: 29, hourly: 4 },
    });

    const { useGenerateWardrobeItemImage } = await import('../use-wardrobe-item-image-generation');
    const { result } = renderHook(() => useGenerateWardrobeItemImage(), {
      wrapper: createWrapper(),
    });

    // Fire two calls in the same act — they're within the 3s debounce window
    await act(async () => {
      result.current.generate({ wardrobe_item_id: mockItemId });
      result.current.generate({ wardrobe_item_id: mockItemId });
    });

    // Only one call should reach the server action
    await waitFor(() =>
      expect(vi.mocked(generateWardrobeItemImage)).toHaveBeenCalledTimes(1),
    );
  });
});

describe('useImageGenerationQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns quota data including tier and limits', async () => {
    const { getImageGenerationQuota } = await import('@/lib/actions/wardrobe-item-images');
    vi.mocked(getImageGenerationQuota).mockResolvedValue({
      success: true,
      tier: 'plus',
      limits: {
        monthly_limit: 30,
        monthly_remaining: 25,
        monthly_reset_at: '2026-03-17T00:00:00Z',
        hourly_limit: 5,
        hourly_remaining: 4,
      },
    });

    const { useImageGenerationQuota } = await import('../use-wardrobe-item-image-generation');
    const { result } = renderHook(() => useImageGenerationQuota(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

    expect(result.current.tier).toBe('plus');
    expect(result.current.limits.monthly_remaining).toBe(25);
    expect(result.current.canGenerate).toBe(true);
    expect(result.current.isFreeTier).toBe(false);
  });

  it('returns isFreeTier true and canGenerate false when tier is free', async () => {
    const { getImageGenerationQuota } = await import('@/lib/actions/wardrobe-item-images');
    vi.mocked(getImageGenerationQuota).mockResolvedValue({
      success: true,
      tier: 'free',
      limits: {
        monthly_limit: 0,
        monthly_remaining: 0,
        monthly_reset_at: '2026-03-17T00:00:00Z',
        hourly_limit: 5,
        hourly_remaining: 5,
      },
    });

    const { useImageGenerationQuota } = await import('../use-wardrobe-item-image-generation');
    const { result } = renderHook(() => useImageGenerationQuota(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

    expect(result.current.isFreeTier).toBe(true);
    expect(result.current.canGenerate).toBe(false);
  });
});

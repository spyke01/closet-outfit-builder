import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { WardrobeItemImageGenerator } from '../wardrobe-item-image-generator';
import {
  useGenerateWardrobeItemImage,
  useImageGenerationQuota,
} from '@/lib/hooks/use-wardrobe-item-image-generation';

vi.mock('@/lib/hooks/use-wardrobe-item-image-generation', () => ({
  useGenerateWardrobeItemImage: vi.fn(),
  useImageGenerationQuota: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockItemWithData = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Navy Blazer',
  color: 'navy',
  category: { name: 'Blazer' },
  image_url: null,
};

const mockItemMissingData = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Unknown Item',
  color: null,
  category: null,
  image_url: null,
};

const freeTierQuotaMock = {
  tier: 'free' as const,
  isFreeTier: true,
  canGenerate: false,
  isLoading: false,
  limits: {
    monthly_limit: 0,
    monthly_remaining: 0,
    monthly_reset_at: '2026-03-17T00:00:00Z',
    hourly_limit: 5,
    hourly_remaining: 5,
  },
};

function plusTierQuotaMock(remaining = 25) {
  return {
    tier: 'plus' as const,
    isFreeTier: false,
    canGenerate: true,
    isLoading: false,
    limits: {
      monthly_limit: 30,
      monthly_remaining: remaining,
      monthly_reset_at: '2026-03-17T00:00:00Z',
      hourly_limit: 5,
      hourly_remaining: 4,
    },
  };
}

function renderGenerator(item = mockItemWithData) {
  const Wrapper = createWrapper();
  return render(
    React.createElement(Wrapper, null,
      React.createElement(WardrobeItemImageGenerator, { item }),
    ),
  );
}

describe('WardrobeItemImageGenerator - free tier locked state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGenerateWardrobeItemImage).mockReturnValue({
      generate: vi.fn(),
      isGenerating: false,
      error: null,
    });
    vi.mocked(useImageGenerationQuota).mockReturnValue(freeTierQuotaMock);
  });

  it('shows Generate with AI button for free-tier users (with lock icon)', () => {
    renderGenerator();
    const btn = screen.getByLabelText(/generate image with ai \(requires upgrade\)/i);
    expect(btn).toBeInTheDocument();
  });

  it('shows upgrade prompt when free-tier user clicks the locked button', async () => {
    renderGenerator();
    const btn = screen.getByLabelText(/generate image with ai \(requires upgrade\)/i);
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/upgrade your plan/i)).toBeInTheDocument();
    });
  });
});

describe('WardrobeItemImageGenerator - quota display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGenerateWardrobeItemImage).mockReturnValue({
      generate: vi.fn(),
      isGenerating: false,
      error: null,
    });
    vi.mocked(useImageGenerationQuota).mockReturnValue(plusTierQuotaMock(25));
  });

  it('shows monthly remaining count for paid tier after quota loads', () => {
    renderGenerator();
    expect(screen.getByText(/25 of 30 image generations remaining/i)).toBeInTheDocument();
  });
});

describe('WardrobeItemImageGenerator - error messages', () => {
  it('shows monthly limit error when USAGE_LIMIT_EXCEEDED returned', () => {
    vi.clearAllMocks();
    const err = Object.assign(new Error('Monthly limit reached'), {
      error_code: 'USAGE_LIMIT_EXCEEDED',
    });
    vi.mocked(useGenerateWardrobeItemImage).mockReturnValue({
      generate: vi.fn(),
      isGenerating: false,
      error: err,
    });
    vi.mocked(useImageGenerationQuota).mockReturnValue(plusTierQuotaMock(0));

    renderGenerator();
    expect(screen.getByText(/monthly limit reached/i)).toBeInTheDocument();
  });

  it('shows missing data warning when item lacks color or category', () => {
    vi.clearAllMocks();
    vi.mocked(useGenerateWardrobeItemImage).mockReturnValue({
      generate: vi.fn(),
      isGenerating: false,
      error: null,
    });
    vi.mocked(useImageGenerationQuota).mockReturnValue(plusTierQuotaMock());

    renderGenerator(mockItemMissingData as unknown as typeof mockItemWithData);
    expect(screen.getByText(/add a color/i)).toBeInTheDocument();
  });
});

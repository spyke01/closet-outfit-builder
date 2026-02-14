import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirectMock,
  getUserMock,
  hasActiveWardrobeItemsMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getUserMock: vi.fn(),
  hasActiveWardrobeItemsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}));

vi.mock('@/lib/server/wardrobe-readiness', () => ({
  hasActiveWardrobeItems: hasActiveWardrobeItemsMock,
}));

vi.mock('../[category]/anchor-category-client', () => ({
  AnchorCategoryPageClient: ({ categoryName }: { categoryName: string }) => (
    <div data-testid="anchor-category">{categoryName}</div>
  ),
}));

vi.mock('../[category]/[id]/anchor-outfit-builder-client', () => ({
  AnchorOutfitBuilderClient: ({
    categoryName,
    anchorItemId,
  }: {
    categoryName: string;
    anchorItemId: string;
  }) => (
    <div data-testid="anchor-detail">{categoryName}:{anchorItemId}</div>
  ),
}));

import AnchorCategoryPage from '../[category]/page';
import AnchorItemPage from '../[category]/[id]/page';

describe('Anchor page gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('redirects category page to onboarding when wardrobe is empty', async () => {
    hasActiveWardrobeItemsMock.mockResolvedValue(false);

    await expect(
      AnchorCategoryPage({
        params: Promise.resolve({ category: 'tops' }),
      })
    ).rejects.toThrow('REDIRECT:/onboarding');
  });

  it('redirects detail page to onboarding when wardrobe is empty', async () => {
    hasActiveWardrobeItemsMock.mockResolvedValue(false);

    await expect(
      AnchorItemPage({
        params: Promise.resolve({ category: 'tops', id: 'item-1' }),
      })
    ).rejects.toThrow('REDIRECT:/onboarding');
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from '../onboarding-wizard';

const {
  pushMock,
  ensureCategoriesExistMock,
  persistWardrobeItemsMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  ensureCategoriesExistMock: vi.fn(),
  persistWardrobeItemsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    userId: 'user-1',
  }),
}));

vi.mock('@/lib/services/onboarding-category-manager', () => ({
  ensureCategoriesExist: ensureCategoriesExistMock,
}));

vi.mock('@/lib/services/onboarding-persister', () => ({
  persistWardrobeItems: persistWardrobeItemsMock,
}));

describe('OnboardingWizard completion redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureCategoriesExistMock.mockResolvedValue(new Map([['Tops', 'cat-1']]));
    persistWardrobeItemsMock.mockResolvedValue({
      success: 1,
      failed: 0,
      errors: [],
    });

    sessionStorage.setItem(
      'onboarding-wizard-state',
      JSON.stringify({
        step: 5,
        styleBaseline: { primaryUse: 'Work', climate: 'Hot' },
        selectedCategories: ['Tops'],
        selectedSubcategories: { Tops: ['T-Shirt'] },
        colorQuantitySelections: {},
        generatedItems: [
          {
            id: 'tmp-1',
            category: 'Tops',
            subcategory: 'T-Shirt',
            name: 'Navy T-Shirt',
            color: 'navy',
            formality_score: 3,
            season: ['All'],
            image_url: null,
            source: 'onboarding',
          },
        ],
        itemCapEnabled: true,
        itemCap: 50,
      })
    );
  });

  it('redirects directly to /wardrobe after successful save', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <OnboardingWizard />
      </QueryClientProvider>
    );

    const createButton = await screen.findByRole('button', { name: /create your wardrobe/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/wardrobe');
    });
  });
});

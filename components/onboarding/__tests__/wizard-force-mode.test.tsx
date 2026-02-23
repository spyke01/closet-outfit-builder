import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from '../onboarding-wizard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
  }),
}));

describe('OnboardingWizard force mode', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts from fresh step 1 when force mode is enabled', async () => {
    sessionStorage.setItem('onboarding-wizard-state', JSON.stringify({
      step: 5,
      styleBaseline: { primaryUse: 'Work', climate: 'Hot' },
      selectedCategories: ['Tops'],
      selectedSubcategories: { Tops: ['T-Shirt'] },
      colorQuantitySelections: { 'Tops-T-Shirt': { subcategory: 'T-Shirt', colors: ['navy'] } },
      generatedItems: [
        {
          id: 'temp-1',
          category: 'Tops',
          subcategory: 'T-Shirt',
          name: 'Navy T-Shirt',
          color: 'navy',
          formality_score: 2,
          season: ['All'],
          image_url: null,
          source: 'onboarding',
        },
      ],
      itemCapEnabled: true,
      itemCap: 50,
    }));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <OnboardingWizard forceMode forceFreshStart />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tell us about your style/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      const stored = sessionStorage.getItem('onboarding-wizard-state');
      expect(stored).toBeTruthy();
      expect(stored).toContain('"step":1');
    });
  });
});

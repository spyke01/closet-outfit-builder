import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { CreateOutfitPageClient } from '../create-outfit-client';
import { Category, WardrobeItem } from '@/lib/types/database';
import { renderWithQuery } from '@/lib/test/query-utils';

const mockCategories: Category[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Shirts',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    is_anchor_item: false,
    display_order: 1,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    name: 'Pants',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    is_anchor_item: false,
    display_order: 2,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

const mockItems: WardrobeItem[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
    name: 'White Shirt',
    brand: 'Adidas',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    active: true,
    bg_removal_status: 'completed',
    season: ['All'],
    formality_score: 6,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482',
    name: 'Black Pants',
    brand: 'Levis',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    active: true,
    bg_removal_status: 'completed',
    season: ['All'],
    formality_score: 8,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

const mockPush = vi.fn();
const mockMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null as Error | null,
  reset: vi.fn(),
};

let duplicateState = false;
let scoreState = { score: 85 };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/outfits/create',
}));

vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false }),
}));

vi.mock('@/lib/hooks/use-wardrobe-items', () => ({
  useWardrobeItems: () => ({ data: mockItems, isLoading: false }),
}));

vi.mock('@/lib/hooks/use-outfits', () => ({
  useCreateOutfit: () => mockMutation,
  useScoreOutfit: () => ({ data: scoreState }),
  useCheckOutfitDuplicate: () => ({ data: duplicateState }),
}));

vi.mock('@/components/dynamic/outfit-display-dynamic', () => ({
  OutfitDisplayWithErrorBoundary: () => <div data-testid="outfit-display" />,
}));

vi.mock('@/components/dynamic/items-grid-dynamic', () => ({
  ItemsGridWithErrorBoundary: ({
    items,
    onItemSelect,
  }: {
    items: WardrobeItem[];
    onItemSelect: (item: WardrobeItem | null) => void;
  }) => (
    <div data-testid="items-grid">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onItemSelect(item)}>
          {item.name}
        </button>
      ))}
    </div>
  ),
}));

let activeQueryClient: QueryClient | null = null;

function renderPage() {
  const rendered = renderWithQuery(<CreateOutfitPageClient />);
  activeQueryClient = rendered.queryClient;
  return rendered;
}

describe('Outfit Save Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    duplicateState = false;
    scoreState = { score: 85 };
    mockMutation.mutateAsync = vi.fn().mockResolvedValue({ id: 'new-outfit-id' });
    mockMutation.isPending = false;
    mockMutation.isSuccess = false;
    mockMutation.isError = false;
    mockMutation.error = null;
    mockMutation.reset = vi.fn();
  });

  afterEach(() => {
    activeQueryClient?.clear();
    activeQueryClient = null;
  });

  it('disables save until minimum outfit is selected', async () => {
    const user = userEvent.setup();

    renderPage();

    const createButton = screen.getByRole('button', { name: /create outfit/i });
    expect(createButton).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Shirts' })[0]);
    await user.click(await screen.findByText(/white shirt/i));
    expect(createButton).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Pants' })[0]);
    await user.click(await screen.findByText(/black pants/i));

    await waitFor(() => expect(createButton).not.toBeDisabled());
  });

  it('shows duplicate warning from duplicate check', async () => {
    duplicateState = true;

    renderPage();

    expect(
      screen.getAllByText('This outfit combination already exists in your collection.')
    ).toHaveLength(2);
  });

  it('shows save failure feedback from mutation state', () => {
    const saveError = new Error('Network error');

    mockMutation.mutateAsync = vi.fn().mockRejectedValue(saveError);
    mockMutation.isError = true;
    mockMutation.error = saveError;

    renderPage();

    expect(screen.getAllByText('Failed to create outfit: Network error')).toHaveLength(2);
  });
});

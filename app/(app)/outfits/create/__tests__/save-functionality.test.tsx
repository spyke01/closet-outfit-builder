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
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d483',
    name: 'Shoes',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    is_anchor_item: false,
    display_order: 3,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d484',
    name: 'Dress',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    is_anchor_item: false,
    display_order: 4,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d487',
    name: 'Overshirt',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    is_anchor_item: false,
    display_order: 5,
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
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d485',
    name: 'Black Heels',
    brand: 'Aldo',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d483',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    active: true,
    bg_removal_status: 'completed',
    season: ['All'],
    formality_score: 7,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d486',
    name: 'Green Midi Dress',
    brand: 'Reformation',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d484',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    active: true,
    bg_removal_status: 'completed',
    season: ['All'],
    formality_score: 6,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d488',
    name: 'Brown Overshirt',
    brand: 'Buck Mason',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d487',
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d470',
    active: true,
    bg_removal_status: 'completed',
    season: ['All'],
    formality_score: 5,
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
  OutfitDisplayWithErrorBoundary: ({
    hideRandomizeButton,
    showCardScore,
    enableCardFlip,
    showCardTuckStyle,
    cardTitle,
  }: {
    hideRandomizeButton?: boolean;
    showCardScore?: boolean;
    enableCardFlip?: boolean;
    showCardTuckStyle?: boolean;
    cardTitle?: string;
  }) => (
    <div
      data-testid="outfit-display"
      data-hide-randomize={String(hideRandomizeButton)}
      data-show-card-score={String(showCardScore)}
      data-enable-card-flip={String(enableCardFlip)}
      data-show-card-tuck-style={String(showCardTuckStyle)}
      data-card-title={cardTitle ?? ''}
    />
  ),
}));

vi.mock('@/components/dynamic/items-grid-dynamic', () => ({
  ItemsGridWithErrorBoundary: ({
    items,
    selectedItem,
    onItemSelect,
  }: {
    items: WardrobeItem[];
    selectedItem?: WardrobeItem | null;
    onItemSelect: (item: WardrobeItem | null) => void;
  }) => (
    <div data-testid="items-grid">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemSelect(selectedItem?.id === item.id ? null : item)}
        >
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

  it('requires shoes for a top-and-bottom outfit before enabling save', async () => {
    const user = userEvent.setup();

    renderPage();

    const createButton = screen.getByRole('button', { name: /create outfit/i });
    expect(createButton).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Shirts' })[0]);
    await user.click(await screen.findByText(/white shirt/i));
    expect(createButton).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Pants' })[0]);
    await user.click(await screen.findByText(/black pants/i));

    expect(createButton).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Shoes' })[0]);
    await user.click(await screen.findByText(/black heels/i));

    await waitFor(() => expect(createButton).not.toBeDisabled());
  });

  it('enables save for a dress plus shoes outfit', async () => {
    const user = userEvent.setup();

    renderPage();

    const createButton = screen.getByRole('button', { name: /create outfit/i });
    expect(createButton).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Dress' })[0]);
    await user.click(await screen.findByText(/green midi dress/i));
    expect(createButton).toBeDisabled();

    await user.click(screen.getAllByRole('button', { name: 'Shoes' })[0]);
    await user.click(await screen.findByText(/black heels/i));

    await waitFor(() => expect(createButton).not.toBeDisabled());
  });

  it('keeps save enabled when an optional layer is deselected', async () => {
    const user = userEvent.setup();

    renderPage();

    const createButton = screen.getByRole('button', { name: /create outfit/i });

    await user.click(screen.getAllByRole('button', { name: 'Shirts' })[0]);
    await user.click(await screen.findByText(/white shirt/i));

    await user.click(screen.getAllByRole('button', { name: 'Pants' })[0]);
    await user.click(await screen.findByText(/black pants/i));

    await user.click(screen.getAllByRole('button', { name: 'Shoes' })[0]);
    await user.click(await screen.findByText(/black heels/i));

    await user.click(screen.getAllByRole('button', { name: 'Overshirt' })[0]);
    await user.click(await screen.findByText(/brown overshirt/i));

    await waitFor(() => expect(createButton).not.toBeDisabled());

    await user.click(screen.getByText(/brown overshirt/i));

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

  it('renders the create preview in simplified read-only mode', () => {
    renderPage();

    expect(screen.queryByText(/current score/i)).not.toBeInTheDocument();

    const preview = screen.getByTestId('outfit-display');

    expect(preview).toHaveAttribute('data-hide-randomize', 'true');
    expect(preview).toHaveAttribute('data-show-card-score', 'false');
    expect(preview).toHaveAttribute('data-enable-card-flip', 'false');
    expect(preview).toHaveAttribute('data-show-card-tuck-style', 'false');
    expect(preview).toHaveAttribute('data-card-title', 'Selected Items');
    expect(screen.queryByText(/outfit score/i)).not.toBeInTheDocument();
  });

  it('shows a single simplified score row once items are selected', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'Shirts' })[0]);
    await user.click(await screen.findByText(/white shirt/i));

    expect(screen.getByText(/current score/i)).toBeInTheDocument();
    expect(screen.queryByText(/^outfit score$/i)).not.toBeInTheDocument();
  });

  it('randomizes the create preview into a savable outfit', async () => {
    const user = userEvent.setup();

    renderPage();

    const createButton = screen.getByRole('button', { name: /create outfit/i });
    const randomizeButton = screen.getByRole('button', { name: /try another combination/i });

    expect(randomizeButton).toBeEnabled();
    expect(createButton).toBeDisabled();

    await user.click(randomizeButton);

    await waitFor(() => expect(createButton).not.toBeDisabled());
  });
});

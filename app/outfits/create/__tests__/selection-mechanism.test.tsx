import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CreateOutfitPageClient } from '../create-outfit-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardrobeItem, Category } from '@/lib/types/database';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock data with proper UUID formats
const mockCategories: Category[] = [
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'Jackets', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', is_anchor_item: false, display_order: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', name: 'Shirts', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', is_anchor_item: false, display_order: 2, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const mockItems: WardrobeItem[] = [
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d483', name: 'Blue Jacket', category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', active: true, season: ['All'], created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d484', name: 'Black Jacket', category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', active: true, season: ['All'], created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d485', name: 'White Shirt', category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', active: true, season: ['All'], created_at: '2024-01-01', updated_at: '2024-01-01' },
];

vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({
    data: mockCategories,
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/use-wardrobe-items', () => ({
  useWardrobeItems: () => ({
    data: mockItems,
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/use-outfits', () => ({
  useCreateOutfit: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
  useScoreOutfit: () => ({
    data: { score: 85 },
  }),
  useCheckOutfitDuplicate: () => ({
    data: false,
  }),
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('Selection Mechanism Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1: Category Item Display', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 1: Category Item Display**
     * **Validates: Requirements 1.1**
     */
    it('should display only items from selected category', async () => {
      render(
        <TestWrapper>
          <CreateOutfitPageClient />
        </TestWrapper>
      );

      const jacketsButton = screen.getByText('Jackets');
      fireEvent.click(jacketsButton);

      await waitFor(() => {
        expect(screen.getByText('Blue Jacket')).toBeInTheDocument();
        expect(screen.queryByText('White Shirt')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Property 2: Item Selection State Update', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 2: Item Selection State Update**
     * **Validates: Requirements 1.2**
     */
    it('should update selection state when item is clicked', async () => {
      render(
        <TestWrapper>
          <CreateOutfitPageClient />
        </TestWrapper>
      );

      const jacketsButton = screen.getByText('Jackets');
      fireEvent.click(jacketsButton);

      await waitFor(() => {
        const blueJacket = screen.getByText('Blue Jacket');
        fireEvent.click(blueJacket);
        const itemContainer = blueJacket.closest('[role="button"]');
        expect(itemContainer).toHaveClass('border-slate-800');
      }, { timeout: 5000 });
    });
  });

  describe('Property 3: Visual Selection Feedback', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 3: Visual Selection Feedback**
     * **Validates: Requirements 1.3, 5.1**
     */
    it('should provide visual feedback for selected vs unselected items', async () => {
      render(
        <TestWrapper>
          <CreateOutfitPageClient />
        </TestWrapper>
      );

      const jacketsButton = screen.getByText('Jackets');
      fireEvent.click(jacketsButton);

      await waitFor(() => {
        const blueJacket = screen.getByText('Blue Jacket');
        const blackJacket = screen.getByText('Black Jacket');

        fireEvent.click(blueJacket);

        const blueJacketContainer = blueJacket.closest('[role="button"]');
        expect(blueJacketContainer).toHaveClass('border-slate-800');

        const blackJacketContainer = blackJacket.closest('[role="button"]');
        expect(blackJacketContainer).toHaveClass('border-stone-200');
      }, { timeout: 5000 });
    });
  });

  describe('Property 4: Category Selection Replacement', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 4: Category Selection Replacement**
     * **Validates: Requirements 1.4**
     */
    it('should replace previous selection when selecting different item in same category', async () => {
      render(
        <TestWrapper>
          <CreateOutfitPageClient />
        </TestWrapper>
      );

      const jacketsButton = screen.getByText('Jackets');
      fireEvent.click(jacketsButton);

      await waitFor(() => {
        const blueJacket = screen.getByText('Blue Jacket');
        const blackJacket = screen.getByText('Black Jacket');

        fireEvent.click(blueJacket);
        const blueJacketContainer = blueJacket.closest('[role="button"]');
        expect(blueJacketContainer).toHaveClass('border-slate-800');

        fireEvent.click(blackJacket);
        const blackJacketContainer = blackJacket.closest('[role="button"]');
        expect(blackJacketContainer).toHaveClass('border-slate-800');
        expect(blueJacketContainer).toHaveClass('border-stone-200');
      }, { timeout: 5000 });
    });
  });

  describe('Property 5: Item Deselection Toggle', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 5: Item Deselection Toggle**
     * **Validates: Requirements 1.5**
     */
    it('should deselect item when clicking on already selected item', async () => {
      render(
        <TestWrapper>
          <CreateOutfitPageClient />
        </TestWrapper>
      );

      const jacketsButton = screen.getByText('Jackets');
      fireEvent.click(jacketsButton);

      await waitFor(() => {
        const blueJacket = screen.getByText('Blue Jacket');
        const itemContainer = blueJacket.closest('[role="button"]');

        fireEvent.click(blueJacket);
        expect(itemContainer).toHaveClass('border-slate-800');

        fireEvent.click(blueJacket);
        expect(itemContainer).toHaveClass('border-stone-200');
      }, { timeout: 5000 });
    });
  });

  describe('Property 6: Selection State Persistence', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 6: Selection State Persistence**
     * **Validates: Requirements 1.6, 6.3**
     */
    it('should preserve selections when navigating between categories', async () => {
      render(
        <TestWrapper>
          <CreateOutfitPageClient />
        </TestWrapper>
      );

      const jacketsButton = screen.getByText('Jackets');
      fireEvent.click(jacketsButton);

      await waitFor(() => {
        const blueJacket = screen.getByText('Blue Jacket');
        fireEvent.click(blueJacket);
        expect(blueJacket.closest('[role="button"]')).toHaveClass('border-slate-800');
      }, { timeout: 5000 });

      const shirtsButton = screen.getByText('Shirts');
      fireEvent.click(shirtsButton);

      await waitFor(() => {
        const whiteShirt = screen.getByText('White Shirt');
        fireEvent.click(whiteShirt);
        expect(whiteShirt.closest('[role="button"]')).toHaveClass('border-slate-800');
      }, { timeout: 5000 });

      fireEvent.click(jacketsButton);

      await waitFor(() => {
        const blueJackets = screen.getAllByText('Blue Jacket');
        const blueJacket = blueJackets.find(el => el.closest('[role="button"]'));
        expect(blueJacket).toBeTruthy();
        expect(blueJacket!.closest('[role="button"]')).toHaveClass('border-slate-800');
      }, { timeout: 5000 });
    });
  });
});
/**
 * Tests for PinnedCardsSection component
 * 
 * Validates:
 * - Component rendering with pinned preferences
 * - Empty state display when no pinned cards
 * - Responsive layout behavior
 * - Customize button functionality
 * 
 * Requirements: 2.1, 2.4, 1.4, 1.5, 12.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PinnedCardsSection } from '../pinned-cards-section';
import type { PinnedPreference } from '@/lib/types/sizes';

// Mock the PinnedCard component
vi.mock('../pinned-card', () => ({
  PinnedCard: ({ categoryId }: { categoryId: string }) => (
    <div data-testid={`pinned-card-${categoryId}`}>
      Pinned Card for {categoryId}
    </div>
  ),
}));

describe('PinnedCardsSection', () => {
  const mockPinnedPreferences: PinnedPreference[] = [
    {
      id: 'pref-1',
      user_id: 'user-1',
      category_id: 'cat-1',
      display_order: 1,
      display_mode: 'standard',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'pref-2',
      user_id: 'user-1',
      category_id: 'cat-2',
      display_order: 2,
      display_mode: 'dual',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'pref-3',
      user_id: 'user-1',
      category_id: 'cat-3',
      display_order: 3,
      display_mode: 'preferred-brand',
      preferred_brand_id: 'brand-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  describe('Empty State', () => {
    it('should display empty state when no pinned preferences', () => {
      render(<PinnedCardsSection pinnedPreferences={[]} />);

      expect(screen.getByText('No Pinned Categories')).toBeInTheDocument();
      expect(
        screen.getByText(/Pin your most frequently used categories/i)
      ).toBeInTheDocument();
    });

    it('should show customize button in empty state when onCustomize provided', () => {
      const onCustomize = vi.fn();
      render(
        <PinnedCardsSection 
          pinnedPreferences={[]} 
          onCustomize={onCustomize} 
        />
      );

      const customizeButton = screen.getByRole('button', { 
        name: /customize pinned categories/i 
      });
      expect(customizeButton).toBeInTheDocument();
    });

    it('should not show customize button in empty state when onCustomize not provided', () => {
      render(<PinnedCardsSection pinnedPreferences={[]} />);

      const customizeButton = screen.queryByRole('button', { 
        name: /customize pinned categories/i 
      });
      expect(customizeButton).not.toBeInTheDocument();
    });
  });

  describe('Pinned Cards Display', () => {
    it('should render all pinned cards', () => {
      render(<PinnedCardsSection pinnedPreferences={mockPinnedPreferences} />);

      expect(screen.getByTestId('pinned-card-cat-1')).toBeInTheDocument();
      expect(screen.getByTestId('pinned-card-cat-2')).toBeInTheDocument();
      expect(screen.getByTestId('pinned-card-cat-3')).toBeInTheDocument();
    });

    it('should display section header', () => {
      render(<PinnedCardsSection pinnedPreferences={mockPinnedPreferences} />);

      expect(screen.getByText('Pinned Sizes')).toBeInTheDocument();
    });

    it('should show customize button when onCustomize provided', () => {
      const onCustomize = vi.fn();
      render(
        <PinnedCardsSection 
          pinnedPreferences={mockPinnedPreferences} 
          onCustomize={onCustomize} 
        />
      );

      const customizeButton = screen.getByRole('button', { 
        name: /customize pinned categories/i 
      });
      expect(customizeButton).toBeInTheDocument();
    });

    it('should sort cards by display_order', () => {
      // Create unsorted preferences
      const unsortedPreferences: PinnedPreference[] = [
        { ...mockPinnedPreferences[2], display_order: 3 },
        { ...mockPinnedPreferences[0], display_order: 1 },
        { ...mockPinnedPreferences[1], display_order: 2 },
      ];

      render(<PinnedCardsSection pinnedPreferences={unsortedPreferences} />);

      const cards = screen.getAllByTestId(/pinned-card-/);
      expect(cards[0]).toHaveAttribute('data-testid', 'pinned-card-cat-1');
      expect(cards[1]).toHaveAttribute('data-testid', 'pinned-card-cat-2');
      expect(cards[2]).toHaveAttribute('data-testid', 'pinned-card-cat-3');
    });
  });

  describe('Responsive Layout', () => {
    it('should have horizontal scroll container on mobile', () => {
      render(<PinnedCardsSection pinnedPreferences={mockPinnedPreferences} />);

      const container = screen.getByText('Pinned Card for cat-1').closest('.pinned-cards-container');
      expect(container).toHaveClass('overflow-x-auto');
      expect(container).toHaveClass('snap-x');
      expect(container).toHaveClass('snap-mandatory');
    });

    it('should have grid layout classes for tablet+', () => {
      render(<PinnedCardsSection pinnedPreferences={mockPinnedPreferences} />);

      const container = screen.getByText('Pinned Card for cat-1').closest('.pinned-cards-container');
      expect(container).toHaveClass('md:grid');
      expect(container).toHaveClass('md:grid-cols-2');
      expect(container).toHaveClass('lg:grid-cols-3');
      expect(container).toHaveClass('xl:grid-cols-4');
    });
  });

  describe('Content Visibility Optimization', () => {
    it('should apply content-visibility for many cards (>10)', () => {
      // Create 15 pinned preferences
      const manyPreferences: PinnedPreference[] = Array.from({ length: 15 }, (_, i) => ({
        id: `pref-${i}`,
        user_id: 'user-1',
        category_id: `cat-${i}`,
        display_order: i + 1,
        display_mode: 'standard' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      const { container } = render(
        <PinnedCardsSection pinnedPreferences={manyPreferences} />
      );

      // Check that content-visibility is applied
      const cardWrappers = container.querySelectorAll('.snap-start');
      expect(cardWrappers.length).toBe(15);
      
      // First card should have content-visibility style
      const firstWrapper = cardWrappers[0] as HTMLElement;
      expect(firstWrapper.style.contentVisibility).toBe('auto');
      expect(firstWrapper.style.containIntrinsicSize).toBe('0 120px');
    });

    it('should not apply content-visibility for few cards (<=10)', () => {
      const { container } = render(
        <PinnedCardsSection pinnedPreferences={mockPinnedPreferences} />
      );

      const cardWrappers = container.querySelectorAll('.snap-start');
      const firstWrapper = cardWrappers[0] as HTMLElement;
      
      // Should not have content-visibility for small lists
      expect(firstWrapper.style.contentVisibility).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on customize buttons', () => {
      const onCustomize = vi.fn();
      render(
        <PinnedCardsSection 
          pinnedPreferences={mockPinnedPreferences} 
          onCustomize={onCustomize} 
        />
      );

      const customizeButton = screen.getByRole('button', { 
        name: /customize pinned categories/i 
      });
      expect(customizeButton).toHaveAttribute('aria-label', 'Customize pinned categories');
    });

    it('should have minimum touch target size for buttons', () => {
      const onCustomize = vi.fn();
      render(
        <PinnedCardsSection 
          pinnedPreferences={mockPinnedPreferences} 
          onCustomize={onCustomize} 
        />
      );

      const customizeButton = screen.getByRole('button', { 
        name: /customize pinned categories/i 
      });
      
      // Check inline style for minimum height
      expect(customizeButton).toHaveStyle({ minHeight: '44px' });
    });
  });
});

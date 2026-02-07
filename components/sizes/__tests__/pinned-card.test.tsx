/**
 * Unit Tests for PinnedCard Component
 * 
 * Validates:
 * - Rendering with all required fields (Requirement 2.1)
 * - Tap and long-press interactions (Requirements 2.2, 2.3)
 * - Responsive layout at different breakpoints (Requirements 1.4, 1.5)
 * - Display modes (standard, dual, preferred-brand) (Requirements 15.2, 15.3, 15.4)
 * - Touch target sizes (Requirement 9.1)
 * - Accessibility features (Requirement 11.3)
 * - Loading and error states
 * 
 * Task: 6.7 Write unit tests for PinnedCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PinnedCard } from '../pinned-card';
import type { SizeCategory, StandardSize, BrandSize } from '@/lib/types/sizes';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock the hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategory: vi.fn(),
  useBrandSizes: vi.fn(),
}));

import { useSizeCategory, useBrandSizes } from '@/lib/hooks/use-size-categories';

describe('PinnedCard', () => {
  const mockCategory: SizeCategory = {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Tops',
    supported_formats: ['letter', 'numeric'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockStandardSize: StandardSize = {
    id: 'size-1',
    category_id: 'cat-1',
    user_id: 'user-1',
    primary_size: 'M',
    secondary_size: 'L',
    notes: 'Fits well',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  };

  const mockBrandSizes: BrandSize[] = [
    {
      id: 'brand-1',
      category_id: 'cat-1',
      user_id: 'user-1',
      brand_name: 'Nike',
      item_type: 'T-Shirt',
      size: 'L',
      fit_scale: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'brand-2',
      category_id: 'cat-1',
      user_id: 'user-1',
      brand_name: 'Adidas',
      size: 'M',
      fit_scale: 4,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockCategoryWithStandardSize = {
    ...mockCategory,
    standard_sizes: [mockStandardSize],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useSizeCategory).mockReturnValue({
      data: mockCategoryWithStandardSize,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useBrandSizes).mockReturnValue({
      data: mockBrandSizes,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  describe('Rendering with All Required Fields (Requirement 2.1)', () => {
    it('should render category name', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText('Tops')).toBeInTheDocument();
    });

    it('should render primary size in standard mode', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('should render last updated timestamp', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      // Should show relative time (e.g., "12 hours ago")
      expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    });

    it('should render options menu button when onLongPress provided', () => {
      const onLongPress = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onLongPress={onLongPress}
        />
      );

      const menuButton = screen.getByRole('button', { name: /Options for Tops/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('should not render options menu button when onLongPress not provided', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const menuButton = screen.queryByRole('button', { name: /Options for/i });
      expect(menuButton).not.toBeInTheDocument();
    });

    it('should render "No size set" when no standard size exists', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: mockCategory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText('No size set')).toBeInTheDocument();
    });
  });

  describe('Display Modes (Requirements 15.2, 15.3, 15.4)', () => {
    it('should display only primary size in standard mode (Requirement 15.2)', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      // Should show primary size
      expect(screen.getByText('M')).toBeInTheDocument();

      // Should not show secondary size
      expect(screen.queryByText('L')).not.toBeInTheDocument();
    });

    it('should display both primary and secondary sizes in dual mode (Requirement 15.3)', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="dual"
        />
      );

      // Should show both sizes
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();

      // Should show separator
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('should display only primary size in dual mode when no secondary size exists', () => {
      const categoryWithoutSecondary = {
        ...mockCategory,
        standard_sizes: [{
          ...mockStandardSize,
          secondary_size: undefined,
        }],
      };

      vi.mocked(useSizeCategory).mockReturnValue({
        data: categoryWithoutSecondary,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="dual"
        />
      );

      // Should show primary size
      expect(screen.getByText('M')).toBeInTheDocument();

      // Should not show separator or secondary size
      expect(screen.queryByText('/')).not.toBeInTheDocument();
    });

    it('should display preferred brand size in preferred-brand mode (Requirement 15.4)', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="preferred-brand"
          preferredBrandId="brand-1"
        />
      );

      // Should show brand size
      expect(screen.getByText('L')).toBeInTheDocument();

      // Should show brand name
      expect(screen.getByText(/Nike/i)).toBeInTheDocument();

      // Should show item type
      expect(screen.getByText(/T-Shirt/i)).toBeInTheDocument();
    });

    it('should fall back to standard size when preferred brand not found', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="preferred-brand"
          preferredBrandId="non-existent-brand"
        />
      );

      // Should fall back to primary size
      expect(screen.getByText('M')).toBeInTheDocument();

      // Should not show brand name
      expect(screen.queryByText(/Nike/i)).not.toBeInTheDocument();
    });

    it('should fall back to standard size when no preferredBrandId provided', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="preferred-brand"
        />
      );

      // Should fall back to primary size
      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });

  describe('Tap Interactions (Requirement 2.2)', () => {
    it('should call onTap when card is clicked', () => {
      const onTap = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onTap={onTap}
        />
      );

      const card = screen.getByRole('button', { name: /View Tops size details/i });
      fireEvent.click(card);

      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('should navigate to category detail page when clicked', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/sizes/cat-1');
    });

    it('should support keyboard navigation with Enter key', () => {
      const onTap = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onTap={onTap}
        />
      );

      const card = screen.getByRole('button', { name: /View Tops size details/i });
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('should support keyboard navigation with Space key', () => {
      const onTap = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onTap={onTap}
        />
      );

      const card = screen.getByRole('button', { name: /View Tops size details/i });
      fireEvent.keyDown(card, { key: ' ' });

      expect(onTap).toHaveBeenCalledTimes(1);
    });
  });

  describe('Long-Press Interactions (Requirement 2.3)', () => {
    it('should call onLongPress when options button is clicked', () => {
      const onLongPress = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onLongPress={onLongPress}
        />
      );

      const menuButton = screen.getByRole('button', { name: /Options for Tops/i });
      fireEvent.click(menuButton);

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should stop propagation when options button is clicked', () => {
      const onTap = vi.fn();
      const onLongPress = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onTap={onTap}
          onLongPress={onLongPress}
        />
      );

      const menuButton = screen.getByRole('button', { name: /Options for Tops/i });
      fireEvent.click(menuButton);

      // onLongPress should be called
      expect(onLongPress).toHaveBeenCalledTimes(1);

      // onTap should NOT be called (propagation stopped)
      expect(onTap).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Layout (Requirements 1.4, 1.5)', () => {
    it('should have mobile-first width class (85vw)', () => {
      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const card = container.querySelector('.pinned-card');
      expect(card).toHaveClass('w-[85vw]');
    });

    it('should have responsive width class for tablet+ (md:w-auto)', () => {
      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const card = container.querySelector('.pinned-card');
      expect(card).toHaveClass('md:w-auto');
    });

    it('should have minimum height for touch targets', () => {
      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const card = container.querySelector('.pinned-card');
      expect(card).toHaveStyle({ minHeight: '120px' });
    });
  });

  describe('Touch Target Sizes (Requirement 9.1)', () => {
    it('should have minimum 44x44px touch target for card', () => {
      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const card = container.querySelector('.pinned-card');
      
      // Card should have minimum height of 120px (well above 44px)
      expect(card).toHaveStyle({ minHeight: '120px' });
    });

    it('should have minimum 44x44px touch target for options button', () => {
      const onLongPress = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onLongPress={onLongPress}
        />
      );

      const menuButton = screen.getByRole('button', { name: /Options for Tops/i });
      
      // Button should have minimum 44x44px touch target
      expect(menuButton).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
    });
  });

  describe('Accessibility (Requirement 11.3)', () => {
    it('should have proper ARIA label for card', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const card = screen.getByRole('button', { name: 'View Tops size details' });
      expect(card).toHaveAttribute('aria-label', 'View Tops size details');
    });

    it('should have proper ARIA label for options button', () => {
      const onLongPress = vi.fn();

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          onLongPress={onLongPress}
        />
      );

      const menuButton = screen.getByRole('button', { name: 'Options for Tops' });
      expect(menuButton).toHaveAttribute('aria-label', 'Options for Tops');
    });

    it('should have tabIndex for keyboard navigation', () => {
      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const card = screen.getByRole('button', { name: /View Tops size details/i });
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      // Clock icon should be aria-hidden
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when data is loading', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      // Should show skeleton
      const skeleton = container.querySelector('.pinned-card-skeleton');
      expect(skeleton).toBeInTheDocument();

      // Should have animate-pulse class
      expect(skeleton).toHaveClass('animate-pulse');

      // Should have aria-busy attribute
      expect(skeleton).toHaveAttribute('aria-busy', 'true');

      // Should have aria-label
      expect(skeleton).toHaveAttribute('aria-label', 'Loading category information');
    });

    it('should have proper dimensions for loading skeleton', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const skeleton = container.querySelector('.pinned-card-skeleton');
      expect(skeleton).toHaveStyle({ minHeight: '120px' });
      expect(skeleton).toHaveClass('w-[85vw]', 'md:w-auto');
    });
  });

  describe('Error State', () => {
    it('should render error message when data fetch fails', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch category'),
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText('Failed to load category')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch category')).toBeInTheDocument();
    });

    it('should render error message when category not found', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText('Failed to load category')).toBeInTheDocument();
      expect(screen.getByText('Category not found')).toBeInTheDocument();
    });

    it('should have role="alert" for error state', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch category'),
        refetch: vi.fn(),
      } as any);

      const { container } = render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      const errorContainer = container.querySelector('.pinned-card-error');
      expect(errorContainer).toHaveAttribute('role', 'alert');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format recent timestamps as "just now"', () => {
      const now = new Date();
      const categoryWithRecentUpdate = {
        ...mockCategory,
        standard_sizes: [{
          ...mockStandardSize,
          updated_at: now.toISOString(),
        }],
      };

      vi.mocked(useSizeCategory).mockReturnValue({
        data: categoryWithRecentUpdate,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText(/Updated just now/i)).toBeInTheDocument();
    });

    it('should format timestamps as "X hours ago"', () => {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 5);

      const categoryWithOldUpdate = {
        ...mockCategory,
        standard_sizes: [{
          ...mockStandardSize,
          updated_at: hoursAgo.toISOString(),
        }],
      };

      vi.mocked(useSizeCategory).mockReturnValue({
        data: categoryWithOldUpdate,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText(/Updated 5 hours ago/i)).toBeInTheDocument();
    });

    it('should show "Never" when no standard size exists', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: mockCategory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText(/Updated Never/i)).toBeInTheDocument();
    });
  });

  describe('Preload Props', () => {
    it('should pass preload props to Link component', () => {
      const preloadProps = {
        onMouseEnter: vi.fn(),
        onFocus: vi.fn(),
      };

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
          preloadProps={preloadProps}
        />
      );

      const link = screen.getByRole('link');
      
      // Trigger events to verify props are passed
      fireEvent.mouseEnter(link);
      fireEvent.focus(link);

      expect(preloadProps.onMouseEnter).toHaveBeenCalled();
      expect(preloadProps.onFocus).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle category with very long name', () => {
      const longNameCategory = {
        ...mockCategory,
        name: 'This is a very long category name that should be handled properly',
        standard_sizes: [mockStandardSize],
      };

      vi.mocked(useSizeCategory).mockReturnValue({
        data: longNameCategory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="standard"
        />
      );

      expect(screen.getByText(longNameCategory.name)).toBeInTheDocument();
    });

    it('should handle brand with no item type in preferred-brand mode', () => {
      const brandWithoutItemType: BrandSize = {
        ...mockBrandSizes[0],
        item_type: undefined,
      };

      vi.mocked(useBrandSizes).mockReturnValue({
        data: [brandWithoutItemType],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="preferred-brand"
          preferredBrandId="brand-1"
        />
      );

      // Should show brand name without item type
      expect(screen.getByText(/Nike/i)).toBeInTheDocument();
      expect(screen.queryByText(/T-Shirt/i)).not.toBeInTheDocument();
    });

    it('should handle empty brand sizes array in preferred-brand mode', () => {
      vi.mocked(useBrandSizes).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <PinnedCard
          categoryId="cat-1"
          displayMode="preferred-brand"
          preferredBrandId="brand-1"
        />
      );

      // Should fall back to standard size
      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });
});

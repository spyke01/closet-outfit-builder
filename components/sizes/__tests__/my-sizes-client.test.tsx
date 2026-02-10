import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MySizesClient } from '../my-sizes-client';
import type { SizeCategory, PinnedPreference, StandardSize, BrandSize } from '@/lib/types/sizes';

// Mock the hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategories: vi.fn(),
  usePinnedPreferences: vi.fn(),
  useSeedCategories: vi.fn(),
  useUpdatePinnedPreferences: vi.fn(),
}));

// Mock child components
vi.mock('../pinned-cards-section', () => ({
  PinnedCardsSection: ({ pinnedPreferences, onCustomize }: any) => (
    <div data-testid="pinned-cards-section">
      <div>Pinned Cards: {pinnedPreferences.length}</div>
      <button onClick={onCustomize}>Customize</button>
    </div>
  ),
}));

vi.mock('../category-grid', () => ({
  CategoryGrid: ({ categories, onAddCategory }: any) => (
    <div data-testid="category-grid">
      <div>Categories: {categories.length}</div>
      {onAddCategory && <button onClick={onAddCategory}>Add Category</button>}
    </div>
  ),
}));

import { useSizeCategories, usePinnedPreferences, useSeedCategories, useUpdatePinnedPreferences } from '@/lib/hooks/use-size-categories';

describe('MySizesClient', () => {
  const mockCategories: SizeCategory[] = [
    {
      id: 'cat-1',
      user_id: 'user-1',
      name: 'Tops',
      supported_formats: ['letter', 'numeric'],
      is_system_category: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cat-2',
      user_id: 'user-1',
      name: 'Bottoms',
      supported_formats: ['waist-inseam'],
      is_system_category: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockPinnedPreferences: PinnedPreference[] = [
    {
      id: 'pin-1',
      user_id: 'user-1',
      category_id: 'cat-1',
      display_order: 1,
      display_mode: 'standard',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockStandardSizes: StandardSize[] = [
    {
      id: 'size-1',
      category_id: 'cat-1',
      user_id: 'user-1',
      primary_size: 'M',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockBrandSizes: BrandSize[] = [
    {
      id: 'brand-1',
      category_id: 'cat-1',
      user_id: 'user-1',
      brand_name: 'Nike',
      size: 'L',
      fit_scale: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useSizeCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(usePinnedPreferences).mockReturnValue({
      data: mockPinnedPreferences,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useSeedCategories).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any);

    vi.mocked(useUpdatePinnedPreferences).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('Page Structure', () => {
    it('should render page header with title and description', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Check page title
      expect(screen.getByRole('heading', { level: 1, name: 'My Sizes' })).toBeInTheDocument();

      // Check page description
      expect(screen.getByText('Track your clothing sizes across categories and brands')).toBeInTheDocument();
    });

    it('should render pinned cards section above category grid', () => {
      const { container } = render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Get both sections
      const pinnedSection = screen.getByTestId('pinned-cards-section');
      const categorySection = screen.getByTestId('category-grid');

      // Check both are rendered
      expect(pinnedSection).toBeInTheDocument();
      expect(categorySection).toBeInTheDocument();

      // Check pinned cards come before category grid in DOM order
      const sections = container.querySelectorAll('[data-testid]');
      const pinnedIndex = Array.from(sections).indexOf(pinnedSection);
      const categoryIndex = Array.from(sections).indexOf(categorySection);

      expect(pinnedIndex).toBeLessThan(categoryIndex);
    });

    it('should render sections with proper ARIA labelledby attributes', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Check sections have proper ARIA labelledby attributes
      const sections = document.querySelectorAll('section');
      expect(sections[0]).toHaveAttribute('aria-labelledby', 'pinned-sizes-heading');
      expect(sections[1]).toHaveAttribute('aria-labelledby', 'all-categories-heading');

      // Verify the heading with the ID exists
      const categoryHeading = document.getElementById('all-categories-heading');
      expect(categoryHeading).toBeInTheDocument();
      expect(categoryHeading).toHaveTextContent('All Categories');
    });

    it('should render "All Categories" heading', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      expect(screen.getByRole('heading', { level: 2, name: 'All Categories' })).toBeInTheDocument();
    });
  });

  describe('Data Fetching and Rendering', () => {
    it('should pass initial data to TanStack Query hooks', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Verify hooks were called with initial data
      expect(useSizeCategories).toHaveBeenCalledWith({
        initialData: mockCategories,
      });

      expect(usePinnedPreferences).toHaveBeenCalledWith({
        initialData: mockPinnedPreferences,
      });
    });

    it('should render data from TanStack Query hooks', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Check that data is passed to child components
      expect(screen.getByText('Pinned Cards: 1')).toBeInTheDocument();
      expect(screen.getByText('Categories: 2')).toBeInTheDocument();
    });

    it('should pass all required props to PinnedCardsSection', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Check PinnedCardsSection receives data
      const pinnedSection = screen.getByTestId('pinned-cards-section');
      expect(pinnedSection).toBeInTheDocument();

      // Check customize button is rendered (verifies onCustomize prop)
      expect(screen.getByRole('button', { name: 'Customize' })).toBeInTheDocument();
    });

    it('should pass category data to CategoryGrid', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Check CategoryGrid receives data
      const categoryGrid = screen.getByTestId('category-grid');
      expect(categoryGrid).toBeInTheDocument();

      // Category count from mock confirms data was wired through
      expect(screen.getByText('Categories: 2')).toBeInTheDocument();
    });

    it('should handle empty categories array', () => {
      vi.mocked(useSizeCategories).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <MySizesClient
          initialCategories={[]}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={[]}
          initialBrandSizes={[]}
        />
      );

      expect(screen.getByText('Categories: 0')).toBeInTheDocument();
    });

    it('should handle empty pinned preferences array', () => {
      vi.mocked(usePinnedPreferences).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={[]}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      expect(screen.getByText('Pinned Cards: 0')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading and no initial data', () => {
      vi.mocked(useSizeCategories).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(usePinnedPreferences).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <MySizesClient
          initialCategories={[]}
          initialPinnedPreferences={[]}
          initialStandardSizes={[]}
          initialBrandSizes={[]}
        />
      );

      // Check for loading skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show loading skeleton when refetching with existing data', () => {
      vi.mocked(useSizeCategories).mockReturnValue({
        data: mockCategories,
        isLoading: true, // Refetching
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(usePinnedPreferences).mockReturnValue({
        data: mockPinnedPreferences,
        isLoading: true, // Refetching
        error: null,
        refetch: vi.fn(),
      } as any);

      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Should show content, not loading skeleton
      expect(screen.getByText('My Sizes')).toBeInTheDocument();
      expect(screen.getByTestId('pinned-cards-section')).toBeInTheDocument();
      expect(screen.getByTestId('category-grid')).toBeInTheDocument();
    });

    it('should render loading skeleton with proper structure', () => {
      vi.mocked(useSizeCategories).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(usePinnedPreferences).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { container } = render(
        <MySizesClient
          initialCategories={[]}
          initialPinnedPreferences={[]}
          initialStandardSizes={[]}
          initialBrandSizes={[]}
        />
      );

      // Check for pinned cards skeleton (3 cards)
      const pinnedSkeletons = container.querySelectorAll('.flex.gap-4.overflow-x-auto > div');
      expect(pinnedSkeletons.length).toBe(3);

      // Check for category grid skeleton (6 tiles)
      const gridSkeletons = container.querySelectorAll('.grid.grid-cols-2 > div');
      expect(gridSkeletons.length).toBe(6);
    });
  });

  describe('Responsive Layout', () => {
    it('should apply container and spacing classes', () => {
      const { container } = render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Check container classes
      const mainContainer = container.querySelector('.container');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('mx-auto', 'px-4', 'py-8');

      // Check spacing between sections
      const contentWrapper = container.querySelector('.space-y-8');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should apply proper spacing to page header', () => {
      const { container } = render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      const header = container.querySelector('.mb-8');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Event Handlers', () => {
    it('should render customize trigger in pinned cards section', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      expect(screen.getByRole('button', { name: 'Customize' })).toBeInTheDocument();
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 1.1: Display pinned cards at top followed by category grid', () => {
      const { container } = render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Get sections in DOM order
      const sections = container.querySelectorAll('section');
      expect(sections.length).toBe(2);

      // First section should be pinned cards
      expect(sections[0]).toHaveAttribute('aria-labelledby', 'pinned-sizes-heading');

      // Second section should be category grid
      expect(sections[1]).toHaveAttribute('aria-labelledby', 'all-categories-heading');
    });

    it('should satisfy Requirement 1.2: Use initial data for optimal performance', () => {
      render(
        <MySizesClient
          initialCategories={mockCategories}
          initialPinnedPreferences={mockPinnedPreferences}
          initialStandardSizes={mockStandardSizes}
          initialBrandSizes={mockBrandSizes}
        />
      );

      // Verify hooks receive initial data (eliminates loading states)
      expect(useSizeCategories).toHaveBeenCalledWith({
        initialData: mockCategories,
      });

      expect(usePinnedPreferences).toHaveBeenCalledWith({
        initialData: mockPinnedPreferences,
      });

      // Content should render immediately without loading state
      expect(screen.getByText('My Sizes')).toBeInTheDocument();
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });
});

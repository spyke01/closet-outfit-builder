import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryGrid } from '../category-grid';
import type { SizeCategory, StandardSize, BrandSize } from '@/lib/types/sizes';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CategoryGrid', () => {
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

  it('should render category tiles in responsive grid', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
        brandSizes={mockBrandSizes}
      />
    );

    // Check grid is rendered
    const grid = screen.getByRole('list', { name: /clothing categories/i });
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');

    // Check category tiles are rendered
    expect(screen.getByText('Tops')).toBeInTheDocument();
    expect(screen.getByText('Bottoms')).toBeInTheDocument();
  });

  it('should apply mobile breakpoint styles (2 columns)', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
      />
    );

    const grid = screen.getByRole('list', { name: /clothing categories/i });
    
    // Verify mobile-first 2-column grid
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid.className).toContain('grid-cols-2');
  });

  it('should apply tablet breakpoint styles (3 columns)', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
      />
    );

    const grid = screen.getByRole('list', { name: /clothing categories/i });
    
    // Verify tablet breakpoint (md:) has 3 columns
    expect(grid).toHaveClass('md:grid-cols-3');
    expect(grid.className).toContain('md:grid-cols-3');
  });

  it('should apply desktop breakpoint styles (4 columns)', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
      />
    );

    const grid = screen.getByRole('list', { name: /clothing categories/i });
    
    // Verify desktop breakpoint (lg:) has 4 columns
    expect(grid).toHaveClass('lg:grid-cols-4');
    expect(grid.className).toContain('lg:grid-cols-4');
  });

  it('should display size count for each category', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
        brandSizes={mockBrandSizes}
      />
    );

    // Tops has 1 standard size + 1 brand size = 2 sizes
    expect(screen.getByText('2 sizes')).toBeInTheDocument();

    // Bottoms has no sizes
    expect(screen.getByText('No sizes saved')).toBeInTheDocument();
  });

  it('should show "varies by brand" indicator when brand sizes differ', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
        brandSizes={mockBrandSizes}
      />
    );

    // Tops has standard size M and brand size L (different)
    expect(screen.getByText('Varies by brand')).toBeInTheDocument();
  });

  it('should display empty state when no categories exist', () => {
    render(
      <CategoryGrid
        categories={[]}
      />
    );

    // Check empty state content (Requirement 1.3, 12.1, US-3)
    expect(screen.getByText('No categories yet')).toBeInTheDocument();
    expect(screen.getByText(/your size categories will appear here once they are set up/i)).toBeInTheDocument();

    // No add button should be present (system categories only)
    const addButton = screen.queryByRole('button', { name: /add new clothing category/i });
    expect(addButton).not.toBeInTheDocument();
  });

  it('should display empty state with proper structure and styling', () => {
    const { container } = render(
      <CategoryGrid
        categories={[]}
      />
    );

    // Verify empty state structure
    const emptyState = container.querySelector('.flex.flex-col.items-center');
    expect(emptyState).toBeInTheDocument();

    // Verify icon is present
    const icon = container.querySelector('.rounded-full.bg-gray-100');
    expect(icon).toBeInTheDocument();

    // Verify heading
    expect(screen.getByRole('heading', { name: /no categories yet/i })).toBeInTheDocument();

    // No add button should be present (system categories only - US-3)
    const button = screen.queryByRole('button', { name: /add new clothing category/i });
    expect(button).not.toBeInTheDocument();
  });

  it('should link category tiles to detail view', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
      />
    );

    // Links have role="listitem" due to being in a list
    const topsLink = screen.getByRole('listitem', { name: /view tops details/i });
    expect(topsLink).toHaveAttribute('href', '/sizes/cat-1');

    const bottomsLink = screen.getByRole('listitem', { name: /view bottoms details/i });
    expect(bottomsLink).toHaveAttribute('href', '/sizes/cat-2');
  });

  it('should apply content-visibility optimization for large grids', () => {
    // Create 60 categories to trigger optimization
    const manyCategories: SizeCategory[] = Array.from({ length: 60 }, (_, i) => ({
      id: `cat-${i}`,
      user_id: 'user-1',
      name: `Category ${i}`,
      supported_formats: ['letter'],
      is_system_category: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }));

    const { container } = render(
      <CategoryGrid categories={manyCategories} />
    );

    // Check that content-visibility is applied
    const links = container.querySelectorAll('a[href^="/sizes/"]');
    expect(links.length).toBeGreaterThan(0);
    
    // First link should have content-visibility style
    const firstLink = links[0] as HTMLElement;
    expect(firstLink.style.contentVisibility).toBe('auto');
    expect(firstLink.style.containIntrinsicSize).toBe('0 120px');
  });

  it('should handle categories with icons', () => {
    const categoriesWithIcons: SizeCategory[] = [
      {
        ...mockCategories[0],
        icon: '👕',
      },
    ];

    render(
      <CategoryGrid
        categories={categoriesWithIcons}
      />
    );

    expect(screen.getByText('👕')).toBeInTheDocument();
  });

  it('should not show "varies by brand" when brand size matches standard size', () => {
    const matchingBrandSizes: BrandSize[] = [
      {
        id: 'brand-1',
        category_id: 'cat-1',
        user_id: 'user-1',
        brand_name: 'Nike',
        size: 'M', // Same as standard size
        fit_scale: 3,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
        brandSizes={matchingBrandSizes}
      />
    );

    expect(screen.queryByText('Varies by brand')).not.toBeInTheDocument();
  });

  it('should apply consistent gap spacing in grid', () => {
    render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
      />
    );

    const grid = screen.getByRole('list', { name: /clothing categories/i });
    
    // Verify gap-4 class is applied for consistent spacing
    expect(grid).toHaveClass('gap-4');
  });

  it('should render all category tiles with minimum height', () => {
    const { container } = render(
      <CategoryGrid
        categories={mockCategories}
        standardSizes={mockStandardSizes}
      />
    );

    const categoryLinks = container.querySelectorAll('a[href^="/sizes/"]');
    
    categoryLinks.forEach((link) => {
      expect(link).toHaveClass('min-h-[120px]');
    });
  });

  it('should not render grid when categories array is empty', () => {
    render(
      <CategoryGrid
        categories={[]}
      />
    );

    // Grid should not be present in empty state
    const grid = screen.queryByRole('list', { name: /clothing categories/i });
    expect(grid).not.toBeInTheDocument();
  });
});

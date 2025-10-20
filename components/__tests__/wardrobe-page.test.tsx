import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WardrobePageClient } from '../../app/wardrobe/wardrobe-page-client';

// Mock the hooks
const mockUseCategories = vi.fn();
const mockUseWardrobeItems = vi.fn();
const mockUseCreateWardrobeItem = vi.fn();

vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: mockUseCategories,
}));

vi.mock('@/lib/hooks/use-wardrobe-items', () => ({
  useWardrobeItems: mockUseWardrobeItems,
  useCreateWardrobeItem: mockUseCreateWardrobeItem,
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockCategories = [
  { id: 'cat1', name: 'Shirts', user_id: 'user1' },
  { id: 'cat2', name: 'Pants', user_id: 'user1' },
  { id: 'cat3', name: 'Shoes', user_id: 'user1' },
];

const mockItems = [
  {
    id: 'item1',
    name: 'Blue Shirt',
    brand: 'Brand A',
    category_id: 'cat1',
    color: 'Blue',
    material: 'Cotton',
    formality_score: 7,
    capsule_tags: ['Refined', 'Crossover'],
    image_url: 'https://example.com/shirt.jpg',
    user_id: 'user1',
    active: true,
    season: ['All'],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'item2',
    name: 'Black Pants',
    brand: 'Brand B',
    category_id: 'cat2',
    color: 'Black',
    material: 'Wool',
    formality_score: 8,
    capsule_tags: ['Refined'],
    image_url: 'https://example.com/pants.jpg',
    user_id: 'user1',
    active: true,
    season: ['All'],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'item3',
    name: 'Sneakers',
    brand: 'Brand C',
    category_id: 'cat3',
    color: 'White',
    material: 'Leather',
    formality_score: 3,
    capsule_tags: ['Adventurer'],
    image_url: 'https://example.com/shoes.jpg',
    user_id: 'user1',
    active: true,
    season: ['All'],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

describe('WardrobePageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockUseCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    });

    mockUseWardrobeItems.mockReturnValue({
      data: mockItems,
      isLoading: false,
      error: null,
    });

    mockUseCreateWardrobeItem.mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  it('renders wardrobe page with items', () => {
    render(<WardrobePageClient />);
    
    expect(screen.getByText('My Wardrobe')).toBeInTheDocument();
    expect(screen.getByText('3 items across 3 categories')).toBeInTheDocument();
    expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
    expect(screen.getByText('Black Pants')).toBeInTheDocument();
    expect(screen.getByText('Sneakers')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseCategories.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<WardrobePageClient />);
    
    expect(screen.getByText('Loading wardrobe...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseCategories.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'Failed to load categories' },
    });

    render(<WardrobePageClient />);
    
    expect(screen.getByText('Error Loading Wardrobe')).toBeInTheDocument();
    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
  });

  it('toggles between grid and list view', async () => {
    render(<WardrobePageClient />);
    
    // Should start in grid view
    expect(screen.getByRole('button', { name: /grid/i })).toHaveClass('bg-slate-900');
    
    // Click list view button
    const listButton = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listButton);
    
    // Should switch to list view
    await waitFor(() => {
      expect(listButton).toHaveClass('bg-slate-900');
    });
  });

  it('filters items by search term', async () => {
    render(<WardrobePageClient />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Search for "Blue"
    const searchInput = screen.getByPlaceholderText('Search items across all categories...');
    fireEvent.change(searchInput, { target: { value: 'Blue' } });
    
    await waitFor(() => {
      expect(screen.getByText('1 item found')).toBeInTheDocument();
      expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
      expect(screen.queryByText('Black Pants')).not.toBeInTheDocument();
    });
  });

  it('filters items by category', async () => {
    render(<WardrobePageClient />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Select Shirts category
    const categorySelect = screen.getByDisplayValue('All Categories');
    fireEvent.change(categorySelect, { target: { value: 'cat1' } });
    
    await waitFor(() => {
      expect(screen.getByText('1 item found')).toBeInTheDocument();
      expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
      expect(screen.queryByText('Black Pants')).not.toBeInTheDocument();
    });
  });

  it('filters items by tags', async () => {
    render(<WardrobePageClient />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Click Refined tag
    const refinedTag = screen.getByText('Refined');
    fireEvent.click(refinedTag);
    
    await waitFor(() => {
      expect(screen.getByText('2 items found')).toBeInTheDocument();
      expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
      expect(screen.getByText('Black Pants')).toBeInTheDocument();
      expect(screen.queryByText('Sneakers')).not.toBeInTheDocument();
    });
  });

  it('combines multiple filters', async () => {
    render(<WardrobePageClient />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Search for "Brand" and select Refined tag
    const searchInput = screen.getByPlaceholderText('Search items across all categories...');
    fireEvent.change(searchInput, { target: { value: 'Brand' } });
    
    const refinedTag = screen.getByText('Refined');
    fireEvent.click(refinedTag);
    
    await waitFor(() => {
      expect(screen.getByText('2 items found')).toBeInTheDocument();
      expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
      expect(screen.getByText('Black Pants')).toBeInTheDocument();
    });
  });

  it('shows empty state when no items match filters', async () => {
    render(<WardrobePageClient />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search items across all categories...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentItem' } });
    
    await waitFor(() => {
      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria or filters.')).toBeInTheDocument();
    });
  });

  it('navigates to item detail when item is clicked', () => {
    // Mock window.location.href
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' };

    render(<WardrobePageClient />);
    
    const shirtItem = screen.getByText('Blue Shirt').closest('[role="button"]');
    fireEvent.click(shirtItem!);
    
    expect(window.location.href).toBe('/wardrobe/items/item1');
    
    // Restore original location
    window.location = originalLocation;
  });

  it('shows categories grouped in grid view when "all" is selected', () => {
    render(<WardrobePageClient />);
    
    // Should show category headers
    expect(screen.getByText('Shirts')).toBeInTheDocument();
    expect(screen.getByText('Pants')).toBeInTheDocument();
    expect(screen.getByText('Shoes')).toBeInTheDocument();
    
    // Should show item counts
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('shows Add Item link', () => {
    render(<WardrobePageClient />);
    
    const addItemLink = screen.getByRole('link', { name: /add item/i });
    expect(addItemLink).toHaveAttribute('href', '/wardrobe/items');
  });
});
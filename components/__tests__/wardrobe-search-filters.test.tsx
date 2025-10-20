import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WardrobeSearchFilters } from '../wardrobe-search-filters';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockCategories = [
  { id: 'cat1', name: 'Shirts' },
  { id: 'cat2', name: 'Pants' },
  { id: 'cat3', name: 'Shoes' },
];

describe('WardrobeSearchFilters', () => {
  const mockProps = {
    searchTerm: '',
    selectedTags: new Set<string>(),
    selectedCategory: 'all',
    categories: mockCategories,
    onSearchChange: vi.fn(),
    onTagToggle: vi.fn(),
    onCategoryChange: vi.fn(),
    itemCount: 10,
    totalCount: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with item counts', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    expect(screen.getByText('My Wardrobe')).toBeInTheDocument();
    expect(screen.getByText('15 items across 3 categories')).toBeInTheDocument();
    expect(screen.getByText('10 items found')).toBeInTheDocument();
  });

  it('shows Add Item link', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    const addItemLink = screen.getByRole('link', { name: /add item/i });
    expect(addItemLink).toHaveAttribute('href', '/wardrobe/items');
  });

  it('toggles filters visibility', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Filters should be hidden initially
    expect(screen.queryByPlaceholderText('Search items across all categories...')).not.toBeInTheDocument();
    
    // Click filters button
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Filters should now be visible
    expect(screen.getByPlaceholderText('Search items across all categories...')).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', async () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    const searchInput = screen.getByPlaceholderText('Search items across all categories...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    await waitFor(() => {
      expect(mockProps.onSearchChange).toHaveBeenCalledWith('test search');
    });
  });

  it('calls onCategoryChange when category is selected', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    const categorySelect = screen.getByDisplayValue('All Categories');
    fireEvent.change(categorySelect, { target: { value: 'cat1' } });
    
    expect(mockProps.onCategoryChange).toHaveBeenCalledWith('cat1');
  });

  it('renders all category options', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    const categorySelect = screen.getByDisplayValue('All Categories');
    
    // Check that all categories are present as options
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Shirts')).toBeInTheDocument();
    expect(screen.getByText('Pants')).toBeInTheDocument();
    expect(screen.getByText('Shoes')).toBeInTheDocument();
  });

  it('calls onTagToggle when tag is clicked', async () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    const refinedTag = screen.getByText('Refined');
    fireEvent.click(refinedTag);
    
    await waitFor(() => {
      expect(mockProps.onTagToggle).toHaveBeenCalledWith('Refined');
    });
  });

  it('renders all capsule tags', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    expect(screen.getByText('Refined')).toBeInTheDocument();
    expect(screen.getByText('Adventurer')).toBeInTheDocument();
    expect(screen.getByText('Crossover')).toBeInTheDocument();
    expect(screen.getByText('Shorts')).toBeInTheDocument();
  });

  it('highlights selected tags', () => {
    const selectedTags = new Set(['Refined', 'Crossover']);
    
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        selectedTags={selectedTags}
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    const refinedTag = screen.getByText('Refined');
    const crossoverTag = screen.getByText('Crossover');
    const adventurerTag = screen.getByText('Adventurer');
    
    expect(refinedTag).toHaveClass('bg-slate-800');
    expect(crossoverTag).toHaveClass('bg-slate-800');
    expect(adventurerTag).not.toHaveClass('bg-slate-800');
  });

  it('shows filtering indicator when search is active', () => {
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        searchTerm="test"
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Should show filtering indicator
    expect(screen.getByText('Filtering...')).toBeInTheDocument();
  });

  it('shows total count when filters are applied', () => {
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        searchTerm="test"
        itemCount={5}
        totalCount={15}
      />
    );
    
    expect(screen.getByText('5 items found')).toBeInTheDocument();
    expect(screen.getByText('(15 total)')).toBeInTheDocument();
  });

  it('handles singular/plural item counts correctly', () => {
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        itemCount={1}
        totalCount={1}
        categories={[mockCategories[0]]}
      />
    );
    
    expect(screen.getByText('1 item across 1 category')).toBeInTheDocument();
    expect(screen.getByText('1 item found')).toBeInTheDocument();
  });

  it('shows selected category in dropdown', () => {
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        selectedCategory="cat1"
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    const categorySelect = screen.getByDisplayValue('Shirts');
    expect(categorySelect).toBeInTheDocument();
  });
});
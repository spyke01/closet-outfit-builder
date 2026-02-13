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
  { id: 'cat1', name: 'Jacket' },
  { id: 'cat2', name: 'Overshirt' },
  { id: 'cat3', name: 'Shirt' },
  { id: 'cat4', name: 'Pants' },
  { id: 'cat5', name: 'Shoes' },
];

describe('WardrobeSearchFilters', () => {
  const mockProps = {
    searchTerm: '',
    selectedTags: new Set<string>(),
    selectedCategories: new Set<string>(),
    categories: mockCategories,
    onSearchChange: vi.fn(),
    onTagToggle: vi.fn(),
    onCategoryToggle: vi.fn(),
    onClearAll: vi.fn(),
    itemCount: 10,
    totalCount: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with item counts', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    expect(screen.getByText('My Wardrobe')).toBeInTheDocument();
    expect(screen.getByText('15 items across 5 categories')).toBeInTheDocument();
    expect(screen.getByText('10 items found')).toBeInTheDocument();
  });

  it('shows Add Item link', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    const addItemLink = screen.getByRole('link', { name: /add item/i });
    expect(addItemLink).toHaveAttribute('href', '/wardrobe/items');
  });

  it('toggles filters visibility', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Search is always visible
    expect(screen.getByPlaceholderText('Search items across all categories...')).toBeInTheDocument();
    // Advanced category controls are collapsed initially
    expect(screen.queryByLabelText('Jacket')).not.toBeInTheDocument();
    
    // Open advanced filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    // Advanced categories should now be visible
    expect(screen.getByLabelText('Jacket')).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', async () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const searchInput = screen.getByPlaceholderText('Search items across all categories...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    await waitFor(() => {
      expect(mockProps.onSearchChange).toHaveBeenCalledWith('test search');
    });
  });

  it('calls onCategoryToggle when category is selected', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const jacketCheckbox = screen.getByLabelText('Jacket');
    fireEvent.click(jacketCheckbox);
    
    expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('cat1');
  });

  it('renders all category options as checkboxes', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    // Check that all categories are present as checkboxes
    expect(screen.getByLabelText('All Categories')).toBeInTheDocument();
    expect(screen.getByLabelText('Jacket')).toBeInTheDocument();
    expect(screen.getByLabelText('Overshirt')).toBeInTheDocument();
    expect(screen.getByLabelText('Shirt')).toBeInTheDocument();
    expect(screen.getByLabelText('Pants')).toBeInTheDocument();
    expect(screen.getByLabelText('Shoes')).toBeInTheDocument();
  });

  it('calls onTagToggle when tag is clicked', async () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
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
    const filtersButton = screen.getByText('More Filters');
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
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const refinedTag = screen.getByText('Refined');
    const crossoverTag = screen.getByText('Crossover');
    const adventurerTag = screen.getByText('Adventurer');
    
    expect(refinedTag).toHaveClass('bg-primary');
    expect(crossoverTag).toHaveClass('bg-primary');
    expect(adventurerTag).toHaveClass('bg-card');
  });

  it('shows filtering indicator when search is active', () => {
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        searchTerm="test"
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    // Should show filtering indicator
    expect(screen.getByText('Filtering…')).toBeInTheDocument();
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

  it('shows selected categories as checked', () => {
    const selectedCategories = new Set(['cat1', 'cat3']);
    
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        selectedCategories={selectedCategories}
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const jacketCheckbox = screen.getByLabelText('Jacket') as HTMLInputElement;
    const shirtCheckbox = screen.getByLabelText('Shirt') as HTMLInputElement;
    const overshirtCheckbox = screen.getByLabelText('Overshirt') as HTMLInputElement;
    
    expect(jacketCheckbox.checked).toBe(true);
    expect(shirtCheckbox.checked).toBe(true);
    expect(overshirtCheckbox.checked).toBe(false);
  });

  it('handles Jacket category selection correctly', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const jacketCheckbox = screen.getByLabelText('Jacket');
    fireEvent.click(jacketCheckbox);
    
    expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('cat1');
  });

  it('handles Overshirt category selection correctly', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const overshirtCheckbox = screen.getByLabelText('Overshirt');
    fireEvent.click(overshirtCheckbox);
    
    expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('cat2');
  });

  it('shows Jacket category as selected', () => {
    const selectedCategories = new Set(['cat1']);
    
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        selectedCategories={selectedCategories}
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const jacketCheckbox = screen.getByLabelText('Jacket') as HTMLInputElement;
    expect(jacketCheckbox.checked).toBe(true);
  });

  it('shows Overshirt category as selected', () => {
    const selectedCategories = new Set(['cat2']);
    
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        selectedCategories={selectedCategories}
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const overshirtCheckbox = screen.getByLabelText('Overshirt') as HTMLInputElement;
    expect(overshirtCheckbox.checked).toBe(true);
  });

  it('displays correct category names as checkboxes', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    // Verify that both new categories are available as checkboxes
    expect(screen.getByLabelText('Jacket')).toBeInTheDocument();
    expect(screen.getByLabelText('Overshirt')).toBeInTheDocument();
    
    // Verify that old combined category is not present
    expect(screen.queryByLabelText('Jacket/Overshirt')).not.toBeInTheDocument();
  });

  it('handles multiple category selection', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    // Select multiple categories
    const jacketCheckbox = screen.getByLabelText('Jacket');
    const overshirtCheckbox = screen.getByLabelText('Overshirt');
    
    fireEvent.click(jacketCheckbox);
    fireEvent.click(overshirtCheckbox);
    
    expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('cat1');
    expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('cat2');
  });

  it('shows "All Categories" as checked when no categories are selected', () => {
    render(<WardrobeSearchFilters {...mockProps} />);
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const allCategoriesCheckbox = screen.getByLabelText('All Categories') as HTMLInputElement;
    expect(allCategoriesCheckbox.checked).toBe(true);
  });

  it('shows "All Categories" as unchecked when categories are selected', () => {
    const selectedCategories = new Set(['cat1']);
    
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        selectedCategories={selectedCategories}
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const allCategoriesCheckbox = screen.getByLabelText('All Categories') as HTMLInputElement;
    expect(allCategoriesCheckbox.checked).toBe(false);
  });

  it('clears all category selections when "All Categories" is clicked', () => {
    const selectedCategories = new Set(['cat1', 'cat2']);
    
    render(
      <WardrobeSearchFilters 
        {...mockProps} 
        selectedCategories={selectedCategories}
      />
    );
    
    // Open filters
    const filtersButton = screen.getByText('More Filters');
    fireEvent.click(filtersButton);
    
    const allCategoriesCheckbox = screen.getByLabelText('All Categories');
    fireEvent.click(allCategoriesCheckbox);
    
    // Should call onCategoryToggle for each selected category to clear them
    expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('cat1');
    expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('cat2');
  });
});

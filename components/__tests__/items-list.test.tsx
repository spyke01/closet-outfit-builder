import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ItemsList } from '../items-list';

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
];

describe('ItemsList', () => {
  const mockOnItemSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders items in list format', () => {
    render(
      <ItemsList
        items={mockItems}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    expect(screen.getByText('Brand A Blue Shirt')).toBeInTheDocument();
    expect(screen.getByText('Brand B Black Pants')).toBeInTheDocument();
    expect(screen.getByText('Color: Blue')).toBeInTheDocument();
    expect(screen.getByText('Material: Cotton')).toBeInTheDocument();
    expect(screen.getByText('Formality: 7/10')).toBeInTheDocument();
  });

  it('renders items without brand when showBrand is false', () => {
    render(
      <ItemsList
        items={mockItems}
        onItemSelect={mockOnItemSelect}
        showBrand={false}
      />
    );

    expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
    expect(screen.getByText('Black Pants')).toBeInTheDocument();
    expect(screen.queryByText('Brand A Blue Shirt')).not.toBeInTheDocument();
  });

  it('shows capsule tags', () => {
    render(
      <ItemsList
        items={mockItems}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    expect(screen.getAllByText('Refined')).toHaveLength(2); // Both items have Refined tag
    expect(screen.getByText('Crossover')).toBeInTheDocument();
  });

  it('calls onItemSelect when item is clicked', () => {
    render(
      <ItemsList
        items={mockItems}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    const firstItem = screen.getByText('Brand A Blue Shirt').closest('[role="button"]');
    fireEvent.click(firstItem!);

    expect(mockOnItemSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it('handles keyboard navigation', () => {
    render(
      <ItemsList
        items={mockItems}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    const firstItem = screen.getByText('Brand A Blue Shirt').closest('[role="button"]');
    
    // Test Enter key
    fireEvent.keyDown(firstItem!, { key: 'Enter' });
    expect(mockOnItemSelect).toHaveBeenCalledWith(mockItems[0]);

    // Test Space key
    fireEvent.keyDown(firstItem!, { key: ' ' });
    expect(mockOnItemSelect).toHaveBeenCalledTimes(2);
  });

  it('highlights selected item', () => {
    render(
      <ItemsList
        items={mockItems}
        selectedItem={mockItems[0]}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    const firstItem = screen.getByText('Brand A Blue Shirt').closest('[role="button"]');
    expect(firstItem).toHaveClass('border-slate-800');
  });

  it('shows empty state when no items', () => {
    render(
      <ItemsList
        items={[]}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    expect(screen.getByText('No items found.')).toBeInTheDocument();
  });

  it('displays images when available', () => {
    render(
      <ItemsList
        items={mockItems}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/shirt.jpg');
    expect(images[0]).toHaveAttribute('alt', 'Blue Shirt');
  });

  it('handles items without optional fields gracefully', () => {
    const minimalItem = {
      id: 'item3',
      name: 'Simple Shirt',
      category_id: 'cat1',
      user_id: 'user1',
      active: true,
      season: ['All'],
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    render(
      <ItemsList
        items={[minimalItem]}
        onItemSelect={mockOnItemSelect}
        showBrand={true}
      />
    );

    expect(screen.getByText('Simple Shirt')).toBeInTheDocument();
    expect(screen.queryByText('Color:')).not.toBeInTheDocument();
    expect(screen.queryByText('Material:')).not.toBeInTheDocument();
    expect(screen.queryByText('Formality:')).not.toBeInTheDocument();
  });
});
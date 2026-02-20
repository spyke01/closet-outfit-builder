import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CategoryDropdown } from '../category-dropdown';
import type { WardrobeItem } from '@/lib/schemas';

// Mock wardrobe items for testing
const mockJacketItems: WardrobeItem[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    category_id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Pea Coat',
    brand: 'Navy Brand',
    color: 'navy',
    formality_score: 8,
    capsule_tags: ['Refined'],
    season: ['Fall', 'Winter'],
    image_url: null,
    active: true,
    bg_removal_status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    category_id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Leather Jacket',
    brand: 'Moto Brand',
    color: 'black',
    formality_score: 6,
    capsule_tags: ['Adventurer'],
    season: ['Spring', 'Fall'],
    image_url: null,
    active: true,
    bg_removal_status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockOvershirtItems: WardrobeItem[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    category_id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Cardigan',
    brand: 'Knit Brand',
    color: 'gray',
    formality_score: 5,
    capsule_tags: ['Crossover'],
    season: ['Fall', 'Winter'],
    image_url: null,
    active: true,
    bg_removal_status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    category_id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Shacket',
    brand: 'Casual Brand',
    color: 'brown',
    formality_score: 4,
    capsule_tags: ['Adventurer'],
    season: ['Spring', 'Fall'],
    image_url: null,
    active: true,
    bg_removal_status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('CategoryDropdown', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Jacket category dropdown with jacket items', () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={null}
        availableItems={mockJacketItems}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Select Jacket')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Jacket' })).toBeInTheDocument();
  });

  it('renders Overshirt category dropdown with overshirt items', () => {
    render(
      <CategoryDropdown
        category="Overshirt"
        selectedItem={null}
        availableItems={mockOvershirtItems}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Select Overshirt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Overshirt' })).toBeInTheDocument();
  });

  it('displays jacket items when dropdown is opened', async () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={null}
        availableItems={mockJacketItems}
        onSelect={mockOnSelect}
      />
    );

    const button = screen.getByRole('button', { name: 'Select Jacket' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Navy Brand Pea Coat')).toBeInTheDocument();
      expect(screen.getByText('Moto Brand Leather Jacket')).toBeInTheDocument();
    });
  });

  it('displays overshirt items when dropdown is opened', async () => {
    render(
      <CategoryDropdown
        category="Overshirt"
        selectedItem={null}
        availableItems={mockOvershirtItems}
        onSelect={mockOnSelect}
      />
    );

    const button = screen.getByRole('button', { name: 'Select Overshirt' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Knit Brand Cardigan')).toBeInTheDocument();
      expect(screen.getByText('Casual Brand Shacket')).toBeInTheDocument();
    });
  });

  it('calls onSelect when jacket item is selected', async () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={null}
        availableItems={mockJacketItems}
        onSelect={mockOnSelect}
      />
    );

    const button = screen.getByRole('button', { name: 'Select Jacket' });
    fireEvent.click(button);

    await waitFor(() => {
      const jacketItem = screen.getByText('Navy Brand Pea Coat');
      fireEvent.click(jacketItem);
    });

    expect(mockOnSelect).toHaveBeenCalledWith(mockJacketItems[0]);
  });

  it('calls onSelect when overshirt item is selected', async () => {
    render(
      <CategoryDropdown
        category="Overshirt"
        selectedItem={null}
        availableItems={mockOvershirtItems}
        onSelect={mockOnSelect}
      />
    );

    const button = screen.getByRole('button', { name: 'Select Overshirt' });
    fireEvent.click(button);

    await waitFor(() => {
      const overshirtItem = screen.getByText('Knit Brand Cardigan');
      fireEvent.click(overshirtItem);
    });

    expect(mockOnSelect).toHaveBeenCalledWith(mockOvershirtItems[0]);
  });

  it('displays selected jacket item correctly', () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={mockJacketItems[0]}
        availableItems={mockJacketItems}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Navy Brand Pea Coat')).toBeInTheDocument();
  });

  it('displays selected overshirt item correctly', () => {
    render(
      <CategoryDropdown
        category="Overshirt"
        selectedItem={mockOvershirtItems[0]}
        availableItems={mockOvershirtItems}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Knit Brand Cardigan')).toBeInTheDocument();
  });

  it('shows clear selection option for both categories', async () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={null}
        availableItems={mockJacketItems}
        onSelect={mockOnSelect}
      />
    );

    const button = screen.getByRole('button', { name: 'Select Jacket' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Clear selection')).toBeInTheDocument();
    });
  });

  it('handles empty item list gracefully', async () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={null}
        availableItems={[]}
        onSelect={mockOnSelect}
      />
    );

    const button = screen.getByRole('button', { name: 'Select Jacket' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('No items available')).toBeInTheDocument();
    });
  });

  it('shows loading state correctly', () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={null}
        availableItems={mockJacketItems}
        onSelect={mockOnSelect}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows locked state correctly', () => {
    render(
      <CategoryDropdown
        category="Jacket"
        selectedItem={mockJacketItems[0]}
        availableItems={mockJacketItems}
        onSelect={mockOnSelect}
        isLocked={true}
      />
    );

    expect(screen.getByText('Navy Brand Pea Coat')).toBeInTheDocument();
    // Should not be clickable when locked
    const button = screen.getByRole('button', { name: 'Select Jacket' });
    expect(button).toHaveClass('cursor-not-allowed');
  });
});
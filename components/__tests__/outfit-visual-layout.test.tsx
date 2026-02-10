import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { OutfitVisualLayout } from '../outfit-visual-layout';
import { WardrobeItem } from '@/lib/types/database';

const mockItems: WardrobeItem[] = [
  {
    id: '1',
    user_id: 'user1',
    category_id: 'cat1',
    name: 'Navy Blazer',
    brand: 'Hugo Boss',
    color: 'Navy',
    formality_score: 9,
    season: ['All'],
    image_url: 'https://example.com/blazer.jpg',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat1',
      user_id: 'user1',
      name: 'Jacket',
      is_anchor_item: true,
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    user_id: 'user1',
    category_id: 'cat2',
    name: 'White Dress Shirt',
    brand: 'Brooks Brothers',
    color: 'White',
    formality_score: 8,
    season: ['All'],
    image_url: 'https://example.com/shirt.jpg',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat2',
      user_id: 'user1',
      name: 'Shirt',
      is_anchor_item: false,
      display_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '3',
    user_id: 'user1',
    category_id: 'cat3',
    name: 'Dark Jeans',
    brand: 'Levi\'s',
    color: 'Dark Blue',
    formality_score: 5,
    image_url: null, // No image
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat3',
      user_id: 'user1',
      name: 'Pants',
      is_anchor_item: false,
      display_order: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

describe('OutfitVisualLayout', () => {
  it('renders empty state when no items provided', () => {
    render(<OutfitVisualLayout items={[]} />);
    
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Create an outfit to see items')).toBeInTheDocument();
  });

  it('renders fallback state when items have no images', () => {
    const itemsWithoutImages = mockItems.map(item => ({ ...item, image_url: null }));
    render(<OutfitVisualLayout items={itemsWithoutImages} />);
    
    expect(screen.getByText('3 Items')).toBeInTheDocument();
    expect(screen.getByText('Add images to see layout')).toBeInTheDocument();
  });

  it('renders visual layout with items that have images', () => {
    render(<OutfitVisualLayout items={mockItems} />);
    
    // Should show images for items that have them
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2); // Only blazer and shirt have images
    
    expect(images[0]).toHaveAttribute('src', 'https://example.com/blazer.jpg');
    expect(images[0]).toHaveAttribute('alt', 'Navy Blazer by Hugo Boss');
    
    expect(images[1]).toHaveAttribute('src', 'https://example.com/shirt.jpg');
    expect(images[1]).toHaveAttribute('alt', 'White Dress Shirt by Brooks Brothers');
  });

  it('displays item count badge', () => {
    render(<OutfitVisualLayout items={mockItems} />);
    
    expect(screen.getByText('2 items')).toBeInTheDocument(); // Only items with images
  });

  it('displays item count badge with singular form', () => {
    const singleItem = [mockItems[0]]; // Only the blazer
    render(<OutfitVisualLayout items={singleItem} />);
    
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { container: smallContainer } = render(
      <OutfitVisualLayout items={mockItems} size="small" />
    );
    expect(smallContainer.querySelector('.w-64')).toBeInTheDocument();

    const { container: mediumContainer } = render(
      <OutfitVisualLayout items={mockItems} size="medium" />
    );
    expect(mediumContainer.querySelector('.w-80')).toBeInTheDocument();

    const { container: largeContainer } = render(
      <OutfitVisualLayout items={mockItems} size="large" />
    );
    expect(largeContainer.querySelector('.w-96')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <OutfitVisualLayout items={mockItems} className="custom-class" />
    );
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('handles different category mappings correctly', () => {
    const itemsWithDifferentCategories: WardrobeItem[] = [
      {
        ...mockItems[0],
        category: { ...mockItems[0].category!, name: 'Jacket' }
      },
      {
        ...mockItems[1],
        category: { ...mockItems[1].category!, name: 'Undershirt' }
      }
    ];

    render(<OutfitVisualLayout items={itemsWithDifferentCategories} />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('filters out items without valid image URLs', () => {
    const mixedItems = [
      mockItems[0], // Has image
      { ...mockItems[1], image_url: '' }, // Empty string
      { ...mockItems[2], image_url: '   ' }, // Whitespace only
      {
        ...mockItems[0],
        id: '4',
        image_url: 'https://example.com/shoes.jpg',
        category: { ...mockItems[0].category!, name: 'Shoes' }
      } // Has image
    ];

    render(<OutfitVisualLayout items={mixedItems} />);
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2); // Only items with valid images
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('positions items with absolute positioning', () => {
    const { container } = render(<OutfitVisualLayout items={mockItems} />);
    
    // Check that items are positioned absolutely
    const positionedElements = container.querySelectorAll('[style*="position: absolute"]');
    expect(positionedElements.length).toBeGreaterThan(0);
  });

  it('applies hover effects and tooltips', () => {
    render(<OutfitVisualLayout items={mockItems} />);
    
    // Check for hover tooltip elements
    const tooltips = screen.getAllByText(/Navy Blazer • Hugo Boss|White Dress Shirt • Brooks Brothers/);
    expect(tooltips.length).toBeGreaterThan(0);
  });
});

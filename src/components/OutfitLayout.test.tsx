import { render, screen } from '../test/test-utils';
import { vi, describe, it, expect } from 'vitest';
import { OutfitLayout } from './OutfitLayout';
import { OutfitSelection, WardrobeItem } from '../types';

// Mock ClothingItemDisplay component to avoid rendering issues in tests
vi.mock('./ClothingItemDisplay', () => ({
  ClothingItemDisplay: ({ item }: { item: WardrobeItem }) => {
    // Only render if item has image (simulating real behavior)
    if (!item.image || item.image.trim() === '') return null;
    return (
      <div data-testid={`display-${item.category.toLowerCase().replace('/', '-')}`}>
        {item.name}
      </div>
    );
  }
}));

const createMockItem = (id: string, name: string, category: any, image?: string): WardrobeItem => ({
  id,
  name,
  category,
  formalityScore: 5,
  active: true,
  image: image !== undefined ? image : 'https://example.com/image.jpg' // Only default if undefined
});

describe('OutfitLayout', () => {
  it('renders empty state when no items are selected', () => {
    const emptySelection: OutfitSelection = {};
    
    render(<OutfitLayout selection={emptySelection} />);
    
    expect(screen.getByText('No items with images')).toBeInTheDocument();
    expect(screen.getByText('📷')).toBeInTheDocument();
  });

  it('renders selected clothing items', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt'),
      pants: createMockItem('2', 'Navy Chinos', 'Pants'),
      shoes: createMockItem('3', 'Brown Loafers', 'Shoes')
    };
    
    render(<OutfitLayout selection={selection} />);
    
    expect(screen.getByTestId('display-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('display-pants')).toBeInTheDocument();
    expect(screen.getByTestId('display-shoes')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
  });

  it('handles single item correctly', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt')
    };
    
    render(<OutfitLayout selection={selection} />);
    
    expect(screen.getByTestId('display-shirt')).toBeInTheDocument();
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('renders all clothing categories when selected', () => {
    const selection: OutfitSelection = {
      jacket: createMockItem('1', 'Navy Blazer', 'Jacket/Overshirt'),
      shirt: createMockItem('2', 'White OCBD', 'Shirt'),
      undershirt: createMockItem('3', 'White Tee', 'Undershirt'),
      pants: createMockItem('4', 'Navy Chinos', 'Pants'),
      shoes: createMockItem('5', 'Brown Loafers', 'Shoes'),
      belt: createMockItem('6', 'Brown Belt', 'Belt'),
      watch: createMockItem('7', 'Silver Watch', 'Watch')
    };
    
    render(<OutfitLayout selection={selection} />);
    
    expect(screen.getByTestId('display-jacket-overshirt')).toBeInTheDocument();
    expect(screen.getByTestId('display-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('display-undershirt')).toBeInTheDocument();
    expect(screen.getByTestId('display-pants')).toBeInTheDocument();
    expect(screen.getByTestId('display-shoes')).toBeInTheDocument();
    expect(screen.getByTestId('display-belt')).toBeInTheDocument();
    expect(screen.getByTestId('display-watch')).toBeInTheDocument();
    expect(screen.getByText('7 items')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt')
    };
    
    const { container, rerender } = render(<OutfitLayout selection={selection} size="small" />);
    expect(container.querySelector('.w-80')).toBeInTheDocument();
    
    rerender(<OutfitLayout selection={selection} size="medium" />);
    expect(container.querySelector('.w-96')).toBeInTheDocument();
    
    rerender(<OutfitLayout selection={selection} size="large" />);
    expect(container.querySelector('.w-\\[28rem\\]')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt')
    };
    
    const { container } = render(<OutfitLayout selection={selection} className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('shows empty state when items have no images', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt', ''), // No image
      pants: createMockItem('2', 'Navy Chinos', 'Pants', '') // No image
    };
    
    render(<OutfitLayout selection={selection} />);
    
    expect(screen.getByText('No items with images')).toBeInTheDocument();
    expect(screen.getByText('Add images to wardrobe items to see visual layout')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { OutfitLayout } from './OutfitLayout';
import { OutfitSelection, WardrobeItem } from '../types';

// Mock SVG components to avoid rendering issues in tests
vi.mock('./svg', () => ({
  ClothingItemSVG: ({ item }: { item: WardrobeItem }) => (
    <div data-testid={`svg-${item.category.toLowerCase().replace('/', '-')}`}>
      {item.name}
    </div>
  ),
  getLayerZIndex: (category: string) => {
    const zIndexMap: Record<string, number> = {
      'Jacket/Overshirt': 50,
      'Shirt': 40,
      'Undershirt': 30,
      'Pants': 20,
      'Shoes': 10,
      'Belt': 25,
      'Watch': 60
    };
    return zIndexMap[category] || 0;
  }
}));

const createMockItem = (id: string, name: string, category: any): WardrobeItem => ({
  id,
  name,
  category,
  formalityScore: 5,
  active: true
});

describe('OutfitLayout', () => {
  it('renders empty state when no items are selected', () => {
    const emptySelection: OutfitSelection = {};
    
    render(<OutfitLayout selection={emptySelection} />);
    
    expect(screen.getByText('No items selected')).toBeInTheDocument();
    expect(screen.getByText('👔')).toBeInTheDocument();
  });

  it('renders selected clothing items', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt'),
      pants: createMockItem('2', 'Navy Chinos', 'Pants'),
      shoes: createMockItem('3', 'Brown Loafers', 'Shoes')
    };
    
    render(<OutfitLayout selection={selection} />);
    
    expect(screen.getByTestId('svg-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('svg-pants')).toBeInTheDocument();
    expect(screen.getByTestId('svg-shoes')).toBeInTheDocument();
    expect(screen.getByText('3 items')).toBeInTheDocument();
  });

  it('handles single item correctly', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt')
    };
    
    render(<OutfitLayout selection={selection} />);
    
    expect(screen.getByTestId('svg-shirt')).toBeInTheDocument();
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
    
    expect(screen.getByTestId('svg-jacket-overshirt')).toBeInTheDocument();
    expect(screen.getByTestId('svg-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('svg-undershirt')).toBeInTheDocument();
    expect(screen.getByTestId('svg-pants')).toBeInTheDocument();
    expect(screen.getByTestId('svg-shoes')).toBeInTheDocument();
    expect(screen.getByTestId('svg-belt')).toBeInTheDocument();
    expect(screen.getByTestId('svg-watch')).toBeInTheDocument();
    expect(screen.getByText('7 items')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt')
    };
    
    const { rerender } = render(<OutfitLayout selection={selection} size="small" />);
    expect(document.querySelector('.w-72')).toBeInTheDocument();
    
    rerender(<OutfitLayout selection={selection} size="medium" />);
    expect(document.querySelector('.w-80')).toBeInTheDocument();
    
    rerender(<OutfitLayout selection={selection} size="large" />);
    expect(document.querySelector('.w-96')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const selection: OutfitSelection = {
      shirt: createMockItem('1', 'White OCBD', 'Shirt')
    };
    
    render(<OutfitLayout selection={selection} className="custom-class" />);
    expect(document.querySelector('.custom-class')).toBeInTheDocument();
  });
});
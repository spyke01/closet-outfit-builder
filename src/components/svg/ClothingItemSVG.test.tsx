import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClothingItemSVG, extractItemColor, getLayerZIndex } from './ClothingItemSVG';
import { WardrobeItem } from '../../types';

// Mock all SVG components
vi.mock('./JacketSVG', () => ({
  JacketSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="jacket-svg" data-color={color} className={className}>Jacket SVG</div>
  )
}));

vi.mock('./TrenchCoatSVG', () => ({
  TrenchCoatSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="trench-svg" data-color={color} className={className}>Trench SVG</div>
  )
}));

vi.mock('./MacCoatSVG', () => ({
  MacCoatSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="mac-svg" data-color={color} className={className}>Mac SVG</div>
  )
}));

vi.mock('./TShirtSVG', () => ({
  TShirtSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="tshirt-svg" data-color={color} className={className}>T-Shirt SVG</div>
  )
}));

vi.mock('./LongSleeveSVG', () => ({
  LongSleeveSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="longsleeve-svg" data-color={color} className={className}>Long Sleeve SVG</div>
  )
}));

vi.mock('./PoloSVG', () => ({
  PoloSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="polo-svg" data-color={color} className={className}>Polo SVG</div>
  )
}));

vi.mock('./ChinosSVG', () => ({
  ChinosSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="chinos-svg" data-color={color} className={className}>Chinos SVG</div>
  )
}));

vi.mock('./ShortsSVG', () => ({
  ShortsSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="shorts-svg" data-color={color} className={className}>Shorts SVG</div>
  )
}));

vi.mock('./LoafersSVG', () => ({
  LoafersSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="loafers-svg" data-color={color} className={className}>Loafers SVG</div>
  )
}));

vi.mock('./SneakersSVG', () => ({
  SneakersSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="sneakers-svg" data-color={color} className={className}>Sneakers SVG</div>
  )
}));

vi.mock('./BeltSVG', () => ({
  BeltSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="belt-svg" data-color={color} className={className}>Belt SVG</div>
  )
}));

vi.mock('./DressWatchSVG', () => ({
  DressWatchSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="dress-watch-svg" data-color={color} className={className}>Dress Watch SVG</div>
  )
}));

vi.mock('./DiverWatchSVG', () => ({
  DiverWatchSVG: ({ color, className }: { color: string; className: string }) => (
    <div data-testid="diver-watch-svg" data-color={color} className={className}>Diver Watch SVG</div>
  )
}));

const createMockItem = (name: string, category: any): WardrobeItem => ({
  id: `test-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  category,
  formalityScore: 5,
  active: true
});

describe('ClothingItemSVG', () => {
  describe('SVG Type Selection', () => {
    it('renders jacket SVG for jacket items', () => {
      const item = createMockItem('Navy Blazer', 'Jacket/Overshirt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('jacket-svg')).toBeInTheDocument();
      expect(screen.getByText('Jacket SVG')).toBeInTheDocument();
    });

    it('renders trench coat SVG for trench items', () => {
      const item = createMockItem('Beige Trench Coat', 'Jacket/Overshirt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('trench-svg')).toBeInTheDocument();
      expect(screen.getByText('Trench SVG')).toBeInTheDocument();
    });

    it('renders mac coat SVG for mac items', () => {
      const item = createMockItem('Navy Mac Coat', 'Jacket/Overshirt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('mac-svg')).toBeInTheDocument();
      expect(screen.getByText('Mac SVG')).toBeInTheDocument();
    });

    it('renders polo SVG for polo shirts', () => {
      const item = createMockItem('White Polo', 'Shirt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('polo-svg')).toBeInTheDocument();
      expect(screen.getByText('Polo SVG')).toBeInTheDocument();
    });

    it('renders long sleeve SVG for OCBD shirts', () => {
      const item = createMockItem('White OCBD', 'Shirt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('longsleeve-svg')).toBeInTheDocument();
      expect(screen.getByText('Long Sleeve SVG')).toBeInTheDocument();
    });

    it('renders long sleeve SVG for button shirts', () => {
      const item = createMockItem('Blue Button Down', 'Shirt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('longsleeve-svg')).toBeInTheDocument();
    });

    it('renders t-shirt SVG for undershirt items', () => {
      const item = createMockItem('White Undershirt', 'Undershirt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('tshirt-svg')).toBeInTheDocument();
      expect(screen.getByText('T-Shirt SVG')).toBeInTheDocument();
    });

    it('renders shorts SVG for shorts items', () => {
      const item = createMockItem('Khaki Shorts', 'Pants');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('shorts-svg')).toBeInTheDocument();
      expect(screen.getByText('Shorts SVG')).toBeInTheDocument();
    });

    it('renders chinos SVG for regular pants', () => {
      const item = createMockItem('Navy Chinos', 'Pants');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('chinos-svg')).toBeInTheDocument();
      expect(screen.getByText('Chinos SVG')).toBeInTheDocument();
    });

    it('renders sneakers SVG for tennis shoes', () => {
      const item = createMockItem('White Tennis Shoes', 'Shoes');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('sneakers-svg')).toBeInTheDocument();
      expect(screen.getByText('Sneakers SVG')).toBeInTheDocument();
    });

    it('renders sneakers SVG for sneakers', () => {
      const item = createMockItem('Black Sneakers', 'Shoes');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('sneakers-svg')).toBeInTheDocument();
    });

    it('renders loafers SVG for regular shoes', () => {
      const item = createMockItem('Brown Loafers', 'Shoes');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('loafers-svg')).toBeInTheDocument();
      expect(screen.getByText('Loafers SVG')).toBeInTheDocument();
    });

    it('renders belt SVG for belt items', () => {
      const item = createMockItem('Brown Belt', 'Belt');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('belt-svg')).toBeInTheDocument();
      expect(screen.getByText('Belt SVG')).toBeInTheDocument();
    });

    it('renders diver watch SVG for diver watches', () => {
      const item = createMockItem('Black Diver Watch', 'Watch');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('diver-watch-svg')).toBeInTheDocument();
      expect(screen.getByText('Diver Watch SVG')).toBeInTheDocument();
    });

    it('renders diver watch SVG for sport watches', () => {
      const item = createMockItem('Blue Sport Watch', 'Watch');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('diver-watch-svg')).toBeInTheDocument();
    });

    it('renders dress watch SVG for regular watches', () => {
      const item = createMockItem('Silver Watch', 'Watch');
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('dress-watch-svg')).toBeInTheDocument();
      expect(screen.getByText('Dress Watch SVG')).toBeInTheDocument();
    });

    it('renders fallback t-shirt SVG for unknown categories', () => {
      const item = { ...createMockItem('Unknown Item', 'Shirt'), category: 'Unknown' as any };
      render(<ClothingItemSVG item={item} />);
      
      expect(screen.getByTestId('tshirt-svg')).toBeInTheDocument();
    });
  });

  describe('Color Application', () => {
    it('applies extracted color to SVG components', () => {
      const item = createMockItem('White OCBD', 'Shirt');
      render(<ClothingItemSVG item={item} />);
      
      const svg = screen.getByTestId('longsleeve-svg');
      expect(svg).toHaveAttribute('data-color', '#ffffff');
    });

    it('applies navy color correctly', () => {
      const item = createMockItem('Navy Blazer', 'Jacket/Overshirt');
      render(<ClothingItemSVG item={item} />);
      
      const svg = screen.getByTestId('jacket-svg');
      expect(svg).toHaveAttribute('data-color', '#1e3a8a');
    });

    it('applies brown color correctly', () => {
      const item = createMockItem('Brown Loafers', 'Shoes');
      render(<ClothingItemSVG item={item} />);
      
      const svg = screen.getByTestId('loafers-svg');
      expect(svg).toHaveAttribute('data-color', '#8b4513');
    });

    it('applies color from parentheses format', () => {
      const item = createMockItem('OCBD (White)', 'Shirt');
      render(<ClothingItemSVG item={item} />);
      
      const svg = screen.getByTestId('longsleeve-svg');
      expect(svg).toHaveAttribute('data-color', '#ffffff');
    });

    it('applies default category color when no color is found', () => {
      const item = createMockItem('Generic Shirt', 'Shirt');
      render(<ClothingItemSVG item={item} />);
      
      const svg = screen.getByTestId('longsleeve-svg');
      expect(svg).toHaveAttribute('data-color', '#e2e8f0'); // Light gray default for shirts
    });
  });

  describe('Styling and Props', () => {
    it('applies custom className', () => {
      const item = createMockItem('White OCBD', 'Shirt');
      render(<ClothingItemSVG item={item} className="custom-class" />);
      
      const svg = screen.getByTestId('longsleeve-svg');
      expect(svg).toHaveClass('clothing-item-svg', 'custom-class');
    });

    it('applies custom style including z-index', () => {
      const item = createMockItem('White OCBD', 'Shirt');
      const customStyle = { opacity: 0.5 };
      render(<ClothingItemSVG item={item} style={customStyle} />);
      
      const wrapper = screen.getByText('Long Sleeve SVG').closest('.clothing-item-wrapper');
      expect(wrapper).toHaveStyle({ zIndex: 40, opacity: 0.5 });
    });

    it('sets correct z-index for layering', () => {
      const jacket = createMockItem('Navy Blazer', 'Jacket/Overshirt');
      const shirt = createMockItem('White OCBD', 'Shirt');
      const undershirt = createMockItem('White Tee', 'Undershirt');
      
      const { rerender } = render(<ClothingItemSVG item={jacket} />);
      let wrapper = screen.getByText('Jacket SVG').closest('.clothing-item-wrapper');
      expect(wrapper).toHaveStyle({ zIndex: 50 });
      
      rerender(<ClothingItemSVG item={shirt} />);
      wrapper = screen.getByText('Long Sleeve SVG').closest('.clothing-item-wrapper');
      expect(wrapper).toHaveStyle({ zIndex: 40 });
      
      rerender(<ClothingItemSVG item={undershirt} />);
      wrapper = screen.getByText('T-Shirt SVG').closest('.clothing-item-wrapper');
      expect(wrapper).toHaveStyle({ zIndex: 30 });
    });
  });
});

describe('extractItemColor', () => {
  it('extracts basic colors correctly', () => {
    const whiteItem = createMockItem('White OCBD', 'Shirt');
    const blackItem = createMockItem('Black Tee', 'Undershirt');
    const navyItem = createMockItem('Navy Chinos', 'Pants');
    
    expect(extractItemColor(whiteItem)).toBe('#ffffff');
    expect(extractItemColor(blackItem)).toBe('#000000');
    expect(extractItemColor(navyItem)).toBe('#1e3a8a');
  });

  it('extracts colors from parentheses format', () => {
    const item1 = createMockItem('OCBD (White)', 'Shirt');
    const item2 = createMockItem('Chinos (Navy)', 'Pants');
    const item3 = createMockItem('Loafers (Brown)', 'Shoes');
    
    expect(extractItemColor(item1)).toBe('#ffffff');
    expect(extractItemColor(item2)).toBe('#1e3a8a');
    expect(extractItemColor(item3)).toBe('#8b4513');
  });

  it('handles complex color names', () => {
    const item1 = createMockItem('Burgundy Sweater', 'Shirt');
    const item2 = createMockItem('Charcoal Pants', 'Pants');
    const item3 = createMockItem('Cognac Belt', 'Belt');
    
    expect(extractItemColor(item1)).toBe('#800020');
    expect(extractItemColor(item2)).toBe('#36454f');
    expect(extractItemColor(item3)).toBe('#9a463d');
  });

  it('returns category defaults for unknown colors', () => {
    const jacket = createMockItem('Generic Jacket', 'Jacket/Overshirt');
    const shirt = createMockItem('Generic Shirt', 'Shirt');
    const undershirt = createMockItem('Generic Undershirt', 'Undershirt');
    const pants = createMockItem('Generic Pants', 'Pants');
    const shoes = createMockItem('Generic Shoes', 'Shoes');
    const belt = createMockItem('Generic Belt', 'Belt');
    const watch = createMockItem('Generic Watch', 'Watch');
    
    expect(extractItemColor(jacket)).toBe('#374151'); // Dark gray
    expect(extractItemColor(shirt)).toBe('#e2e8f0'); // Light gray
    expect(extractItemColor(undershirt)).toBe('#ffffff'); // White
    expect(extractItemColor(pants)).toBe('#8b7355'); // Khaki/tan
    expect(extractItemColor(shoes)).toBe('#8b4513'); // Brown
    expect(extractItemColor(belt)).toBe('#8b4513'); // Brown
    expect(extractItemColor(watch)).toBe('#c0c0c0'); // Silver
  });

  it('handles case insensitive color matching', () => {
    const item1 = createMockItem('WHITE SHIRT', 'Shirt');
    const item2 = createMockItem('Navy PANTS', 'Pants');
    const item3 = createMockItem('Brown SHOES', 'Shoes');
    
    expect(extractItemColor(item1)).toBe('#ffffff');
    expect(extractItemColor(item2)).toBe('#1e3a8a');
    expect(extractItemColor(item3)).toBe('#8b4513');
  });

  it('handles multi-word colors', () => {
    const item1 = createMockItem('Light Blue Shirt', 'Shirt');
    const item2 = createMockItem('Dark Gray Pants', 'Pants');
    
    // Should match 'blue' and 'gray' respectively
    expect(extractItemColor(item1)).toBe('#3b82f6');
    expect(extractItemColor(item2)).toBe('#6b7280');
  });
});

describe('getLayerZIndex', () => {
  it('returns correct z-index values for layering', () => {
    expect(getLayerZIndex('Jacket/Overshirt')).toBe(50);
    expect(getLayerZIndex('Shirt')).toBe(40);
    expect(getLayerZIndex('Undershirt')).toBe(30);
    expect(getLayerZIndex('Pants')).toBe(20);
    expect(getLayerZIndex('Shoes')).toBe(10);
    expect(getLayerZIndex('Belt')).toBe(25);
    expect(getLayerZIndex('Watch')).toBe(60);
  });

  it('returns 0 for unknown categories', () => {
    expect(getLayerZIndex('Unknown' as any)).toBe(0);
  });

  it('maintains proper layering hierarchy', () => {
    const watch = getLayerZIndex('Watch');
    const jacket = getLayerZIndex('Jacket/Overshirt');
    const shirt = getLayerZIndex('Shirt');
    const undershirt = getLayerZIndex('Undershirt');
    const belt = getLayerZIndex('Belt');
    const pants = getLayerZIndex('Pants');
    const shoes = getLayerZIndex('Shoes');
    
    // Watch should be highest (always visible)
    expect(watch).toBeGreaterThan(jacket);
    
    // Jacket should be higher than shirt
    expect(jacket).toBeGreaterThan(shirt);
    
    // Shirt should be higher than undershirt
    expect(shirt).toBeGreaterThan(undershirt);
    
    // Belt should be between pants and undershirt
    expect(belt).toBeGreaterThan(pants);
    expect(belt).toBeLessThan(undershirt);
    
    // Pants should be higher than shoes
    expect(pants).toBeGreaterThan(shoes);
  });
});
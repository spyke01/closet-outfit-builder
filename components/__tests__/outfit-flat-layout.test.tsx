import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { OutfitFlatLayout } from '../outfit-flat-layout';
import { WardrobeItem } from '@/lib/types/database';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  },
}));

const mockItems: WardrobeItem[] = [
  {
    id: '1',
    user_id: 'user1',
    category_id: 'cat1',
    name: 'Blue Dress Shirt',
    brand: 'Brooks Brothers',
    color: 'Blue',
    formality_score: 8,
    image_url: 'https://example.com/shirt.jpg',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat1',
      user_id: 'user1',
      name: 'Shirt',
      is_anchor_item: false,
      display_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    user_id: 'user1',
    category_id: 'cat2',
    name: 'Dark Jeans',
    brand: 'Levi\'s',
    color: 'Dark Blue',
    formality_score: 5,
    image_url: null,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat2',
      user_id: 'user1',
      name: 'Pants',
      is_anchor_item: false,
      display_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

describe('OutfitFlatLayout', () => {
  it('renders empty state when no items provided', () => {
    render(<OutfitFlatLayout items={[]} />);
    
    expect(screen.getByText('No items in this outfit')).toBeInTheDocument();
  });

  it('renders items in a grid layout', () => {
    render(<OutfitFlatLayout items={mockItems} outfitScore={85} />);
    
    expect(screen.getByText('Outfit Items (2)')).toBeInTheDocument();
    expect(screen.getByText('Total Score: 85/100')).toBeInTheDocument();
    expect(screen.getByText('Blue Dress Shirt')).toBeInTheDocument();
    expect(screen.getByText('Dark Jeans')).toBeInTheDocument();
  });

  it('displays category labels and brands', () => {
    render(<OutfitFlatLayout items={mockItems} outfitScore={85} />);
    
    expect(screen.getByText('Shirt')).toBeInTheDocument();
    expect(screen.getByText('Pants')).toBeInTheDocument();
    expect(screen.getByText('Brooks Brothers')).toBeInTheDocument();
    expect(screen.getByText('Levi\'s')).toBeInTheDocument();
  });

  it('shows score contributions when outfit score is provided', () => {
    render(<OutfitFlatLayout items={mockItems} outfitScore={84} />);
    
    // Score should be distributed: 84/2 = 42 each
    expect(screen.getAllByText('42 pts')).toHaveLength(2);
    expect(screen.getAllByText('50%')).toHaveLength(2);
  });

  it('displays formality scores', () => {
    render(<OutfitFlatLayout items={mockItems} outfitScore={85} />);
    
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('shows action buttons in editable mode', () => {
    const mockRemoveItem = vi.fn();
    
    render(
      <OutfitFlatLayout 
        items={mockItems} 
        outfitScore={85} 
        isEditable={true}
        onRemoveItem={mockRemoveItem}
      />
    );
    
    // Should have remove buttons (X icons) for each item
    const removeButtons = screen.getAllByRole('button');
    const removeButtonsWithX = removeButtons.filter(button => 
      button.querySelector('svg') && button.className.includes('destructive')
    );
    expect(removeButtonsWithX).toHaveLength(2);
  });

  it('calls onRemoveItem when remove button is clicked', () => {
    const mockRemoveItem = vi.fn();
    
    render(
      <OutfitFlatLayout 
        items={mockItems} 
        outfitScore={85} 
        isEditable={true}
        onRemoveItem={mockRemoveItem}
      />
    );
    
    const removeButtons = screen.getAllByRole('button');
    const firstRemoveButton = removeButtons.find(button => 
      button.className.includes('destructive')
    );
    
    if (firstRemoveButton) {
      fireEvent.click(firstRemoveButton);
      expect(mockRemoveItem).toHaveBeenCalledWith('1');
    }
  });

  it('displays summary footer with score distribution', () => {
    render(<OutfitFlatLayout items={mockItems} outfitScore={84} />);
    
    expect(screen.getByText('Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('Avg per item: 42')).toBeInTheDocument();
    expect(screen.getByText('84/100')).toBeInTheDocument();
  });

  it('handles items without images', () => {
    render(<OutfitFlatLayout items={mockItems} outfitScore={85} />);
    
    // First item has image, second doesn't
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/shirt.jpg');
    expect(images[0]).toHaveAttribute('alt', 'Blue Dress Shirt');
  });

  it('creates proper links to item detail pages', () => {
    render(<OutfitFlatLayout items={mockItems} outfitScore={85} />);
    
    const links = screen.getAllByRole('link');
    expect(links.some(link => link.getAttribute('href') === '/wardrobe/items/1')).toBe(true);
    expect(links.some(link => link.getAttribute('href') === '/wardrobe/items/2')).toBe(true);
  });

  it('handles score distribution with remainder correctly', () => {
    // 85 points / 2 items = 42 each + 1 remainder
    // First item should get 43, second should get 42
    render(<OutfitFlatLayout items={mockItems} outfitScore={85} />);
    
    expect(screen.getByText('43 pts')).toBeInTheDocument();
    expect(screen.getByText('42 pts')).toBeInTheDocument();
  });
});
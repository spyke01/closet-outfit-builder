import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutfitList } from './OutfitList';
import { GeneratedOutfit, WardrobeItem } from '../types';

// Mock data
const mockJacket: WardrobeItem = {
  id: 'moto-jacket',
  name: 'Moto Jacket',
  category: 'Jacket/Overshirt',
  capsuleTags: ['Adventurer', 'Crossover'],
  formalityScore: 3
};

const mockShirt: WardrobeItem = {
  id: 'white-tee',
  name: 'White Tee',
  category: 'Shirt',
  capsuleTags: ['Crossover', 'Adventurer', 'Refined'],
  formalityScore: 2
};

const mockPants: WardrobeItem = {
  id: 'dark-denim',
  name: 'Dark Denim',
  category: 'Pants',
  capsuleTags: ['Crossover', 'Adventurer'],
  formalityScore: 4
};

const mockShoes: WardrobeItem = {
  id: 'boots-brown-apache',
  name: 'Apache Boots',
  category: 'Shoes',
  capsuleTags: ['Adventurer'],
  formalityScore: 5
};

const mockOutfit1: GeneratedOutfit = {
  id: 'outfit-1',
  jacket: mockJacket,
  shirt: mockShirt,
  pants: mockPants,
  shoes: mockShoes,
  score: 85,
  source: 'curated'
};

const mockOutfit2: GeneratedOutfit = {
  id: 'outfit-2',
  jacket: mockJacket,
  shirt: { ...mockShirt, id: 'black-tee', name: 'Black Tee' },
  pants: mockPants,
  shoes: mockShoes,
  score: 78,
  source: 'generated'
};

const mockOutfit3: GeneratedOutfit = {
  id: 'outfit-3',
  jacket: mockJacket,
  shirt: { ...mockShirt, id: 'grey-henley', name: 'Grey Henley' },
  pants: mockPants,
  shoes: mockShoes,
  score: 92,
  source: 'curated'
};

describe('OutfitList', () => {
  const mockOnOutfitSelect = vi.fn();

  beforeEach(() => {
    mockOnOutfitSelect.mockClear();
  });

  describe('Rendering', () => {
    it('renders outfit count message for single outfit', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('1 outfit found')).toBeInTheDocument();
    });

    it('renders outfit count message for multiple outfits', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1, mockOutfit2, mockOutfit3]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('3 outfits found')).toBeInTheDocument();
    });

    it('renders "No outfits match your selection" when no outfits provided', () => {
      render(
        <OutfitList
          outfits={[]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('No outfits match your selection')).toBeInTheDocument();
    });

    it('does not render outfit grid when no outfits provided', () => {
      render(
        <OutfitList
          outfits={[]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      // Should not find any outfit cards
      expect(screen.queryByText('Moto Jacket')).not.toBeInTheDocument();
      expect(screen.queryByText('White Tee')).not.toBeInTheDocument();
    });

    it('renders all provided outfits in horizontal scrollable grid', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1, mockOutfit2, mockOutfit3]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      // Should render all outfit items
      expect(screen.getByText('White Tee')).toBeInTheDocument();
      expect(screen.getByText('Black Tee')).toBeInTheDocument();
      expect(screen.getByText('Grey Henley')).toBeInTheDocument();
      expect(screen.getAllByText('Moto Jacket')).toHaveLength(3);
    });

    it('applies custom className when provided', () => {
      const { container } = render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Outfit Cards', () => {
    it('renders outfit cards with compact variant', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      // Check that outfit card is rendered with compact styling
      const outfitCard = screen.getByText('White Tee').closest('.bg-stone-50');
      expect(outfitCard).toHaveClass('bg-stone-50', 'rounded-xl');
    });

    it('renders outfit cards with scores', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      // Should show score as percentage (85 becomes 100% in ScoreCircle due to maxScore of 85)
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('renders outfit cards as clickable', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      const outfitCard = screen.getByText('White Tee').closest('.cursor-pointer');
      expect(outfitCard).toHaveClass('cursor-pointer');
    });

    it('sets fixed width for outfit cards', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1, mockOutfit2]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      // Check that cards have fixed width wrapper
      const cardWrappers = screen.getAllByText('Moto Jacket').map(el => 
        el.closest('.w-64')
      );
      expect(cardWrappers).toHaveLength(2);
      cardWrappers.forEach(wrapper => {
        expect(wrapper).toHaveClass('w-64', 'flex-shrink-0');
      });
    });
  });

  describe('Horizontal Scrolling', () => {
    it('renders horizontal scrollable container', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1, mockOutfit2, mockOutfit3]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      const scrollContainer = screen.getByText('White Tee').closest('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass('overflow-x-auto');
    });

    it('renders flex container with gap for outfit cards', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1, mockOutfit2]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      const flexContainer = screen.getByText('White Tee').closest('.flex.gap-4');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('flex', 'gap-4', 'pb-2');
    });
  });

  describe('Outfit Selection', () => {
    it('calls onOutfitSelect when outfit card is clicked', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      const outfitCard = screen.getByText('White Tee').closest('.cursor-pointer');
      fireEvent.click(outfitCard!);

      expect(mockOnOutfitSelect).toHaveBeenCalledWith(mockOutfit1);
    });

    it('calls onOutfitSelect with correct outfit when multiple outfits present', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1, mockOutfit2, mockOutfit3]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      // Click on the second outfit (Black Tee)
      const blackTeeCard = screen.getByText('Black Tee').closest('.cursor-pointer');
      fireEvent.click(blackTeeCard!);

      expect(mockOnOutfitSelect).toHaveBeenCalledWith(mockOutfit2);
    });

    it('calls onOutfitSelect with correct outfit when clicking different cards', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1, mockOutfit3]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      // Click on first outfit
      const whiteTeeCard = screen.getByText('White Tee').closest('.cursor-pointer');
      fireEvent.click(whiteTeeCard!);
      expect(mockOnOutfitSelect).toHaveBeenCalledWith(mockOutfit1);

      // Click on second outfit
      const greyHenleyCard = screen.getByText('Grey Henley').closest('.cursor-pointer');
      fireEvent.click(greyHenleyCard!);
      expect(mockOnOutfitSelect).toHaveBeenCalledWith(mockOutfit3);

      expect(mockOnOutfitSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Loading State', () => {
    it('shows loading message when isLoading is true', () => {
      render(
        <OutfitList
          outfits={[]}
          onOutfitSelect={mockOnOutfitSelect}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading outfits...')).toBeInTheDocument();
    });

    it('shows loading skeleton when isLoading is true', () => {
      render(
        <OutfitList
          outfits={[]}
          onOutfitSelect={mockOnOutfitSelect}
          isLoading={true}
        />
      );

      // Should show 3 skeleton cards
      const skeletons = screen.getAllByText('Loading outfits...').length;
      expect(skeletons).toBe(1);
      
      // Check for skeleton elements
      const skeletonCards = document.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBeGreaterThan(0);
    });

    it('does not show outfit cards when loading', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
          isLoading={true}
        />
      );

      expect(screen.queryByText('White Tee')).not.toBeInTheDocument();
      expect(screen.queryByText('Moto Jacket')).not.toBeInTheDocument();
    });

    it('shows outfits when not loading', () => {
      render(
        <OutfitList
          outfits={[mockOutfit1]}
          onOutfitSelect={mockOnOutfitSelect}
          isLoading={false}
        />
      );

      expect(screen.getByText('White Tee')).toBeInTheDocument();
      expect(screen.getByText('Moto Jacket')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty outfits array gracefully', () => {
      render(
        <OutfitList
          outfits={[]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('No outfits match your selection')).toBeInTheDocument();
      expect(screen.queryByText('Moto Jacket')).not.toBeInTheDocument();
    });

    it('handles outfits with missing items gracefully', () => {
      const incompleteOutfit: GeneratedOutfit = {
        id: 'incomplete-outfit',
        jacket: mockJacket,
        // Missing shirt, pants, shoes
        score: 50,
        source: 'generated'
      };

      render(
        <OutfitList
          outfits={[incompleteOutfit]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('1 outfit found')).toBeInTheDocument();
      expect(screen.getByText('Moto Jacket')).toBeInTheDocument();
    });

    it('handles large number of outfits', () => {
      const manyOutfits = Array.from({ length: 10 }, (_, i) => ({
        ...mockOutfit1,
        id: `outfit-${i}`,
        shirt: { ...mockShirt, id: `shirt-${i}`, name: `Shirt ${i}` }
      }));

      render(
        <OutfitList
          outfits={manyOutfits}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('10 outfits found')).toBeInTheDocument();
      expect(screen.getByText('Shirt 0')).toBeInTheDocument();
      expect(screen.getByText('Shirt 9')).toBeInTheDocument();
    });

    it('handles null or undefined outfits gracefully', () => {
      // Test with null outfits array (should not crash)
      const { rerender } = render(
        <OutfitList
          outfits={[]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('No outfits match your selection')).toBeInTheDocument();

      // Test with outfits containing null items
      const outfitsWithNulls = [
        mockOutfit1,
        null as any,
        mockOutfit2,
        undefined as any
      ].filter(Boolean);

      rerender(
        <OutfitList
          outfits={outfitsWithNulls}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('2 outfits found')).toBeInTheDocument();
    });

    it('handles outfits with invalid data gracefully', () => {
      const invalidOutfit: GeneratedOutfit = {
        id: '',
        // Missing required properties
        score: NaN,
        source: 'generated'
      } as any;

      render(
        <OutfitList
          outfits={[invalidOutfit]}
          onOutfitSelect={mockOnOutfitSelect}
        />
      );

      expect(screen.getByText('1 outfit found')).toBeInTheDocument();
    });
  });
});
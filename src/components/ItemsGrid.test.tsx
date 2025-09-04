import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ItemsGrid } from './ItemsGrid';
import { WardrobeItem, Category } from '../types';

const mockItems: WardrobeItem[] = [
  {
    id: '1',
    name: 'Blue Denim Jacket',
    category: 'Jacket/Overshirt',
    capsuleTags: ['Refined', 'Crossover']
  },
  {
    id: '2',
    name: 'White Cotton Shirt',
    category: 'Shirt',
    capsuleTags: ['Adventurer']
  },
  {
    id: '3',
    name: 'Black Chinos',
    category: 'Pants',
    capsuleTags: ['Refined']
  }
];

describe('ItemsGrid', () => {
  const defaultProps = {
    category: 'Jacket/Overshirt' as Category,
    items: mockItems,
    onItemSelect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Direct Click Interactions', () => {
    it('should call onItemSelect when item is clicked directly', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      expect(firstItem).toBeInTheDocument();
      
      fireEvent.click(firstItem!);
      
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith(mockItems[0]);
      expect(defaultProps.onItemSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onItemSelect when Enter key is pressed on item', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      expect(firstItem).toBeInTheDocument();
      
      fireEvent.keyDown(firstItem!, { key: 'Enter' });
      
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith(mockItems[0]);
      expect(defaultProps.onItemSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onItemSelect when Space key is pressed on item', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      expect(firstItem).toBeInTheDocument();
      
      fireEvent.keyDown(firstItem!, { key: ' ' });
      
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith(mockItems[0]);
      expect(defaultProps.onItemSelect).toHaveBeenCalledTimes(1);
    });

    it('should not call onItemSelect for other keys', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      expect(firstItem).toBeInTheDocument();
      
      fireEvent.keyDown(firstItem!, { key: 'Tab' });
      
      expect(defaultProps.onItemSelect).not.toHaveBeenCalled();
    });
  });

  describe('Hover State and Cursor', () => {
    it('should have pointer cursor class on clickable items', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      expect(firstItem).toHaveClass('cursor-pointer');
    });

    it('should have hover state classes on items', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      expect(firstItem).toHaveClass('hover:border-slate-300', 'hover:shadow-md');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for clickable items', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByLabelText('Select Blue Denim Jacket for outfit building');
      expect(firstItem).toBeInTheDocument();
      expect(firstItem).toHaveAttribute('role', 'button');
      expect(firstItem).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper ARIA labels for all items', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      mockItems.forEach(item => {
        const itemElement = screen.getByLabelText(`Select ${item.name} for outfit building`);
        expect(itemElement).toBeInTheDocument();
        expect(itemElement).toHaveAttribute('role', 'button');
        expect(itemElement).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Selected Item State', () => {
    it('should highlight selected item with different styling', () => {
      const selectedItem = mockItems[0];
      render(<ItemsGrid {...defaultProps} selectedItem={selectedItem} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      expect(firstItem).toHaveClass('border-slate-800', 'bg-slate-50', 'shadow-sm');
    });

    it('should not highlight non-selected items', () => {
      const selectedItem = mockItems[0];
      render(<ItemsGrid {...defaultProps} selectedItem={selectedItem} />);
      
      const secondItem = screen.getByText('White Cotton Shirt').closest('div[role="button"]');
      expect(secondItem).toHaveClass('border-stone-200', 'bg-white');
      expect(secondItem).not.toHaveClass('border-slate-800', 'bg-slate-50');
    });
  });

  describe('Multiple Item Interactions', () => {
    it('should handle clicks on different items correctly', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      const firstItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      const secondItem = screen.getByText('White Cotton Shirt').closest('div[role="button"]');
      
      fireEvent.click(firstItem!);
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith(mockItems[0]);
      
      fireEvent.click(secondItem!);
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith(mockItems[1]);
      
      expect(defaultProps.onItemSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Direct Click Interaction Verification', () => {
    it('should only have direct click interaction on item containers', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      // Get all buttons in the component
      const allButtons = screen.getAllByRole('button');
      
      // Filter out the tag filter buttons and search-related buttons
      const itemButtons = allButtons.filter(button => {
        const buttonText = button.textContent?.toLowerCase() || '';
        return !['refined', 'adventurer', 'crossover', 'shorts'].includes(buttonText) &&
               !buttonText.includes('search');
      });
      
      // Each item should be a single clickable button (the container itself)
      expect(itemButtons).toHaveLength(mockItems.length);
      
      // Verify each button has the correct aria-label for item selection
      itemButtons.forEach((button, index) => {
        expect(button).toHaveAttribute('aria-label', `Select ${mockItems[index].name} for outfit building`);
      });
    });
  });

  describe('Filtered Items Interaction', () => {
    it('should maintain click functionality on filtered items', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      // Filter by search term
      const searchInput = screen.getByPlaceholderText('Search items...');
      fireEvent.change(searchInput, { target: { value: 'Blue' } });
      
      // Only the Blue Denim Jacket should be visible
      expect(screen.getByText('Blue Denim Jacket')).toBeInTheDocument();
      expect(screen.queryByText('White Cotton Shirt')).not.toBeInTheDocument();
      
      // Click on the filtered item
      const filteredItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      fireEvent.click(filteredItem!);
      
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should maintain click functionality on tag-filtered items', () => {
      render(<ItemsGrid {...defaultProps} />);
      
      // Filter by tag - get the button specifically, not the span tags
      const refinedTagButton = screen.getByRole('button', { name: 'Refined' });
      fireEvent.click(refinedTagButton);
      
      // Only items with 'Refined' tag should be clickable
      const refinedItem = screen.getByText('Blue Denim Jacket').closest('div[role="button"]');
      fireEvent.click(refinedItem!);
      
      expect(defaultProps.onItemSelect).toHaveBeenCalledWith(mockItems[0]);
    });
  });
});
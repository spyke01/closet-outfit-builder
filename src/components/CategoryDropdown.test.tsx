import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryDropdown } from './CategoryDropdown';
import { WardrobeItem, Category } from '../types';

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

const mockBlackShirt: WardrobeItem = {
  id: 'black-tee',
  name: 'Black Tee',
  category: 'Shirt',
  capsuleTags: ['Crossover', 'Adventurer'],
  formalityScore: 2
};

const mockAvailableItems: WardrobeItem[] = [mockShirt, mockBlackShirt];

describe('CategoryDropdown', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe('Rendering', () => {
    it('renders with "Select One" when no item is selected', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Select One')).toBeInTheDocument();
    });

    it('renders selected item name when item is selected', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={mockShirt}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('White Tee')).toBeInTheDocument();
    });

    it('displays "jacket" for "Jacket/Overshirt" category', () => {
      render(
        <CategoryDropdown
          category="Jacket/Overshirt"
          selectedItem={mockJacket}
          availableItems={[mockJacket]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Moto Jacket')).toBeInTheDocument();
    });

    it('shows "No compatible items" when availableItems is empty', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('No compatible items')).toBeInTheDocument();
    });

    it('renders color indicator for selected item', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={mockShirt}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      const colorIndicator = screen.getByText('White Tee').previousElementSibling;
      expect(colorIndicator).toHaveStyle('background-color: rgb(255, 255, 255)'); // white
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown when trigger is clicked', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('White Tee')).toBeInTheDocument();
        expect(screen.getByText('Black Tee')).toBeInTheDocument();
      });
    });

    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <CategoryDropdown
            category="Shirt"
            selectedItem={null}
            availableItems={mockAvailableItems}
            onSelect={mockOnSelect}
          />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('White Tee')).toBeInTheDocument();
      });

      // Click outside
      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);

      await waitFor(() => {
        expect(screen.queryByText('White Tee')).not.toBeInTheDocument();
      });
    });

    it('shows chevron rotation when dropdown is open', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      const trigger = screen.getByRole('button');
      const chevron = trigger.querySelector('svg');

      expect(chevron).not.toHaveClass('rotate-180');

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(chevron).toHaveClass('rotate-180');
      });
    });
  });

  describe('Item Selection', () => {
    it('calls onSelect with selected item when item is clicked', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('White Tee')).toBeInTheDocument();
      });

      // Click on White Tee
      const whiteTeeButto = screen.getByText('White Tee');
      fireEvent.click(whiteTeeButto);

      expect(mockOnSelect).toHaveBeenCalledWith(mockShirt);
    });

    it('calls onSelect with null when "Select One" is clicked', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={mockShirt}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Select One')).toBeInTheDocument();
      });

      // Click on "Select One"
      const selectOneButton = screen.getByText('Select One');
      fireEvent.click(selectOneButton);

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });

    it('closes dropdown after item selection', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('White Tee')).toBeInTheDocument();
      });

      // Click on White Tee
      const whiteTeeButton = screen.getByText('White Tee');
      fireEvent.click(whiteTeeButton);

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('Black Tee')).not.toBeInTheDocument();
      });
    });

    it('highlights selected item in dropdown', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={mockShirt}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        // Get all buttons with "White Tee" text and find the one in the dropdown (not the trigger)
        const allWhiteTeeElements = screen.getAllByText('White Tee');
        const dropdownWhiteTeeElement = allWhiteTeeElements.find(el => 
          el.closest('button')?.className.includes('bg-blue-50')
        );
        const whiteTeeButton = dropdownWhiteTeeElement?.closest('button');
        expect(whiteTeeButton).toHaveClass('bg-blue-50', 'text-blue-800');
      });
    });
  });

  describe('Disabled State', () => {
    it('does not open dropdown when disabled', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
      
      fireEvent.click(trigger);

      // Dropdown should not open
      expect(screen.queryByText('White Tee')).not.toBeInTheDocument();
    });

    it('applies disabled styling when disabled', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('opacity-50', 'cursor-not-allowed', 'bg-stone-50');
    });
  });

  describe('Loading State', () => {
    it('shows loading text when isLoading is true', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not open dropdown when loading', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
          isLoading={true}
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
      
      fireEvent.click(trigger);

      // Dropdown should not open
      expect(screen.queryByText('White Tee')).not.toBeInTheDocument();
    });

    it('applies loading styling when loading', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
          isLoading={true}
        />
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('opacity-50', 'cursor-not-allowed', 'bg-stone-50');
    });

    it('does not show dropdown content when loading', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
          isLoading={true}
        />
      );

      // Try to open dropdown (should not work due to loading)
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      // Wait and verify dropdown content is not shown
      await waitFor(() => {
        expect(screen.queryByText('White Tee')).not.toBeInTheDocument();
        expect(screen.queryByText('Black Tee')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows "No compatible items" message when no items available', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[]}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        // Get the specific "No compatible items" message in the dropdown (not the trigger)
        const dropdownMessage = screen.getAllByText('No compatible items').find(el => 
          el.className.includes('italic')
        );
        expect(dropdownMessage).toBeInTheDocument();
      });
    });

    it('does not show "Select One" option when no items available', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={mockShirt}
          availableItems={[]}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        // Look for "Select One" button specifically in the dropdown area
        const selectOneButtons = screen.queryAllByText('Select One');
        const dropdownSelectOneButton = selectOneButtons.find(el => 
          el.closest('button')?.className.includes('border-b')
        );
        expect(dropdownSelectOneButton).toBeUndefined();
      });
    });
  });

  describe('Color Indicators', () => {
    it('renders color indicators for items in dropdown', async () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={mockAvailableItems}
          onSelect={mockOnSelect}
        />
      );

      // Open dropdown
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);

      await waitFor(() => {
        const whiteTeeButton = screen.getByText('White Tee').closest('button');
        const blackTeeButton = screen.getByText('Black Tee').closest('button');
        
        const whiteColorIndicator = whiteTeeButton?.querySelector('div[style*="background-color"]');
        const blackColorIndicator = blackTeeButton?.querySelector('div[style*="background-color"]');
        
        expect(whiteColorIndicator).toHaveStyle('background-color: rgb(255, 255, 255)');
        expect(blackColorIndicator).toHaveStyle('background-color: rgb(0, 0, 0)');
      });
    });
  });
});
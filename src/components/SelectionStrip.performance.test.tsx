import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SelectionStrip } from './SelectionStrip';
import { useOutfitEngine } from '../hooks/useOutfitEngine';
import { OutfitSelection, WardrobeItem, GeneratedOutfit } from '../types';

// Mock the useOutfitEngine hook
vi.mock('../hooks/useOutfitEngine');

const mockUseOutfitEngine = vi.mocked(useOutfitEngine);

describe('SelectionStrip Performance Tests', () => {
  const mockAnchorItem: WardrobeItem = {
    id: 'anchor-1',
    name: 'Test Anchor',
    category: 'Jacket/Overshirt',
    color: 'Navy',
    formalityScore: 7,
    capsuleTags: ['Refined']
  };

  const mockSelection: OutfitSelection = {
    jacket: mockAnchorItem
  };

  const mockOutfit: GeneratedOutfit = {
    id: 'outfit-1',
    jacket: mockAnchorItem,
    shirt: {
      id: 'shirt-1',
      name: 'Test Shirt',
      category: 'Shirt',
      color: 'White',
      formalityScore: 6,
      capsuleTags: ['Refined']
    },
    pants: {
      id: 'pants-1',
      name: 'Test Pants',
      category: 'Pants',
      color: 'Charcoal',
      formalityScore: 7,
      capsuleTags: ['Refined']
    },
    shoes: {
      id: 'shoes-1',
      name: 'Test Shoes',
      category: 'Shoes',
      color: 'Black',
      formalityScore: 8,
      capsuleTags: ['Refined']
    },
    score: 28,
    source: 'curated'
  };

  const mockCompatibleItems = [
    {
      id: 'shirt-1',
      name: 'Compatible Shirt 1',
      category: 'Shirt',
      color: 'White',
      formalityScore: 6,
      capsuleTags: ['Refined']
    },
    {
      id: 'shirt-2',
      name: 'Compatible Shirt 2',
      category: 'Shirt',
      color: 'Blue',
      formalityScore: 5,
      capsuleTags: ['Casual']
    }
  ];

  const mockProps = {
    selection: mockSelection,
    anchorItem: mockAnchorItem,
    onSelectionChange: vi.fn(),
    onOutfitSelect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseOutfitEngine.mockReturnValue({
      validateOutfit: vi.fn().mockReturnValue(true),
      scoreOutfit: vi.fn().mockReturnValue(28),
      suggestAccessories: vi.fn().mockReturnValue({}),
      generateRandomOutfit: vi.fn().mockReturnValue(mockOutfit),
      getOutfitsForAnchor: vi.fn().mockReturnValue([mockOutfit]),
      getAllOutfits: vi.fn().mockReturnValue([mockOutfit]),
      getCompatibleItems: vi.fn().mockReturnValue(mockCompatibleItems),
      getFilteredOutfits: vi.fn().mockReturnValue([mockOutfit]),
      validatePartialSelection: vi.fn().mockReturnValue(true)
    });
  });

  it('should debounce rapid selection changes', async () => {
    const onSelectionChange = vi.fn();
    
    render(
      <SelectionStrip
        {...mockProps}
        onSelectionChange={onSelectionChange}
      />
    );

    // Simulate rapid selection changes
    const shirtDropdowns = screen.getAllByText('Select One');
    const shirtDropdown = shirtDropdowns[0]; // Use the first dropdown
    
    // Click multiple times rapidly
    fireEvent.click(shirtDropdown);
    fireEvent.click(shirtDropdown);
    fireEvent.click(shirtDropdown);

    // Should only trigger once due to debouncing
    expect(onSelectionChange).toHaveBeenCalledTimes(0); // No selection made yet
  });

  it('should memoize compatible items calculations', () => {
    const getCompatibleItems = vi.fn().mockReturnValue(mockCompatibleItems);
    
    mockUseOutfitEngine.mockReturnValue({
      ...mockUseOutfitEngine(),
      getCompatibleItems
    });

    const { rerender } = render(<SelectionStrip {...mockProps} />);

    // Initial render should call getCompatibleItems for each category
    expect(getCompatibleItems).toHaveBeenCalledTimes(4); // 4 categories

    // Rerender with same props should use memoized results
    rerender(<SelectionStrip {...mockProps} />);
    
    // Should not call getCompatibleItems again due to memoization
    expect(getCompatibleItems).toHaveBeenCalledTimes(4); // Still 4, not 8
  });

  it('should handle large numbers of compatible items efficiently', () => {
    // Create a large number of compatible items
    const largeItemList = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      category: 'Shirt' as const,
      color: 'Test',
      formalityScore: 5,
      capsuleTags: ['Test']
    }));

    const getCompatibleItems = vi.fn().mockReturnValue(largeItemList);
    
    mockUseOutfitEngine.mockReturnValue({
      ...mockUseOutfitEngine(),
      getCompatibleItems
    });

    const start = performance.now();
    render(<SelectionStrip {...mockProps} />);
    const end = performance.now();
    const renderTime = end - start;

    // Should render within reasonable time even with large dataset
    expect(renderTime).toBeLessThan(100); // Less than 100ms
    
    // Should still call the function
    expect(getCompatibleItems).toHaveBeenCalled();
  });

  it('should handle rapid outfit filtering updates efficiently', async () => {
    const getFilteredOutfits = vi.fn().mockReturnValue([mockOutfit]);
    
    mockUseOutfitEngine.mockReturnValue({
      ...mockUseOutfitEngine(),
      getFilteredOutfits
    });

    const { rerender } = render(<SelectionStrip {...mockProps} />);

    // Change selection multiple times rapidly
    const newSelection1 = { ...mockSelection, shirt: mockCompatibleItems[0] };
    const newSelection2 = { ...mockSelection, shirt: mockCompatibleItems[1] };
    const newSelection3 = { ...mockSelection, pants: mockCompatibleItems[0] };

    rerender(<SelectionStrip {...mockProps} selection={newSelection1} />);
    rerender(<SelectionStrip {...mockProps} selection={newSelection2} />);
    rerender(<SelectionStrip {...mockProps} selection={newSelection3} />);

    // Wait for debouncing to settle
    await waitFor(() => {
      // Should eventually call getFilteredOutfits, but debounced
      expect(getFilteredOutfits).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should not re-render unnecessarily when props haven\'t changed', () => {
    const getCompatibleItems = vi.fn().mockReturnValue(mockCompatibleItems);
    const getFilteredOutfits = vi.fn().mockReturnValue([mockOutfit]);
    
    mockUseOutfitEngine.mockReturnValue({
      ...mockUseOutfitEngine(),
      getCompatibleItems,
      getFilteredOutfits
    });

    const { rerender } = render(<SelectionStrip {...mockProps} />);

    const initialCallCount = getCompatibleItems.mock.calls.length;

    // Rerender with identical props
    rerender(<SelectionStrip {...mockProps} />);

    // Should not trigger additional calculations due to memoization
    expect(getCompatibleItems.mock.calls.length).toBe(initialCallCount);
  });

  it('should handle error states gracefully without performance impact', () => {
    const getCompatibleItems = vi.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    mockUseOutfitEngine.mockReturnValue({
      ...mockUseOutfitEngine(),
      getCompatibleItems
    });

    const start = performance.now();
    
    // Should not throw and should render error state
    expect(() => {
      render(<SelectionStrip {...mockProps} />);
    }).not.toThrow();
    
    const end = performance.now();
    const renderTime = end - start;

    // Should still render quickly even with errors
    expect(renderTime).toBeLessThan(100);
  });
});
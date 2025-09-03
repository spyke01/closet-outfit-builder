import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SelectionStrip } from './SelectionStrip';
import { OutfitSelection, WardrobeItem, GeneratedOutfit } from '../types';
import { vi } from 'vitest';

// Mock the useOutfitEngine hook
const mockGetCompatibleItems = vi.fn();
const mockGetFilteredOutfits = vi.fn();
const mockValidatePartialSelection = vi.fn();

vi.mock('../hooks/useOutfitEngine', () => ({
  useOutfitEngine: () => ({
    getCompatibleItems: mockGetCompatibleItems,
    getFilteredOutfits: mockGetFilteredOutfits,
    validatePartialSelection: mockValidatePartialSelection
  })
}));

// Mock the CategoryDropdown component
vi.mock('./CategoryDropdown', () => ({
  CategoryDropdown: ({ category, selectedItem, availableItems, onSelect }: any) => (
    <div data-testid={`dropdown-${category.toLowerCase().replace('/', '-')}`}>
      <button data-testid={`trigger-${category.toLowerCase().replace('/', '-')}`}>
        {selectedItem ? selectedItem.name : 'Select One'}
      </button>
      <div data-testid={`options-${category.toLowerCase().replace('/', '-')}`}>
        {availableItems.map((item: WardrobeItem) => (
          <button
            key={item.id}
            data-testid={`option-${item.id}`}
            onClick={() => onSelect(item)}
          >
            {item.name}
          </button>
        ))}
        <button
          data-testid={`clear-${category.toLowerCase().replace('/', '-')}`}
          onClick={() => onSelect(null)}
        >
          Select One
        </button>
      </div>
    </div>
  )
}));

// Mock the OutfitList component
vi.mock('./OutfitList', () => ({
  OutfitList: ({ outfits, onOutfitSelect }: any) => (
    <div data-testid="outfit-list">
      {outfits.map((outfit: GeneratedOutfit) => (
        <button
          key={outfit.id}
          data-testid={`outfit-${outfit.id}`}
          onClick={() => onOutfitSelect(outfit)}
        >
          Outfit {outfit.id}
        </button>
      ))}
    </div>
  )
}));

describe('SelectionStrip Progressive Filtering', () => {
  const mockAnchorItem: WardrobeItem = {
    id: 'moto-jacket',
    name: 'Moto Jacket',
    category: 'Jacket/Overshirt'
  };

  const mockItems = {
    jacket: { id: 'moto-jacket', name: 'Moto Jacket', category: 'Jacket/Overshirt' as const },
    shirt: { id: 'cream-tee', name: 'Cream Tee', category: 'Shirt' as const },
    pants: { id: 'dark-denim', name: 'Dark Denim', category: 'Pants' as const },
    shoes: { id: 'apache-boots', name: 'Apache Boots', category: 'Shoes' as const }
  };

  const mockOutfits: GeneratedOutfit[] = [
    {
      id: 'outfit-1',
      jacket: mockItems.jacket,
      shirt: mockItems.shirt,
      pants: mockItems.pants,
      shoes: mockItems.shoes,
      score: 85,
      source: 'curated'
    }
  ];

  const defaultProps = {
    selection: {} as OutfitSelection,
    anchorItem: mockAnchorItem,
    onSelectionChange: vi.fn(),
    onOutfitSelect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockGetCompatibleItems.mockImplementation((category: string) => {
      // Return different items based on category for testing
      switch (category) {
        case 'Jacket/Overshirt': return [mockItems.jacket];
        case 'Shirt': return [mockItems.shirt];
        case 'Pants': return [mockItems.pants];
        case 'Shoes': return [mockItems.shoes];
        default: return [];
      }
    });
    mockGetFilteredOutfits.mockReturnValue(mockOutfits);
    mockValidatePartialSelection.mockReturnValue(true);
  });

  it('should not render when anchor item is null', () => {
    render(<SelectionStrip {...defaultProps} anchorItem={null} />);
    expect(screen.queryByTestId('dropdown-jacket-overshirt')).not.toBeInTheDocument();
  });

  it('should render all four category dropdowns when anchor item is present', () => {
    render(<SelectionStrip {...defaultProps} />);
    
    expect(screen.getByTestId('dropdown-jacket-overshirt')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-shirt')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-pants')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-shoes')).toBeInTheDocument();
  });

  it('should call getCompatibleItems for each category with current selection', () => {
    mockGetCompatibleItems.mockReturnValue([]);

    const selection = { jacket: mockItems.jacket };
    render(<SelectionStrip {...defaultProps} selection={selection} />);

    expect(mockGetCompatibleItems).toHaveBeenCalledWith('Jacket/Overshirt', selection);
    expect(mockGetCompatibleItems).toHaveBeenCalledWith('Shirt', selection);
    expect(mockGetCompatibleItems).toHaveBeenCalledWith('Pants', selection);
    expect(mockGetCompatibleItems).toHaveBeenCalledWith('Shoes', selection);
  });

  it('should validate selection before applying changes', async () => {
    const mockOnSelectionChange = vi.fn();
    mockGetCompatibleItems.mockImplementation((category: string) => {
      if (category === 'Shirt') return [mockItems.shirt];
      return [];
    });
    mockGetFilteredOutfits.mockReturnValue([]);
    mockValidatePartialSelection.mockReturnValue(true);

    render(
      <SelectionStrip 
        {...defaultProps} 
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Find the shirt option within the shirt dropdown specifically
    const shirtDropdown = screen.getByTestId('dropdown-shirt');
    const shirtOption = shirtDropdown.querySelector(`[data-testid="option-${mockItems.shirt.id}"]`) as HTMLElement;
    fireEvent.click(shirtOption);

    expect(mockValidatePartialSelection).toHaveBeenCalledWith({
      shirt: mockItems.shirt
    });
    expect(mockOnSelectionChange).toHaveBeenCalledWith('Shirt', mockItems.shirt);
  });

  it('should not apply selection change if validation fails', async () => {
    const mockOnSelectionChange = vi.fn();
    mockGetCompatibleItems.mockImplementation((category: string) => {
      if (category === 'Shirt') return [mockItems.shirt];
      return [];
    });
    mockGetFilteredOutfits.mockReturnValue([]);
    mockValidatePartialSelection.mockReturnValue(false);

    render(
      <SelectionStrip 
        {...defaultProps} 
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Find the shirt option within the shirt dropdown specifically
    const shirtDropdown = screen.getByTestId('dropdown-shirt');
    const shirtOption = shirtDropdown.querySelector(`[data-testid="option-${mockItems.shirt.id}"]`) as HTMLElement;
    fireEvent.click(shirtOption);

    expect(mockValidatePartialSelection).toHaveBeenCalled();
    expect(mockOnSelectionChange).not.toHaveBeenCalled();
  });

  it('should handle clearing selections', async () => {
    const mockOnSelectionChange = vi.fn();
    
    render(
      <SelectionStrip 
        {...defaultProps} 
        selection={{ shirt: mockItems.shirt }}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const clearButton = screen.getByTestId('clear-shirt');
    fireEvent.click(clearButton);

    expect(mockOnSelectionChange).toHaveBeenCalledWith('Shirt', null);
  });

  it('should update filtered outfits based on current selection', () => {
    mockGetCompatibleItems.mockReturnValue([]);
    mockGetFilteredOutfits.mockReturnValue(mockOutfits);
    mockValidatePartialSelection.mockReturnValue(true);

    const selection = { jacket: mockItems.jacket, shirt: mockItems.shirt };
    render(<SelectionStrip {...defaultProps} selection={selection} />);

    expect(mockGetFilteredOutfits).toHaveBeenCalledWith(selection);
    expect(screen.getByTestId('outfit-list')).toBeInTheDocument();
  });

  it('should handle outfit selection from list', () => {
    const mockOnOutfitSelect = vi.fn();
    
    render(
      <SelectionStrip 
        {...defaultProps} 
        onOutfitSelect={mockOnOutfitSelect}
      />
    );

    const outfitButton = screen.getByTestId('outfit-outfit-1');
    fireEvent.click(outfitButton);

    expect(mockOnOutfitSelect).toHaveBeenCalledWith(mockOutfits[0]);
  });

  it('should show tuck style when present in selection', () => {
    const selectionWithTuck = { 
      jacket: mockItems.jacket,
      tuck: 'Tucked' as const
    };
    
    render(<SelectionStrip {...defaultProps} selection={selectionWithTuck} />);
    
    expect(screen.getByText('Tuck')).toBeInTheDocument();
    expect(screen.getByText('Tucked')).toBeInTheDocument();
  });

  describe('Progressive Filtering Integration', () => {
    it('should recalculate compatible items when selection changes', () => {
      // First render with empty selection
      mockGetCompatibleItems.mockReturnValue([mockItems.jacket, mockItems.shirt]);
      mockGetFilteredOutfits.mockReturnValue([]);
      mockValidatePartialSelection.mockReturnValue(true);

      const { rerender } = render(<SelectionStrip {...defaultProps} />);

      // Verify initial calls
      expect(mockGetCompatibleItems).toHaveBeenCalledWith('Jacket/Overshirt', {});
      
      // Update selection and rerender
      const newSelection = { jacket: mockItems.jacket };
      rerender(<SelectionStrip {...defaultProps} selection={newSelection} />);

      // Verify calls with new selection
      expect(mockGetCompatibleItems).toHaveBeenCalledWith('Shirt', newSelection);
      expect(mockGetCompatibleItems).toHaveBeenCalledWith('Pants', newSelection);
      expect(mockGetCompatibleItems).toHaveBeenCalledWith('Shoes', newSelection);
    });

    it('should filter outfits progressively as selections are made', () => {
      mockGetCompatibleItems.mockReturnValue([]);
      mockValidatePartialSelection.mockReturnValue(true);

      // Start with empty selection
      mockGetFilteredOutfits.mockReturnValueOnce(mockOutfits);
      const { rerender } = render(<SelectionStrip {...defaultProps} />);
      
      expect(mockGetFilteredOutfits).toHaveBeenCalledWith({});

      // Add jacket selection
      const selectionWithJacket = { jacket: mockItems.jacket };
      mockGetFilteredOutfits.mockReturnValueOnce([mockOutfits[0]]);
      rerender(<SelectionStrip {...defaultProps} selection={selectionWithJacket} />);
      
      expect(mockGetFilteredOutfits).toHaveBeenCalledWith(selectionWithJacket);

      // Add shirt selection
      const selectionWithJacketAndShirt = { 
        jacket: mockItems.jacket, 
        shirt: mockItems.shirt 
      };
      mockGetFilteredOutfits.mockReturnValueOnce([mockOutfits[0]]);
      rerender(<SelectionStrip {...defaultProps} selection={selectionWithJacketAndShirt} />);
      
      expect(mockGetFilteredOutfits).toHaveBeenCalledWith(selectionWithJacketAndShirt);
    });
  });
});
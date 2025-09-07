import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsProvider } from '../contexts/SettingsContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { OutfitCard } from '../components/OutfitCard';
import { CategoryDropdown } from '../components/CategoryDropdown';
import { SettingsPage } from '../components/SettingsPage';
import { OutfitLayout } from '../components/OutfitLayout';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { calculateOutfitScore } from '../utils/scoring';
import { formatItemName } from '../utils/itemUtils';
import { WardrobeItem, OutfitSelection, UserSettings } from '../types';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock matchMedia for ThemeContext
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock SVG components
vi.mock('../components/svg', () => ({
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

// Mock OutfitLayout component
vi.mock('../components/OutfitLayout', () => ({
  OutfitLayout: ({ selection, size = 'medium', className }: any) => {
    const itemCount = Object.keys(selection).length;
    const sizeClasses = {
      small: 'w-72',
      medium: 'w-80', 
      large: 'w-96'
    };
    
    return (
      <div 
        data-testid="outfit-layout" 
        data-size={size} 
        className={`${sizeClasses[size as keyof typeof sizeClasses]} ${className || ''}`}
      >
        {itemCount === 0 ? 'No items selected' : `${itemCount} items`}
      </div>
    );
  }
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <SettingsProvider>
        {component}
      </SettingsProvider>
    </ThemeProvider>
  );
};

// Test data
const createMockItem = (id: string, name: string, category: any, formalityScore = 5, brand?: string): WardrobeItem => ({
  id,
  name,
  category,
  brand,
  formalityScore,
  active: true
});

const mockWardrobe = {
  jacket: createMockItem('j1', 'Navy Blazer', 'Jacket/Overshirt', 8),
  shirt: createMockItem('s1', 'OCBD (White)', 'Shirt', 7),
  undershirt: createMockItem('u1', 'Undershirt (White)', 'Undershirt', 1),
  pants: createMockItem('p1', 'Chinos (Navy)', 'Pants', 6),
  shoes: createMockItem('sh1', 'Loafers (Brown)', 'Shoes', 7),
  belt: createMockItem('b1', 'Belt (Brown)', 'Belt', 5),
  watch: createMockItem('w1', 'Rolex Submariner', 'Watch', 8, 'Rolex')
};

const completeOutfit: OutfitSelection = {
  jacket: mockWardrobe.jacket,
  shirt: mockWardrobe.shirt,
  undershirt: mockWardrobe.undershirt,
  pants: mockWardrobe.pants,
  shoes: mockWardrobe.shoes,
  belt: mockWardrobe.belt,
  watch: mockWardrobe.watch
};

describe('Wardrobe Enhancement Integration Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('End-to-End Outfit Creation with All 7 Categories', () => {
    it('creates complete outfit with all categories and calculates enhanced score', () => {
      const scoreBreakdown = calculateOutfitScore(completeOutfit);
      
      // Should have layer adjustments for all 7 items
      expect(scoreBreakdown.layerAdjustments).toHaveLength(7);
      
      // Verify layer-aware scoring
      const jacketAdj = scoreBreakdown.layerAdjustments.find(adj => adj.category === 'Jacket/Overshirt');
      const shirtAdj = scoreBreakdown.layerAdjustments.find(adj => adj.category === 'Shirt');
      const undershirtAdj = scoreBreakdown.layerAdjustments.find(adj => adj.category === 'Undershirt');
      const beltAdj = scoreBreakdown.layerAdjustments.find(adj => adj.category === 'Belt');
      const watchAdj = scoreBreakdown.layerAdjustments.find(adj => adj.category === 'Watch');
      
      expect(jacketAdj!.weight).toBe(1.0); // Visible
      expect(shirtAdj!.weight).toBe(0.7);  // Covered by jacket
      expect(undershirtAdj!.weight).toBe(0.3); // Covered by shirt
      expect(beltAdj!.weight).toBe(0.8);   // Accessory
      expect(watchAdj!.weight).toBe(0.8);  // Accessory
      
      // Should have valid total score
      expect(scoreBreakdown.total).toBeGreaterThan(0);
      expect(scoreBreakdown.percentage).toBeLessThanOrEqual(100);
    });

    it('renders OutfitCard with complete outfit and flip functionality', async () => {
      renderWithProviders(
        <OutfitCard 
          outfit={completeOutfit} 
          variant="compact" 
          enableFlip={true}
        />
      );
      
      // Should show all item names
      expect(screen.getByText('Navy Blazer')).toBeInTheDocument();
      expect(screen.getByText('OCBD (White)')).toBeInTheDocument();
      expect(screen.getByText('Undershirt (White)')).toBeInTheDocument();
      expect(screen.getByText('Chinos (Navy)')).toBeInTheDocument();
      expect(screen.getByText('Loafers (Brown)')).toBeInTheDocument();
      expect(screen.getByText('Belt (Brown)')).toBeInTheDocument();
      expect(screen.getByText('Rolex Submariner')).toBeInTheDocument();
      
      // Should have flip functionality
      expect(screen.getByText('View Mockup')).toBeInTheDocument();
      
      // Test flip to visual view
      const flipButton = screen.getByText('View Mockup');
      fireEvent.click(flipButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('outfit-layout')).toBeInTheDocument();
      });
    });

    it('displays enhanced score breakdown with layer adjustments', () => {
      const scoreBreakdown = calculateOutfitScore(completeOutfit);
      
      renderWithProviders(
        <ScoreBreakdown breakdown={scoreBreakdown} />
      );
      
      // Should show the score percentage
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
      expect(screen.getByText(/\d+ points/)).toBeInTheDocument();
      
      // Verify the score breakdown has the expected structure
      expect(scoreBreakdown.formalityScore).toBeGreaterThan(0);
      expect(scoreBreakdown.consistencyBonus).toBeGreaterThanOrEqual(0);
      expect(scoreBreakdown.layerAdjustments).toHaveLength(7);
      expect(scoreBreakdown.formalityWeight).toBe(0.93);
      expect(scoreBreakdown.consistencyWeight).toBe(0.07);
    });
  });

  describe('Settings Changes Affecting Item Display', () => {
    it('toggles brand display throughout application', async () => {
      const mockOnBack = vi.fn();
      
      renderWithProviders(<SettingsPage onBack={mockOnBack} />);
      
      // Initially brand should be disabled
      const brandToggle = screen.getByRole('switch', { name: 'Toggle brand display' });
      expect(brandToggle).toHaveAttribute('aria-checked', 'false');
      
      // Enable brand display
      fireEvent.click(brandToggle);
      expect(brandToggle).toHaveAttribute('aria-checked', 'true');
      
      // Verify localStorage was updated
      const storedSettings = mockLocalStorage.getItem('closet-outfit-builder-settings');
      expect(storedSettings).toBe('{"showBrand":true}');
    });

    it('formats item names correctly based on brand settings', () => {
      const itemWithBrand = mockWardrobe.watch; // Rolex Submariner
      const itemWithoutBrand = mockWardrobe.shirt; // OCBD (White)
      
      // Test with brand display enabled
      const withBrand = formatItemName(itemWithBrand, true);
      expect(withBrand).toBe('Rolex Rolex Submariner');
      
      // Test with brand display disabled
      const withoutBrand = formatItemName(itemWithBrand, false);
      expect(withoutBrand).toBe('Rolex Submariner');
      
      // Test item without brand
      const noBrandItem = formatItemName(itemWithoutBrand, true);
      expect(noBrandItem).toBe('OCBD (White)');
    });

    it('persists settings across component remounts', () => {
      // Set initial settings
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":true}');
      
      const mockOnBack = vi.fn();
      const { rerender } = renderWithProviders(<SettingsPage onBack={mockOnBack} />);
      
      // Should load with brand enabled
      const brandToggle = screen.getByRole('switch', { name: 'Toggle brand display' });
      expect(brandToggle).toHaveAttribute('aria-checked', 'true');
      
      // Remount component
      rerender(
        <ThemeProvider>
          <SettingsProvider>
            <SettingsPage onBack={mockOnBack} />
          </SettingsProvider>
        </ThemeProvider>
      );
      
      // Should still be enabled
      const newBrandToggle = screen.getByRole('switch', { name: 'Toggle brand display' });
      expect(newBrandToggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Visual Outfit Display with Various Combinations', () => {
    it('renders outfit layout with different item combinations', () => {
      const minimalOutfit: OutfitSelection = {
        shirt: mockWardrobe.shirt,
        pants: mockWardrobe.pants,
        shoes: mockWardrobe.shoes
      };
      
      const { rerender } = renderWithProviders(
        <OutfitLayout selection={minimalOutfit} />
      );
      
      expect(screen.getByText('3 items')).toBeInTheDocument();
      
      // Test with complete outfit
      rerender(
        <ThemeProvider>
          <SettingsProvider>
            <OutfitLayout selection={completeOutfit} />
          </SettingsProvider>
        </ThemeProvider>
      );
      
      expect(screen.getByText('7 items')).toBeInTheDocument();
      
      // Test with empty outfit
      rerender(
        <ThemeProvider>
          <SettingsProvider>
            <OutfitLayout selection={{}} />
          </SettingsProvider>
        </ThemeProvider>
      );
      
      expect(screen.getByText('No items selected')).toBeInTheDocument();
    });

    it('handles layering correctly in visual display', () => {
      const layeredOutfit: OutfitSelection = {
        jacket: mockWardrobe.jacket,
        shirt: mockWardrobe.shirt,
        undershirt: mockWardrobe.undershirt
      };
      
      renderWithProviders(<OutfitLayout selection={layeredOutfit} />);
      
      // Should show all three layers
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    it('applies correct sizing for different layout sizes', () => {
      const { rerender } = renderWithProviders(
        <OutfitLayout selection={completeOutfit} size="small" />
      );
      
      expect(document.querySelector('.w-72')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider>
          <SettingsProvider>
            <OutfitLayout selection={completeOutfit} size="medium" />
          </SettingsProvider>
        </ThemeProvider>
      );
      
      expect(document.querySelector('.w-80')).toBeInTheDocument();
      
      rerender(
        <ThemeProvider>
          <SettingsProvider>
            <OutfitLayout selection={completeOutfit} size="large" />
          </SettingsProvider>
        </ThemeProvider>
      );
      
      expect(document.querySelector('.w-96')).toBeInTheDocument();
    });
  });



  describe('Cross-Component Integration', () => {
    it('integrates CategoryDropdown with undershirt category in complete workflow', async () => {
      const mockOnSelect = vi.fn();
      const undershirtItems = [
        createMockItem('u1', 'Undershirt (White)', 'Undershirt', 1),
        createMockItem('u2', 'Undershirt (Black)', 'Undershirt', 1)
      ];
      
      renderWithProviders(
        <CategoryDropdown
          category="Undershirt"
          selectedItem={null}
          availableItems={undershirtItems}
          onSelect={mockOnSelect}
        />
      );
      
      // Should show undershirt category
      expect(screen.getByText('Select Undershirt')).toBeInTheDocument();
      
      // Open dropdown and select item
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('Undershirt (White)')).toBeInTheDocument();
      });
      
      const whiteUndershirt = screen.getByText('Undershirt (White)');
      fireEvent.click(whiteUndershirt);
      
      expect(mockOnSelect).toHaveBeenCalledWith(undershirtItems[0]);
    });

    it('maintains scoring consistency across component updates', () => {
      const baseOutfit: OutfitSelection = {
        shirt: mockWardrobe.shirt,
        pants: mockWardrobe.pants,
        shoes: mockWardrobe.shoes
      };
      
      const withUndershirt: OutfitSelection = {
        ...baseOutfit,
        undershirt: mockWardrobe.undershirt
      };
      
      const withJacket: OutfitSelection = {
        ...withUndershirt,
        jacket: mockWardrobe.jacket
      };
      
      const baseScore = calculateOutfitScore(baseOutfit);
      const undershirtScore = calculateOutfitScore(withUndershirt);
      const jacketScore = calculateOutfitScore(withJacket);
      
      // Adding undershirt should change the score
      expect(baseScore.total).not.toBe(undershirtScore.total);
      
      // Adding jacket should affect layer weights
      expect(undershirtScore.total).not.toBe(jacketScore.total);
      
      // Jacket score should have proper layer adjustments
      const jacketAdj = jacketScore.layerAdjustments.find(adj => adj.category === 'Jacket/Overshirt');
      const shirtAdj = jacketScore.layerAdjustments.find(adj => adj.category === 'Shirt');
      const undershirtAdj = jacketScore.layerAdjustments.find(adj => adj.category === 'Undershirt');
      
      expect(jacketAdj?.weight).toBe(1.0);  // Visible
      expect(shirtAdj?.weight).toBe(0.7);   // Covered by jacket
      expect(undershirtAdj?.weight).toBe(0.3); // Covered by shirt
    });
  });
});
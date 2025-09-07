import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { OutfitCard } from './OutfitCard';
import { CategoryDropdown } from './CategoryDropdown';
import { ItemsGrid } from './ItemsGrid';
import { SettingsProvider } from '../contexts/SettingsContext';
import { WardrobeItem, GeneratedOutfit } from '../types';

// Mock the OutfitLayout component since it's not relevant for this test
vi.mock('./OutfitLayout', () => ({
  OutfitLayout: ({ selection }: { selection: any }) => (
    <div data-testid="outfit-layout">Outfit Layout for {selection.shirt?.name}</div>
  )
}));

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

const mockItem: WardrobeItem = {
  id: '1',
  name: 'OCBD (White)',
  category: 'Shirt',
  brand: 'Ralph Lauren',
  formalityScore: 7
};

const mockItemNoBrand: WardrobeItem = {
  id: '2',
  name: 'Tee (Navy)',
  category: 'Undershirt',
  formalityScore: 3
};

const mockOutfit: GeneratedOutfit = {
  id: 'test-outfit',
  shirt: mockItem,
  undershirt: mockItemNoBrand,
  score: 75,
  source: 'generated'
};

describe('Brand Display Integration', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('OutfitCard', () => {
    it('should show brand when setting is enabled', () => {
      // Enable brand display
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":true}');
      
      render(
        <SettingsProvider>
          <OutfitCard outfit={mockOutfit} variant="compact" />
        </SettingsProvider>
      );

      expect(screen.getByText('Ralph Lauren OCBD (White)')).toBeInTheDocument();
      expect(screen.getByText('Tee (Navy)')).toBeInTheDocument(); // No brand
    });

    it('should hide brand when setting is disabled', () => {
      // Disable brand display
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":false}');
      
      render(
        <SettingsProvider>
          <OutfitCard outfit={mockOutfit} variant="compact" />
        </SettingsProvider>
      );

      expect(screen.getByText('OCBD (White)')).toBeInTheDocument();
      expect(screen.queryByText('Ralph Lauren OCBD (White)')).not.toBeInTheDocument();
    });
  });

  describe('CategoryDropdown', () => {
    it('should show brand in dropdown when setting is enabled', () => {
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":true}');
      
      render(
        <SettingsProvider>
          <CategoryDropdown
            category="Shirt"
            selectedItem={mockItem}
            availableItems={[mockItem, mockItemNoBrand]}
            onSelect={vi.fn()}
          />
        </SettingsProvider>
      );

      expect(screen.getByText('Ralph Lauren OCBD (White)')).toBeInTheDocument();
    });

    it('should hide brand in dropdown when setting is disabled', () => {
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":false}');
      
      render(
        <SettingsProvider>
          <CategoryDropdown
            category="Shirt"
            selectedItem={mockItem}
            availableItems={[mockItem, mockItemNoBrand]}
            onSelect={vi.fn()}
          />
        </SettingsProvider>
      );

      expect(screen.getByText('OCBD (White)')).toBeInTheDocument();
      expect(screen.queryByText('Ralph Lauren OCBD (White)')).not.toBeInTheDocument();
    });
  });

  describe('ItemsGrid', () => {
    it('should show brand in grid when setting is enabled', () => {
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":true}');
      
      render(
        <SettingsProvider>
          <ItemsGrid
            category="Shirt"
            items={[mockItem]}
            onItemSelect={vi.fn()}
          />
        </SettingsProvider>
      );

      expect(screen.getByText('Ralph Lauren OCBD (White)')).toBeInTheDocument();
    });

    it('should hide brand in grid when setting is disabled', () => {
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":false}');
      
      render(
        <SettingsProvider>
          <ItemsGrid
            category="Shirt"
            items={[mockItem]}
            onItemSelect={vi.fn()}
          />
        </SettingsProvider>
      );

      expect(screen.getByText('OCBD (White)')).toBeInTheDocument();
      expect(screen.queryByText('Ralph Lauren OCBD (White)')).not.toBeInTheDocument();
    });
  });

  describe('Settings Integration', () => {
    it('should load settings from localStorage on mount', () => {
      // Test with brand enabled from start
      mockLocalStorage.setItem('closet-outfit-builder-settings', '{"showBrand":true}');
      
      render(
        <SettingsProvider>
          <OutfitCard outfit={mockOutfit} variant="compact" />
        </SettingsProvider>
      );

      // Should show brand from localStorage
      expect(screen.getByText('Ralph Lauren OCBD (White)')).toBeInTheDocument();
    });
  });
});
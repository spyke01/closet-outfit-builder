import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectionStrip } from './SelectionStrip';
import { OutfitSelection, WardrobeItem, GeneratedOutfit } from '../types';
import { useOutfitEngine } from '../hooks/useOutfitEngine';
import { SettingsProvider } from '../contexts/SettingsContext';

// Mock the useOutfitEngine hook
vi.mock('../hooks/useOutfitEngine');

// Mock data
const mockAnchorItem: WardrobeItem = {
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

const mockOutfit: GeneratedOutfit = {
  id: 'outfit-1',
  jacket: mockAnchorItem,
  shirt: mockShirt,
  score: 85,
  source: 'curated'
};

describe('SelectionStrip Error Handling', () => {
  const mockOnSelectionChange = vi.fn();
  const mockOnOutfitSelect = vi.fn();
  const mockGetCompatibleItems = vi.fn();
  const mockGetFilteredOutfits = vi.fn();
  const mockValidatePartialSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.mocked(useOutfitEngine).mockReturnValue({
      getCompatibleItems: mockGetCompatibleItems,
      getFilteredOutfits: mockGetFilteredOutfits,
      validatePartialSelection: mockValidatePartialSelection,
      scoreOutfit: vi.fn(),
      getRandomOutfit: vi.fn(),
      getOutfitsForAnchor: vi.fn(),
      getAllOutfits: vi.fn()
    });

    // Default successful responses
    mockGetCompatibleItems.mockReturnValue([mockShirt]);
    mockGetFilteredOutfits.mockReturnValue([mockOutfit]);
    mockValidatePartialSelection.mockReturnValue(true);
  });

  describe('Error Display', () => {
    it('shows error when getFilteredOutfits throws', () => {
      mockGetFilteredOutfits.mockImplementation(() => {
        throw new Error('Network error');
      });

      const selection: OutfitSelection = { jacket: mockAnchorItem };

      render(
        <SettingsProvider>
          <SelectionStrip
            selection={selection}
            anchorItem={mockAnchorItem}
            onSelectionChange={mockOnSelectionChange}
            onOutfitSelect={mockOnOutfitSelect}
          />
        </SettingsProvider>
      );

      expect(screen.getByText('Unable to load matching outfits. Please try refreshing the page.')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('recovers from getCompatibleItems errors', () => {
      mockGetCompatibleItems.mockImplementation(() => {
        throw new Error('Failed to get compatible items');
      });

      const selection: OutfitSelection = { jacket: mockAnchorItem };

      render(
        <SettingsProvider>
          <SelectionStrip
            selection={selection}
            anchorItem={mockAnchorItem}
            onSelectionChange={mockOnSelectionChange}
            onOutfitSelect={mockOnOutfitSelect}
          />
        </SettingsProvider>
      );

      // Should still render without crashing
      expect(screen.getByText(/Building from.*Moto Jacket/)).toBeInTheDocument();
      
      // Should render without crashing - check for dropdown presence
      const dropdowns = screen.getAllByRole('button');
      expect(dropdowns.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles null anchor item', () => {
      const selection: OutfitSelection = {};

      const { container } = render(
        <SettingsProvider>
          <SelectionStrip
            selection={selection}
            anchorItem={null}
            onSelectionChange={mockOnSelectionChange}
            onOutfitSelect={mockOnOutfitSelect}
          />
        </SettingsProvider>
      );

      // Should not render anything when no anchor item
      expect(container.firstChild).toBeNull();
    });

    it('handles empty selection gracefully', () => {
      const selection: OutfitSelection = {};

      render(
        <SettingsProvider>
          <SelectionStrip
            selection={selection}
            anchorItem={mockAnchorItem}
            onSelectionChange={mockOnSelectionChange}
            onOutfitSelect={mockOnOutfitSelect}
          />
        </SettingsProvider>
      );

      expect(screen.getByText(/Building from.*Moto Jacket/)).toBeInTheDocument();
      
      // Should render dropdowns for categories
      const dropdowns = screen.getAllByRole('button');
      expect(dropdowns.length).toBe(5); // 5 categories total
    });

    it('handles malformed selection data', () => {
      const malformedSelection = {
        jacket: null,
        shirt: undefined,
        pants: { id: '', name: '', category: '' }, // Invalid item
        invalidProperty: 'should be ignored'
      } as any;

      render(
        <SettingsProvider>
          <SelectionStrip
            selection={malformedSelection}
            anchorItem={mockAnchorItem}
            onSelectionChange={mockOnSelectionChange}
            onOutfitSelect={mockOnOutfitSelect}
          />
        </SettingsProvider>
      );

      // Should still render without crashing
      expect(screen.getByText(/Building from.*Moto Jacket/)).toBeInTheDocument();
    });
  });
});
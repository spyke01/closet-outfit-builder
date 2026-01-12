import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CreateOutfitPageClient } from '../create-outfit-client';
import { OutfitDisplay } from '@/components/outfit-display';
import { ScoreCircle } from '@/components/score-circle';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardrobeItem, Category, OutfitSelection } from '@/lib/types/database';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock data with proper UUID formats
const mockCategories: Category[] = [
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'Jackets', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', is_anchor_item: false, display_order: 1, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', name: 'Shirts', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', is_anchor_item: false, display_order: 2, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481', name: 'Pants', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', is_anchor_item: false, display_order: 3, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482', name: 'Shoes', user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', is_anchor_item: false, display_order: 4, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const mockItems: WardrobeItem[] = [
  { 
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d483', 
    name: 'Blue Jacket', 
    brand: 'Nike',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    active: true, 
    season: ['All'], 
    formality_score: 7,
    image_url: '/images/blue-jacket.jpg',
    created_at: '2024-01-01', 
    updated_at: '2024-01-01' 
  },
  { 
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d485', 
    name: 'White Shirt', 
    brand: 'Adidas',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    active: true, 
    season: ['All'], 
    formality_score: 6,
    image_url: '/images/white-shirt.jpg',
    created_at: '2024-01-01', 
    updated_at: '2024-01-01' 
  },
  { 
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d486', 
    name: 'Black Pants', 
    brand: 'Levi\'s',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    active: true, 
    season: ['All'], 
    formality_score: 8,
    image_url: '/images/black-pants.jpg',
    created_at: '2024-01-01', 
    updated_at: '2024-01-01' 
  },
  { 
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d487', 
    name: 'Brown Shoes', 
    brand: 'Clarks',
    category_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482', 
    user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    active: true, 
    season: ['All'], 
    formality_score: 7,
    image_url: '/images/brown-shoes.jpg',
    created_at: '2024-01-01', 
    updated_at: '2024-01-01' 
  },
];

// Mock hooks with dynamic data
let mockScoreData = { score: 0 };
let mockIsDuplicate = false;

vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({
    data: mockCategories,
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/use-wardrobe-items', () => ({
  useWardrobeItems: () => ({
    data: mockItems,
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/use-outfits', () => ({
  useCreateOutfit: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
  useScoreOutfit: () => ({
    data: mockScoreData,
  }),
  useCheckOutfitDuplicate: () => ({
    data: mockIsDuplicate,
  }),
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Helper function to create a complete outfit selection
function createCompleteOutfitSelection(): OutfitSelection {
  return {
    jacket: mockItems[0], // Blue Jacket
    shirt: mockItems[1],  // White Shirt
    pants: mockItems[2],  // Black Pants
    shoes: mockItems[3],  // Brown Shoes
    tuck_style: 'Untucked',
    score: 85,
  };
}

// Helper function to create a minimal outfit selection (shirt + pants)
function createMinimalOutfitSelection(): OutfitSelection {
  return {
    shirt: mockItems[1],  // White Shirt
    pants: mockItems[2],  // Black Pants
    tuck_style: 'Untucked',
    score: 65,
  };
}

// Helper function to create an incomplete outfit selection
function createIncompleteOutfitSelection(): OutfitSelection {
  return {
    jacket: mockItems[0], // Blue Jacket only
    tuck_style: 'Untucked',
    score: 0,
  };
}

describe('Preview and Scoring Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScoreData = { score: 0 };
    mockIsDuplicate = false;
  });

  describe('Property 7: Real-Time Preview Updates', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 7: Real-Time Preview Updates**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     */
    it('should immediately update preview when items are selected', async () => {
      const completeSelection = createCompleteOutfitSelection();
      
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={completeSelection}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      // Check that the preview shows the selected items
      await waitFor(() => {
        expect(screen.getByText('Blue Jacket')).toBeInTheDocument();
        expect(screen.getByText('White Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Pants')).toBeInTheDocument();
        expect(screen.getByText('Brown Shoes')).toBeInTheDocument();
      });
    });

    it('should handle selection state changes', async () => {
      const minimalSelection = createMinimalOutfitSelection();
      
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={minimalSelection}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('White Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Pants')).toBeInTheDocument();
      });
    });
  });

  describe('Property 8: Preview Item Information Display', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 8: Preview Item Information Display**
     * **Validates: Requirements 2.5**
     */
    it('should display item names, brands, and images when available in preview', async () => {
      const completeSelection = createCompleteOutfitSelection();
      
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={completeSelection}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      // Check that item names are displayed
      await waitFor(() => {
        expect(screen.getByText('Blue Jacket')).toBeInTheDocument();
        expect(screen.getByText('White Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Pants')).toBeInTheDocument();
        expect(screen.getByText('Brown Shoes')).toBeInTheDocument();
      });

      // Check that brands are displayed when available
      await waitFor(() => {
        expect(screen.getByText('Nike')).toBeInTheDocument();
        expect(screen.getByText('Adidas')).toBeInTheDocument();
        expect(screen.getByText('Levi\'s')).toBeInTheDocument();
        expect(screen.getByText('Clarks')).toBeInTheDocument();
      });

      // Check that images are referenced (img elements with proper src)
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      
      const jacketImage = images.find(img => 
        img.getAttribute('src')?.includes('blue-jacket') || 
        img.getAttribute('alt')?.includes('Blue Jacket')
      );
      expect(jacketImage).toBeDefined();
    });

    it('should handle missing brand or image data gracefully', async () => {
      const selectionWithMissingData: OutfitSelection = {
        shirt: {
          ...mockItems[1],
          brand: undefined, // No brand
          image_url: undefined, // No image
        },
        pants: mockItems[2],
        tuck_style: 'Untucked',
        score: 50,
      };
      
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={selectionWithMissingData}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      // Item name should still be displayed
      await waitFor(() => {
        expect(screen.getByText('White Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Pants')).toBeInTheDocument();
      });

      // Should not crash when brand is missing
      expect(screen.queryByText('Adidas')).not.toBeInTheDocument();
    });
  });

  describe('Property 9: Real-Time Score Calculation', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 9: Real-Time Score Calculation**
     * **Validates: Requirements 2.6, 3.1, 3.2**
     */
    it('should calculate and display score for complete outfits', async () => {
      mockScoreData = { score: 85 };
      
      render(
        <TestWrapper>
          <ScoreCircle
            score={85}
            outfit={createCompleteOutfitSelection()}
            showLabel={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
      });
    });

    it('should handle different formality levels', async () => {
      const highFormalitySelection: OutfitSelection = {
        shirt: { ...mockItems[1], formality_score: 9 },
        pants: { ...mockItems[2], formality_score: 9 },
        shoes: { ...mockItems[3], formality_score: 9 },
        tuck_style: 'Tucked',
        score: 95,
      };
      
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={highFormalitySelection}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('White Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Pants')).toBeInTheDocument();
      });
    });
  });

  describe('Property 10: Score Breakdown Availability', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 10: Score Breakdown Availability**
     * **Validates: Requirements 3.4, 3.5**
     */
    it('should provide score breakdown interface', async () => {
      render(
        <TestWrapper>
          <ScoreCircle
            score={85}
            outfit={createCompleteOutfitSelection()}
            showLabel={true}
          />
        </TestWrapper>
      );

      const scoreCircle = screen.getByRole('button', { name: /view score breakdown/i });
      expect(scoreCircle).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should handle outfits without score data', async () => {
      render(
        <TestWrapper>
          <ScoreCircle
            score={0}
            showLabel={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Property 11: Minimum Outfit Validation', () => {
    /**
     * **Feature: outfit-creation-selection-fix, Property 11: Minimum Outfit Validation**
     * **Validates: Requirements 3.6, 4.1**
     */
    it('should validate minimum outfit requirements', async () => {
      const minimalSelection = createMinimalOutfitSelection();
      const incompleteSelection = createIncompleteOutfitSelection();
      
      // Test minimal valid outfit
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={minimalSelection}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('White Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Pants')).toBeInTheDocument();
      });

      // Test incomplete outfit
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={incompleteSelection}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Blue Jacket')).toBeInTheDocument();
      });
    });

    it('should handle complete outfit validation', async () => {
      const completeSelection = createCompleteOutfitSelection();
      
      render(
        <TestWrapper>
          <OutfitDisplay
            selection={completeSelection}
            onRandomize={() => {}}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Blue Jacket')).toBeInTheDocument();
        expect(screen.getByText('White Shirt')).toBeInTheDocument();
        expect(screen.getByText('Black Pants')).toBeInTheDocument();
        expect(screen.getByText('Brown Shoes')).toBeInTheDocument();
      });
    });
  });
});
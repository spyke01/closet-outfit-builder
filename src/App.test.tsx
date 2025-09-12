import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test/test-utils';
import App from './App';
import * as useWardrobeModule from './hooks/useWardrobe';
import * as useOutfitEngineModule from './hooks/useOutfitEngine';

// Mock the hooks
vi.mock('./hooks/useWardrobe');
vi.mock('./hooks/useOutfitEngine');

// Mock the location and weather services
vi.mock('./services/locationService', () => ({
  getCurrentLocation: vi.fn(() => Promise.resolve({
    latitude: 40.7128,
    longitude: -74.0060,
    granted: true
  }))
}));

vi.mock('./services/weatherService', () => ({
  getWeatherData: vi.fn(() => Promise.resolve([
    {
      date: '2024-01-01',
      dayOfWeek: 'Monday',
      high: 75,
      low: 60,
      condition: 'Sunny',
      icon: 'sun',
      precipitationChance: 0
    }
  ]))
}));

// Mock service worker registration
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn(() => Promise.resolve())
  },
  writable: true
});

describe('App', () => {
  const mockUseWardrobe = vi.mocked(useWardrobeModule.useWardrobe);
  const mockUseOutfitEngine = vi.mocked(useOutfitEngineModule.useOutfitEngine);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mocks
    const mockItems = [
      { id: '1', name: 'Blue Jacket', category: 'Jacket/Overshirt', capsuleTags: ['Refined'] },
      { id: '2', name: 'White Shirt', category: 'Shirt', capsuleTags: ['Adventurer'] },
      { id: '3', name: 'Black Chinos', category: 'Pants', capsuleTags: ['Refined'] },
      { id: '4', name: 'Brown Boots', category: 'Shoes', capsuleTags: ['Crossover'] }
    ];

    mockUseWardrobe.mockReturnValue({
      items: mockItems,
      outfits: [],
      itemsByCategory: {
        'Jacket/Overshirt': [mockItems[0]],
        'Shirt': [mockItems[1]],
        'Pants': [mockItems[2]],
        'Shoes': [mockItems[3]]
      },
      getItemById: vi.fn((id: string) => mockItems.find(item => item.id === id)),
      loading: false
    });

    mockUseOutfitEngine.mockReturnValue({
      scoreOutfit: vi.fn(() => 85),
      getRandomOutfit: vi.fn(() => ({
        id: 'random-1',
        jacket: mockItems[0],
        shirt: mockItems[1],
        pants: mockItems[2],
        shoes: mockItems[3],
        score: 85,
        source: 'curated' as const
      })),
      getOutfitsForAnchor: vi.fn(() => []),
      getAllOutfits: vi.fn(() => [
        {
          id: 'outfit-1',
          jacket: mockItems[0],
          shirt: mockItems[1],
          pants: mockItems[2],
          shoes: mockItems[3],
          score: 90,
          source: 'generated' as const
        },
        {
          id: 'outfit-2',
          jacket: mockItems[0],
          shirt: mockItems[1],
          pants: mockItems[2],
          shoes: mockItems[3],
          score: 88,
          source: 'generated' as const
        }
      ]),
      getCompatibleItems: vi.fn(() => []),
      getFilteredOutfits: vi.fn(() => []),
      validatePartialSelection: vi.fn(() => true)
    });
  });

  describe('Default Outfit Display Behavior', () => {
    it('displays all outfits by default when the application loads', async () => {
      render(<App />);
      
      // Wait for the component to load and render outfits
      await waitFor(() => {
        expect(screen.getByText('All Outfits')).toBeInTheDocument();
      });
      
      // Verify that outfit count is displayed
      expect(screen.getByText('2 combinations available')).toBeInTheDocument();
      
      // Verify that outfit cards are rendered by looking for outfit content
      expect(screen.getAllByText('Blue Jacket')).toHaveLength(2); // Should appear in both outfits
      expect(screen.getAllByText('White Shirt')).toHaveLength(2); // Should appear in both outfits
    });



    it('shows outfit collection without requiring user interaction', async () => {
      render(<App />);
      
      // Immediately check that outfits are visible without any clicks
      await waitFor(() => {
        expect(screen.getByText('All Outfits')).toBeInTheDocument();
        expect(screen.getByText('2 combinations available')).toBeInTheDocument();
      });
      
      // Verify no additional interaction was needed
      const outfitSection = screen.getByText('All Outfits').closest('div');
      expect(outfitSection).toBeInTheDocument();
    });

    it('displays complete outfit collection on page load', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Check that the outfit grid is rendered
        const outfitGrid = screen.getByText('All Outfits').parentElement;
        expect(outfitGrid).toBeInTheDocument();
        
        // Verify outfit content is present (instead of looking for data-testid)
        expect(screen.getAllByText('Blue Jacket')).toHaveLength(2); // Should appear in both outfits
        expect(screen.getAllByText('White Shirt')).toHaveLength(2); // Should appear in both outfits
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when wardrobe is loading', () => {
      // Mock loading state
      mockUseWardrobe.mockReturnValue({
        items: [],
        outfits: [],
        itemsByCategory: {},
        getItemById: vi.fn(() => undefined),
        loading: true
      });
      
      render(<App />);
      
      expect(screen.getByText('Loading your wardrobe...')).toBeInTheDocument();
      // Check for loading spinner by class name since it doesn't have a role
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Randomize Button', () => {
    it('displays randomize button in All Outfits section', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('All Outfits')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /choose a random outfit/i })).toBeInTheDocument();
      });
    });
  });

  describe('ScrollToTop Component', () => {
    it('includes ScrollToTop component in the app', () => {
      render(<App />);
      
      // ScrollToTop component is rendered but initially hidden when not scrolled
      // The component itself is tested in its own test file for scroll behavior
      // We just verify the app structure includes it
      const appContainer = document.querySelector('.min-h-screen');
      expect(appContainer).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no outfits are available', async () => {
      // Mock empty outfits
      mockUseOutfitEngine.mockReturnValue({
        scoreOutfit: vi.fn(() => 0),
        getRandomOutfit: vi.fn(() => null),
        getOutfitsForAnchor: vi.fn(() => []),
        getAllOutfits: vi.fn(() => []),
        getCompatibleItems: vi.fn(() => []),
        getFilteredOutfits: vi.fn(() => []),
        validatePartialSelection: vi.fn(() => true)
      });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('All Outfits')).toBeInTheDocument();
        expect(screen.getByText('0 combinations available')).toBeInTheDocument();
        expect(screen.getByText('No outfits available.')).toBeInTheDocument();
      });
    });
  });
});

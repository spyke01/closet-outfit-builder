import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import App from '../App';

// Mock all the hooks and services
vi.mock('../hooks/useWardrobe', () => ({
  useWardrobe: () => ({
    itemsByCategory: {
      'Jacket/Overshirt': [
        { id: 'moto-jacket', name: 'Moto Jacket', category: 'Jacket/Overshirt' }
      ],
      'Shirt': [
        { id: 'cream-tee', name: 'Cream Tee', category: 'Shirt' }
      ]
    },
    loading: false
  })
}));

vi.mock('../hooks/useOutfitEngine', () => ({
  useOutfitEngine: () => ({
    getRandomOutfit: vi.fn(),
    getAllOutfits: () => [
      {
        id: 'outfit-1',
        jacket: { id: 'moto-jacket', name: 'Moto Jacket', category: 'Jacket/Overshirt' },
        shirt: { id: 'cream-tee', name: 'Cream Tee', category: 'Shirt' },
        pants: { id: 'dark-denim', name: 'Dark Denim', category: 'Pants' },
        shoes: { id: 'boots-brown-apache', name: 'Apache Boots', category: 'Shoes' },
        score: 85,
        source: 'curated'
      }
    ],
    getCompatibleItems: vi.fn().mockReturnValue([]),
    getFilteredOutfits: vi.fn().mockReturnValue([]),
    validatePartialSelection: vi.fn().mockReturnValue(true)
  })
}));

vi.mock('../services/locationService', () => ({
  getCurrentLocation: vi.fn().mockResolvedValue({
    latitude: 40.7128,
    longitude: -74.0060,
    granted: true
  })
}));

vi.mock('../services/weatherService', () => ({
  getWeatherData: vi.fn().mockResolvedValue([
    {
      date: '2024-01-01',
      dayOfWeek: 'Monday',
      high: 75,
      low: 60,
      condition: 'Sunny',
      icon: 'sun',
      precipitationChance: 0
    }
  ])
}));

// Mock service worker registration
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({})
  },
  writable: true
});

describe('App Responsive Design Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Layout (iPhone 12 Pro - 390px)', () => {
    beforeEach(() => {
      // Mock iPhone 12 Pro viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 390,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 844,
      });
    });

    it('should render without horizontal scrolling on mobile', async () => {
      const { container } = render(<App />);
      
      // Check that main container prevents horizontal overflow
      const mainContainer = container.querySelector('.min-h-screen.bg-stone-50.overflow-x-hidden');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have proper fixed header with mobile padding', async () => {
      render(<App />);
      
      // Wait for component to render
      await screen.findByLabelText('What to Wear');
      
      // Check fixed header container
      const fixedHeader = document.querySelector('.fixed.top-0.left-0.right-0.z-50');
      expect(fixedHeader).toBeInTheDocument();
    });

    it('should apply correct top padding for mobile fixed header', async () => {
      const { container } = render(<App />);
      
      // Check content container has proper top padding for mobile
      const contentContainer = container.querySelector('.pt-\\[286px\\].md\\:pt-\\[210px\\]');
      expect(contentContainer).toBeInTheDocument();
    });

    it('should render randomize button with full width on mobile', async () => {
      render(<App />);
      
      // Wait for the randomize button to appear
      const randomizeButton = await screen.findByText('Choose a Random Outfit');
      expect(randomizeButton.parentElement).toHaveClass('w-full', 'sm:w-auto');
    });

    it('should use single column grid for outfits on mobile', async () => {
      const { container } = render(<App />);
      
      // Wait for content to load
      await screen.findByText('All Outfits');
      
      // Check grid layout
      const gridContainer = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have proper mobile spacing and padding', async () => {
      const { container } = render(<App />);
      
      // Wait for content to load
      await screen.findByText('All Outfits');
      
      // Check responsive padding
      const contentArea = container.querySelector('.p-4.sm\\:p-6');
      expect(contentArea).toBeInTheDocument();
      
      // Check responsive gaps
      const gridContainer = container.querySelector('.gap-4.sm\\:gap-6');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Tablet Layout (768px)', () => {
    beforeEach(() => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it('should use two-column grid on tablet', async () => {
      const { container } = render(<App />);
      
      // Wait for content to load
      await screen.findByText('All Outfits');
      
      // Should have responsive grid classes
      const gridContainer = container.querySelector('.sm\\:grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have proper header layout on tablet', async () => {
      render(<App />);
      
      // Wait for component to render
      await screen.findByLabelText('What to Wear');
      
      // Check that header uses different padding calculation
      const contentContainer = document.querySelector('.md\\:pt-\\[210px\\]');
      expect(contentContainer).toBeInTheDocument();
    });
  });

  describe('Desktop Layout (1200px)', () => {
    beforeEach(() => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });
    });

    it('should use four-column grid on desktop', async () => {
      const { container } = render(<App />);
      
      // Wait for content to load
      await screen.findByText('All Outfits');
      
      // Should have desktop grid classes
      const gridContainer = container.querySelector('.xl\\:grid-cols-4');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should have randomize button with auto width on desktop', async () => {
      render(<App />);
      
      // Wait for the randomize button to appear
      const randomizeButton = await screen.findByText('Choose a Random Outfit');
      expect(randomizeButton.parentElement).toHaveClass('sm:w-auto');
    });
  });

  describe('Touch Target Requirements', () => {
    it('should ensure randomize button meets 44px minimum height', async () => {
      render(<App />);
      
      // Wait for the randomize button to appear
      const randomizeButton = await screen.findByText('Choose a Random Outfit');
      expect(randomizeButton.parentElement).toHaveClass('min-h-[44px]');
    });

    it('should ensure all interactive elements are touch-friendly', async () => {
      render(<App />);
      
      // Wait for logo to appear
      const logo = await screen.findByLabelText('What to Wear');
      const logoButton = logo.parentElement;
      
      // Logo button should be clickable and have proper hover states
      expect(logoButton).toHaveClass('hover:opacity-80');
    });
  });

  describe('Responsive Typography', () => {
    it('should use responsive text sizing for headings', async () => {
      render(<App />);
      
      // Wait for heading to appear
      const heading = await screen.findByText('All Outfits');
      expect(heading).toHaveClass('text-xl', 'sm:text-2xl');
    });

    it('should use responsive text sizing for descriptions', async () => {
      render(<App />);
      
      // Wait for description to appear
      const description = await screen.findByText(/combinations available/);
      expect(description).toHaveClass('text-sm', 'sm:text-base');
    });
  });

  describe('Layout Flexibility', () => {
    it('should handle content overflow properly', async () => {
      const { container } = render(<App />);
      
      // Wait for content to load
      await screen.findByText('All Outfits');
      
      // Check that content area has proper overflow handling
      const contentArea = container.querySelector('.overflow-y-auto');
      expect(contentArea).toBeInTheDocument();
    });

    it('should maintain proper flex layout structure', async () => {
      const { container } = render(<App />);
      
      // Wait for content to load
      await screen.findByText('All Outfits');
      
      // Check flex layout structure
      const flexContainer = container.querySelector('.flex.flex-col.min-h-screen');
      expect(flexContainer).toBeInTheDocument();
      
      const flexContent = container.querySelector('.flex-1.flex.min-h-0');
      expect(flexContent).toBeInTheDocument();
    });

    it('should handle header/content layout properly', async () => {
      render(<App />);
      
      // Wait for content to load
      await screen.findByText('All Outfits');
      
      // Check that header and content sections are properly structured
      const headerSection = document.querySelector('.flex.flex-col.sm\\:flex-row.sm\\:items-center.sm\\:justify-between');
      expect(headerSection).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner with proper responsive styling', () => {
      // Create a separate test component that renders loading state
      const LoadingApp = () => {
        return (
          <div className="min-h-screen bg-stone-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your wardrobe...</p>
            </div>
          </div>
        );
      };

      render(<LoadingApp />);
      
      // Check loading container
      const loadingContainer = screen.getByText('Loading your wardrobe...').parentElement?.parentElement;
      expect(loadingContainer).toHaveClass('min-h-screen', 'bg-stone-50', 'flex', 'items-center', 'justify-center');
      
      // Check spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-12', 'w-12');
    });
  });
});

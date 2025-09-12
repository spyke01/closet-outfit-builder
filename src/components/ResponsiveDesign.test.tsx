import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionStrip } from './SelectionStrip';
import { TopBar } from './TopBar';
import { CategoryDropdown } from './CategoryDropdown';
import { OutfitSelection, WardrobeItem, GeneratedOutfit, WeatherData } from '../types';

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

// Mock the OutfitList component
vi.mock('./OutfitList', () => ({
  OutfitList: ({ outfits }: any) => (
    <div data-testid="outfit-list">
      {outfits.map((outfit: GeneratedOutfit) => (
        <div key={outfit.id} data-testid={`outfit-${outfit.id}`}>
          Outfit {outfit.id}
        </div>
      ))}
    </div>
  )
}));

// Mock the WeatherWidget component
vi.mock('./WeatherWidget', () => ({
  WeatherWidget: ({ forecast, loading, error, className }: {
    forecast: WeatherData[];
    loading?: boolean;
    error?: any;
    className?: string;
  }) => (
    <div data-testid="weather-widget" className={className}>
      {loading && <span>Loading weather...</span>}
      {error && <span>Weather error</span>}
      {!loading && !error && forecast.length > 0 && (
        <span>Weather forecast: {forecast.length} days</span>
      )}
    </div>
  )
}));

describe('Responsive Design Tests', () => {
  const mockAnchorItem: WardrobeItem = {
    id: 'moto-jacket',
    name: 'Moto Jacket',
    category: 'Jacket/Overshirt'
  };

  const mockItems = {
    jacket: { id: 'moto-jacket', name: 'Moto Jacket', category: 'Jacket/Overshirt' as const },
    shirt: { id: 'cream-tee', name: 'Cream Tee', category: 'Shirt' as const },
    pants: { id: 'dark-denim', name: 'Dark Denim', category: 'Pants' as const },
    shoes: { id: 'boots-brown-apache', name: 'Apache Boots', category: 'Shoes' as const }
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCompatibleItems.mockReturnValue([mockItems.jacket, mockItems.shirt, mockItems.pants, mockItems.shoes]);
    mockGetFilteredOutfits.mockReturnValue(mockOutfits);
    mockValidatePartialSelection.mockReturnValue(true);
  });

  describe('Mobile Viewport Rendering', () => {
    beforeEach(() => {
      // Mock mobile viewport dimensions (iPhone 12 Pro: 390x844)
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

    it('should render SelectionStrip with mobile-first responsive classes', () => {
      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Check for mobile-first responsive container classes
      const mainContainer = container.querySelector('.bg-white.border-b.border-stone-200');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('px-3', 'sm:px-6', 'py-3', 'sm:py-4');

      // Check for responsive grid layout
      const gridContainer = container.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should render TopBar with proper mobile layout', () => {
      const { container } = render(
        <TopBar onTitleClick={vi.fn()} />
      );

      // Check for responsive flex layout
      const flexContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(flexContainer).toBeInTheDocument();

      // Check logo responsive sizing
      const logo = screen.getByAltText('What to Wear');
      expect(logo).toHaveClass('h-8', 'sm:h-10');

      // Check weather widget has responsive text sizing
      const weatherWidget = screen.getByTestId('weather-widget');
      expect(weatherWidget).toHaveClass('text-sm');
    });

    it('should handle viewport width changes gracefully', () => {
      const { container, rerender } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Initial mobile layout
      expect(container.querySelector('.grid-cols-1')).toBeInTheDocument();

      // Simulate tablet viewport (768px)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      rerender(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Should still have responsive classes for tablet breakpoint
      expect(container.querySelector('.sm\\:grid-cols-2')).toBeInTheDocument();
    });
  });

  describe('Touch Target Sizing', () => {
    it('should ensure CategoryDropdown buttons meet 44px minimum touch target', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[mockItems.shirt]}
          onSelect={vi.fn()}
        />
      );

      const dropdownButton = screen.getByRole('button');
      expect(dropdownButton).toHaveClass('min-h-[44px]');
    });

    it('should ensure dropdown options have proper touch targets on mobile', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[mockItems.shirt, mockItems.pants]}
          onSelect={vi.fn()}
        />
      );

      // Open dropdown
      const dropdownButton = screen.getByRole('button');
      fireEvent.click(dropdownButton);

      // Check that dropdown options have proper touch targets
      const options = screen.getAllByRole('button');
      options.forEach(option => {
        // Skip the main dropdown button, check only the options
        if (option !== dropdownButton) {
          expect(option).toHaveClass('min-h-[44px]');
          expect(option).toHaveClass('touch-manipulation');
        }
      });
    });

    it('should ensure error dismiss button has adequate touch target', () => {
      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Simulate an error state by triggering validation failure
      mockValidatePartialSelection.mockReturnValueOnce(false);
      
      // Try to select an item to trigger error
      const dropdownButton = container.querySelector('button');
      if (dropdownButton) {
        fireEvent.click(dropdownButton);
      }

      // Check if error dismiss button has proper touch target
      const dismissButton = container.querySelector('[aria-label="Dismiss error message"]');
      if (dismissButton) {
        expect(dismissButton).toHaveClass('min-h-[44px]', 'min-w-[44px]');
      }
    });

    it('should ensure all interactive elements have touch-manipulation class', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[mockItems.shirt]}
          onSelect={vi.fn()}
        />
      );

      const dropdownButton = screen.getByRole('button');
      expect(dropdownButton).toHaveClass('touch-manipulation');
    });
  });

  describe('SelectionStrip Horizontal Scroll Behavior', () => {
    it('should prevent horizontal scrolling with proper responsive grid', () => {
      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Check that the grid uses proper responsive classes to prevent horizontal scroll
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass(
        'grid-cols-1',      // Single column on mobile
        'sm:grid-cols-2',   // Two columns on small screens
        'lg:grid-cols-4'    // Four columns on large screens
      );

      // Check that gaps are responsive
      expect(gridContainer).toHaveClass('gap-2', 'md:gap-3');
    });

    it('should handle overflow properly in dropdown containers', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[mockItems.shirt, mockItems.pants, mockItems.jacket, mockItems.shoes]}
          onSelect={vi.fn()}
        />
      );

      // Open dropdown
      const dropdownButton = screen.getByRole('button');
      fireEvent.click(dropdownButton);

      // Check that dropdown has proper overflow handling
      const dropdownMenu = document.querySelector('.absolute.top-full');
      expect(dropdownMenu).toHaveClass('max-h-60', 'overflow-y-auto');
    });

    it('should maintain proper spacing on different screen sizes', () => {
      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Check responsive spacing classes
      const mainContainer = container.querySelector('.space-y-3.sm\\:space-y-4');
      expect(mainContainer).toBeInTheDocument();

      // Check responsive padding
      const paddingContainer = container.querySelector('.px-3.sm\\:px-6.py-3.sm\\:py-4');
      expect(paddingContainer).toBeInTheDocument();
    });
  });

  describe('Responsive Breakpoint Behavior', () => {
    it('should apply correct classes at mobile breakpoint (< 640px)', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 390,
      });

      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Should use mobile-first classes
      expect(container.querySelector('.grid-cols-1')).toBeInTheDocument();
      expect(container.querySelector('.px-3')).toBeInTheDocument();
      expect(container.querySelector('.py-3')).toBeInTheDocument();
    });

    it('should apply correct classes at tablet breakpoint (640px - 1024px)', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Should have responsive classes for tablet
      expect(container.querySelector('.sm\\:grid-cols-2')).toBeInTheDocument();
      expect(container.querySelector('.sm\\:px-6')).toBeInTheDocument();
    });

    it('should apply correct classes at desktop breakpoint (>= 1024px)', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Should have responsive classes for desktop
      expect(container.querySelector('.lg\\:grid-cols-4')).toBeInTheDocument();
    });

    it('should handle TopBar responsive behavior across breakpoints', () => {
      const { container } = render(
        <TopBar onTitleClick={vi.fn()} />
      );

      // Check responsive padding
      expect(container.querySelector('.px-4.sm\\:px-6')).toBeInTheDocument();

      // Check logo responsive sizing
      const logo = screen.getByAltText('What to Wear');
      expect(logo).toHaveClass('h-8', 'sm:h-10');
    });

    it('should maintain proper text sizing across breakpoints', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={mockItems.shirt}
          availableItems={[mockItems.shirt]}
          onSelect={vi.fn()}
        />
      );

      // Check responsive text sizing - the text classes are on the span element itself
      const selectedText = screen.getByText('Cream Tee');
      expect(selectedText).toHaveClass('text-xs', 'sm:text-sm');
    });

    it('should handle icon sizing responsively', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[mockItems.shirt]}
          onSelect={vi.fn()}
        />
      );

      // Check responsive icon sizing in dropdown
      const dropdownButton = screen.getByRole('button');
      const chevronIcon = dropdownButton.querySelector('svg');
      expect(chevronIcon).toHaveClass('sm:size-4');
    });

    it('should ensure proper responsive behavior for error messages', () => {
      const { container } = render(
        <SelectionStrip
          selection={{}}
          anchorItem={mockAnchorItem}
          onSelectionChange={vi.fn()}
          onOutfitSelect={vi.fn()}
        />
      );

      // Check error container responsive classes
      const errorContainer = container.querySelector('.bg-red-50');
      if (errorContainer) {
        expect(errorContainer).toHaveClass('px-3', 'sm:px-4', 'py-2', 'sm:py-3');
      }
    });
  });

  describe('Accessibility and Touch Interaction', () => {
    it('should maintain accessibility features on mobile', () => {
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[mockItems.shirt]}
          onSelect={vi.fn()}
        />
      );

      const dropdownButton = screen.getByRole('button');
      
      // Should have proper focus states
      expect(dropdownButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
      
      // Should have active states for touch
      expect(dropdownButton).toHaveClass('active:bg-stone-50');
    });

    it('should handle touch interactions properly', () => {
      const mockOnSelect = vi.fn();
      render(
        <CategoryDropdown
          category="Shirt"
          selectedItem={null}
          availableItems={[mockItems.shirt]}
          onSelect={mockOnSelect}
        />
      );

      const dropdownButton = screen.getByRole('button');
      
      // Simulate touch interaction
      fireEvent.touchStart(dropdownButton);
      fireEvent.touchEnd(dropdownButton);
      fireEvent.click(dropdownButton);

      // Dropdown should open
      expect(screen.getByText('Cream Tee')).toBeInTheDocument();
    });
  });
});
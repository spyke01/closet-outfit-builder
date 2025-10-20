import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../top-bar';
import { ItemsGrid } from '../items-grid';
import { SelectionStrip } from '../selection-strip';
import { OutfitDisplay } from '../outfit-display';
import type { WardrobeItem, OutfitSelection } from '@/lib/schemas';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }),
}));

// Mock hooks
vi.mock('@/lib/hooks', () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
  useWeather: vi.fn(() => ({ current: null, loading: false, error: null, retry: vi.fn() })),
  useShowWeather: vi.fn(() => false),
}));

// Test data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
};

const mockWardrobeItem: WardrobeItem = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  user_id: '123e4567-e89b-12d3-a456-426614174000',
  category_id: '123e4567-e89b-12d3-a456-426614174002',
  name: 'Test Shirt',
  brand: 'Test Brand',
  color: 'Blue',
  material: 'Cotton',
  formality_score: 5,
  capsule_tags: ['Refined'],
  season: ['All'],
  image_url: 'https://example.com/shirt.jpg',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockOutfitSelection: OutfitSelection = {
  shirt: mockWardrobeItem,
  pants: {
    ...mockWardrobeItem,
    id: '123e4567-e89b-12d3-a456-426614174003',
    name: 'Test Pants',
    category_id: '123e4567-e89b-12d3-a456-426614174004',
  },
  shoes: {
    ...mockWardrobeItem,
    id: '123e4567-e89b-12d3-a456-426614174005',
    name: 'Test Shoes',
    category_id: '123e4567-e89b-12d3-a456-426614174006',
  },
  tuck_style: 'Untucked',
};

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
};

// Utility function to mock viewport size
const mockViewport = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

describe('Responsive Design Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    // Reset viewport to default
    mockViewport(1024);
  });

  describe('Mobile Viewport (320px - 767px)', () => {
    beforeEach(() => {
      mockViewport(375); // iPhone SE width
    });

    describe('TopBar Mobile Layout', () => {
      it('hides user email on mobile', () => {
        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        const emailElement = screen.getByText('test@example.com');
        expect(emailElement).toHaveClass('hidden', 'sm:inline');
      });

      it('maintains proper spacing on mobile', () => {
        const { container } = render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        const topBarContainer = container.querySelector('.px-4');
        expect(topBarContainer).toHaveClass('px-4', 'sm:px-6');
      });

      it('uses smaller logo on mobile', () => {
        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        const logo = screen.getByLabelText('Navigate to home').querySelector('svg');
        expect(logo).toHaveClass('h-8', 'sm:h-10');
      });
    });

    describe('ItemsGrid Mobile Layout', () => {
      it('uses 2-column grid on mobile', () => {
        const { container } = render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const gridContainer = container.querySelector('.grid');
        expect(gridContainer).toHaveClass('grid-cols-2');
      });

      it('uses proper touch targets (44px minimum)', () => {
        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const itemButton = screen.getByLabelText('Select Test Brand Test Shirt for outfit building');
        expect(itemButton).toHaveClass('min-h-[80px]', 'touch-manipulation');

        // Search input should also have proper touch target
        const searchInput = screen.getByPlaceholderText('Search items...');
        expect(searchInput).toHaveClass('min-h-[44px]');

        // Tag buttons should have proper touch targets
        const tagButtons = screen.getAllByRole('button').filter(button => 
          ['Refined', 'Adventurer', 'Crossover', 'Shorts'].includes(button.textContent || '')
        );
        tagButtons.forEach(button => {
          expect(button).toHaveClass('min-h-[44px]');
        });
      });

      it('stacks search and filters vertically on mobile', () => {
        const { container } = render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const controlsContainer = container.querySelector('.space-y-3');
        expect(controlsContainer).toHaveClass('space-y-3', 'sm:space-y-4');
      });

      it('allows tag buttons to wrap on mobile', () => {
        const { container } = render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const tagContainer = container.querySelector('.flex-wrap');
        expect(tagContainer).toHaveClass('flex-wrap');
      });
    });

    describe('SelectionStrip Mobile Layout', () => {
      it('stacks category dropdowns vertically on mobile', () => {
        const { container } = render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const dropdownContainer = container.querySelector('.grid');
        expect(dropdownContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
      });

      it('uses proper spacing on mobile', () => {
        const { container } = render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const stripContainer = container.querySelector('.px-3');
        expect(stripContainer).toHaveClass('px-3', 'sm:px-6');
        
        const spacingContainer = container.querySelector('.space-y-3');
        expect(spacingContainer).toHaveClass('space-y-3', 'sm:space-y-4');
      });
    });

    describe('OutfitDisplay Mobile Layout', () => {
      it('uses full width buttons on mobile', () => {
        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        const randomizeButton = screen.getByText('Try Another Combination');
        expect(randomizeButton).toHaveClass('w-full', 'sm:w-auto');
      });

      it('maintains proper padding on mobile', () => {
        const { container } = render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        const displayContainer = container.querySelector('.p-4');
        expect(displayContainer).toHaveClass('p-4', 'sm:p-6');
      });
    });
  });

  describe('Tablet Viewport (768px - 1023px)', () => {
    beforeEach(() => {
      mockViewport(768); // iPad width
    });

    describe('ItemsGrid Tablet Layout', () => {
      it('uses 3-column grid on tablet', () => {
        const { container } = render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const gridContainer = container.querySelector('.grid');
        expect(gridContainer).toHaveClass('sm:grid-cols-3');
      });

      it('shows horizontal layout for search and filters', () => {
        const { container } = render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const controlsContainer = container.querySelector('.sm\\:space-y-4');
        expect(controlsContainer).toHaveClass('sm:space-y-4');
      });
    });

    describe('SelectionStrip Tablet Layout', () => {
      it('uses 2-column grid for dropdowns on tablet', () => {
        const { container } = render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const dropdownContainer = container.querySelector('.grid');
        expect(dropdownContainer).toHaveClass('sm:grid-cols-2');
      });
    });

    describe('TopBar Tablet Layout', () => {
      it('shows user email on tablet and larger', () => {
        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        const emailElement = screen.getByText('test@example.com');
        expect(emailElement).toHaveClass('sm:inline');
      });

      it('uses larger logo on tablet', () => {
        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        const logo = screen.getByLabelText('Navigate to home').querySelector('svg');
        expect(logo).toHaveClass('sm:h-10');
      });
    });
  });

  describe('Desktop Viewport (1024px+)', () => {
    beforeEach(() => {
      mockViewport(1440); // Desktop width
    });

    describe('ItemsGrid Desktop Layout', () => {
      it('uses maximum 6-column grid on desktop', () => {
        const { container } = render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={Array(12).fill(mockWardrobeItem).map((item, index) => ({
                ...item,
                id: `item-${index}`,
                name: `Item ${index}`,
              }))}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const gridContainer = container.querySelector('.grid');
        expect(gridContainer).toHaveClass(
          'md:grid-cols-4',
          'lg:grid-cols-5',
          'xl:grid-cols-6'
        );
      });

      it('uses optimal spacing on desktop', () => {
        const { container } = render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const gridContainer = container.querySelector('.gap-3');
        expect(gridContainer).toHaveClass('gap-3', 'sm:gap-4');
      });
    });

    describe('SelectionStrip Desktop Layout', () => {
      it('uses 5-column grid for all categories on desktop', () => {
        const { container } = render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const dropdownContainer = container.querySelector('.grid');
        expect(dropdownContainer).toHaveClass('lg:grid-cols-5');
      });

      it('uses optimal spacing on desktop', () => {
        const { container } = render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const gapContainer = container.querySelector('.gap-2');
        expect(gapContainer).toHaveClass('gap-2', 'md:gap-3');
      });
    });

    describe('OutfitDisplay Desktop Layout', () => {
      it('uses auto-width buttons on desktop', () => {
        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        const randomizeButton = screen.getByText('Try Another Combination');
        expect(randomizeButton).toHaveClass('sm:w-auto');
      });

      it('centers content with max width on desktop', () => {
        const { container } = render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        const contentContainer = container.querySelector('.max-w-2xl');
        expect(contentContainer).toHaveClass('max-w-2xl', 'mx-auto');
      });
    });
  });

  describe('Breakpoint Transitions', () => {
    it('handles viewport changes smoothly', () => {
      const { container, rerender } = render(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[mockWardrobeItem]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      // Start mobile
      mockViewport(375);
      rerender(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[mockWardrobeItem]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      let gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-2');

      // Switch to tablet
      mockViewport(768);
      rerender(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[mockWardrobeItem]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('sm:grid-cols-3');

      // Switch to desktop
      mockViewport(1440);
      rerender(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[mockWardrobeItem]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('xl:grid-cols-6');
    });
  });

  describe('Accessibility on Different Screen Sizes', () => {
    it('maintains proper focus indicators across screen sizes', () => {
      // Mobile
      mockViewport(375);
      const { rerender } = render(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[mockWardrobeItem]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      let itemButton = screen.getByLabelText('Select Test Brand Test Shirt for outfit building');
      expect(itemButton).toHaveClass('focus:outline-none', 'focus:ring-2');

      // Desktop
      mockViewport(1440);
      rerender(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[mockWardrobeItem]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      itemButton = screen.getByLabelText('Select Test Brand Test Shirt for outfit building');
      expect(itemButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('maintains proper ARIA labels across screen sizes', () => {
      // Test that ARIA labels remain consistent across breakpoints
      mockViewport(375);
      const { rerender } = render(
        <TestWrapper>
          <TopBar user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Navigate to home')).toBeInTheDocument();
      expect(screen.getByLabelText('Open settings')).toBeInTheDocument();

      mockViewport(1440);
      rerender(
        <TestWrapper>
          <TopBar user={mockUser} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Navigate to home')).toBeInTheDocument();
      expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
    });
  });

  describe('Performance Across Screen Sizes', () => {
    it('uses appropriate image sizes for different viewports', () => {
      const itemWithImage = {
        ...mockWardrobeItem,
        image_url: 'https://example.com/shirt.jpg',
      };

      render(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[itemWithImage]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      const image = screen.getByAltText('Test Shirt');
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveClass('w-full', 'h-20', 'object-cover');
    });

    it('uses efficient grid layouts that minimize reflows', () => {
      const { container } = render(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={Array(20).fill(mockWardrobeItem).map((item, index) => ({
              ...item,
              id: `item-${index}`,
              name: `Item ${index}`,
            }))}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('transition-opacity', 'duration-200');
    });
  });
});
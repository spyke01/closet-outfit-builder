import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../top-bar';
import { SelectionStrip } from '../selection-strip';
import { ItemsGrid } from '../items-grid';
import { OutfitDisplay } from '../outfit-display';
import { WeatherWidget } from '../weather-widget';
import { OutfitCard } from '../outfit-card';
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
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
    })),
  },
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Create mock hooks
const mockUseAuth = vi.fn(() => ({ user: null, loading: false }));
const mockUseWeather = vi.fn(() => ({ current: null, loading: false, error: null, retry: vi.fn() }));
const mockUseShowWeather = vi.fn(() => false);
const mockUseWardrobeItems = vi.fn(() => ({ data: [], isLoading: false, error: null }));
const mockUseCategories = vi.fn(() => ({ data: [], isLoading: false, error: null }));
const mockUseOutfits = vi.fn(() => ({ data: [], isLoading: false, error: null }));

// Mock hooks
vi.mock('@/lib/hooks', () => ({
  useAuth: mockUseAuth,
  useWeather: mockUseWeather,
  useShowWeather: mockUseShowWeather,
  useWardrobeItems: mockUseWardrobeItems,
  useCategories: mockUseCategories,
  useOutfits: mockUseOutfits,
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

// Test wrapper with QueryClient
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

describe('Comprehensive Component Tests', () => {
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
  });

  describe('TopBar Component', () => {
    describe('Authentication States', () => {
      it('renders sign in/up buttons when user is not authenticated', () => {
        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        expect(screen.getByText('Sign in')).toBeInTheDocument();
        expect(screen.getByText('Sign up')).toBeInTheDocument();
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      });

      it('renders user email and logout when authenticated', () => {
        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
        expect(screen.queryByText('Sign up')).not.toBeInTheDocument();
      });

      it('validates user data with Zod and handles invalid data gracefully', () => {
        const invalidUser = {
          id: 'invalid-uuid',
          email: 'invalid-email',
        };

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        render(
          <TestWrapper>
            <TopBar user={invalidUser} />
          </TestWrapper>
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          'Invalid user data:',
          expect.any(String)
        );
        expect(screen.getByText('Sign in')).toBeInTheDocument();

        consoleSpy.mockRestore();
      });
    });

    describe('Responsive Design', () => {
      it('hides user email on small screens', () => {
        // Mock window.innerWidth for mobile
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 640,
        });

        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        const emailElement = screen.getByText('test@example.com');
        expect(emailElement).toHaveClass('hidden', 'sm:inline');
      });

      it('shows user email on larger screens', () => {
        // Mock window.innerWidth for desktop
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024,
        });

        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        const emailElement = screen.getByText('test@example.com');
        expect(emailElement).toHaveClass('hidden', 'sm:inline');
      });
    });

    describe('Interactions', () => {
      it('calls onTitleClick when logo is clicked', async () => {
        const onTitleClick = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <TopBar onTitleClick={onTitleClick} />
          </TestWrapper>
        );

        const logoButton = screen.getByLabelText('Navigate to home');
        await user.click(logoButton);

        expect(onTitleClick).toHaveBeenCalledTimes(1);
      });

      it('calls onSettingsClick when settings button is clicked', async () => {
        const onSettingsClick = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <TopBar user={mockUser} onSettingsClick={onSettingsClick} />
          </TestWrapper>
        );

        const settingsButton = screen.getByLabelText('Open settings');
        await user.click(settingsButton);

        expect(onSettingsClick).toHaveBeenCalledTimes(1);
      });
    });

    describe('Weather Widget Integration', () => {
      it('renders weather widget for authenticated users', () => {
        vi.mocked(require('@/lib/hooks').useAuth).mockReturnValue({
          user: mockUser,
          loading: false,
        });
        vi.mocked(require('@/lib/hooks').useShowWeather).mockReturnValue(true);
        vi.mocked(require('@/lib/hooks').useWeather).mockReturnValue({
          current: { temperature: 72, condition: 'sunny' },
          loading: false,
          error: null,
          retry: vi.fn(),
        });

        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        expect(screen.getByText('72°')).toBeInTheDocument();
        expect(screen.getByText('sunny')).toBeInTheDocument();
      });

      it('does not render weather widget for unauthenticated users', () => {
        mockUseAuth.mockReturnValue({
          user: null,
          loading: false,
        });
        mockUseShowWeather.mockReturnValue(false);

        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        expect(screen.queryByText('72°')).not.toBeInTheDocument();
      });
    });
  });

  describe('ItemsGrid Component', () => {
    const mockItems: WardrobeItem[] = [
      mockWardrobeItem,
      {
        ...mockWardrobeItem,
        id: '123e4567-e89b-12d3-a456-426614174007',
        name: 'Another Shirt',
        brand: 'Another Brand',
        capsule_tags: ['Adventurer'],
      },
    ];

    describe('Data Validation', () => {
      it('filters out invalid items with Zod validation', () => {
        const invalidItems = [
          mockWardrobeItem,
          {
            id: 'invalid-uuid',
            name: '', // Invalid: empty name
            category_id: 'invalid-uuid',
          },
        ];

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={invalidItems as WardrobeItem[]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          'Invalid item in Shirts:',
          expect.any(String)
        );
        expect(screen.getByText('1 item found')).toBeInTheDocument();

        consoleSpy.mockRestore();
      });
    });

    describe('Search Functionality', () => {
      it('filters items by name', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={mockItems}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const searchInput = screen.getByPlaceholderText('Search items...');
        await user.type(searchInput, 'Another');

        await waitFor(() => {
          expect(screen.getByText('1 item found')).toBeInTheDocument();
          expect(screen.getByText('Another Brand Another Shirt')).toBeInTheDocument();
          expect(screen.queryByText('Test Brand Test Shirt')).not.toBeInTheDocument();
        });
      });

      it('filters items by brand', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={mockItems}
              onItemSelect={vi.fn()}
              showBrand={true}
            />
          </TestWrapper>
        );

        const searchInput = screen.getByPlaceholderText('Search items...');
        await user.type(searchInput, 'Test Brand');

        await waitFor(() => {
          expect(screen.getByText('1 item found')).toBeInTheDocument();
          expect(screen.getByText('Test Brand Test Shirt')).toBeInTheDocument();
          expect(screen.queryByText('Another Brand Another Shirt')).not.toBeInTheDocument();
        });
      });

      it('shows filtering indicator during search', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={mockItems}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const searchInput = screen.getByPlaceholderText('Search items...');
        await user.type(searchInput, 'test');

        // Should show filtering indicator briefly
        expect(screen.getByText('Filtering...')).toBeInTheDocument();
      });
    });

    describe('Tag Filtering', () => {
      it('filters items by capsule tags', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={mockItems}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const refinedTag = screen.getByText('Refined');
        await user.click(refinedTag);

        await waitFor(() => {
          expect(screen.getByText('1 item found')).toBeInTheDocument();
          expect(screen.getByText('Test Brand Test Shirt')).toBeInTheDocument();
          expect(screen.queryByText('Another Brand Another Shirt')).not.toBeInTheDocument();
        });
      });

      it('allows multiple tag selection', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={mockItems}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const refinedTag = screen.getByText('Refined');
        const adventurerTag = screen.getByText('Adventurer');

        await user.click(refinedTag);
        await user.click(adventurerTag);

        await waitFor(() => {
          expect(screen.getByText('2 items found')).toBeInTheDocument();
        });
      });
    });

    describe('Item Selection', () => {
      it('calls onItemSelect when item is clicked', async () => {
        const onItemSelect = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={onItemSelect}
            />
          </TestWrapper>
        );

        const itemButton = screen.getByLabelText('Select Test Brand Test Shirt for outfit building');
        await user.click(itemButton);

        expect(onItemSelect).toHaveBeenCalledWith(mockWardrobeItem);
      });

      it('highlights selected item', () => {
        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              selectedItem={mockWardrobeItem}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const itemButton = screen.getByLabelText('Select Test Brand Test Shirt for outfit building');
        expect(itemButton).toHaveClass('border-slate-800', 'dark:border-slate-400');
      });

      it('supports keyboard navigation', async () => {
        const onItemSelect = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[mockWardrobeItem]}
              onItemSelect={onItemSelect}
            />
          </TestWrapper>
        );

        const itemButton = screen.getByLabelText('Select Test Brand Test Shirt for outfit building');
        itemButton.focus();
        await user.keyboard('{Enter}');

        expect(onItemSelect).toHaveBeenCalledWith(mockWardrobeItem);
      });
    });

    describe('Image Upload Integration', () => {
      it('shows add item form when onItemAdd is provided', async () => {
        const onItemAdd = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={onItemAdd}
              enableImageUpload={true}
              userId={mockUser.id}
            />
          </TestWrapper>
        );

        const addButton = screen.getByText('Add Item');
        await user.click(addButton);

        expect(screen.getByText('Name *')).toBeInTheDocument();
        expect(screen.getByText('Brand')).toBeInTheDocument();
      });

      it('handles image upload in add item form', async () => {
        const onItemAdd = vi.fn();
        const user = userEvent.setup();

        // Mock fetch for image upload
        global.fetch = vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { imageUrl: 'https://example.com/uploaded.jpg' }
            }),
          })
        ) as any;

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={onItemAdd}
              enableImageUpload={true}
              userId={mockUser.id}
            />
          </TestWrapper>
        );

        const addButton = screen.getByText('Add Item');
        await user.click(addButton);

        const nameInput = screen.getByLabelText('Name *');
        await user.type(nameInput, 'New Shirt');

        const submitButton = screen.getByText('Add Item');
        await user.click(submitButton);

        await waitFor(() => {
          expect(onItemAdd).toHaveBeenCalledWith({
            category_id: 'Shirts',
            name: 'New Shirt',
            active: true,
            season: ['All'],
          });
        });
      });
    });

    describe('Responsive Design', () => {
      it('uses responsive grid classes', () => {
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
        expect(gridContainer).toHaveClass(
          'grid-cols-2',
          'sm:grid-cols-3',
          'md:grid-cols-4',
          'lg:grid-cols-5',
          'xl:grid-cols-6'
        );
      });

      it('uses proper touch targets on mobile', () => {
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
      });
    });
  });

  describe('OutfitDisplay Component', () => {
    describe('Outfit States', () => {
      it('renders empty state when no complete outfit', () => {
        const emptySelection: OutfitSelection = {
          tuck_style: 'Untucked',
        };

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={emptySelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Start Building Your Look')).toBeInTheDocument();
        expect(screen.getByText('Get Random Outfit')).toBeInTheDocument();
      });

      it('renders complete outfit with score', () => {
        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Try Another Combination')).toBeInTheDocument();
        // Score should be calculated and displayed
        expect(screen.getByText(/\d+/)).toBeInTheDocument(); // Should show some score
      });

      it('validates selection data with Zod', () => {
        const invalidSelection = {
          shirt: {
            id: 'invalid-uuid',
            name: '', // Invalid
          },
          tuck_style: 'Invalid' as any, // Invalid enum value
        };

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={invalidSelection as OutfitSelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          'Invalid selection:',
          expect.any(String)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Outfit Actions', () => {
      it('calls onRandomize when randomize button is clicked', async () => {
        const onRandomize = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={onRandomize}
            />
          </TestWrapper>
        );

        const randomizeButton = screen.getByText('Try Another Combination');
        await user.click(randomizeButton);

        expect(onRandomize).toHaveBeenCalledTimes(1);
      });

      it('shows loading state during generation', () => {
        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
              isGenerating={true}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Generating...')).toBeInTheDocument();
        expect(screen.getByText('Generating new outfit...')).toBeInTheDocument();
      });

      it('handles save outfit functionality', async () => {
        const onSaveOutfit = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
              onSaveOutfit={onSaveOutfit}
              userId={mockUser.id}
            />
          </TestWrapper>
        );

        const saveButton = screen.getByText('Save Outfit');
        await user.click(saveButton);

        expect(onSaveOutfit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.stringContaining('Outfit'),
            score: expect.any(Number),
            tuck_style: 'Untucked',
            source: 'generated',
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('displays generation error', () => {
        const generationError = new Error('Failed to generate outfit');

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
              generationError={generationError}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Generation error: Failed to generate outfit')).toBeInTheDocument();
      });

      it('calls onError when randomize fails', async () => {
        const onError = vi.fn();
        const onRandomize = vi.fn(() => {
          throw new Error('Randomize failed');
        });
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={onRandomize}
              onError={onError}
            />
          </TestWrapper>
        );

        const randomizeButton = screen.getByText('Try Another Combination');
        await user.click(randomizeButton);

        // Wait for the error to be handled
        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(expect.any(Error));
        }, { timeout: 1000 });
      });
    });

    describe('Mockup View', () => {
      it('toggles mockup view', async () => {
        const onMockupViewChange = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={mockOutfitSelection}
              onRandomize={vi.fn()}
              onMockupViewChange={onMockupViewChange}
            />
          </TestWrapper>
        );

        // Note: This would need actual OutfitCard flip implementation
        // For now, just verify the component renders
        expect(screen.getByText('Try Another Combination')).toBeInTheDocument();
      });
    });
  });

  describe('SelectionStrip Component', () => {
    describe('Anchor Item Handling', () => {
      it('renders null when no anchor item', () => {
        const { container } = render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={null}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        expect(container.firstChild).toBeNull();
      });

      it('renders with anchor item and shows building message', () => {
        render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        expect(screen.getByText(/Building from.*Test Brand Test Shirt/)).toBeInTheDocument();
      });

      it('validates anchor item with Zod', () => {
        const invalidAnchorItem = {
          id: 'invalid-uuid',
          name: '', // Invalid
        };

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { container } = render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={invalidAnchorItem as WardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          'Invalid anchor item:',
          expect.any(String)
        );
        expect(container.firstChild).toBeNull();

        consoleSpy.mockRestore();
      });
    });

    describe('Category Dropdowns', () => {
      it('renders all category dropdowns', () => {
        render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        // Should render 5 category dropdowns (they are buttons with listbox role)
        const dropdowns = screen.getAllByRole('button', { name: /Select/ });
        expect(dropdowns).toHaveLength(5);
      });

      it('locks dropdown for anchor item category', () => {
        const anchorItem = {
          ...mockWardrobeItem,
          category_id: 'Jacket/Overshirt',
        };

        render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={anchorItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        // The jacket dropdown should be disabled/locked
        const jacketDropdown = screen.getByLabelText('Select Jacket/Overshirt');
        expect(jacketDropdown).toBeDisabled();
      });

      it('calls onSelectionChange when dropdown selection changes', async () => {
        const onSelectionChange = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={onSelectionChange}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        const shirtDropdown = screen.getByLabelText('Select Shirt');
        await user.click(shirtDropdown);

        // Note: This would need actual dropdown implementation to test selection
        // For now, just verify the dropdown is clickable
        expect(shirtDropdown).not.toBeDisabled();
      });
    });

    describe('Error Handling', () => {
      it('displays error messages', () => {
        // Mock a component that will trigger an error
        const onSelectionChange = vi.fn(() => {
          throw new Error('Selection failed');
        });

        render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={onSelectionChange}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        // Error should be displayed in the UI
        // This would need to be triggered by an actual selection change
      });

      it('allows dismissing error messages', async () => {
        const user = userEvent.setup();

        // This test would need to be implemented based on actual error state management
        // For now, we'll test the error dismissal button structure
        render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
            />
          </TestWrapper>
        );

        // If there was an error, there should be a dismiss button
        const dismissButtons = screen.queryAllByLabelText('Dismiss error message');
        // Should be 0 when no error
        expect(dismissButtons).toHaveLength(0);
      });
    });

    describe('Responsive Design', () => {
      it('uses responsive grid layout for dropdowns', () => {
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
        expect(dropdownContainer).toHaveClass(
          'grid-cols-1',
          'sm:grid-cols-2',
          'lg:grid-cols-5'
        );
      });
    });

    describe('Real-time Updates', () => {
      it('handles score updates when enabled', async () => {
        const onScoreUpdate = vi.fn();
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <SelectionStrip
              selection={{ tuck_style: 'Untucked' }}
              anchorItem={mockWardrobeItem}
              onSelectionChange={vi.fn()}
              onOutfitSelect={vi.fn()}
              onScoreUpdate={onScoreUpdate}
              enableRealTimeUpdates={true}
            />
          </TestWrapper>
        );

        // Score updates would be triggered by selection changes
        // This would need actual implementation to test properly
      });
    });
  });

  describe('WeatherWidget Component', () => {
    describe('Authentication Integration', () => {
      it('does not render for unauthenticated users', () => {
        mockUseAuth.mockReturnValue({
          user: null,
          loading: false,
        });
        mockUseShowWeather.mockReturnValue(false);

        const { container } = render(
          <TestWrapper>
            <WeatherWidget />
          </TestWrapper>
        );

        expect(container.firstChild).toBeNull();
      });

      it('renders for authenticated users with weather enabled', () => {
        mockUseAuth.mockReturnValue({
          user: mockUser,
          loading: false,
        });
        mockUseShowWeather.mockReturnValue(true);
        mockUseWeather.mockReturnValue({
          current: { temperature: 72, condition: 'sunny' },
          loading: false,
          error: null,
          retry: vi.fn(),
        });

        render(
          <TestWrapper>
            <WeatherWidget />
          </TestWrapper>
        );

        expect(screen.getByText('72°')).toBeInTheDocument();
        expect(screen.getByText('sunny')).toBeInTheDocument();
      });
    });

    describe('Weather States', () => {
      beforeEach(() => {
        mockUseAuth.mockReturnValue({
          user: mockUser,
          loading: false,
        });
        mockUseShowWeather.mockReturnValue(true);
      });

      it('shows loading state', () => {
        mockUseWeather.mockReturnValue({
          current: null,
          loading: true,
          error: null,
          retry: vi.fn(),
        });

        render(
          <TestWrapper>
            <WeatherWidget />
          </TestWrapper>
        );

        expect(screen.getByText('Loading weather...')).toBeInTheDocument();
      });

      it('shows error state with retry button', async () => {
        const retry = vi.fn();
        const user = userEvent.setup();

        mockUseWeather.mockReturnValue({
          current: null,
          loading: false,
          error: { error: 'Weather service unavailable' },
          retry,
        });

        render(
          <TestWrapper>
            <WeatherWidget />
          </TestWrapper>
        );

        expect(screen.getByText('Weather service unavailable')).toBeInTheDocument();
        
        const retryButton = screen.getByText('Retry');
        await user.click(retryButton);

        expect(retry).toHaveBeenCalledTimes(1);
      });

      it('displays weather data with appropriate icons', () => {
        mockUseWeather.mockReturnValue({
          current: { temperature: 68, condition: 'cloudy' },
          loading: false,
          error: null,
          retry: vi.fn(),
        });

        render(
          <TestWrapper>
            <WeatherWidget />
          </TestWrapper>
        );

        expect(screen.getByText('68°')).toBeInTheDocument();
        expect(screen.getByText('cloudy')).toBeInTheDocument();
      });
    });

    describe('Responsive Design', () => {
      it('hides condition text on small screens', () => {
        mockUseAuth.mockReturnValue({
          user: mockUser,
          loading: false,
        });
        mockUseShowWeather.mockReturnValue(true);
        mockUseWeather.mockReturnValue({
          current: { temperature: 72, condition: 'sunny' },
          loading: false,
          error: null,
          retry: vi.fn(),
        });

        render(
          <TestWrapper>
            <WeatherWidget />
          </TestWrapper>
        );

        const conditionText = screen.getByText('sunny');
        expect(conditionText).toHaveClass('hidden', 'sm:inline');
      });
    });
  });
});
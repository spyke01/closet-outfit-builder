import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../top-bar';
import { WeatherWidget } from '../weather-widget';
import { ItemsGrid } from '../items-grid';
import { OutfitDisplay } from '../outfit-display';
import { SelectionStrip } from '../selection-strip';
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
    onAuthStateChange: vi.fn(() => ({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    })),
    signOut: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Test data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  app_metadata: { provider: 'email' },
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

describe('Authentication State Handling Tests', () => {
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

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      // Mock unauthenticated state
      vi.doMock('@/lib/hooks', () => ({
        useAuth: vi.fn(() => ({ user: null, loading: false })),
        useWeather: vi.fn(() => ({ current: null, loading: false, error: null, retry: vi.fn() })),
        useShowWeather: vi.fn(() => false),
        useWardrobeItems: vi.fn(() => ({ data: [], isLoading: false, error: null })),
        useCategories: vi.fn(() => ({ data: [], isLoading: false, error: null })),
        useOutfits: vi.fn(() => ({ data: [], isLoading: false, error: null })),
      }));
    });

    describe('TopBar Unauthenticated', () => {
      it('shows sign in and sign up buttons', () => {
        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        expect(screen.getByText('Sign in')).toBeInTheDocument();
        expect(screen.getByText('Sign up')).toBeInTheDocument();
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      });

      it('does not show settings button when unauthenticated', () => {
        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        expect(screen.queryByLabelText('Open settings')).not.toBeInTheDocument();
      });

      it('does not show logout button when unauthenticated', () => {
        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
      });

      it('navigates to home page when logo is clicked while unauthenticated', async () => {
        const user = userEvent.setup();
        
        // Mock window.location
        delete (window as any).location;
        window.location = { href: '' } as any;

        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        const logoButton = screen.getByLabelText('Navigate to home');
        await user.click(logoButton);

        expect(window.location.href).toBe('/');
      });
    });

    describe('WeatherWidget Unauthenticated', () => {
      it('does not render weather widget when unauthenticated', () => {
        const { container } = render(
          <TestWrapper>
            <WeatherWidget />
          </TestWrapper>
        );

        expect(container.firstChild).toBeNull();
      });
    });

    describe('Protected Features Unauthenticated', () => {
      it('does not show add item functionality when unauthenticated', () => {
        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        expect(screen.queryByText('Add Item')).not.toBeInTheDocument();
      });

      it('does not show save outfit functionality when unauthenticated', () => {
        const completeSelection: OutfitSelection = {
          shirt: mockWardrobeItem,
          pants: { ...mockWardrobeItem, id: 'pants-id', name: 'Pants' },
          shoes: { ...mockWardrobeItem, id: 'shoes-id', name: 'Shoes' },
          tuck_style: 'Untucked',
        };

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={completeSelection}
              onRandomize={vi.fn()}
            />
          </TestWrapper>
        );

        expect(screen.queryByText('Save Outfit')).not.toBeInTheDocument();
      });
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      // Mock authenticated state
      vi.doMock('@/lib/hooks', () => ({
        useAuth: vi.fn(() => ({ user: mockUser, loading: false })),
        useWeather: vi.fn(() => ({ 
          current: { temperature: 72, condition: 'sunny' }, 
          loading: false, 
          error: null, 
          retry: vi.fn() 
        })),
        useShowWeather: vi.fn(() => true),
        useWardrobeItems: vi.fn(() => ({ data: [mockWardrobeItem], isLoading: false, error: null })),
        useCategories: vi.fn(() => ({ data: [], isLoading: false, error: null })),
        useOutfits: vi.fn(() => ({ data: [], isLoading: false, error: null })),
      }));
    });

    describe('TopBar Authenticated', () => {
      it('shows user email and logout button', () => {
        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Sign out')).toBeInTheDocument();
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
        expect(screen.queryByText('Sign up')).not.toBeInTheDocument();
      });

      it('shows settings button when authenticated and callback provided', () => {
        render(
          <TestWrapper>
            <TopBar user={mockUser} onSettingsClick={vi.fn()} />
          </TestWrapper>
        );

        expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
      });

      it('navigates to wardrobe when logo is clicked while authenticated', async () => {
        const user = userEvent.setup();
        
        // Mock window.location
        delete (window as any).location;
        window.location = { href: '' } as any;

        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        const logoButton = screen.getByLabelText('Navigate to home');
        await user.click(logoButton);

        expect(window.location.href).toBe('/wardrobe');
      });

      it('handles logout action', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <TopBar user={mockUser} />
          </TestWrapper>
        );

        const logoutButton = screen.getByText('Sign out');
        await user.click(logoutButton);

        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      });
    });

    describe('WeatherWidget Authenticated', () => {
      it('renders weather widget when authenticated', () => {
        // Mock authenticated weather state
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
            <WeatherWidget />
          </TestWrapper>
        );

        expect(screen.getByText('72°')).toBeInTheDocument();
        expect(screen.getByText('sunny')).toBeInTheDocument();
      });
    });

    describe('Protected Features Authenticated', () => {
      it('shows add item functionality when authenticated', () => {
        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={vi.fn()}
              userId={mockUser.id}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Add Item')).toBeInTheDocument();
      });

      it('shows save outfit functionality when authenticated', () => {
        const completeSelection: OutfitSelection = {
          shirt: mockWardrobeItem,
          pants: { ...mockWardrobeItem, id: 'pants-id', name: 'Pants' },
          shoes: { ...mockWardrobeItem, id: 'shoes-id', name: 'Shoes' },
          tuck_style: 'Untucked',
        };

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={completeSelection}
              onRandomize={vi.fn()}
              onSaveOutfit={vi.fn()}
              userId={mockUser.id}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Save Outfit')).toBeInTheDocument();
      });

      it('passes user ID to components that need it', () => {
        const onItemAdd = vi.fn();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={onItemAdd}
              userId={mockUser.id}
            />
          </TestWrapper>
        );

        // User ID should be available for database operations
        expect(screen.getByText('Add Item')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      // Mock loading state
      vi.doMock('@/lib/hooks', () => ({
        useAuth: vi.fn(() => ({ user: null, loading: true })),
        useWeather: vi.fn(() => ({ current: null, loading: true, error: null, retry: vi.fn() })),
        useShowWeather: vi.fn(() => false),
        useWardrobeItems: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
        useCategories: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
        useOutfits: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
      }));
    });

    describe('TopBar Loading', () => {
      it('shows default unauthenticated state during auth loading', () => {
        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        // Should default to unauthenticated state while loading
        expect(screen.getByText('Sign in')).toBeInTheDocument();
        expect(screen.getByText('Sign up')).toBeInTheDocument();
      });
    });

    describe('WeatherWidget Loading', () => {
      it('shows loading state for weather', () => {
        vi.mocked(require('@/lib/hooks').useAuth).mockReturnValue({
          user: mockUser,
          loading: false,
        });
        vi.mocked(require('@/lib/hooks').useShowWeather).mockReturnValue(true);
        vi.mocked(require('@/lib/hooks').useWeather).mockReturnValue({
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
    });
  });

  describe('Authentication State Changes', () => {
    it('handles authentication state changes through Supabase', () => {
      const mockCallback = vi.fn();
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      render(
        <TestWrapper>
          <TopBar />
        </TestWrapper>
      );

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();

      // Simulate auth state change
      mockCallback('SIGNED_IN', mockUser);
      
      // Component should handle the state change
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('cleans up auth state change subscription on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { unmount } = render(
        <TestWrapper>
          <TopBar />
        </TestWrapper>
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('User Data Validation', () => {
    it('validates user data with Zod and handles invalid data', () => {
      const invalidUser = {
        id: 'not-a-uuid',
        email: 'not-an-email',
        user_metadata: 'not-an-object',
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

      // Should fall back to unauthenticated state
      expect(screen.getByText('Sign in')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles missing user properties gracefully', () => {
      const partialUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        // Missing email and metadata
      };

      render(
        <TestWrapper>
          <TopBar user={partialUser} />
        </TestWrapper>
      );

      // Should still show authenticated state with available data
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    });

    it('handles null user gracefully', () => {
      render(
        <TestWrapper>
          <TopBar user={null} />
        </TestWrapper>
      );

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });

    it('handles undefined user gracefully', () => {
      render(
        <TestWrapper>
          <TopBar user={undefined} />
        </TestWrapper>
      );

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('handles session expiration gracefully', () => {
      // Mock expired session
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      render(
        <TestWrapper>
          <TopBar />
        </TestWrapper>
      );

      // Should show unauthenticated state when session expires
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('handles network errors during auth check', () => {
      // Mock network error
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <TopBar />
        </TestWrapper>
      );

      // Should gracefully handle network errors
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });

  describe('User Preferences Integration', () => {
    it('respects user weather preferences when authenticated', () => {
      vi.mocked(require('@/lib/hooks').useAuth).mockReturnValue({
        user: mockUser,
        loading: false,
      });
      vi.mocked(require('@/lib/hooks').useShowWeather).mockReturnValue(false); // User disabled weather

      const { container } = render(
        <TestWrapper>
          <WeatherWidget />
        </TestWrapper>
      );

      // Should not show weather widget if user disabled it
      expect(container.firstChild).toBeNull();
    });

    it('shows weather widget when user enables it', () => {
      vi.mocked(require('@/lib/hooks').useAuth).mockReturnValue({
        user: mockUser,
        loading: false,
      });
      vi.mocked(require('@/lib/hooks').useShowWeather).mockReturnValue(true);
      vi.mocked(require('@/lib/hooks').useWeather).mockReturnValue({
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
});
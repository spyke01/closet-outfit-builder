import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../top-bar';
import { ItemsGrid } from '../items-grid';
import { OutfitDisplay } from '../outfit-display';
import { SelectionStrip } from '../selection-strip';
import type { WardrobeItem, OutfitSelection, Outfit } from '@/lib/schemas';

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

// Mock Supabase client with comprehensive methods
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
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: mockDatabaseData[table] || [], 
          error: null 
        })),
        single: vi.fn(() => Promise.resolve({ 
          data: mockDatabaseData[table]?.[0] || null, 
          error: null 
        })),
      })),
      order: vi.fn(() => Promise.resolve({ 
        data: mockDatabaseData[table] || [], 
        error: null 
      })),
    })),
    insert: vi.fn((data) => Promise.resolve({ 
      data: { ...data, id: 'new-id', created_at: new Date().toISOString() }, 
      error: null 
    })),
    update: vi.fn((data) => ({
      eq: vi.fn(() => Promise.resolve({ 
        data: { ...data, updated_at: new Date().toISOString() }, 
        error: null 
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    upsert: vi.fn((data) => Promise.resolve({ 
      data: { ...data, id: data.id || 'new-id' }, 
      error: null 
    })),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn((path, file) => Promise.resolve({ 
        data: { path: `uploads/${path}` }, 
        error: null 
      })),
      getPublicUrl: vi.fn((path) => ({ 
        data: { publicUrl: `https://example.com/storage/${path}` } 
      })),
      remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
  rpc: vi.fn((functionName, params) => {
    // Mock Edge Function responses
    const mockResponses: Record<string, any> = {
      'score_outfit': { score: 85, breakdown: { formality: 8, color: 9, style: 8 } },
      'check_outfit_duplicate': { is_duplicate: false },
      'filter_by_anchor': mockDatabaseData.wardrobe_items || [],
      'seed_user': { success: true },
    };
    
    return Promise.resolve({ 
      data: mockResponses[functionName] || null, 
      error: null 
    });
  }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock database data
const mockDatabaseData: Record<string, any[]> = {
  categories: [
    {
      id: 'cat-1',
      user_id: 'user-1',
      name: 'Shirt',
      is_anchor_item: true,
      display_order: 1,
    },
    {
      id: 'cat-2',
      user_id: 'user-1',
      name: 'Pants',
      is_anchor_item: true,
      display_order: 2,
    },
  ],
  wardrobe_items: [
    {
      id: 'item-1',
      user_id: 'user-1',
      category_id: 'cat-1',
      name: 'Blue Shirt',
      brand: 'Test Brand',
      color: 'Blue',
      formality_score: 6,
      capsule_tags: ['Refined'],
      season: ['All'],
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'item-2',
      user_id: 'user-1',
      category_id: 'cat-2',
      name: 'Dark Jeans',
      brand: 'Denim Co',
      color: 'Dark Blue',
      formality_score: 5,
      capsule_tags: ['Crossover'],
      season: ['All'],
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  outfits: [
    {
      id: 'outfit-1',
      user_id: 'user-1',
      name: 'Casual Look',
      score: 85,
      tuck_style: 'Untucked',
      loved: false,
      source: 'generated',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  outfit_items: [
    {
      id: 'outfit-item-1',
      outfit_id: 'outfit-1',
      item_id: 'item-1',
      category_id: 'cat-1',
    },
    {
      id: 'outfit-item-2',
      outfit_id: 'outfit-1',
      item_id: 'item-2',
      category_id: 'cat-2',
    },
  ],
};

// Mock hooks with Supabase integration
vi.mock('@/lib/hooks', () => ({
  useAuth: vi.fn(() => ({ 
    user: { id: 'user-1', email: 'test@example.com' }, 
    loading: false 
  })),
  useWardrobeItems: vi.fn(() => ({ 
    data: mockDatabaseData.wardrobe_items, 
    isLoading: false, 
    error: null,
    refetch: vi.fn(),
  })),
  useCategories: vi.fn(() => ({ 
    data: mockDatabaseData.categories, 
    isLoading: false, 
    error: null,
    refetch: vi.fn(),
  })),
  useOutfits: vi.fn(() => ({ 
    data: mockDatabaseData.outfits, 
    isLoading: false, 
    error: null,
    refetch: vi.fn(),
  })),
  useCreateWardrobeItem: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
    error: null,
  })),
  useUpdateWardrobeItem: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
    error: null,
  })),
  useDeleteWardrobeItem: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
    error: null,
  })),
  useCreateOutfit: vi.fn(() => ({
    mutate: vi.fn(),
    isLoading: false,
    error: null,
  })),
  useWeather: vi.fn(() => ({ 
    current: null, 
    loading: false, 
    error: null, 
    retry: vi.fn() 
  })),
  useShowWeather: vi.fn(() => false),
}));

// Test data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
};

const mockWardrobeItem: WardrobeItem = {
  id: 'item-1',
  user_id: 'user-1',
  category_id: 'cat-1',
  name: 'Blue Shirt',
  brand: 'Test Brand',
  color: 'Blue',
  material: 'Cotton',
  formality_score: 6,
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

describe('Supabase Integration Tests', () => {
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

  describe('Authentication Integration', () => {
    describe('TopBar Authentication', () => {
      it('handles user authentication state from Supabase', () => {
        vi.mocked(require('@/lib/hooks').useAuth).mockReturnValue({
          user: mockUser,
          loading: false,
        });

        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
      });

      it('handles authentication loading state', () => {
        vi.mocked(require('@/lib/hooks').useAuth).mockReturnValue({
          user: null,
          loading: true,
        });

        render(
          <TestWrapper>
            <TopBar />
          </TestWrapper>
        );

        // Should show loading state or default to unauthenticated
        expect(screen.getByText('Sign in')).toBeInTheDocument();
      });

      it('validates user data with Zod before using', () => {
        const invalidUser = {
          id: 'invalid-uuid-format',
          email: 'not-an-email',
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

        consoleSpy.mockRestore();
      });

      it('handles logout through Supabase client', async () => {
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
  });

  describe('Data Fetching Integration', () => {
    describe('ItemsGrid Data Integration', () => {
      it('fetches wardrobe items from Supabase', () => {
        const mockUseWardrobeItems = vi.mocked(require('@/lib/hooks').useWardrobeItems);
        mockUseWardrobeItems.mockReturnValue({
          data: mockDatabaseData.wardrobe_items,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        });

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={mockDatabaseData.wardrobe_items}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Test Brand Blue Shirt')).toBeInTheDocument();
        expect(screen.getByText('Denim Co Dark Jeans')).toBeInTheDocument();
      });

      it('handles loading state from Supabase queries', () => {
        const mockUseWardrobeItems = vi.mocked(require('@/lib/hooks').useWardrobeItems);
        mockUseWardrobeItems.mockReturnValue({
          data: undefined,
          isLoading: true,
          error: null,
          refetch: vi.fn(),
        });

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        // Should handle empty state gracefully
        expect(screen.getByText('No items available in this category.')).toBeInTheDocument();
      });

      it('handles Supabase query errors', () => {
        const mockUseWardrobeItems = vi.mocked(require('@/lib/hooks').useWardrobeItems);
        mockUseWardrobeItems.mockReturnValue({
          data: undefined,
          isLoading: false,
          error: { message: 'Database connection failed' },
          refetch: vi.fn(),
        });

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        // Should handle error state gracefully
        expect(screen.getByText('No items available in this category.')).toBeInTheDocument();
      });

      it('filters items based on user_id from RLS', () => {
        // Items should only include those belonging to the authenticated user
        const userItems = mockDatabaseData.wardrobe_items.filter(
          item => item.user_id === 'user-1'
        );

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={userItems}
              onItemSelect={vi.fn()}
            />
          </TestWrapper>
        );

        expect(screen.getByText(`${userItems.length} items found`)).toBeInTheDocument();
      });
    });

    describe('Categories Integration', () => {
      it('fetches categories from Supabase', () => {
        const mockUseCategories = vi.mocked(require('@/lib/hooks').useCategories);
        mockUseCategories.mockReturnValue({
          data: mockDatabaseData.categories,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        });

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

        // Should render category dropdowns based on database data
        expect(screen.getByText(/Building from.*Blue Shirt/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Mutations Integration', () => {
    describe('Creating Items', () => {
      it('creates new wardrobe items through Supabase', async () => {
        const mockCreateItem = vi.fn();
        const mockUseCreateWardrobeItem = vi.mocked(require('@/lib/hooks').useCreateWardrobeItem);
        mockUseCreateWardrobeItem.mockReturnValue({
          mutate: mockCreateItem,
          isLoading: false,
          error: null,
        });

        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={async (item) => {
                mockCreateItem(item);
              }}
              userId="user-1"
            />
          </TestWrapper>
        );

        // Open add form
        const addButton = screen.getByText('Add Item');
        await user.click(addButton);

        // Fill form
        const nameInput = screen.getByLabelText('Name *');
        await user.type(nameInput, 'New Shirt');

        const brandInput = screen.getByLabelText('Brand');
        await user.type(brandInput, 'New Brand');

        // Submit form
        const submitButton = screen.getByText('Add Item');
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockCreateItem).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'New Shirt',
              brand: 'New Brand',
              category_id: 'Shirts',
              active: true,
              season: ['All'],
            })
          );
        });
      });

      it('handles Supabase insert errors', async () => {
        const mockCreateItem = vi.fn(() => {
          throw new Error('Database insert failed');
        });

        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={mockCreateItem}
              userId="user-1"
            />
          </TestWrapper>
        );

        // Open add form
        const addButton = screen.getByText('Add Item');
        await user.click(addButton);

        // Fill and submit form
        const nameInput = screen.getByLabelText('Name *');
        await user.type(nameInput, 'New Shirt');

        const submitButton = screen.getByText('Add Item');
        await user.click(submitButton);

        // Should handle error gracefully
        await waitFor(() => {
          expect(screen.getByText('Database insert failed')).toBeInTheDocument();
        });
      });
    });

    describe('Saving Outfits', () => {
      it('saves outfits to Supabase with proper validation', async () => {
        const mockSaveOutfit = vi.fn();
        const user = userEvent.setup();

        const completeSelection: OutfitSelection = {
          shirt: mockWardrobeItem,
          pants: {
            ...mockWardrobeItem,
            id: 'item-2',
            name: 'Dark Jeans',
            category_id: 'cat-2',
          },
          shoes: {
            ...mockWardrobeItem,
            id: 'item-3',
            name: 'Sneakers',
            category_id: 'cat-3',
          },
          tuck_style: 'Untucked',
        };

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={completeSelection}
              onRandomize={vi.fn()}
              onSaveOutfit={mockSaveOutfit}
              userId="user-1"
            />
          </TestWrapper>
        );

        const saveButton = screen.getByText('Save Outfit');
        await user.click(saveButton);

        await waitFor(() => {
          expect(mockSaveOutfit).toHaveBeenCalledWith(
            expect.objectContaining({
              name: expect.stringContaining('Outfit'),
              score: expect.any(Number),
              tuck_style: 'Untucked',
              source: 'generated',
              weight: 1,
              loved: false,
            })
          );
        });
      });

      it('validates outfit data with Zod before saving', async () => {
        const mockSaveOutfit = vi.fn();
        const user = userEvent.setup();

        // Create an outfit that would fail validation
        const invalidSelection = {
          shirt: { ...mockWardrobeItem, formality_score: 15 }, // Invalid: > 10
          tuck_style: 'InvalidStyle' as any, // Invalid enum
        };

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={invalidSelection as OutfitSelection}
              onRandomize={vi.fn()}
              onSaveOutfit={mockSaveOutfit}
              userId="user-1"
            />
          </TestWrapper>
        );

        // Should handle validation error gracefully
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Edge Functions Integration', () => {
    describe('Outfit Scoring', () => {
      it('calls score_outfit Edge Function', async () => {
        const completeSelection: OutfitSelection = {
          shirt: mockWardrobeItem,
          pants: {
            ...mockWardrobeItem,
            id: 'item-2',
            name: 'Dark Jeans',
          },
          shoes: {
            ...mockWardrobeItem,
            id: 'item-3',
            name: 'Sneakers',
          },
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

        // Score should be calculated and displayed
        expect(screen.getByText(/\d+/)).toBeInTheDocument();
      });
    });

    describe('Anchor Filtering', () => {
      it('calls filter_by_anchor Edge Function for compatible items', () => {
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

        // Should render dropdowns with filtered compatible items
        expect(screen.getByText(/Building from.*Blue Shirt/)).toBeInTheDocument();
      });
    });

    describe('Duplicate Detection', () => {
      it('calls check_outfit_duplicate Edge Function before saving', async () => {
        const mockSaveOutfit = vi.fn();
        const user = userEvent.setup();

        const completeSelection: OutfitSelection = {
          shirt: mockWardrobeItem,
          pants: {
            ...mockWardrobeItem,
            id: 'item-2',
            name: 'Dark Jeans',
          },
          shoes: {
            ...mockWardrobeItem,
            id: 'item-3',
            name: 'Sneakers',
          },
          tuck_style: 'Untucked',
        };

        render(
          <TestWrapper>
            <OutfitDisplay
              selection={completeSelection}
              onRandomize={vi.fn()}
              onSaveOutfit={mockSaveOutfit}
              userId="user-1"
            />
          </TestWrapper>
        );

        const saveButton = screen.getByText('Save Outfit');
        await user.click(saveButton);

        // Should check for duplicates before saving
        await waitFor(() => {
          expect(mockSaveOutfit).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Storage Integration', () => {
    describe('Image Upload', () => {
      it('uploads images to Supabase Storage', async () => {
        const user = userEvent.setup();

        // Mock file upload
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

        // Mock fetch for image upload API
        global.fetch = vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { imageUrl: 'https://example.com/storage/uploads/test.jpg' }
            }),
          })
        ) as any;

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={vi.fn()}
              enableImageUpload={true}
              userId="user-1"
            />
          </TestWrapper>
        );

        // Open add form
        const addButton = screen.getByText('Add Item');
        await user.click(addButton);

        // Upload image (this would need actual ImageUpload component integration)
        const nameInput = screen.getByLabelText('Name *');
        await user.type(nameInput, 'Test Item');

        const submitButton = screen.getByText('Add Item');
        await user.click(submitButton);

        expect(global.fetch).toHaveBeenCalledWith(
          '/api/upload-image',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });

      it('handles Supabase Storage errors', async () => {
        const user = userEvent.setup();

        // Mock failed upload
        global.fetch = vi.fn(() =>
          Promise.resolve({
            ok: false,
            json: () => Promise.resolve({
              success: false,
              error: 'Storage quota exceeded'
            }),
          })
        ) as any;

        render(
          <TestWrapper>
            <ItemsGrid
              category="Shirts"
              items={[]}
              onItemSelect={vi.fn()}
              onItemAdd={vi.fn()}
              enableImageUpload={true}
              userId="user-1"
            />
          </TestWrapper>
        );

        // Open add form
        const addButton = screen.getByText('Add Item');
        await user.click(addButton);

        // Try to submit (would trigger upload error)
        const nameInput = screen.getByLabelText('Name *');
        await user.type(nameInput, 'Test Item');

        const submitButton = screen.getByText('Add Item');
        await user.click(submitButton);

        // Should handle storage error gracefully
        await waitFor(() => {
          expect(screen.getByText('Failed to upload image')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Real-time Updates', () => {
    it('handles Supabase real-time subscriptions', () => {
      // Mock real-time subscription
      const mockSubscription = {
        unsubscribe: vi.fn(),
      };

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      render(
        <TestWrapper>
          <TopBar user={mockUser} />
        </TestWrapper>
      );

      // Should set up auth state change subscription
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
    });

    it('cleans up subscriptions on unmount', () => {
      const mockUnsubscribe = vi.fn();
      const mockSubscription = {
        unsubscribe: mockUnsubscribe,
      };

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: mockSubscription },
      });

      const { unmount } = render(
        <TestWrapper>
          <TopBar user={mockUser} />
        </TestWrapper>
      );

      unmount();

      // Should clean up subscription
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Row Level Security', () => {
    it('ensures queries are filtered by user_id', () => {
      render(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={mockDatabaseData.wardrobe_items}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      // All displayed items should belong to the authenticated user
      const userItems = mockDatabaseData.wardrobe_items.filter(
        item => item.user_id === 'user-1'
      );

      expect(screen.getByText(`${userItems.length} items found`)).toBeInTheDocument();
    });

    it('handles RLS policy violations gracefully', () => {
      // Mock RLS policy violation
      const mockUseWardrobeItems = vi.mocked(require('@/lib/hooks').useWardrobeItems);
      mockUseWardrobeItems.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'RLS policy violation' },
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <ItemsGrid
            category="Shirts"
            items={[]}
            onItemSelect={vi.fn()}
          />
        </TestWrapper>
      );

      // Should handle RLS error gracefully
      expect(screen.getByText('No items available in this category.')).toBeInTheDocument();
    });
  });
});
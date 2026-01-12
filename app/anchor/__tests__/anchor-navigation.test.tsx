import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AnchorCategoryPageClient } from '../[category]/anchor-category-client';

// Mock the hooks
vi.mock('@/lib/hooks/use-wardrobe-items', () => ({
  useWardrobeItems: () => ({
    data: [
      {
        id: '1',
        name: 'Navy Blazer',
        category_id: 'jacket-cat-id',
        active: true,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2', 
        name: 'Denim Overshirt',
        category_id: 'overshirt-cat-id',
        active: true,
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    isLoading: false,
    error: null
  })
}));

vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({
    data: [
      {
        id: 'jacket-cat-id',
        name: 'Jacket',
        is_anchor_item: true,
        display_order: 1
      },
      {
        id: 'overshirt-cat-id', 
        name: 'Overshirt',
        is_anchor_item: true,
        display_order: 2
      }
    ],
    isLoading: false,
    error: null
  })
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

describe('Anchor Navigation', () => {
  it('should display Jacket category items correctly', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <AnchorCategoryPageClient categoryName="Jacket" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Anchor: Jacket')).toBeInTheDocument();
      expect(screen.getByText('Navy Blazer')).toBeInTheDocument();
    });
  });

  it('should display Overshirt category items correctly', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <AnchorCategoryPageClient categoryName="Overshirt" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Anchor: Overshirt')).toBeInTheDocument();
      expect(screen.getByText('Denim Overshirt')).toBeInTheDocument();
    });
  });

  it('should handle category not found gracefully', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <AnchorCategoryPageClient categoryName="NonExistentCategory" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Category "NonExistentCategory" not found.')).toBeInTheDocument();
    });
  });
});
/**
 * Auto-Seed Categories Tests
 * 
 * Tests for automatic seeding of system categories on first access.
 * 
 * Requirements: US-1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MySizesClient } from '../my-sizes-client';
import * as useSizeCategoriesModule from '@/lib/hooks/use-size-categories';

// Mock the hooks - need to include all exports to avoid errors
vi.mock('@/lib/hooks/use-size-categories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks/use-size-categories')>();
  return {
    ...actual,
    useSizeCategories: vi.fn(),
    usePinnedPreferences: vi.fn(),
    useSeedCategories: vi.fn(),
  };
});

describe('MySizesClient - Auto-Seed', () => {
  let queryClient: QueryClient;
  let mockSeedMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockSeedMutate = vi.fn();

    // Default mock implementations
    vi.mocked(useSizeCategoriesModule.useSizeCategories).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.mocked(useSizeCategoriesModule.usePinnedPreferences).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
      mutate: mockSeedMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as never);
  });

  const renderComponent = (needsSeeding: boolean) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MySizesClient
          initialCategories={[]}
          initialPinnedPreferences={[]}
          initialStandardSizes={[]}
          initialBrandSizes={[]}
          needsSeeding={needsSeeding}
        />
      </QueryClientProvider>
    );
  };

  describe('New Users (needsSeeding = true)', () => {
    it('should automatically call seed function on mount', () => {
      renderComponent(true);

      expect(mockSeedMutate).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during seeding', () => {
      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
      } as never);

      renderComponent(true);

      expect(screen.getByText('Setting up your size categories...')).toBeInTheDocument();
    });

    it('should show skeleton during seeding', () => {
      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
      } as never);

      renderComponent(true);

      // Check for loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display error message if seeding fails', () => {
      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: new Error('Seeding failed'),
      } as never);

      renderComponent(true);

      expect(screen.getByText(/Failed to set up your size categories/i)).toBeInTheDocument();
    });

    it('should provide retry button on seeding error', () => {
      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: new Error('Seeding failed'),
      } as never);

      renderComponent(true);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call seed function again when retry is clicked', async () => {
      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: new Error('Seeding failed'),
      } as never);

      renderComponent(true);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      retryButton.click();

      await waitFor(() => {
        expect(mockSeedMutate).toHaveBeenCalled();
      });
    });

    it('should not call seed function if already successful', () => {
      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: false,
        isSuccess: true,
        isError: false,
        error: null,
      } as never);

      renderComponent(true);

      // Should not call mutate if already successful
      expect(mockSeedMutate).not.toHaveBeenCalled();
    });

    it('should not call seed function if already pending', () => {
      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
      } as never);

      renderComponent(true);

      // Should not call mutate if already pending
      expect(mockSeedMutate).not.toHaveBeenCalled();
    });
  });

  describe('Existing Users (needsSeeding = false)', () => {
    it('should not call seed function for existing users', () => {
      renderComponent(false);

      expect(mockSeedMutate).not.toHaveBeenCalled();
    });

    it('should render normally without seeding', () => {
      renderComponent(false);

      expect(screen.getByText('My Sizes')).toBeInTheDocument();
      expect(screen.queryByText('Setting up your size categories...')).not.toBeInTheDocument();
    });

    it('should display categories if they exist', () => {
      const mockCategories = [
        {
          id: 'cat-1',
          user_id: 'user-1',
          name: 'Dress Shirt',
          icon: 'shirt',
          supported_formats: ['numeric'],
          is_system_category: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(useSizeCategoriesModule.useSizeCategories).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never);

      renderComponent(false);

      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when categories are loading', () => {
      vi.mocked(useSizeCategoriesModule.useSizeCategories).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never);

      renderComponent(false);

      // Check for skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show seeding message when just loading categories', () => {
      vi.mocked(useSizeCategoriesModule.useSizeCategories).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never);

      renderComponent(false);

      expect(screen.queryByText('Setting up your size categories...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display category fetch errors', () => {
      vi.mocked(useSizeCategoriesModule.useSizeCategories).mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to fetch categories'),
        refetch: vi.fn(),
      } as never);

      renderComponent(false);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should prioritize seeding errors over other errors', () => {
      vi.mocked(useSizeCategoriesModule.useSizeCategories).mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to fetch categories'),
        refetch: vi.fn(),
      } as never);

      vi.mocked(useSizeCategoriesModule.useSeedCategories).mockReturnValue({
        mutate: mockSeedMutate,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: new Error('Seeding failed'),
      } as never);

      renderComponent(true);

      // Should show seeding error message
      expect(screen.getByText(/Failed to set up your size categories/i)).toBeInTheDocument();
    });
  });
});

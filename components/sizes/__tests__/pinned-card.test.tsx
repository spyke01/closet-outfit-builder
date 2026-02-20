/**
 * Lean Unit Tests for PinnedCard Component
 * 
 * Tests critical user-facing behavior only:
 * - Data display (category name, sizes)
 * - User interactions (tap, options menu)
 * - Display modes (standard, dual, preferred-brand)
 * - Error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PinnedCard } from '../pinned-card';
import type { SizeCategory, StandardSize, BrandSize } from '@/lib/types/sizes';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.preventDefault()}
      {...props}
    >
      {children}
    </a>
  ),
}));

// Mock hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategory: vi.fn(),
  useBrandSizes: vi.fn(),
}));

import { useSizeCategory, useBrandSizes } from '@/lib/hooks/use-size-categories';

describe('PinnedCard', () => {
  const mockCategory: SizeCategory = {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Tops',
    supported_formats: ['letter'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockStandardSize: StandardSize = {
    id: 'size-1',
    category_id: 'cat-1',
    user_id: 'user-1',
    primary_size: 'M',
    secondary_size: 'L',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  };

  const mockBrandSizes: BrandSize[] = [
    {
      id: 'brand-1',
      category_id: 'cat-1',
      user_id: 'user-1',
      brand_name: 'Nike',
      size: 'L',
      fit_scale: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSizeCategory).mockReturnValue({
      data: { ...mockCategory, standard_sizes: [mockStandardSize] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useBrandSizes).mockReturnValue({
      data: mockBrandSizes,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  describe('Data Display', () => {
    it('renders category name and primary size', () => {
      render(<PinnedCard categoryId="cat-1" displayMode="standard" />);
      
      expect(screen.getByText('Tops')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('shows "No size set" when no standard size exists', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: mockCategory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never);

      render(<PinnedCard categoryId="cat-1" displayMode="standard" />);
      expect(screen.getByText('No size set')).toBeInTheDocument();
    });
  });

  describe('Display Modes', () => {
    it('shows only primary size in standard mode', () => {
      render(<PinnedCard categoryId="cat-1" displayMode="standard" />);
      
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.queryByText('L')).not.toBeInTheDocument();
    });

    it('shows both sizes in dual mode', () => {
      render(<PinnedCard categoryId="cat-1" displayMode="dual" />);
      
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('shows brand size in preferred-brand mode', () => {
      render(
        <PinnedCard 
          categoryId="cat-1" 
          displayMode="preferred-brand"
          preferredBrandId="brand-1"
        />
      );
      
      expect(screen.getByText(/Nike/i)).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onTap when card is clicked', () => {
      const onTap = vi.fn();
      render(<PinnedCard categoryId="cat-1" displayMode="standard" onTap={onTap} />);
      
      const card = screen.getByRole('button', { name: /Tops/i });
      fireEvent.click(card);
      
      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('shows options button when onLongPress provided', () => {
      const onLongPress = vi.fn();
      render(<PinnedCard categoryId="cat-1" displayMode="standard" onLongPress={onLongPress} />);
      
      const optionsButton = screen.getByRole('button', { name: /Options/i });
      expect(optionsButton).toBeInTheDocument();
    });

    it('calls onLongPress when options button clicked', () => {
      const onLongPress = vi.fn();
      render(<PinnedCard categoryId="cat-1" displayMode="standard" onLongPress={onLongPress} />);
      
      const optionsButton = screen.getByRole('button', { name: /Options/i });
      fireEvent.click(optionsButton);
      
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error States', () => {
    it('shows error message when data fetch fails', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: vi.fn(),
      } as never);

      render(<PinnedCard categoryId="cat-1" displayMode="standard" />);
      expect(screen.getByText(/Failed to load category/i)).toBeInTheDocument();
    });

    it('shows loading state', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never);

      render(<PinnedCard categoryId="cat-1" displayMode="standard" />);
      // Loading skeleton should be present
      expect(screen.getByLabelText(/loading category information/i)).toBeInTheDocument();
    });
  });
});

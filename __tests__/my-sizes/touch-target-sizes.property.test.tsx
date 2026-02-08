/**
 * Property-Based Test: Touch Target Minimum Size
 * 
 * Property 13: Touch target minimum size
 * For any interactive element (buttons, cards, links, form inputs), 
 * the rendered element should have a minimum touch target area of 44x44 pixels.
 * 
 * Validates: Requirements 9.1, 11.5
 * 
 * Feature: my-sizes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PinnedCard } from '@/components/sizes/pinned-card';
import { CategoryGrid } from '@/components/sizes/category-grid';
import { AddCategoryForm } from '@/components/sizes/add-category-form';
import { BrandSizeForm } from '@/components/sizes/brand-size-form';
import { CustomizePinnedCardsView } from '@/components/sizes/customize-pinned-cards-view';

// Mock hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategory: () => ({
    data: {
      id: 'test-category-id',
      user_id: 'test-user-id',
      name: 'Test Category',
      supported_formats: ['letter'],
      is_system_category: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      standard_sizes: [{
        id: 'test-size-id',
        category_id: 'test-category-id',
        user_id: 'test-user-id',
        primary_size: 'M',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }],
    },
    isLoading: false,
    error: null,
  }),
  useBrandSizes: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useSizeCategories: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  usePinnedPreferences: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useCreateCategory: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useCreatePinnedPreference: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useCreateBrandSize: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useUpdatePinnedPreferences: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

/**
 * Helper function to check if an element meets minimum touch target size
 * @param element - The DOM element to check
 * @returns true if element is at least 44x44px
 */
function meetsMinimumTouchTarget(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  // Get actual dimensions including padding
  const width = rect.width || parseFloat(computedStyle.width);
  const height = rect.height || parseFloat(computedStyle.height);
  
  // Check for explicit minWidth/minHeight styles
  const minWidth = parseFloat(computedStyle.minWidth) || 0;
  const minHeight = parseFloat(computedStyle.minHeight) || 0;
  
  // Element meets requirement if either actual size or minimum size is >= 44px
  const meetsWidth = width >= 44 || minWidth >= 44;
  const meetsHeight = height >= 44 || minHeight >= 44;
  
  return meetsWidth && meetsHeight;
}

/**
 * Helper function to find all interactive elements in a container
 * @param container - The container element to search
 * @returns Array of interactive elements
 */
function findInteractiveElements(container: HTMLElement): Element[] {
  const selectors = [
    'button',
    'a[href]',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]:not([tabindex="-1"])',
  ];
  
  return Array.from(container.querySelectorAll(selectors.join(', ')));
}

describe('Property 13: Touch Target Minimum Size', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PinnedCard component', () => {
    it('should have minimum 44x44px touch targets for all interactive elements', () => {
      const { container } = render(
        <PinnedCard
          categoryId="test-category-id"
          displayMode="standard"
          onTap={vi.fn()}
          onLongPress={vi.fn()}
        />
      );

      const interactiveElements = findInteractiveElements(container);
      
      // Should have at least one interactive element
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      // All interactive elements should meet minimum touch target size
      interactiveElements.forEach((element) => {
        const meets = meetsMinimumTouchTarget(element);
        if (!meets) {
          console.warn('Element does not meet touch target size:', element);
        }
        expect(meets).toBe(true);
      });
    });

    it('should have minimum 44x44px touch targets with dual display mode', () => {
      const { container } = render(
        <PinnedCard
          categoryId="test-category-id"
          displayMode="dual"
          onTap={vi.fn()}
          onLongPress={vi.fn()}
        />
      );

      const interactiveElements = findInteractiveElements(container);
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach((element) => {
        expect(meetsMinimumTouchTarget(element)).toBe(true);
      });
    });
  });

  describe('CategoryGrid component', () => {
    it('should have minimum 44x44px touch targets for all interactive elements', () => {
      const { container } = render(
        <CategoryGrid
          categories={[]}
          onAddCategory={vi.fn()}
        />
      );

      const interactiveElements = findInteractiveElements(container);
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach((element) => {
        expect(meetsMinimumTouchTarget(element)).toBe(true);
      });
    });

    it('should have minimum 44x44px touch targets with multiple categories', () => {
      const { container } = render(
        <CategoryGrid
          categories={[
            {
              id: 'cat-1',
              user_id: 'user-1',
              name: 'Tops',
              supported_formats: ['letter'],
              is_system_category: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 'cat-2',
              user_id: 'user-1',
              name: 'Bottoms',
              supported_formats: ['numeric'],
              is_system_category: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ]}
          onAddCategory={vi.fn()}
        />
      );

      const interactiveElements = findInteractiveElements(container);
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach((element) => {
        expect(meetsMinimumTouchTarget(element)).toBe(true);
      });
    });
  });

  describe('AddCategoryForm component', () => {
    it('should have minimum 44x44px touch targets for all interactive elements', () => {
      const { container } = render(
        <AddCategoryForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const interactiveElements = findInteractiveElements(container);
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach((element) => {
        expect(meetsMinimumTouchTarget(element)).toBe(true);
      });
    });
  });

  describe('BrandSizeForm component', () => {
    it('should have minimum 44x44px touch targets for all interactive elements', () => {
      const { container } = render(
        <BrandSizeForm
          categoryId="test-category-id"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const interactiveElements = findInteractiveElements(container);
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach((element) => {
        expect(meetsMinimumTouchTarget(element)).toBe(true);
      });
    });
  });

  describe('CustomizePinnedCardsView component', () => {
    it('should have minimum 44x44px touch targets for all interactive elements', () => {
      const { container } = render(
        <CustomizePinnedCardsView
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const interactiveElements = findInteractiveElements(container);
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach((element) => {
        expect(meetsMinimumTouchTarget(element)).toBe(true);
      });
    });
  });

  describe('Icon-only buttons', () => {
    it('should have minimum 44x44px touch targets', () => {
      const { container } = render(
        <PinnedCard
          categoryId="test-id"
          displayMode="standard"
          onLongPress={vi.fn()}
        />
      );

      // Find icon-only buttons (buttons with aria-label but no visible text)
      const buttons = container.querySelectorAll('button[aria-label]');
      
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach((button) => {
        expect(meetsMinimumTouchTarget(button)).toBe(true);
      });
    });
  });
});

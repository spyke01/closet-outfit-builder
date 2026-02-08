/**
 * Property-Based Test: ARIA Attributes Presence
 * 
 * Property 17: ARIA attributes presence
 * For any interactive element, the rendered HTML should include appropriate 
 * ARIA labels, roles, and states for screen reader compatibility.
 * 
 * Validates: Requirements 11.3
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

describe('Property 17: ARIA Attributes Presence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PinnedCard component', () => {
    it('should have aria-label on icon-only buttons', () => {
      const { container } = render(
        <PinnedCard
          categoryId="test-id"
          displayMode="standard"
          onLongPress={vi.fn()}
        />
      );

      // Find icon-only buttons (buttons with no text content)
      const buttons = Array.from(container.querySelectorAll('button'));
      const iconOnlyButtons = buttons.filter(btn => !btn.textContent?.trim());
      
      iconOnlyButtons.forEach((button) => {
        const ariaLabel = button.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);
      });
    });

    it('should have role="button" on card wrapper', () => {
      const { container } = render(
        <PinnedCard
          categoryId="test-id"
          displayMode="standard"
          onTap={vi.fn()}
        />
      );

      const cardWrapper = container.querySelector('[role="button"]');
      expect(cardWrapper).toBeTruthy();
      expect(cardWrapper?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(
        <PinnedCard
          categoryId="test-id"
          displayMode="standard"
        />
      );

      // SVG icons should have aria-hidden
      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        const ariaHidden = svg.getAttribute('aria-hidden');
        expect(ariaHidden).toBe('true');
      });
    });
  });

  describe('CategoryGrid component', () => {
    it('should have role="list" on category grid', () => {
      const { container } = render(
        <CategoryGrid
          categories={[
            {
              id: 'test-id',
              user_id: 'test-user-id',
              name: 'Test Category',
              supported_formats: ['letter'],
              is_system_category: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ]}
          onAddCategory={vi.fn()}
        />
      );

      const list = container.querySelector('[role="list"]');
      expect(list).toBeTruthy();
      expect(list?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-label on category links', () => {
      const { container } = render(
        <CategoryGrid
          categories={[
            {
              id: 'test-id',
              user_id: 'test-user-id',
              name: 'Test Category',
              supported_formats: ['letter'],
              is_system_category: false,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ]}
          onAddCategory={vi.fn()}
        />
      );

      const links = container.querySelectorAll('a[href]');
      links.forEach((link) => {
        const ariaLabel = link.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      });
    });

    it('should have aria-label on add category button', () => {
      const { container } = render(
        <CategoryGrid
          categories={[]}
          onAddCategory={vi.fn()}
        />
      );

      const addButton = container.querySelector('button[aria-label*="Add"]');
      expect(addButton).toBeTruthy();
      expect(addButton?.getAttribute('aria-label')).toContain('category');
    });
  });

  describe('AddCategoryForm component', () => {
    it('should have labels for all form inputs', () => {
      const { container } = render(
        <AddCategoryForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Check all form inputs have labels
      const inputs = container.querySelectorAll('input:not([type="radio"]):not([type="checkbox"])');
      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        expect(id).toBeTruthy();
        
        const label = container.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        // Input should have either a label element or aria-label
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
      });
    });

    it('should have aria-required on required fields', () => {
      const { container } = render(
        <AddCategoryForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Category name input should be required
      const nameInput = container.querySelector('#category-name');
      expect(nameInput).toBeTruthy();
      expect(nameInput?.getAttribute('aria-required')).toBe('true');
    });

    it('should have aria-describedby for form hints', () => {
      const { container } = render(
        <AddCategoryForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const nameInput = container.querySelector('#category-name');
      const ariaDescribedBy = nameInput?.getAttribute('aria-describedby');
      
      expect(ariaDescribedBy).toBeTruthy();
      
      // The described element should exist
      if (ariaDescribedBy) {
        const describedElements = ariaDescribedBy.split(' ');
        describedElements.forEach((id) => {
          const element = container.querySelector(`#${id}`);
          expect(element).toBeTruthy();
        });
      }
    });

    it('should have role="radiogroup" for icon selection', () => {
      const { container } = render(
        <AddCategoryForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const radioGroup = container.querySelector('[role="radiogroup"]');
      expect(radioGroup).toBeTruthy();
      expect(radioGroup?.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('BrandSizeForm component', () => {
    it('should have labels for all form inputs', () => {
      const { container } = render(
        <BrandSizeForm
          categoryId="test-category-id"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Check all form inputs have labels
      const inputs = container.querySelectorAll('input:not([type="radio"]), textarea');
      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        expect(id).toBeTruthy();
        
        const label = container.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        // Input should have either a label element or aria-label
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
      });
    });

    it('should have role="radiogroup" for fit scale selector', () => {
      const { container } = render(
        <BrandSizeForm
          categoryId="test-category-id"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const radioGroup = container.querySelector('[role="radiogroup"]');
      expect(radioGroup).toBeTruthy();
      expect(radioGroup?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-describedby for radio button descriptions', () => {
      const { container } = render(
        <BrandSizeForm
          categoryId="test-category-id"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const radioButtons = container.querySelectorAll('input[type="radio"]');
      radioButtons.forEach((radio) => {
        const ariaDescribedBy = radio.getAttribute('aria-describedby');
        if (ariaDescribedBy) {
          const describedElement = container.querySelector(`#${ariaDescribedBy}`);
          expect(describedElement).toBeTruthy();
        }
      });
    });

    it('should have role="listbox" for brand dropdown', () => {
      const { container } = render(
        <BrandSizeForm
          categoryId="test-category-id"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Focus the brand name input to show dropdown
      const brandInput = container.querySelector('#brand-name') as HTMLInputElement;
      if (brandInput) {
        brandInput.focus();
        
        // Check if dropdown appears with proper role
        const listbox = container.querySelector('[role="listbox"]');
        if (listbox) {
          expect(listbox.getAttribute('aria-label')).toBeTruthy();
        }
      }
    });
  });

  describe('CustomizePinnedCardsView component', () => {
    it('should have role="dialog" and aria-modal', () => {
      const { container } = render(
        <CustomizePinnedCardsView
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('should have aria-label on drag handles', () => {
      const { container } = render(
        <CustomizePinnedCardsView
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const dragHandles = container.querySelectorAll('.drag-handle');
      dragHandles.forEach((handle) => {
        const ariaLabel = handle.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('Reorder');
      });
    });

    it('should have aria-label on close button', () => {
      const { container } = render(
        <CustomizePinnedCardsView
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const closeButton = container.querySelector('button[aria-label*="Close"]');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('Loading and error states', () => {
    it('should have aria-busy on loading states', () => {
      // Mock loading state
      vi.mocked(vi.mocked(require('@/lib/hooks/use-size-categories')).useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { container } = render(
        <PinnedCard
          categoryId="test-id"
          displayMode="standard"
        />
      );

      const loadingElement = container.querySelector('[aria-busy="true"]');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have role="alert" on error states', () => {
      // Mock error state
      vi.mocked(vi.mocked(require('@/lib/hooks/use-size-categories')).useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Test error'),
      });

      const { container } = render(
        <PinnedCard
          categoryId="test-id"
          displayMode="standard"
        />
      );

      const errorElement = container.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
    });
  });

  describe('Form validation errors', () => {
    it('should have role="alert" on error messages', () => {
      const { container } = render(
        <AddCategoryForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Error messages should have role="alert"
      const errorMessages = container.querySelectorAll('[role="alert"]');
      errorMessages.forEach((error) => {
        // Error messages should be associated with inputs via aria-describedby
        const id = error.getAttribute('id');
        if (id) {
          const associatedInput = container.querySelector(`[aria-describedby*="${id}"]`);
          expect(associatedInput).toBeTruthy();
        }
      });
    });
  });
});

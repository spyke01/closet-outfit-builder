/**
 * Unit Tests: AddCategoryForm Component
 * 
 * Tests form rendering, validation, and responsive presentation.
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddCategoryForm } from '../add-category-form';
import { AddCategoryModal } from '../add-category-modal';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null
            }))
          })),
          maybeSingle: vi.fn(() => ({
            data: null,
            error: null
          })),
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'new-category-id',
              user_id: 'test-user-id',
              name: 'Test Category',
              icon: undefined,
              supported_formats: ['letter'],
              is_system_category: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ userId: 'test-user-id', isAuthenticated: true })
}));

describe('AddCategoryForm', () => {
  let queryClient: QueryClient;
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    mockOnSave = vi.fn();
    mockOnCancel = vi.fn();
  });

  const renderForm = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AddCategoryForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </QueryClientProvider>
    );
  };

  describe('Form Rendering', () => {
    it('should render all form fields', () => {
      renderForm();

      // Category name input
      expect(screen.getByLabelText(/category name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\., Tops, Bottoms, Footwear/i)).toBeInTheDocument();

      // Icon selection
      expect(screen.getByText(/icon \(optional\)/i)).toBeInTheDocument();

      // Supported sizing formats
      expect(screen.getByText(/supported sizing formats/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /letter sizes/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /numeric sizes/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /waist\/inseam/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /measurements/i })).toBeInTheDocument();

      // Pin to top toggle
      expect(screen.getByText(/pin to top/i)).toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole('button', { name: /cancel category creation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save new category/i })).toBeInTheDocument();
    });

    it('should have letter format selected by default', () => {
      renderForm();

      const letterCheckbox = screen.getByRole('checkbox', { name: /letter sizes/i });
      expect(letterCheckbox).toBeChecked();
    });

    it('should have proper ARIA labels', () => {
      renderForm();

      // Category name input
      const nameInput = screen.getByLabelText(/category name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(nameInput).toHaveAttribute('aria-describedby');

      // Icon selection
      const iconGroup = screen.getByRole('radiogroup', { name: /select category icon/i });
      expect(iconGroup).toBeInTheDocument();

      // Sizing formats
      const formatsGroup = screen.getByRole('group', { name: /sizing format options/i });
      expect(formatsGroup).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when category name is empty', async () => {
      renderForm();

      const saveButton = screen.getByRole('button', { name: /save new category/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should show error when category name exceeds 50 characters', async () => {
      renderForm();

      const nameInput = screen.getByLabelText(/category name/i);
      const longName = 'A'.repeat(51);
      fireEvent.change(nameInput, { target: { value: longName } });

      const saveButton = screen.getByRole('button', { name: /save new category/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/50 characters or less/i)).toBeInTheDocument();
      });
    });

    it('should not allow removing the last sizing format', () => {
      renderForm();

      // Letter format is selected by default
      const letterCheckbox = screen.getByRole('checkbox', { name: /letter sizes/i });
      expect(letterCheckbox).toBeChecked();

      // Try to uncheck it (should not work since it's the only one)
      fireEvent.click(letterCheckbox);

      // Should still be checked
      expect(letterCheckbox).toBeChecked();
    });

    it('should allow selecting multiple sizing formats', () => {
      renderForm();

      const letterCheckbox = screen.getByRole('checkbox', { name: /letter sizes/i });
      const numericCheckbox = screen.getByRole('checkbox', { name: /numeric sizes/i });

      // Letter is already checked
      expect(letterCheckbox).toBeChecked();
      expect(numericCheckbox).not.toBeChecked();

      // Select numeric
      fireEvent.click(numericCheckbox);
      expect(numericCheckbox).toBeChecked();

      // Now we can uncheck letter since we have numeric
      fireEvent.click(letterCheckbox);
      expect(letterCheckbox).not.toBeChecked();
      expect(numericCheckbox).toBeChecked();
    });
  });

  describe('Icon Selection', () => {
    it('should allow selecting an icon', () => {
      renderForm();

      const iconButtons = screen.getAllByRole('radio');
      expect(iconButtons.length).toBeGreaterThan(0);

      // Select first icon
      fireEvent.click(iconButtons[0]);
      expect(iconButtons[0]).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow deselecting an icon', () => {
      renderForm();

      const iconButtons = screen.getAllByRole('radio');
      
      // Select first icon
      fireEvent.click(iconButtons[0]);
      expect(iconButtons[0]).toHaveAttribute('aria-checked', 'true');

      // Click again to deselect
      fireEvent.click(iconButtons[0]);
      expect(iconButtons[0]).toHaveAttribute('aria-checked', 'false');
    });

    it('should only allow one icon to be selected at a time', () => {
      renderForm();

      const iconButtons = screen.getAllByRole('radio');
      
      // Select first icon
      fireEvent.click(iconButtons[0]);
      expect(iconButtons[0]).toHaveAttribute('aria-checked', 'true');

      // Select second icon
      fireEvent.click(iconButtons[1]);
      expect(iconButtons[0]).toHaveAttribute('aria-checked', 'false');
      expect(iconButtons[1]).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Form Submission', () => {
    it('should call onSave when form is submitted successfully', async () => {
      renderForm();

      // Fill in category name
      const nameInput = screen.getByLabelText(/category name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Category' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save new category/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      renderForm();

      const cancelButton = screen.getByRole('button', { name: /cancel category creation/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pin to Top Feature', () => {
    it('should have pin to top checkbox', () => {
      renderForm();

      const pinCheckbox = screen.getByRole('checkbox', { name: /pin to top/i });
      expect(pinCheckbox).toBeInTheDocument();
      expect(pinCheckbox).not.toBeChecked();
    });

    it('should allow toggling pin to top', () => {
      renderForm();

      const pinCheckbox = screen.getByRole('checkbox', { name: /pin to top/i });
      
      // Initially unchecked
      expect(pinCheckbox).not.toBeChecked();

      // Check it
      fireEvent.click(pinCheckbox);
      expect(pinCheckbox).toBeChecked();

      // Uncheck it
      fireEvent.click(pinCheckbox);
      expect(pinCheckbox).not.toBeChecked();
    });
  });
});

describe('AddCategoryModal', () => {
  let queryClient: QueryClient;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    mockOnClose = vi.fn();
    mockOnSave = vi.fn();
  });

  const renderModal = (isOpen: boolean = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AddCategoryModal isOpen={isOpen} onClose={mockOnClose} onSave={mockOnSave} />
      </QueryClientProvider>
    );
  };

  describe('Responsive Presentation', () => {
    it('should render modal when open', () => {
      renderModal(true);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add category/i)).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      renderModal(false);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      renderModal(true);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'add-category-title');
    });

    it('should have close button', () => {
      renderModal(true);

      const closeButton = screen.getByRole('button', { name: /close dialog/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      renderModal(true);

      const closeButton = screen.getByRole('button', { name: /close dialog/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      renderModal(true);

      // The backdrop is the dialog element itself
      const backdrop = screen.getByRole('dialog');
      
      // Simulate clicking the backdrop (not the inner content)
      // We need to ensure the click target is the backdrop itself
      fireEvent.click(backdrop, { target: backdrop });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when modal content is clicked', () => {
      renderModal(true);

      // Find the inner modal content div (has the form inside)
      const backdrop = screen.getByRole('dialog');
      const modalContent = backdrop.querySelector('div[class*="relative"]');
      
      if (modalContent) {
        // Click the inner content - should not close
        fireEvent.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });

    it('should have mobile-first responsive classes', () => {
      renderModal(true);

      const backdrop = screen.getByRole('dialog');
      expect(backdrop).toHaveClass('items-end'); // Mobile: bottom sheet
      expect(backdrop).toHaveClass('md:items-center'); // Tablet+: centered
    });

    it('should have proper styling for mobile and tablet', () => {
      renderModal(true);

      const backdrop = screen.getByRole('dialog');
      const modalContent = backdrop.querySelector('div[class*="relative"]');
      
      // Backdrop should have full width
      expect(backdrop).toHaveClass('fixed');
      expect(backdrop).toHaveClass('inset-0');
      
      // Modal content should have proper responsive classes
      if (modalContent) {
        expect(modalContent).toHaveClass('w-full');
        expect(modalContent).toHaveClass('md:max-w-2xl');
        expect(modalContent).toHaveClass('md:rounded-lg');
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', () => {
      renderModal(true);

      // Simulate Escape key press
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Body Scroll Lock', () => {
    it('should prevent body scroll when modal is open', () => {
      const originalOverflow = document.body.style.overflow;
      
      renderModal(true);

      expect(document.body.style.overflow).toBe('hidden');

      // Cleanup
      document.body.style.overflow = originalOverflow;
    });
  });
});

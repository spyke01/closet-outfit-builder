/**
 * Unit Tests for StandardSizeSection Component
 * 
 * Validates:
 * - Display of all fields (primary size, secondary size, notes, timestamp) (Requirement 4.2)
 * - Edit button interaction (Requirement 4.2)
 * - Form validation (Requirements 5.1-5.4)
 * - Empty state display
 * - Form submission and error handling
 * - Accessibility features
 * 
 * Task: 11.4 Write unit tests for StandardSizeSection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StandardSizeSection } from '../standard-size-section'
import type { SizeCategory, StandardSize } from '@/lib/types/sizes'

// Mock the hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useUpdateStandardSize: vi.fn(),
}))

import { useUpdateStandardSize } from '@/lib/hooks/use-size-categories'

describe('StandardSizeSection', () => {
  const mockCategory: SizeCategory = {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Tops',
    supported_formats: ['letter', 'numeric'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockStandardSize: StandardSize = {
    id: 'size-1',
    category_id: 'cat-1',
    user_id: 'user-1',
    primary_size: 'M',
    secondary_size: 'L',
    notes: 'Fits well, slightly loose',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T14:30:00Z',
  }

  const mockCategoryWithStandardSize = {
    ...mockCategory,
    standard_sizes: [mockStandardSize],
  }

  const mockMutateAsync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation
    vi.mocked(useUpdateStandardSize).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as any)
  })

  describe('Display of All Fields (Requirement 4.2)', () => {
    it('should render section title', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      expect(screen.getByText('Standard Size')).toBeInTheDocument()
    })

    it('should render edit button', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      expect(editButton).toBeInTheDocument()
    })

    it('should display primary size', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      expect(screen.getByText('Primary Size')).toBeInTheDocument()
      expect(screen.getByText('M')).toBeInTheDocument()
    })

    it('should display secondary size when present', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      expect(screen.getByText('Secondary Size')).toBeInTheDocument()
      expect(screen.getByText('L')).toBeInTheDocument()
    })

    it('should not display secondary size when not present', () => {
      const categoryWithoutSecondary = {
        ...mockCategory,
        standard_sizes: [{
          ...mockStandardSize,
          secondary_size: undefined,
        }],
      }

      render(<StandardSizeSection category={categoryWithoutSecondary} />)

      expect(screen.queryByText('Secondary Size')).not.toBeInTheDocument()
    })

    it('should display notes when present', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      expect(screen.getByText('Notes')).toBeInTheDocument()
      expect(screen.getByText('Fits well, slightly loose')).toBeInTheDocument()
    })

    it('should not display notes section when notes are empty', () => {
      const categoryWithoutNotes = {
        ...mockCategory,
        standard_sizes: [{
          ...mockStandardSize,
          notes: undefined,
        }],
      }

      render(<StandardSizeSection category={categoryWithoutNotes} />)

      expect(screen.queryByText('Notes')).not.toBeInTheDocument()
    })

    it('should display last updated timestamp (Requirement 5.5)', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument()
      // Should format as "Jan 15, 2024, 2:30 PM" or similar
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no standard size exists', () => {
      render(<StandardSizeSection category={mockCategory} />)

      expect(screen.getByText('No standard size set for this category')).toBeInTheDocument()
    })

    it('should display "Add Standard Size" button in empty state', () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      expect(addButton).toBeInTheDocument()
    })

    it('should open form when "Add Standard Size" button is clicked', () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      // Form should be visible
      expect(screen.getByText('Add Standard Size')).toBeInTheDocument()
      expect(screen.getByLabelText(/Primary Size/i)).toBeInTheDocument()
    })
  })

  describe('Edit Button Interaction (Requirement 4.2)', () => {
    it('should open form when edit button is clicked', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      // Form should be visible
      expect(screen.getByText('Edit Standard Size')).toBeInTheDocument()
      expect(screen.getByLabelText(/Primary Size/i)).toBeInTheDocument()
    })

    it('should pre-populate form with existing values', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      // Form fields should be pre-populated
      const primarySizeInput = screen.getByLabelText(/Primary Size/i) as HTMLInputElement
      const secondarySizeInput = screen.getByLabelText(/Secondary Size/i) as HTMLInputElement
      const notesInput = screen.getByLabelText(/Notes/i) as HTMLTextAreaElement

      expect(primarySizeInput.value).toBe('M')
      expect(secondarySizeInput.value).toBe('L')
      expect(notesInput.value).toBe('Fits well, slightly loose')
    })

    it('should hide display view when form is open', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      // Display view should not be visible
      expect(screen.queryByText('Primary Size')).not.toBeInTheDocument()
      expect(screen.queryByText('Last updated:')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation (Requirements 5.1-5.4)', () => {
    it('should show error when primary size is empty', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      // Clear the primary size input
      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: '' } })

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Size is required/i)).toBeInTheDocument()
      })
    })

    it('should accept letter size format (Requirement 5.1)', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: 'XL' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_size: 'XL',
          })
        )
      })
    })

    it('should accept numeric size format (Requirement 5.2)', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: '10' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_size: '10',
          })
        )
      })
    })

    it('should accept waist/inseam size format (Requirement 5.3)', async () => {
      const categoryWithWaistInseam = {
        ...mockCategory,
        supported_formats: ['waist-inseam' as const],
      }

      render(<StandardSizeSection category={categoryWithWaistInseam} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: '32x34' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_size: '32x34',
          })
        )
      })
    })

    it('should show error for invalid size format', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: 'invalid-size!' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Size must be in letter format/i)).toBeInTheDocument()
      })
    })

    it('should show error when notes exceed 500 characters', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const notesInput = screen.getByLabelText(/Notes/i)
      const longNotes = 'a'.repeat(501)
      fireEvent.change(notesInput, { target: { value: longNotes } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Notes must be 500 characters or less/i)).toBeInTheDocument()
      })
    })

    it('should display format helper text based on supported formats', () => {
      const categoryWithMultipleFormats = {
        ...mockCategory,
        supported_formats: ['letter' as const, 'numeric' as const, 'waist-inseam' as const],
      }

      render(<StandardSizeSection category={categoryWithMultipleFormats} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      expect(screen.getByText(/Supported formats: letter \(S, M, L\), numeric \(8, 10\), waist\/inseam \(32x34\)/i)).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call mutation with correct data on save', async () => {
      mockMutateAsync.mockResolvedValue({})

      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      const secondarySizeInput = screen.getByLabelText(/Secondary Size/i)
      const notesInput = screen.getByLabelText(/Notes/i)

      fireEvent.change(primarySizeInput, { target: { value: 'L' } })
      fireEvent.change(secondarySizeInput, { target: { value: 'XL' } })
      fireEvent.change(notesInput, { target: { value: 'Test notes' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          category_id: 'cat-1',
          primary_size: 'L',
          secondary_size: 'XL',
          notes: 'Test notes',
        })
      })
    })

    it('should close form after successful save', async () => {
      mockMutateAsync.mockResolvedValue({})

      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: 'M' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        // Form should be closed
        expect(screen.queryByText('Add Standard Size')).not.toBeInTheDocument()
      })
    })

    it('should show loading state during save', async () => {
      vi.mocked(useUpdateStandardSize).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      } as any)

      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const saveButton = screen.getByRole('button', { name: /Saving.../i })
      expect(saveButton).toBeDisabled()
    })

    it('should show error message on save failure', async () => {
      vi.mocked(useUpdateStandardSize).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: true,
        error: new Error('Failed to save'),
      } as any)

      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      expect(screen.getByText(/Failed to save standard size/i)).toBeInTheDocument()
    })
  })

  describe('Form Cancellation', () => {
    it('should close form when cancel button is clicked', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      // Form should be closed, display view should be visible
      expect(screen.queryByText('Edit Standard Size')).not.toBeInTheDocument()
      expect(screen.getByText('Primary Size')).toBeInTheDocument()
    })

    it('should close form when close (X) button is clicked', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      const closeButton = screen.getByRole('button', { name: /Close form/i })
      fireEvent.click(closeButton)

      // Form should be closed
      expect(screen.queryByText('Edit Standard Size')).not.toBeInTheDocument()
    })

    it('should not save changes when form is cancelled', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: 'XL' } })

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      // Mutation should not be called
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA label for edit button', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: 'Edit standard size for Tops' })
      expect(editButton).toHaveAttribute('aria-label', 'Edit standard size for Tops')
    })

    it('should have proper form field labels', () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      expect(screen.getByLabelText(/Primary Size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Secondary Size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument()
    })

    it('should have aria-required on required fields', () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      expect(primarySizeInput).toHaveAttribute('aria-required', 'true')
    })

    it('should have aria-invalid on fields with errors', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: '' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(primarySizeInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should have aria-describedby linking to helper text and errors', () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      const ariaDescribedBy = primarySizeInput.getAttribute('aria-describedby')

      expect(ariaDescribedBy).toContain('primary-size-hint')
      expect(ariaDescribedBy).toContain('primary-size-error')
    })

    it('should have role="alert" on error messages', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: '' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(/Size is required/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })

    it('should have aria-hidden on decorative icons', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      const icon = editButton.querySelector('svg')

      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('should handle category with no supported formats', () => {
      const categoryWithNoFormats = {
        ...mockCategory,
        supported_formats: [],
      }

      render(<StandardSizeSection category={categoryWithNoFormats} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      // Should still render form
      expect(screen.getByLabelText(/Primary Size/i)).toBeInTheDocument()
    })

    it('should handle very long notes', () => {
      const categoryWithLongNotes = {
        ...mockCategory,
        standard_sizes: [{
          ...mockStandardSize,
          notes: 'a'.repeat(500),
        }],
      }

      render(<StandardSizeSection category={categoryWithLongNotes} />)

      // Should display all notes
      expect(screen.getByText('a'.repeat(500))).toBeInTheDocument()
    })

    it('should handle empty string values', () => {
      const categoryWithEmptyValues = {
        ...mockCategory,
        standard_sizes: [{
          ...mockStandardSize,
          secondary_size: '',
          notes: '',
        }],
      }

      render(<StandardSizeSection category={categoryWithEmptyValues} />)

      // Should not display empty secondary size or notes
      expect(screen.queryByText('Secondary Size')).not.toBeInTheDocument()
      expect(screen.queryByText('Notes')).not.toBeInTheDocument()
    })
  })
})

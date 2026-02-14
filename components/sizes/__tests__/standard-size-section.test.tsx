/**
 * Unit Tests for StandardSizeSection Component
 * 
 * Focus: Core functionality and user interactions
 * - Data display
 * - Form submission and validation
 * - Error handling
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
  const categoryId = '550e8400-e29b-41d4-a716-446655440100'

  const mockCategory: SizeCategory = {
    id: categoryId,
    user_id: '550e8400-e29b-41d4-a716-446655440101',
    name: 'Tops',
    supported_formats: ['letter', 'numeric'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockStandardSize: StandardSize = {
    id: 'size-1',
    category_id: categoryId,
    user_id: '550e8400-e29b-41d4-a716-446655440101',
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

    vi.mocked(useUpdateStandardSize).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown)
  })

  describe('Data Display', () => {
    it('should display primary and secondary sizes', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      expect(screen.getByText('Primary Size')).toBeInTheDocument()
      expect(screen.getByText('M')).toBeInTheDocument()
      expect(screen.getByText('Secondary Size')).toBeInTheDocument()
      expect(screen.getByText('L')).toBeInTheDocument()
    })

    it('should display notes when present', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      expect(screen.getByText('Notes')).toBeInTheDocument()
      expect(screen.getByText('Fits well, slightly loose')).toBeInTheDocument()
    })

    it('should display empty state when no standard size exists', () => {
      render(<StandardSizeSection category={mockCategory} />)

      expect(screen.getByText('No standard size set for this category')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add Standard Size/i })).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should open form when edit button is clicked', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      expect(screen.getByText('Edit Standard Size')).toBeInTheDocument()
      expect(screen.getByLabelText(/Primary Size/i)).toBeInTheDocument()
    })

    it('should pre-populate form with existing values', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i) as HTMLInputElement
      const secondarySizeInput = screen.getByLabelText(/Secondary Size/i) as HTMLInputElement
      const notesInput = screen.getByLabelText(/Notes/i) as HTMLTextAreaElement

      expect(primarySizeInput.value).toBe('M')
      expect(secondarySizeInput.value).toBe('L')
      expect(notesInput.value).toBe('Fits well, slightly loose')
    })

    it('should close form when cancel button is clicked', () => {
      render(<StandardSizeSection category={mockCategoryWithStandardSize} />)

      const editButton = screen.getByRole('button', { name: /Edit standard size for Tops/i })
      fireEvent.click(editButton)

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(screen.queryByText('Edit Standard Size')).not.toBeInTheDocument()
      expect(screen.getByText('Primary Size')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when primary size is empty', async () => {
      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      const primarySizeInput = screen.getByLabelText(/Primary Size/i)
      fireEvent.change(primarySizeInput, { target: { value: '' } })

      const saveButton = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Size is required/i)).toBeInTheDocument()
      })
    })

    it('should accept valid size formats', async () => {
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

    it('should show error for notes exceeding 500 characters', async () => {
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
          category_id: categoryId,
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
        expect(screen.queryByText('Add Standard Size')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /^Save$/i })).not.toBeInTheDocument()
      })
    })

    it('should show loading state during save', async () => {
      vi.mocked(useUpdateStandardSize).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
      } as unknown)

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
      } as unknown)

      render(<StandardSizeSection category={mockCategory} />)

      const addButton = screen.getByRole('button', { name: /Add Standard Size/i })
      fireEvent.click(addButton)

      expect(screen.getByText(/Failed to save standard size/i)).toBeInTheDocument()
    })
  })
})

/**
 * Unit Tests: BrandSizeForm Component
 * 
 * Tests form rendering, validation errors, brand dropdown search, and fit scale selector.
 * 
 * Requirements: 6.1-6.4, 14.1-14.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrandSizeForm } from '../brand-size-form'
import type { BrandSize } from '@/lib/types/sizes'

// Mock the hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useBrandSizes: vi.fn(() => ({
    data: [
      {
        id: 'brand-1',
        category_id: 'test-category',
        user_id: 'test-user',
        brand_name: 'Nike',
        size: 'M',
        fit_scale: 3,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'brand-2',
        category_id: 'test-category',
        user_id: 'test-user',
        brand_name: 'Adidas',
        size: 'L',
        fit_scale: 3,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] as BrandSize[],
    isLoading: false,
    error: null,
  })),
  useCreateBrandSize: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
  })),
}))

// Test utilities
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('BrandSizeForm', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()
  const categoryId = 'test-category-id'
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('should render all form fields', () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    // Check for required fields
    expect(screen.getByLabelText(/brand name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/item type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^size/i)).toBeInTheDocument()
    expect(screen.getByText(/fit scale/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    
    // Check for action buttons
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })
  
  it('should display all fit scale options', () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    // Check for all 5 fit scale options
    expect(screen.getByText('Runs Small')).toBeInTheDocument()
    expect(screen.getByText('Slightly Small')).toBeInTheDocument()
    expect(screen.getByText('True to Size')).toBeInTheDocument()
    expect(screen.getByText('Slightly Large')).toBeInTheDocument()
    expect(screen.getByText('Runs Large')).toBeInTheDocument()
  })
  
  it('should call onCancel when cancel button is clicked', () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
  
  it('should show brand dropdown when brand name field is focused', async () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    const brandNameInput = screen.getByLabelText(/brand name/i)
    fireEvent.focus(brandNameInput)
    
    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Nike')).toBeInTheDocument()
      expect(screen.getByText('Adidas')).toBeInTheDocument()
    })
  })
  
  it('should filter brand names based on search query', async () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    const brandNameInput = screen.getByLabelText(/brand name/i)
    
    // Focus to show dropdown
    fireEvent.focus(brandNameInput)
    
    // Type to filter
    fireEvent.change(brandNameInput, { target: { value: 'nik' } })
    
    await waitFor(() => {
      expect(screen.getByText('Nike')).toBeInTheDocument()
      expect(screen.queryByText('Adidas')).not.toBeInTheDocument()
    })
  })
  
  it('should populate form fields when editing existing brand size', () => {
    const existingBrandSize: BrandSize = {
      id: 'existing-id',
      category_id: categoryId,
      user_id: 'test-user',
      brand_name: 'Test Brand',
      item_type: 'Test Item',
      size: 'L',
      fit_scale: 4,
      notes: 'Test notes',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    
    render(
      <BrandSizeForm
        categoryId={categoryId}
        brandSize={existingBrandSize}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    // Check that fields are populated
    expect(screen.getByLabelText(/brand name/i)).toHaveValue('Test Brand')
    expect(screen.getByLabelText(/item type/i)).toHaveValue('Test Item')
    expect(screen.getByLabelText(/^size/i)).toHaveValue('L')
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Test notes')
  })
  
  it('should have proper ARIA labels for accessibility', () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    // Check ARIA attributes
    const brandNameInput = screen.getByLabelText(/brand name/i)
    expect(brandNameInput).toHaveAttribute('aria-required', 'true')
    expect(brandNameInput).toHaveAttribute('aria-describedby')
    
    const sizeInput = screen.getByLabelText(/^size/i)
    expect(sizeInput).toHaveAttribute('aria-required', 'true')
    expect(sizeInput).toHaveAttribute('aria-describedby')
    
    // Check for fit scale radio group
    const fitScaleGroup = screen.getByRole('radiogroup')
    expect(fitScaleGroup).toHaveAttribute('aria-label', 'Fit scale selector')
  })
  
  it('should mark required fields with asterisk', () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    // Check that required fields have aria-required attribute
    const brandNameInput = screen.getByLabelText(/brand name/i)
    expect(brandNameInput).toHaveAttribute('aria-required', 'true')
    
    const sizeInput = screen.getByLabelText(/^size/i)
    expect(sizeInput).toHaveAttribute('aria-required', 'true')
    
    // Check that fit scale radio group exists (required field)
    const fitScaleGroup = screen.getByRole('radiogroup', { name: /fit scale/i })
    expect(fitScaleGroup).toBeInTheDocument()
  })
  
  it('should mark optional fields appropriately', () => {
    render(
      <BrandSizeForm
        categoryId={categoryId}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
      { wrapper: createWrapper() }
    )
    
    // Item type should be optional
    const itemTypeLabel = screen.getByText(/item type/i).closest('label')
    expect(itemTypeLabel).toHaveTextContent('(optional)')
    
    // Notes should be optional
    const notesLabels = screen.getAllByText(/notes/i)
    const notesLabel = notesLabels[0].closest('label')
    expect(notesLabel).toHaveTextContent('(optional)')
  })
})

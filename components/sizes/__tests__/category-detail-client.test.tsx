/**
 * Unit Tests for CategoryDetailClient Component
 * 
 * Focus: Core functionality and user interactions
 * - Section rendering and data flow
 * - Navigation actions
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CategoryDetailClient } from '../category-detail-client'
import type { SizeCategory, StandardSize, BrandSize, CategoryMeasurements } from '@/lib/types/sizes'

// Mock the hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategory: vi.fn(),
  useBrandSizes: vi.fn(),
  useMeasurements: vi.fn(),
}))

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: (fn: unknown) => {
    const Component = fn().then ? null : fn
    if (Component) return Component
    
    return (props: unknown) => {
      const [LoadedComponent, setLoadedComponent] = React.useState<unknown>(null)
      
      React.useEffect(() => {
        Promise.resolve(fn()).then((mod: unknown) => {
          setLoadedComponent(() => mod.default || mod)
        })
      }, [])
      
      if (!LoadedComponent) return null
      return <LoadedComponent {...props} />
    }
  },
}))

// Mock section components
vi.mock('../standard-size-section', () => ({
  StandardSizeSection: ({ category }: unknown) => (
    <div data-testid="standard-size-section">
      Standard Size Section for {category.name}
    </div>
  ),
}))

vi.mock('../brand-sizes-section', () => ({
  BrandSizesSection: ({ categoryId }: unknown) => (
    <div data-testid="brand-sizes-section">
      Brand Sizes Section for {categoryId}
    </div>
  ),
}))

vi.mock('../measurement-guide-section', () => ({
  MeasurementGuideSection: ({ categoryId }: unknown) => (
    <div data-testid="measurement-guide-section">
      Measurement Guide Section for {categoryId}
    </div>
  ),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

import { useSizeCategory, useBrandSizes, useMeasurements } from '@/lib/hooks/use-size-categories'

describe('CategoryDetailClient', () => {
  const mockCategory: SizeCategory & { standard_sizes?: StandardSize[] } = {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Tops',
    supported_formats: ['letter', 'numeric'],
    is_system_category: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

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
  ]

  const mockMeasurements: CategoryMeasurements = {
    id: 'meas-1',
    category_id: 'cat-1',
    user_id: 'user-1',
    measurements: { chest: 40, waist: 32 },
    unit: 'imperial',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useSizeCategory).mockReturnValue({
      data: mockCategory,
      isLoading: false,
      error: null,
    } as unknown)

    vi.mocked(useBrandSizes).mockReturnValue({
      data: mockBrandSizes,
      isLoading: false,
      error: null,
    } as unknown)

    vi.mocked(useMeasurements).mockReturnValue({
      data: mockMeasurements,
      isLoading: false,
      error: null,
    } as unknown)
  })

  describe('Section Rendering', () => {
    it('should render all three sections with correct data', async () => {
      const { findByTestId, findByText } = render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(await findByTestId('standard-size-section')).toBeInTheDocument()
      expect(await findByTestId('brand-sizes-section')).toBeInTheDocument()
      expect(await findByTestId('measurement-guide-section')).toBeInTheDocument()
      
      expect(await findByText(`Standard Size Section for ${mockCategory.name}`)).toBeInTheDocument()
      expect(await findByText(`Brand Sizes Section for ${mockCategory.id}`)).toBeInTheDocument()
      expect(await findByText(`Measurement Guide Section for ${mockCategory.id}`)).toBeInTheDocument()
    })

    it('should display category name in header', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByRole('heading', { name: 'Tops' })).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to /sizes when back button is clicked', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const backButton = screen.getByRole('button', { name: 'Back to sizes' })
      fireEvent.click(backButton)

      expect(mockPush).toHaveBeenCalledWith('/sizes')
    })

    it('should navigate to /sizes when close button is clicked', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const closeButtons = screen.getAllByRole('button', { name: /Close category details/i })
      fireEvent.click(closeButtons[0])

      expect(mockPush).toHaveBeenCalledWith('/sizes')
    })

    it('should navigate to /sizes when Escape key is pressed', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      fireEvent.keyDown(mainElement, { key: 'Escape' })

      expect(mockPush).toHaveBeenCalledWith('/sizes')
    })
  })

  describe('Data Fetching', () => {
    it('should use TanStack Query hooks with initial data', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(useSizeCategory).toHaveBeenCalledWith(mockCategory.id, {
        initialData: mockCategory,
      })

      expect(useBrandSizes).toHaveBeenCalledWith(mockCategory.id, {
        initialData: mockBrandSizes,
      })

      expect(useMeasurements).toHaveBeenCalledWith(mockCategory.id, {
        initialData: mockMeasurements,
      })
    })

    it('should show loading state when category is not available', () => {
      vi.mocked(useSizeCategory).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as unknown)

      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByText('Loading category details...')).toBeInTheDocument()
    })

    it('should handle null measurements', async () => {
      const { findByTestId } = render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={null}
        />
      )

      expect(await findByTestId('measurement-guide-section')).toBeInTheDocument()
    })
  })
})

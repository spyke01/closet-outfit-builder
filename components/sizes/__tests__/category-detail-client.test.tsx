/**
 * Unit Tests for CategoryDetailClient Component
 * 
 * Validates:
 * - Three-section layout (Standard Size, Brand Sizes, Measurement Guide) (Requirement 4.1)
 * - Responsive presentation (mobile: full-screen, tablet+: modal/panel) (Requirements 7.2, 7.3)
 * - Navigation actions (back button, close button) (Requirement 2.2)
 * - Data fetching and rendering
 * - Keyboard navigation (Escape key)
 * - Accessibility features
 * 
 * Task: 15.4 Write unit tests for CategoryDetailView
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryDetailClient } from '../category-detail-client'
import type { SizeCategory, StandardSize, BrandSize, CategoryMeasurements } from '@/lib/types/sizes'

// Mock the hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategory: vi.fn(),
  useBrandSizes: vi.fn(),
  useMeasurements: vi.fn(),
}))

// Mock the section components
vi.mock('../standard-size-section', () => ({
  StandardSizeSection: ({ category }: any) => (
    <div data-testid="standard-size-section">
      Standard Size Section for {category.name}
    </div>
  ),
}))

vi.mock('../brand-sizes-section', () => ({
  BrandSizesSection: ({ categoryId }: any) => (
    <div data-testid="brand-sizes-section">
      Brand Sizes Section for {categoryId}
    </div>
  ),
}))

vi.mock('../measurement-guide-section', () => ({
  MeasurementGuideSection: ({ categoryId }: any) => (
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
    standard_sizes: [{
      id: 'size-1',
      category_id: 'cat-1',
      user_id: 'user-1',
      primary_size: 'M',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }],
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

    // Default mock implementations
    vi.mocked(useSizeCategory).mockReturnValue({
      data: mockCategory,
      isLoading: false,
      error: null,
    } as any)

    vi.mocked(useBrandSizes).mockReturnValue({
      data: mockBrandSizes,
      isLoading: false,
      error: null,
    } as any)

    vi.mocked(useMeasurements).mockReturnValue({
      data: mockMeasurements,
      isLoading: false,
      error: null,
    } as any)
  })

  describe('Three-Section Layout (Requirement 4.1)', () => {
    it('should render all three sections', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByTestId('standard-size-section')).toBeInTheDocument()
      expect(screen.getByTestId('brand-sizes-section')).toBeInTheDocument()
      expect(screen.getByTestId('measurement-guide-section')).toBeInTheDocument()
    })

    it('should render sections in correct order', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const sections = screen.getAllByTestId(/section/)
      expect(sections[0]).toHaveAttribute('data-testid', 'standard-size-section')
      expect(sections[1]).toHaveAttribute('data-testid', 'brand-sizes-section')
      expect(sections[2]).toHaveAttribute('data-testid', 'measurement-guide-section')
    })

    it('should pass correct props to StandardSizeSection', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByText(`Standard Size Section for ${mockCategory.name}`)).toBeInTheDocument()
    })

    it('should pass correct props to BrandSizesSection', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByText(`Brand Sizes Section for ${mockCategory.id}`)).toBeInTheDocument()
    })

    it('should pass correct props to MeasurementGuideSection', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByText(`Measurement Guide Section for ${mockCategory.id}`)).toBeInTheDocument()
    })
  })

  describe('Header and Navigation', () => {
    it('should render category name in header', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByRole('heading', { name: 'Tops' })).toBeInTheDocument()
    })

    it('should render back button for mobile', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const backButton = screen.getByRole('button', { name: 'Back to sizes' })
      expect(backButton).toBeInTheDocument()
      expect(backButton).toHaveClass('md:hidden')
    })

    it('should render close button', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const closeButtons = screen.getAllByRole('button', { name: /Close category details/i })
      expect(closeButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Navigation Actions (Requirement 2.2)', () => {
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

    it('should not navigate when other keys are pressed', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      fireEvent.keyDown(mainElement, { key: 'Enter' })

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Responsive Presentation (Requirements 7.2, 7.3)', () => {
    it('should have mobile-first styling classes', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveClass('container', 'mx-auto', 'px-4')
    })

    it('should have responsive padding classes', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveClass('py-6', 'md:py-8')
    })

    it('should have responsive spacing between sections', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveClass('space-y-6', 'md:space-y-8')
    })

    it('should have max-width constraint for larger screens', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveClass('max-w-4xl')
    })

    it('should have responsive background colors', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const container = screen.getByRole('main').parentElement
      expect(container).toHaveClass('bg-gray-50', 'md:bg-white')
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
      } as any)

      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByText('Loading category details...')).toBeInTheDocument()
    })

    it('should handle null measurements', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={null}
        />
      )

      // Should still render all sections
      expect(screen.getByTestId('measurement-guide-section')).toBeInTheDocument()
    })

    it('should handle empty brand sizes array', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={[]}
          initialMeasurements={mockMeasurements}
        />
      )

      // Should still render brand sizes section
      expect(screen.getByTestId('brand-sizes-section')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA label on main element', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveAttribute('aria-label', 'Tops size details')
    })

    it('should have proper ARIA labels on navigation buttons', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByRole('button', { name: 'Back to sizes' })).toHaveAttribute('aria-label', 'Back to sizes')
      
      const closeButtons = screen.getAllByRole('button', { name: /Close category details/i })
      closeButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label', 'Close category details')
      })
    })

    it('should have aria-hidden on decorative icons', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const backButton = screen.getByRole('button', { name: 'Back to sizes' })
      const icon = backButton.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have proper heading hierarchy', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const heading = screen.getByRole('heading', { name: 'Tops' })
      expect(heading.tagName).toBe('H1')
    })

    it('should have focus-visible styles on interactive elements', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const backButton = screen.getByRole('button', { name: 'Back to sizes' })
      expect(backButton).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2')
    })
  })

  describe('Edge Cases', () => {
    it('should handle category with very long name', () => {
      const longNameCategory = {
        ...mockCategory,
        name: 'Very Long Category Name That Should Be Displayed Properly',
      }

      vi.mocked(useSizeCategory).mockReturnValue({
        data: longNameCategory,
        isLoading: false,
        error: null,
      } as any)

      render(
        <CategoryDetailClient
          initialCategory={longNameCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      expect(screen.getByRole('heading', { name: longNameCategory.name })).toBeInTheDocument()
    })

    it('should handle category without standard sizes', () => {
      const categoryWithoutStandardSize = {
        ...mockCategory,
        standard_sizes: [],
      }

      vi.mocked(useSizeCategory).mockReturnValue({
        data: categoryWithoutStandardSize,
        isLoading: false,
        error: null,
      } as any)

      render(
        <CategoryDetailClient
          initialCategory={categoryWithoutStandardSize}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      // Should still render all sections
      expect(screen.getByTestId('standard-size-section')).toBeInTheDocument()
    })

    it('should handle multiple close button clicks', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const closeButtons = screen.getAllByRole('button', { name: /Close category details/i })
      fireEvent.click(closeButtons[0])
      fireEvent.click(closeButtons[0])

      // Should only navigate once per click
      expect(mockPush).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid keyboard events', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      fireEvent.keyDown(mainElement, { key: 'Escape' })
      fireEvent.keyDown(mainElement, { key: 'Escape' })
      fireEvent.keyDown(mainElement, { key: 'Escape' })

      expect(mockPush).toHaveBeenCalledTimes(3)
    })
  })

  describe('Layout Structure', () => {
    it('should have sticky header', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('sticky', 'top-0', 'z-10')
    })

    it('should have proper section spacing', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const sections = screen.getAllByTestId(/section/)
      sections.forEach(section => {
        const container = section.parentElement
        expect(container).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm')
      })
    })

    it('should have proper container structure', () => {
      render(
        <CategoryDetailClient
          initialCategory={mockCategory}
          initialBrandSizes={mockBrandSizes}
          initialMeasurements={mockMeasurements}
        />
      )

      const mainElement = screen.getByRole('main')
      expect(mainElement).toHaveClass('container', 'mx-auto')
    })
  })
})

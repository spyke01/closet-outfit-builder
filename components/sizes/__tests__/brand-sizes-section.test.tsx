/**
 * Unit Tests: BrandSizesSection Component
 * 
 * Tests for the BrandSizesSection component that displays and manages
 * brand-specific size overrides for a category.
 * 
 * Requirements: 4.3, 12.2, 12.4
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandSizesSection } from '../brand-sizes-section'
import type { BrandSize } from '@/lib/types/sizes'

// Mock lucide-react icons
vi.mock('lucide-react/dist/esm/icons/plus', () => ({
  default: () => <svg data-testid="plus-icon" />
}))

/**
 * Helper function to create mock brand size data
 */
function createMockBrandSize(overrides: Partial<BrandSize> = {}): BrandSize {
  return {
    id: 'test-brand-size-id',
    category_id: 'test-category-id',
    user_id: 'test-user-id',
    brand_name: 'Test Brand',
    item_type: 'Test Item',
    size: 'M',
    fit_scale: 3,
    notes: 'Test notes',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }
}

describe('BrandSizesSection', () => {
  describe('List Rendering', () => {
    it('should render list of brand size entries', () => {
      const brandSizes = [
        createMockBrandSize({ id: '1', brand_name: 'Nike', size: 'L' }),
        createMockBrandSize({ id: '2', brand_name: 'Adidas', size: 'M' }),
        createMockBrandSize({ id: '3', brand_name: 'Puma', size: 'S' })
      ]

      render(<BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />)

      // Check that all brand names are displayed
      expect(screen.getByText('Nike')).toBeInTheDocument()
      expect(screen.getByText('Adidas')).toBeInTheDocument()
      expect(screen.getByText('Puma')).toBeInTheDocument()

      // Check that all sizes are displayed
      expect(screen.getByText('L')).toBeInTheDocument()
      expect(screen.getByText('M')).toBeInTheDocument()
      expect(screen.getByText('S')).toBeInTheDocument()
    })

    it('should display brand name, item type, size, and fit scale for each entry', () => {
      const brandSize = createMockBrandSize({
        brand_name: 'Levi\'s',
        item_type: 'Jeans',
        size: '32x34',
        fit_scale: 2
      })

      render(<BrandSizesSection brandSizes={[brandSize]} categoryId="test-category" />)

      // Check all required fields are displayed
      expect(screen.getByText('Levi\'s')).toBeInTheDocument()
      expect(screen.getByText('Jeans')).toBeInTheDocument()
      expect(screen.getByText('32x34')).toBeInTheDocument()
      expect(screen.getByText('Slightly Small')).toBeInTheDocument()
    })

    it('should display notes when present', () => {
      const brandSize = createMockBrandSize({
        brand_name: 'Test Brand',
        notes: 'These run a bit tight in the shoulders'
      })

      render(<BrandSizesSection brandSizes={[brandSize]} categoryId="test-category" />)

      expect(screen.getByText('These run a bit tight in the shoulders')).toBeInTheDocument()
    })

    it('should not display item type when not present', () => {
      const brandSize = createMockBrandSize({
        brand_name: 'Test Brand',
        item_type: undefined
      })

      render(<BrandSizesSection brandSizes={[brandSize]} categoryId="test-category" />)

      // Brand name should be present
      expect(screen.getByText('Test Brand')).toBeInTheDocument()
      
      // Item type should not be rendered (no separate element for it)
      const brandNameElement = screen.getByText('Test Brand')
      expect(brandNameElement.parentElement?.textContent).not.toContain('undefined')
    })

    it('should display correct fit scale labels', () => {
      const brandSizes = [
        createMockBrandSize({ id: '1', brand_name: 'Brand 1', fit_scale: 1 }),
        createMockBrandSize({ id: '2', brand_name: 'Brand 2', fit_scale: 2 }),
        createMockBrandSize({ id: '3', brand_name: 'Brand 3', fit_scale: 3 }),
        createMockBrandSize({ id: '4', brand_name: 'Brand 4', fit_scale: 4 }),
        createMockBrandSize({ id: '5', brand_name: 'Brand 5', fit_scale: 5 })
      ]

      render(<BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />)

      expect(screen.getByText('Runs Small')).toBeInTheDocument()
      expect(screen.getByText('Slightly Small')).toBeInTheDocument()
      expect(screen.getByText('True to Size')).toBeInTheDocument()
      expect(screen.getByText('Slightly Large')).toBeInTheDocument()
      expect(screen.getByText('Runs Large')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no brand sizes exist', () => {
      render(<BrandSizesSection brandSizes={[]} categoryId="test-category" />)

      expect(screen.getByText('No brand-specific sizes yet')).toBeInTheDocument()
      expect(screen.getByText('Track sizes that differ from your standard size')).toBeInTheDocument()
    })

    it('should display "Add Brand Size" button in empty state', () => {
      render(<BrandSizesSection brandSizes={[]} categoryId="test-category" />)

      const addButtons = screen.getAllByText('Add Brand Size')
      expect(addButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Pagination for Large Lists', () => {
    it('should display first 10 items by default', () => {
      const brandSizes = Array.from({ length: 15 }, (_, i) =>
        createMockBrandSize({
          id: `brand-${i}`,
          brand_name: `Brand ${i + 1}`
        })
      )

      render(<BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />)

      // First 10 should be visible
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Brand ${i}`)).toBeInTheDocument()
      }

      // Items 11-15 should not be visible initially
      expect(screen.queryByText('Brand 11')).not.toBeInTheDocument()
      expect(screen.queryByText('Brand 15')).not.toBeInTheDocument()
    })

    it('should show "Show more" button when more than 10 items exist', () => {
      const brandSizes = Array.from({ length: 15 }, (_, i) =>
        createMockBrandSize({
          id: `brand-${i}`,
          brand_name: `Brand ${i + 1}`
        })
      )

      render(<BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />)

      expect(screen.getByText('Show 5 more brand sizes')).toBeInTheDocument()
    })

    it('should not show "Show more" button when 10 or fewer items exist', () => {
      const brandSizes = Array.from({ length: 10 }, (_, i) =>
        createMockBrandSize({
          id: `brand-${i}`,
          brand_name: `Brand ${i + 1}`
        })
      )

      render(<BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />)

      expect(screen.queryByText(/Show \d+ more brand sizes/)).not.toBeInTheDocument()
    })

    it('should have "Show more" button that can be clicked', () => {
      const brandSizes = Array.from({ length: 15 }, (_, i) =>
        createMockBrandSize({
          id: `brand-${i}`,
          brand_name: `Brand ${i + 1}`
        })
      )

      render(<BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />)

      // Verify "Show more" button exists and is clickable
      const showMoreButton = screen.getByText('Show 5 more brand sizes')
      expect(showMoreButton).toBeInTheDocument()
      expect(showMoreButton.tagName).toBe('BUTTON')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA label for "Add Brand Size" button', () => {
      render(<BrandSizesSection brandSizes={[]} categoryId="test-category" />)

      const addButton = screen.getAllByLabelText('Add brand size')[0]
      expect(addButton).toBeInTheDocument()
    })

    it('should have semantic heading for section title', () => {
      render(<BrandSizesSection brandSizes={[]} categoryId="test-category" />)

      const heading = screen.getByRole('heading', { name: 'Brand-Specific Sizes' })
      expect(heading).toBeInTheDocument()
    })

    it('should use semantic section element', () => {
      const { container } = render(
        <BrandSizesSection brandSizes={[]} categoryId="test-category" />
      )

      const section = container.querySelector('section')
      expect(section).toBeInTheDocument()
    })
  })

  describe('Component Structure', () => {
    it('should render section header with title and add button', () => {
      render(<BrandSizesSection brandSizes={[]} categoryId="test-category" />)

      expect(screen.getByText('Brand-Specific Sizes')).toBeInTheDocument()
      expect(screen.getAllByLabelText('Add brand size').length).toBeGreaterThan(0)
    })

    it('should apply content-visibility optimization for list items', () => {
      const brandSizes = Array.from({ length: 5 }, (_, i) =>
        createMockBrandSize({
          id: `brand-${i}`,
          brand_name: `Brand ${i + 1}`
        })
      )

      const { container } = render(
        <BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />
      )

      // Check that list items have content-visibility style
      const listItems = container.querySelectorAll('[style*="content-visibility"]')
      expect(listItems.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle brand sizes with very long brand names', () => {
      const brandSize = createMockBrandSize({
        brand_name: 'A'.repeat(100)
      })

      render(<BrandSizesSection brandSizes={[brandSize]} categoryId="test-category" />)

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument()
    })

    it('should handle brand sizes with very long notes', () => {
      const brandSize = createMockBrandSize({
        notes: 'This is a very long note. '.repeat(20)
      })

      render(<BrandSizesSection brandSizes={[brandSize]} categoryId="test-category" />)

      // Notes should be displayed (may be truncated with line-clamp-2)
      const notesElement = screen.getByText(/This is a very long note/)
      expect(notesElement).toBeInTheDocument()
    })

    it('should handle all size formats (letter, numeric, waist/inseam)', () => {
      const brandSizes = [
        createMockBrandSize({ id: '1', brand_name: 'Brand 1', size: 'XL' }),
        createMockBrandSize({ id: '2', brand_name: 'Brand 2', size: '42' }),
        createMockBrandSize({ id: '3', brand_name: 'Brand 3', size: '32x34' })
      ]

      render(<BrandSizesSection brandSizes={brandSizes} categoryId="test-category" />)

      expect(screen.getByText('XL')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('32x34')).toBeInTheDocument()
    })
  })
})

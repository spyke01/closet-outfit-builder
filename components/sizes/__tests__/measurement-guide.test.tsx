/**
 * MeasurementGuide Component Tests
 * 
 * Tests the MeasurementGuide component for:
 * - Rendering measurement fields correctly
 * - Collapsible/expandable functionality
 * - Dark mode support
 * - Mobile-responsive design
 * - Accessibility (ARIA labels)
 * - Size examples display
 * - Tips display
 * - Visual diagram placeholders
 * 
 * Requirements: US-2
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeasurementGuide } from '../measurement-guide'
import type { MeasurementGuide as MeasurementGuideType } from '@/lib/data/measurement-guides'

describe('MeasurementGuide', () => {
  // Mock measurement guide data
  const mockGuide: MeasurementGuideType = {
    category_name: 'Dress Shirt',
    icon: 'shirt',
    gender: 'men',
    supported_formats: ['numeric', 'measurements'],
    measurement_fields: [
      {
        name: 'collar',
        label: 'Collar Size',
        description: 'Measure around the base of your neck where the collar sits.',
        unit: 'inches',
        typical_range: [14, 18],
        diagram_ref: 'collar-measurement',
      },
      {
        name: 'sleeve',
        label: 'Sleeve Length',
        description: 'Measure from center back of neck to wrist.',
        unit: 'inches',
        typical_range: [32, 36],
        diagram_ref: 'sleeve-measurement',
      },
    ],
    size_examples: ['15/33', '15.5/34', '16/34', '16.5/35'],
    tips: [
      'Measure with a flexible tape measure',
      'Keep one finger between tape and neck for comfort',
    ],
  }

  const mockGuideWithOptions: MeasurementGuideType = {
    category_name: 'Suit Jacket',
    icon: 'briefcase',
    gender: 'men',
    supported_formats: ['numeric', 'letter'],
    measurement_fields: [
      {
        name: 'chest',
        label: 'Chest Size',
        description: 'Measure around the fullest part of your chest.',
        unit: 'inches',
        typical_range: [34, 52],
      },
      {
        name: 'length',
        label: 'Jacket Length',
        description: 'Choose based on your height.',
        options: ['Short', 'Regular', 'Long'],
      },
    ],
    size_examples: ['38R', '40R', '42R'],
  }

  describe('Rendering', () => {
    it('should render the component with title and description', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('Measurement Guide')).toBeInTheDocument()
      expect(screen.getByText('Learn how to measure for Dress Shirt')).toBeInTheDocument()
    })

    it('should render all measurement fields', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('Collar Size')).toBeInTheDocument()
      expect(screen.getByText('Sleeve Length')).toBeInTheDocument()
      expect(screen.getByText('Measure around the base of your neck where the collar sits.')).toBeInTheDocument()
      expect(screen.getByText('Measure from center back of neck to wrist.')).toBeInTheDocument()
    })

    it('should render measurement field units', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      const unitsElements = screen.getAllByText(/\(inches\)/)
      expect(unitsElements).toHaveLength(2)
    })

    it('should render typical ranges', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('Typical range: 14-18 inches')).toBeInTheDocument()
      expect(screen.getByText('Typical range: 32-36 inches')).toBeInTheDocument()
    })

    it('should render field options when provided', () => {
      render(<MeasurementGuide guide={mockGuideWithOptions} />)

      expect(screen.getByText('Options:')).toBeInTheDocument()
      expect(screen.getByText('Short')).toBeInTheDocument()
      expect(screen.getByText('Regular')).toBeInTheDocument()
      expect(screen.getByText('Long')).toBeInTheDocument()
    })

    it('should render size examples', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('Example Sizes')).toBeInTheDocument()
      expect(screen.getByText('15/33')).toBeInTheDocument()
      expect(screen.getByText('15.5/34')).toBeInTheDocument()
      expect(screen.getByText('16/34')).toBeInTheDocument()
      expect(screen.getByText('16.5/35')).toBeInTheDocument()
    })

    it('should render tips when provided', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('Helpful Tips')).toBeInTheDocument()
      expect(screen.getByText('Measure with a flexible tape measure')).toBeInTheDocument()
      expect(screen.getByText('Keep one finger between tape and neck for comfort')).toBeInTheDocument()
    })

    it('should render gender indicator', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText(/This guide is for/)).toBeInTheDocument()
      expect(screen.getByText("men's")).toBeInTheDocument()
    })

    it('should render visual diagram placeholders', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('Visual diagram: collar-measurement')).toBeInTheDocument()
      expect(screen.getByText('Visual diagram: sleeve-measurement')).toBeInTheDocument()
      const comingSoonElements = screen.getAllByText('(Coming soon)')
      expect(comingSoonElements).toHaveLength(2)
    })

    it('should render numbered measurement fields', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Collapsible Functionality', () => {
    it('should be expanded by default', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      const collapseButton = screen.getByRole('button', { name: /collapse measurement guide/i })
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('How to Measure')).toBeInTheDocument()
    })

    it('should collapse when collapse button is clicked', async () => {
      const user = userEvent.setup()
      render(<MeasurementGuide guide={mockGuide} />)

      const collapseButton = screen.getByRole('button', { name: /collapse measurement guide/i })
      await user.click(collapseButton)

      expect(collapseButton).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('How to Measure')).not.toBeInTheDocument()
    })

    it('should expand when expand button is clicked', async () => {
      const user = userEvent.setup()
      render(<MeasurementGuide guide={mockGuide} defaultExpanded={false} />)

      const expandButton = screen.getByRole('button', { name: /expand measurement guide/i })
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(expandButton)

      expect(expandButton).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('How to Measure')).toBeInTheDocument()
    })

    it('should toggle between expanded and collapsed states', async () => {
      const user = userEvent.setup()
      render(<MeasurementGuide guide={mockGuide} />)

      const button = screen.getByRole('button', { name: /collapse measurement guide/i })

      // Initially expanded
      expect(button).toHaveAttribute('aria-expanded', 'true')

      // Collapse
      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'false')

      // Expand again
      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should respect defaultExpanded prop', () => {
      render(<MeasurementGuide guide={mockGuide} defaultExpanded={false} />)

      const expandButton = screen.getByRole('button', { name: /expand measurement guide/i })
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('How to Measure')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on collapse button', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      const button = screen.getByRole('button', { name: /collapse measurement guide/i })
      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(button).toHaveAttribute('aria-label', 'Collapse measurement guide')
    })

    it('should update ARIA label when collapsed', async () => {
      const user = userEvent.setup()
      render(<MeasurementGuide guide={mockGuide} />)

      const button = screen.getByRole('button', { name: /collapse measurement guide/i })
      await user.click(button)

      expect(button).toHaveAttribute('aria-label', 'Expand measurement guide')
    })

    it('should have proper heading structure', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      expect(screen.getByText('How to Measure')).toBeInTheDocument()
      expect(screen.getByText('Example Sizes')).toBeInTheDocument()
      expect(screen.getByText('Helpful Tips')).toBeInTheDocument()
    })

    it('should have role="list" on tips list', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      const tipsList = screen.getByRole('list')
      expect(tipsList).toBeInTheDocument()
    })

    it('should have aria-hidden on decorative icons', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const icons = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle guide with no measurement fields', () => {
      const emptyGuide: MeasurementGuideType = {
        category_name: 'Test Category',
        icon: 'shirt',
        gender: 'unisex',
        supported_formats: ['letter'],
        measurement_fields: [],
        size_examples: ['S', 'M', 'L'],
      }

      render(<MeasurementGuide guide={emptyGuide} />)

      expect(screen.queryByText('How to Measure')).not.toBeInTheDocument()
      expect(screen.getByText('Example Sizes')).toBeInTheDocument()
    })

    it('should handle guide with no size examples', () => {
      const noExamplesGuide: MeasurementGuideType = {
        ...mockGuide,
        size_examples: [],
      }

      render(<MeasurementGuide guide={noExamplesGuide} />)

      expect(screen.queryByText('Example Sizes')).not.toBeInTheDocument()
      expect(screen.getByText('How to Measure')).toBeInTheDocument()
    })

    it('should handle guide with no tips', () => {
      const noTipsGuide: MeasurementGuideType = {
        ...mockGuide,
        tips: undefined,
      }

      render(<MeasurementGuide guide={noTipsGuide} />)

      expect(screen.queryByText('Helpful Tips')).not.toBeInTheDocument()
      expect(screen.getByText('How to Measure')).toBeInTheDocument()
    })

    it('should handle guide with empty tips array', () => {
      const emptyTipsGuide: MeasurementGuideType = {
        ...mockGuide,
        tips: [],
      }

      render(<MeasurementGuide guide={emptyTipsGuide} />)

      expect(screen.queryByText('Helpful Tips')).not.toBeInTheDocument()
    })

    it('should handle unisex gender', () => {
      const unisexGuide: MeasurementGuideType = {
        ...mockGuide,
        gender: 'unisex',
      }

      render(<MeasurementGuide guide={unisexGuide} />)

      expect(screen.getByText('all genders')).toBeInTheDocument()
    })

    it('should handle women gender', () => {
      const womensGuide: MeasurementGuideType = {
        ...mockGuide,
        gender: 'women',
      }

      render(<MeasurementGuide guide={womensGuide} />)

      expect(screen.getByText("women's")).toBeInTheDocument()
    })

    it('should handle field without unit', () => {
      const noUnitGuide: MeasurementGuideType = {
        ...mockGuide,
        measurement_fields: [
          {
            name: 'length',
            label: 'Length',
            description: 'Choose your length',
            options: ['Short', 'Regular', 'Long'],
          },
        ],
      }

      render(<MeasurementGuide guide={noUnitGuide} />)

      expect(screen.getByText('Length')).toBeInTheDocument()
      expect(screen.queryByText(/\(inches\)/)).not.toBeInTheDocument()
    })

    it('should handle field without typical range', () => {
      const noRangeGuide: MeasurementGuideType = {
        ...mockGuide,
        measurement_fields: [
          {
            name: 'test',
            label: 'Test Field',
            description: 'Test description',
            unit: 'inches',
          },
        ],
      }

      render(<MeasurementGuide guide={noRangeGuide} />)

      expect(screen.getByText('Test Field')).toBeInTheDocument()
      expect(screen.queryByText(/Typical range:/)).not.toBeInTheDocument()
    })

    it('should handle field without diagram reference', () => {
      const noDiagramGuide: MeasurementGuideType = {
        ...mockGuide,
        measurement_fields: [
          {
            name: 'test',
            label: 'Test Field',
            description: 'Test description',
          },
        ],
      }

      render(<MeasurementGuide guide={noDiagramGuide} />)

      expect(screen.getByText('Test Field')).toBeInTheDocument()
      expect(screen.queryByText(/Visual diagram:/)).not.toBeInTheDocument()
    })
  })

  describe('Styling and Layout', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MeasurementGuide guide={mockGuide} className="custom-class" />
      )

      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })

    it('should have proper card structure', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const card = container.querySelector('[class*="rounded-xl"]')
      expect(card).toBeInTheDocument()
    })

    it('should render measurement fields in bordered containers', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const fieldContainers = container.querySelectorAll('[class*="rounded-lg"][class*="border"]')
      expect(fieldContainers.length).toBeGreaterThan(0)
    })

    it('should render numbered badges for measurement fields', () => {
      render(<MeasurementGuide guide={mockGuide} />)

      const badge1 = screen.getByText('1')
      const badge2 = screen.getByText('2')

      expect(badge1).toBeInTheDocument()
      expect(badge2).toBeInTheDocument()
    })
  })

  describe('Dark Mode Support', () => {
    it('should have dark mode classes on card', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const card = container.firstChild
      expect(card).toHaveClass('dark:border-gray-700')
      expect(card).toHaveClass('dark:bg-gray-900')
    })

    it('should have dark mode classes on measurement field containers', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const fieldContainers = container.querySelectorAll('[class*="dark:border-gray-700"]')
      expect(fieldContainers.length).toBeGreaterThan(0)
    })

    it('should have dark mode text colors', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const darkTextElements = container.querySelectorAll('[class*="dark:text-gray"]')
      expect(darkTextElements.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should have flex layout for header', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const header = container.querySelector('[class*="flex"][class*="items-start"]')
      expect(header).toBeInTheDocument()
    })

    it('should have flex-wrap for size examples', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const examplesContainer = container.querySelector('[class*="flex-wrap"]')
      expect(examplesContainer).toBeInTheDocument()
    })

    it('should have min-width-0 for text truncation', () => {
      const { container } = render(<MeasurementGuide guide={mockGuide} />)

      const minWidthElements = container.querySelectorAll('[class*="min-w-0"]')
      expect(minWidthElements.length).toBeGreaterThan(0)
    })
  })
})

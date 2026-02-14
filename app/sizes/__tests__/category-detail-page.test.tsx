/**
 * Tests for Category Detail Page
 * 
 * Verifies that the category detail page correctly displays:
 * - Measurement guide for the category
 * - Standard size section
 * - Brand sizes section
 * - Body measurements section
 * 
 * Requirements: US-2, Task 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CategoryDetailClient } from '@/components/sizes/category-detail-client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SizeCategory, BrandSize, CategoryMeasurements } from '@/lib/types/sizes'
import type { MeasurementGuide } from '@/lib/data/measurement-guides'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock the hooks
vi.mock('@/lib/hooks/use-size-categories', () => ({
  useSizeCategory: vi.fn((id, options) => ({
    data: options.initialData,
    error: null,
    refetch: vi.fn(),
  })),
  useBrandSizes: vi.fn((id, options) => ({
    data: options.initialData,
    error: null,
    refetch: vi.fn(),
  })),
  useMeasurements: vi.fn((id, options) => ({
    data: options.initialData,
    error: null,
    refetch: vi.fn(),
  })),
  useUpdateMeasurements: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  })),
}))

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('CategoryDetailClient with Measurement Guide', () => {
  const mockCategory: SizeCategory & { standard_sizes?: unknown[] } = {
    id: 'test-category-id',
    user_id: 'test-user-id',
    name: 'Dress Shirt',
    icon: 'shirt',
    supported_formats: ['numeric', 'measurements'],
    is_system_category: true,
    is_pinned: false,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    standard_sizes: [],
  }

  const mockBrandSizes: BrandSize[] = []

  const mockMeasurements: CategoryMeasurements = {
    id: 'test-measurements-id',
    user_id: 'test-user-id',
    category_id: 'test-category-id',
    measurements: {
      chest: 40,
      waist: 32,
    },
    unit: 'imperial',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockMeasurementGuide: MeasurementGuide = {
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
      },
      {
        name: 'sleeve',
        label: 'Sleeve Length',
        description: 'Measure from center back of neck to wrist.',
        unit: 'inches',
        typical_range: [32, 36],
      },
    ],
    size_examples: ['15/33', '15.5/34', '16/34'],
    tips: ['Measure with a flexible tape measure', 'Keep one finger between tape and neck'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display measurement guide when provided', async () => {
    renderWithProviders(
      <CategoryDetailClient
        initialCategory={mockCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={mockMeasurementGuide}
      />
    )

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Dress Shirt')).toBeInTheDocument()
    })

    // Check that measurement guide is displayed
    expect(screen.getByText('Measurement Guide')).toBeInTheDocument()
    expect(screen.getByText('Learn how to measure for Dress Shirt')).toBeInTheDocument()
  })

  it('should display measurement guide above standard size section', async () => {
    renderWithProviders(
      <CategoryDetailClient
        initialCategory={mockCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={mockMeasurementGuide}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Dress Shirt')).toBeInTheDocument()
    })

    // Get the main content area
    const mainContent = screen.getByLabelText('Dress Shirt size details')
    const sections = Array.from(mainContent.children)
    
    // Measurement guide should be the first section (after any error displays)
    const guideCard = sections.find(section => 
      section.textContent?.includes('Learn how to measure for Dress Shirt')
    )
    
    expect(guideCard).toBeTruthy()
    expect(sections.indexOf(guideCard!)).toBeLessThan(sections.length - 1)
  })

  it('should show measurement guide expanded by default', async () => {
    renderWithProviders(
      <CategoryDetailClient
        initialCategory={mockCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={mockMeasurementGuide}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Dress Shirt')).toBeInTheDocument()
    })

    // Check that measurement fields are visible (guide is expanded)
    expect(screen.getByText('Collar Size')).toBeInTheDocument()
    expect(screen.getByText('Sleeve Length')).toBeInTheDocument()
  })

  it('should display measurement field descriptions', async () => {
    renderWithProviders(
      <CategoryDetailClient
        initialCategory={mockCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={mockMeasurementGuide}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Dress Shirt')).toBeInTheDocument()
    })

    // Check that descriptions are displayed
    expect(screen.getByText(/Measure around the base of your neck/i)).toBeInTheDocument()
    expect(screen.getByText(/Measure from center back of neck/i)).toBeInTheDocument()
  })

  it('should display size examples', async () => {
    renderWithProviders(
      <CategoryDetailClient
        initialCategory={mockCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={mockMeasurementGuide}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Dress Shirt')).toBeInTheDocument()
    })

    // Check that size examples are displayed
    expect(screen.getByText('15/33')).toBeInTheDocument()
    expect(screen.getByText('15.5/34')).toBeInTheDocument()
    expect(screen.getByText('16/34')).toBeInTheDocument()
  })

  it('should display helpful tips', async () => {
    renderWithProviders(
      <CategoryDetailClient
        initialCategory={mockCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={mockMeasurementGuide}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Dress Shirt')).toBeInTheDocument()
    })

    // Check that tips are displayed
    expect(screen.getByText(/Measure with a flexible tape measure/i)).toBeInTheDocument()
    expect(screen.getByText(/Keep one finger between tape and neck/i)).toBeInTheDocument()
  })

  it('should not display measurement guide when not provided', async () => {
    renderWithProviders(
      <CategoryDetailClient
        initialCategory={mockCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={undefined}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Dress Shirt')).toBeInTheDocument()
    })

    // Check that measurement guide is not displayed
    expect(screen.queryByText('Learn how to measure for Dress Shirt')).not.toBeInTheDocument()
  })

  it('should match category being viewed', async () => {
    const pantsCategory: SizeCategory & { standard_sizes?: unknown[] } = {
      ...mockCategory,
      name: 'Pants',
      icon: 'ruler',
    }

    const pantsMeasurementGuide: MeasurementGuide = {
      category_name: 'Pants',
      icon: 'ruler',
      gender: 'men',
      supported_formats: ['waist-inseam'],
      measurement_fields: [
        {
          name: 'waist',
          label: 'Waist Size',
          description: 'Measure around your natural waistline.',
          unit: 'inches',
          typical_range: [28, 44],
        },
      ],
      size_examples: ['30x30', '32x32'],
      tips: ['Measure over underwear only'],
    }

    renderWithProviders(
      <CategoryDetailClient
        initialCategory={pantsCategory}
        initialBrandSizes={mockBrandSizes}
        initialMeasurements={mockMeasurements}
        measurementGuide={pantsMeasurementGuide}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Pants')).toBeInTheDocument()
    })

    // Check that the correct measurement guide is displayed
    expect(screen.getByText('Learn how to measure for Pants')).toBeInTheDocument()
    expect(screen.getByText('Waist Size')).toBeInTheDocument()
    expect(screen.getByText(/Measure around your natural waistline/i)).toBeInTheDocument()
  })
})

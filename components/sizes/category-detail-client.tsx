'use client'

/**
 * CategoryDetailClient Component
 * 
 * Client-side component for category detail view.
 * Composes MeasurementGuide, StandardSizeSection, BrandSizesSection, and MeasurementGuideSection.
 * 
 * Features:
 * - Four-section layout (Measurement Guide, Standard Size, Brand Sizes, Body Measurements)
 * - Category-specific measurement instructions (from Task 3.2)
 * - TanStack Query with server-provided initial data
 * - Responsive presentation (mobile: full-screen, tablet+: modal/panel)
 * - Navigation and close actions
 * - Dynamic imports for heavy components (code splitting)
 * 
 * Requirements: 4.1, 7.2, 7.3, 2.2, 1.2, US-2
 */

import dynamic from 'next/dynamic'
import { useSizeCategory, useBrandSizes, useMeasurements } from '@/lib/hooks/use-size-categories'
import { ErrorDisplay } from './error-display'
import { MeasurementGuide } from './measurement-guide'
import { ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { SizeCategory, StandardSize, BrandSize, CategoryMeasurements } from '@/lib/types/sizes'
import type { MeasurementGuide as MeasurementGuideType } from '@/lib/data/measurement-guides'

// ✅ Dynamic imports for code splitting - reduces initial bundle size
// These components are loaded on-demand when the category detail view is opened
const StandardSizeSection = dynamic(
  () => import('./standard-size-section').then(mod => ({ default: mod.StandardSizeSection })),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false
  }
)

const BrandSizesSection = dynamic(
  () => import('./brand-sizes-section').then(mod => ({ default: mod.BrandSizesSection })),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false
  }
)

const MeasurementGuideSection = dynamic(
  () => import('./measurement-guide-section').then(mod => ({ default: mod.MeasurementGuideSection })),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-40 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false
  }
)

export interface CategoryDetailClientProps {
  initialCategory: SizeCategory & { standard_sizes?: StandardSize[] }
  initialBrandSizes: BrandSize[]
  initialMeasurements: CategoryMeasurements | null
  measurementGuide?: MeasurementGuideType
}

export function CategoryDetailClient({ 
  initialCategory,
  initialBrandSizes,
  initialMeasurements,
  measurementGuide
}: CategoryDetailClientProps) {
  const router = useRouter()
  
  // TanStack Query with server-provided initial data
  const { 
    data: category,
    error: categoryError,
    refetch: refetchCategory
  } = useSizeCategory(initialCategory.id, {
    initialData: initialCategory
  })
  
  const { 
    data: brandSizes,
    error: brandSizesError,
    refetch: refetchBrandSizes
  } = useBrandSizes(initialCategory.id, {
    initialData: initialBrandSizes
  })
  
  const { 
    data: measurements,
    error: measurementsError,
    refetch: refetchMeasurements
  } = useMeasurements(initialCategory.id, {
    initialData: initialMeasurements
  })
  
  // Handle errors with retry capability
  const hasError = categoryError || brandSizesError || measurementsError
  const error = categoryError || brandSizesError || measurementsError
  
  const handleRetry = () => {
    if (categoryError) refetchCategory()
    if (brandSizesError) refetchBrandSizes()
    if (measurementsError) refetchMeasurements()
  }
  
  /**
   * Handle back navigation
   * Returns to the main sizes page
   */
  const handleBack = () => {
    router.push('/sizes')
  }
  
  /**
   * Handle close action
   * Same as back for now, but separated for future modal/panel implementation
   */
  const handleClose = () => {
    router.push('/sizes')
  }
  
  /**
   * Handle keyboard navigation
   * Escape key closes the view
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }
  
  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading category details...</p>
      </div>
    )
  }
  
  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      onKeyDown={handleKeyDown}
    >
      {/* Header with navigation */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Mobile: Back button */}
            <button
              onClick={handleBack}
              className="md:hidden inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Back to sizes"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Back
            </button>
            
            {/* Category name */}
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {category.name}
            </h1>
            
            {/* Tablet+: Close button */}
            <button
              onClick={handleClose}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Close category details"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              Close
            </button>
            
            {/* Mobile: Close button (icon only) */}
            <button
              onClick={handleClose}
              className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Close category details"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content - Three sections */}
      {/* Mobile: Full-screen view with gray background */}
      {/* Tablet+: Centered content with white background (modal-like) */}
      <main 
        className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8 max-w-4xl"
        aria-label={`${category.name} size details`}
      >
        {/* Error display with retry */}
        {hasError && (
          <ErrorDisplay
            error={error}
            onRetry={handleRetry}
          />
        )}
        
        {/* Measurement Guide - Shows category-specific measurement instructions */}
        {measurementGuide && (
          <MeasurementGuide 
            guide={measurementGuide}
            defaultExpanded={true}
          />
        )}
        
        {/* Section 1: Standard Size */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <StandardSizeSection category={category} />
        </div>
        
        {/* Section 2: Brand-Specific Sizes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <BrandSizesSection 
            brandSizes={brandSizes || []} 
            categoryId={category.id} 
          />
        </div>
        
        {/* Section 3: Measurement Guide */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <MeasurementGuideSection
            measurements={measurements}
            category={category}
            categoryId={category.id}
          />
        </div>
      </main>
    </div>
  )
}

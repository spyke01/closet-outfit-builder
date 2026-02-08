'use client'

/**
 * CategoryDetailClient Component
 * 
 * Client-side component for category detail view.
 * Composes StandardSizeSection, BrandSizesSection, and MeasurementGuideSection.
 * 
 * Features:
 * - Three-section layout (Standard Size, Brand Sizes, Measurement Guide)
 * - TanStack Query with server-provided initial data
 * - Responsive presentation (mobile: full-screen, tablet+: modal/panel)
 * - Navigation and close actions
 * 
 * Requirements: 4.1, 7.2, 7.3, 2.2
 */

import { useSizeCategory, useBrandSizes, useMeasurements } from '@/lib/hooks/use-size-categories'
import { StandardSizeSection } from './standard-size-section'
import { BrandSizesSection } from './brand-sizes-section'
import { MeasurementGuideSection } from './measurement-guide-section'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import X from 'lucide-react/dist/esm/icons/x'
import { useRouter } from 'next/navigation'
import type { SizeCategory, StandardSize, BrandSize, CategoryMeasurements } from '@/lib/types/sizes'

export interface CategoryDetailClientProps {
  initialCategory: SizeCategory & { standard_sizes?: StandardSize[] }
  initialBrandSizes: BrandSize[]
  initialMeasurements: CategoryMeasurements | null
}

export function CategoryDetailClient({ 
  initialCategory,
  initialBrandSizes,
  initialMeasurements
}: CategoryDetailClientProps) {
  const router = useRouter()
  
  // TanStack Query with server-provided initial data
  const { data: category } = useSizeCategory(initialCategory.id, {
    initialData: initialCategory
  })
  
  const { data: brandSizes } = useBrandSizes(initialCategory.id, {
    initialData: initialBrandSizes
  })
  
  const { data: measurements } = useMeasurements(initialCategory.id, {
    initialData: initialMeasurements
  })
  
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
      className="min-h-screen bg-gray-50 md:bg-white"
      onKeyDown={handleKeyDown}
    >
      {/* Header with navigation */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Mobile: Back button */}
            <button
              onClick={handleBack}
              className="md:hidden inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Back to sizes"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Back
            </button>
            
            {/* Category name */}
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {category.name}
            </h1>
            
            {/* Tablet+: Close button */}
            <button
              onClick={handleClose}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Close category details"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              Close
            </button>
            
            {/* Mobile: Close button (icon only) */}
            <button
              onClick={handleClose}
              className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
        {/* Section 1: Standard Size */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <StandardSizeSection category={category} />
        </div>
        
        {/* Section 2: Brand-Specific Sizes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <BrandSizesSection 
            brandSizes={brandSizes || []} 
            categoryId={category.id} 
          />
        </div>
        
        {/* Section 3: Measurement Guide */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
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

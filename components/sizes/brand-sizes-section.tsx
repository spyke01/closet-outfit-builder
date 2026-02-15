'use client'

/**
 * BrandSizesSection Component
 * 
 * Displays and manages brand-specific size overrides for a category.
 * Shows list of brand size entries with brand name, item type, size, fit scale, and notes.
 * Provides "Add brand size" functionality and handles empty states.
 * Implements scrolling/pagination for large lists (> 10 entries).
 * 
 * Requirements: 4.3, 4.5, 12.2, 12.4
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { BrandSize } from '@/lib/types/sizes'
import { TextTruncate } from './text-truncate'
import { BrandSizeForm } from './brand-size-form'

export interface BrandSizesSectionProps {
  brandSizes: BrandSize[]
  categoryId: string
}

/**
 * Fit scale indicator component
 * Displays visual representation of fit scale (1-5)
 */
function FitScaleIndicator({ value }: { value: number }) {
  const labels = [
    'Runs Small',
    'Slightly Small',
    'True to Size',
    'Slightly Large',
    'Runs Large'
  ]
  
  const colors = [
    'text-red-600',
    'text-orange-600',
    'text-green-600',
    'text-primary',
    'text-purple-600'
  ]
  
  const label = labels[value - 1] || 'Unknown'
  const color = colors[value - 1] || 'text-muted-foreground'
  
  return (
    <span className={`text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

/**
 * Brand size entry component
 * Displays a single brand size entry with all details
 */
function BrandSizeEntry({ brandSize }: { brandSize: BrandSize }) {
  return (
    <div
      className="p-4 bg-card border border-border rounded-lg hover:border-border transition-colors"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 80px'
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-base font-semibold text-foreground">
              <TextTruncate text={brandSize.brand_name} />
            </h3>
            {brandSize.item_type && (
              <span className="text-sm text-muted-foreground">
                <TextTruncate text={brandSize.item_type} />
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <div>
              <span className="text-xs text-muted-foreground">Size: </span>
              <span className="text-lg font-semibold text-foreground">
                {brandSize.size}
              </span>
            </div>
            
            <div className="h-4 w-px bg-muted" aria-hidden="true" />
            
            <FitScaleIndicator value={brandSize.fit_scale} />
          </div>
          
          {brandSize.notes && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {brandSize.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function BrandSizesSection({ brandSizes, categoryId }: BrandSizesSectionProps) {
  const [isAddingBrandSize, setIsAddingBrandSize] = useState(false)
  const [showAll, setShowAll] = useState(false)
  
  // Pagination: show first 10 by default, with option to show all
  const ITEMS_PER_PAGE = 10
  const displayedBrandSizes = showAll ? brandSizes : brandSizes.slice(0, ITEMS_PER_PAGE)
  const hasMore = brandSizes.length > ITEMS_PER_PAGE

  // If adding a brand size, show the form
  if (isAddingBrandSize) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Add Brand Size</h2>
        <BrandSizeForm
          categoryId={categoryId}
          onSave={() => setIsAddingBrandSize(false)}
          onCancel={() => setIsAddingBrandSize(false)}
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Brand-Specific Sizes</h2>
        <button
          onClick={() => setIsAddingBrandSize(true)}
          aria-label="Add brand size"
          className="h-10 inline-flex items-center gap-2 px-4 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Brand Size
        </button>
      </div>

      {brandSizes.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {displayedBrandSizes.map((brandSize) => (
              <BrandSizeEntry key={brandSize.id} brandSize={brandSize} />
            ))}
          </div>
          
          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            >
              Show {brandSizes.length - ITEMS_PER_PAGE} more brand sizes
            </button>
          )}
          
          {showAll && hasMore && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-2 text-sm font-medium text-muted-foreground hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            >
              Show less
            </button>
          )}
        </div>
      ) : (
        <div className="p-6 text-center bg-muted rounded-lg border-2 border-dashed border-border">
          <p className="text-sm text-muted-foreground mb-1">
            No brand-specific sizes yet
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Track sizes that differ from your standard size
          </p>
          <button
            onClick={() => setIsAddingBrandSize(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Brand Size
          </button>
        </div>
      )}
    </section>
  )
}

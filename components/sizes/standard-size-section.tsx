'use client'

/**
 * StandardSizeSection Component
 * 
 * Displays and manages the standard size for a category.
 * Shows primary size, optional secondary size, notes, and last updated timestamp.
 * Provides edit functionality to update the standard size.
 * 
 * Requirements: 4.2, 5.5
 */

import { useState } from 'react'
import { Edit } from 'lucide-react'
import type { SizeCategory, StandardSize } from '@/lib/types/sizes'
import { StandardSizeForm } from './standard-size-form'

export interface StandardSizeSectionProps {
  category: SizeCategory & { standard_sizes?: StandardSize[] }
}

export function StandardSizeSection({ category }: StandardSizeSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  
  // Get the standard size (should only be one per category)
  const standardSize = category.standard_sizes?.[0]
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date)
  }

  if (isEditing) {
    return (
      <StandardSizeForm
        categoryId={category.id}
        standardSize={standardSize}
        supportedFormats={category.supported_formats}
        onSave={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Standard Size</h2>
        <button
          onClick={() => setIsEditing(true)}
          aria-label={`Edit standard size for ${category.name}`}
          className="h-10 inline-flex items-center gap-2 px-4 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Edit className="h-4 w-4" aria-hidden="true" />
          Edit
        </button>
      </div>

      {standardSize ? (
        <div className="space-y-3 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Primary Size</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {standardSize.primary_size}
              </dd>
            </div>
            
            {standardSize.secondary_size && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Secondary Size</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {standardSize.secondary_size}
                </dd>
              </div>
            )}
          </div>

          {standardSize.notes && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {standardSize.notes}
              </dd>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Last updated: {formatTimestamp(standardSize.updated_at)}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center bg-muted rounded-lg border-2 border-dashed border-border">
          <p className="text-sm text-muted-foreground mb-3">
            No standard size set for this category
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Add Standard Size
          </button>
        </div>
      )}
    </section>
  )
}

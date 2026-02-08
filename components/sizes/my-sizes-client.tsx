'use client';

/**
 * MySizesClient Component
 * 
 * Client-side component for the My Sizes feature.
 * Handles interactive features while receiving initial data from server component.
 * 
 * Features:
 * - TanStack Query with server-provided initial data
 * - Responsive layout with mobile-first design
 * - Pinned cards section at top
 * - Category grid below with proper spacing
 * - Empty state guidance when no categories exist
 * - Loading states for data fetching
 * 
 * Performance:
 * - Uses initial data from server to avoid loading states
 * - TanStack Query handles cache invalidation and updates
 * - Optimistic updates for instant UI feedback
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { useState } from 'react';
import { useSizeCategories, usePinnedPreferences } from '@/lib/hooks/use-size-categories';
import { PinnedCardsSection } from './pinned-cards-section';
import { CategoryGrid } from './category-grid';
import { ErrorDisplay } from './error-display';
import { AddCategoryModal } from './add-category-modal';
import { CustomizePinnedCardsView } from './customize-pinned-cards-view';
import type { SizeCategory, PinnedPreference, StandardSize, BrandSize } from '@/lib/types/sizes';

export interface MySizesClientProps {
  initialCategories: SizeCategory[];
  initialPinnedPreferences: PinnedPreference[];
  initialStandardSizes: StandardSize[];
  initialBrandSizes: BrandSize[];
}

/**
 * MySizesClient Component
 * 
 * Renders the My Sizes page with pinned cards and category grid.
 * Receives initial data from server component for optimal performance.
 * 
 * @param initialCategories - Server-fetched categories for instant rendering
 * @param initialPinnedPreferences - Server-fetched pinned preferences
 * @param initialStandardSizes - Server-fetched standard sizes for category metadata
 * @param initialBrandSizes - Server-fetched brand sizes for category metadata
 */
export function MySizesClient({
  initialCategories,
  initialPinnedPreferences,
  initialStandardSizes,
  initialBrandSizes,
}: MySizesClientProps) {
  // State for modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // ✅ TanStack Query with server-provided initial data
  // This eliminates loading states on initial render
  // Requirements: 1.2
  const { 
    data: categories = [], 
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories
  } = useSizeCategories({
    initialData: initialCategories,
  });

  const { 
    data: pinnedPreferences = [], 
    isLoading: pinnedLoading,
    error: pinnedError,
    refetch: refetchPinned
  } = usePinnedPreferences({
    initialData: initialPinnedPreferences,
  });

  // Show loading state only if data is being refetched (not on initial load)
  const isLoading = (categoriesLoading || pinnedLoading) && 
                    categories.length === 0 && 
                    pinnedPreferences.length === 0;

  // Handle errors with retry capability
  // Requirements: 10.1, 12.3
  const hasError = categoriesError || pinnedError;
  const error = categoriesError || pinnedError;

  const handleRetry = () => {
    if (categoriesError) refetchCategories();
    if (pinnedError) refetchPinned();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          {/* Pinned cards skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex gap-4 overflow-x-auto">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 w-64 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg"
                />
              ))}
            </div>
          </div>

          {/* Category grid skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          My Sizes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your clothing sizes across categories and brands
        </p>
      </div>

      {/* Error display with retry */}
      {/* Requirements: 10.1, 12.3 */}
      {hasError && (
        <div className="mb-6">
          <ErrorDisplay
            error={error}
            onRetry={handleRetry}
            onDismiss={() => {
              // Error will be cleared on next successful fetch
            }}
          />
        </div>
      )}

      {/* Main content layout */}
      {/* Requirements: 1.1 - Pinned cards at top, category grid below */}
      <div className="space-y-8">
        {/* Pinned Cards Section */}
        {/* Requirements: 1.4, 1.5 - Responsive layout */}
        <section aria-labelledby="pinned-sizes-heading">
          <PinnedCardsSection
            pinnedPreferences={pinnedPreferences}
            onCustomize={() => setIsCustomizeOpen(true)}
          />
        </section>

        {/* Category Grid Section */}
        {/* Requirements: 1.1, 1.3 - Category grid with empty state */}
        <section aria-labelledby="all-categories-heading">
          <div className="mb-4">
            <h2
              id="all-categories-heading"
              className="text-xl font-bold text-gray-900 dark:text-gray-100"
            >
              All Categories
            </h2>
          </div>

          <CategoryGrid
            categories={categories}
            standardSizes={initialStandardSizes}
            brandSizes={initialBrandSizes}
            onAddCategory={() => setIsAddCategoryOpen(true)}
          />
        </section>
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSave={() => {
          // Close modal after successful save
          // The mutation hook in AddCategoryForm will handle cache invalidation
          setIsAddCategoryOpen(false);
        }}
      />

      {/* Customize Pinned Cards View */}
      <CustomizePinnedCardsView
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
      />
    </div>
  );
}

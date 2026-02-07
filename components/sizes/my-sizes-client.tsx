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

import { useSizeCategories, usePinnedPreferences } from '@/lib/hooks/use-size-categories';
import { PinnedCardsSection } from './pinned-cards-section';
import { CategoryGrid } from './category-grid';
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
  // ✅ TanStack Query with server-provided initial data
  // This eliminates loading states on initial render
  // Requirements: 1.2
  const { data: categories = [], isLoading: categoriesLoading } = useSizeCategories({
    initialData: initialCategories,
  });

  const { data: pinnedPreferences = [], isLoading: pinnedLoading } = usePinnedPreferences({
    initialData: initialPinnedPreferences,
  });

  // Show loading state only if data is being refetched (not on initial load)
  const isLoading = (categoriesLoading || pinnedLoading) && 
                    categories.length === 0 && 
                    pinnedPreferences.length === 0;

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

      {/* Main content layout */}
      {/* Requirements: 1.1 - Pinned cards at top, category grid below */}
      <div className="space-y-8">
        {/* Pinned Cards Section */}
        {/* Requirements: 1.4, 1.5 - Responsive layout */}
        <section aria-labelledby="pinned-sizes-heading">
          <PinnedCardsSection
            pinnedPreferences={pinnedPreferences}
            onCustomize={() => {
              // TODO: Implement customize view in future task
              console.log('Customize pinned cards');
            }}
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
            onAddCategory={() => {
              // TODO: Implement add category form in future task
              console.log('Add new category');
            }}
          />
        </section>
      </div>
    </div>
  );
}

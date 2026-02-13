'use client';

/**
 * MySizesClient Component
 * 
 * Client-side component for the My Sizes feature.
 * Handles interactive features while receiving initial data from server component.
 * 
 * Features:
 * - TanStack Query with server-provided initial data
 * - Auto-seeding of system categories for new users
 * - Responsive layout with mobile-first design
 * - Pinned cards section at top
 * - Category grid below with proper spacing
 * - Empty state guidance when no categories exist
 * - Loading states for data fetching and seeding
 * 
 * Performance:
 * - Uses initial data from server to avoid loading states
 * - TanStack Query handles cache invalidation and updates
 * - Optimistic updates for instant UI feedback
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, US-1
 */

import { useState, useEffect } from 'react';
import { useSizeCategories, usePinnedPreferences, useSeedCategories } from '@/lib/hooks/use-size-categories';
import { PinnedCardsSection } from './pinned-cards-section';
import { CategoryGrid } from './category-grid';
import { ErrorDisplay } from './error-display';
import { CustomizePinnedCardsView } from './customize-pinned-cards-view';
import type { SizeCategory, PinnedPreference, StandardSize, BrandSize } from '@/lib/types/sizes';

export interface MySizesClientProps {
  initialCategories: SizeCategory[];
  initialPinnedPreferences: PinnedPreference[];
  initialStandardSizes: StandardSize[];
  initialBrandSizes: BrandSize[];
  needsSeeding: boolean;
}

/**
 * MySizesClient Component
 * 
 * Renders the My Sizes page with pinned cards and category grid.
 * Receives initial data from server component for optimal performance.
 * Automatically seeds system categories for new users.
 * 
 * @param initialCategories - Server-fetched categories for instant rendering
 * @param initialPinnedPreferences - Server-fetched pinned preferences
 * @param initialStandardSizes - Server-fetched standard sizes for category metadata
 * @param initialBrandSizes - Server-fetched brand sizes for category metadata
 * @param needsSeeding - Whether the user needs system categories seeded
 */
export function MySizesClient({
  initialCategories,
  initialPinnedPreferences,
  initialStandardSizes,
  initialBrandSizes,
  needsSeeding,
}: MySizesClientProps) {
  // State for customize modal
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // ✅ Auto-seed categories for new users
  // Requirements: US-1
  const seedCategories = useSeedCategories();

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

  // ✅ Auto-seed on mount if needed
  // Requirements: US-1
  useEffect(() => {
    if (needsSeeding && !seedCategories.isPending && !seedCategories.isSuccess) {
      seedCategories.mutate();
    }
  }, [needsSeeding, seedCategories]);

  // Show loading state during seeding or data refetch
  const isLoading = seedCategories.isPending || 
                    ((categoriesLoading || pinnedLoading) && 
                     categories.length === 0 && 
                     pinnedPreferences.length === 0);

  // Handle errors with retry capability
  // Requirements: 10.1, 12.3, US-1
  const hasError = categoriesError || pinnedError || seedCategories.isError;
  
  // Create a user-friendly error for seeding failures
  const error = seedCategories.isError 
    ? new Error('Failed to set up your size categories. Please try again or contact support if the problem persists.')
    : (categoriesError || pinnedError);

  const handleRetry = () => {
    if (categoriesError) refetchCategories();
    if (pinnedError) refetchPinned();
    if (seedCategories.isError) seedCategories.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          {/* Loading message for seeding */}
          {seedCategories.isPending && (
            <div className="mb-6 rounded-lg bg-secondary/20 p-4 border border-secondary/40">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-foreground font-medium">
                  Setting up your size categories...
                </p>
              </div>
            </div>
          )}

          {/* Pinned cards skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="flex gap-4 overflow-x-auto">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 w-64 flex-shrink-0 bg-muted rounded-lg"
                />
              ))}
            </div>
          </div>

          {/* Category grid skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-muted rounded-lg"
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
        <h1 className="text-3xl font-bold text-foreground mb-2">
          My Sizes
        </h1>
        <p className="text-muted-foreground">
          Track your clothing sizes across categories and brands
        </p>
      </div>

      {/* Error display with retry */}
      {/* Requirements: 10.1, 12.3, US-1 */}
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
              className="text-xl font-bold text-foreground"
            >
              All Categories
            </h2>
          </div>

          <CategoryGrid
            categories={categories}
            standardSizes={initialStandardSizes}
            brandSizes={initialBrandSizes}
          />
        </section>
      </div>

      {/* Customize Pinned Cards View */}
      <CustomizePinnedCardsView
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
      />
    </div>
  );
}

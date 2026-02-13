'use client';

import dynamic from 'next/dynamic';
import { Search, Filter, Loader2 } from 'lucide-react';
import React from 'react';

// Loading component for WardrobeSearchFilters
const WardrobeSearchFiltersLoading = () => (
  <div className="space-y-4">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
        <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
      </div>
      
      <div className="flex gap-2">
        <div className="h-10 w-20 bg-muted rounded animate-pulse"></div>
        <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
      </div>
    </div>

    {/* Loading indicator */}
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span>Loading search filters...</span>
      </div>
    </div>

    {/* Search and filters skeleton */}
    <div className="space-y-4">
      {/* Search bar skeleton */}
      <div className="relative w-full">
        <div className="w-full h-12 bg-muted rounded-lg animate-pulse"></div>
      </div>

      {/* Category filters skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tags skeleton */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
        <div className="h-4 w-12 bg-muted rounded animate-pulse"></div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="w-20 h-10 bg-muted rounded-lg animate-pulse"></div>
        ))}
      </div>
    </div>

    {/* Results count skeleton */}
    <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
  </div>
);

// Error fallback component
const WardrobeSearchFiltersError = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="space-y-4">
    <div className="text-center py-8">
      <div className="text-red-500 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Failed to Load Search Filters
      </h3>
      <p className="text-muted-foreground text-sm mb-4">
        {error.message || 'An error occurred while loading the search filters component.'}
      </p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-card text-white rounded-lg hover:bg-card transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Dynamic import with loading and error states
export const WardrobeSearchFiltersDynamic = dynamic(
  () => import('../wardrobe-search-filters').then(mod => ({ default: mod.WardrobeSearchFilters })),
  {
    loading: () => <WardrobeSearchFiltersLoading />,
    ssr: false, // Disable SSR for this heavy component to reduce initial bundle
  }
);

// Error boundary wrapper component
export const WardrobeSearchFiltersWithErrorBoundary: React.FC<React.ComponentProps<typeof WardrobeSearchFiltersDynamic>> = (props) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  const handleRetry = React.useCallback(() => {
    setError(null);
    setRetryKey(prev => prev + 1);
  }, []);

  if (error) {
    return <WardrobeSearchFiltersError error={error} retry={handleRetry} />;
  }

  return (
    <React.Suspense fallback={<WardrobeSearchFiltersLoading />}>
      <WardrobeSearchFiltersDynamic
        key={retryKey}
        {...props}
      />
    </React.Suspense>
  );
};

// Export both versions for flexibility
export { WardrobeSearchFiltersDynamic as default };
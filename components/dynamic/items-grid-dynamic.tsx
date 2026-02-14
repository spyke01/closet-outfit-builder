'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Loading component for ItemsGrid
const ItemsGridLoading = () => (
  <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
    <div className="max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-6 bg-muted rounded animate-pulse w-32"></div>
            <div className="inline-flex items-center gap-1 text-xs text-primary">
              <div className="w-2 h-2 bg-primary  rounded-full animate-pulse"></div>
              Loading...
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* Search bar skeleton */}
          <div className="relative w-full">
            <div className="w-full h-12 bg-muted rounded-lg animate-pulse"></div>
          </div>

          {/* Filter tags skeleton */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse"></div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-20 h-10 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="p-3 sm:p-4 rounded-xl border-2 border-border bg-card">
            <div className="h-40 sm:h-44 bg-muted rounded-lg mb-3 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="flex gap-1">
                <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
                <div className="h-6 w-20 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Error fallback component
const ItemsGridError = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
    <div className="max-w-7xl mx-auto">
      <div className="text-center py-8 sm:py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Failed to Load Items Grid
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {error.message || 'An error occurred while loading the items grid component.'}
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-card text-white rounded-lg hover:bg-card transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

// Dynamic import with loading and error states
export const ItemsGridDynamic = dynamic(
  () => import('../items-grid').then(mod => ({ default: mod.ItemsGrid })),
  {
    loading: () => <ItemsGridLoading />,
    ssr: false, // Disable SSR for this heavy component to reduce initial bundle
  }
);

// Error boundary wrapper component
export const ItemsGridWithErrorBoundary: React.FC<React.ComponentProps<typeof ItemsGridDynamic>> = (props) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  const handleRetry = React.useCallback(() => {
    setError(null);
    setRetryKey(prev => prev + 1);
  }, []);

  if (error) {
    return <ItemsGridError error={error} retry={handleRetry} />;
  }

  return (
    <React.Suspense fallback={<ItemsGridLoading />}>
      <ItemsGridDynamic
        key={retryKey}
        {...props}
      />
    </React.Suspense>
  );
};

// Export both versions for flexibility
export { ItemsGridDynamic as default };

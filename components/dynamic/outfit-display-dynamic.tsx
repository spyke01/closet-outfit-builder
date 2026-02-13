'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import React from 'react';

// Loading component for OutfitDisplay
const OutfitDisplayLoading = () => (
  <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
    <div className="text-center max-w-md w-full">
      <Loader2 size={48} className="text-muted-foreground mx-auto mb-4 animate-spin" />
      <h3 className="text-lg sm:text-xl font-light text-muted-foreground mb-2">
        Loading Outfit Display...
      </h3>
      <p className="text-muted-foreground text-sm sm:text-base">
        Preparing your outfit visualization
      </p>
    </div>
  </div>
);

// Error fallback component
const OutfitDisplayError = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
    <div className="text-center max-w-md w-full">
      <div className="text-red-500 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Failed to Load Outfit Display
      </h3>
      <p className="text-muted-foreground text-sm mb-4">
        {error.message || 'An error occurred while loading the outfit display component.'}
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
export const OutfitDisplayDynamic = dynamic(
  () => import('../outfit-display').then(mod => ({ default: mod.OutfitDisplay })),
  {
    loading: () => <OutfitDisplayLoading />,
    ssr: false, // Disable SSR for this heavy component to reduce initial bundle
  }
);

// Error boundary wrapper component
export const OutfitDisplayWithErrorBoundary: React.FC<React.ComponentProps<typeof OutfitDisplayDynamic>> = (props) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  const handleRetry = React.useCallback(() => {
    setError(null);
    setRetryKey(prev => prev + 1);
  }, []);

  if (error) {
    return <OutfitDisplayError error={error} retry={handleRetry} />;
  }

  return (
    <React.Suspense fallback={<OutfitDisplayLoading />}>
      <OutfitDisplayDynamic
        key={retryKey}
        {...props}
        onError={(err) => {
          setError(err);
          props.onError?.(err);
        }}
      />
    </React.Suspense>
  );
};

// Export both versions for flexibility
export { OutfitDisplayDynamic as default };
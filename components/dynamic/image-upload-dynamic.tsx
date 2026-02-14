'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import React from 'react';

// Loading component for ImageUpload
const ImageUploadLoading = () => (
  <div className="space-y-4">
    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
      <div className="space-y-4">
        <Loader2 className="w-12 h-12 mx-auto text-muted-foreground animate-spin" />
        <div>
          <p className="text-lg font-medium text-foreground">
            Loading Image Upload...
          </p>
          <p className="text-sm text-muted-foreground">
            Preparing upload functionality
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Error fallback component
const ImageUploadError = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="space-y-4">
    <div className="border-2 border-dashed border-red-300 rounded-lg p-8 text-center bg-red-50">
      <div className="space-y-4">
        <div className="text-red-500">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-red-900">
            Failed to Load Image Upload
          </p>
          <p className="text-sm text-red-700 mb-4">
            {error.message || 'An error occurred while loading the image upload component.'}
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Dynamic import with loading and error states
export const ImageUploadDynamic = dynamic(
  () => import('../image-upload').then(mod => ({ default: mod.ImageUpload })),
  {
    loading: () => <ImageUploadLoading />,
    ssr: false, // Disable SSR for this heavy component to reduce initial bundle
  }
);

// Error boundary wrapper component
export const ImageUploadWithErrorBoundary: React.FC<React.ComponentProps<typeof ImageUploadDynamic>> = (props) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  const handleRetry = React.useCallback(() => {
    setError(null);
    setRetryKey(prev => prev + 1);
  }, []);

  if (error) {
    return <ImageUploadError error={error} retry={handleRetry} />;
  }

  return (
    <React.Suspense fallback={<ImageUploadLoading />}>
      <ImageUploadDynamic
        key={retryKey}
        {...props}
        onError={(errorMessage) => {
          const err = new Error(errorMessage);
          setError(err);
          props.onError?.(errorMessage);
        }}
      />
    </React.Suspense>
  );
};

// Export both versions for flexibility
export { ImageUploadDynamic as default };

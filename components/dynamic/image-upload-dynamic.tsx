'use client';

import dynamic from 'next/dynamic';
import { AlertTriangle, Loader2 } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    <Alert variant="destructive" className="border-2 border-dashed rounded-lg p-8 text-center">
      <div className="space-y-4">
        <AlertTriangle className="w-12 h-12 mx-auto" />
        <div>
          <AlertTitle className="text-lg font-medium">Failed to Load Image Upload</AlertTitle>
          <AlertDescription className="text-sm mb-4">
            {error.message || 'An error occurred while loading the image upload component.'}
          </AlertDescription>
          <button
            onClick={retry}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </Alert>
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

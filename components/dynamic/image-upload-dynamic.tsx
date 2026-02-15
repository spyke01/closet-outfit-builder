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
  return (
    <React.Suspense fallback={<ImageUploadLoading />}>
      <ImageUploadDynamic
        {...props}
        onError={(errorMessage) => {
          props.onError?.(errorMessage);
        }}
      />
    </React.Suspense>
  );
};

// Export both versions for flexibility
export { ImageUploadDynamic as default };

'use client';

import React from 'react';
import { withConditionalLoading } from './conditional-component-loader';
import { Upload, Loader2 } from 'lucide-react';
import type { ImageUploadProps } from '../image-upload';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Loading component for image upload
const ImageUploadLoading: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted">
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground">Loading image upload...</p>
  </div>
);

// Fallback component when image processing is disabled
const ImageUploadFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted">
    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground">Image upload not available</p>
    <p className="text-xs text-muted-foreground mt-1">Sign in to upload images</p>
  </div>
);

// Error component for image upload
const ImageUploadError: React.FC = () => (
  <Alert variant="destructive" className="flex flex-col items-center justify-center p-8 border-2 border-dashed">
    <Upload className="w-8 h-8 mb-2" />
    <AlertDescription className="text-sm">Failed to load image upload</AlertDescription>
    <p className="text-xs mt-1">Please refresh the page</p>
  </Alert>
);

/**
 * Conditionally loaded image upload component
 * Only loads when imageProcessing feature is enabled and user is authenticated
 */
export const ConditionalImageUpload = withConditionalLoading<ImageUploadProps>(
  'imageProcessing',
  () => import('../image-upload').then(mod => ({ default: mod.ImageUpload })),
  {
    fallback: <ImageUploadFallback />,
    loadingComponent: <ImageUploadLoading />,
    errorComponent: <ImageUploadError />,
    preloadOnHover: true,
  }
);

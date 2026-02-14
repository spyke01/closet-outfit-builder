'use client';

import React from 'react';
import { withConditionalLoading } from './conditional-component-loader';
import { Upload, Loader2 } from 'lucide-react';
import type { ImageUploadProps } from '../image-upload';

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
  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20">
    <Upload className="w-8 h-8 text-red-400 mb-2" />
    <p className="text-sm text-red-600 dark:text-red-400">Failed to load image upload</p>
    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Please refresh the page</p>
  </div>
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

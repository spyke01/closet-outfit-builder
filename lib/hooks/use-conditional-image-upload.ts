'use client';

import { useState, useEffect, useCallback } from 'react';
import { conditionalImport, isFeatureEnabled } from '@/lib/utils/feature-flags';

// Type definitions for image upload functionality
export interface ImageUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: string | null;
}

export interface ImageUploadOptions {
  removeBackground?: boolean;
  quality?: number;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

interface UseConditionalImageUploadReturn {
  uploadState: ImageUploadState;
  uploadImage: (file: File, options?: ImageUploadOptions) => Promise<void>;
  resetUploadState: () => void;
  imageProcessingEnabled: boolean;
  moduleLoading: boolean;
}

const DEFAULT_UPLOAD_STATE: ImageUploadState = {
  isUploading: false,
  progress: 0,
  error: null,
  success: null,
};

/**
 * Conditionally load image processing functionality
 * Only loads the image upload module when feature is enabled and user is authenticated
 */
export function useConditionalImageUpload(isAuthenticated: boolean): UseConditionalImageUploadReturn {
  const [imageModule, setImageModule] = useState<Record<string, unknown> | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  
  // Determine if image processing should be enabled
  const featureEnabled = isFeatureEnabled('imageProcessing');
  const imageProcessingEnabled = isAuthenticated && featureEnabled;

  // Default upload state
  const [uploadState, setUploadState] = useState<ImageUploadState>(DEFAULT_UPLOAD_STATE);

  // Load image upload module conditionally
  useEffect(() => {
    if (!imageProcessingEnabled || imageModule) {
      return;
    }

    setModuleLoading(true);

    conditionalImport('imageProcessing', () => import('./use-image-upload'))
      .then((module) => {
        if (module) {
          setImageModule(module);
        }
      })
      .catch((error) => {
        console.warn('Failed to load image upload module:', error);
        setUploadState(prev => ({
          ...prev,
          error: 'Image processing functionality is temporarily unavailable'
        }));
      })
      .finally(() => {
        setModuleLoading(false);
      });
  }, [imageProcessingEnabled, imageModule]);

  // Direct upload implementation (fallback)
  const uploadImageDirect = useCallback(async (file: File, options: ImageUploadOptions) => {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      success: null
    }));

    const formData = new FormData();
    formData.append('image', file);
    formData.append('removeBackground', (options.removeBackground ?? true).toString());
    formData.append('quality', (options.quality ?? 85).toString());

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json() as {
      message?: string;
      imageUrl?: string;
      fallbackUrl?: string;
    };

    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      progress: 100,
      success: result.message || 'Image uploaded successfully'
    }));

    const url = result.imageUrl || result.fallbackUrl;
    if (url) {
      options.onSuccess?.(url);
    }
  }, []);

  // Upload image function
  const uploadImage = useCallback(async (file: File, options: ImageUploadOptions = {}) => {
    // Early return if image processing is not enabled
    if (!imageProcessingEnabled) {
      setUploadState(prev => ({
        ...prev,
        error: 'Image processing is not available. Please sign in to upload images.'
      }));
      return;
    }

    // Early return if module is not loaded
    if (!imageModule) {
      setUploadState(prev => ({
        ...prev,
        error: 'Image processing module is not loaded. Please try again.'
      }));
      return;
    }

    try {
      // Use the loaded module's upload functionality
      if (imageModule.useImageUpload) {
        // If it's a hook, we need to handle it differently
        // For now, we'll implement a direct upload function
        await uploadImageDirect(file, options);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      options.onError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [imageProcessingEnabled, imageModule, uploadImageDirect]);

  // Reset upload state
  const resetUploadState = useCallback(() => {
    setUploadState(DEFAULT_UPLOAD_STATE);
  }, []);

  return {
    uploadState,
    uploadImage,
    resetUploadState,
    imageProcessingEnabled,
    moduleLoading,
  };
}

/**
 * Preload image processing module based on user intent
 */
export function preloadImageProcessingModule(): void {
  if (!isFeatureEnabled('imageProcessing') || typeof window === 'undefined') {
    return;
  }

  // Use requestIdleCallback to preload during idle time
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      conditionalImport('imageProcessing', () => import('./use-image-upload'))
        .catch(() => {
          // Silently fail preloading
        });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      conditionalImport('imageProcessing', () => import('./use-image-upload'))
        .catch(() => {
          // Silently fail preloading
        });
    }, 100);
  }
}

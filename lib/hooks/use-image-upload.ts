import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileValidationSchema } from '@/lib/schemas';
import type { ImageProcessingResponse } from '@/lib/schemas';
import type { BgRemovalStatus } from '@/lib/types/database';
import { z } from 'zod';

interface UseImageUploadOptions {
  onSuccess?: (imageUrl: string) => void;
  onError?: (error: string) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  removeBackground?: boolean;
  quality?: number;
}

interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error: string | null;
  success: string | null;
  bgRemovalStatus?: BgRemovalStatus;
}

// Specific image types to avoid HEIC/HEIF issues on iOS
// iOS devices can convert HEIC to JPEG automatically when using these MIME types
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function useImageUpload({
  onSuccess,
  onError,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  removeBackground = true,
  quality = 0.9,
}: UseImageUploadOptions = {}) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
    error: null,
    success: null,
    bgRemovalStatus: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    try {
      FileValidationSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });

      // Additional checks
      if (file.size > maxSize) {
        return `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`;
      }

      if (!acceptedTypes.includes(file.type)) {
        return `File type ${file.type} is not supported. Allowed types: ${acceptedTypes.join(', ')}`;
      }

      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues.map(err => err.message).join(', ');
      }
      return 'File validation failed';
    }
  }, [maxSize, acceptedTypes]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<ImageProcessingResponse> => {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Prepare form data
      const formData = new FormData();
      formData.append('image', file);
      formData.append('removeBackground', removeBackground.toString());
      formData.append('quality', quality.toString());

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90)
        }));
      }, 200);

      try {
        // Upload to API
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ImageProcessingResponse = await response.json();
        
        setUploadProgress(prev => ({ ...prev, progress: 100 }));
        
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onMutate: () => {
      setUploadProgress({
        progress: 0,
        isUploading: true,
        error: null,
        success: null,
        bgRemovalStatus: undefined,
      });
    },
    onSuccess: (result) => {
      if (result.success && result.imageUrl) {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          success: result.message || 'Image uploaded successfully',
          bgRemovalStatus: result.bgRemovalStatus,
        }));
        onSuccess?.(result.imageUrl);
      } else if (result.fallbackUrl) {
        setUploadProgress(prev => ({
          ...prev,
          isUploading: false,
          success: result.message || 'Image uploaded (background removal failed)',
          bgRemovalStatus: result.bgRemovalStatus,
        }));
        onSuccess?.(result.fallbackUrl);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadProgress(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
        progress: 0,
      }));
      onError?.(errorMessage);
    },
  });

  const uploadFile = useCallback((file: File) => {
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    uploadMutation.reset();
    setUploadProgress({
      progress: 0,
      isUploading: false,
      error: null,
      success: null,
      bgRemovalStatus: undefined,
    });
  }, [uploadMutation]);

  const resetUpload = useCallback(() => {
    uploadMutation.reset();
    setUploadProgress({
      progress: 0,
      isUploading: false,
      error: null,
      success: null,
      bgRemovalStatus: undefined,
    });
  }, [uploadMutation]);

  return {
    uploadFile,
    cancelUpload,
    resetUpload,
    validateFile,
    ...uploadProgress,
    // Expose mutation state for advanced usage
    mutation: uploadMutation,
  };
}

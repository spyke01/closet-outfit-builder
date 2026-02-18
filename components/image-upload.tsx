'use client';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'components-image-upload' });
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageProcessingResponse, FileValidationSchema } from '@/lib/schemas';
import { resizeImageFileForUpload, transformImageFileForAvatar } from '@/lib/utils/image-resize';
import { z } from 'zod';

export interface ImageUploadProps {
  onUpload: (imageUrl: string) => void;
  onError?: (error: string) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  removeBackground?: boolean;
  quality?: number;
  mode?: 'default' | 'avatar';
  recommendedAspect?: 'square';
  className?: string;
  disabled?: boolean;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: string | null;
  previewUrl: string | null;
}

const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export function ImageUpload({
  onUpload,
  onError,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  removeBackground = true,
  quality = 0.9,
  mode = 'default',
  recommendedAspect,
  className = '',
  disabled = false,
}: ImageUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: null,
    previewUrl: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: null,
      previewUrl: null,
    });
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    try {
      FileValidationSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });

      if (file.size > maxSize) {
        return `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`;
      }

      if (!acceptedTypes.includes(file.type)) {
        return `File type ${file.type} is not supported. Allowed types: ${acceptedTypes.join(', ')}`;
      }

      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues.map((err) => err.message).join(', ');
      }
      return 'File validation failed';
    }
  }, [maxSize, acceptedTypes]);

  const uploadFile = useCallback(async (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      const typeError = `File type ${file.type} is not supported. Allowed types: ${acceptedTypes.join(', ')}`;
      setUploadState((prev) => ({ ...prev, error: typeError }));
      onError?.(typeError);
      return;
    }

    let fileForUpload = file;
    try {
      if (mode === 'avatar') {
        fileForUpload = await transformImageFileForAvatar(file, { size: 400, quality });
      } else {
        fileForUpload = await resizeImageFileForUpload(file, { maxDimension: 1024, quality });
      }
    } catch (resizeError) {
      logger.warn('Image resize failed; using original file', resizeError);
    }

    const validationError = validateFile(fileForUpload);
    if (validationError) {
      setUploadState((prev) => ({ ...prev, error: validationError }));
      onError?.(validationError);
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(fileForUpload);
    previewUrlRef.current = previewUrl;
    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      success: null,
      previewUrl,
    }));

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('image', fileForUpload);
      formData.append('removeBackground', mode === 'avatar' ? 'false' : removeBackground.toString());
      formData.append('quality', quality.toString());
      formData.append('uploadType', mode === 'avatar' ? 'avatar' : 'wardrobe');

      const progressInterval = setInterval(() => {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90),
        }));
      }, 200);

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
      setUploadState((prev) => ({ ...prev, progress: 100 }));

      if (result.success && result.imageUrl) {
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          success: result.message || 'Image uploaded successfully',
          progress: 100,
        }));
        onUpload(result.imageUrl);
      } else if (result.fallbackUrl) {
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          success: result.message || 'Image uploaded (background removal failed)',
          progress: 100,
        }));
        onUpload(result.fallbackUrl);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          error: 'Upload cancelled',
          progress: 0,
        }));
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
        progress: 0,
      }));
      onError?.(errorMessage);
    } finally {
      abortControllerRef.current = null;
    }
  }, [acceptedTypes, mode, onError, onUpload, quality, removeBackground, validateFile]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    const imageFile = files.find((file) => acceptedTypes.includes(file.type));

    if (imageFile) {
      uploadFile(imageFile);
    } else {
      const error = 'Please drop a valid image file (JPEG, PNG, or WebP)';
      setUploadState((prev) => ({ ...prev, error }));
      onError?.(error);
    }
  }, [acceptedTypes, onError, uploadFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetState]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardContent className="p-6">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${uploadState.isUploading ? 'border-secondary/50 bg-secondary/20' : 'border-border hover:border-border'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !disabled && !uploadState.isUploading && fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !disabled && !uploadState.isUploading) {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={disabled || uploadState.isUploading ? -1 : 0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || uploadState.isUploading}
            />

            {uploadState.previewUrl ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob/object URL preview should bypass next/image optimization */}
                  <img
                    src={uploadState.previewUrl}
                    alt="Image upload preview"
                    className={mode === 'avatar' ? 'h-28 w-28 rounded-lg shadow-md object-cover' : 'max-w-xs max-h-48 rounded-lg shadow-md object-contain'}
                  />
                  {!uploadState.isUploading && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 rounded-full w-8 h-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPreview();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {uploadState.isUploading ? 'Processing image...' : 'Upload an image'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to select • Max {(maxSize / 1024 / 1024).toFixed(0)}MB
                  </p>
                  {mode === 'avatar' && recommendedAspect === 'square' && (
                    <p className="text-xs text-muted-foreground mt-1">Recommended: square image for best results</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: {acceptedTypes.map((type) => type.split('/')[1].toUpperCase()).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadState.isUploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {uploadState.progress < 90 ? 'Uploading...' : 'Processing...'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelUpload}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
              <Progress value={uploadState.progress} className="w-full" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                {mode === 'avatar' ? 'Optimizing avatar image...' : removeBackground && 'Removing background automatically...'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {uploadState.success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {uploadState.success}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

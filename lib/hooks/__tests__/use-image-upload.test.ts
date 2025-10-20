import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useImageUpload } from '../use-image-upload';
import React from 'react';
import type { ReactNode } from 'react';

// Mock fetch
global.fetch = vi.fn();

// Helper function to create test files
const createTestFile = (
  name: string = 'test.png',
  size: number = 1024,
  type: string = 'image/png'
): File => {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type, lastModified: Date.now() });
};

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useImageUpload Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useImageUpload(), {
      wrapper: createWrapper(),
    });

    expect(result.current.progress).toBe(0);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
  });

  it('should validate file size correctly', () => {
    const { result } = renderHook(() => useImageUpload({ maxSize: 1024 }), {
      wrapper: createWrapper(),
    });

    const smallFile = createTestFile('small.png', 512);
    const largeFile = createTestFile('large.png', 2048);

    expect(result.current.validateFile(smallFile)).toBe(null);
    expect(result.current.validateFile(largeFile)).toContain('File size');
  });

  it('should validate file types correctly', () => {
    const { result } = renderHook(() => useImageUpload({ acceptedTypes: ['image/png'] }), {
      wrapper: createWrapper(),
    });

    const validFile = createTestFile('valid.png', 1024, 'image/png');
    const invalidFile = createTestFile('invalid.jpg', 1024, 'image/jpeg');

    expect(result.current.validateFile(validFile)).toBe(null);
    expect(result.current.validateFile(invalidFile)).toContain('File type');
  });

  it('should handle successful upload', async () => {
    const mockOnSuccess = vi.fn();
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/processed-image.png',
        message: 'Image processed successfully',
      }),
    });

    const { result } = renderHook(() => useImageUpload({ onSuccess: mockOnSuccess }), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    // Should set uploading state
    expect(result.current.isUploading).toBe(true);
    expect(result.current.progress).toBe(0);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(result.current.success).toBe('Image processed successfully');
    expect(mockOnSuccess).toHaveBeenCalledWith('https://example.com/processed-image.png');
  });

  it('should handle upload with fallback URL', async () => {
    const mockOnSuccess = vi.fn();
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        fallbackUrl: 'https://example.com/original-image.png',
        error: 'Background removal failed',
        message: 'Image uploaded but background removal failed',
      }),
    });

    const { result } = renderHook(() => useImageUpload({ onSuccess: mockOnSuccess }), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(result.current.success).toBe('Image uploaded but background removal failed');
    expect(mockOnSuccess).toHaveBeenCalledWith('https://example.com/original-image.png');
  });

  it('should handle upload errors', async () => {
    const mockOnError = vi.fn();
    
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: 'File validation failed',
      }),
    });

    const { result } = renderHook(() => useImageUpload({ onError: mockOnError }), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(result.current.error).toContain('File validation failed');
    expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('File validation failed'));
  });

  it('should handle network errors', async () => {
    const mockOnError = vi.fn();
    
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useImageUpload({ onError: mockOnError }), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(mockOnError).toHaveBeenCalledWith('Network error');
  });

  it('should handle file validation errors', async () => {
    const mockOnError = vi.fn();

    const { result } = renderHook(() => useImageUpload({ 
      onError: mockOnError,
      maxSize: 1024 
    }), {
      wrapper: createWrapper(),
    });

    const largeFile = createTestFile('large.png', 2048);
    
    result.current.uploadFile(largeFile);

    await waitFor(() => {
      expect(result.current.error).toContain('File size');
    });

    expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('File size'));
    expect(result.current.isUploading).toBe(false);
  });

  it('should update progress during upload', async () => {
    let resolveUpload: (value: any) => void;
    const uploadPromise = new Promise(resolve => {
      resolveUpload = resolve;
    });
    
    (fetch as any).mockReturnValueOnce(uploadPromise);

    const { result } = renderHook(() => useImageUpload(), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    // Should start with 0 progress
    expect(result.current.progress).toBe(0);
    expect(result.current.isUploading).toBe(true);

    // Wait a bit for progress to update
    await new Promise(resolve => setTimeout(resolve, 300));

    // Progress should have increased
    expect(result.current.progress).toBeGreaterThan(0);

    // Resolve the upload
    resolveUpload!({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/processed-image.png',
      }),
    });

    await waitFor(() => {
      expect(result.current.progress).toBe(100);
    });
  });

  it('should handle upload cancellation', async () => {
    let abortController: AbortController;
    
    (fetch as any).mockImplementationOnce((url: string, options: any) => {
      abortController = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const { result } = renderHook(() => useImageUpload(), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    // Should be uploading
    expect(result.current.isUploading).toBe(true);

    // Cancel the upload
    result.current.cancelUpload();

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(result.current.progress).toBe(0);
  });

  it('should reset upload state', () => {
    const { result } = renderHook(() => useImageUpload(), {
      wrapper: createWrapper(),
    });

    // Manually set some state (simulating after an upload)
    result.current.uploadFile(createTestFile());
    
    // Reset the state
    result.current.resetUpload();

    expect(result.current.progress).toBe(0);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
  });

  it('should pass correct parameters to API', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/processed-image.png',
      }),
    });

    const { result } = renderHook(() => useImageUpload({
      removeBackground: false,
      quality: 0.8,
    }), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/upload-image', {
        method: 'POST',
        body: expect.any(FormData),
        signal: expect.any(AbortSignal),
      });
    });

    // Check FormData contents
    const call = (fetch as any).mock.calls[0];
    const formData = call[1].body as FormData;
    
    expect(formData.get('image')).toBe(testFile);
    expect(formData.get('removeBackground')).toBe('false');
    expect(formData.get('quality')).toBe('0.8');
  });

  it('should use default options when not provided', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/processed-image.png',
      }),
    });

    const { result } = renderHook(() => useImageUpload(), {
      wrapper: createWrapper(),
    });

    const testFile = createTestFile();
    
    result.current.uploadFile(testFile);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    const call = (fetch as any).mock.calls[0];
    const formData = call[1].body as FormData;
    
    expect(formData.get('removeBackground')).toBe('true');
    expect(formData.get('quality')).toBe('0.9');
  });

  it('should expose mutation state for advanced usage', () => {
    const { result } = renderHook(() => useImageUpload(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutation).toBeDefined();
    expect(result.current.mutation.mutate).toBeTypeOf('function');
    expect(result.current.mutation.reset).toBeTypeOf('function');
  });
});
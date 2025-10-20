import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUpload } from '../image-upload';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock file reader
Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    readAsDataURL: vi.fn(),
    result: 'data:image/png;base64,mock-base64-data',
    onload: null,
    onerror: null,
  })),
});

// Helper function to create test files
const createTestFile = (
  name: string = 'test.png',
  size: number = 1024,
  type: string = 'image/png'
): File => {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type, lastModified: Date.now() });
};

describe('ImageUpload Component', () => {
  const mockOnUpload = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render upload area with correct text', () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByText('Upload an image')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop or click to select/)).toBeInTheDocument();
    expect(screen.getByText(/Max 5MB/)).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, WEBP/)).toBeInTheDocument();
  });

  it('should handle file selection via input', async () => {
    const user = userEvent.setup();
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/processed-image.png',
        message: 'Image processed successfully',
      }),
    });

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const fileInput = screen.getByRole('button', { name: /upload an image/i });
    const testFile = createTestFile();
    
    // Simulate file selection
    await user.click(fileInput);
    
    // Find the hidden file input and simulate file selection
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toBeInTheDocument();
    
    // Mock file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [testFile],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith('https://example.com/processed-image.png');
    });
  });

  it('should handle drag and drop', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/processed-image.png',
      }),
    });

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    // Simulate drag and drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith('https://example.com/processed-image.png');
    });
  });

  it('should validate file size', async () => {
    render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} maxSize={1024} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const largeFile = createTestFile('large.png', 2048); // Larger than maxSize
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [largeFile],
      },
    });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('File size')
      );
    });
  });

  it('should validate file type', async () => {
    render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const invalidFile = createTestFile('document.pdf', 1024, 'application/pdf');
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [invalidFile],
      },
    });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('Please drop a valid image file')
      );
    });
  });

  it('should show progress during upload', async () => {
    let resolveUpload: (value: any) => void;
    const uploadPromise = new Promise(resolve => {
      resolveUpload = resolve;
    });
    
    (fetch as any).mockReturnValueOnce(uploadPromise);

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    // Should show processing state
    await waitFor(() => {
      expect(screen.getByText('Processing image...')).toBeInTheDocument();
    });
    
    // Should show progress bar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Should show cancel button
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    
    // Resolve the upload
    resolveUpload!({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/processed-image.png',
      }),
    });
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it('should handle upload cancellation', async () => {
    const user = userEvent.setup();
    let abortController: AbortController;
    
    (fetch as any).mockImplementationOnce((url: string, options: any) => {
      abortController = options.signal;
      return new Promise(() => {}); // Never resolves
    });

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    // Wait for upload to start
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    
    // Click cancel
    await user.click(screen.getByText('Cancel'));
    
    // Should show cancelled state
    await waitFor(() => {
      expect(screen.getByText('Upload cancelled')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: 'File validation failed',
      }),
    });

    render(<ImageUpload onUpload={mockOnUpload} onError={mockOnError} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('File validation failed');
    });
    
    // Should show error message
    expect(screen.getByText('File validation failed')).toBeInTheDocument();
  });

  it('should handle fallback scenarios', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        fallbackUrl: 'https://example.com/original-image.png',
        error: 'Background removal failed',
        message: 'Image uploaded but background removal failed',
      }),
    });

    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith('https://example.com/original-image.png');
    });
    
    // Should show success message even for fallback
    expect(screen.getByText('Image uploaded but background removal failed')).toBeInTheDocument();
  });

  it('should show preview of selected image', async () => {
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    // Should show preview image
    await waitFor(() => {
      const previewImage = screen.getByAltText('Preview');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', 'blob:mock-url');
    });
    
    // Should show remove button
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('should clear preview when remove button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ImageUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    // Wait for preview to appear
    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
    
    // Click remove button
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);
    
    // Preview should be removed
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    expect(screen.getByText('Upload an image')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ImageUpload onUpload={mockOnUpload} disabled={true} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    expect(dropZone).toHaveClass('opacity-50', 'cursor-not-allowed');
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toBeDisabled();
  });

  it('should respect custom accepted types', () => {
    render(
      <ImageUpload 
        onUpload={mockOnUpload} 
        acceptedTypes={['image/jpeg']}
      />
    );
    
    expect(screen.getByText(/JPEG/)).toBeInTheDocument();
    expect(screen.queryByText(/PNG/)).not.toBeInTheDocument();
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(hiddenInput).toHaveAttribute('accept', 'image/jpeg');
  });

  it('should respect custom max size', () => {
    const customMaxSize = 2 * 1024 * 1024; // 2MB
    
    render(
      <ImageUpload 
        onUpload={mockOnUpload} 
        maxSize={customMaxSize}
      />
    );
    
    expect(screen.getByText(/Max 2MB/)).toBeInTheDocument();
  });

  it('should show background removal indicator when enabled', async () => {
    (fetch as any).mockReturnValueOnce(new Promise(() => {})); // Never resolves
    
    render(<ImageUpload onUpload={mockOnUpload} removeBackground={true} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Removing background automatically...')).toBeInTheDocument();
    });
  });

  it('should not show background removal indicator when disabled', async () => {
    (fetch as any).mockReturnValueOnce(new Promise(() => {})); // Never resolves
    
    render(<ImageUpload onUpload={mockOnUpload} removeBackground={false} />);
    
    const dropZone = screen.getByText(/Upload an image/).closest('div');
    const testFile = createTestFile();
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile],
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Removing background automatically...')).not.toBeInTheDocument();
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock Zod schemas
vi.mock('@/lib/schemas', () => ({
  ImageProcessingRequestSchema: {
    parse: vi.fn(),
  },
  ImageProcessingResponseSchema: {
    parse: vi.fn(),
  },
  FileValidationSchema: {
    parse: vi.fn(),
  },
}));

// Test image data
const createTestImageFile = (size: number = 1024, type: string = 'image/png'): File => {
  const buffer = new ArrayBuffer(size);
  const uint8Array = new Uint8Array(buffer);
  
  // Add PNG magic bytes for validation
  if (type === 'image/png') {
    uint8Array[0] = 0x89;
    uint8Array[1] = 0x50;
    uint8Array[2] = 0x4E;
    uint8Array[3] = 0x47;
  } else if (type === 'image/jpeg') {
    uint8Array[0] = 0xFF;
    uint8Array[1] = 0xD8;
    uint8Array[2] = 0xFF;
  }
  
  return new File([buffer], 'test-image.png', { type });
};

const createTestRequest = (formData: FormData): NextRequest => {
  return new NextRequest('http://localhost:3000/api/upload-image', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': 'Bearer test-token',
    },
  });
};

describe('/api/upload-image', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
      },
      functions: {
        invoke: vi.fn(),
      },
    };
    
    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OPTIONS method', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });

  describe('POST method', () => {
    it('should reject requests without authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' },
      });

      const formData = new FormData();
      formData.append('image', createTestImageFile());
      const request = createTestRequest(formData);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication required');
    });

    it('should reject requests without image file', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      const formData = new FormData();
      const request = createTestRequest(formData);

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('No image file provided');
    });

    it('should validate file size limits', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      // Create a file larger than 5MB
      const largeFile = createTestImageFile(6 * 1024 * 1024);
      const formData = new FormData();
      formData.append('image', largeFile);
      const request = createTestRequest(formData);

      // Mock FileValidationSchema to throw validation error
      const { FileValidationSchema } = await import('@/lib/schemas');
      (FileValidationSchema.parse as any).mockImplementation(() => {
        throw new Error('File size exceeds maximum allowed size');
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('File validation failed');
    });

    it('should validate file types', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('image', invalidFile);
      const request = createTestRequest(formData);

      const { FileValidationSchema } = await import('@/lib/schemas');
      (FileValidationSchema.parse as any).mockImplementation(() => {
        throw new Error('File type not supported');
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('File validation failed');
    });

    it('should validate magic bytes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      // Create file with wrong magic bytes
      const fakeFile = new File([new ArrayBuffer(1024)], 'fake.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('image', fakeFile);
      const request = createTestRequest(formData);

      const { FileValidationSchema } = await import('@/lib/schemas');
      (FileValidationSchema.parse as any).mockReturnValue({
        name: 'fake.png',
        size: 1024,
        type: 'image/png',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('File content does not match declared MIME type. File may be corrupted or malicious.');
    });

    it('should successfully process valid image', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          imageUrl: 'https://test.supabase.co/storage/v1/object/public/processed/test.png',
          message: 'Image processed successfully',
        },
        error: null,
      });

      const validFile = createTestImageFile(1024, 'image/png');
      const formData = new FormData();
      formData.append('image', validFile);
      const request = createTestRequest(formData);

      // Mock schema validations
      const { FileValidationSchema, ImageProcessingRequestSchema, ImageProcessingResponseSchema } = await import('@/lib/schemas');
      (FileValidationSchema.parse as any).mockReturnValue({
        name: 'test-image.png',
        size: 1024,
        type: 'image/png',
      });
      (ImageProcessingRequestSchema.parse as any).mockReturnValue({
        image: validFile,
        removeBackground: true,
        quality: 0.9,
      });
      (ImageProcessingResponseSchema.parse as any).mockReturnValue({
        success: true,
        imageUrl: 'https://test.supabase.co/storage/v1/object/public/processed/test.png',
        message: 'Image processed successfully',
        processingTime: 1500,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.imageUrl).toBeDefined();
      expect(body.processingTime).toBeDefined();
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-image', {
        body: expect.any(FormData),
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
    });

    it('should handle Edge Function errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Edge Function failed' },
      });

      const validFile = createTestImageFile(1024, 'image/png');
      const formData = new FormData();
      formData.append('image', validFile);
      const request = createTestRequest(formData);

      // Mock schema validations
      const { FileValidationSchema, ImageProcessingRequestSchema } = await import('@/lib/schemas');
      (FileValidationSchema.parse as any).mockReturnValue({
        name: 'test-image.png',
        size: 1024,
        type: 'image/png',
      });
      (ImageProcessingRequestSchema.parse as any).mockReturnValue({
        image: validFile,
        removeBackground: true,
        quality: 0.9,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Image processing failed');
    });

    it('should handle fallback scenarios', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          fallbackUrl: 'https://test.supabase.co/storage/v1/object/public/original/test.png',
          error: 'Background removal failed',
          message: 'Image uploaded but background removal failed',
        },
        error: null,
      });

      const validFile = createTestImageFile(1024, 'image/png');
      const formData = new FormData();
      formData.append('image', validFile);
      const request = createTestRequest(formData);

      // Mock schema validations
      const { FileValidationSchema, ImageProcessingRequestSchema, ImageProcessingResponseSchema } = await import('@/lib/schemas');
      (FileValidationSchema.parse as any).mockReturnValue({
        name: 'test-image.png',
        size: 1024,
        type: 'image/png',
      });
      (ImageProcessingRequestSchema.parse as any).mockReturnValue({
        image: validFile,
        removeBackground: true,
        quality: 0.9,
      });
      (ImageProcessingResponseSchema.parse as any).mockReturnValue({
        success: false,
        fallbackUrl: 'https://test.supabase.co/storage/v1/object/public/original/test.png',
        error: 'Background removal failed',
        message: 'Image uploaded but background removal failed',
        processingTime: 2000,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.fallbackUrl).toBeDefined();
      expect(body.error).toBe('Background removal failed');
    });

    it('should include processing time in response', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      });

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          imageUrl: 'https://test.supabase.co/storage/v1/object/public/processed/test.png',
        },
        error: null,
      });

      const validFile = createTestImageFile(1024, 'image/png');
      const formData = new FormData();
      formData.append('image', validFile);
      const request = createTestRequest(formData);

      // Mock schema validations
      const { FileValidationSchema, ImageProcessingRequestSchema, ImageProcessingResponseSchema } = await import('@/lib/schemas');
      (FileValidationSchema.parse as any).mockReturnValue({
        name: 'test-image.png',
        size: 1024,
        type: 'image/png',
      });
      (ImageProcessingRequestSchema.parse as any).mockReturnValue({
        image: validFile,
        removeBackground: true,
        quality: 0.9,
      });
      (ImageProcessingResponseSchema.parse as any).mockReturnValue({
        success: true,
        imageUrl: 'https://test.supabase.co/storage/v1/object/public/processed/test.png',
        processingTime: expect.any(Number),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.processingTime).toBeTypeOf('number');
      expect(body.processingTime).toBeGreaterThan(0);
    });
  });
});
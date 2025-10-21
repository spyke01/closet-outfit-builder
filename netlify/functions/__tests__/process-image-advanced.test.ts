import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../process-image-advanced';
import type { HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';

// Helper to cast response properly
const asResponse = (response: void | HandlerResponse): HandlerResponse => {
  if (!response) {
    throw new Error('Expected HandlerResponse but got void');
  }
  return response;
};

// Mock Sharp
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 100, height: 100, channels: 3 }),
    raw: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: new Uint8Array(100 * 100 * 3).fill(128), // Gray pixels
    }),
    png: vi.fn().mockReturnThis(),
  }));
  
  // Mock constructor that returns the mock instance
  mockSharp.mockImplementation(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 100, height: 100, channels: 3 }),
    raw: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: new Uint8Array(100 * 100 * 3).fill(128),
    }),
    png: vi.fn().mockReturnThis(),
  }));
  
  return { default: mockSharp };
});

// Test image data (base64 encoded 1x1 pixel images)
const TEST_IMAGES = {
  // 1x1 red pixel PNG (base64)
  png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  // 1x1 red pixel JPEG (base64)
  jpeg: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
  // Invalid base64
  invalid: 'invalid-base64-data',
};

// Helper function to create test event
const createTestEvent = (
  body: any,
  httpMethod: string = 'POST',
  headers: Record<string, string> = {}
): HandlerEvent => ({
  httpMethod,
  headers,
  body: typeof body === 'string' ? body : JSON.stringify(body),
  path: '/.netlify/functions/process-image-advanced',
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as any,
  resource: '',
  isBase64Encoded: false,
  multiValueHeaders: {},
});

const mockContext: HandlerContext = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'process-image-advanced',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:process-image-advanced',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/process-image-advanced',
  logStreamName: '2023/01/01/[$LATEST]test-stream',
  getRemainingTimeInMillis: () => 30000,
  done: vi.fn(),
  fail: vi.fn(),
  succeed: vi.fn((messageOrObject: any) => {}),
};

describe('Netlify Function - process-image-advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS request', async () => {
      const event = createTestEvent(null, 'OPTIONS');
      const response = await handler(event, mockContext);

      const res = asResponse(response);
      expect(res.statusCode).toBe(200);
      expect(res.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      });
      expect(res.body).toBe('');
    });

    it('should reject non-POST methods', async () => {
      const event = createTestEvent(null, 'GET');
      const response = await handler(event, mockContext);

      const res = asResponse(response);
      expect(res.statusCode).toBe(405);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Method not allowed');
    });
  });

  describe('Request validation', () => {
    it('should reject requests without body', async () => {
      const event = createTestEvent(null);
      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    it('should reject requests with invalid JSON', async () => {
      const event = createTestEvent('invalid-json');
      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Unexpected token');
    });

    it('should reject requests without imageData', async () => {
      const event = createTestEvent({
        removeBackground: true,
        quality: 0.9,
      });
      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });

    it('should accept valid requests', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: true,
        quality: 0.9,
      });

      // Mock Sharp to return processed buffer
      const sharp = await import('sharp');
      const mockInstance = {
        metadata: vi.fn().mockResolvedValue({ width: 1, height: 1, channels: 3 }),
        raw: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue({
          data: new Uint8Array([255, 0, 0]), // Red pixel
        }),
        png: vi.fn().mockReturnThis(),
      };
      mockInstance.toBuffer.mockResolvedValue(Buffer.from('processed-image-data'));
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.processedImage).toBeDefined();
      expect(body.processingTime).toBeTypeOf('number');
    });
  });

  describe('File validation', () => {
    it('should reject files larger than 5MB', async () => {
      // Create a large base64 string (simulate 6MB)
      const largeImageData = 'a'.repeat(8 * 1024 * 1024); // 8MB in base64 ≈ 6MB binary
      
      const event = createTestEvent({
        imageData: largeImageData,
        removeBackground: true,
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('File size');
      expect(body.error).toContain('exceeds maximum allowed size');
    });

    it('should reject unsupported file types', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.invalid,
        removeBackground: true,
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unsupported file type. Please upload JPEG, PNG, or WebP images.');
    });

    it('should accept valid PNG files', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: false,
      });

      // Mock Sharp
      const sharp = await import('sharp');
      const mockInstance = {
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-image-data')),
      };
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Image optimized');
    });

    it('should accept valid JPEG files', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.jpeg,
        removeBackground: false,
      });

      // Mock Sharp
      const sharp = await import('sharp');
      const mockInstance = {
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-image-data')),
      };
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Background removal', () => {
    it('should process image with background removal', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: true,
        quality: 0.9,
      });

      // Mock Sharp for background removal
      const sharp = await import('sharp');
      const mockInstance = {
        metadata: vi.fn().mockResolvedValue({ width: 10, height: 10, channels: 3 }),
        raw: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue({
          data: new Uint8Array(300).fill(128), // 10x10x3 gray pixels
        }),
        png: vi.fn().mockReturnThis(),
      };
      
      // Mock the final toBuffer call for PNG output
      mockInstance.toBuffer.mockResolvedValueOnce({
        data: new Uint8Array(300).fill(128),
      }).mockResolvedValueOnce(Buffer.from('processed-with-background-removal'));
      
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Image processed with background removal');
      expect(body.processedImage).toBeDefined();
    });

    it('should fallback to optimization when background removal fails', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: true,
        quality: 0.8,
      });

      // Mock Sharp to fail on background removal but succeed on optimization
      const sharp = await import('sharp');
      let callCount = 0;
      (sharp.default as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call (background removal) - fail
          return {
            metadata: vi.fn().mockRejectedValue(new Error('Background removal failed')),
          };
        } else {
          // Second call (optimization fallback) - succeed
          return {
            png: vi.fn().mockReturnThis(),
            toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-fallback')),
          };
        }
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Image processed with background removal');
    });

    it('should optimize image without background removal', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: false,
        quality: 0.7,
      });

      // Mock Sharp for optimization only
      const sharp = await import('sharp');
      const mockInstance = {
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-image')),
      };
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Image optimized');
      
      // Verify quality parameter was used
      expect(mockInstance.png).toHaveBeenCalledWith({ quality: 70 }); // 0.7 * 100
    });
  });

  describe('Performance and metrics', () => {
    it('should include processing time in response', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: false,
      });

      // Mock Sharp with delay
      const sharp = await import('sharp');
      const mockInstance = {
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve(Buffer.from('delayed-image')), 100)
          )
        ),
      };
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.processingTime).toBeTypeOf('number');
      expect(body.processingTime).toBeGreaterThan(90); // Should be at least 100ms
    });

    it('should handle concurrent processing', async () => {
      const events = Array.from({ length: 3 }, () => 
        createTestEvent({
          imageData: TEST_IMAGES.png,
          removeBackground: false,
        })
      );

      // Mock Sharp
      const sharp = await import('sharp');
      const mockInstance = {
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('concurrent-image')),
      };
      (sharp.default as any).mockReturnValue(mockInstance);

      const startTime = Date.now();
      const responses = await Promise.all(
        events.map(event => handler(event, mockContext))
      );
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      });

      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Error handling', () => {
    it('should handle Sharp processing errors gracefully', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: true,
      });

      // Mock Sharp to throw error
      const sharp = await import('sharp');
      (sharp.default as any).mockImplementation(() => {
        throw new Error('Sharp processing failed');
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Sharp processing failed');
    });

    it('should handle invalid base64 data', async () => {
      const event = createTestEvent({
        imageData: 'invalid-base64-!@#$%',
        removeBackground: true,
      });

      const response = await handler(event, mockContext);

      // Should either fail validation or processing
      expect([400, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should include error details in response', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: true,
      });

      // Mock Sharp to fail
      const sharp = await import('sharp');
      (sharp.default as any).mockImplementation(() => {
        throw new Error('Detailed error message');
      });

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Detailed error message');
      expect(body.message).toBe('Failed to process image');
      expect(body.processingTime).toBeTypeOf('number');
    });
  });

  describe('Quality settings', () => {
    it('should respect quality parameter', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: false,
        quality: 0.5,
      });

      // Mock Sharp
      const sharp = await import('sharp');
      const mockInstance = {
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('quality-image')),
      };
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(mockInstance.png).toHaveBeenCalledWith({ quality: 50 }); // 0.5 * 100
    });

    it('should use default quality when not specified', async () => {
      const event = createTestEvent({
        imageData: TEST_IMAGES.png,
        removeBackground: false,
      });

      // Mock Sharp
      const sharp = await import('sharp');
      const mockInstance = {
        png: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('default-quality-image')),
      };
      (sharp.default as any).mockReturnValue(mockInstance);

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(mockInstance.png).toHaveBeenCalledWith({ quality: 90 }); // Default 0.9 * 100
    });
  });
});
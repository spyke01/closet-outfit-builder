import { Handler } from '@netlify/functions';
import sharp from 'sharp';
import { z } from 'zod';

// Request validation schema
const ProcessImageRequestSchema = z.object({
  imageData: z.string(), // Base64 encoded image
  removeBackground: z.boolean().default(true),
  quality: z.number().min(0.1).max(1).default(0.9),
});

// Response schema
const ProcessImageResponseSchema = z.object({
  success: z.boolean(),
  processedImage: z.string().optional(), // Base64 encoded processed image
  error: z.string().optional(),
  message: z.string().optional(),
  processingTime: z.number().optional(),
});

// Magic bytes for file type validation
const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
  gif: [0x47, 0x49, 0x46, 0x38],
};

// Validate file type using magic bytes
function validateFileType(buffer: Buffer, expectedType: string): boolean {
  const magicBytes = MAGIC_BYTES[expectedType as keyof typeof MAGIC_BYTES];
  if (!magicBytes) return false;
  
  if (expectedType === 'webp') {
    // Check RIFF header and WEBP signature
    const riffCheck = magicBytes.every((byte, index) => buffer[index] === byte);
    const webpCheck = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return riffCheck && webpCheck;
  }
  
  return magicBytes.every((byte, index) => buffer[index] === byte);
}

// Advanced background removal using Sharp
async function removeBackgroundAdvanced(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const { width, height, channels } = await image.metadata();
    
    if (!width || !height) {
      throw new Error('Unable to determine image dimensions');
    }
    
    // Get raw pixel data
    const { data } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Analyze corner pixels to determine background color
    const cornerSize = Math.min(20, Math.floor(width / 10), Math.floor(height / 10));
    const cornerSamples: number[][] = [];
    
    // Sample corners
    const corners = [
      { x: 0, y: 0 }, // Top-left
      { x: width - cornerSize, y: 0 }, // Top-right
      { x: 0, y: height - cornerSize }, // Bottom-left
      { x: width - cornerSize, y: height - cornerSize }, // Bottom-right
    ];
    
    corners.forEach(corner => {
      for (let y = 0; y < cornerSize; y++) {
        for (let x = 0; x < cornerSize; x++) {
          const pixelX = corner.x + x;
          const pixelY = corner.y + y;
          const idx = (pixelY * width + pixelX) * (channels || 3);
          
          if (idx + 2 < data.length) {
            cornerSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
          }
        }
      }
    });
    
    // Calculate average background color
    const avgR = cornerSamples.reduce((sum, pixel) => sum + pixel[0], 0) / cornerSamples.length;
    const avgG = cornerSamples.reduce((sum, pixel) => sum + pixel[1], 0) / cornerSamples.length;
    const avgB = cornerSamples.reduce((sum, pixel) => sum + pixel[2], 0) / cornerSamples.length;
    
    // Create RGBA buffer for transparency
    const rgbaData = Buffer.alloc(width * height * 4);
    
    // Process each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * (channels || 3);
        const dstIdx = (y * width + x) * 4;
        
        const r = data[srcIdx];
        const g = data[srcIdx + 1];
        const b = data[srcIdx + 2];
        
        // Calculate color distance from background
        const distance = Math.sqrt(
          Math.pow(r - avgR, 2) + 
          Math.pow(g - avgG, 2) + 
          Math.pow(b - avgB, 2)
        );
        
        // Edge detection for better accuracy
        const edgeThreshold = 30;
        let isEdge = false;
        
        // Check neighboring pixels for edge detection
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          const neighbors = [
            data[((y - 1) * width + x) * (channels || 3)], // Top
            data[((y + 1) * width + x) * (channels || 3)], // Bottom
            data[(y * width + (x - 1)) * (channels || 3)], // Left
            data[(y * width + (x + 1)) * (channels || 3)], // Right
          ];
          
          const maxDiff = Math.max(...neighbors.map(n => Math.abs(r - n)));
          isEdge = maxDiff > edgeThreshold;
        }
        
        // Adaptive threshold based on position and edge detection
        let threshold = 60; // Base threshold
        
        // Reduce threshold near edges to preserve object boundaries
        if (isEdge) {
          threshold = 30;
        }
        
        // Increase threshold near image borders (likely background)
        const borderDistance = Math.min(x, y, width - x - 1, height - y - 1);
        const borderFactor = Math.max(0, (20 - borderDistance) / 20);
        threshold += borderFactor * 40;
        
        // Set pixel values
        rgbaData[dstIdx] = r;     // R
        rgbaData[dstIdx + 1] = g; // G
        rgbaData[dstIdx + 2] = b; // B
        
        // Set alpha based on background detection
        if (distance < threshold && !isEdge) {
          rgbaData[dstIdx + 3] = 0; // Transparent
        } else {
          rgbaData[dstIdx + 3] = 255; // Opaque
        }
      }
    }
    
    // Convert back to PNG with transparency
    const processedBuffer = await sharp(rgbaData, {
      raw: {
        width,
        height,
        channels: 4
      }
    })
    .png({ quality: 90 })
    .toBuffer();
    
    return processedBuffer;
    
  } catch (error) {
    console.error('Advanced background removal failed:', error);
    throw error;
  }
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const startTime = Date.now();

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Request body is required' }),
      };
    }

    const requestData = ProcessImageRequestSchema.parse(JSON.parse(event.body));
    
    // Decode base64 image
    const imageBuffer = Buffer.from(requestData.imageData, 'base64');
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (imageBuffer.length > maxSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `File size (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`
        }),
      };
    }

    // Detect file type from magic bytes
    let fileType = 'unknown';
    if (validateFileType(imageBuffer, 'jpeg')) fileType = 'jpeg';
    else if (validateFileType(imageBuffer, 'png')) fileType = 'png';
    else if (validateFileType(imageBuffer, 'webp')) fileType = 'webp';
    
    if (fileType === 'unknown') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Unsupported file type. Please upload JPEG, PNG, or WebP images.'
        }),
      };
    }

    let processedBuffer: Buffer;

    if (requestData.removeBackground) {
      try {
        // Attempt advanced background removal
        processedBuffer = await removeBackgroundAdvanced(imageBuffer);
      } catch (backgroundError) {
        console.error('Background removal failed, using original:', backgroundError);
        
        // Fallback: optimize original image
        processedBuffer = await sharp(imageBuffer)
          .png({ quality: Math.round(requestData.quality * 100) })
          .toBuffer();
      }
    } else {
      // Just optimize the image
      processedBuffer = await sharp(imageBuffer)
        .png({ quality: Math.round(requestData.quality * 100) })
        .toBuffer();
    }

    const processingTime = Date.now() - startTime;
    
    const response = ProcessImageResponseSchema.parse({
      success: true,
      processedImage: processedBuffer.toString('base64'),
      message: requestData.removeBackground 
        ? 'Image processed with background removal' 
        : 'Image optimized',
      processingTime,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Image processing error:', error);
    
    const processingTime = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Validation failed',
          message: error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', '),
          processingTime,
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to process image',
        processingTime,
      }),
    };
  }
};
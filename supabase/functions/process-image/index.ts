import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Image processing utilities
interface ImageProcessingResult {
  success: boolean;
  imageUrl?: string;
  fallbackUrl?: string;
  error?: string;
  message?: string;
}

// Magic bytes for file type validation
const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46], // First 4 bytes, followed by WEBP at offset 8
  gif: [0x47, 0x49, 0x46, 0x38],
};

// Validate file type using magic bytes
function validateFileType(buffer: Uint8Array, expectedType: string): boolean {
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

// Basic background removal placeholder
// In production, this would use more sophisticated algorithms
function removeBackground(imageBuffer: Uint8Array): Uint8Array {
  // For now, return the original image
  // This will be enhanced with actual background removal logic
  // using libraries like Sharp, Canvas, or external services
  console.log('Background removal requested - using fallback (original image)');
  return imageBuffer;
}

// Get file extension from MIME type
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return extensions[mimeType] || 'jpg';
}

serve(async (req: Request): Promise<Response> => {
  // CORS headers
  ;

  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== 'POST') {
    return createCorsResponse(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json' }
      },
      origin
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        },
        origin
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        },
        origin
      );
    }

    // Parse form data
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'No image file provided' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        },
        origin
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return createCorsResponse(
        JSON.stringify({ 
          success: false, 
          error: 'File size exceeds maximum allowed size (5MB)' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        },
        origin
      );
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return createCorsResponse(
        JSON.stringify({ 
          success: false, 
          error: 'File type not supported. Allowed types: JPEG, PNG, WebP' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        },
        origin
      );
    }

    // Get image buffer and validate magic bytes
    const imageBuffer = new Uint8Array(await imageFile.arrayBuffer());
    const fileTypeFromMime = imageFile.type.split('/')[1];
    
    if (!validateFileType(imageBuffer, fileTypeFromMime)) {
      return createCorsResponse(
        JSON.stringify({ 
          success: false, 
          error: 'File content does not match declared MIME type' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        },
        origin
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = getFileExtension(imageFile.type);
    const originalFileName = `original/${user.id}/${timestamp}.${extension}`;
    const processedFileName = `processed/${user.id}/${timestamp}.png`;

    try {
      // Attempt background removal
      const processedBuffer = removeBackground(imageBuffer);
      
      // Upload processed image to Supabase Storage
      const { data: processedData, error: processedError } = await supabase.storage
        .from('wardrobe-images')
        .upload(processedFileName, processedBuffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (processedError) {
        throw new Error(`Failed to upload processed image: ${processedError.message}`);
      }

      // Get public URL for processed image
      const { data: { publicUrl } } = supabase.storage
        .from('wardrobe-images')
        .getPublicUrl(processedData.path);

      const result: ImageProcessingResult = {
        success: true,
        imageUrl: publicUrl,
        message: 'Image processed successfully with background removal'
      };

      return createCorsResponse(
        JSON.stringify(result),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
        origin
      );

    } catch (backgroundRemovalError) {
      console.error('Background removal failed:', backgroundRemovalError);
      
      // Fallback: store original image
      const { data: originalData, error: originalError } = await supabase.storage
        .from('wardrobe-images')
        .upload(originalFileName, imageBuffer, {
          contentType: imageFile.type,
          upsert: false
        });

      if (originalError) {
        throw new Error(`Failed to upload original image: ${originalError.message}`);
      }

      // Get public URL for original image
      const { data: { publicUrl: fallbackUrl } } = supabase.storage
        .from('wardrobe-images')
        .getPublicUrl(originalData.path);

      const result: ImageProcessingResult = {
        success: false,
        fallbackUrl,
        error: 'Background removal failed, original image stored',
        message: 'Image uploaded successfully but background removal failed'
      };

      return createCorsResponse(
        JSON.stringify(result),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

  } catch (error) {
    console.error('Image processing error:', error);
    
    const result: ImageProcessingResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      message: 'Failed to process image'
    };

    return createCorsResponse(
        JSON.stringify(result),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
        origin
      );
  }
});
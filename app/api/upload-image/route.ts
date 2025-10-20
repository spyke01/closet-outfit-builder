import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ImageProcessingRequestSchema, ImageProcessingResponseSchema, FileValidationSchema } from '@/lib/schemas';
import { z } from 'zod';

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

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const removeBackground = formData.get('removeBackground') === 'true';
    const quality = parseFloat(formData.get('quality') as string) || 0.9;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file properties
    try {
      FileValidationSchema.parse({
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type,
        lastModified: imageFile.lastModified,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'File validation failed',
            details: validationError.issues.map(err => err.message).join(', ')
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Validate magic bytes
    const imageBuffer = new Uint8Array(await imageFile.arrayBuffer());
    const fileTypeFromMime = imageFile.type.split('/')[1];
    
    if (!validateFileType(imageBuffer, fileTypeFromMime)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File content does not match declared MIME type. File may be corrupted or malicious.' 
        },
        { status: 400 }
      );
    }

    // Validate request data
    const requestData = ImageProcessingRequestSchema.parse({
      image: imageFile,
      removeBackground,
      quality,
    });

    // Get session for Edge Function call
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return NextResponse.json(
        { success: false, error: 'No valid session found' },
        { status: 401 }
      );
    }

    // Prepare form data for Edge Function
    const edgeFunctionFormData = new FormData();
    edgeFunctionFormData.append('image', requestData.image);
    edgeFunctionFormData.append('removeBackground', requestData.removeBackground.toString());
    edgeFunctionFormData.append('quality', requestData.quality.toString());

    // Call Supabase Edge Function
    const startTime = Date.now();
    const { data: edgeFunctionResponse, error: edgeFunctionError } = await supabase.functions.invoke(
      'process-image',
      {
        body: edgeFunctionFormData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const processingTime = Date.now() - startTime;

    if (edgeFunctionError) {
      console.error('Edge Function error:', edgeFunctionError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Image processing failed',
          message: edgeFunctionError.message 
        },
        { status: 500 }
      );
    }

    // Validate and return response
    const validatedResponse = ImageProcessingResponseSchema.parse({
      ...edgeFunctionResponse,
      processingTime,
    });

    return NextResponse.json(validatedResponse, { 
      status: validatedResponse.success ? 200 : 500 
    });

  } catch (error) {
    console.error('Image upload API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        message: 'Failed to process image upload'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ImageProcessingRequestSchema, ImageProcessingResponseSchema, FileValidationSchema } from '@/lib/schemas';
import { z } from 'zod';

function getAllowedOrigins(): string[] {
  const platformOrigins = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.NETLIFY_URL ? `https://${process.env.NETLIFY_URL}` : undefined,
  ].filter((origin): origin is string => Boolean(origin));

  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaults = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8888', 'http://127.0.0.1:8888'];

  return Array.from(new Set([...platformOrigins, ...envOrigins, ...defaults]));
}

function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) {
    return null;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
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

export const dynamic = 'force-dynamic';

async function extractFunctionErrorDetails(
  edgeFunctionError: unknown,
  edgeFunctionResponse: unknown
): Promise<{ status: number; error: string; message?: string }> {
  let status = 500;
  let error = 'Image processing failed';
  let message: string | undefined;

  if (edgeFunctionResponse && typeof edgeFunctionResponse === 'object') {
    const maybeError = (edgeFunctionResponse as { error?: unknown }).error;
    const maybeMessage = (edgeFunctionResponse as { message?: unknown }).message;
    if (typeof maybeError === 'string' && maybeError.trim()) error = maybeError;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) message = maybeMessage;
  }

  if (edgeFunctionError && typeof edgeFunctionError === 'object') {
    const maybeMessage = (edgeFunctionError as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      message = maybeMessage;
    }

    const maybeContext = (edgeFunctionError as { context?: unknown }).context;
    if (maybeContext instanceof Response) {
      status = maybeContext.status || status;
      try {
        const payload = await maybeContext.clone().json() as { error?: unknown; message?: unknown };
        if (typeof payload.error === 'string' && payload.error.trim()) error = payload.error;
        if (typeof payload.message === 'string' && payload.message.trim()) message = payload.message;
      } catch {
        // Ignore non-JSON edge function responses
      }
    }
  }

  return { status, error, message };
}

export async function POST(request: NextRequest) {
  try {
    // Start operations in parallel to avoid waterfalls
    const supabasePromise = createClient();
    const formDataPromise = request.formData();

    // Initialize Supabase client
    const supabase = await supabasePromise;
    
    // Check authentication - early return if not authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data (await the promise we started earlier)
    const formData = await formDataPromise;
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

    // Validate magic bytes - defer arrayBuffer conversion until needed
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

    // Get session for Edge Function call - defer until after validation
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

    const invokeProcessImage = async (accessToken: string) => {
      return supabase.functions.invoke(
        'process-image',
        {
          body: edgeFunctionFormData,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
          },
        }
      );
    };

    // Call Supabase Edge Function
    const startTime = Date.now();
    let { data: edgeFunctionResponse, error: edgeFunctionError } = await invokeProcessImage(session.access_token);

    if (edgeFunctionError) {
      const initialDetails = await extractFunctionErrorDetails(edgeFunctionError, edgeFunctionResponse);
      if (initialDetails.status === 401) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        const refreshedToken = refreshData.session?.access_token;
        if (refreshedToken && refreshedToken !== session.access_token) {
          ({ data: edgeFunctionResponse, error: edgeFunctionError } = await invokeProcessImage(refreshedToken));
        }
      }
    }

    const processingTime = Date.now() - startTime;

    if (edgeFunctionError) {
      const details = await extractFunctionErrorDetails(edgeFunctionError, edgeFunctionResponse);
      console.error('Edge Function error:', edgeFunctionError, details);
      return NextResponse.json(
        {
          success: false,
          error: details.error,
          message: details.message || 'Image processing failed'
        },
        { status: details.status }
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
export async function OPTIONS(request: NextRequest) {
  const allowedOrigin = resolveAllowedOrigin(request.headers.get('origin'));
  if (!allowedOrigin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      Vary: 'Origin',
    },
  });
}

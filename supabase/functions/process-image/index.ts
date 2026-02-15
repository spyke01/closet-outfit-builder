import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightRequest, createCorsResponse } from '../_shared/cors.ts';

// Image processing utilities
interface ImageProcessingResult {
  success: boolean;
  imageUrl?: string;
  fallbackUrl?: string;
  bgRemovalStatus?: 'completed' | 'failed' | 'pending';
  error?: string;
  message?: string;
  processingTime?: number;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
  logs?: string;
}

// Magic bytes for file type validation
const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
  gif: [0x47, 0x49, 0x46, 0x38],
};

function validateFileType(buffer: Uint8Array, expectedType: string): boolean {
  const magicBytes = MAGIC_BYTES[expectedType as keyof typeof MAGIC_BYTES];
  if (!magicBytes) return false;

  if (expectedType === 'webp') {
    const riffCheck = magicBytes.every((byte, index) => buffer[index] === byte);
    const webpCheck = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return riffCheck && webpCheck;
  }

  return magicBytes.every((byte, index) => buffer[index] === byte);
}

function hasAlphaChannel(buffer: Uint8Array): boolean {
  if (buffer.length < 26) return false;
  if (!validateFileType(buffer, 'png')) return false;
  const colorType = buffer[25];
  return colorType === 4 || colorType === 6;
}

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return extensions[mimeType] || 'jpg';
}

async function callReplicateBackgroundRemoval(imageUrl: string): Promise<string> {
  const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!replicateApiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const startTime = Date.now();

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${replicateApiToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      version: '851-labs/background-remover',
      input: { image: imageUrl },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} ${errorText}`);
  }

  const prediction: ReplicatePrediction = await response.json();
  const elapsedTime = Date.now() - startTime;
  console.log(`Replicate processing time: ${elapsedTime}ms, status: ${prediction.status}`);

  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl) throw new Error('Replicate succeeded but output URL is null');
    return outputUrl;
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate processing failed: ${prediction.error || 'Unknown error'}`);
  }

  throw new Error(`Unexpected Replicate status: ${prediction.status}`);
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== 'POST') {
    return createCorsResponse(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
      origin
    );
  }

  const processingStartTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const removeBackgroundParam = formData.get('removeBackground') as string;
    const itemId = formData.get('itemId') as string | null;
    const removeBackground = removeBackgroundParam !== 'false';

    if (!imageFile) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'No image file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'File size exceeds maximum allowed size (5MB)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'File type not supported. Allowed types: JPEG, PNG, WebP' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    const imageBuffer = new Uint8Array(await imageFile.arrayBuffer());
    const fileTypeFromMime = imageFile.type.split('/')[1];
    if (!validateFileType(imageBuffer, fileTypeFromMime)) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'File content does not match declared MIME type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    const timestamp = Date.now();
    const extension = getFileExtension(imageFile.type);
    const originalFileName = `original/${user.id}/${timestamp}.${extension}`;
    const processedFileName = `processed/${user.id}/${timestamp}.png`;

    if (removeBackground && imageFile.type === 'image/png' && hasAlphaChannel(imageBuffer)) {
      console.log('PNG already has alpha channel, skipping background removal');

      const { data: processedData, error: uploadError } = await supabase.storage
        .from('wardrobe-images')
        .upload(processedFileName, imageBuffer, { contentType: 'image/png', upsert: false });

      if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('wardrobe-images').getPublicUrl(processedData.path);

      if (itemId) {
        await supabase.from('wardrobe_items').update({
          bg_removal_status: 'completed',
          bg_removal_completed_at: new Date().toISOString(),
          image_url: publicUrl,
        }).eq('id', itemId);
      }

      const result: ImageProcessingResult = {
        success: true,
        imageUrl: publicUrl,
        bgRemovalStatus: 'completed',
        message: 'Image already has transparent background',
        processingTime: Date.now() - processingStartTime,
      };

      return createCorsResponse(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }, origin);
    }

    const { data: originalData, error: originalUploadError } = await supabase.storage
      .from('wardrobe-images')
      .upload(originalFileName, imageBuffer, { contentType: imageFile.type, upsert: false });

    if (originalUploadError) throw new Error(`Failed to upload original image: ${originalUploadError.message}`);

    const { data: { publicUrl: originalPublicUrl } } = supabase.storage.from('wardrobe-images').getPublicUrl(originalData.path);

    if (itemId && removeBackground) {
      await supabase.from('wardrobe_items').update({
        bg_removal_status: 'processing',
        bg_removal_started_at: new Date().toISOString(),
      }).eq('id', itemId);
    }

    if (removeBackground) {
      try {
        const processedImageUrl = await callReplicateBackgroundRemoval(originalPublicUrl);
        const processedResponse = await fetch(processedImageUrl);
        if (!processedResponse.ok) throw new Error(`Failed to download processed image from Replicate`);

        const processedBuffer = new Uint8Array(await processedResponse.arrayBuffer());

        const { data: finalData, error: finalUploadError } = await supabase.storage
          .from('wardrobe-images')
          .upload(processedFileName, processedBuffer, { contentType: 'image/png', upsert: false });

        if (finalUploadError) throw new Error(`Failed to upload processed image: ${finalUploadError.message}`);

        const { data: { publicUrl: finalPublicUrl } } = supabase.storage.from('wardrobe-images').getPublicUrl(finalData.path);

        await supabase.storage.from('wardrobe-images').remove([originalData.path]);

        if (itemId) {
          const { data: existingItem } = await supabase.from('wardrobe_items').select('id').eq('id', itemId).single();

          if (existingItem) {
            await supabase.from('wardrobe_items').update({
              bg_removal_status: 'completed',
              bg_removal_completed_at: new Date().toISOString(),
              image_url: finalPublicUrl,
            }).eq('id', itemId);
          } else {
            console.log('Item deleted during processing, cleaning up processed image');
            await supabase.storage.from('wardrobe-images').remove([finalData.path]);
          }
        }

        const result: ImageProcessingResult = {
          success: true,
          imageUrl: finalPublicUrl,
          bgRemovalStatus: 'completed',
          message: 'Background removed successfully',
          processingTime: Date.now() - processingStartTime,
        };

        return createCorsResponse(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }, origin);

      } catch (bgRemovalError) {
        console.error('Background removal failed:', bgRemovalError);

        if (itemId) {
          const { data: existingItem } = await supabase.from('wardrobe_items').select('id').eq('id', itemId).single();
          if (existingItem) {
            await supabase.from('wardrobe_items').update({
              bg_removal_status: 'failed',
              bg_removal_completed_at: new Date().toISOString(),
              image_url: originalPublicUrl,
            }).eq('id', itemId);
          }
        }

        const result: ImageProcessingResult = {
          success: true,
          imageUrl: originalPublicUrl,
          bgRemovalStatus: 'failed',
          message: 'Image uploaded, background removal failed (original retained)',
          processingTime: Date.now() - processingStartTime,
        };

        return createCorsResponse(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }, origin);
      }
    } else {
      const result: ImageProcessingResult = {
        success: true,
        imageUrl: originalPublicUrl,
        bgRemovalStatus: 'completed',
        message: 'Image uploaded successfully',
        processingTime: Date.now() - processingStartTime,
      };

      return createCorsResponse(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }, origin);
    }

  } catch (error) {
    console.error('Image processing error:', error);

    const result: ImageProcessingResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      message: 'Failed to process image',
      processingTime: Date.now() - processingStartTime,
    };

    return createCorsResponse(JSON.stringify(result), { status: 500, headers: { 'Content-Type': 'application/json' } }, origin);
  }
});

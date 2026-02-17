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

const STORAGE_BUCKET = Deno.env.get('SUPABASE_WARDROBE_BUCKET') || 'wardrobe-images';
const REPLICATE_BG_MODEL = Deno.env.get('REPLICATE_BG_MODEL') || '851-labs/background-remover';
const REPLICATE_BG_VERSION = Deno.env.get('REPLICATE_BG_VERSION') || '';
const SOURCE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const STORAGE_MAX_SIZE_BYTES = 20 * 1024 * 1024;

function debugLog(message: string, metadata?: unknown): void {
  if (Deno.env.get('SECURITY_DEBUG') !== 'true') {
    return;
  }
  if (metadata === undefined) {
    console.warn(`[process-image] ${message}`);
    return;
  }
  console.warn(`[process-image] ${message}`, metadata);
}

function parseReplicateModelAndVersion(rawModel: string, rawVersion: string): { model: string; version: string } {
  const explicitVersion = rawVersion.trim();
  if (explicitVersion) {
    return { model: rawModel.trim(), version: explicitVersion };
  }

  const trimmedModel = rawModel.trim();
  const colonIndex = trimmedModel.lastIndexOf(':');

  if (colonIndex > 0 && colonIndex < trimmedModel.length - 1) {
    return {
      model: trimmedModel.slice(0, colonIndex).trim(),
      version: trimmedModel.slice(colonIndex + 1).trim(),
    };
  }

  return { model: trimmedModel, version: '' };
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

async function resizeImageToMaxDimension(
  imageBuffer: Uint8Array,
  maxDimension = 1024
): Promise<Uint8Array> {
  const inputBlob = new Blob([imageBuffer], { type: 'image/png' });
  const bitmap = await createImageBitmap(inputBlob);

  try {
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;

    if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
      return imageBuffer;
    }

    const scale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
    const targetWidth = Math.max(1, Math.round(originalWidth * scale));
    const targetHeight = Math.max(1, Math.round(originalHeight * scale));

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas context');
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    const resizedBlob = await canvas.convertToBlob({ type: 'image/png' });
    const resizedArrayBuffer = await resizedBlob.arrayBuffer();
    return new Uint8Array(resizedArrayBuffer);
  } finally {
    bitmap.close();
  }
}

async function callReplicateBackgroundRemoval(imageUrl: string): Promise<string> {
  const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!replicateApiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const startTime = Date.now();

  const headers = {
    'Authorization': `Bearer ${replicateApiToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'wait',
  };

  const parsed = parseReplicateModelAndVersion(REPLICATE_BG_MODEL, REPLICATE_BG_VERSION);
  let versionToRun = parsed.version;

  // Resolve a concrete version ID for community models when only owner/name is provided.
  if (!versionToRun) {
    const [owner, name] = parsed.model.split('/');
    if (!owner || !name) {
      throw new Error(`Invalid REPLICATE_BG_MODEL "${REPLICATE_BG_MODEL}". Expected format owner/name or owner/name:version`);
    }

    const modelResponse = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${replicateApiToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!modelResponse.ok) {
      const modelError = await modelResponse.text();
      throw new Error(`Failed to resolve model version (${modelResponse.status}): ${modelError}`);
    }

    const model = await modelResponse.json() as { latest_version?: { id?: string } };
    const latestVersionId = model.latest_version?.id;
    if (!latestVersionId) {
      throw new Error(`No latest version found for model "${parsed.model}"`);
    }

    versionToRun = latestVersionId;
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: versionToRun,
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
  debugLog('Replicate processing completed', { elapsedTime, status: prediction.status });

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

async function ensureStorageBucket(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data: existingBucket, error: getBucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);

  if (existingBucket && !getBucketError) {
    const currentLimit = (existingBucket as { file_size_limit?: number | null }).file_size_limit ?? null;
    if (currentLimit !== STORAGE_MAX_SIZE_BYTES) {
      const { error: updateBucketError } = await supabase.storage.updateBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: STORAGE_MAX_SIZE_BYTES,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });

      if (updateBucketError) {
        throw new Error(`Failed to update storage bucket "${STORAGE_BUCKET}": ${updateBucketError.message}`);
      }
    }
    return;
  }

  const message = getBucketError?.message?.toLowerCase() || '';
  const shouldCreate =
    !existingBucket &&
    (!getBucketError || message.includes('not found') || message.includes('bucket not found'));

  if (!shouldCreate) {
    throw new Error(`Failed to access storage bucket "${STORAGE_BUCKET}": ${getBucketError?.message || 'Unknown error'}`);
  }

  const { error: createBucketError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: STORAGE_MAX_SIZE_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (createBucketError && !createBucketError.message?.toLowerCase().includes('already exists')) {
    throw new Error(`Failed to create storage bucket "${STORAGE_BUCKET}": ${createBucketError.message}`);
  }
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

    await ensureStorageBucket(supabase);

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

    if (imageFile.size > SOURCE_MAX_SIZE_BYTES) {
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
      debugLog('PNG already has alpha channel, skipping background removal');

      const { data: processedData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(processedFileName, imageBuffer, { contentType: 'image/png', upsert: false });

      if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(processedData.path);

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
      .from(STORAGE_BUCKET)
      .upload(originalFileName, imageBuffer, { contentType: imageFile.type, upsert: false });

    if (originalUploadError) throw new Error(`Failed to upload original image: ${originalUploadError.message}`);

    const { data: { publicUrl: originalPublicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(originalData.path);

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

        const processedBufferRaw = new Uint8Array(await processedResponse.arrayBuffer());
        let processedBuffer = processedBufferRaw;
        try {
          processedBuffer = await resizeImageToMaxDimension(processedBufferRaw, 1024);
        } catch (resizeError) {
          console.warn('Processed image resize failed; continuing with original processed output', resizeError);
        }
        if (processedBuffer.byteLength > STORAGE_MAX_SIZE_BYTES) {
          throw new Error(`Processed image too large (${(processedBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`);
        }

        const { data: finalData, error: finalUploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(processedFileName, processedBuffer, { contentType: 'image/png', upsert: false });

        if (finalUploadError) throw new Error(`Failed to upload processed image: ${finalUploadError.message}`);

        const { data: { publicUrl: finalPublicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(finalData.path);

        await supabase.storage.from(STORAGE_BUCKET).remove([originalData.path]);

        if (itemId) {
          const { data: existingItem } = await supabase.from('wardrobe_items').select('id').eq('id', itemId).single();

          if (existingItem) {
            await supabase.from('wardrobe_items').update({
              bg_removal_status: 'completed',
              bg_removal_completed_at: new Date().toISOString(),
              image_url: finalPublicUrl,
            }).eq('id', itemId);
          } else {
            debugLog('Item deleted during processing, cleaning up processed image');
            await supabase.storage.from(STORAGE_BUCKET).remove([finalData.path]);
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
        const bgRemovalErrorMessage = bgRemovalError instanceof Error
          ? bgRemovalError.message
          : 'Unknown background removal error';

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
          error: bgRemovalErrorMessage,
          message: `Image uploaded, background removal failed (${bgRemovalErrorMessage})`,
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

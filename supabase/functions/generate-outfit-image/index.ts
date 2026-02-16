import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightRequest, createCorsResponse } from '../_shared/cors.ts';

const STORAGE_BUCKET = 'outfit-generated-images';
const STORAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface GenerateRequest {
  outfit_id: string;
  image_record_id: string;
  prompt: string;
  user_id: string;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
}

async function ensureGeneratedImagesBucket(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data: existingBucket, error: getBucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);

  if (existingBucket && !getBucketError) {
    const currentLimit = (existingBucket as { file_size_limit?: number | null }).file_size_limit ?? null;
    if (currentLimit !== STORAGE_MAX_SIZE_BYTES) {
      const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: STORAGE_MAX_SIZE_BYTES,
        allowedMimeTypes: ['image/webp', 'image/png', 'image/jpeg'],
      });
      if (updateError) {
        throw new Error(`Failed to update storage bucket "${STORAGE_BUCKET}": ${updateError.message}`);
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

  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: STORAGE_MAX_SIZE_BYTES,
    allowedMimeTypes: ['image/webp', 'image/png', 'image/jpeg'],
  });

  if (createError && !createError.message?.toLowerCase().includes('already exists')) {
    throw new Error(`Failed to create storage bucket "${STORAGE_BUCKET}": ${createError.message}`);
  }
}

async function callReplicateImageGeneration(prompt: string): Promise<{ imageUrl: string; durationMs: number }> {
  const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!replicateApiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const startTime = Date.now();

  const response = await fetch('https://api.replicate.com/v1/models/google-deepmind/imagen-4/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${replicateApiToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: '1:1',
        output_format: 'webp',
        safety_filter_level: 'block_medium_and_above',
        number_of_images: 1,
      },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error (${response.status}): ${errorText}`);
  }

  const prediction: ReplicatePrediction = await response.json();
  const durationMs = Date.now() - startTime;

  console.log(`Replicate generation time: ${durationMs}ms, status: ${prediction.status}`);

  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl) throw new Error('Replicate succeeded but output URL is null');
    return { imageUrl: outputUrl, durationMs };
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate generation failed: ${prediction.error || 'Unknown error'}`);
  }

  throw new Error(`Unexpected Replicate status: ${prediction.status}`);
}

async function logGeneration(
  supabase: ReturnType<typeof createClient>,
  params: {
    user_id: string;
    outfit_id: string;
    generated_image_id: string | null;
    prompt_text: string;
    status: 'success' | 'failed' | 'cancelled';
    error_message?: string;
    api_response_time_ms?: number;
    cost_cents?: number;
  }
): Promise<void> {
  const { error } = await supabase.from('generation_log').insert({
    user_id: params.user_id,
    outfit_id: params.outfit_id,
    generated_image_id: params.generated_image_id,
    model_used: 'google-deepmind/imagen-4',
    prompt_text: params.prompt_text,
    prompt_hash: await hashPrompt(params.prompt_text),
    status: params.status,
    error_message: params.error_message || null,
    api_response_time_ms: params.api_response_time_ms || null,
    cost_cents: params.cost_cents || null,
  });

  if (error) {
    console.error('Failed to log generation:', error.message);
  }
}

async function hashPrompt(prompt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(prompt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== 'POST') {
    return createCorsResponse(
      JSON.stringify({ success: false, error: 'Method not allowed', error_code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
      origin
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'Authorization header required', error_code: 'AUTH_FAILED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'Invalid authentication', error_code: 'AUTH_FAILED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    // Parse request body
    const body: GenerateRequest = await req.json();
    const { outfit_id, image_record_id, prompt, user_id } = body;

    if (!outfit_id || !image_record_id || !prompt || !user_id) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'Missing required fields: outfit_id, image_record_id, prompt, user_id', error_code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    // Verify user_id matches authenticated user
    if (user_id !== user.id) {
      return createCorsResponse(
        JSON.stringify({ success: false, error: 'User ID mismatch', error_code: 'AUTH_FAILED' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    // Ensure storage bucket exists
    await ensureGeneratedImagesBucket(supabase);

    // Update image record to generating
    const { error: updateError } = await supabase
      .from('generated_outfit_images')
      .update({ status: 'generating' })
      .eq('id', image_record_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update image record status:', updateError.message);
    }

    // Call Replicate API
    let imageUrl: string;
    let durationMs: number;
    try {
      const result = await callReplicateImageGeneration(prompt);
      imageUrl = result.imageUrl;
      durationMs = result.durationMs;
    } catch (replicateError) {
      const errorMessage = replicateError instanceof Error ? replicateError.message : 'Unknown Replicate error';

      // Update image record to failed - do NOT increment quota
      await supabase
        .from('generated_outfit_images')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', image_record_id)
        .eq('user_id', user.id);

      await logGeneration(supabase, {
        user_id: user.id,
        outfit_id,
        generated_image_id: image_record_id,
        prompt_text: prompt,
        status: 'failed',
        error_message: errorMessage,
      });

      return createCorsResponse(
        JSON.stringify({ success: false, error: errorMessage, error_code: 'REPLICATE_ERROR' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    // Download the generated image
    let imageBuffer: Uint8Array;
    try {
      const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
      }
      imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    } catch (downloadError) {
      const errorMessage = downloadError instanceof Error ? downloadError.message : 'Failed to download generated image';

      await supabase
        .from('generated_outfit_images')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', image_record_id)
        .eq('user_id', user.id);

      await logGeneration(supabase, {
        user_id: user.id,
        outfit_id,
        generated_image_id: image_record_id,
        prompt_text: prompt,
        status: 'failed',
        error_message: errorMessage,
        api_response_time_ms: durationMs,
      });

      return createCorsResponse(
        JSON.stringify({ success: false, error: errorMessage, error_code: 'STORAGE_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${outfit_id}/${image_record_id}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, imageBuffer, { contentType: 'image/webp', upsert: false });

    if (uploadError) {
      const errorMessage = `Failed to upload image: ${uploadError.message}`;

      await supabase
        .from('generated_outfit_images')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', image_record_id)
        .eq('user_id', user.id);

      await logGeneration(supabase, {
        user_id: user.id,
        outfit_id,
        generated_image_id: image_record_id,
        prompt_text: prompt,
        status: 'failed',
        error_message: errorMessage,
        api_response_time_ms: durationMs,
      });

      return createCorsResponse(
        JSON.stringify({ success: false, error: errorMessage, error_code: 'STORAGE_ERROR' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
        origin
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    // Estimate cost (Replicate Imagen-4 pricing - adjust as needed)
    const costCents = 5; // ~$0.05 per generation estimate

    // Update DB record to completed
    await supabase
      .from('generated_outfit_images')
      .update({
        status: 'completed',
        image_url: publicUrl,
        storage_path: storagePath,
        generation_duration_ms: durationMs,
        cost_cents: costCents,
      })
      .eq('id', image_record_id)
      .eq('user_id', user.id);

    // Increment usage quota
    const now = new Date().toISOString();
    const { data: existingUsage } = await supabase
      .from('image_generation_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingUsage) {
      // Filter hourly timestamps to last hour only
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recentTimestamps = (existingUsage.hourly_timestamps || []).filter(
        (ts: string) => ts > oneHourAgo
      );
      recentTimestamps.push(now);

      await supabase
        .from('image_generation_usage')
        .update({
          monthly_count: existingUsage.monthly_count + 1,
          hourly_timestamps: recentTimestamps,
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('image_generation_usage')
        .insert({
          user_id: user.id,
          monthly_count: 1,
          monthly_reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
          hourly_timestamps: [now],
        });
    }

    // Log successful generation
    await logGeneration(supabase, {
      user_id: user.id,
      outfit_id,
      generated_image_id: image_record_id,
      prompt_text: prompt,
      status: 'success',
      api_response_time_ms: durationMs,
      cost_cents: costCents,
    });

    return createCorsResponse(
      JSON.stringify({
        success: true,
        image_url: publicUrl,
        storage_path: storagePath,
        generation_duration_ms: durationMs,
        cost_cents: costCents,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
      origin
    );

  } catch (error) {
    console.error('Outfit image generation error:', error);

    return createCorsResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        error_code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
      origin
    );
  }
});

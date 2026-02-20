import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightRequest, createCorsResponse } from '../_shared/cors.ts';

const STORAGE_BUCKET = 'wardrobe-images';
const REPLICATE_BG_MODEL = Deno.env.get('REPLICATE_BG_MODEL') || '851-labs/background-remover';
const REPLICATE_BG_VERSION = Deno.env.get('REPLICATE_BG_VERSION') || '';
const BG_REMOVAL_MAX_ATTEMPTS = 3;

interface GenerateRequest {
  wardrobe_item_id: string;
  user_id: string;
  prompt: string;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
  urls?: { get?: string };
}

interface WardrobeStatusUpdate {
  bg_removal_status?: 'pending' | 'processing' | 'completed' | 'failed';
  bg_removal_started_at?: string | null;
  bg_removal_completed_at?: string | null;
  image_url?: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(response: Response, errorText: string): number {
  const headerValue = response.headers.get('retry-after');
  if (headerValue) {
    const seconds = Number.parseInt(headerValue, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds;
    }
  }

  try {
    const payload = JSON.parse(errorText) as { retry_after?: unknown };
    if (typeof payload.retry_after === 'number' && payload.retry_after > 0) {
      return payload.retry_after;
    }
  } catch {
    // no-op: fallback below
  }

  return 10;
}

function parseReplicateModelAndVersion(rawModel: string, rawVersion: string): { model: string; version?: string } {
  const trimmedModel = rawModel.trim();
  const trimmedVersion = rawVersion.trim();
  const [modelFromSlug, versionFromSlug] = trimmedModel.split(':');
  const model = modelFromSlug.trim();
  const version = (versionFromSlug?.trim() || trimmedVersion) || undefined;
  return { model, version };
}

async function callReplicateBackgroundRemoval(imageUrl: string): Promise<string> {
  const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!replicateApiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const parsed = parseReplicateModelAndVersion(REPLICATE_BG_MODEL, REPLICATE_BG_VERSION);
  let versionToRun = parsed.version;

  if (!versionToRun) {
    const [owner, name] = parsed.model.split('/');
    if (!owner || !name) {
      throw new Error(`Invalid REPLICATE_BG_MODEL "${REPLICATE_BG_MODEL}". Expected owner/name or owner/name:version`);
    }

    const modelResponse = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${replicateApiToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!modelResponse.ok) {
      const modelError = await modelResponse.text();
      throw new Error(`Failed to resolve bg-removal model version (${modelResponse.status}): ${modelError}`);
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
    headers: {
      'Authorization': `Token ${replicateApiToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      version: versionToRun,
      input: { image: imageUrl },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Background removal API error (${response.status}): ${errorText}`);
  }

  const prediction = await response.json() as ReplicatePrediction;
  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl) {
      throw new Error('Background removal succeeded but output URL is null');
    }
    return outputUrl;
  }

  if (prediction.status === 'failed') {
    throw new Error(`Background removal failed: ${prediction.error || 'Unknown error'}`);
  }

  throw new Error(`Unexpected background removal status: ${prediction.status}`);
}

async function callReplicateBackgroundRemovalWithRetry(imageUrl: string): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= BG_REMOVAL_MAX_ATTEMPTS; attempt++) {
    try {
      return await callReplicateBackgroundRemoval(imageUrl);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : 'Unknown background removal error';
      console.error(`Background removal attempt ${attempt}/${BG_REMOVAL_MAX_ATTEMPTS} failed`, {
        error: message,
      });

      if (attempt < BG_REMOVAL_MAX_ATTEMPTS) {
        await delay(1000 * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Background removal failed after maximum retry attempts');
}

async function callReplicateImageGeneration(
  prompt: string,
): Promise<{ imageUrl: string; durationMs: number }> {
  const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
  if (!replicateApiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }
  const replicateVersion = Deno.env.get('REPLICATE_IMAGEN_VERSION');

  const startTime = Date.now();
  const input = {
    prompt,
    aspect_ratio: '1:1',
  };

  const attempts: Array<{ url: string; body: Record<string, unknown> }> = [];
  if (replicateVersion) {
    attempts.push({
      url: 'https://api.replicate.com/v1/predictions',
      body: { version: replicateVersion, input },
    });
  }
  attempts.push({
    url: 'https://api.replicate.com/v1/models/google/imagen-4/predictions',
    body: { input },
  });
  attempts.push({
    url: 'https://api.replicate.com/v1/models/google-deepmind/imagen-4/predictions',
    body: { input },
  });

  let prediction: ReplicatePrediction | null = null;
  let lastErrorText = '';
  let lastStatus = 500;

  for (const attempt of attempts) {
    for (let retry = 0; retry < 3; retry++) {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${replicateApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attempt.body),
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        prediction = await response.json();
        break;
      }

      lastStatus = response.status;
      lastErrorText = await response.text();

      if (response.status === 429 && retry < 2) {
        const retryAfterSeconds = parseRetryAfterSeconds(response, lastErrorText);
        await delay(Math.min(retryAfterSeconds, 30) * 1000);
        continue;
      }

      if (response.status !== 404 && response.status !== 422) {
        break;
      }
    }

    if (prediction) {
      break;
    }
  }

  if (!prediction) {
    throw new Error(`Replicate API error (${lastStatus}): ${lastErrorText}`);
  }

  // Align with compare script behavior: poll until terminal status when create returns pending.
  const pollUrl = prediction.urls?.get;
  if (pollUrl && prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
    const pollStart = Date.now();
    while (true) {
      const pollResponse = await fetch(pollUrl, {
        headers: { 'Authorization': `Token ${replicateApiToken}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!pollResponse.ok) {
        const pollError = await pollResponse.text();
        throw new Error(`Replicate poll error (${pollResponse.status}): ${pollError}`);
      }

      prediction = await pollResponse.json();
      if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
        break;
      }

      if (Date.now() - pollStart > 120000) {
        throw new Error('Replicate polling timed out after 120s');
      }
      await delay(1500);
    }
  }

  const durationMs = Date.now() - startTime;
  if (prediction.status === 'succeeded' && prediction.output) {
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!outputUrl) {
      throw new Error('Replicate succeeded but output URL is null');
    }
    return { imageUrl: outputUrl, durationMs };
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate generation failed: ${prediction.error || 'Unknown error'}`);
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
      JSON.stringify({
        success: false,
        error: 'Method not allowed',
        error_code: 'METHOD_NOT_ALLOWED',
      }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
      origin,
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
        JSON.stringify({
          success: false,
          error: 'Authorization header required',
          error_code: 'AUTH_FAILED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) {
      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication',
          error_code: 'AUTH_FAILED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    // Parse request body
    const body: GenerateRequest = await req.json();
    const { wardrobe_item_id, user_id, prompt } = body;

    if (!wardrobe_item_id || !user_id || !prompt) {
      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: wardrobe_item_id, user_id, prompt',
          error_code: 'VALIDATION_ERROR',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    // Verify user_id matches authenticated user
    if (user_id !== user.id) {
      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: 'User ID mismatch',
          error_code: 'AUTH_FAILED',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    // Verify requested item exists and belongs to user before processing.
    const { data: ownedItem, error: ownershipError } = await supabase
      .from('wardrobe_items')
      .select('id')
      .eq('id', wardrobe_item_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ownershipError || !ownedItem) {
      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: 'Wardrobe item not found for user',
          error_code: 'NOT_FOUND',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    const updateWardrobeItemStatus = async (update: WardrobeStatusUpdate): Promise<void> => {
      const { error } = await supabase
        .from('wardrobe_items')
        .update(update)
        .eq('id', wardrobe_item_id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update wardrobe generation status', {
          wardrobe_item_id,
          error: error.message,
          attempted: update.bg_removal_status,
        });
      }
    };

    await updateWardrobeItemStatus({
      bg_removal_status: 'processing',
      bg_removal_started_at: new Date().toISOString(),
      bg_removal_completed_at: null,
    });

    // Call Replicate API
    let imageUrl: string;
    let durationMs: number;
    try {
      const result = await callReplicateImageGeneration(prompt);
      imageUrl = result.imageUrl;
      durationMs = result.durationMs;
    } catch (replicateError) {
      const errorMessage = replicateError instanceof Error
        ? replicateError.message
        : 'Unknown Replicate error';

      console.error('Replicate error:', errorMessage);
      await updateWardrobeItemStatus({
        bg_removal_status: 'failed',
        bg_removal_completed_at: new Date().toISOString(),
      });

      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: errorMessage,
          error_code: 'REPLICATE_ERROR',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    // Run generated image through background-removal. Treat failures as hard failures so
    // users and logs clearly show when bg removal did not run successfully.
    try {
      imageUrl = await callReplicateBackgroundRemovalWithRetry(imageUrl);
    } catch (bgError) {
      const errorMessage = bgError instanceof Error ? bgError.message : 'Unknown background removal error';
      console.error('Background removal failed', { error: errorMessage });
      await updateWardrobeItemStatus({
        bg_removal_status: 'failed',
        bg_removal_completed_at: new Date().toISOString(),
      });

      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: errorMessage,
          error_code: 'BACKGROUND_REMOVAL_FAILED',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    // Download the processed transparent image.
    let imageBuffer: Uint8Array;
    let uploadContentType = 'image/png';
    let uploadExtension = 'png';
    try {
      const imageResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
      }
      const contentType = imageResponse.headers.get('content-type') || '';
      if (contentType.includes('image/webp')) {
        uploadContentType = 'image/webp';
        uploadExtension = 'webp';
      } else if (contentType.includes('image/jpeg')) {
        uploadContentType = 'image/jpeg';
        uploadExtension = 'jpg';
      }
      imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    } catch (downloadError) {
      const errorMessage = downloadError instanceof Error
        ? downloadError.message
        : 'Failed to download generated image';

      console.error('Download error:', errorMessage);
      await updateWardrobeItemStatus({
        bg_removal_status: 'failed',
        bg_removal_completed_at: new Date().toISOString(),
      });

      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: errorMessage,
          error_code: 'STORAGE_ERROR',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    // Upload to Supabase Storage at deterministic path
    const storagePath = `${user.id}/generated/${wardrobe_item_id}.${uploadExtension}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType: uploadContentType,
        upsert: true, // overwrite on regeneration
      });

    if (uploadError) {
      const errorMessage = `Failed to upload image: ${uploadError.message}`;
      console.error('Storage error:', errorMessage);
      await updateWardrobeItemStatus({
        bg_removal_status: 'failed',
        bg_removal_completed_at: new Date().toISOString(),
      });

      return createCorsResponse(
        JSON.stringify({
          success: false,
          error: errorMessage,
          error_code: 'STORAGE_ERROR',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
        origin,
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    await updateWardrobeItemStatus({
      image_url: publicUrl,
      bg_removal_status: 'completed',
      bg_removal_completed_at: new Date().toISOString(),
    });

    // Estimate cost (~$0.05 per generation)
    const costCents = 5;

    return createCorsResponse(
      JSON.stringify({
        success: true,
        image_url: publicUrl,
        storage_path: storagePath,
        generation_duration_ms: durationMs,
        cost_cents: costCents,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
      origin,
    );
  } catch (error) {
    console.error('Wardrobe item image generation error:', error);

    return createCorsResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        error_code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
      origin,
    );
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  resolveUserEntitlements,
  canUseFeature,
  isUsageExceeded,
  incrementUsageCounter,
  getAiBurstHourKey,
} from '@/lib/services/billing/entitlements';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  prompt: z.string().min(3).max(300),
});

async function getBurstCount(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, hourKey: string) {
  const { data } = await supabase
    .from('usage_counters')
    .select('id, count')
    .eq('user_id', userId)
    .eq('metric_key', 'ai_requests_hourly')
    .eq('period_key', hourKey)
    .maybeSingle();

  return data || null;
}

async function incrementBurstCount(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, hourKey: string) {
  const existing = await getBurstCount(supabase, userId, hourKey);
  const now = new Date();
  const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));
  const hourEnd = new Date(hourStart);
  hourEnd.setUTCHours(hourEnd.getUTCHours() + 1);

  if (!existing) {
    await supabase.from('usage_counters').insert({
      user_id: userId,
      metric_key: 'ai_requests_hourly',
      period_key: hourKey,
      period_start_at: hourStart.toISOString(),
      period_end_at: hourEnd.toISOString(),
      count: 1,
    });
    return 1;
  }

  const next = existing.count + 1;
  await supabase.from('usage_counters').update({ count: next }).eq('id', existing.id);
  return next;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const entitlements = await resolveUserEntitlements(supabase, user.id);

    if (!canUseFeature(entitlements, 'ai_image_generation')) {
      return NextResponse.json({
        error: 'AI image generation is available on paid plans.',
        code: 'PLAN_REQUIRED',
        requiredPlan: 'plus',
      }, { status: 403 });
    }

    if (isUsageExceeded(entitlements, 'ai_outfit_image_generations')) {
      return NextResponse.json({
        error: 'You reached your monthly AI image generation quota.',
        code: 'USAGE_LIMIT_EXCEEDED',
      }, { status: 429 });
    }

    const hourKey = getAiBurstHourKey(new Date());
    const burstCounter = await getBurstCount(supabase, user.id, hourKey);
    const burstLimit = entitlements.plan.limits.ai_burst_per_hour;
    if ((burstCounter?.count || 0) >= burstLimit) {
      return NextResponse.json({
        error: 'Hourly burst limit reached. Please try again later.',
        code: 'BURST_LIMIT_EXCEEDED',
      }, { status: 429 });
    }

    const replicateKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateKey) {
      return NextResponse.json({ error: 'Image generation is not configured.' }, { status: 503 });
    }

    const createPrediction = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${replicateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/imagen-4',
        input: {
          prompt: parsed.data.prompt,
          aspect_ratio: '1:1',
        },
      }),
    });

    if (!createPrediction.ok) {
      const errPayload = await createPrediction.text();
      return NextResponse.json({ error: `Replicate error: ${errPayload}` }, { status: 502 });
    }

    let prediction = await createPrediction.json() as {
      id: string;
      status: string;
      output?: string[] | string | null;
      urls?: { get?: string };
      error?: string | null;
    };

    const pollUrl = prediction.urls?.get;
    if (pollUrl) {
      const maxAttempts = 12;
      for (let i = 0; i < maxAttempts; i++) {
        if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const poll = await fetch(pollUrl, {
          headers: { Authorization: `Token ${replicateKey}` },
        });
        if (!poll.ok) break;
        prediction = await poll.json();
      }
    }

    if (prediction.status !== 'succeeded') {
      return NextResponse.json({ error: prediction.error || 'Image generation did not complete' }, { status: 502 });
    }

    await incrementUsageCounter(supabase, user.id, 'ai_outfit_image_generations', entitlements.period, 1);
    await incrementBurstCount(supabase, user.id, hourKey);

    const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    return NextResponse.json({
      imageUrl: output,
      predictionId: prediction.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

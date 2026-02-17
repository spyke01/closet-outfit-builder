import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  resolveUserEntitlements,
  canUseFeature,
  getUsageLimitForMetric,
  getAiBurstHourKey,
  reserveUsageCounterAtomic,
} from '@/lib/services/billing/entitlements';
import { requireSameOrigin } from '@/lib/utils/request-security';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
const log = createLogger({ component: 'api-ai-generate-image' });

const RequestSchema = z.object({
  prompt: z.string().min(3).max(300),
});
const inflightImageRequests = new Map<string, number>();
const MAX_INFLIGHT_IMAGE_REQUESTS = Number(process.env.AI_IMAGE_MAX_INFLIGHT_PER_USER || 2);

function tryAcquireInflight(userId: string): boolean {
  const current = inflightImageRequests.get(userId) || 0;
  if (current >= MAX_INFLIGHT_IMAGE_REQUESTS) {
    return false;
  }
  inflightImageRequests.set(userId, current + 1);
  return true;
}

function releaseInflight(userId: string): void {
  const current = inflightImageRequests.get(userId) || 0;
  if (current <= 1) {
    inflightImageRequests.delete(userId);
    return;
  }
  inflightImageRequests.set(userId, current - 1);
}

export async function POST(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

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

    const monthlyLimit = getUsageLimitForMetric(entitlements, 'ai_outfit_image_generations');
    const monthlyReservation = await reserveUsageCounterAtomic(supabase, {
      userId: user.id,
      metricKey: 'ai_outfit_image_generations',
      period: entitlements.period,
      limit: monthlyLimit,
      incrementBy: 1,
    });
    if (!monthlyReservation.allowed) {
      return NextResponse.json({
        error: 'You reached your monthly AI image generation quota.',
        code: 'USAGE_LIMIT_EXCEEDED',
      }, { status: 429 });
    }

    const hourKey = getAiBurstHourKey(new Date());
    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));
    const hourEnd = new Date(hourStart);
    hourEnd.setUTCHours(hourEnd.getUTCHours() + 1);
    const burstReservation = await reserveUsageCounterAtomic(supabase, {
      userId: user.id,
      metricKey: 'ai_requests_hourly',
      period: {
        key: hourKey,
        start: hourStart,
        end: hourEnd,
      },
      limit: entitlements.plan.limits.ai_burst_per_hour,
      incrementBy: 1,
    });
    if (!burstReservation.allowed) {
      return NextResponse.json({
        error: 'Hourly burst limit reached. Please try again later.',
        code: 'BURST_LIMIT_EXCEEDED',
      }, { status: 429 });
    }

    if (!tryAcquireInflight(user.id)) {
      return NextResponse.json(
        { error: 'Image generation is handling high demand. Please retry shortly.', code: 'UPSTREAM_RATE_LIMIT' },
        { status: 503, headers: { 'Retry-After': '10' } }
      );
    }

    try {
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
        log.error('Replicate create prediction failed', { status: createPrediction.status, errPayload });
        return NextResponse.json({ error: 'Image generation provider failed' }, { status: 502 });
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

      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

      return NextResponse.json({
        imageUrl: output,
        predictionId: prediction.id,
      });
    } finally {
      releaseInflight(user.id);
    }
  } catch (error) {
    log.error('Image generation request failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}

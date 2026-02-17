import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { incrementUsageCounter, resolveUserEntitlements } from '@/lib/services/billing/entitlements';
import { getAssistantPredictionStatus } from '@/lib/services/assistant/providers/replicate';
import { moderateOutput } from '@/lib/services/assistant/moderation';
import { SEBASTIAN_REFUSAL_TEMPLATES } from '@/lib/services/assistant/persona';

export const dynamic = 'force-dynamic';

const StatusRequestSchema = z.object({
  threadId: z.string().uuid(),
});

async function getBurstCount(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, hourKey: string) {
  const { data } = await supabase
    .from('usage_counters')
    .select('id, count')
    .eq('user_id', userId)
    .eq('metric_key', 'ai_stylist_requests_hourly')
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
      metric_key: 'ai_stylist_requests_hourly',
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
      return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const parsed = StatusRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { data: thread } = await supabase
      .from('assistant_threads')
      .select('id')
      .eq('id', parsed.data.threadId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found', code: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    const { data: pendingMessage } = await supabase
      .from('assistant_messages')
      .select('id, content, metadata_json')
      .eq('thread_id', parsed.data.threadId)
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .contains('metadata_json', { pending: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pendingMessage) {
      const { data: latestAssistant } = await supabase
        .from('assistant_messages')
        .select('content')
        .eq('thread_id', parsed.data.threadId)
        .eq('user_id', user.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        threadId: parsed.data.threadId,
        pending: false,
        assistantMessage: latestAssistant?.content || null,
      });
    }

    const metadata = (pendingMessage.metadata_json || {}) as {
      pending_prediction_id?: string;
      metric_key?: 'ai_stylist_messages' | 'ai_stylist_vision_messages';
      hour_key?: string;
      model?: string;
    };

    if (!metadata.pending_prediction_id) {
      return NextResponse.json({
        threadId: parsed.data.threadId,
        pending: false,
        assistantMessage: pendingMessage.content,
      });
    }

    const predictionStatus = await getAssistantPredictionStatus(metadata.pending_prediction_id);
    if (predictionStatus.status === 'pending') {
      return NextResponse.json({
        threadId: parsed.data.threadId,
        pending: true,
        assistantMessage: pendingMessage.content,
      });
    }

    if (predictionStatus.status === 'failed') {
      const failReply = 'I could not complete that image review right now. Please try again.';
      await supabase
        .from('assistant_messages')
        .update({
          content: failReply,
          metadata_json: {
            ...metadata,
            pending: false,
            failed: true,
          },
        })
        .eq('id', pendingMessage.id);

      await supabase.from('assistant_inference_events').insert({
        user_id: user.id,
        thread_id: parsed.data.threadId,
        provider: 'replicate',
        model: metadata.model || predictionStatus.model || 'unknown',
        status: 'failed',
        error_code: 'UPSTREAM_ERROR',
        safety_flags_json: {},
      });

      return NextResponse.json({
        threadId: parsed.data.threadId,
        pending: false,
        assistantMessage: failReply,
      });
    }

    const outputSafety = moderateOutput(predictionStatus.text || '');
    const finalReply = outputSafety.blocked
      ? (outputSafety.safeReply || SEBASTIAN_REFUSAL_TEMPLATES.outOfScope)
      : (predictionStatus.text || SEBASTIAN_REFUSAL_TEMPLATES.outOfScope);

    await supabase
      .from('assistant_messages')
      .update({
        content: finalReply,
        metadata_json: {
          ...metadata,
          pending: false,
          blocked: outputSafety.blocked,
          safety_flags: outputSafety.flags,
          model: predictionStatus.model || metadata.model || 'unknown',
        },
      })
      .eq('id', pendingMessage.id);

    const entitlements = await resolveUserEntitlements(supabase, user.id);
    await incrementUsageCounter(
      supabase,
      user.id,
      metadata.metric_key || 'ai_stylist_vision_messages',
      entitlements.period,
      1
    );
    if (metadata.hour_key) {
      await incrementBurstCount(supabase, user.id, metadata.hour_key);
    }

    await supabase.from('assistant_inference_events').insert({
      user_id: user.id,
      thread_id: parsed.data.threadId,
      provider: 'replicate',
      model: predictionStatus.model || metadata.model || 'unknown',
      status: outputSafety.blocked ? 'blocked' : 'succeeded',
      input_tokens: predictionStatus.inputTokens ?? null,
      output_tokens: predictionStatus.outputTokens ?? null,
      error_code: outputSafety.blocked ? 'SAFETY_BLOCKED' : null,
      safety_flags_json: {
        output: outputSafety.flags,
      },
    });

    return NextResponse.json({
      threadId: parsed.data.threadId,
      pending: false,
      assistantMessage: finalReply,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to poll assistant status';
    if (message.toLowerCase().includes('timeout')) {
      return NextResponse.json({ error: 'Upstream timeout', code: 'UPSTREAM_TIMEOUT' }, { status: 504 });
    }
    return NextResponse.json({ error: message, code: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

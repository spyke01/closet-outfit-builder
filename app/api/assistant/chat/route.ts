import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUsageLimitForMetric,
  resolveUserEntitlements,
  getAssistantBurstHourKey,
  reserveUsageCounterAtomic,
} from '@/lib/services/billing/entitlements';
import {
  buildSebastianSystemPrompt,
  SEBASTIAN_REFUSAL_TEMPLATES,
  validateSebastianSystemPrompt,
} from '@/lib/services/assistant/persona';
import { AssistantChatRequestSchema } from '@/lib/services/assistant/types';
import { buildAssistantContextPack, summarizeContextForPrompt } from '@/lib/services/assistant/context-builder';
import { isAllowedImageUrl, moderateInput, moderateOutput } from '@/lib/services/assistant/moderation';
import { createAssistantPrediction, generateAssistantReply, resolveReplicateModelConfig } from '@/lib/services/assistant/providers/replicate';
import { requireSameOrigin } from '@/lib/utils/request-security';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
const log = createLogger({ component: 'api-assistant-chat' });
const inflightRequests = new Map<string, number>();
const MAX_INFLIGHT_PER_USER = Number(process.env.ASSISTANT_MAX_INFLIGHT_PER_USER || 3);

function tryAcquireInflight(userId: string): boolean {
  const current = inflightRequests.get(userId) || 0;
  if (current >= MAX_INFLIGHT_PER_USER) {
    return false;
  }
  inflightRequests.set(userId, current + 1);
  return true;
}

function releaseInflight(userId: string): void {
  const current = inflightRequests.get(userId) || 0;
  if (current <= 1) {
    inflightRequests.delete(userId);
    return;
  }
  inflightRequests.set(userId, current - 1);
}

async function ensureThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  message: string,
  threadId?: string
): Promise<{ id: string; history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> }> {
  if (threadId) {
    const { data: thread } = await supabase
      .from('assistant_threads')
      .select('id')
      .eq('id', threadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!thread) {
      throw new Error('THREAD_NOT_FOUND');
    }

    const { data: messageRows } = await supabase
      .from('assistant_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(12);

    return {
      id: thread.id,
      history: ((messageRows || []) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>),
    };
  }

  const { data: createdThread, error } = await supabase
    .from('assistant_threads')
    .insert({
      user_id: userId,
      title: message.slice(0, 80),
    })
    .select('id')
    .single();

  if (error || !createdThread?.id) {
    throw new Error('Failed to create thread');
  }

  return { id: createdThread.id, history: [] };
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) {
    return sameOriginError;
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const parsed = AssistantChatRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    if (parsed.data.imageUrl && !isAllowedImageUrl(parsed.data.imageUrl)) {
      return NextResponse.json({
        error: 'Image URL is not allowed',
        code: 'VALIDATION_ERROR',
      }, { status: 400 });
    }

    const entitlements = await resolveUserEntitlements(supabase, user.id);
    const isPaidPlan = entitlements.effectivePlanCode === 'plus' || entitlements.effectivePlanCode === 'pro';

    if (!isPaidPlan) {
      return NextResponse.json({
        error: 'Sebastian is available on Plus and Pro plans.',
        code: 'PLAN_REQUIRED',
      }, { status: 403 });
    }

    const metricKey = parsed.data.imageUrl ? 'ai_stylist_vision_messages' : 'ai_stylist_messages';
    const modelConfig = resolveReplicateModelConfig();
    const hourKey = getAssistantBurstHourKey(new Date());
    const inputSafety = moderateInput(parsed.data.message, parsed.data.imageUrl);

    if (inputSafety.blocked) {
      const { id: blockedThreadId } = await ensureThread(supabase, user.id, parsed.data.message, parsed.data.threadId);
      await supabase.from('assistant_messages').insert({
        thread_id: blockedThreadId,
        user_id: user.id,
        role: 'user',
        content: parsed.data.message,
        image_url: parsed.data.imageUrl || null,
        metadata_json: { safety_flags: inputSafety.flags },
      });

      const safeReply = inputSafety.safeReply || SEBASTIAN_REFUSAL_TEMPLATES.safetyBlocked;

      await supabase.from('assistant_messages').insert({
        thread_id: blockedThreadId,
        user_id: user.id,
        role: 'assistant',
        content: safeReply,
        metadata_json: { blocked: true, safety_flags: inputSafety.flags },
      });

      await supabase.from('assistant_inference_events').insert({
        user_id: user.id,
        thread_id: blockedThreadId,
        provider: 'replicate',
        model: modelConfig.defaultModel,
        status: 'blocked',
        latency_ms: Date.now() - start,
        error_code: 'SAFETY_BLOCKED',
        safety_flags_json: { input: inputSafety.flags },
      });

      return NextResponse.json({
        threadId: blockedThreadId,
        assistantMessage: safeReply,
      });
    }

    const monthlyLimit = getUsageLimitForMetric(entitlements, metricKey);
    const monthlyReservation = await reserveUsageCounterAtomic(supabase, {
      userId: user.id,
      metricKey,
      period: entitlements.period,
      limit: monthlyLimit,
      incrementBy: 1,
    });

    if (!monthlyReservation.allowed) {
      return NextResponse.json({
        error: 'You reached your monthly Sebastian usage quota.',
        code: 'USAGE_LIMIT_EXCEEDED',
      }, { status: 429 });
    }

    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));
    const hourEnd = new Date(hourStart);
    hourEnd.setUTCHours(hourEnd.getUTCHours() + 1);
    const burstReservation = await reserveUsageCounterAtomic(supabase, {
      userId: user.id,
      metricKey: 'ai_stylist_requests_hourly',
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

    const { id: ensuredThreadId, history } = await ensureThread(supabase, user.id, parsed.data.message, parsed.data.threadId);
    await supabase.from('assistant_messages').insert({
      thread_id: ensuredThreadId,
      user_id: user.id,
      role: 'user',
      content: parsed.data.message,
      image_url: parsed.data.imageUrl || null,
      metadata_json: { safety_flags: inputSafety.flags },
    });

    if (!tryAcquireInflight(user.id)) {
      return NextResponse.json(
        { error: 'Sebastian is handling high demand right now. Please retry in a moment.', code: 'UPSTREAM_RATE_LIMIT' },
        { status: 503, headers: { 'Retry-After': '10' } }
      );
    }

    try {
      const { pack } = await buildAssistantContextPack(supabase, user.id, parsed.data);
      const contextSummary = summarizeContextForPrompt(pack);
      const systemPrompt = buildSebastianSystemPrompt();
      const promptValidation = validateSebastianSystemPrompt(systemPrompt);
      if (!promptValidation.valid) {
        throw new Error(`CONFIG_ERROR: Missing prompt guardrails: ${promptValidation.missingClauses.join(' | ')}`);
      }

      if (parsed.data.imageUrl) {
        const prediction = await createAssistantPrediction({
          model: modelConfig.defaultModel,
          systemPrompt,
          userPrompt: `${parsed.data.message}\n\nContext:\n${contextSummary}`,
          imageUrl: parsed.data.imageUrl,
          context: pack,
          history,
        });

        const pendingMessage = "I'm reviewing your outfit photo now. This can take up to a minute.";
        await supabase.from('assistant_messages').insert({
          thread_id: ensuredThreadId,
          user_id: user.id,
          role: 'assistant',
          content: pendingMessage,
          metadata_json: {
            pending: true,
            pending_prediction_id: prediction.id,
            metric_key: metricKey,
            hour_key: hourKey,
            model: prediction.model,
            reserved_usage: true,
          },
        });

        return NextResponse.json({
          threadId: ensuredThreadId,
          assistantMessage: pendingMessage,
          pending: true,
        });
      }

      const providerResult = await generateAssistantReply({
        model: modelConfig.defaultModel,
        systemPrompt,
        userPrompt: `${parsed.data.message}\n\nContext:\n${contextSummary}`,
        context: pack,
        history,
      });

      const outputSafety = moderateOutput(providerResult.text);
      const finalReply = outputSafety.blocked
        ? (outputSafety.safeReply || SEBASTIAN_REFUSAL_TEMPLATES.outOfScope)
        : providerResult.text;

      await supabase.from('assistant_messages').insert({
        thread_id: ensuredThreadId,
        user_id: user.id,
        role: 'assistant',
        content: finalReply,
        metadata_json: {
          blocked: outputSafety.blocked,
          safety_flags: outputSafety.flags,
          model: providerResult.model,
        },
      });

      await supabase.from('assistant_inference_events').insert({
        user_id: user.id,
        thread_id: ensuredThreadId,
        provider: 'replicate',
        model: providerResult.model,
        status: outputSafety.blocked ? 'blocked' : 'succeeded',
        latency_ms: Date.now() - start,
        input_tokens: providerResult.inputTokens,
        output_tokens: providerResult.outputTokens,
        safety_flags_json: {
          input: inputSafety.flags,
          output: outputSafety.flags,
        },
        error_code: outputSafety.blocked ? 'SAFETY_BLOCKED' : null,
      });

      return NextResponse.json({
        threadId: ensuredThreadId,
        assistantMessage: finalReply,
      });
    } finally {
      releaseInflight(user.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate assistant response';

    if (message === 'THREAD_NOT_FOUND') {
      return NextResponse.json({ error: 'Thread not found', code: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    if (message.toLowerCase().includes('timeout')) {
      return NextResponse.json({ error: 'Upstream timeout', code: 'UPSTREAM_TIMEOUT' }, { status: 504 });
    }

    if (message.includes('422')) {
      return NextResponse.json({
        error: 'Sebastian could not process this request format. Please retry, or send text-only once.',
        code: 'UPSTREAM_INVALID_REQUEST',
      }, { status: 502 });
    }

    if (message.includes('UPSTREAM_CIRCUIT_OPEN')) {
      return NextResponse.json({
        error: 'Sebastian is temporarily at capacity. Please try again in about a minute.',
        code: 'UPSTREAM_UNAVAILABLE',
      }, { status: 503 });
    }

    if (message.includes('429')) {
      return NextResponse.json({
        error: 'Sebastian is handling high demand right now. Please retry in a moment.',
        code: 'UPSTREAM_RATE_LIMIT',
      }, { status: 503 });
    }

    if (message.includes('CONFIG_ERROR')) {
      return NextResponse.json({ error: message, code: 'CONFIG_ERROR' }, { status: 500 });
    }

    log.error('Assistant chat request failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return NextResponse.json({ error: 'Failed to generate assistant response', code: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

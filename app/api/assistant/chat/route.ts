import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  incrementUsageCounter,
  isUsageExceeded,
  resolveUserEntitlements,
  getAssistantBurstHourKey,
} from '@/lib/services/billing/entitlements';
import {
  buildSebastianSystemPrompt,
  SEBASTIAN_REFUSAL_TEMPLATES,
  validateSebastianSystemPrompt,
} from '@/lib/services/assistant/persona';
import { AssistantChatRequestSchema } from '@/lib/services/assistant/types';
import { buildAssistantContextPack, summarizeContextForPrompt } from '@/lib/services/assistant/context-builder';
import { isAllowedImageUrl, moderateInput, moderateOutput } from '@/lib/services/assistant/moderation';
import { generateAssistantReply, resolveReplicateModelConfig } from '@/lib/services/assistant/providers/replicate';

export const dynamic = 'force-dynamic';

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
    if (isUsageExceeded(entitlements, metricKey)) {
      return NextResponse.json({
        error: 'You reached your monthly Sebastian usage quota.',
        code: 'USAGE_LIMIT_EXCEEDED',
      }, { status: 429 });
    }

    const hourKey = getAssistantBurstHourKey(new Date());
    const burstCounter = await getBurstCount(supabase, user.id, hourKey);
    const burstLimit = entitlements.plan.limits.ai_burst_per_hour;
    if ((burstCounter?.count || 0) >= burstLimit) {
      return NextResponse.json({
        error: 'Hourly burst limit reached. Please try again later.',
        code: 'BURST_LIMIT_EXCEEDED',
      }, { status: 429 });
    }

    const inputSafety = moderateInput(parsed.data.message, parsed.data.imageUrl);
    const { id: ensuredThreadId, history } = await ensureThread(supabase, user.id, parsed.data.message, parsed.data.threadId);

    await supabase.from('assistant_messages').insert({
      thread_id: ensuredThreadId,
      user_id: user.id,
      role: 'user',
      content: parsed.data.message,
      image_url: parsed.data.imageUrl || null,
      metadata_json: { safety_flags: inputSafety.flags },
    });

    if (inputSafety.blocked) {
      const safeReply = inputSafety.safeReply || SEBASTIAN_REFUSAL_TEMPLATES.safetyBlocked;

      await supabase.from('assistant_messages').insert({
        thread_id: ensuredThreadId,
        user_id: user.id,
        role: 'assistant',
        content: safeReply,
        metadata_json: { blocked: true, safety_flags: inputSafety.flags },
      });

      await supabase.from('assistant_inference_events').insert({
        user_id: user.id,
        thread_id: ensuredThreadId,
        provider: 'replicate',
        model: modelConfig.defaultModel,
        status: 'blocked',
        latency_ms: Date.now() - start,
        error_code: 'SAFETY_BLOCKED',
        safety_flags_json: { input: inputSafety.flags },
      });

      return NextResponse.json({
        threadId: ensuredThreadId,
        assistantMessage: safeReply,
      });
    }

    const { pack } = await buildAssistantContextPack(supabase, user.id, parsed.data);
    const contextSummary = summarizeContextForPrompt(pack);
    const systemPrompt = buildSebastianSystemPrompt();
    const promptValidation = validateSebastianSystemPrompt(systemPrompt);
    if (!promptValidation.valid) {
      throw new Error(`CONFIG_ERROR: Missing prompt guardrails: ${promptValidation.missingClauses.join(' | ')}`);
    }

    const providerResult = await generateAssistantReply({
      model: modelConfig.defaultModel,
      systemPrompt,
      userPrompt: `${parsed.data.message}\n\nContext:\n${contextSummary}`,
      imageUrl: parsed.data.imageUrl,
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

    await incrementUsageCounter(supabase, user.id, metricKey, entitlements.period, 1);
    await incrementBurstCount(supabase, user.id, hourKey);

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

    return NextResponse.json({ error: message, code: 'UPSTREAM_ERROR' }, { status: 502 });
  }
}

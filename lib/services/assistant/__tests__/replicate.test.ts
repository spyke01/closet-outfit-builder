import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAssistantReply, resetReplicateCircuitForTests, resolveReplicateModelConfig } from '@/lib/services/assistant/providers/replicate';

const originalDefault = process.env.REPLICATE_DEFAULT_MODEL;
const originalFallback = process.env.REPLICATE_FALLBACK_MODEL;
const originalToken = process.env.REPLICATE_API_TOKEN;
const originalFetch = global.fetch;

afterEach(() => {
  process.env.REPLICATE_DEFAULT_MODEL = originalDefault;
  process.env.REPLICATE_FALLBACK_MODEL = originalFallback;
  process.env.REPLICATE_API_TOKEN = originalToken;
  global.fetch = originalFetch;
  resetReplicateCircuitForTests();
});

describe('replicate model configuration guardrails', () => {
  it('uses valid default and fallback models', () => {
    process.env.REPLICATE_DEFAULT_MODEL = 'openai/gpt-5-mini';
    process.env.REPLICATE_FALLBACK_MODEL = 'openai/gpt-4o-mini';

    const config = resolveReplicateModelConfig();
    expect(config.defaultModel).toBe('openai/gpt-5-mini');
    expect(config.fallbackModel).toBe('openai/gpt-4o-mini');
  });

  it('throws when default model is outside allowlist', () => {
    process.env.REPLICATE_DEFAULT_MODEL = 'unknown/model-x';
    process.env.REPLICATE_FALLBACK_MODEL = 'openai/gpt-4o-mini';

    expect(() => resolveReplicateModelConfig()).toThrow(/CONFIG_ERROR/);
  });

  it('throws when fallback model is outside allowlist', () => {
    process.env.REPLICATE_DEFAULT_MODEL = 'openai/gpt-5-mini';
    process.env.REPLICATE_FALLBACK_MODEL = 'unknown/fallback';

    expect(() => resolveReplicateModelConfig()).toThrow(/CONFIG_ERROR/);
  });

  it('records failures and keeps returning a controlled upstream failure under repeated outages', async () => {
    process.env.REPLICATE_API_TOKEN = 'test-token';
    process.env.REPLICATE_DEFAULT_MODEL = 'openai/gpt-5-mini';
    process.env.REPLICATE_FALLBACK_MODEL = 'openai/gpt-5-mini';

    global.fetch = (() => Promise.reject(new Error('network down'))) as typeof fetch;

    const request = {
      model: 'openai/gpt-5-mini',
      systemPrompt: 'You are Sebastian',
      userPrompt: 'Help me style this look',
      context: {
        userId: 'user-1',
        wardrobe: [],
        recentOutfits: [],
        calendarWindow: [],
        trips: [],
      },
      history: [],
    };

    await expect(generateAssistantReply(request)).rejects.toThrow('network down');
    await expect(generateAssistantReply(request)).rejects.toThrow('network down');
    await expect(generateAssistantReply(request)).rejects.toThrow('network down');
    await expect(generateAssistantReply(request)).rejects.toThrow(/network down|UPSTREAM_CIRCUIT_OPEN/);
  });

  it('fails fast on upstream 429 without retry storming', async () => {
    process.env.REPLICATE_API_TOKEN = 'test-token';
    process.env.REPLICATE_DEFAULT_MODEL = 'openai/gpt-5-mini';
    process.env.REPLICATE_FALLBACK_MODEL = 'openai/gpt-4o-mini';

    const fetchMock = vi.fn(async () => new Response('{}', { status: 429 }));
    global.fetch = fetchMock as typeof fetch;

    const request = {
      model: 'openai/gpt-5-mini',
      systemPrompt: 'You are Sebastian',
      userPrompt: 'Help me style this look',
      context: {
        userId: 'user-1',
        wardrobe: [],
        recentOutfits: [],
        calendarWindow: [],
        trips: [],
      },
      history: [],
    };

    await expect(generateAssistantReply(request)).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses image_input payload field for vision requests', async () => {
    process.env.REPLICATE_API_TOKEN = 'test-token';
    process.env.REPLICATE_DEFAULT_MODEL = 'openai/gpt-5-mini';
    process.env.REPLICATE_FALLBACK_MODEL = 'openai/gpt-4o-mini';

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/predictions')) {
        const body = JSON.parse(String(init?.body || '{}')) as { input?: Record<string, unknown> };
        expect(body.input).toBeDefined();
        expect(body.input?.image_input).toEqual(['https://example.com/look.jpg']);
        expect(body.input?.image).toBeUndefined();
        expect(typeof body.input?.prompt).toBe('string');
        expect(typeof body.input?.system_prompt).toBe('string');

        return new Response(JSON.stringify({
          id: 'pred-1',
          status: 'succeeded',
          output: [{ text: 'Looks sharp.' }],
          metrics: { input_token_count: 12, output_token_count: 7 },
        }), { status: 200 });
      }

      return new Response('{}', { status: 200 });
    });

    global.fetch = fetchMock as typeof fetch;

    const result = await generateAssistantReply({
      model: 'openai/gpt-5-mini',
      systemPrompt: 'You are Sebastian',
      userPrompt: 'Review my outfit photo',
      imageUrl: 'https://example.com/look.jpg',
      context: {
        userId: 'user-1',
        wardrobe: [],
        recentOutfits: [],
        calendarWindow: [],
        trips: [],
      },
      history: [],
    });

    expect(result.text).toContain('Looks sharp');
  });

  it('does not inject line breaks when provider output is tokenized', async () => {
    process.env.REPLICATE_API_TOKEN = 'test-token';
    process.env.REPLICATE_DEFAULT_MODEL = 'openai/gpt-5-mini';
    process.env.REPLICATE_FALLBACK_MODEL = 'openai/gpt-4o-mini';

    global.fetch = vi.fn(async () => new Response(JSON.stringify({
      id: 'pred-2',
      status: 'succeeded',
      output: ['I', ' can', ' help', ' with', ' styling.'],
      metrics: { input_token_count: 10, output_token_count: 5 },
    }), { status: 200 })) as typeof fetch;

    const result = await generateAssistantReply({
      model: 'openai/gpt-5-mini',
      systemPrompt: 'You are Sebastian',
      userPrompt: 'what can you help with?',
      context: {
        userId: 'user-1',
        wardrobe: [],
        recentOutfits: [],
        calendarWindow: [],
        trips: [],
      },
      history: [],
    });

    expect(result.text).toBe('I can help with styling.');
  });
});

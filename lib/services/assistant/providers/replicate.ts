import type { AssistantProviderInput, AssistantProviderOutput } from '../types';

export const ALLOWED_REPLICATE_MODELS = [
  'openai/gpt-5-mini',
  'openai/gpt-4o-mini',
  'anthropic/claude-4.5-sonnet',
  'anthropic/claude-4.5-haiku',
] as const;

const REQUEST_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 1_200;
const MAX_POLL_ATTEMPTS = 20;
const MAX_TRANSIENT_RETRIES = 2;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 60_000;
const MAX_PROMPT_CHARS = 12_000;

const modelCircuitState = new Map<string, { consecutiveFailures: number; openUntilMs: number }>();

function getCircuitState(model: string): { consecutiveFailures: number; openUntilMs: number } {
  const existing = modelCircuitState.get(model);
  if (existing) return existing;

  const initial = { consecutiveFailures: 0, openUntilMs: 0 };
  modelCircuitState.set(model, initial);
  return initial;
}

function isCircuitOpen(model: string): boolean {
  const state = getCircuitState(model);
  return Date.now() < state.openUntilMs;
}

function recordModelFailure(model: string): void {
  const state = getCircuitState(model);
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.openUntilMs = Date.now() + CIRCUIT_OPEN_MS;
  }
  modelCircuitState.set(model, state);
}

function recordModelSuccess(model: string): void {
  modelCircuitState.set(model, { consecutiveFailures: 0, openUntilMs: 0 });
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('UPSTREAM_TIMEOUT') ||
    message.includes('Replicate transient create prediction failed') ||
    message.includes('Replicate transient poll failed') ||
    message.includes('503') ||
    message.includes('502')
  );
}

function isRateLimitOrCapacityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('429')
    || message.includes('UPSTREAM_CIRCUIT_OPEN')
  );
}

async function withTimeout(input: {
  url: string;
  init: RequestInit;
  timeoutMs: number;
  timeoutLabel: string;
}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    return await fetch(input.url, { ...input.init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`UPSTREAM_TIMEOUT: ${input.timeoutLabel}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function resolveReplicateModelConfig(): { defaultModel: string; fallbackModel: string } {
  const defaultModel = process.env.REPLICATE_DEFAULT_MODEL || 'openai/gpt-5-mini';
  const fallbackModel = process.env.REPLICATE_FALLBACK_MODEL || 'openai/gpt-4o-mini';

  if (!ALLOWED_REPLICATE_MODELS.includes(defaultModel as (typeof ALLOWED_REPLICATE_MODELS)[number])) {
    throw new Error(`CONFIG_ERROR: Unsupported default model '${defaultModel}'`);
  }

  if (!ALLOWED_REPLICATE_MODELS.includes(fallbackModel as (typeof ALLOWED_REPLICATE_MODELS)[number])) {
    throw new Error(`CONFIG_ERROR: Unsupported fallback model '${fallbackModel}'`);
  }

  return { defaultModel, fallbackModel };
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: unknown;
  error?: string | null;
  urls?: {
    get?: string;
  };
  metrics?: {
    input_token_count?: number;
    output_token_count?: number;
  };
}

function parseModelSlug(model: string): { owner: string; name: string } {
  const [owner, name] = model.split('/');
  if (!owner || !name) {
    throw new Error(`CONFIG_ERROR: Invalid model slug '${model}'`);
  }
  return { owner, name };
}

async function readReplicateErrorDetail(response: Response): Promise<string> {
  try {
    const payload = await response.clone().json() as {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
      errors?: unknown;
    };

    if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return payload.errors
        .map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
        .join(' | ');
    }
  } catch {
    // fall through to plain text
  }

  try {
    const text = (await response.clone().text()).trim();
    return text || 'No error detail provided';
  } catch {
    return 'No error detail provided';
  }
}

function extractOutputText(output: unknown): string {
  if (typeof output === 'string') return output;

  if (Array.isArray(output)) {
    const joined = output
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const maybeText = (item as { text?: unknown }).text;
          if (typeof maybeText === 'string') return maybeText;
        }
        return '';
      })
      .filter(Boolean)
      .join('');

    if (joined) return joined;
  }

  if (output && typeof output === 'object') {
    const candidate = output as { text?: unknown; output_text?: unknown; response?: unknown };
    if (typeof candidate.text === 'string') return candidate.text;
    if (typeof candidate.output_text === 'string') return candidate.output_text;
    if (typeof candidate.response === 'string') return candidate.response;
  }

  return '';
}

function normalizeAssistantText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    // Trim trailing whitespace on each line.
    .replace(/[ \t]+\n/g, '\n')
    // Collapse 3+ blank lines to at most 2 for readability.
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function runPrediction(model: string, input: Record<string, unknown>, token: string): Promise<ReplicatePrediction> {
  const { owner, name } = parseModelSlug(model);
  const response = await withTimeout({
    url: `https://api.replicate.com/v1/models/${owner}/${name}/predictions`,
    timeoutMs: REQUEST_TIMEOUT_MS,
    timeoutLabel: 'create_prediction',
    init: {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({ input }),
    },
  });

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id') || response.headers.get('x-replicate-request-id');
    const detail = await readReplicateErrorDetail(response);
    if (response.status >= 500 || response.status === 429) {
      if (response.status === 429) {
        throw new Error(`Replicate rate limit on create prediction: 429${requestId ? ` (request_id=${requestId})` : ''}${detail ? ` - ${detail}` : ''}`);
      }
      throw new Error(`Replicate transient create prediction failed: ${response.status}${requestId ? ` (request_id=${requestId})` : ''}${detail ? ` - ${detail}` : ''}`);
    }
    if (response.status === 422) {
      throw new Error(`Replicate invalid request: 422${requestId ? ` (request_id=${requestId})` : ''}${detail ? ` - ${detail}` : ''}`);
    }
    throw new Error(`Replicate create prediction failed: ${response.status}${requestId ? ` (request_id=${requestId})` : ''}${detail ? ` - ${detail}` : ''}`);
  }

  let prediction = await response.json() as ReplicatePrediction;

  const pollUrl = prediction.urls?.get;
  if (!pollUrl) {
    return prediction;
  }

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
    if (prediction.status === 'succeeded' || prediction.status === 'failed' || prediction.status === 'canceled') {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const poll = await withTimeout({
      url: pollUrl,
      timeoutMs: REQUEST_TIMEOUT_MS,
      timeoutLabel: 'poll_prediction',
      init: {
        headers: { Authorization: `Token ${token}` },
      },
    });

    if (!poll.ok) {
      const detail = await readReplicateErrorDetail(poll);
      if (poll.status >= 500 || poll.status === 429) {
        const requestId = poll.headers.get('x-request-id') || poll.headers.get('x-replicate-request-id');
        if (poll.status === 429) {
          throw new Error(`Replicate rate limit on prediction poll: 429${requestId ? ` (request_id=${requestId})` : ''}${detail ? ` - ${detail}` : ''}`);
        }
        throw new Error(`Replicate transient poll failed: ${poll.status}${requestId ? ` (request_id=${requestId})` : ''}${detail ? ` - ${detail}` : ''}`);
      }
      if (poll.status === 422) {
        const requestId = poll.headers.get('x-request-id') || poll.headers.get('x-replicate-request-id');
        throw new Error(`Replicate invalid request on prediction poll: 422${requestId ? ` (request_id=${requestId})` : ''}${detail ? ` - ${detail}` : ''}`);
      }
      break;
    }
    prediction = await poll.json() as ReplicatePrediction;
  }

  return prediction;
}

export async function generateAssistantReply(input: AssistantProviderInput): Promise<AssistantProviderOutput> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('Replicate token is not configured');
  }

  const { fallbackModel } = resolveReplicateModelConfig();

  const conversationHistory = input.history.map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n');
  const composedPrompt = [
    'Conversation history:',
    conversationHistory || 'No prior history.',
    '',
    `User request: ${input.userPrompt}`,
    '',
    'Return a concise, actionable response.',
  ].join('\n').slice(0, MAX_PROMPT_CHARS);

  const payload: Record<string, unknown> = {
    prompt: composedPrompt,
    system_prompt: input.systemPrompt.slice(0, 4000),
  };

  if (input.imageUrl) {
    payload.image_input = [input.imageUrl];
  }

  const runWithRetry = async (model: string): Promise<ReplicatePrediction> => {
    if (isCircuitOpen(model)) {
      throw new Error(`UPSTREAM_CIRCUIT_OPEN: ${model}`);
    }

    let attempts = 0;
    let lastError: unknown = null;
    while (attempts <= MAX_TRANSIENT_RETRIES) {
      try {
        const prediction = await runPrediction(model, payload, token);
        recordModelSuccess(model);
        return prediction;
      } catch (error) {
        lastError = error;
        if (isRateLimitOrCapacityError(error)) {
          recordModelFailure(model);
          throw error;
        }
        if (!isTransientError(error) || attempts === MAX_TRANSIENT_RETRIES) {
          recordModelFailure(model);
          throw error;
        }
        attempts += 1;
      }
    }

    recordModelFailure(model);
    throw (lastError instanceof Error ? lastError : new Error('Replicate prediction failed'));
  };

  let prediction: ReplicatePrediction | null = null;
  let modelUsed = input.model;
  const modelCandidates = [
    input.model,
    fallbackModel,
    'openai/gpt-4o-mini',
    'anthropic/claude-4.5-haiku',
  ].filter((model, index, arr) => arr.indexOf(model) === index);

  let lastError: unknown = null;
  let triedAnyCandidate = false;
  for (const candidate of modelCandidates) {
    if (!ALLOWED_REPLICATE_MODELS.includes(candidate as (typeof ALLOWED_REPLICATE_MODELS)[number])) {
      continue;
    }

    if (triedAnyCandidate && lastError && !isRateLimitOrCapacityError(lastError)) {
      break;
    }

    triedAnyCandidate = true;

    try {
      prediction = await runWithRetry(candidate);
      modelUsed = candidate;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (isRateLimitOrCapacityError(error)) {
        break;
      }
    }
  }

  if (lastError) {
    throw (lastError instanceof Error ? lastError : new Error('Replicate prediction failed'));
  }

  if (!prediction) {
    throw new Error('Replicate prediction failed');
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(prediction.error || 'Replicate prediction failed');
  }

  const text = normalizeAssistantText(extractOutputText(prediction.output));
  if (!text) {
    throw new Error('Replicate returned empty response');
  }

  return {
    model: modelUsed,
    text,
    inputTokens: prediction.metrics?.input_token_count ?? null,
    outputTokens: prediction.metrics?.output_token_count ?? null,
  };
}

export function resetReplicateCircuitForTests(): void {
  modelCircuitState.clear();
}

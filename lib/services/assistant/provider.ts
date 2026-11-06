import "server-only";
import type { AssistantProviderInput, AssistantProviderOutput } from "./types";
import {
  createAssistantPrediction as createReplicate,
  getAssistantPredictionStatus as getReplicateStatus,
  resolveReplicateModelConfig,
  type AssistantPredictionHandle,
  type AssistantPredictionStatus,
} from "./providers/replicate";
import { resolveAiPolicy } from "@/lib/services/ai/policy";

type OpenAiResponse = {
  id: string;
  model?: string;
  status: string;
  output?: Array<{ content?: Array<{ type: string; text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

const OPENAI_MODELS = ["gpt-6-luna", "gpt-6.1-terra"] as const;

export function resolveAssistantConfig() {
  const provider = process.env.AI_TEXT_PROVIDER || "openai";
  if (provider === "replicate")
    return { provider, ...resolveReplicateModelConfig() };
  if (provider !== "openai")
    throw new Error("CONFIG_ERROR: Unsupported AI provider");
  const defaultModel = process.env.OPENAI_TEXT_MODEL || "gpt-6-luna";
  if (!OPENAI_MODELS.includes(defaultModel as (typeof OPENAI_MODELS)[number]))
    throw new Error("CONFIG_ERROR: Unsupported text model");
  return { provider, defaultModel, fallbackModel: defaultModel };
}

async function openAiRequest(
  path: string,
  init: RequestInit = {},
): Promise<OpenAiResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("CONFIG_ERROR: OpenAI is not configured");
  const response = await fetch(`https://api.openai.com/v1/responses${path}`, {
    ...init,
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  // Never expose provider bodies, request headers, or credentials in public errors.
  if (!response.ok)
    throw new Error(`AI provider request failed: ${response.status}`);
  return response.json() as Promise<OpenAiResponse>;
}

function boundedText(value: string, bytes: number): string {
  const encoder = new TextEncoder();
  let text = value;
  while (encoder.encode(text).byteLength > bytes)
    text = text.slice(0, Math.floor(text.length * 0.9));
  return text;
}

export async function createAssistantPrediction(
  input: AssistantProviderInput,
): Promise<AssistantPredictionHandle> {
  const config = resolveAssistantConfig();
  if (config.provider === "replicate") return createReplicate(input);
  if (!OPENAI_MODELS.includes(input.model as (typeof OPENAI_MODELS)[number]))
    throw new Error("CONFIG_ERROR: Unsupported text model");
  const policy = resolveAiPolicy((key) => process.env[key]);
  const userText = boundedText(input.userPrompt, 12_000);
  const history = input.history.slice(-12);
  while (
    history.length &&
    new TextEncoder().encode(JSON.stringify(history)).byteLength > 6_000
  )
    history.shift();
  const response = await openAiRequest("", {
    method: "POST",
    body: JSON.stringify({
      model: input.model,
      instructions: boundedText(input.systemPrompt, 6_000),
      input: [
        ...history
          .filter((x) => x.role !== "system")
          .map((x) => ({ role: x.role, content: x.content })),
        {
          role: "user",
          content: [
            { type: "input_text", text: userText },
            ...(input.imageUrl
              ? [
                  {
                    type: "input_image",
                    image_url: input.imageUrl,
                    detail: "low",
                  },
                ]
              : []),
          ],
        },
      ],
      tools: [],
      reasoning: { effort: "none" },
      max_output_tokens: policy.maxOutputTokens,
      // Background responses provide a resumable handle. The application deletes
      // the provider response after persisting a terminal result when possible.
      background: true,
      store: true,
    }),
  });
  if (!response.id?.startsWith("resp_"))
    throw new Error("Invalid provider response");
  return { id: response.id, model: input.model };
}

export async function getAssistantPredictionStatus(
  id: string,
): Promise<AssistantPredictionStatus> {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id))
    throw new Error("Invalid prediction identifier");
  // Existing Replicate handles continue to work during a provider transition.
  if (!id.startsWith("resp_")) return getReplicateStatus(id);
  const response = await openAiRequest("/" + encodeURIComponent(id));
  if (["queued", "in_progress"].includes(response.status))
    return { id, model: response.model || "", status: "pending" };
  const text = (response.output || [])
    .flatMap((x) => x.content || [])
    .filter((x) => x.type === "output_text")
    .map((x) => x.text || "")
    .join("")
    .trim();
  if (response.status !== "completed" || !text)
    return {
      id,
      model: response.model || "",
      status: "failed",
      error: "The response could not be completed.",
    };
  return {
    id,
    model: response.model || "",
    status: "succeeded",
    text,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

export async function deleteProviderResponse(id: string): Promise<void> {
  if (!/^resp_[a-zA-Z0-9_-]+$/.test(id) || !process.env.OPENAI_API_KEY) return;
  await fetch(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
}

export async function generateAssistantReply(
  input: AssistantProviderInput,
): Promise<AssistantProviderOutput> {
  const prediction = await createAssistantPrediction(input);
  await input.onPredictionCreated?.(prediction.id, input.model);
  const until = Date.now() + 28_000;
  while (Date.now() < until) {
    const status = await getAssistantPredictionStatus(prediction.id);
    if (status.status === "succeeded")
      return {
        model: status.model || input.model,
        text: status.text || "",
        inputTokens: status.inputTokens ?? null,
        outputTokens: status.outputTokens ?? null,
      };
    if (status.status === "failed") throw new Error("AI prediction failed");
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error("UPSTREAM_PENDING: The request is still running");
}

import type {
  AssistantProviderInput,
  AssistantProviderOutput,
} from "@/lib/services/assistant/types";
import {
  createAssistantPrediction,
  deleteProviderResponse,
  getAssistantPredictionStatus,
  resolveAssistantConfig,
} from "@/lib/services/assistant/provider";
import {
  ownedAiJob,
  AiJobError,
  finishAiJob,
  recordAiPrediction,
  reserveAiJob,
  type AiJob,
} from "./jobs";
import type { AiTask } from "./policy";

export async function refreshAssistantJob(job: AiJob): Promise<AiJob> {
  if (
    job.status === "succeeded" ||
    job.status === "failed" ||
    job.status === "canceled" ||
    !job.prediction_id
  )
    return job;
  let status;
  try {
    status = await getAssistantPredictionStatus(job.prediction_id);
  } catch (error) {
    // Another poll may already have saved and deleted the provider response.
    const latest = await ownedAiJob(job.user_id, job.id);
    if (latest && ["succeeded", "failed", "canceled"].includes(latest.status))
      return latest;
    throw error;
  }
  if (status.status === "pending") return job;
  if (status.status === "failed") {
    await finishAiJob(job.id, job.user_id, null, "GENERATION_FAILED");
    await deleteProviderResponse(job.prediction_id);
    return { ...job, status: "failed", error_code: "GENERATION_FAILED" };
  }
  const result = {
    text: status.text,
    model: status.model || job.model,
    inputTokens: status.inputTokens ?? null,
    outputTokens: status.outputTokens ?? null,
  };
  await finishAiJob(job.id, job.user_id, result);
  await deleteProviderResponse(job.prediction_id);
  return { ...job, status: "succeeded", result_json: result };
}

export async function startAssistantJob(input: {
  userId: string;
  task: Extract<AiTask, "assistant_text" | "assistant_vision" | "today_outfit">;
  key: string;
  scope?: string;
  payload: unknown;
  providerInput: AssistantProviderInput;
}): Promise<AiJob> {
  const config = resolveAssistantConfig();
  // Check configuration before consuming a user's operation allowance.
  if (
    !(config.provider === "openai"
      ? process.env.OPENAI_API_KEY
      : process.env.REPLICATE_API_TOKEN)
  )
    throw new AiJobError("AI_POLICY_UNAVAILABLE", 503);
  const reservation = await reserveAiJob({
    userId: input.userId,
    task: input.task,
    key: input.key,
    scope: input.scope,
    payload: input.payload,
    provider: config.provider,
    model: input.providerInput.model,
  });
  if (!reservation.created) return refreshAssistantJob(reservation.job);
  try {
    const prediction = await createAssistantPrediction(input.providerInput);
    await recordAiPrediction(
      reservation.job.id,
      input.userId,
      prediction.id,
      prediction.model,
    );
    return {
      ...reservation.job,
      prediction_id: prediction.id,
      status: "processing",
    };
  } catch (error) {
    await finishAiJob(
      reservation.job.id,
      input.userId,
      null,
      "UPSTREAM_UNAVAILABLE",
    );
    throw error;
  }
}

export async function waitForAssistantJob(
  job: AiJob,
  timeoutMs = 22_000,
): Promise<AiJob> {
  const end = Date.now() + timeoutMs;
  let current = job;
  while (current.status === "processing" && Date.now() < end) {
    current = await refreshAssistantJob(current);
    if (current.status === "processing")
      await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return current;
}

export function assistantJobOutput(job: AiJob): AssistantProviderOutput | null {
  const result = job.result_json;
  if (job.status !== "succeeded" || typeof result?.text !== "string")
    return null;
  return {
    text: result.text,
    model: String(result.model || job.model),
    inputTokens:
      typeof result.inputTokens === "number" ? result.inputTokens : null,
    outputTokens:
      typeof result.outputTokens === "number" ? result.outputTokens : null,
  };
}

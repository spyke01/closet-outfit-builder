/** Shared server/Edge policy. Values are never read from browser-supplied input. */
export type AiTask =
  | "assistant_text"
  | "assistant_vision"
  | "today_outfit"
  | "wardrobe_image"
  | "outfit_image"
  | "background_removal"
  | "media_upload";
export type AiEnvironment = (key: string) => string | undefined;

function positiveNumber(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > maximum)
    throw new Error("AI_POLICY_UNAVAILABLE");
  return number;
}

export function resolveAiPolicy(env: AiEnvironment) {
  return {
    enabled: env("AI_ENABLED") !== "false",
    globalDailyMicros: Math.floor(
      positiveNumber(env("AI_DAILY_BUDGET_USD"), 25, 10_000) * 1_000_000,
    ),
    globalMonthlyMicros: Math.floor(
      positiveNumber(env("AI_MONTHLY_BUDGET_USD"), 250, 100_000) * 1_000_000,
    ),
    userMonthlyMicros: Math.floor(
      positiveNumber(env("AI_USER_MONTHLY_BUDGET_USD"), 150, 10_000) *
        1_000_000,
    ),
    maxInflight: Math.floor(
      positiveNumber(env("AI_MAX_INFLIGHT_PER_USER"), 2, 20),
    ),
    maxOutputTokens: Math.floor(
      positiveNumber(env("AI_MAX_OUTPUT_TOKENS"), 1024, 2048),
    ),
    maxPromptBytes: 24_000,
    predictionDeadlineSeconds: 60,
  };
}

export function maxTaskCostMicros(task: AiTask, model: string): number {
  if (task === "media_upload") return 1;
  if (task === "background_removal") return 50_000;
  if (task === "wardrobe_image") return 100_000; // One Imagen output plus bounded cleanup.
  if (task === "outfit_image") return 80_000;
  if (task === "assistant_vision") return 150_000;
  if (model.includes("terra")) return 50_000;
  if (model.includes("sonnet")) return 150_000;
  if (model.includes("haiku")) return 50_000;
  return 20_000;
}

export const AI_PUBLIC_ERRORS: Record<string, string> = {
  PLAN_REQUIRED: "This feature is available on Plus and Pro.",
  USAGE_LIMIT_EXCEEDED: "You have reached the allowance for this period.",
  BURST_LIMIT_EXCEEDED:
    "You have made several requests recently. Please try again later.",
  AI_BUSY:
    "Your previous request is still running. Please wait for it to finish.",
  AI_DISABLED:
    "AI features are temporarily unavailable. Your wardrobe and saved outfits are still available.",
  AI_BUDGET_EXCEEDED:
    "AI features are temporarily unavailable. Please try again later.",
  AI_USER_BUDGET_EXCEEDED:
    "You have reached the AI allowance for this period. Please try again later.",
  IDEMPOTENCY_CONFLICT:
    "This request has changed. Start a new request to continue.",
  RETRY_LIMIT_EXCEEDED:
    "The courtesy retry has already been used or has expired.",
  AI_POLICY_UNAVAILABLE:
    "AI features are temporarily unavailable. Please try again later.",
};

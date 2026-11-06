import { boundedJson, RequestBodyError } from "@/lib/utils/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSameOrigin } from "@/lib/utils/request-security";
import {
  getUsageLimitForMetric,
  resolveUserEntitlements,
} from "@/lib/services/billing/entitlements";
import { buildSebastianSystemPrompt } from "@/lib/services/assistant/persona";
import { resolveAssistantConfig } from "@/lib/services/assistant/provider";
import {
  assistantJobOutput,
  startAssistantJob,
  waitForAssistantJob,
} from "@/lib/services/ai/assistant-job";
import { AiJobError } from "@/lib/services/ai/jobs";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { WeatherContextSchema } from "@/lib/schemas/generation";
import { generateOutfit } from "@/lib/services/outfit-generator";
import {
  getEventGuidance,
  getFormalityBand,
  getFormalityRange,
  getStyleGuidance,
  TODAY_AI_EVENT_PRESETS,
  TODAY_AI_STYLE_PRESETS,
  type TodayAiFormality,
} from "@/lib/services/today-ai/constants";
import type { AssistantContextPack } from "@/lib/services/assistant/types";
import { createLogger } from "@/lib/utils/logger";
import type { WardrobeItem } from "@/lib/types/database";
import { isFreePlan } from "@/lib/services/billing/plan-labels";
import { mapPublicAiError } from "@/lib/utils/public-ai-errors";
import { hasCompleteOutfitItems } from "@/lib/utils/outfit-coverage";
import { balancedWardrobeShortlist } from "@/lib/services/assistant/wardrobe-shortlist";
import { sanitizeContextValue } from "@/lib/services/assistant/moderation";

const log = createLogger({ component: "api-today-ai-outfit" });
export const dynamic = "force-dynamic";

const TodayAiInputSchema = z.object({
  requestId: z.string().uuid().optional(),
  eventType: z.string().trim().min(1).max(100),
  stylePreset: z.string().trim().min(1).max(60),
  styleCustom: z.string().trim().max(120).optional().nullable(),
  formality: z.enum(["casual", "smart", "formal"]),
  weather: WeatherContextSchema,
  currentTodaySignatures: z.array(z.string().min(1)).max(10).optional(),
  regenerateToken: z.string().trim().max(80).optional(),
});

const TODAY_AI_MONTHLY_METRIC = "ai_today_ai_generations";
const TODAY_AI_FREE_TRIAL_METRIC = "ai_today_ai_trial_lifetime";
const FREE_TRIAL_LIMIT = 1;

type WardrobeRow = {
  id: string;
  name: string;
  color: string | null;
  formality_score: number | null;
  season: string[] | null;
  category: { name?: string } | null;
  [key: string]: unknown;
};

function todayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function tomorrowIso(now: Date = new Date()): string {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

function signatureFromItemIds(itemIds: string[]): string {
  return [...itemIds].sort().join("|");
}

function normalizeExplanation(text: string): string {
  return (
    text.replace(/\s+/g, " ").trim().slice(0, 500) ||
    "Built to match your event, style, and weather."
  );
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || raw;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;

  try {
    return JSON.parse(objectMatch[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isItemInRange(
  score: number,
  min: number,
  max: number,
  tolerance: number,
): boolean {
  return score >= min - tolerance && score <= max + tolerance;
}

function getFormalityRangeMismatch(
  formality: TodayAiFormality,
  items: WardrobeRow[],
): boolean {
  const { min, max } = getFormalityRange(formality);
  const core = items.filter((item) => {
    const category = item.category?.name;
    return (
      category === "Shirt" ||
      category === "Pants" ||
      category === "Dress" ||
      category === "Shoes"
    );
  });
  if (core.length === 0) return true;
  const scores = core.map((item) => item.formality_score ?? 5);
  const scoreByCategory = new Map(
    core.map((item) => [
      item.category?.name || "Unknown",
      item.formality_score ?? 5,
    ]),
  );

  // Baseline per-item check first (tighter than prior average-based rule).
  if (scores.some((score) => !isItemInRange(score, min, max, 1))) {
    return true;
  }

  const shoesScore = scoreByCategory.get("Shoes") ?? 5;
  const shirtScore = scoreByCategory.get("Shirt") ?? 5;
  const pantsScore = scoreByCategory.get("Pants") ?? 5;
  const dressScore = scoreByCategory.get("Dress") ?? 5;
  const usesDress = scoreByCategory.has("Dress");

  if (formality === "casual") {
    if (shoesScore > 7 || shirtScore > 7 || pantsScore > 7 || dressScore > 7) {
      return true;
    }
  }

  if (formality === "smart") {
    if (usesDress) {
      if (shoesScore < 3 || shoesScore > 8 || dressScore < 3) {
        return true;
      }
    } else if (
      shoesScore < 3 ||
      shoesScore > 8 ||
      shirtScore < 3 ||
      pantsScore < 3
    ) {
      return true;
    }
  }

  if (formality === "formal") {
    const refinedCoreCount = usesDress
      ? [dressScore, shoesScore].filter((score) => score >= 7).length
      : [shirtScore, pantsScore, shoesScore].filter((score) => score >= 7)
          .length;
    if (usesDress) {
      if (refinedCoreCount < 2 || shoesScore < 7 || dressScore < 6) {
        return true;
      }
    } else if (refinedCoreCount < 2 || shoesScore < 7 || shirtScore < 6) {
      return true;
    }
  }

  return false;
}

function hasRequiredCoreCategories(items: WardrobeRow[]): boolean {
  return hasCompleteOutfitItems(items as unknown as WardrobeItem[]);
}

function buildFinalExplanation(
  input: z.infer<typeof TodayAiInputSchema>,
  items: WardrobeRow[],
): string {
  const byCategory = new Map<string, WardrobeRow>();
  for (const item of items) {
    const category = item.category?.name;
    if (category && !byCategory.has(category)) {
      byCategory.set(category, item);
    }
  }

  const shirt = byCategory.get("Shirt")?.name || "shirt";
  const pants = byCategory.get("Pants")?.name || "pants";
  const dress = byCategory.get("Dress")?.name;
  const shoes = byCategory.get("Shoes")?.name || "shoes";
  const layer =
    byCategory.get("Jacket")?.name || byCategory.get("Overshirt")?.name;

  const weatherNote = input.weather.isRainLikely
    ? "Rain is likely, so prioritize practical layering and sturdy footwear."
    : `The weather around ${Math.round(input.weather.currentTemp)}F supports this balance of comfort and polish.`;

  const layerNote = layer
    ? `Add the ${layer} for structure and weather adaptability.`
    : "Keep layering light to maintain mobility and comfort.";

  return normalizeExplanation(
    dress
      ? `${input.eventType} in ${input.stylePreset} at ${input.formality} formality: anchor with ${dress}, finish with ${shoes}, and keep the silhouette cohesive. ${layerNote} ${weatherNote}`
      : `${input.eventType} in ${input.stylePreset} at ${input.formality} formality: anchor with ${shirt}, pair with ${pants}, and finish with ${shoes}. ${layerNote} ${weatherNote}`,
  );
}

function buildTodayOutfitPrompt(
  input: z.infer<typeof TodayAiInputSchema>,
  wardrobe: WardrobeRow[],
): string {
  const styleCustom = input.styleCustom?.trim();
  const weather = input.weather;
  const wardrobeRows = balancedWardrobeShortlist(
    wardrobe,
    70,
    (item) => item.category?.name || "Unknown",
  )
    .map((item) => {
      const category = item.category?.name || "Unknown";
      const color = item.color || "unknown";
      const formality = item.formality_score ?? 5;
      return `${item.id} | ${sanitizeContextValue(item.name).slice(0, 60)} | ${sanitizeContextValue(category).slice(0, 25)} | ${sanitizeContextValue(color).slice(0, 20)} | formality:${formality}`;
    })
    .join("\n");

  const styleDescriptor = styleCustom
    ? `${input.stylePreset} (${styleCustom})`
    : input.stylePreset;
  const styleGuidance = getStyleGuidance(input.stylePreset);
  const eventGuidance = getEventGuidance(input.eventType);
  const formalityGuidance =
    input.formality === "formal"
      ? "Favor refined formality (tailoring, dress trousers, dress shoes). Avoid casual tees and rugged boots."
      : input.formality === "smart"
        ? "Favor smart-casual polish. Prefer OCBD/dress shirts/knits, tailored trousers/chinos, and polished footwear."
        : "Favor relaxed pieces while maintaining cohesion and weather fit.";

  const ivySmartWorkGuardrail =
    input.stylePreset === "Ivy" &&
    input.formality === "smart" &&
    /work|client/i.test(input.eventType)
      ? "Special guardrail for Ivy + smart work context: prioritize OCBD/striped shirt, chinos or wool trousers, loafers/brogues/dress boots, optional sportcoat/quilted vest. Do NOT anchor with a plain tee unless no smart shirt exists."
      : null;

  return [
    "You are selecting one outfit from the provided wardrobe rows.",
    "Output STRICT JSON only, with no markdown:",
    '{"itemIds":["uuid-1","uuid-2"],"explanation":"one short paragraph for user"}',
    "",
    "Rules:",
    "- Use only IDs from the wardrobe list.",
    "- Include either Shirt + Pants + Shoes or Dress + Shoes at minimum.",
    "- Prefer 5-8 items when wardrobe supports it (include layer/accessory where appropriate).",
    "- Consider weather and requested formality.",
    "- Keep explanation user-facing, concise, and practical.",
    "- Never mention internal IDs in the explanation.",
    "",
    `Event: ${input.eventType}`,
    `Event guidance: ${eventGuidance}`,
    `Style: ${styleDescriptor}`,
    `Style guidance: ${styleGuidance}`,
    `Formality target: ${input.formality}`,
    `Formality guidance: ${formalityGuidance}`,
    ivySmartWorkGuardrail,
    `Weather: current ${Math.round(weather.currentTemp)}F, high ${Math.round(weather.highTemp)}F, low ${Math.round(weather.lowTemp)}F, precip ${(weather.precipChance * 100).toFixed(0)}%, rainLikely=${weather.isRainLikely}`,
    "",
    "Selection rubric (in priority order): style fidelity, event appropriateness, formality alignment, weather fit, color harmony.",
    "",
    "Wardrobe rows:",
    wardrobeRows,
  ]
    .filter(Boolean)
    .join("\n");
}

async function getSavedOutfitSignatures(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("outfits")
    .select("id, outfit_items(item_id)")
    .eq("user_id", userId);

  const signatures = new Set<string>();
  for (const outfit of data || []) {
    const itemIds = (
      (outfit.outfit_items as Array<{ item_id: string }> | null) || []
    ).map((row) => row.item_id);
    if (itemIds.length > 0) signatures.add(signatureFromItemIds(itemIds));
  }
  return signatures;
}

async function fetchTodayAiState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const dateKey = todayDateKey();
  const { data } = await supabase
    .from("today_ai_outfits")
    .select(
      `
      id,
      entry_date,
      event_type,
      style_preset,
      style_custom,
      formality_level,
      sebastian_explanation,
      expires_at,
      weather_context_json,
      outfit:outfits(
        id,
        name,
        score,
        source,
        created_at,
        outfit_items(
          item_id,
          wardrobe_items(
            id,
            name,
            color,
            formality_score,
            image_url,
            category:categories(name)
          )
        )
      )
    `,
    )
    .eq("user_id", userId)
    .eq("entry_date", dateKey)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    entryDate: data.entry_date,
    eventType: data.event_type,
    stylePreset: data.style_preset,
    styleCustom: data.style_custom,
    formality: data.formality_level,
    explanation: data.sebastian_explanation,
    expiresAt: data.expires_at,
    weatherContext: data.weather_context_json || {},
    outfit: data.outfit,
  };
}

async function generateAiOutfit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: z.infer<typeof TodayAiInputSchema>,
): Promise<Record<string, unknown>> {
  const { data: wardrobeRows, error: wardrobeError } = await supabase
    .from("wardrobe_items")
    .select("*, category:categories(*)")
    .eq("user_id", userId)
    .eq("active", true);

  if (wardrobeError) throw new Error("Unable to load wardrobe");
  const wardrobe = (wardrobeRows || []) as WardrobeRow[];
  if (!hasCompleteOutfitItems(wardrobe)) {
    throw new Error("INSUFFICIENT_WARDROBE");
  }

  const prompt = buildTodayOutfitPrompt(input, wardrobe);
  const assistantContext: AssistantContextPack = {
    userId,
    wardrobe: balancedWardrobeShortlist(
      wardrobe,
      70,
      (item) => item.category?.name || "Unknown",
    ).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category?.name || "Unknown",
      color: item.color,
      season: item.season,
      formalityScore: item.formality_score,
    })),
    recentOutfits: [],
    calendarWindow: [],
    trips: [],
    currentWeather: {
      temperatureF: input.weather.currentTemp,
      highTempF: input.weather.highTemp,
      lowTempF: input.weather.lowTemp,
      precipChance: input.weather.precipChance * 100,
    },
  };

  const modelConfig = resolveAssistantConfig();
  const { requestId, ...intent } = input;
  const job = await waitForAssistantJob(
    await startAssistantJob({
      userId,
      task: "today_outfit",
      key: requestId || input.regenerateToken || randomUUID(),
      scope: todayDateKey(),
      payload: intent,
      providerInput: {
        model: modelConfig.defaultModel,
        systemPrompt: `${buildSebastianSystemPrompt()}\nReturn JSON only when asked.`,
        userPrompt: prompt,
        context: assistantContext,
        history: [],
      },
    }),
    18_000,
  );
  if (job.status === "failed" || job.status === "canceled")
    throw new AiJobError("GENERATION_FAILED", 502);
  const output = assistantJobOutput(job);
  if (!output) return { pending: true, jobId: job.id, requestId };
  // A completed request can be retried safely after a lost HTTP response.
  const { data: existing } = await supabase
    .from("outfits")
    .select("id")
    .eq("user_id", userId)
    .eq("ai_job_id", job.id)
    .maybeSingle();
  if (existing)
    return { todayAiOutfit: await fetchTodayAiState(supabase, userId) };
  const parsed = extractJsonObject(output.text);
  const modelItemIds = Array.isArray(parsed?.itemIds)
    ? parsed.itemIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  const signatureSet = new Set(input.currentTodaySignatures || []);
  const savedSignatures = await getSavedOutfitSignatures(supabase, userId);
  for (const signature of savedSignatures) signatureSet.add(signature);

  let selectedItemIds = modelItemIds;
  let selectedRows = wardrobe.filter((item) =>
    selectedItemIds.includes(item.id),
  );
  let signature = signatureFromItemIds(selectedRows.map((item) => item.id));
  const formalityMismatch = getFormalityRangeMismatch(
    input.formality,
    selectedRows,
  );

  if (
    selectedRows.length < 2 ||
    !hasRequiredCoreCategories(selectedRows) ||
    formalityMismatch ||
    signatureSet.has(signature)
  ) {
    const variationToken = input.regenerateToken?.trim() || job.id;
    let found: string[] | null = null;
    const exhaustedSignatures = new Set(signatureSet);
    for (let attempt = 0; attempt < 8; attempt++) {
      const fallback = generateOutfit({
        wardrobeItems: wardrobe as unknown as WardrobeItem[],
        weatherContext: input.weather,
        preferredFormalityBand: getFormalityBand(input.formality),
        preferredFormalityRange: getFormalityRange(input.formality),
        variationSeed: `today-ai:${todayDateKey()}:${input.eventType}:${input.stylePreset}:${input.styleCustom || "none"}:${input.formality}:${variationToken}:${attempt}`,
        explorationLevel: 0.8,
      });
      const candidateRows = wardrobe.filter((item) =>
        fallback.itemIds.includes(item.id),
      );
      const candidateSignature = signatureFromItemIds(fallback.itemIds);
      const mismatch = getFormalityRangeMismatch(
        input.formality,
        candidateRows,
      );
      if (
        fallback.itemIds.length >= 2 &&
        hasRequiredCoreCategories(candidateRows) &&
        !mismatch &&
        !exhaustedSignatures.has(candidateSignature)
      ) {
        found = fallback.itemIds;
        break;
      }
      exhaustedSignatures.add(candidateSignature);
    }
    if (found) {
      selectedItemIds = found;
      selectedRows = wardrobe.filter((item) =>
        selectedItemIds.includes(item.id),
      );
      signature = signatureFromItemIds(selectedItemIds);
    }
  }

  if (signatureSet.has(signature)) {
    throw new Error("DUPLICATE_OUTFIT");
  }

  if (!hasRequiredCoreCategories(selectedRows)) {
    throw new Error("INVALID_SELECTION");
  }

  if (getFormalityRangeMismatch(input.formality, selectedRows)) {
    throw new Error("FORMALITY_MISMATCH");
  }

  const score = Math.round(
    (selectedRows.reduce((sum, item) => sum + (item.formality_score ?? 5), 0) /
      Math.max(selectedRows.length, 1)) *
      10,
  );
  const explanation = buildFinalExplanation(input, selectedRows);
  const { error: saveError } = await createAdminClient().rpc(
    "persist_today_ai_outfit",
    {
      p_user_id: userId,
      p_job_id: job.id,
      p_item_ids: selectedRows.map((item) => item.id),
      p_score: Math.min(100, Math.max(1, score)),
      p_date: todayDateKey(),
      p_event: input.eventType,
      p_style: input.stylePreset,
      p_custom: input.styleCustom || null,
      p_formality: input.formality,
      p_explanation: explanation,
      p_weather: input.weather,
      p_expires: tomorrowIso(),
    },
  );
  if (saveError)
    throw new Error(
      "Failed to save the outfit. Retry this request to finish saving it.",
    );

  const todayState = await fetchTodayAiState(supabase, userId);
  return {
    todayAiOutfit: todayState,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const entitlements = await resolveUserEntitlements(supabase, user.id);
    const { data: trial, error: trialError } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("user_id", user.id)
      .eq("metric_key", TODAY_AI_FREE_TRIAL_METRIC)
      .eq("period_key", "lifetime")
      .maybeSingle();
    if (trialError) throw new Error("Could not load your allowance.");
    const trialUsed = trial?.count || 0;
    const monthlyUsed = entitlements.usage[TODAY_AI_MONTHLY_METRIC] || 0;
    const monthlyLimit = getUsageLimitForMetric(
      entitlements,
      TODAY_AI_MONTHLY_METRIC,
    );
    const todayAiOutfit = await fetchTodayAiState(supabase, user.id);

    return NextResponse.json({
      todayAiOutfit,
      usage: {
        trialUsed,
        trialLimit: FREE_TRIAL_LIMIT,
        monthlyUsed,
        monthlyLimit,
      },
      entitlements: {
        planCode: entitlements.effectivePlanCode,
        canUsePaid: !isFreePlan(entitlements.effectivePlanCode),
      },
      options: {
        eventPresets: TODAY_AI_EVENT_PRESETS,
        stylePresets: TODAY_AI_STYLE_PRESETS,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Today AI outfit",
      },
      { status: 500 },
    );
  }
}

async function handleWrite(request: NextRequest) {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const parsed = TodayAiInputSchema.safeParse(await boundedJson(request));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const payload = await generateAiOutfit(supabase, user.id, parsed.data);
    return NextResponse.json(payload, { status: payload.pending ? 202 : 200 });
  } catch (error) {
    if (error instanceof AiJobError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    log.error("Failed to write Today AI outfit", {
      error: error instanceof Error ? error.message : "unknown",
    });
    if (error instanceof Error && error.message === "DUPLICATE_OUTFIT") {
      return NextResponse.json(
        {
          error:
            "Generated outfit duplicated an existing look. Please regenerate.",
          code: "DUPLICATE_OUTFIT",
        },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "FORMALITY_MISMATCH") {
      return NextResponse.json(
        {
          error:
            "Could not find a strong match for that formality in your wardrobe. Try a different formality or add more items in that style.",
          code: "FORMALITY_MISMATCH",
        },
        { status: 422 },
      );
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_WARDROBE") {
      return NextResponse.json(
        {
          error:
            "Add a few more active wardrobe items before generating an outfit.",
          code: "INSUFFICIENT_WARDROBE",
        },
        { status: 422 },
      );
    }

    const mapped = mapPublicAiError(
      error instanceof Error ? error.message : "",
    );
    return NextResponse.json(
      { error: mapped.error, code: mapped.code },
      { status: mapped.status },
    );
  }
}

export async function POST(request: NextRequest) {
  return handleWrite(request);
}

export async function PATCH(request: NextRequest) {
  return handleWrite(request);
}

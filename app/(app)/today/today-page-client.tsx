"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Skeleton } from "@/components/page-skeletons";
import { LoadingStatus } from "@/components/loading-status";
import { AppDialog } from "@/components/ui/app-dialog";
import { UpgradePrompt, type UpgradeFeature } from "@/components/upgrade-prompt";
import { LockKeyhole, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Loader2, RefreshCw, Save, Sparkles, X } from "lucide-react";
import { WardrobeItem } from "@/lib/types/database";
import { useAppWeather } from "@/lib/contexts/app-weather";
import { AskSebastian } from "@/components/ask-sebastian";
import {
  OutfitComposition,
  OutfitThumbnails,
} from "@/components/outfit-composition";
import { TodayUpcoming } from "@/components/today-upcoming";
import { localDateKey } from "@/lib/utils/local-date";
import {
  useCalendarEntriesByMonth,
  useCreateCalendarEntry,
} from "@/lib/hooks/use-calendar-entries";
import { normalizeWeatherContext } from "@/lib/utils/weather-normalization";
import { regenerateOutfit, swapItem } from "@/lib/services/outfit-generator";
import { GeneratedOutfit, WeatherContext } from "@/lib/types/generation";
import { createOutfit } from "@/lib/actions/outfits";
import { markTodayAiOutfitSaved } from "@/lib/actions/today";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OutfitGridLayout } from "@/components/outfit-grid-layout";
import { useBillingEntitlements } from "@/lib/hooks/use-billing-entitlements";
import { createClient } from "@/lib/supabase/client";
import { createLogger } from "@/lib/utils/logger";
import { isFreePlan } from "@/lib/services/billing/plan-labels";
import {
  getGreetingCopy,
  getTodayStylingTip,
} from "@/lib/services/today/presentation";
import { hasCompleteOutfitItems } from "@/lib/utils/outfit-coverage";

const logger = createLogger({ component: "app-today-today-page-client" });

interface TodayPageClientProps {
  wardrobeItems: WardrobeItem[];
  userName?: string | null;
}

interface LookConfig {
  id: "easy-day" | "elevated-daily" | "evening-polish";
  label: string;
  preferredFormalityBand: "casual" | "smart-casual" | "refined";
  preferredFormalityRange: { min: number; max: number };
}

interface TodayAiState {
  id: string;
  eventType: string;
  stylePreset: string;
  styleCustom?: string | null;
  formality: "casual" | "smart" | "formal";
  explanation: string;
  expiresAt: string;
  outfit?: {
    id: string;
    name?: string;
    score?: number;
    outfit_items?: Array<{
      item_id?: string;
      wardrobe_items?: WardrobeItem | null;
    }>;
  } | null;
}

interface TodayAiApiResponse {
  todayAiOutfit: TodayAiState | null;
  usage: {
    trialUsed: number;
    trialLimit: number;
    monthlyUsed: number;
    monthlyLimit: number | null;
  };
  entitlements: {
    planCode: "free" | "plus" | "pro";
    canUsePaid: boolean;
  };
  options: {
    eventPresets: readonly string[];
    stylePresets: readonly string[];
  };
}

const LOOK_CONFIGS: LookConfig[] = [
  {
    id: "easy-day",
    label: "Easy Day",
    preferredFormalityBand: "casual",
    preferredFormalityRange: { min: 1, max: 4 },
  },
  {
    id: "elevated-daily",
    label: "Elevated Daily",
    preferredFormalityBand: "smart-casual",
    preferredFormalityRange: { min: 4, max: 7 },
  },
  {
    id: "evening-polish",
    label: "Evening Polish",
    preferredFormalityBand: "refined",
    preferredFormalityRange: { min: 7, max: 10 },
  },
];
const FREE_TODAY_LOOK: LookConfig = LOOK_CONFIGS[1];

const OUTFIT_HISTORY_STORAGE_KEY = "today-outfit-signatures-v2";
const OUTFIT_HISTORY_LIMIT = 60;
const MAX_GENERATION_ATTEMPTS = 20;
const EXPLORATION_LEVEL = 0.7;

const CATEGORY_TO_SLOT: Record<string, string> = {
  jacket: "jacket",
  overshirt: "overshirt",
  shirt: "shirt",
  undershirt: "undershirt",
  pants: "pants",
  shoes: "shoes",
  belt: "belt",
  watch: "watch",
  Jacket: "jacket",
  Overshirt: "overshirt",
  Shirt: "shirt",
  Undershirt: "undershirt",
  Pants: "pants",
  Shoes: "shoes",
  Belt: "belt",
  Watch: "watch",
};

function formatDateInTimeZone(date: Date, timezone?: string | null) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(timezone ? { timeZone: timezone } : {}),
  }).format(date);
}

function getHourInTimeZone(date: Date, timezone?: string | null) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    ...(timezone ? { timeZone: timezone } : {}),
  }).format(date);

  return Number.parseInt(formatted, 10);
}

function getOutfitSignature(outfit: GeneratedOutfit): string {
  return Object.entries(outfit.items)
    .filter(([, item]) => Boolean(item?.id))
    .map(([slot, item]) => `${slot}:${item!.id}`)
    .sort()
    .join("|");
}

function toItemSetSignature(itemIds: string[]): string {
  return [...itemIds].sort().join("|");
}

function hasRequiredCategories(items: WardrobeItem[]): boolean {
  return hasCompleteOutfitItems(items);
}

export default function TodayPageClient({
  wardrobeItems,
  userName,
}: TodayPageClientProps) {
  const {
    current,
    forecast,
    loading: weatherLoading,
    error: weatherError,
    weatherEnabled,
    preferenceLoading,
    timezone: weatherTimezone,
  } = useAppWeather();
  const timezone = weatherTimezone || null;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [selectedLook, setSelectedLook] =
    useState<LookConfig["id"]>("elevated-daily");
  const [upgradeFeature, setUpgradeFeature] = useState<UpgradeFeature | null>(null);
  const createCalendarEntry = useCreateCalendarEntry();
  const calendar = useCalendarEntriesByMonth({ month: new Date() });
  const wearLock = useRef(false);
  const [wearFeedback, setWearFeedback] = useState("");
  const aiRequestRef = useRef<{
    body: string;
    method: "POST" | "PATCH";
  } | null>(null);
  const aiLock = useRef(false);
  const { entitlements, loading: entitlementsLoading, error: membershipError, retry: retryMembership } =
    useBillingEntitlements(true);
  const [freeOutfit, setFreeOutfit] = useState<GeneratedOutfit | null>(null);
  const [paidLooks, setPaidLooks] = useState<
    Record<LookConfig["id"], GeneratedOutfit | null>
  >({
    "easy-day": null,
    "elevated-daily": null,
    "evening-polish": null,
  });
  const [recentOutfitSignatures, setRecentOutfitSignatures] = useState<
    string[]
  >([]);
  const [savedSignatures, setSavedSignatures] = useState<Set<string>>(
    new Set(),
  );
  const [generationNonce, setGenerationNonce] = useState(0);
  const [generatingLookId, setGeneratingLookId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedLookKeys, setSavedLookKeys] = useState<Set<string>>(new Set());
  const [saveFeedbackByKey, setSaveFeedbackByKey] = useState<
    Record<string, string>
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [todayAi, setTodayAi] = useState<TodayAiState | null>(null);
  const [aiUsage, setAiUsage] = useState<TodayAiApiResponse["usage"] | null>(
    null,
  );
  const [aiOptions, setAiOptions] = useState<
    TodayAiApiResponse["options"] | null
  >(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFormOpen, setAiFormOpen] = useState(false);
  const [aiOutfitSaved, setAiOutfitSaved] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [eventType, setEventType] = useState("Work Day");
  const [stylePreset, setStylePreset] = useState("Smart Casual");
  const [styleCustom, setStyleCustom] = useState("");
  const [formality, setFormality] = useState<"casual" | "smart" | "formal">(
    "smart",
  );
  const selectionHydratedRef = useRef(false);

  const weatherContext = useMemo<WeatherContext | null>(() => {
    if (!current || !forecast.length) {
      if (weatherError || (!preferenceLoading && !weatherEnabled)) {
        return {
          isCold: false,
          isMild: true,
          isWarm: false,
          isHot: false,
          isRainLikely: false,
          dailySwing: 0,
          hasLargeSwing: false,
          targetWeight: 1,
          currentTemp: 65,
          highTemp: 70,
          lowTemp: 60,
          precipChance: 0,
        };
      }
      return null;
    }
    return normalizeWeatherContext(current, forecast);
  }, [current, forecast, weatherError, weatherEnabled, preferenceLoading]);

  const requiredCategoriesAvailable = useMemo(
    () => hasRequiredCategories(wardrobeItems),
    [wardrobeItems],
  );

  const now = useMemo(() => new Date(), []);
  const greetingDate = useMemo(() => {
    const hour = getHourInTimeZone(now, timezone);
    if (Number.isNaN(hour)) return now;

    const adjusted = new Date(now);
    adjusted.setHours(
      hour,
      adjusted.getMinutes(),
      adjusted.getSeconds(),
      adjusted.getMilliseconds(),
    );
    return adjusted;
  }, [now, timezone]);
  const greeting = useMemo(
    () => getGreetingCopy(greetingDate, userName),
    [greetingDate, userName],
  );
  const stylingTip = useMemo(
    () =>
      getTodayStylingTip(weatherContext, {
        weatherUnavailable: Boolean(weatherError || !current),
      }),
    [current, weatherContext, weatherError],
  );
  const planCode = entitlementsLoading || !entitlements
    ? null
    : (entitlements?.effectivePlanCode ?? "free");
  const isPaidPlan = planCode !== null && !isFreePlan(planCode);
  const isFreeMember = planCode === 'free';

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OUTFIT_HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const signatures = parsed.filter(
        (entry): entry is string => typeof entry === "string",
      );
      setRecentOutfitSignatures(signatures.slice(-OUTFIT_HISTORY_LIMIT));
    } catch (error) {
      logger.warn("Failed to load outfit history:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        OUTFIT_HISTORY_STORAGE_KEY,
        JSON.stringify(recentOutfitSignatures.slice(-OUTFIT_HISTORY_LIMIT)),
      );
    } catch (error) {
      logger.warn("Failed to persist outfit history:", error);
    }
  }, [recentOutfitSignatures]);

  const rememberOutfitSignature = useCallback((outfit: GeneratedOutfit) => {
    const signature = getOutfitSignature(outfit);
    setRecentOutfitSignatures((prev) => {
      const withoutDup = prev.filter((value) => value !== signature);
      return [...withoutDup, signature].slice(-OUTFIT_HISTORY_LIMIT);
    });
  }, []);

  const knownSignatures = useMemo(() => {
    const set = new Set(recentOutfitSignatures);
    for (const signature of savedSignatures) set.add(signature);
    for (const look of Object.values(paidLooks)) {
      if (look) set.add(getOutfitSignature(look));
    }
    if (freeOutfit) set.add(getOutfitSignature(freeOutfit));
    return set;
  }, [recentOutfitSignatures, savedSignatures, paidLooks, freeOutfit]);

  const loadSavedOutfitSignatures = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("outfits")
        .select("id, outfit_items(item_id)");
      const signatures = new Set<string>();
      for (const outfit of data || []) {
        const itemIds = (
          (outfit.outfit_items as Array<{ item_id: string }> | null) || []
        ).map((row) => row.item_id);
        if (itemIds.length > 0) signatures.add(toItemSetSignature(itemIds));
      }
      setSavedSignatures(signatures);
    } catch (error) {
      logger.warn("Failed loading saved outfit signatures", error);
    }
  }, []);

  useEffect(() => {
    loadSavedOutfitSignatures().catch(() => undefined);
  }, [loadSavedOutfitSignatures]);

  const generateLook = useCallback(
    (
      look: LookConfig,
      excludeItems: string[],
      nonce: number,
    ): GeneratedOutfit | null => {
      if (!weatherContext) return null;

      let bestUnseen: GeneratedOutfit | null = null;
      let bestUnseenScore = -1;
      let bestOverall: GeneratedOutfit | null = null;
      let bestOverallScore = -1;

      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const outfit = regenerateOutfit({
          wardrobeItems,
          weatherContext,
          excludeItems,
          preferredFormalityBand: look.preferredFormalityBand,
          preferredFormalityRange: look.preferredFormalityRange,
          variationSeed: `today:${look.id}:${todayDateKey()}:${nonce}:${attempt}`,
          explorationLevel: EXPLORATION_LEVEL,
        });
        const score = outfit.scores.overall.total;
        const signature = getOutfitSignature(outfit);

        if (score > bestOverallScore) {
          bestOverall = outfit;
          bestOverallScore = score;
        }
        if (!knownSignatures.has(signature) && score > bestUnseenScore) {
          bestUnseen = outfit;
          bestUnseenScore = score;
        }
      }

      return bestUnseen ?? bestOverall;
    },
    [knownSignatures, wardrobeItems, weatherContext],
  );

  useEffect(() => {
    if (!weatherContext || !requiredCategoriesAvailable || entitlementsLoading)
      return;
    if (isPaidPlan) return;
    if (freeOutfit) return;

    const outfit = generateLook(FREE_TODAY_LOOK, [], generationNonce + 1);
    if (!outfit) return;
    setFreeOutfit(outfit);
    rememberOutfitSignature(outfit);
    setGenerationNonce((prev) => prev + 1);
  }, [
    weatherContext,
    requiredCategoriesAvailable,
    entitlementsLoading,
    isPaidPlan,
    freeOutfit,
    generateLook,
    generationNonce,
    rememberOutfitSignature,
  ]);

  useEffect(() => {
    if (!weatherContext || !requiredCategoriesAvailable || entitlementsLoading)
      return;
    if (!isPaidPlan) return;
    const hasAny = LOOK_CONFIGS.some((cfg) => paidLooks[cfg.id]);
    if (hasAny) return;

    const nextNonce = generationNonce + 1;
    const nextLooks = { ...paidLooks };
    const nextExclude = new Set<string>();

    for (const look of LOOK_CONFIGS) {
      const generated = generateLook(look, Array.from(nextExclude), nextNonce);
      if (!generated) continue;
      nextLooks[look.id] = generated;
      generated.itemIds.forEach((itemId) => nextExclude.add(itemId));
      rememberOutfitSignature(generated);
    }

    setPaidLooks(nextLooks);
    setGenerationNonce(nextNonce);
  }, [
    weatherContext,
    requiredCategoriesAvailable,
    entitlementsLoading,
    isPaidPlan,
    paidLooks,
    generationNonce,
    generateLook,
    rememberOutfitSignature,
  ]);

  const loadTodayAiState = useCallback(async () => {
    setAiLoading(true);
    try {
      const response = await fetch("/api/today/ai-outfit", { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load AI outfit");
      }
      const payload = (await response.json()) as TodayAiApiResponse;
      setTodayAi(payload.todayAiOutfit || null);
      setAiUsage(payload.usage);
      setAiOptions(payload.options);

      if (!selectionHydratedRef.current) {
        const persisted = payload.todayAiOutfit;
        if (persisted) {
          setEventType(persisted.eventType || "Work Day");
          setStylePreset(persisted.stylePreset || "Smart Casual");
          setStyleCustom(persisted.styleCustom || "");
          setFormality(persisted.formality || "smart");
        } else {
          if (payload.options.eventPresets.length > 0)
            setEventType(payload.options.eventPresets[0] || "Work Day");
          if (payload.options.stylePresets.length > 0)
            setStylePreset(payload.options.stylePresets[0] || "Smart Casual");
        }
        selectionHydratedRef.current = true;
      }
    } catch (error) {
      logger.warn("Failed loading today ai state", error);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayAiState().catch(() => undefined);
  }, [loadTodayAiState]);

  const generateAiLook = useCallback(
    async (method: "POST" | "PATCH") => {
      if (!weatherContext || aiLock.current) return;
      aiLock.current = true;
      setAiGenerating(true);
      setAiError(null);
      try {
        const currentTodaySignatures = [
          ...Object.values(paidLooks)
            .filter(Boolean)
            .map((outfit) => getOutfitSignature(outfit as GeneratedOutfit)),
          ...(freeOutfit ? [getOutfitSignature(freeOutfit)] : []),
        ];

        const newBody = JSON.stringify({
          requestId: crypto.randomUUID(),
          eventType,
          stylePreset,
          styleCustom: styleCustom.trim() || null,
          formality,
          weather: weatherContext,
          currentTodaySignatures,
          regenerateToken: crypto.randomUUID(),
        });
        const intent = aiRequestRef.current || { body: newBody, method };
        aiRequestRef.current = intent;
        const write = () =>
          fetch("/api/today/ai-outfit", {
            method: intent.method,
            headers: { "Content-Type": "application/json" },
            body: intent.body,
          });
        let response = await write();
        let payload = (await response.json()) as {
          error?: string;
          code?: string;
          todayAiOutfit?: TodayAiState | null;
          pending?: boolean;
          jobId?: string;
        };
        if (payload.pending && payload.jobId) {
          for (let attempt = 0; attempt < 90; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const statusResponse = await fetch(
              `/api/ai/jobs/${payload.jobId}`,
              { cache: "no-store" },
            );
            if (!statusResponse.ok)
              throw new Error(
                "Could not check this request. Retry to resume it.",
              );
            const status = await statusResponse.json();
            if (status.status === "failed")
              throw new Error("The AI request could not be completed.");
            if (status.status === "succeeded") {
              response = await write();
              payload = await response.json();
              break;
            }
          }
          if (payload.pending)
            throw new Error(
              "Your request is still running. Retry to check it without starting a new generation.",
            );
        }
        if (!response.ok) {
          if (payload.code === "TRIAL_LIMIT_EXCEEDED") {
            setAiError("Free trial used. Upgrade to Plus or Pro to continue.");
            return;
          }
          throw new Error(payload.error || "Failed to generate AI outfit");
        }

        aiRequestRef.current = null;
        setTodayAi(payload.todayAiOutfit || null);
        setAiFormOpen(false);
        await loadSavedOutfitSignatures();
        await loadTodayAiState();
      } catch (error) {
        setAiError(
          error instanceof Error
            ? error.message
            : "Failed to generate AI outfit",
        );
      } finally {
        aiLock.current = false;
        setAiGenerating(false);
      }
    },
    [
      weatherContext,
      paidLooks,
      freeOutfit,
      eventType,
      stylePreset,
      styleCustom,
      formality,
      loadSavedOutfitSignatures,
      loadTodayAiState,
    ],
  );

  const markLookDirty = useCallback((key: string) => {
    setSavedLookKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setSaveFeedbackByKey((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const saveAiOutfit = useCallback(async () => {
    if (aiOutfitSaved || aiSaving) return;
    setAiSaving(true);
    setSaveError(null);
    try {
      const result = await markTodayAiOutfitSaved();
      if (!result.success)
        throw new Error(result.error || "Failed to save AI outfit");
      setAiOutfitSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save AI outfit",
      );
    } finally {
      setAiSaving(false);
    }
  }, [aiOutfitSaved, aiSaving]);

  const saveLook = useCallback(
    async (key: string, outfit: GeneratedOutfit, name: string) => {
      if (savingKey || savedLookKeys.has(key)) return;
      setSavingKey(key);
      setSaveFeedbackByKey((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSaveError(null);

      try {
        const itemIds = outfit.itemIds;
        const supabase = createClient();
        const duplicateCheck = await supabase.functions.invoke(
          "check-outfit-duplicate",
          {
            body: { item_ids: itemIds },
          },
        );

        if (duplicateCheck.data?.is_duplicate) {
          throw new Error("This outfit already exists in your saved outfits.");
        }

        const result = await createOutfit({
          name,
          source: "generated",
          items: itemIds,
          score: Math.round(outfit.scores.overall.total * 100),
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to save outfit");
        }

        setSavedLookKeys((prev) => new Set(prev).add(key));
        setSaveFeedbackByKey((prev) => ({ ...prev, [key]: `Saved ${name}` }));
        await loadSavedOutfitSignatures();
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Failed to save outfit",
        );
      } finally {
        setSavingKey(null);
      }
    },
    [loadSavedOutfitSignatures, savedLookKeys, savingKey],
  );

  const regenerateFree = useCallback(() => {
    if (!weatherContext || !freeOutfit) return;
    setGeneratingLookId("free");
    try {
      const generated = generateLook(
        FREE_TODAY_LOOK,
        freeOutfit.itemIds,
        generationNonce + 1,
      );
      if (!generated) {
        setSaveError("Could not find a unique outfit right now. Try again.");
        return;
      }
      setFreeOutfit(generated);
      markLookDirty("free");
      rememberOutfitSignature(generated);
      setGenerationNonce((prev) => prev + 1);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to regenerate outfit",
      );
    } finally {
      setGeneratingLookId(null);
    }
  }, [
    weatherContext,
    freeOutfit,
    generationNonce,
    generateLook,
    markLookDirty,
    rememberOutfitSignature,
  ]);

  const swapFreeItem = useCallback(
    (item: WardrobeItem) => {
      if (!weatherContext || !freeOutfit) return;
      const slot = CATEGORY_TO_SLOT[item.category?.name || ""];
      if (!slot) return;
      try {
        const swapped = swapItem({
          currentOutfit: freeOutfit,
          category: slot,
          wardrobeItems,
          weatherContext,
        });
        setFreeOutfit(swapped);
        markLookDirty("free");
        rememberOutfitSignature(swapped);
      } catch (error) {
        logger.warn("Swap failed", error);
      }
    },
    [
      freeOutfit,
      markLookDirty,
      rememberOutfitSignature,
      wardrobeItems,
      weatherContext,
    ],
  );

  const regeneratePaidLook = useCallback(
    (look: LookConfig) => {
      if (!weatherContext) return;
      setGeneratingLookId(look.id);
      try {
        const current = paidLooks[look.id];
        const excludeItems = [
          ...(current?.itemIds || []),
          ...Object.values(paidLooks)
            .filter(Boolean)
            .flatMap((outfit) => (outfit as GeneratedOutfit).itemIds),
        ];
        const generated = generateLook(look, excludeItems, generationNonce + 1);
        if (!generated) return;
        setPaidLooks((prev) => ({ ...prev, [look.id]: generated }));
        markLookDirty(look.id);
        rememberOutfitSignature(generated);
        setGenerationNonce((prev) => prev + 1);
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Failed to regenerate look",
        );
      } finally {
        setGeneratingLookId(null);
      }
    },
    [
      weatherContext,
      paidLooks,
      generateLook,
      generationNonce,
      markLookDirty,
      rememberOutfitSignature,
    ],
  );

  const swapPaidItem = useCallback(
    (lookId: LookConfig["id"], item: WardrobeItem) => {
      if (!weatherContext) return;
      const current = paidLooks[lookId];
      if (!current) return;
      const slot = CATEGORY_TO_SLOT[item.category?.name || ""];
      if (!slot) return;
      try {
        const swapped = swapItem({
          currentOutfit: current,
          category: slot,
          wardrobeItems,
          weatherContext,
        });
        setPaidLooks((prev) => ({ ...prev, [lookId]: swapped }));
        markLookDirty(lookId);
        rememberOutfitSignature(swapped);
      } catch (error) {
        logger.warn("Swap failed", error);
      }
    },
    [
      markLookDirty,
      paidLooks,
      weatherContext,
      wardrobeItems,
      rememberOutfitSignature,
    ],
  );

  const canUseFreeTrial =
    (aiUsage?.trialUsed || 0) < (aiUsage?.trialLimit || 1);
  const wardrobeById = useMemo(() => {
    const map = new Map<string, WardrobeItem>();
    for (const item of wardrobeItems) {
      map.set(item.id, item);
    }
    return map;
  }, [wardrobeItems]);

  const aiOutfitItems = useMemo(() => {
    const rows = todayAi?.outfit?.outfit_items || [];
    const mapped = rows
      .map((row) => {
        const itemId = row.item_id;
        if (!itemId) return row.wardrobe_items || null;
        return wardrobeById.get(itemId) || row.wardrobe_items || null;
      })
      .filter(Boolean) as WardrobeItem[];

    // De-dupe by item id in case embedded rows contain repeated objects.
    const seen = new Set<string>();
    const deduped: WardrobeItem[] = [];
    for (const item of mapped) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
    }
    return deduped;
  }, [todayAi, wardrobeById]);
  const shouldShowAiForm = !todayAi || aiFormOpen;
  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] px-[22px] py-[11px] text-[0.82rem] font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-accent)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:-translate-y-px hover:shadow-[var(--shadow-accent-hover)] active:translate-y-0 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-[16px] py-[9px] text-[0.79rem] font-medium text-[var(--text-2)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-1)] active:bg-[var(--bg-surface-active)] disabled:cursor-not-allowed disabled:opacity-50";

  const usageLabel = isPaidPlan
    ? `Monthly ${aiUsage?.monthlyUsed || 0}/${aiUsage?.monthlyLimit ?? "∞"}`
    : `Free trial ${aiUsage?.trialUsed || 0}/${aiUsage?.trialLimit || 1}`;

  if (!requiredCategoriesAvailable) {
    return (
      <div className="page-shell-content">
        <h1 className="mb-6 font-display text-4xl font-normal tracking-[-0.03em] text-foreground">
          Today&apos;s Outfit
        </h1>
        <div className="glass-surface p-10 text-center">
          <p className="mb-4 text-lg text-muted-foreground">
            Add a top, bottoms, and shoes—or a dress and shoes—to see your first
            outfit.
          </p>
          <Link href="/wardrobe" className="text-primary hover:underline">
            Add items to your wardrobe →
          </Link>
        </div>
      </div>
    );
  }

  const look =
    LOOK_CONFIGS.find((config) => config.id === selectedLook) ||
    FREE_TODAY_LOOK;
  const outfit = isPaidPlan ? paidLooks[look.id] : freeOutfit;
  const items = outfit
    ? (Object.values(outfit.items).filter(Boolean) as WardrobeItem[])
    : [];
  const key = isPaidPlan ? look.id : "free";
  const descriptions = {
    "easy-day": ["Everyday", "Relaxed and easy to wear"],
    "elevated-daily": ["Work", "A little more put together"],
    "evening-polish": ["Going out", "A polished evening look"],
  };
  const worn =
    items.length > 0 &&
    (calendar.data?.entries || []).some(
      (entry) =>
        entry.entry_date === localDateKey(new Date()) &&
        entry.status === "worn" &&
        toItemSetSignature((entry.items || []).map((item) => item.id)) ===
          toItemSetSignature(items.map((item) => item.id)),
    );
  const markWorn = async () => {
    if (wearLock.current || worn || !outfit) return;
    wearLock.current = true;
    setWearFeedback("");
    try {
      const intentKey = `wear-today:${localDateKey(new Date())}:${toItemSetSignature(items.map((item) => item.id))}`;
      const requestId =
        sessionStorage.getItem(intentKey) || crypto.randomUUID();
      sessionStorage.setItem(intentKey, requestId);
      await createCalendarEntry.mutateAsync({
        request_id: requestId,
        entry_date: localDateKey(new Date()),
        status: "worn",
        item_ids: items.map((item) => item.id),
        notes: "Today’s outfit",
      });
      setWearFeedback("Added to your wear history.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not record this outfit.",
      );
    } finally {
      wearLock.current = false;
    }
  };
  return (
    <div className="page-shell-content">
      <div className="today-introduction">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            {hydrated ? formatDateInTimeZone(now, timezone) : "Your day"}
          </p>
          <h1 className="font-display text-[clamp(1.8rem,3vw,2.5rem)] leading-tight">
            {hydrated ? (
              <>
                Good{" "}
                <span className="italic text-primary">{greeting.period}</span>
              </>
            ) : (
              "Hello"
            )}
            {userName?.trim() ? `, ${userName.trim()}` : ""}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Let’s find what to wear today. Start with a look, then make it
            yours.
          </p>
        </div>
        <button
          className={secondaryButtonClass}
          disabled={!outfit || generatingLookId !== null}
          onClick={() =>
            isPaidPlan ? regeneratePaidLook(look) : regenerateFree()
          }
        >
          <RefreshCw size={15} />
          See another {descriptions[look.id][0].toLowerCase()} look
        </button>
      </div>
      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      <div className="today-main-layout">
        <section className="today-outfit-card" aria-label="Suggested outfit">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 text-xs">
            <span>Suggested from your wardrobe</span>
            <span className="text-primary">
              {isPaidPlan ? descriptions[look.id][0] : "Your daily look"}
            </span>
          </div>
          {outfit ? (
            <div className="p-4 sm:p-5">
              <OutfitComposition
                items={items}
                onSwap={(item) =>
                  isPaidPlan ? swapPaidItem(look.id, item) : swapFreeItem(item)
                }
              />
            </div>
          ) : (
            <div className="min-h-80 space-y-4 p-5">
              <LoadingStatus label={weatherLoading ? "the weather for your outfit" : "your outfit"} />
              <div className="grid h-64 grid-cols-2 gap-4" aria-hidden="true">
                <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-20 w-full" /></div>
                <Skeleton className="h-full w-full" />
              </div>
            </div>
          )}
          <div className="border-t border-border p-5">
            <h2 className="font-display text-2xl">
              {isPaidPlan
                ? `Your ${descriptions[look.id][0].toLowerCase()} look`
                : "An outfit for your day"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {items.map((item) => item.name).join(" · ")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className={`${primaryButtonClass} flex-1`}
                disabled={!outfit || worn || createCalendarEntry.isPending}
                onClick={() => void markWorn()}
              >
                {worn
                  ? "✓ Worn today"
                  : createCalendarEntry.isPending
                    ? "Recording…"
                    : "Wear this today"}
              </button>
              <button
                className={secondaryButtonClass}
                disabled={
                  !outfit || savingKey !== null || savedLookKeys.has(key)
                }
                onClick={() =>
                  outfit && saveLook(key, outfit, descriptions[look.id][0])
                }
              >
                <Save size={15} />
                {savedLookKeys.has(key) ? "Saved" : "Save outfit"}
              </button>
              <Link className={secondaryButtonClass} href="/calendar">
                Plan for later
              </Link>
            </div>
            {(wearFeedback || saveFeedbackByKey[key]) && (
              <p role="status" className="mt-3 text-sm text-primary">
                {wearFeedback || saveFeedbackByKey[key]}
              </p>
            )}
            {outfit && (
              <details className="mt-4 text-xs text-muted-foreground">
                <summary className="cursor-pointer py-2">
                  Why this works · {items.length} pieces
                </summary>
                <p className="mt-2">{stylingTip}</p>
                <p className="mt-2">
                  Outfit score: {Math.round(outfit.scores.overall.total * 100)}{" "}
                  / 100. Swap a piece to explore another combination.
                </p>
              </details>
            )}
          </div>
        </section>
        <aside className="today-options">
          <h2 className="font-display text-2xl">Choose a look for your day</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select an occasion to see a different outfit.
          </p>
          <div
            className="mt-4 grid gap-2"
            aria-label="Choose an outfit occasion"
          >
            {LOOK_CONFIGS.map((config) => {
              const preview = paidLooks[config.id];
              const previewItems = preview
                ? (Object.values(preview.items).filter(
                    Boolean,
                  ) as WardrobeItem[])
                : [];
              return (
                <button
                  key={config.id}
                  type="button"
                  className="today-occasion"
                  aria-pressed={selectedLook === config.id}
                  onClick={() => {
                    if (isPaidPlan || config.id === FREE_TODAY_LOOK.id) {
                      setSelectedLook(config.id);
                      setWearFeedback("");
                    } else {
                      setUpgradeFeature(config.id === "easy-day" ? "everyday-look" : "evening-look");
                    }
                  }}
                  data-locked={isFreeMember && config.id !== FREE_TODAY_LOOK.id}
                  disabled={entitlementsLoading || !entitlements}
                >
                  <div className="flex-1">
                    <strong className="block text-sm">
                      Show{" "}
                      {config.id === "easy-day"
                        ? "an everyday"
                        : config.id === "elevated-daily"
                          ? "a work"
                          : "a going-out"}{" "}
                      look
                    </strong>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {descriptions[config.id][1]}
                    </span>
                  </div>
                  {isFreeMember && config.id !== FREE_TODAY_LOOK.id && <span className="occasion-lock"><span><LockKeyhole size={12} aria-hidden="true" /> Plus & Pro</span><small>View benefits <ArrowUpRight size={12} aria-hidden="true" /></small></span>}
                  {previewItems.length > 0 && (
                    <OutfitThumbnails
                      items={previewItems}
                      className="w-24 shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {membershipError && !entitlements && <div className="mt-3 space-y-2 text-sm"><p role="alert">Your membership could not be checked. Try again to see your available looks.</p><button className="text-primary underline" onClick={() => void retryMembership()}>Check membership again</button></div>}
          {isFreeMember && (
            <Link
              href="/settings/billing"
              className="mt-3 inline-block text-xs text-primary"
            >
              Explore more daily looks with Plus and Pro ↗
            </Link>
          )}
          <AppDialog open={upgradeFeature !== null} onClose={() => setUpgradeFeature(null)} title="More looks for your plans">
            {upgradeFeature && <UpgradePrompt feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} />}
          </AppDialog>
          <p className="my-5 border-y border-border py-4 text-sm text-muted-foreground">
            {current && weatherEnabled
              ? stylingTip
              : "Made from pieces you own. No shopping needed for this look."}
          </p>
          <div className="py-2">
            <h3 className="font-display text-xl">Ask Sebastian</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Talk through this outfit or ask for a change.
            </p>
            <AskSebastian
              prompt={`Help me refine this outfit: ${items.map((item) => item.name).join(", ")}. I’m dressing for ${descriptions[look.id][0].toLowerCase()}.`}
            >
              Make this look work for me
            </AskSebastian>
          </div>
        </aside>
      </div>
      <TodayUpcoming />
      <details
        className="mt-7 rounded-xl border border-border p-4"
        open={aiFormOpen || !!todayAi}
      >
        <summary className="cursor-pointer text-sm font-medium">
          Create a tailored AI outfit{" "}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {usageLabel}
          </span>
        </summary>
        <p className="my-3 text-sm text-muted-foreground">
          Choose a specific event, style, and level of formality.
        </p>
        {aiError && (
          <p role="alert" className="my-3 text-sm text-destructive">
            {aiError}
          </p>
        )}
        <article
          className="glass-surface card-glow-green flex h-full flex-col gap-4 p-5"
          style={{
            backdropFilter: "blur(var(--blur-glass))",
            WebkitBackdropFilter: "blur(var(--blur-glass))",
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--accent)_12%,transparent)] bg-[linear-gradient(135deg,var(--accent-muted),var(--accent-3-muted))]">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <h2 className="font-display text-[1.2rem] font-normal tracking-[-0.02em] text-[var(--text-1)]">
                Create a tailored look
              </h2>
            </div>
            <div>
              <p className="text-sm text-[var(--text-2)]">
                Generate a one-off look from your wardrobe for today.
              </p>
            </div>
          </div>

          {aiGenerating || aiLoading ? (
            <div className="flex min-h-[240px] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-2)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {todayAi ? "Regenerating AI outfit..." : "Loading AI state..."}
            </div>
          ) : !shouldShowAiForm && todayAi && aiOutfitItems.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="min-h-[240px] flex-1">
                <OutfitGridLayout
                  items={aiOutfitItems}
                  showLabels
                  previewVariant="bare"
                />
              </div>
              {todayAi.explanation && (
                <p className="line-clamp-3 text-sm leading-5 text-[var(--text-2)]">
                  {todayAi.explanation}
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">
                    Occasion
                  </span>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)]"
                  >
                    {(
                      aiOptions?.eventPresets || [
                        "Work Day",
                        "Date Night",
                        "Social Event",
                      ]
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">
                    Style
                  </span>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)]"
                  >
                    {(
                      aiOptions?.stylePresets || [
                        "Smart Casual",
                        "Ivy",
                        "Minimal",
                      ]
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">
                    Formality
                  </span>
                  <select
                    value={formality}
                    onChange={(e) =>
                      setFormality(
                        e.target.value as "casual" | "smart" | "formal",
                      )
                    }
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)]"
                  >
                    <option value="casual">Casual</option>
                    <option value="smart">Smart</option>
                    <option value="formal">Formal</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">
                    Optional style direction
                  </span>
                  <input
                    value={styleCustom}
                    onChange={(e) => setStyleCustom(e.target.value)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)]"
                    placeholder="Add a detail like 'more polished' or 'keep it minimal'"
                  />
                </label>
              </div>
              {!todayAi && (
                <p className="text-sm text-[var(--text-2)]">
                  Fill out your preferences and generate an AI look for today.
                </p>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {!aiGenerating &&
              !shouldShowAiForm &&
              todayAi &&
              !aiOutfitSaved && (
                <button
                  className={secondaryButtonClass}
                  disabled={aiSaving}
                  onClick={saveAiOutfit}
                >
                  <Save className="h-4 w-4" />
                  <span>{aiSaving ? "Saving…" : "Save"}</span>
                </button>
              )}

            {!aiGenerating && !shouldShowAiForm && todayAi && (
              <button
                className={secondaryButtonClass}
                onClick={() => {
                  setAiFormOpen(true);
                  setAiOutfitSaved(false);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Regenerate</span>
              </button>
            )}

            {(shouldShowAiForm || !todayAi) && (
              <div className="flex w-full flex-col items-center gap-2">
                <button
                  className={`${primaryButtonClass} w-full`}
                  disabled={aiGenerating || entitlementsLoading || !entitlements}
                  onClick={() => {
                    if (!isPaidPlan && !canUseFreeTrial) setUpgradeFeature('today-ai');
                    else void generateAiLook(todayAi ? "PATCH" : "POST");
                  }}
                >
                  {isPaidPlan || canUseFreeTrial
                    ? todayAi
                      ? "Regenerate"
                      : "Generate"
                    : "Upgrade for AI"}
                </button>
                <p className="text-center text-[0.72rem] text-[var(--text-3)]">
                  {usageLabel}
                </p>
              </div>
            )}

            {!isPaidPlan && !canUseFreeTrial && (
              <Link href="/settings/billing" className={secondaryButtonClass}>
                View plans
              </Link>
            )}

            {todayAi && shouldShowAiForm && !aiGenerating && (
              <button
                className={secondaryButtonClass}
                onClick={() => setAiFormOpen(false)}
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </article>
      </details>
    </div>
  );
}

function todayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

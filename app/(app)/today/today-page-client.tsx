'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, Cloud, CloudRain, CloudSnow, CloudSun, Loader2, RefreshCw, Save, Sparkles, Sun, X } from 'lucide-react';
import { WardrobeItem } from '@/lib/types/database';
import { useWeather } from '@/lib/hooks/use-weather';
import { normalizeWeatherContext } from '@/lib/utils/weather-normalization';
import { regenerateOutfit, swapItem } from '@/lib/services/outfit-generator';
import { GeneratedOutfit, WeatherContext } from '@/lib/types/generation';
import { createOutfit } from '@/lib/actions/outfits';
import { markTodayAiOutfitSaved } from '@/lib/actions/today';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OutfitGridLayout } from '@/components/outfit-grid-layout';
import { useBillingEntitlements } from '@/lib/hooks/use-billing-entitlements';
import { createClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/utils/logger';
import { isFreePlan } from '@/lib/services/billing/plan-labels';
import { getGreetingCopy, getTodayStylingTip } from '@/lib/services/today/presentation';
import { hasCompleteOutfitItems } from '@/lib/utils/outfit-coverage';

const logger = createLogger({ component: 'app-today-today-page-client' });

interface TodayPageClientProps {
  wardrobeItems: WardrobeItem[];
  userName?: string | null;
}

interface LookConfig {
  id: 'easy-day' | 'elevated-daily' | 'evening-polish';
  label: string;
  preferredFormalityBand: 'casual' | 'smart-casual' | 'refined';
  preferredFormalityRange: { min: number; max: number };
}

interface TodayAiState {
  id: string;
  eventType: string;
  stylePreset: string;
  styleCustom?: string | null;
  formality: 'casual' | 'smart' | 'formal';
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
    planCode: 'free' | 'plus' | 'pro';
    canUsePaid: boolean;
  };
  options: {
    eventPresets: readonly string[];
    stylePresets: readonly string[];
  };
}

const LOOK_CONFIGS: LookConfig[] = [
  {
    id: 'easy-day',
    label: 'Easy Day',
    preferredFormalityBand: 'casual',
    preferredFormalityRange: { min: 1, max: 4 },
  },
  {
    id: 'elevated-daily',
    label: 'Elevated Daily',
    preferredFormalityBand: 'smart-casual',
    preferredFormalityRange: { min: 4, max: 7 },
  },
  {
    id: 'evening-polish',
    label: 'Evening Polish',
    preferredFormalityBand: 'refined',
    preferredFormalityRange: { min: 7, max: 10 },
  },
];
const FREE_TODAY_LOOK: LookConfig = LOOK_CONFIGS[1];

const OUTFIT_HISTORY_STORAGE_KEY = 'today-outfit-signatures-v2';
const OUTFIT_HISTORY_LIMIT = 60;
const MAX_GENERATION_ATTEMPTS = 20;
const EXPLORATION_LEVEL = 0.7;

const CATEGORY_TO_SLOT: Record<string, string> = {
  jacket: 'jacket',
  overshirt: 'overshirt',
  shirt: 'shirt',
  undershirt: 'undershirt',
  pants: 'pants',
  shoes: 'shoes',
  belt: 'belt',
  watch: 'watch',
  Jacket: 'jacket',
  Overshirt: 'overshirt',
  Shirt: 'shirt',
  Undershirt: 'undershirt',
  Pants: 'pants',
  Shoes: 'shoes',
  Belt: 'belt',
  Watch: 'watch',
};

function getWeatherIcon(condition: string) {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return CloudRain;
  }
  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) {
    return CloudSnow;
  }
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return Cloud;
  }
  if (lowerCondition.includes('partly') || lowerCondition.includes('scattered')) {
    return CloudSun;
  }
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {
    return Sun;
  }

  return Cloud;
}

function formatDateInTimeZone(date: Date, timezone?: string | null) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  }).format(date);
}

function getHourInTimeZone(date: Date, timezone?: string | null) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    ...(timezone ? { timeZone: timezone } : {}),
  }).format(date);

  return Number.parseInt(formatted, 10);
}

function getBadgeLabel(look: LookConfig) {
  if (look.preferredFormalityBand === 'casual') return 'Casual';
  if (look.preferredFormalityBand === 'refined') return 'Refined';
  return 'Smart';
}

function getBadgeClass(look: LookConfig) {
  if (look.preferredFormalityBand === 'casual') {
    return 'border border-[color-mix(in_srgb,var(--accent)_15%,transparent)] bg-[var(--accent-muted)] text-[var(--accent)]';
  }
  if (look.preferredFormalityBand === 'refined') {
    return 'border border-[color-mix(in_srgb,var(--accent-3)_15%,transparent)] bg-[var(--accent-3-muted)] text-[var(--accent-3)]';
  }
  return 'border border-[color-mix(in_srgb,var(--accent-2)_15%,transparent)] bg-[var(--accent-2-muted)] text-[var(--accent-2)]';
}

function getOutfitSignature(outfit: GeneratedOutfit): string {
  return Object.entries(outfit.items)
    .filter(([, item]) => Boolean(item?.id))
    .map(([slot, item]) => `${slot}:${item!.id}`)
    .sort()
    .join('|');
}

function toItemSetSignature(itemIds: string[]): string {
  return [...itemIds].sort().join('|');
}

function hasRequiredCategories(items: WardrobeItem[]): boolean {
  return hasCompleteOutfitItems(items);
}

export default function TodayPageClient({ wardrobeItems, userName }: TodayPageClientProps) {
  const { current, forecast, loading: weatherLoading, error: weatherError, locationLabel, timezone } = useWeather(true);
  const { entitlements, loading: entitlementsLoading } = useBillingEntitlements(true);
  const [freeOutfit, setFreeOutfit] = useState<GeneratedOutfit | null>(null);
  const [paidLooks, setPaidLooks] = useState<Record<LookConfig['id'], GeneratedOutfit | null>>({
    'easy-day': null,
    'elevated-daily': null,
    'evening-polish': null,
  });
  const [recentOutfitSignatures, setRecentOutfitSignatures] = useState<string[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<Set<string>>(new Set());
  const [generationNonce, setGenerationNonce] = useState(0);
  const [generatingLookId, setGeneratingLookId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedLookKeys, setSavedLookKeys] = useState<Set<string>>(new Set());
  const [saveFeedbackByKey, setSaveFeedbackByKey] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [todayAi, setTodayAi] = useState<TodayAiState | null>(null);
  const [aiUsage, setAiUsage] = useState<TodayAiApiResponse['usage'] | null>(null);
  const [aiOptions, setAiOptions] = useState<TodayAiApiResponse['options'] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFormOpen, setAiFormOpen] = useState(false);
  const [aiOutfitSaved, setAiOutfitSaved] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [eventType, setEventType] = useState('Work Day');
  const [stylePreset, setStylePreset] = useState('Smart Casual');
  const [styleCustom, setStyleCustom] = useState('');
  const [formality, setFormality] = useState<'casual' | 'smart' | 'formal'>('smart');
  const selectionHydratedRef = useRef(false);

  const weatherContext = useMemo<WeatherContext | null>(() => {
    if (!current || !forecast.length) {
      if (weatherError) {
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
  }, [current, forecast, weatherError]);

  const requiredCategoriesAvailable = useMemo(
    () => hasRequiredCategories(wardrobeItems),
    [wardrobeItems]
  );

  const now = useMemo(() => new Date(), []);
  const greetingDate = useMemo(() => {
    const hour = getHourInTimeZone(now, timezone);
    if (Number.isNaN(hour)) return now;

    const adjusted = new Date(now);
    adjusted.setHours(hour, adjusted.getMinutes(), adjusted.getSeconds(), adjusted.getMilliseconds());
    return adjusted;
  }, [now, timezone]);
  const greeting = useMemo(() => getGreetingCopy(greetingDate, userName), [greetingDate, userName]);
  const dateLine = useMemo(() => {
    const formattedDate = formatDateInTimeZone(now, timezone);
    return locationLabel?.label ? `${formattedDate} · ${locationLabel.label}` : formattedDate;
  }, [locationLabel?.label, now, timezone]);
  const stylingTip = useMemo(
    () => getTodayStylingTip(weatherContext, { weatherUnavailable: Boolean(weatherError || !current) }),
    [current, weatherContext, weatherError]
  );
  const todayForecast = forecast[0];
  const WeatherIcon = getWeatherIcon(current?.condition || 'cloudy');
  const precipitationLine = todayForecast?.precipitationProbability && todayForecast.precipitationProbability > 0
    ? `${Math.round(todayForecast.precipitationProbability * 100)}% rain`
    : 'No rain expected';

  const planCode = entitlementsLoading ? null : (entitlements?.effectivePlanCode ?? 'free');
  const isPaidPlan = planCode !== null && !isFreePlan(planCode);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OUTFIT_HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const signatures = parsed.filter((entry): entry is string => typeof entry === 'string');
      setRecentOutfitSignatures(signatures.slice(-OUTFIT_HISTORY_LIMIT));
    } catch (error) {
      logger.warn('Failed to load outfit history:', error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        OUTFIT_HISTORY_STORAGE_KEY,
        JSON.stringify(recentOutfitSignatures.slice(-OUTFIT_HISTORY_LIMIT))
      );
    } catch (error) {
      logger.warn('Failed to persist outfit history:', error);
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
        .from('outfits')
        .select('id, outfit_items(item_id)');
      const signatures = new Set<string>();
      for (const outfit of data || []) {
        const itemIds = ((outfit.outfit_items as Array<{ item_id: string }> | null) || []).map((row) => row.item_id);
        if (itemIds.length > 0) signatures.add(toItemSetSignature(itemIds));
      }
      setSavedSignatures(signatures);
    } catch (error) {
      logger.warn('Failed loading saved outfit signatures', error);
    }
  }, []);

  useEffect(() => {
    loadSavedOutfitSignatures().catch(() => undefined);
  }, [loadSavedOutfitSignatures]);

  const generateLook = useCallback((
    look: LookConfig,
    excludeItems: string[],
    nonce: number
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
  }, [knownSignatures, wardrobeItems, weatherContext]);

  useEffect(() => {
    if (!weatherContext || !requiredCategoriesAvailable || entitlementsLoading) return;
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
    if (!weatherContext || !requiredCategoriesAvailable || entitlementsLoading) return;
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
      const response = await fetch('/api/today/ai-outfit', { method: 'GET' });
      if (!response.ok) {
        throw new Error('Failed to load AI outfit');
      }
      const payload = await response.json() as TodayAiApiResponse;
      setTodayAi(payload.todayAiOutfit || null);
      setAiUsage(payload.usage);
      setAiOptions(payload.options);

      if (!selectionHydratedRef.current) {
        const persisted = payload.todayAiOutfit;
        if (persisted) {
          setEventType(persisted.eventType || 'Work Day');
          setStylePreset(persisted.stylePreset || 'Smart Casual');
          setStyleCustom(persisted.styleCustom || '');
          setFormality(persisted.formality || 'smart');
        } else {
          if (payload.options.eventPresets.length > 0) setEventType(payload.options.eventPresets[0] || 'Work Day');
          if (payload.options.stylePresets.length > 0) setStylePreset(payload.options.stylePresets[0] || 'Smart Casual');
        }
        selectionHydratedRef.current = true;
      }
    } catch (error) {
      logger.warn('Failed loading today ai state', error);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayAiState().catch(() => undefined);
  }, [loadTodayAiState]);

  const generateAiLook = useCallback(async (method: 'POST' | 'PATCH') => {
    if (!weatherContext) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const currentTodaySignatures = [
        ...Object.values(paidLooks).filter(Boolean).map((outfit) => getOutfitSignature(outfit as GeneratedOutfit)),
        ...(freeOutfit ? [getOutfitSignature(freeOutfit)] : []),
      ];

      const response = await fetch('/api/today/ai-outfit', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          stylePreset,
          styleCustom: styleCustom.trim() || null,
          formality,
          weather: weatherContext,
          currentTodaySignatures,
          regenerateToken: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }),
      });

      const payload = await response.json() as { error?: string; code?: string; todayAiOutfit?: TodayAiState | null };
      if (!response.ok) {
        if (payload.code === 'TRIAL_LIMIT_EXCEEDED') {
          setAiError('Free trial used. Upgrade to Plus or Pro to continue.');
          return;
        }
        throw new Error(payload.error || 'Failed to generate AI outfit');
      }

      setTodayAi(payload.todayAiOutfit || null);
      setAiFormOpen(false);
      await loadSavedOutfitSignatures();
      await loadTodayAiState();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to generate AI outfit');
    } finally {
      setAiGenerating(false);
    }
  }, [
    weatherContext,
    paidLooks,
    freeOutfit,
    eventType,
    stylePreset,
    styleCustom,
    formality,
    loadSavedOutfitSignatures,
    loadTodayAiState,
  ]);

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
      if (!result.success) throw new Error(result.error || 'Failed to save AI outfit');
      setAiOutfitSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save AI outfit');
    } finally {
      setAiSaving(false);
    }
  }, [aiOutfitSaved, aiSaving]);

  const saveLook = useCallback(async (key: string, outfit: GeneratedOutfit, name: string) => {
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
      const duplicateCheck = await supabase.functions.invoke('check-outfit-duplicate', {
        body: { item_ids: itemIds },
      });

      if (duplicateCheck.data?.is_duplicate) {
        throw new Error('This outfit already exists in your saved outfits.');
      }

      const result = await createOutfit({
        name,
        source: 'generated',
        items: itemIds,
        score: Math.round(outfit.scores.overall.total * 100),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save outfit');
      }

      setSavedLookKeys((prev) => new Set(prev).add(key));
      setSaveFeedbackByKey((prev) => ({ ...prev, [key]: `Saved ${name}` }));
      await loadSavedOutfitSignatures();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save outfit');
    } finally {
      setSavingKey(null);
    }
  }, [loadSavedOutfitSignatures, savedLookKeys, savingKey]);

  const regenerateFree = useCallback(() => {
    if (!weatherContext || !freeOutfit) return;
    setGeneratingLookId('free');
    try {
      const generated = generateLook(FREE_TODAY_LOOK, freeOutfit.itemIds, generationNonce + 1);
      if (!generated) {
        setSaveError('Could not find a unique outfit right now. Try again.');
        return;
      }
      setFreeOutfit(generated);
      markLookDirty('free');
      rememberOutfitSignature(generated);
      setGenerationNonce((prev) => prev + 1);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to regenerate outfit');
    } finally {
      setGeneratingLookId(null);
    }
  }, [weatherContext, freeOutfit, generationNonce, generateLook, markLookDirty, rememberOutfitSignature]);

  const swapFreeItem = useCallback((item: WardrobeItem) => {
    if (!weatherContext || !freeOutfit) return;
    const slot = CATEGORY_TO_SLOT[item.category?.name || ''];
    if (!slot) return;
    try {
      const swapped = swapItem({
        currentOutfit: freeOutfit,
        category: slot,
        wardrobeItems,
        weatherContext,
      });
      setFreeOutfit(swapped);
      markLookDirty('free');
      rememberOutfitSignature(swapped);
    } catch (error) {
      logger.warn('Swap failed', error);
    }
  }, [freeOutfit, markLookDirty, rememberOutfitSignature, wardrobeItems, weatherContext]);

  const regeneratePaidLook = useCallback((look: LookConfig) => {
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
      setSaveError(error instanceof Error ? error.message : 'Failed to regenerate look');
    } finally {
      setGeneratingLookId(null);
    }
  }, [weatherContext, paidLooks, generateLook, generationNonce, markLookDirty, rememberOutfitSignature]);

  const swapPaidItem = useCallback((lookId: LookConfig['id'], item: WardrobeItem) => {
    if (!weatherContext) return;
    const current = paidLooks[lookId];
    if (!current) return;
    const slot = CATEGORY_TO_SLOT[item.category?.name || ''];
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
      logger.warn('Swap failed', error);
    }
  }, [markLookDirty, paidLooks, weatherContext, wardrobeItems, rememberOutfitSignature]);

  const canUseFreeTrial = (aiUsage?.trialUsed || 0) < (aiUsage?.trialLimit || 1);
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
  const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] px-[22px] py-[11px] text-[0.82rem] font-semibold text-[var(--text-on-accent)] shadow-[var(--shadow-accent)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:-translate-y-px hover:shadow-[var(--shadow-accent-hover)] active:translate-y-0 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-[16px] py-[9px] text-[0.79rem] font-medium text-[var(--text-2)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-1)] active:bg-[var(--bg-surface-active)] disabled:cursor-not-allowed disabled:opacity-50';
  const tertiaryButtonClass = 'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-transparent bg-transparent px-[12px] py-[6px] text-[0.72rem] font-medium text-[var(--text-2)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-[var(--border-subtle)] hover:bg-[var(--button-tertiary-hover)] hover:text-[var(--text-1)] active:bg-[var(--button-tertiary-active)] disabled:cursor-not-allowed disabled:opacity-50';
  const usageLabel = isPaidPlan
    ? `Monthly ${aiUsage?.monthlyUsed || 0}/${aiUsage?.monthlyLimit ?? '∞'}`
    : `Free trial ${aiUsage?.trialUsed || 0}/${aiUsage?.trialLimit || 1}`;

  if (!requiredCategoriesAvailable) {
    return (
      <div className="page-shell-content">
        <h1 className="mb-6 font-display text-4xl font-normal tracking-[-0.03em] text-foreground">Today&apos;s Outfit</h1>
        <div className="glass-surface p-10 text-center">
          <p className="mb-4 text-lg text-muted-foreground">
            You need at least one Shirt, Pants, and Shoes to generate outfits.
          </p>
          <Link href="/wardrobe" className="text-primary hover:underline">
            Add items to your wardrobe →
          </Link>
        </div>
      </div>
    );
  }

  const renderLookCard = (
    look: LookConfig,
    outfit: GeneratedOutfit | null,
    options: {
      saveKey: string;
      onRegenerate: () => void;
      onSwap: (item: WardrobeItem) => void;
      saveName: string;
    }
  ) => {
    const lookItems = outfit ? Object.values(outfit.items).filter(Boolean) as WardrobeItem[] : [];

    return (
      <article
        key={look.id}
        className="glass-surface flex h-full flex-col gap-4 p-5"
        style={{ backdropFilter: 'blur(var(--blur-glass))', WebkitBackdropFilter: 'blur(var(--blur-glass))' }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <h2 className="font-display text-[1.3rem] font-normal tracking-[-0.02em] text-[var(--text-1)]">
                {look.label}
              </h2>
              <span className={`inline-flex flex-shrink-0 rounded-[var(--radius-pill)] px-2 py-[2px] text-[0.65rem] font-medium uppercase tracking-[0.04em] ${getBadgeClass(look)}`}>
                {getBadgeLabel(look)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1">
            <button
              className={tertiaryButtonClass}
              disabled={!outfit || savingKey === options.saveKey || savedLookKeys.has(options.saveKey)}
              onClick={() => outfit && saveLook(options.saveKey, outfit, options.saveName)}
              aria-label={`Save ${look.label}`}
              style={{ display: savedLookKeys.has(options.saveKey) ? 'none' : 'inline-flex' }}
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
            <button
              className={tertiaryButtonClass}
              disabled={generatingLookId === look.id || !outfit}
              onClick={options.onRegenerate}
              aria-label={`Refresh ${look.label}`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex-1">
          {outfit ? (
            <OutfitGridLayout
              items={lookItems}
              showLabels
              interactive
              previewVariant="bare"
              onItemClick={options.onSwap}
            />
          ) : (
            <div className="flex min-h-[240px] items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-2)]">
              Generating look...
            </div>
          )}
        </div>

        {saveFeedbackByKey[options.saveKey] && (
          <p className="text-sm text-emerald-400">{saveFeedbackByKey[options.saveKey]}</p>
        )}
      </article>
    );
  };

  return (
    <div className="page-shell-content">
      <div
        className="app-section section-delay-1 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)]"
        style={{ backdropFilter: 'blur(var(--blur-glass))', WebkitBackdropFilter: 'blur(var(--blur-glass))' }}
      >
        <div className="md:flex md:items-stretch md:justify-between">
          <div className="min-w-0 flex-1 px-6 py-6">
            <h1
              className="font-display font-normal text-[var(--text-1)]"
              style={{
                fontSize: 'clamp(2.1rem, 3.2vw, 2.5rem)',
                lineHeight: '1.02',
                letterSpacing: '-0.05em',
              }}
            >
              Good{' '}
              <span className="italic text-[var(--accent)]">{greeting.period}</span>
              {userName?.trim() ? `, ${userName.trim()}` : ''}
            </h1>
            <p className="mt-1 text-[0.84rem] text-[var(--text-2)]">{dateLine}</p>
          </div>

          <div className="px-6 py-6 md:w-[420px] md:flex-shrink-0">
            <div className="flex h-full flex-col items-start justify-center gap-2 text-left md:items-end md:justify-center md:text-right">
              <div className="flex flex-wrap items-center gap-1.5 text-[0.84rem] text-[var(--text-2)] [font-variant-numeric:tabular-nums] md:justify-end">
                <WeatherIcon className="h-4 w-4 text-[var(--text-2)]" />
                {weatherLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading weather...
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-[var(--text-1)]">{Math.round(current?.temperature ?? weatherContext?.currentTemp ?? 65)}°F</span>
                    <span>· Feels {Math.round(current?.feelsLike ?? current?.temperature ?? weatherContext?.currentTemp ?? 65)}°</span>
                    <span>· High {Math.round(todayForecast?.temperature.high ?? weatherContext?.highTemp ?? 70)}°</span>
                    <span>· Low {Math.round(todayForecast?.temperature.low ?? weatherContext?.lowTemp ?? 60)}°</span>
                  </>
                )}
              </div>
              <p className="mt-[3px] text-[0.78rem] text-[var(--text-3)]">{precipitationLine}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="app-section section-delay-2 mt-5 space-y-3">
        <div className="flex items-center gap-2 px-1 text-[0.82rem] text-[var(--text-2)]">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)] opacity-80" />
          <p>
            {stylingTip}
            {!weatherLoading && current?.condition ? (
              <span className="text-[var(--text-3)]"> {' '}— {current.condition.toLowerCase()} and steady conditions through the day.</span>
            ) : null}
          </p>
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        {aiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}
        {entitlementsLoading && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your plan features...
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!entitlementsLoading && !isPaidPlan && (
          <div className="app-section section-delay-3">
            {renderLookCard(FREE_TODAY_LOOK, freeOutfit, {
              saveKey: 'free',
              onRegenerate: regenerateFree,
              onSwap: swapFreeItem,
              saveName: `Today's Outfit - ${new Date().toLocaleDateString()}`,
            })}
          </div>
        )}

        {!entitlementsLoading && isPaidPlan && LOOK_CONFIGS.map((look) => (
          <div key={look.id} className="app-section section-delay-3">
            {renderLookCard(look, paidLooks[look.id], {
              saveKey: look.id,
              onRegenerate: () => regeneratePaidLook(look),
              onSwap: (item) => swapPaidItem(look.id, item),
              saveName: `${look.label} - ${new Date().toLocaleDateString()}`,
            })}
          </div>
        ))}

        <div className={`app-section section-delay-4 ${isPaidPlan ? 'xl:col-start-2' : ''}`}>
          <article
            className="glass-surface card-glow-green flex h-full flex-col gap-4 p-5"
            style={{ backdropFilter: 'blur(var(--blur-glass))', WebkitBackdropFilter: 'blur(var(--blur-glass))' }}
          >
            <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--accent)_12%,transparent)] bg-[linear-gradient(135deg,var(--accent-muted),var(--accent-3-muted))]">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <h2 className="font-display text-[1.2rem] font-normal tracking-[-0.02em] text-[var(--text-1)]">AI Outfit</h2>
            </div>
            <div>
              <p className="text-sm text-[var(--text-2)]">Generate a one-off look from your wardrobe for today.</p>
            </div>
            </div>

            {aiGenerating || aiLoading ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-2)]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {todayAi ? 'Regenerating AI outfit...' : 'Loading AI state...'}
              </div>
            ) : !shouldShowAiForm && todayAi && aiOutfitItems.length > 0 ? (
              <div className="space-y-4">
                <OutfitGridLayout items={aiOutfitItems} showLabels previewVariant="bare" />
                {todayAi.explanation && <p className="text-sm text-[var(--text-2)]">{todayAi.explanation}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Occasion</span>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)]"
                    >
                      {(aiOptions?.eventPresets || ['Work Day', 'Date Night', 'Social Event']).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Style</span>
                    <select
                      value={stylePreset}
                      onChange={(e) => setStylePreset(e.target.value)}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)]"
                    >
                      {(aiOptions?.stylePresets || ['Smart Casual', 'Ivy', 'Minimal']).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Formality</span>
                    <select
                      value={formality}
                      onChange={(e) => setFormality(e.target.value as 'casual' | 'smart' | 'formal')}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)]"
                    >
                      <option value="casual">Casual</option>
                      <option value="smart">Smart</option>
                      <option value="formal">Formal</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-[var(--text-3)]">Optional style direction</span>
                    <input
                      value={styleCustom}
                      onChange={(e) => setStyleCustom(e.target.value)}
                      className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)]"
                      placeholder="Add a detail like 'more polished' or 'keep it minimal'"
                    />
                  </label>
                </div>
                {!todayAi && (
                  <p className="text-sm text-[var(--text-2)]">Fill out your preferences and generate an AI look for today.</p>
                )}
              </div>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-2">
            {!aiGenerating && !shouldShowAiForm && todayAi && !aiOutfitSaved && (
              <button className={secondaryButtonClass} disabled={aiSaving} onClick={saveAiOutfit}>
                <Save className="h-4 w-4" />
                <span>{aiSaving ? 'Saving…' : 'Save'}</span>
              </button>
            )}

            {!aiGenerating && !shouldShowAiForm && todayAi && (
              <button
                className={secondaryButtonClass}
                onClick={() => { setAiFormOpen(true); setAiOutfitSaved(false); }}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Regenerate</span>
              </button>
            )}

            {(shouldShowAiForm || !todayAi) && (
              <div className="flex w-full flex-col items-center gap-2">
                <button
                  className={`${primaryButtonClass} w-full`}
                  disabled={aiGenerating || (!isPaidPlan && !canUseFreeTrial)}
                  onClick={() => generateAiLook(todayAi ? 'PATCH' : 'POST')}
                >
                  {isPaidPlan || canUseFreeTrial ? (todayAi ? 'Regenerate' : 'Generate') : 'Upgrade for AI'}
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
              <button className={secondaryButtonClass} onClick={() => setAiFormOpen(false)}>
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function todayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

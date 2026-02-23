'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import { WardrobeItem } from '@/lib/types/database';
import { useWeather } from '@/lib/hooks/use-weather';
import { normalizeWeatherContext } from '@/lib/utils/weather-normalization';
import { regenerateOutfit, swapItem } from '@/lib/services/outfit-generator';
import { GeneratedOutfit, WeatherContext } from '@/lib/types/generation';
import { createOutfit } from '@/lib/actions/outfits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import WeatherSnapshot from '@/components/weather-snapshot';
import { OutfitGridLayout } from '@/components/outfit-grid-layout';
import { useBillingEntitlements } from '@/lib/hooks/use-billing-entitlements';
import { createClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/utils/logger';
import { isFreePlan } from '@/lib/services/billing/plan-labels';

const logger = createLogger({ component: 'app-today-today-page-client' });

interface TodayPageClientProps {
  wardrobeItems: WardrobeItem[];
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
  const categories = new Set(items.map((item) => item.category?.name).filter(Boolean));
  return categories.has('Shirt') && categories.has('Pants') && categories.has('Shoes');
}

export default function TodayPageClient({ wardrobeItems }: TodayPageClientProps) {
  const { current, forecast, loading: weatherLoading, error: weatherError } = useWeather(true);
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

  if (!requiredCategoriesAvailable) {
    return (
      <div className="container mx-auto p-4 pt-24">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Today&apos;s Outfit</h1>
        <div className="text-center py-12">
          <p className="text-lg mb-4 text-muted-foreground">
            You need at least one Shirt, Pants, and Shoes to generate outfits.
          </p>
          <Link href="/wardrobe" className="text-primary hover:underline">
            Add items to your wardrobe →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl pb-32 md:pb-8">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Today&apos;s Outfit</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <div>
          <WeatherSnapshot current={current} forecast={forecast} loading={weatherLoading} error={weatherError} />
          {saveError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
          {aiError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{aiError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-6">
          {entitlementsLoading && (
            <div className="border border-border rounded-xl bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your plan features...
            </div>
          )}

          {!entitlementsLoading && !isPaidPlan && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <article className="border border-border rounded-xl bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Today&apos;s Outfit</h2>
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 text-xs font-medium text-foreground disabled:opacity-50"
                      disabled={!freeOutfit || savingKey === 'free' || savedLookKeys.has('free')}
                      onClick={() => freeOutfit && saveLook('free', freeOutfit, `Today's Outfit - ${new Date().toLocaleDateString()}`)}
                      title="Save this outfit"
                      aria-label="Save this outfit"
                      style={{ visibility: savedLookKeys.has('free') ? 'hidden' : 'visible' }}
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                    <button
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 text-xs font-medium text-foreground disabled:opacity-50"
                      disabled={generatingLookId === 'free' || !freeOutfit}
                      onClick={regenerateFree}
                      title="Regenerate this outfit"
                      aria-label="Regenerate this outfit"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 p-2 bg-background/20">
                  {freeOutfit ? (
                    <OutfitGridLayout
                      items={Object.values(freeOutfit.items).filter(Boolean) as WardrobeItem[]}
                      showLabels
                      interactive
                      onItemClick={swapFreeItem}
                    />
                  ) : (
                    <div className="h-40 rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                      Generating look...
                    </div>
                  )}
                </div>
                <div className="mt-auto grid grid-cols-2 md:hidden items-center gap-2">
                  <button
                    className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-3 text-sm font-medium text-foreground disabled:opacity-50"
                    disabled={!freeOutfit || savingKey === 'free' || savedLookKeys.has('free')}
                    onClick={() => freeOutfit && saveLook('free', freeOutfit, `Today's Outfit - ${new Date().toLocaleDateString()}`)}
                    title="Save this outfit"
                    aria-label="Save this outfit"
                    style={{ display: savedLookKeys.has('free') ? 'none' : 'inline-flex' }}
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                  <button
                    className={`w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-3 text-sm font-medium text-foreground disabled:opacity-50 ${savedLookKeys.has('free') ? 'col-span-2' : ''}`}
                    disabled={generatingLookId === 'free' || !freeOutfit}
                    onClick={regenerateFree}
                    title="Regenerate this outfit"
                    aria-label="Regenerate this outfit"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Regenerate</span>
                  </button>
                </div>
                {saveFeedbackByKey.free && (
                  <p className="text-sm text-emerald-400">{saveFeedbackByKey.free}</p>
                )}
              </article>

              <article className="border border-border rounded-xl bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">AI Outfit</h2>
                  </div>
                  {todayAi && !aiFormOpen && !aiGenerating && (
                    <button
                      className="hidden md:inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 text-xs font-medium text-foreground"
                      onClick={() => setAiFormOpen(true)}
                      title="Regenerate this AI outfit"
                      aria-label="Regenerate this AI outfit"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-border/70 p-2 bg-background/20">
                  {aiGenerating || aiLoading ? (
                    <div className="h-40 rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {todayAi ? 'Regenerating AI outfit...' : 'Loading AI state...'}
                    </div>
                  ) : !shouldShowAiForm && todayAi && aiOutfitItems.length > 0 ? (
                    <OutfitGridLayout items={aiOutfitItems} showLabels />
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Fill out your preferences and generate an AI look for today.
                    </div>
                  )}
                </div>

                {!aiGenerating && !shouldShowAiForm && todayAi?.explanation && (
                  <p className="text-sm text-muted-foreground">{todayAi.explanation}</p>
                )}

                {!aiGenerating && !shouldShowAiForm && todayAi && (
                  <div className="mt-auto grid grid-cols-2 md:hidden items-center gap-2">
                    <button
                      className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-3 text-sm font-medium text-foreground"
                      onClick={() => setAiFormOpen(true)}
                      title="Regenerate this AI outfit"
                      aria-label="Regenerate this AI outfit"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Regenerate</span>
                    </button>
                    <div className="h-9 w-full rounded-md border border-transparent px-2 text-xs text-muted-foreground inline-flex items-center justify-center">
                      {`Free trial ${aiUsage?.trialUsed || 0}/${aiUsage?.trialLimit || 1}`}
                    </div>
                  </div>
                )}

                {shouldShowAiForm && !aiGenerating && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        {(aiOptions?.eventPresets || ['Work Day', 'Date Night', 'Social Event']).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <select
                        value={stylePreset}
                        onChange={(e) => setStylePreset(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        {(aiOptions?.stylePresets || ['Smart Casual', 'Ivy', 'Minimal']).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <input
                        value={styleCustom}
                        onChange={(e) => setStyleCustom(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Custom style note (optional)"
                      />
                      <select
                        value={formality}
                        onChange={(e) => setFormality(e.target.value as 'casual' | 'smart' | 'formal')}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="casual">Casual</option>
                        <option value="smart">Smart</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <button
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
                        disabled={aiGenerating || !canUseFreeTrial}
                        onClick={() => generateAiLook(todayAi ? 'PATCH' : 'POST')}
                      >
                        {canUseFreeTrial ? (todayAi ? 'Regenerate with AI' : 'Generate with AI') : 'Upgrade for AI'}
                      </button>
                      {!canUseFreeTrial && (
                        <Link href="/settings/billing" className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm">
                          View plans
                        </Link>
                      )}
                      {todayAi && (
                        <button
                          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                          onClick={() => setAiFormOpen(false)}
                          title="Cancel and return to the current AI outfit"
                        >
                          <span className="inline-flex items-center gap-1">
                            <X className="h-4 w-4" />
                            Cancel
                          </span>
                        </button>
                      )}
                      <span className="text-xs text-muted-foreground self-center">
                        {`Free trial used ${aiUsage?.trialUsed || 0} of ${aiUsage?.trialLimit || 1}`}
                      </span>
                    </div>
                  </>
                )}
              </article>
            </div>
          )}

          {!entitlementsLoading && isPaidPlan && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {LOOK_CONFIGS.map((look) => {
                const outfit = paidLooks[look.id];
                const lookItems = outfit ? Object.values(outfit.items).filter(Boolean) as WardrobeItem[] : [];
                return (
                  <article key={look.id} className="border border-border rounded-xl bg-card p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-foreground">{look.label}</h2>
                      <div className="hidden md:flex items-center gap-2">
                        <button
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 text-xs font-medium text-foreground disabled:opacity-50"
                          disabled={!outfit || savingKey === look.id || savedLookKeys.has(look.id)}
                          onClick={() => outfit && saveLook(look.id, outfit, `${look.label} - ${new Date().toLocaleDateString()}`)}
                          title="Save this outfit"
                          aria-label="Save this outfit"
                          style={{ visibility: savedLookKeys.has(look.id) ? 'hidden' : 'visible' }}
                        >
                          <Save className="h-4 w-4" />
                          <span>Save</span>
                        </button>
                        <button
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 text-xs font-medium text-foreground disabled:opacity-50"
                          disabled={generatingLookId === look.id}
                          onClick={() => regeneratePaidLook(look)}
                          title="Regenerate this outfit"
                          aria-label="Regenerate this outfit"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/70 p-2 bg-background/20">
                      {outfit ? (
                        <OutfitGridLayout
                          items={lookItems}
                          showLabels
                          interactive
                          onItemClick={(item) => swapPaidItem(look.id, item)}
                        />
                      ) : (
                        <div className="h-40 rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                          Generating look...
                        </div>
                      )}
                    </div>
                    <div className="mt-auto grid grid-cols-2 md:hidden items-center gap-2">
                      <button
                        className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-3 text-sm font-medium text-foreground disabled:opacity-50"
                        disabled={!outfit || savingKey === look.id || savedLookKeys.has(look.id)}
                        onClick={() => outfit && saveLook(look.id, outfit, `${look.label} - ${new Date().toLocaleDateString()}`)}
                        title="Save this outfit"
                        aria-label="Save this outfit"
                        style={{ display: savedLookKeys.has(look.id) ? 'none' : 'inline-flex' }}
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        className={`w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-3 text-sm font-medium text-foreground disabled:opacity-50 ${savedLookKeys.has(look.id) ? 'col-span-2' : ''}`}
                        disabled={generatingLookId === look.id}
                        onClick={() => regeneratePaidLook(look)}
                        title="Regenerate this outfit"
                        aria-label="Regenerate this outfit"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                    {saveFeedbackByKey[look.id] && (
                      <p className="text-sm text-emerald-400 md:hidden">{saveFeedbackByKey[look.id]}</p>
                    )}
                  </article>
                );
              })}

              <article className="border border-border rounded-xl bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">AI Outfit</h2>
                  </div>
                  {todayAi && !aiFormOpen && !aiGenerating && (
                    <button
                      className="hidden md:inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 text-xs font-medium text-foreground"
                      onClick={() => setAiFormOpen(true)}
                      title="Regenerate this AI outfit"
                      aria-label="Regenerate this AI outfit"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-border/70 p-2 bg-background/20">
                  {aiGenerating || aiLoading ? (
                    <div className="h-40 rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {todayAi ? 'Regenerating AI outfit...' : 'Loading AI state...'}
                    </div>
                  ) : !shouldShowAiForm && todayAi && aiOutfitItems.length > 0 ? (
                    <OutfitGridLayout items={aiOutfitItems} showLabels />
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Fill out your preferences and generate an AI look for today.
                    </div>
                  )}
                </div>

                {!aiGenerating && !shouldShowAiForm && todayAi?.explanation && (
                  <p className="text-sm text-muted-foreground">{todayAi.explanation}</p>
                )}

                {!aiGenerating && !shouldShowAiForm && todayAi && (
                  <div className="mt-auto grid grid-cols-2 md:hidden items-center gap-2">
                    <button
                      className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-3 text-sm font-medium text-foreground"
                      onClick={() => setAiFormOpen(true)}
                      title="Regenerate this AI outfit"
                      aria-label="Regenerate this AI outfit"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Regenerate</span>
                    </button>
                    <div className="h-9 w-full rounded-md border border-transparent px-2 text-xs text-muted-foreground inline-flex items-center justify-center">
                      {`Monthly ${aiUsage?.monthlyUsed || 0}/${aiUsage?.monthlyLimit ?? '∞'}`}
                    </div>
                  </div>
                )}

                {shouldShowAiForm && !aiGenerating && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        {(aiOptions?.eventPresets || ['Work Day', 'Date Night', 'Social Event']).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <select
                        value={stylePreset}
                        onChange={(e) => setStylePreset(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        {(aiOptions?.stylePresets || ['Smart Casual', 'Ivy', 'Minimal']).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <input
                        value={styleCustom}
                        onChange={(e) => setStyleCustom(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Custom style note (optional)"
                      />
                      <select
                        value={formality}
                        onChange={(e) => setFormality(e.target.value as 'casual' | 'smart' | 'formal')}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="casual">Casual</option>
                        <option value="smart">Smart</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <button
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
                        disabled={aiGenerating}
                        onClick={() => generateAiLook(todayAi ? 'PATCH' : 'POST')}
                      >
                        {todayAi ? 'Regenerate with AI' : 'Generate with AI'}
                      </button>
                      {todayAi && (
                        <button
                          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                          onClick={() => setAiFormOpen(false)}
                          title="Cancel and return to the current AI outfit"
                        >
                          <span className="inline-flex items-center gap-1">
                            <X className="h-4 w-4" />
                            Cancel
                          </span>
                        </button>
                      )}
                      <span className="text-xs text-muted-foreground self-center">
                        {`Monthly ${aiUsage?.monthlyUsed || 0}/${aiUsage?.monthlyLimit ?? '∞'}`}
                      </span>
                    </div>
                  </>
                )}
              </article>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function todayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

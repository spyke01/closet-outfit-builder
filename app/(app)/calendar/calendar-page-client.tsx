'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CloudSun, Loader2, Plus, Trash2, AlertTriangle, Pencil, X, Check, Search } from 'lucide-react';
import { useWeather } from '@/lib/hooks/use-weather';
import { useOutfits, useCreateOutfit } from '@/lib/hooks/use-outfits';
import {
  useCalendarEntriesByMonth,
  useCreateCalendarEntry,
  useDeleteCalendarEntry,
  useUpdateCalendarEntry,
} from '@/lib/hooks/use-calendar-entries';
import { resolveCalendarWeather } from '@/lib/utils/calendar-weather';
import { generateOutfit } from '@/lib/services/outfit-generator';
import { enrichItems } from '@/lib/utils/item-enrichment';
import { calculateWeatherFit } from '@/lib/utils/compatibility-scoring';
import type { CalendarEntry, Outfit, WardrobeItem } from '@/lib/types/database';
import { AIIcon } from '@/components/ai-icon';

type EntrySource = 'existing' | 'generated';
type EntryStatus = 'planned' | 'worn';
type ExistingPolicy = 'skip' | 'overwrite';
type MixStrategy = 'saved-heavy' | 'balanced' | 'ai-heavy';
type PanelMode = 'idle' | 'creating' | 'editing';
type EntryFormSnapshot = {
  entrySource: EntrySource;
  entryStatus: EntryStatus;
  selectedOutfitId: string;
  notes: string;
  generatedItemIdsKey: string;
};

interface CalendarPageClientProps {
  wardrobeItems: WardrobeItem[];
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const days: Date[] = [];

  for (let i = 0; i < startDay; i++) {
    days.push(new Date(first.getFullYear(), first.getMonth(), i - startDay + 1));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    const next = days.length - startDay - daysInMonth + 1;
    days.push(new Date(month.getFullYear(), month.getMonth() + 1, next));
  }

  return days;
}

function toItemSetSignature(itemIds: string[]): string {
  return [...new Set(itemIds)].sort().join(',');
}

function getUpcomingDates(baseDate: Date, count: number, weekdaysOnly: boolean): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(baseDate);

  while (dates.length < count) {
    const day = cursor.getDay();
    const include = !weekdaysOnly || (day >= 1 && day <= 5);
    if (include) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function getRecentEntrySignatures(
  entries: CalendarEntry[],
  lookbackDays: number,
  fromDate: Date,
  statuses: Array<'planned' | 'worn'>
): Set<string> {
  const signatures = new Set<string>();
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffMs = cutoff.getTime();
  const fromMs = fromDate.getTime();

  for (const entry of entries) {
    if (!statuses.includes(entry.status)) continue;
    const entryTime = new Date(`${entry.entry_date}T12:00:00`).getTime();
    if (entryTime < cutoffMs || entryTime > fromMs) continue;

    const signature = toItemSetSignature((entry.items || []).map((item) => item.id));
    if (signature) signatures.add(signature);
  }

  return signatures;
}

function getRecentWornItemIds(entries: CalendarEntry[], lookbackDays: number, fromDate: Date): Set<string> {
  const ids = new Set<string>();
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffMs = cutoff.getTime();
  const fromMs = fromDate.getTime();

  for (const entry of entries) {
    if (entry.status !== 'worn') continue;
    const entryTime = new Date(`${entry.entry_date}T12:00:00`).getTime();
    if (entryTime < cutoffMs || entryTime > fromMs) continue;
    for (const item of entry.items || []) {
      ids.add(item.id);
    }
  }

  return ids;
}

function chooseSavedOutfitForWeather(
  outfits: Outfit[],
  targetWeight: number,
  weatherContext: ReturnType<typeof resolveCalendarWeather>['weatherContext'],
  excludedSignatures: Set<string>
): Outfit | null {
  const ranked = outfits
    .filter((outfit) => (outfit.items || []).length > 0)
    .map((outfit) => {
      const itemIds = (outfit.items || []).map((item) => item.id);
      const signature = toItemSetSignature(itemIds);
      if (!signature || excludedSignatures.has(signature)) {
        return null;
      }

      const enriched = enrichItems(outfit.items || []);
      if (enriched.length === 0) {
        return null;
      }

      const averageWeatherFit = enriched.reduce((sum, item) => sum + calculateWeatherFit(item, weatherContext), 0) / enriched.length;
      const averageWeight = enriched.reduce((sum, item) => sum + item.weatherWeight, 0) / enriched.length;
      const weightPenalty = Math.abs(averageWeight - targetWeight) * 0.1;

      return {
        outfit,
        score: averageWeatherFit - weightPenalty,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score);

  return ranked.length > 0 && ranked[0] ? ranked[0].outfit : null;
}

function shouldPreferSavedOutfit(index: number, strategy: MixStrategy): boolean {
  if (strategy === 'saved-heavy') return true;
  if (strategy === 'ai-heavy') return index % 3 === 0;
  return index % 2 === 0;
}

function findRepeatWarning(entries: CalendarEntry[], selectedDate: Date, itemIds: string[]): string | null {
  if (itemIds.length === 0) return null;

  const selectedDateMs = selectedDate.getTime();
  const lookbackStart = new Date(selectedDate);
  lookbackStart.setDate(lookbackStart.getDate() - 7);
  const lookbackStartMs = lookbackStart.getTime();
  const targetSignature = toItemSetSignature(itemIds);

  for (const entry of entries) {
    if (entry.status !== 'worn') continue;

    const entryTime = new Date(`${entry.entry_date}T12:00:00`).getTime();
    if (entryTime < lookbackStartMs || entryTime >= selectedDateMs) continue;

    const entrySignature = toItemSetSignature((entry.items || []).map((item) => item.id));
    if (entrySignature && entrySignature === targetSignature) {
      return `Similar outfit was worn on ${entry.entry_date} (within 7 days).`;
    }
  }

  return null;
}

function isCalendarGeneratedOutfit(outfit: Outfit): boolean {
  const name = (outfit.name || '').trim();
  return name.startsWith('AI Week Plan ') || name.startsWith('Calendar ');
}

function OutfitThumbs({
  items,
  size = 'md',
  outfitId,
}: {
  items: WardrobeItem[];
  size?: 'sm' | 'md';
  outfitId?: string;
}) {
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground">No preview</div>;
  }

  const thumbSizeClass = size === 'sm' ? 'w-14 h-14' : 'w-16 h-16';
  const thumbSizePx = size === 'sm' ? 56 : 64;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {items.map((item) => {
        const thumb = (
          <div className={`${thumbSizeClass} rounded-md bg-card overflow-hidden flex-shrink-0`}>
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                width={thumbSizePx}
                height={thumbSizePx}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground px-1 text-center leading-tight">
                {(item.category?.name || item.name).slice(0, 8)}
              </div>
            )}
          </div>
        );

        if (!outfitId) {
          return <div key={item.id}>{thumb}</div>;
        }

        return (
          <Link
            key={item.id}
            href={`/outfits/${outfitId}/`}
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View outfit ${outfitId}`}
          >
            {thumb}
          </Link>
        );
      })}
    </div>
  );
}

export function CalendarPageClient({ wardrobeItems }: CalendarPageClientProps) {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [panelMode, setPanelMode] = useState<PanelMode>('idle');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [entrySource, setEntrySource] = useState<EntrySource>('existing');
  const [entryStatus, setEntryStatus] = useState<EntryStatus>('planned');
  const [selectedOutfitId, setSelectedOutfitId] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedItemIds, setGeneratedItemIds] = useState<string[]>([]);
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [repeatWarning, setRepeatWarning] = useState<string | null>(null);
  const [entrySearchQuery, setEntrySearchQuery] = useState('');
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);
  const [weekGenerationMessage, setWeekGenerationMessage] = useState<string | null>(null);
  const [weekGenerationProgress, setWeekGenerationProgress] = useState<{
    completed: number;
    total: number;
    currentDate: string | null;
  } | null>(null);
  const [generationCount, setGenerationCount] = useState(7);
  const [existingPolicy, setExistingPolicy] = useState<ExistingPolicy>('skip');
  const [mixStrategy, setMixStrategy] = useState<MixStrategy>('balanced');
  const [lookbackDays, setLookbackDays] = useState(14);
  const [weekdaysOnly, setWeekdaysOnly] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [initialEntryFormSnapshot, setInitialEntryFormSnapshot] = useState<EntryFormSnapshot | null>(null);

  const notesInputRef = useRef<HTMLInputElement>(null);
  const entryFormRef = useRef<HTMLDivElement>(null);

  const { current, forecast } = useWeather(true);
  const { data: outfits = [] } = useOutfits();
  const { data: calendarMonthData, isLoading, error } = useCalendarEntriesByMonth({ month, lookbackDays: 30 });

  const createEntryMutation = useCreateCalendarEntry();
  const updateEntryMutation = useUpdateCalendarEntry();
  const deleteEntryMutation = useDeleteCalendarEntry();
  const createOutfitMutation = useCreateOutfit();

  const monthDays = useMemo(() => buildMonthGrid(month), [month]);
  const selectedDateKey = formatDateKey(selectedDate);
  const entries = useMemo(() => calendarMonthData?.entries ?? [], [calendarMonthData?.entries]);
  const selectedDateEntries = useMemo(
    () => entries.filter((entry) => entry.entry_date === selectedDateKey),
    [entries, selectedDateKey]
  );
  const activeEntry = useMemo(
    () => selectedDateEntries.find((entry) => entry.id === activeEntryId) ?? null,
    [activeEntryId, selectedDateEntries]
  );

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const bucket = grouped.get(entry.entry_date) || [];
      bucket.push(entry);
      grouped.set(entry.entry_date, bucket);
    }
    return grouped;
  }, [entries]);

  const weatherForSelectedDate = useMemo(
    () => resolveCalendarWeather(selectedDate, current, forecast),
    [selectedDate, current, forecast]
  );

  const weatherDisplay = useMemo(() => {
    if (weatherForSelectedDate.source === 'seasonal-fallback') {
      return {
        conditionLabel: 'Seasonal estimate for your location',
        sourceLabel: 'estimated',
      };
    }

    if (weatherForSelectedDate.source === 'neutral') {
      return {
        conditionLabel: 'Weather unavailable',
        sourceLabel: 'fallback',
      };
    }

    return {
      conditionLabel: weatherForSelectedDate.condition,
      sourceLabel: 'forecast',
    };
  }, [weatherForSelectedDate.condition, weatherForSelectedDate.source]);

  const generatedPreviewItems = useMemo(() => {
    if (generatedItemIds.length === 0) return [];
    const itemLookup = new Map(wardrobeItems.map((item) => [item.id, item]));
    return generatedItemIds
      .map((itemId) => itemLookup.get(itemId))
      .filter((item): item is WardrobeItem => Boolean(item));
  }, [generatedItemIds, wardrobeItems]);

  const hasRequiredItems = useMemo(() => {
    const names = new Set(wardrobeItems.map((item) => item.category?.name));
    return names.has('Shirt') && names.has('Pants') && names.has('Shoes');
  }, [wardrobeItems]);

  const weatherReadyOutfits = useMemo(() => {
    return outfits.filter((outfit) => {
      if ((outfit.items || []).length === 0) return false;
      if (outfit.id === selectedOutfitId) return true;
      if (isCalendarGeneratedOutfit(outfit)) return false;
      return true;
    });
  }, [outfits, selectedOutfitId]);

  const sourceOutfits = useMemo(() => {
    const query = entrySearchQuery.trim().toLowerCase();

    return [...outfits]
      .filter((outfit) => {
        if (!query) return true;
        const name = (outfit.name || '').toLowerCase();
        const itemNames = (outfit.items || []).map((item) => item.name.toLowerCase()).join(' ');
        return name.includes(query) || itemNames.includes(query);
      })
      .sort((a, b) => {
        if (a.id === selectedOutfitId) return -1;
        if (b.id === selectedOutfitId) return 1;
        if (Boolean(b.loved) !== Boolean(a.loved)) return Number(Boolean(b.loved)) - Number(Boolean(a.loved));
        if (typeof b.score === 'number' && typeof a.score === 'number' && b.score !== a.score) {
          return b.score - a.score;
        }
        return (b.updated_at || '').localeCompare(a.updated_at || '') || (a.name || '').localeCompare(b.name || '');
      });
  }, [entrySearchQuery, outfits, selectedOutfitId]);

  useEffect(() => {
    if (panelMode === 'editing' && (!activeEntryId || !activeEntry)) {
      setPanelMode('idle');
      setActiveEntryId(null);
      setInitialEntryFormSnapshot(null);
    }
  }, [activeEntry, activeEntryId, panelMode]);

  const onGenerateWeekOutfits = async () => {
    if (!hasRequiredItems || isGeneratingWeek) return;

    setIsGeneratingWeek(true);
    setWeekGenerationMessage(null);
    setShowGenerateModal(false);

    try {
      const baseDate = new Date(selectedDate);
      const targetDates = getUpcomingDates(baseDate, generationCount, weekdaysOnly);
      setWeekGenerationProgress({ completed: 0, total: targetDates.length, currentDate: null });
      const recentSignatures = getRecentEntrySignatures(entries, lookbackDays, baseDate, ['worn', 'planned']);
      const excludedItemIds = getRecentWornItemIds(entries, lookbackDays, baseDate);
      let usedSavedCount = 0;
      let usedGeneratedCount = 0;
      let skippedCount = 0;
      let overwrittenCount = 0;

      for (let i = 0; i < targetDates.length; i++) {
        const date = targetDates[i];
        const dateKey = formatDateKey(date);
        setWeekGenerationProgress({ completed: i, total: targetDates.length, currentDate: dateKey });
        const existingPlannedEntries = (entriesByDate.get(dateKey) || []).filter((entry) => entry.status === 'planned');

        if (existingPlannedEntries.length > 0 && existingPolicy === 'skip') {
          skippedCount += 1;
          setWeekGenerationProgress({ completed: i + 1, total: targetDates.length, currentDate: dateKey });
          continue;
        }

        if (existingPlannedEntries.length > 0 && existingPolicy === 'overwrite') {
          for (const existingEntry of existingPlannedEntries) {
            await deleteEntryMutation.mutateAsync(existingEntry.id);
          }
          overwrittenCount += existingPlannedEntries.length;
        }

        const weather = resolveCalendarWeather(date, current, forecast);
        const preferSaved = shouldPreferSavedOutfit(i, mixStrategy);

        let chosenOutfit: Outfit | null = null;
        if (preferSaved) {
          chosenOutfit = chooseSavedOutfitForWeather(
            weatherReadyOutfits,
            weather.weatherContext.targetWeight,
            weather.weatherContext,
            recentSignatures
          );
        }

        let outfitId: string | undefined;
        let itemIds: string[] = [];
        let generationType: 'saved' | 'ai-custom' = 'saved';

        if (chosenOutfit) {
          outfitId = chosenOutfit.id;
          itemIds = (chosenOutfit.items || []).map((item) => item.id);
          usedSavedCount += 1;
        } else {
          const generated = generateOutfit({
            wardrobeItems,
            weatherContext: weather.weatherContext,
            excludeItems: Array.from(excludedItemIds),
          });

          itemIds = generated.itemIds;
          generationType = 'ai-custom';
          for (const itemId of itemIds) excludedItemIds.add(itemId);

          const createdOutfit = await createOutfitMutation.mutateAsync({
            items: itemIds,
            source: 'generated',
            name: `AI Week Plan ${dateKey}`,
            weight: 1,
            loved: false,
          });

          outfitId = createdOutfit.id;
          usedGeneratedCount += 1;
        }

        const signature = toItemSetSignature(itemIds);
        if (signature) recentSignatures.add(signature);

        await createEntryMutation.mutateAsync({
          entry_date: dateKey,
          status: 'planned',
          outfit_id: outfitId,
          notes: generationType === 'ai-custom' ? 'AI generated plan' : 'AI saved outfit plan',
          weather_context: {
            source: weather.source,
            condition: weather.condition,
            highTemp: weather.highTemp,
            lowTemp: weather.lowTemp,
            precipChance: weather.precipChance,
            weeklyGenerated: true,
            generationType,
          },
          item_ids: itemIds,
        });
        setWeekGenerationProgress({ completed: i + 1, total: targetDates.length, currentDate: dateKey });
      }

      const generatedCount = usedSavedCount + usedGeneratedCount;
      setWeekGenerationMessage(
        [
          `Generated ${generatedCount} planned entries (${usedSavedCount} saved, ${usedGeneratedCount} AI custom).`,
          skippedCount > 0 ? `${skippedCount} skipped due to existing plans.` : '',
          overwrittenCount > 0 ? `${overwrittenCount} existing planned entries overwritten.` : '',
        ]
          .filter(Boolean)
          .join(' ')
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate outfits.';
      setWeekGenerationMessage(message);
    } finally {
      setIsGeneratingWeek(false);
      setWeekGenerationProgress(null);
    }
  };

  const onGenerateOutfit = () => {
    if (!hasRequiredItems) return;

    const generated = generateOutfit({
      wardrobeItems,
      weatherContext: weatherForSelectedDate.weatherContext,
      excludeItems: [],
    });

    const itemIds = generated.itemIds;
    setGeneratedItemIds(itemIds);
    setGeneratedSummary(`${Math.round(generated.scores.overall.total * 100)}/100 score`);
    setEntrySource('generated');
    setPanelMode('creating');
    setActiveEntryId(null);

    const warning = findRepeatWarning(entries, selectedDate, itemIds);
    setRepeatWarning(warning);
  };

  const resetForm = (nextMode: PanelMode = 'idle') => {
    setEntrySource('existing');
    setEntryStatus('planned');
    setSelectedOutfitId('');
    setNotes('');
    setGeneratedItemIds([]);
    setGeneratedSummary('');
    setRepeatWarning(null);
    setActiveEntryId(null);
    setPanelMode(nextMode);
    setEntrySearchQuery('');
    setInitialEntryFormSnapshot({
      entrySource: 'existing',
      entryStatus: 'planned',
      selectedOutfitId: '',
      notes: '',
      generatedItemIdsKey: '',
    });
  };

  const handleNewEntryClick = () => {
    resetForm('creating');

    requestAnimationFrame(() => {
      entryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      notesInputRef.current?.focus();
    });
  };

  const onEditEntry = (entry: CalendarEntry) => {
    setPanelMode('editing');
    setActiveEntryId(entry.id);
    setEntryStatus(entry.status);
    setNotes(entry.notes || '');
    setRepeatWarning(null);
    setEntrySearchQuery('');

    if (entry.outfit_id) {
      setEntrySource('existing');
      setSelectedOutfitId(entry.outfit_id);
      setGeneratedItemIds([]);
      setGeneratedSummary('');
      setInitialEntryFormSnapshot({
        entrySource: 'existing',
        entryStatus: entry.status,
        selectedOutfitId: entry.outfit_id,
        notes: entry.notes || '',
        generatedItemIdsKey: '',
      });
    } else {
      setEntrySource('generated');
      const itemIds = (entry.items || []).map((item) => item.id);
      setGeneratedItemIds(itemIds);
      setSelectedOutfitId('');
      setGeneratedSummary(itemIds.length ? `${itemIds.length} items` : '');
      setInitialEntryFormSnapshot({
        entrySource: 'generated',
        entryStatus: entry.status,
        selectedOutfitId: '',
        notes: entry.notes || '',
        generatedItemIdsKey: toItemSetSignature(itemIds),
      });
    }

    requestAnimationFrame(() => {
      entryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const onDeleteEntry = async (entryId: string) => {
    await deleteEntryMutation.mutateAsync(entryId);
    if (activeEntryId === entryId) {
      resetForm();
    }
  };

  const onMarkEntryWorn = async (entry: CalendarEntry) => {
    if (entry.status === 'worn') return;

    await updateEntryMutation.mutateAsync({
      id: entry.id,
      status: 'worn',
    });

    if (activeEntryId === entry.id && panelMode === 'editing') {
      setEntryStatus('worn');
    }
  };

  const onSaveEntry = async () => {
    let outfitId: string | undefined;
    let itemIds: string[] = [];

    if (entrySource === 'existing') {
      if (!selectedOutfitId) {
        throw new Error('Select an outfit first.');
      }

      const picked = sourceOutfits.find((outfit) => outfit.id === selectedOutfitId);
      if (!picked) {
        throw new Error('Selected outfit not found.');
      }

      outfitId = picked.id;
      itemIds = (picked.items || []).map((item) => item.id);
    } else {
      if (generatedItemIds.length === 0) {
        throw new Error('Generate an outfit first.');
      }

      const createdOutfit = await createOutfitMutation.mutateAsync({
        items: generatedItemIds,
        source: 'generated',
        name: `Calendar ${selectedDateKey}`,
        weight: 1,
        loved: false,
      });

      outfitId = createdOutfit.id;
      itemIds = generatedItemIds;
    }

    const warning = findRepeatWarning(entries, selectedDate, itemIds);
    setRepeatWarning(warning);

    const payload = {
      entry_date: selectedDateKey,
      status: entryStatus,
      outfit_id: outfitId,
      notes,
      weather_context: {
        source: weatherForSelectedDate.source,
        condition: weatherForSelectedDate.condition,
        highTemp: weatherForSelectedDate.highTemp,
        lowTemp: weatherForSelectedDate.lowTemp,
        precipChance: weatherForSelectedDate.precipChance,
      },
      item_ids: itemIds,
    } as const;

    if (panelMode === 'editing') {
      const editableEntry = selectedDateEntries.find((entry) => entry.id === activeEntryId);
      if (!editableEntry) {
        throw new Error('The selected entry no longer matches this date.');
      }

      await updateEntryMutation.mutateAsync({ id: editableEntry.id, ...payload });
    } else {
      await createEntryMutation.mutateAsync(payload);
    }

    resetForm();
  };

  const isSaving = createEntryMutation.isPending || updateEntryMutation.isPending || createOutfitMutation.isPending;
  const formSnapshot: EntryFormSnapshot = useMemo(() => ({
    entrySource,
    entryStatus,
    selectedOutfitId,
    notes: notes.trim(),
    generatedItemIdsKey: toItemSetSignature(generatedItemIds),
  }), [entrySource, entryStatus, selectedOutfitId, notes, generatedItemIds]);

  const hasFormChanges = useMemo(() => {
    if (!initialEntryFormSnapshot) return false;
    return JSON.stringify(formSnapshot) !== JSON.stringify(initialEntryFormSnapshot);
  }, [formSnapshot, initialEntryFormSnapshot]);

  const hasValidEntrySelection = useMemo(() => {
    if (entrySource === 'existing') return Boolean(selectedOutfitId);
    return generatedItemIds.length > 0;
  }, [entrySource, selectedOutfitId, generatedItemIds.length]);

  const canSaveEntry = hasFormChanges && hasValidEntrySelection && !isSaving;
  const isEntryFormOpen = panelMode === 'creating' || panelMode === 'editing';

  const handleDateSelection = (day: Date) => {
    const nextDateKey = formatDateKey(day);
    if (nextDateKey === selectedDateKey) return;

    if (isEntryFormOpen && hasFormChanges) {
      const shouldDiscard = window.confirm('Discard unsaved changes and switch dates?');
      if (!shouldDiscard) return;
    }

    setSelectedDate(day);
    resetForm();
  };

  const commonButtonBase =
    'rounded-[var(--radius-pill)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  const primaryButtonClass = `${commonButtonBase} inline-flex items-center justify-center gap-2 px-[22px] py-[11px] text-[0.82rem] font-semibold bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] text-[var(--text-on-accent)] shadow-[var(--shadow-accent)] hover:-translate-y-px hover:shadow-[var(--shadow-accent-hover)] active:translate-y-0 active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`;
  const secondaryButtonClass = `${commonButtonBase} inline-flex items-center justify-center gap-2 border border-[var(--border-default)] bg-[var(--bg-surface)] px-[16px] py-[9px] text-[0.79rem] font-medium text-[var(--text-2)] backdrop-blur-[var(--blur-glass)] [-webkit-backdrop-filter:blur(var(--blur-glass))] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-1)] active:bg-[var(--bg-surface-active)] disabled:opacity-50 disabled:cursor-not-allowed`;
  const tertiaryButtonClass = `${commonButtonBase} inline-flex items-center justify-center gap-1.5 border border-transparent bg-transparent px-[12px] py-[6px] text-[0.72rem] font-medium text-[var(--text-2)] hover:border-[var(--border-subtle)] hover:bg-[var(--button-tertiary-hover)] hover:text-[var(--text-1)] active:bg-[var(--button-tertiary-active)] disabled:opacity-50 disabled:cursor-not-allowed`;
  const iconTertiaryClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border border-transparent bg-transparent text-[var(--text-2)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-[var(--border-subtle)] hover:bg-[var(--button-tertiary-hover)] hover:text-[var(--text-1)] active:bg-[var(--button-tertiary-active)] disabled:opacity-50';
  const destructiveIconTertiaryClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border border-transparent bg-transparent text-[var(--text-2)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50';

  return (
    <div className="page-shell-content page-shell-content--wide space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] p-1">
            <span className="rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] px-3 py-1.5 text-sm text-primary-foreground">Calendar</span>
            <Link href="/calendar/trips" className="rounded-[var(--radius-pill)] px-3 py-1.5 text-sm text-muted-foreground hover:bg-[var(--bg-surface-hover)] hover:text-foreground">
              Trips
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Outfit Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Plan or log multiple outfits per day with weather-aware guidance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:block sm:text-right sm:space-y-2">
          <div className="glass-surface col-span-1 px-3 py-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <p className="text-sm text-muted-foreground">Worn Entries This Month</p>
            <p className="text-2xl font-semibold text-foreground">{calendarMonthData?.wornEntriesThisMonth || 0}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            disabled={!hasRequiredItems || isGeneratingWeek}
            className={`col-span-1 w-full sm:col-span-2 ${primaryButtonClass}`}
          >
            <AIIcon className="w-4 h-4" />
            {isGeneratingWeek ? 'Generating...' : 'Generate Outfits'}
          </button>
        </div>
      </div>

      {isGeneratingWeek && weekGenerationProgress && (
        <div className="glass-surface space-y-2 border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-muted)] px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating outfit plan...</span>
            </div>
            <span className="text-muted-foreground">
              {weekGenerationProgress.completed}/{weekGenerationProgress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-active)]">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${weekGenerationProgress.total > 0
                  ? (weekGenerationProgress.completed / weekGenerationProgress.total) * 100
                  : 0}%`,
              }}
            />
          </div>
          {weekGenerationProgress.currentDate && (
            <p className="text-xs text-muted-foreground">
              Processing {weekGenerationProgress.currentDate}
            </p>
          )}
        </div>
      )}

      {weekGenerationMessage && (
        <div className="glass-surface px-4 py-3 text-sm text-foreground">
          {weekGenerationMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="glass-surface xl:col-span-2 rounded-[var(--radius-xl)] p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              className="glass-pill p-2"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-foreground">{formatMonthTitle(month)}</h2>
            <button
              className="glass-pill p-2"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-[11px] sm:text-xs text-muted-foreground mb-2 px-0.5 sm:px-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center py-2">{day}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="h-60 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading calendar...
            </div>
          ) : error ? (
            <div className="h-60 flex items-center justify-center text-destructive">{error.message}</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day) => {
                const dayKey = formatDateKey(day);
                const inCurrentMonth = day.getMonth() === month.getMonth();
                const isSelected = dayKey === selectedDateKey;
                const dayEntries = entriesByDate.get(dayKey) || [];
                const plannedCount = dayEntries.filter((entry) => entry.status === 'planned').length;
                const wornCount = dayEntries.filter((entry) => entry.status === 'worn').length;
                const forecastDay = forecast.find((item) => item.date === dayKey);

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => handleDateSelection(day)}
                    className={`relative min-h-20 sm:min-h-24 rounded-lg border p-1.5 sm:p-2 text-left transition-colors ${
                      isSelected ? 'border-primary bg-[var(--accent-muted)]' : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] hover:bg-[var(--bg-surface-hover)]'
                    } ${inCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}
                  >
                    <span className="absolute top-1.5 left-1.5 text-sm font-medium">
                      {day.getDate()}
                    </span>
                    {forecastDay && (
                      <span className="absolute top-1.5 right-1.5 rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_88%,transparent)] px-1 py-0.5 text-[9px] font-semibold text-foreground shadow-[var(--shadow-nav)] sm:px-1.5 sm:text-[10px]">
                        {Math.round(forecastDay.temperature.high)}F
                      </span>
                    )}
                    <div className="mt-6 sm:mt-7 space-y-1">
                      {plannedCount > 0 && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">
                          <span className="sm:hidden">{plannedCount}P</span>
                          <span className="hidden sm:inline">{plannedCount} planned</span>
                        </div>
                      )}
                      {wornCount > 0 && (
                        <div className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <span className="sm:hidden">{wornCount}W</span>
                          <span className="hidden sm:inline">{wornCount} worn</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="glass-surface rounded-[var(--radius-xl)] p-4 space-y-4">
            <div className="space-y-3 border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <CloudSun className="w-4 h-4" />
                    <span>
                      {weatherDisplay.conditionLabel}, {Math.round(weatherForSelectedDate.lowTemp)}F/{Math.round(weatherForSelectedDate.highTemp)}F
                    </span>
                    <span className="rounded-[var(--radius-pill)] border border-[var(--tag-border)] bg-[var(--tag-bg)] px-2 py-0.5 text-xs text-[var(--tag-text)]">{weatherDisplay.sourceLabel}</span>
                  </div>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_76%,transparent)] px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Entries</p>
                  <p className="text-lg font-semibold text-foreground">{selectedDateEntries.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleNewEntryClick}
                  className={`${secondaryButtonClass} w-full`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Entry
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(true)}
                  disabled={!hasRequiredItems || isGeneratingWeek}
                  className={`${primaryButtonClass} w-full`}
                >
                  <AIIcon className="w-4 h-4" />
                  Generate Outfits
                </button>
              </div>
            </div>

            <div className="space-y-3 border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Entries for selected date</h4>
                <span className="text-xs text-muted-foreground">{selectedDateEntries.length} total</span>
              </div>

              {selectedDateEntries.length === 0 ? (
                <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_68%,transparent)] px-4 py-5 text-sm text-muted-foreground">
                  No entries yet for this date. Add an entry to plan or log what you wore.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEntries.map((entry) => {
                    const isActive = panelMode === 'editing' && activeEntryId === entry.id;
                    return (
                      <div
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onEditEntry(entry)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onEditEntry(entry);
                          }
                        }}
                        className={`group w-full rounded-[var(--radius-lg)] border p-3 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-[var(--accent-muted)]'
                            : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] hover:bg-[var(--bg-surface-hover)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[11px] uppercase tracking-wide rounded-full px-2 py-0.5 border ${
                                  entry.status === 'worn'
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {entry.status}
                              </span>
                              {isActive && (
                                <span className="rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                                  Editing
                                </span>
                              )}
                            </div>
                            <p className="mt-2 truncate text-sm font-medium text-foreground">
                              {entry.outfit?.name || `${entry.items?.length || 0} item entry`}
                            </p>
                            {entry.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{entry.notes}</p>}
                          </div>

                          <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                            {entry.status === 'planned' && (
                              <button
                                type="button"
                                onClick={() => onMarkEntryWorn(entry)}
                                disabled={updateEntryMutation.isPending}
                                className={`${secondaryButtonClass} h-9 px-2.5 text-xs border-success/40 bg-success-light text-success-dark dark:border-success/60 dark:bg-success-dark/20 dark:text-green-200`}
                                aria-label="Mark as worn"
                              >
                                <Check className="w-3 h-3 inline mr-1" />
                                Wore it
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteEntry(entry.id)}
                              disabled={deleteEntryMutation.isPending || updateEntryMutation.isPending}
                              className={destructiveIconTertiaryClass}
                              aria-label="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <OutfitThumbs items={entry.items || []} size="sm" outfitId={entry.outfit_id || undefined} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isEntryFormOpen ? (
              <div ref={entryFormRef} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {panelMode === 'editing' ? 'Edit Entry' : `New Entry for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {panelMode === 'editing'
                        ? 'Update the selected entry for this date.'
                        : 'Choose the purpose, source, and outfit details for this date.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetForm()}
                    className={tertiaryButtonClass}
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Entry purpose</p>
                  <div className="inline-flex w-full rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] p-1">
                    {(['planned', 'worn'] as EntryStatus[]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setEntryStatus(status)}
                        className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors ${
                          entryStatus === status ? 'rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] text-primary-foreground' : 'rounded-[var(--radius-pill)] text-muted-foreground hover:bg-[var(--bg-surface-hover)]'
                        }`}
                      >
                        {status === 'planned' ? 'Planned' : 'Worn'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Outfit source</p>
                  <div className="inline-flex w-full rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] p-1">
                    <button
                      type="button"
                      onClick={() => setEntrySource('existing')}
                      className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors ${
                        entrySource === 'existing' ? 'rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] text-primary-foreground' : 'rounded-[var(--radius-pill)] text-muted-foreground hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      Use Saved Outfit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntrySource('generated')}
                      className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                        entrySource === 'generated' ? 'rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,var(--accent),#7eb8ff)] text-primary-foreground' : 'rounded-[var(--radius-pill)] text-muted-foreground hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      <AIIcon className="w-3.5 h-3.5" />
                      Generate New
                    </button>
                  </div>
                </div>

                {entrySource === 'existing' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={entrySearchQuery}
                        onChange={(event) => setEntrySearchQuery(event.target.value)}
                        className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] py-2 pl-9 pr-3 text-sm text-foreground"
                        placeholder="Search saved outfits"
                        aria-label="Search saved outfits"
                      />
                    </div>

                    <div className="max-h-72 overflow-auto space-y-2 pr-1 xl:max-h-[26rem]">
                      {sourceOutfits.map((outfit) => {
                        const selected = selectedOutfitId === outfit.id;
                        return (
                          <button
                            key={outfit.id}
                            type="button"
                            onClick={() => setSelectedOutfitId(outfit.id)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              selected ? 'border-primary bg-[var(--accent-muted)]' : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] hover:bg-[var(--bg-surface-hover)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {outfit.name || `Outfit ${outfit.id.slice(0, 6)}`}
                                  </p>
                                  {selected && (
                                    <span className="rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2">
                                  <OutfitThumbs items={outfit.items || []} size="sm" />
                                </div>
                              </div>
                              {typeof outfit.score === 'number' && (
                                <span className="shrink-0 text-xs text-muted-foreground">{outfit.score}/100</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {sourceOutfits.length === 0 && (
                        <p className="px-1 py-2 text-sm text-muted-foreground">
                          {entrySearchQuery.trim() ? 'No saved outfits match your search.' : 'No saved outfits available yet.'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={onGenerateOutfit}
                      disabled={!hasRequiredItems}
                      className={`${secondaryButtonClass} w-full inline-flex items-center justify-center gap-2`}
                    >
                      <AIIcon className="w-4 h-4" />
                      {generatedItemIds.length > 0 ? 'Regenerate Outfit' : 'Generate Weather-Aware Outfit'}
                    </button>
                    {!hasRequiredItems && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Add at least Shirt, Pants, and Shoes to generate outfits.
                      </p>
                    )}
                    {generatedPreviewItems.length > 0 && (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_76%,transparent)] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">Generated preview</p>
                          <span className="text-xs text-muted-foreground">
                            {generatedSummary}
                          </span>
                        </div>
                        <OutfitThumbs items={generatedPreviewItems} size="sm" />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          This preview is only saved once you save the entry.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="calendar-notes" className="text-sm font-medium text-foreground">Label / notes</label>
                  <p className="text-xs text-muted-foreground">Letters and numbers only. Keep it short and easy to scan.</p>
                  <input
                    ref={notesInputRef}
                    id="calendar-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.replace(/[^A-Za-z0-9\s]/g, '').slice(0, 500))}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-foreground"
                    placeholder="Example Office meeting 2pm"
                    autoComplete="off"
                  />
                </div>

                {repeatWarning && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300 text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    {repeatWarning}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => resetForm()}
                    className={`${secondaryButtonClass} flex-1`}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onSaveEntry().catch((err: Error) => setRepeatWarning(err.message))}
                    disabled={!canSaveEntry}
                    className={`${primaryButtonClass} flex-1 inline-flex items-center justify-center gap-2`}
                  >
                    <Pencil className="w-4 h-4" />
                    {isSaving ? 'Saving...' : panelMode === 'editing' ? 'Save Changes' : 'Save Entry'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-surface)_68%,transparent)] px-4 py-5">
                <h4 className="font-semibold text-foreground">Entry editor</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick an existing entry to edit it, or create a new entry for the selected date.
                </p>
                <button
                  type="button"
                  onClick={handleNewEntryClick}
                  className={`${secondaryButtonClass} mt-4`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Entry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,10,16,0.72)] p-4 backdrop-blur-[8px]">
          <div className="glass-surface w-full max-w-2xl rounded-[var(--radius-xl)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Generate Outfits</h3>
                <p className="text-sm text-muted-foreground">
                  Configure AI planning options, then generate planned entries from {selectedDate.toLocaleDateString()} onward.
                </p>
              </div>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className={iconTertiaryClass}
                  aria-label="Close generate modal"
                >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="generate-count" className="text-xs text-muted-foreground">How many</label>
                <input
                  id="generate-count"
                  type="number"
                  min={1}
                  max={14}
                  value={generationCount}
                  onChange={(e) => setGenerationCount(Math.max(1, Math.min(14, Number(e.target.value) || 1)))}
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1.5 text-foreground"
                />
              </div>

              <div>
                <label htmlFor="existing-policy" className="text-xs text-muted-foreground">Existing planned entries</label>
                <select
                  id="existing-policy"
                  value={existingPolicy}
                  onChange={(e) => setExistingPolicy(e.target.value as ExistingPolicy)}
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1.5 text-foreground"
                >
                  <option value="skip">Skip existing</option>
                  <option value="overwrite">Overwrite existing</option>
                </select>
              </div>

              <div>
                <label htmlFor="mix-strategy" className="text-xs text-muted-foreground">AI mix strategy</label>
                <select
                  id="mix-strategy"
                  value={mixStrategy}
                  onChange={(e) => setMixStrategy(e.target.value as MixStrategy)}
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1.5 text-foreground"
                >
                  <option value="saved-heavy">Saved heavy</option>
                  <option value="balanced">Balanced</option>
                  <option value="ai-heavy">AI heavy</option>
                </select>
              </div>

              <div>
                <label htmlFor="lookback-days" className="text-xs text-muted-foreground">Repeat window</label>
                <select
                  id="lookback-days"
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1.5 text-foreground"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={weekdaysOnly}
                    onChange={(e) => setWeekdaysOnly(e.target.checked)}
                  />
                  Weekdays only (Mon-Fri)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className={tertiaryButtonClass}
                disabled={isGeneratingWeek}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onGenerateWeekOutfits()}
                disabled={isGeneratingWeek || !hasRequiredItems}
                className={primaryButtonClass}
              >
                {isGeneratingWeek ? 'Generating...' : 'Generate Outfits'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

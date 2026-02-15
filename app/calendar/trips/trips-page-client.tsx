'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, CloudSun, Loader2, MapPin, Plus, Trash2, X } from 'lucide-react';
import {
  useCreateTrip,
  useCreateTripDay,
  useCreateTripPackItem,
  useDeleteTrip,
  useDeleteTripDay,
  useDeleteTripPackItem,
  useFindTripOverlaps,
  useTripDetail,
  useTrips,
  useUpdateTrip,
  useUpdateTripDay,
  useUpdateTripPackItem,
} from '@/lib/hooks/use-trips';
import { useCalendarEntriesByMonth, useCreateCalendarEntry, useUpdateCalendarEntry } from '@/lib/hooks/use-calendar-entries';
import { useCreateOutfit, useOutfits } from '@/lib/hooks/use-outfits';
import { createClient } from '@/lib/supabase/client';
import { resolveCalendarWeather } from '@/lib/utils/calendar-weather';
import { generateOutfit } from '@/lib/services/outfit-generator';
import type { CalendarEntry, Outfit, TripDay, WardrobeItem } from '@/lib/types/database';
import type { WeatherResponse } from '@/lib/hooks/use-weather';
import { AIIcon } from '@/components/ai-icon';

type ExistingPolicy = 'skip' | 'overwrite';
type MixStrategy = 'saved-heavy' | 'balanced' | 'ai-heavy';

interface TripsPageClientProps {
  wardrobeItems: WardrobeItem[];
}

interface GeocodeCandidate {
  label: string;
  lat: number;
  lon: number;
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

function getDateKeysInRange(startDate: string, endDate: string): string[] {
  const results: string[] = [];
  const cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (cursor.getTime() <= end.getTime()) {
    results.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

function sanitizeTextOnly(value: string): string {
  return value.replace(/[^A-Za-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function toItemSetSignature(itemIds: string[]): string {
  return [...new Set(itemIds)].sort().join(',');
}

function getRecentEntrySignatures(entries: CalendarEntry[], lookbackDays: number, fromDate: Date): Set<string> {
  const signatures = new Set<string>();
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  for (const entry of entries) {
    const entryTime = new Date(`${entry.entry_date}T12:00:00`).getTime();
    if (entryTime < cutoff.getTime() || entryTime > fromDate.getTime()) continue;

    const signature = toItemSetSignature((entry.items || []).map((item) => item.id));
    if (signature) signatures.add(signature);
  }

  return signatures;
}

function getRecentWornItemIds(entries: CalendarEntry[], lookbackDays: number, fromDate: Date): Set<string> {
  const ids = new Set<string>();
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  for (const entry of entries) {
    if (entry.status !== 'worn') continue;
    const entryTime = new Date(`${entry.entry_date}T12:00:00`).getTime();
    if (entryTime < cutoff.getTime() || entryTime > fromDate.getTime()) continue;
    for (const item of entry.items || []) ids.add(item.id);
  }

  return ids;
}

function shouldPreferSavedOutfit(index: number, strategy: MixStrategy): boolean {
  if (strategy === 'saved-heavy') return true;
  if (strategy === 'ai-heavy') return index % 3 === 0;
  return index % 2 === 0;
}

const BUTTON_PRIMARY =
  'px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors';
const BUTTON_SECONDARY =
  'px-3 py-2 rounded-lg bg-card border border-border text-foreground hover:bg-secondary/70 hover:border-foreground/25 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors';
const BUTTON_SUBTLE =
  'text-xs px-2.5 py-1.5 rounded-md bg-card border border-border text-foreground hover:bg-secondary/70 hover:border-foreground/25 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 transition-colors';
const BUTTON_INLINE_SECONDARY =
  'text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground border border-border hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 font-medium transition-colors';
const BUTTON_INLINE_PRIMARY =
  'text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 font-semibold shadow-sm transition-colors';
const BUTTON_DANGER =
  'px-3 py-2 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-colors';

function OutfitThumbs({ items, outfitId }: { items: WardrobeItem[]; outfitId?: string }) {
  if (items.length === 0) return <div className="text-xs text-muted-foreground">No preview</div>;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {items.map((item) => {
        const thumb = (
          <div className="w-12 h-12 rounded bg-card border border-border overflow-hidden flex-shrink-0">
            {item.image_url ? (
              <Image src={item.image_url} alt={item.name} width={48} height={48} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground px-1 text-center">
                {(item.category?.name || item.name).slice(0, 7)}
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
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View outfit ${outfitId}`}
          >
            {thumb}
          </Link>
        );
      })}
    </div>
  );
}

function groupDaysByDate(days: TripDay[]): Array<{ date: string; slots: TripDay[] }> {
  const byDate = new Map<string, TripDay[]>();
  for (const day of days) {
    const list = byDate.get(day.day_date) || [];
    list.push(day);
    byDate.set(day.day_date, list);
  }

  return Array.from(byDate.entries())
    .map(([date, slots]) => ({ date, slots: slots.sort((a, b) => a.slot_number - b.slot_number) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchLocationForecast(lat: number, lon: number): Promise<WeatherResponse> {
  const response = await fetch(`/.netlify/functions/weather?lat=${lat}&lon=${lon}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to load destination weather');
  }

  return response.json() as Promise<WeatherResponse>;
}

export function TripsPageClient({ wardrobeItems }: TripsPageClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [tripName, setTripName] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [geocodeChoice, setGeocodeChoice] = useState<GeocodeCandidate | null>(null);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [existingPolicy, setExistingPolicy] = useState<ExistingPolicy>('skip');
  const [mixStrategy, setMixStrategy] = useState<MixStrategy>('balanced');
  const [lookbackDays, setLookbackDays] = useState(14);
  const [syncCalendar, setSyncCalendar] = useState(true);
  const [planningMessage, setPlanningMessage] = useState<string | null>(null);
  const [planningInFlight, setPlanningInFlight] = useState(false);
  const [planningProgress, setPlanningProgress] = useState<{
    completed: number;
    total: number;
    step: string;
  } | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [manualPackItem, setManualPackItem] = useState('');
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isEditingTripDates, setIsEditingTripDates] = useState(false);
  const [singleDayGeneratingId, setSingleDayGeneratingId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [dateEditWarning, setDateEditWarning] = useState<string | null>(null);
  const [dateEditError, setDateEditError] = useState<string | null>(null);

  const { data: trips = [], isLoading: isTripsLoading } = useTrips();
  const { data: outfits = [] } = useOutfits();
  const { data: calendarMonthData } = useCalendarEntriesByMonth({ month: new Date(), lookbackDays: 30 });
  const tripDetailQuery = useTripDetail(selectedTripId);

  const createTripMutation = useCreateTrip();
  const deleteTripMutation = useDeleteTrip();
  const createTripDayMutation = useCreateTripDay();
  const updateTripDayMutation = useUpdateTripDay();
  const deleteTripDayMutation = useDeleteTripDay();
  const updateTripMutation = useUpdateTrip();
  const createTripPackItemMutation = useCreateTripPackItem();
  const updateTripPackItemMutation = useUpdateTripPackItem();
  const deleteTripPackItemMutation = useDeleteTripPackItem();
  const createOutfitMutation = useCreateOutfit();
  const findTripOverlapsMutation = useFindTripOverlaps();
  const createCalendarEntryMutation = useCreateCalendarEntry();
  const updateCalendarEntryMutation = useUpdateCalendarEntry();

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id);
    }
  }, [selectedTripId, trips]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  useEffect(() => {
    if (!selectedTrip || selectedTrip.destination_lat == null || selectedTrip.destination_lon == null) {
      setWeatherData(null);
      setWeatherError(null);
      return;
    }

    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError(null);

    fetchLocationForecast(selectedTrip.destination_lat, selectedTrip.destination_lon)
      .then((data) => {
        if (cancelled) return;
        setWeatherData(data);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setWeatherError(error.message);
        setWeatherData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setWeatherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTrip]);

  useEffect(() => {
    if (!selectedTrip) return;
    setEditStartDate(selectedTrip.start_date);
    setEditEndDate(selectedTrip.end_date);
    setDateEditWarning(null);
    setDateEditError(null);
    setIsEditingTripDates(false);
  }, [selectedTrip]);

  const tripDetail = tripDetailQuery.data;
  const groupedTripDays = useMemo(() => groupDaysByDate(tripDetail?.days || []), [tripDetail?.days]);
  const calendarEntries = useMemo(() => calendarMonthData?.entries || [], [calendarMonthData?.entries]);

  const geocodeDestination = useCallback(async (queryText: string) => {
    const cleaned = queryText.trim();
    if (!cleaned) {
      setGeocodeMessage('Enter a destination first.');
      return null;
    }

    setGeocodeMessage('Looking up destination...');
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(cleaned)}`, { method: 'GET' });
    if (!response.ok) {
      setGeocodeMessage('Geocoding failed. Trip will use seasonal fallback weather until location resolves.');
      return null;
    }

    const payload = await response.json() as { best: GeocodeCandidate | null };
    if (!payload.best) {
      setGeocodeMessage('No location match found. Try adding state/country.');
      return null;
    }

    setGeocodeChoice(payload.best);
    setGeocodeMessage(`Using ${payload.best.label}`);
    return payload.best;
  }, []);

  const handleCreateTrip = async () => {
    setFormError(null);
    setFormWarning(null);

    try {
      const resolvedGeocode = geocodeChoice || await geocodeDestination(destinationText);
      const normalizedDestinationText = resolvedGeocode?.label || destinationText;

      const lat = Number(resolvedGeocode?.lat);
      const lon = Number(resolvedGeocode?.lon);
      const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);

      const overlaps = await findTripOverlapsMutation.mutateAsync({ startDate, endDate });
      if (overlaps.length > 0) {
        setFormWarning(`Warning: overlaps ${overlaps.length} existing trip(s).`);
      }

      const trip = await createTripMutation.mutateAsync({
        name: sanitizeTextOnly(tripName) || tripName,
        destination_text: normalizedDestinationText,
        destination_lat: hasCoordinates ? lat : undefined,
        destination_lon: hasCoordinates ? lon : undefined,
        start_date: startDate,
        end_date: endDate,
      });

      setSelectedTripId(trip.id);
      setTripName('');
      setDestinationText('');
      setStartDate('');
      setEndDate('');
      setGeocodeChoice(null);
      setGeocodeMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create trip';
      setFormError(message);
    }
  };

  const resolveTripDayWeather = useCallback((dayDate: string) => {
    const date = parseDateKey(dayDate);
    return resolveCalendarWeather(date, weatherData?.current || null, weatherData?.forecast || []);
  }, [weatherData]);

  const saveDayPlan = async (day: TripDay, outfit: Outfit | null, weatherContext?: Record<string, unknown>) => {
    const itemIds = outfit ? (outfit.items || []).map((item) => item.id) : (day.items || []).map((item) => item.id);

    await updateTripDayMutation.mutateAsync({
      id: day.id,
      outfit_id: outfit?.id,
      item_ids: itemIds,
      weather_context: weatherContext,
    });
  };

  const rebuildChecklist = async (detailOverride?: typeof tripDetail) => {
    const activeTripDetail = detailOverride || tripDetail;
    if (!activeTripDetail) return;

    const desiredFromOutfit = new Map<string, { itemId: string; label: string }>();
    for (const day of activeTripDetail.days) {
      for (const item of day.items || []) {
        desiredFromOutfit.set(item.id, { itemId: item.id, label: sanitizeTextOnly(item.name) || 'Wardrobe Item' });
      }
    }

    const existingFromOutfit = (activeTripDetail.pack_items || []).filter((item) => item.source === 'from_outfit');

    for (const existingItem of existingFromOutfit) {
      if (!existingItem.wardrobe_item_id || !desiredFromOutfit.has(existingItem.wardrobe_item_id)) {
        await deleteTripPackItemMutation.mutateAsync({ tripPackItemId: existingItem.id, tripId: activeTripDetail.id });
      }
    }

    for (const [itemId, desired] of desiredFromOutfit) {
      const existing = existingFromOutfit.find((item) => item.wardrobe_item_id === itemId);
      if (!existing) {
        await createTripPackItemMutation.mutateAsync({
          trip_id: activeTripDetail.id,
          wardrobe_item_id: desired.itemId,
          label: desired.label,
          source: 'from_outfit',
          packed: false,
        });
      } else if (existing.label !== desired.label) {
        await updateTripPackItemMutation.mutateAsync({
          id: existing.id,
          label: desired.label,
        });
      }
    }
  };

  const syncDayToCalendar = async (tripNameValue: string, day: TripDay, policy: ExistingPolicy) => {
    const weather = resolveTripDayWeather(day.day_date);
    const safeTripName = sanitizeTextOnly(tripNameValue);
    const tripNote = sanitizeTextOnly(`Trip ${safeTripName} slot ${day.slot_number}`) || `Trip slot ${day.slot_number}`;

    const { data: existingTripEntries, error: lookupError } = await supabase
      .from('calendar_entries')
      .select('id, weather_context')
      .eq('entry_date', day.day_date)
      .eq('status', 'planned')
      .contains('weather_context', { trip_day_id: day.id })
      .limit(1);

    if (lookupError) {
      throw new Error(`Failed to sync calendar entries: ${lookupError.message}`);
    }

    const itemIds = (day.items || []).map((item) => item.id);
    const payload = {
      entry_date: day.day_date,
      status: 'planned' as const,
      outfit_id: day.outfit_id || undefined,
      notes: tripNote,
      item_ids: itemIds,
      weather_context: {
        source: weather.source,
        condition: weather.condition,
        highTemp: weather.highTemp,
        lowTemp: weather.lowTemp,
        precipChance: weather.precipChance,
        trip_id: selectedTripId,
        trip_day_id: day.id,
      },
    };

    if (existingTripEntries && existingTripEntries.length > 0) {
      await updateCalendarEntryMutation.mutateAsync({ id: existingTripEntries[0].id, ...payload });
      return;
    }

    if (policy === 'skip') {
      const { data: existingSameDate } = await supabase
        .from('calendar_entries')
        .select('id')
        .eq('entry_date', day.day_date)
        .eq('status', 'planned')
        .limit(1);
      if ((existingSameDate || []).length > 0) return;
    }

    await createCalendarEntryMutation.mutateAsync(payload);
  };

  const handleGenerateTripPlan = async () => {
    if (!tripDetail || planningInFlight) return;
    setPlanningInFlight(true);
    setShowGenerateModal(false);
    setPlanningMessage(null);
    setPlanningProgress({
      completed: 0,
      total: tripDetail.days.length || 1,
      step: 'Preparing trip planner...',
    });

    try {
      const baseDate = new Date();
      const recentSignatures = getRecentEntrySignatures(calendarEntries, lookbackDays, baseDate);
      const excludedItemIds = getRecentWornItemIds(calendarEntries, lookbackDays, baseDate);
      let savedCount = 0;
      let generatedCount = 0;
      let skippedCount = 0;

      for (let index = 0; index < tripDetail.days.length; index++) {
        const day = tripDetail.days[index];
        setPlanningProgress({
          completed: index,
          total: tripDetail.days.length || 1,
          step: `Planning ${day.day_date} (slot ${day.slot_number})`,
        });
        const hasExisting = Boolean(day.outfit_id) || (day.items || []).length > 0;
        if (hasExisting && existingPolicy === 'skip') {
          skippedCount += 1;
          setPlanningProgress({
            completed: index + 1,
            total: tripDetail.days.length || 1,
            step: `Skipping ${day.day_date} (existing outfit)`,
          });
          continue;
        }

        const weather = resolveTripDayWeather(day.day_date);
        const preferSaved = shouldPreferSavedOutfit(index, mixStrategy);

        let pickedOutfit: Outfit | null = null;
        if (preferSaved) {
          pickedOutfit = outfits.find((outfit) => {
            const ids = (outfit.items || []).map((item) => item.id);
            const signature = toItemSetSignature(ids);
            return ids.length > 0 && !recentSignatures.has(signature);
          }) || null;
        }

        if (!pickedOutfit) {
          const generated = generateOutfit({
            wardrobeItems,
            weatherContext: weather.weatherContext,
            excludeItems: Array.from(excludedItemIds),
          });

          const createdOutfit = await createOutfitMutation.mutateAsync({
            items: generated.itemIds,
            source: 'generated',
            name: `AI Trip Plan ${tripDetail.name} ${day.day_date} #${day.slot_number}`,
            weight: 1,
            loved: false,
          });

          pickedOutfit = createdOutfit;
          generatedCount += 1;
          for (const itemId of generated.itemIds) excludedItemIds.add(itemId);
        } else {
          savedCount += 1;
        }

        const signature = toItemSetSignature((pickedOutfit.items || []).map((item) => item.id));
        if (signature) recentSignatures.add(signature);

        await saveDayPlan(day, pickedOutfit, {
          source: weather.source,
          condition: weather.condition,
          highTemp: weather.highTemp,
          lowTemp: weather.lowTemp,
          precipChance: weather.precipChance,
          generationType: pickedOutfit.source === 'generated' ? 'ai-custom' : 'saved',
        });
        setPlanningProgress({
          completed: index + 1,
          total: tripDetail.days.length || 1,
          step: `Saved ${day.day_date} (slot ${day.slot_number})`,
        });
      }

      if (syncCalendar) {
        setPlanningProgress((prev) => prev ? { ...prev, step: 'Syncing generated plan to calendar...' } : prev);
        const refreshedTrip = await tripDetailQuery.refetch();
        const latestTrip = refreshedTrip.data;
        if (latestTrip) {
          for (const day of latestTrip.days) {
            if ((day.items || []).length === 0) continue;
            await syncDayToCalendar(latestTrip.name, day, existingPolicy);
          }
        }
      }

      const finalTrip = (await tripDetailQuery.refetch()).data;
      setPlanningProgress((prev) => prev ? { ...prev, step: 'Rebuilding packing checklist...' } : prev);
      await rebuildChecklist(finalTrip);

      setPlanningMessage(
        `Planner updated (${savedCount} saved, ${generatedCount} AI generated, ${skippedCount} skipped).`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate trip plan.';
      setPlanningMessage(message);
    } finally {
      setPlanningInFlight(false);
      setPlanningProgress(null);
    }
  };

  const handleAssignExistingOutfit = async (day: TripDay, outfitId: string) => {
    const outfit = outfits.find((candidate) => candidate.id === outfitId);
    if (!outfit) return;

    const weather = resolveTripDayWeather(day.day_date);
    await saveDayPlan(day, outfit, {
      source: weather.source,
      condition: weather.condition,
      highTemp: weather.highTemp,
      lowTemp: weather.lowTemp,
      precipChance: weather.precipChance,
      generationType: 'saved',
    });
    await tripDetailQuery.refetch();
    setEditingDayId(null);
  };

  const handleGenerateSingleDay = async (day: TripDay) => {
    setSingleDayGeneratingId(day.id);
    setPlanningMessage(null);

    try {
      const weather = resolveTripDayWeather(day.day_date);
      const currentItemIds = (day.items || []).map((item) => item.id);
      const generated = generateOutfit({
        wardrobeItems,
        weatherContext: weather.weatherContext,
        // Prefer a visibly new combination when regenerating one slot.
        excludeItems: currentItemIds,
      });

      let targetOutfit: Outfit | null = null;
      try {
        targetOutfit = await createOutfitMutation.mutateAsync({
          items: generated.itemIds,
          source: 'generated',
          name: `AI Trip Plan ${tripDetail?.name || 'Trip'} ${day.day_date} #${day.slot_number}`,
          weight: 1,
          loved: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const duplicateDetected = message.toLowerCase().includes('already exists');
        if (!duplicateDetected) throw error;

        const generatedSignature = toItemSetSignature(generated.itemIds);
        targetOutfit = outfits.find(
          (outfit) => toItemSetSignature((outfit.items || []).map((item) => item.id)) === generatedSignature
        ) || null;
        if (!targetOutfit) throw error;
      }

      await saveDayPlan(day, targetOutfit, {
        source: weather.source,
        condition: weather.condition,
        highTemp: weather.highTemp,
        lowTemp: weather.lowTemp,
        precipChance: weather.precipChance,
        generationType: 'ai-custom',
      });

      await tripDetailQuery.refetch();
      setPlanningMessage(`Generated a new outfit for ${day.day_date} slot ${day.slot_number}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate slot outfit.';
      setPlanningMessage(message);
    } finally {
      setSingleDayGeneratingId(null);
    }
  };

  const handleAddSlot = async (date: string) => {
    if (!tripDetail) return;
    const dateSlots = tripDetail.days.filter((day) => day.day_date === date);
    const nextSlot = Math.max(0, ...dateSlots.map((day) => day.slot_number)) + 1;

    await createTripDayMutation.mutateAsync({
      trip_id: tripDetail.id,
      day_date: date,
      slot_number: nextSlot,
      slot_label: nextSlot === 2 ? 'Evening Event' : `Event ${nextSlot}`,
    });

    await tripDetailQuery.refetch();
  };

  const handleUpdateTripDates = async () => {
    if (!selectedTrip || !tripDetail) return;
    setDateEditWarning(null);
    setDateEditError(null);

    try {
      if (!editStartDate || !editEndDate) {
        throw new Error('Start and end dates are required.');
      }

      const overlaps = await findTripOverlapsMutation.mutateAsync({
        startDate: editStartDate,
        endDate: editEndDate,
        excludeTripId: selectedTrip.id,
      });
      if (overlaps.length > 0) {
        setDateEditWarning(`Warning: updated dates overlap ${overlaps.length} other trip(s).`);
      }

      await updateTripMutation.mutateAsync({
        id: selectedTrip.id,
        start_date: editStartDate,
        end_date: editEndDate,
      });

      const desiredDates = new Set(getDateKeysInRange(editStartDate, editEndDate));
      const daysToDelete = tripDetail.days.filter((day) => !desiredDates.has(day.day_date));

      for (const day of daysToDelete) {
        await deleteTripDayMutation.mutateAsync({ tripDayId: day.id, tripId: tripDetail.id });
      }

      const existingDates = new Set(tripDetail.days.filter((day) => desiredDates.has(day.day_date)).map((day) => day.day_date));
      for (const date of desiredDates) {
        if (existingDates.has(date)) continue;
        await createTripDayMutation.mutateAsync({
          trip_id: tripDetail.id,
          day_date: date,
          slot_number: 1,
        });
      }

      await tripDetailQuery.refetch();
      setIsEditingTripDates(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update trip dates.';
      setDateEditError(message);
    }
  };

  const hasRequiredItems = useMemo(() => {
    const names = new Set(wardrobeItems.map((item) => item.category?.name));
    return names.has('Shirt') && names.has('Pants') && names.has('Shoes');
  }, [wardrobeItems]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-1 mb-3">
            <Link href="/calendar" className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted">
              Calendar
            </Link>
            <span className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground">Trips</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Trip Planner</h1>
          <p className="text-muted-foreground mt-1">Plan trip outfits and packing with destination weather and seasonal fallback.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Create Trip</h2>

            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Trip name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder="Destination (city, state/country)"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
              />
              <button
                type="button"
                onClick={() => geocodeDestination(destinationText).catch(() => setGeocodeMessage('Geocoding failed.'))}
                className={BUTTON_SUBTLE}
              >
                <MapPin className="w-3 h-3" />
                Geocode destination
              </button>
              {geocodeMessage && <p className="text-xs text-muted-foreground">{geocodeMessage}</p>}
            </div>

            {formWarning && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                {formWarning}
              </div>
            )}
            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <button
              type="button"
              onClick={() => handleCreateTrip().catch(() => undefined)}
              disabled={createTripMutation.isPending}
              className={`w-full ${BUTTON_PRIMARY}`}
            >
              {createTripMutation.isPending ? 'Creating...' : 'Create Trip'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-foreground">Trips</h3>
            {isTripsLoading ? (
              <div className="text-sm text-muted-foreground">Loading trips...</div>
            ) : trips.length === 0 ? (
              <div className="text-sm text-muted-foreground">No trips yet.</div>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`w-full text-left border rounded-lg p-2.5 transition-colors ${selectedTripId === trip.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                  >
                    <p className="text-sm font-semibold text-foreground truncate">{trip.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{trip.destination_text}</p>
                    <p className="text-xs text-muted-foreground">{trip.start_date} to {trip.end_date}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedTrip && (
              <button
                type="button"
                onClick={() => {
                  deleteTripMutation.mutateAsync(selectedTrip.id)
                    .then(() => setSelectedTripId(''))
                    .catch(() => undefined);
                }}
                className={`w-full ${BUTTON_DANGER}`}
              >
                Delete Selected Trip
              </button>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {!selectedTripId ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              Select a trip to view planner.
            </div>
          ) : tripDetailQuery.isLoading ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading trip details...
            </div>
          ) : !tripDetail ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              Trip not found.
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{tripDetail.name}</h2>
                    <p className="text-sm text-muted-foreground">{tripDetail.destination_text} | {tripDetail.start_date} to {tripDetail.end_date}</p>
                    {isEditingTripDates ? (
                      <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2 max-w-sm">
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm text-xs"
                          />
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm text-xs"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateTripDates().catch(() => undefined)}
                            disabled={updateTripMutation.isPending || deleteTripDayMutation.isPending || createTripDayMutation.isPending}
                            className={BUTTON_SUBTLE}
                          >
                            Save dates
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingTripDates(false);
                              setEditStartDate(tripDetail.start_date);
                              setEditEndDate(tripDetail.end_date);
                              setDateEditWarning(null);
                              setDateEditError(null);
                            }}
                            className={BUTTON_SUBTLE}
                          >
                            Cancel
                          </button>
                        </div>
                        {dateEditWarning && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {dateEditWarning}
                          </p>
                        )}
                        {dateEditError && <p className="text-xs text-destructive">{dateEditError}</p>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingTripDates(true)}
                        className={`${BUTTON_SUBTLE} mt-2`}
                      >
                        Edit dates
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGenerateModal(true)}
                      disabled={!hasRequiredItems || planningInFlight}
                      className={BUTTON_PRIMARY}
                    >
                      <AIIcon className="w-4 h-4" />
                      {planningInFlight ? 'Generating...' : 'Generate Outfits'}
                    </button>
                    <button
                      type="button"
                      onClick={() => rebuildChecklist().catch(() => undefined)}
                      className={BUTTON_SECONDARY}
                    >
                      <Check className="w-4 h-4" />
                      Rebuild Checklist
                    </button>
                  </div>
                </div>
                {!hasRequiredItems && <p className="text-xs text-amber-600 dark:text-amber-400">Add Shirt, Pants, and Shoes to generate outfits.</p>}
                {planningInFlight && planningProgress && (
                  <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="inline-flex items-center gap-2 text-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating trip outfits...</span>
                      </div>
                      <span className="text-muted-foreground">
                        {planningProgress.completed}/{planningProgress.total}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${planningProgress.total > 0
                            ? (planningProgress.completed / planningProgress.total) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{planningProgress.step}</p>
                  </div>
                )}
                {planningMessage && <p className="text-sm text-foreground">{planningMessage}</p>}
                {weatherLoading && <p className="text-xs text-muted-foreground">Loading destination forecast...</p>}
                {weatherError && <p className="text-xs text-amber-600 dark:text-amber-400">{weatherError}. Seasonal fallback will still be used.</p>}
              </div>

              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">Planner</h3>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {tripDetail.days.length} slot(s)
                  </div>
                </div>
                {groupedTripDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No trip days yet.</p>
                ) : (
                  <div className="space-y-3">
                    {groupedTripDays.map(({ date, slots }) => (
                      <div key={date} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{parseDateKey(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                          <button
                            type="button"
                            onClick={() => handleAddSlot(date).catch(() => undefined)}
                            className={BUTTON_INLINE_SECONDARY}
                          >
                            <Plus className="w-3 h-3" />
                            Add slot
                          </button>
                        </div>

                        {slots.map((day) => {
                          const weather = resolveTripDayWeather(day.day_date);
                          return (
                            <div key={day.id} className="border border-border rounded-md p-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <CloudSun className="w-3.5 h-3.5" />
                                  Slot {day.slot_number}{day.slot_label ? ` - ${day.slot_label}` : ''} | {Math.round(weather.lowTemp)}F/{Math.round(weather.highTemp)}F | {weather.source === 'forecast' ? 'forecast' : 'seasonal fallback'}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateSingleDay(day).catch(() => undefined)}
                                    disabled={planningInFlight || singleDayGeneratingId === day.id}
                                    className={BUTTON_INLINE_PRIMARY}
                                  >
                                    {singleDayGeneratingId === day.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <AIIcon className="w-3 h-3" />
                                    )}
                                    {singleDayGeneratingId === day.id ? 'Generating...' : 'Generate'}
                                  </button>
                                  {day.slot_number > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => deleteTripDayMutation.mutateAsync({ tripDayId: day.id, tripId: day.trip_id }).catch(() => undefined)}
                                      className="text-xs px-2 py-1 rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center justify-center transition-colors"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm font-medium text-foreground">{day.outfit?.name || 'No outfit selected'}</p>
                              <OutfitThumbs items={day.items || []} outfitId={day.outfit_id || undefined} />

                              <div className="flex flex-wrap gap-1.5">
                                {(day.items || []).map((item) => (
                                  <span key={item.id} className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                                    {(item.category?.name || 'Item')}: {item.name}
                                  </span>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => setEditingDayId(editingDayId === day.id ? null : day.id)}
                                className={BUTTON_SUBTLE}
                              >
                                {editingDayId === day.id ? 'Close outfit picker' : 'Pick saved outfit'}
                              </button>

                              {editingDayId === day.id && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
                                  {outfits.map((outfit) => (
                                    <button
                                      key={outfit.id}
                                      type="button"
                                      onClick={() => handleAssignExistingOutfit(day, outfit.id).catch(() => undefined)}
                                      className={`text-left border rounded-md p-2 ${day.outfit_id === outfit.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                                    >
                                      <p className="text-sm font-medium text-foreground truncate">{outfit.name || `Outfit ${outfit.id.slice(0, 6)}`}</p>
                                      <OutfitThumbs items={outfit.items || []} />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-base font-semibold text-foreground">Packing Checklist</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualPackItem}
                    onChange={(e) => setManualPackItem(e.target.value.replace(/[^A-Za-z0-9\s]/g, '').slice(0, 120))}
                    placeholder="Add manual item (text and numbers only)"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!tripDetail) return;
                      const cleaned = sanitizeTextOnly(manualPackItem);
                      if (!cleaned) return;
                      createTripPackItemMutation.mutateAsync({
                        trip_id: tripDetail.id,
                        label: cleaned,
                        source: 'manual',
                        packed: false,
                      }).then(() => setManualPackItem('')).catch(() => undefined);
                    }}
                    className={BUTTON_SECONDARY}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {tripDetail.pack_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No checklist items yet. Generate planner then rebuild checklist.</p>
                ) : (
                  <div className="space-y-2">
                    {tripDetail.pack_items.map((item) => (
                      <div key={item.id} className="border border-border rounded-lg p-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.packed}
                            onChange={(e) => updateTripPackItemMutation.mutateAsync({ id: item.id, packed: e.target.checked }).catch(() => undefined)}
                          />
                          <span className={`text-sm truncate ${item.packed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.source === 'manual' ? 'manual' : 'from outfit'}</span>
                        </label>
                        {item.source === 'manual' && (
                          <button
                            type="button"
                            onClick={() => deleteTripPackItemMutation.mutateAsync({ tripPackItemId: item.id, tripId: item.trip_id }).catch(() => undefined)}
                            className="p-1.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Generate Outfits</h3>
                <p className="text-sm text-muted-foreground">Configure planning options, then generate trip outfits.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="rounded-md p-2 hover:bg-muted"
                aria-label="Close generate modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
              <div>
                <label htmlFor="trip-existing-policy" className="text-xs text-muted-foreground">Existing slots</label>
                <select
                  id="trip-existing-policy"
                  value={existingPolicy}
                  onChange={(e) => setExistingPolicy(e.target.value as ExistingPolicy)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
                >
                  <option value="skip">Skip existing</option>
                  <option value="overwrite">Overwrite existing</option>
                </select>
              </div>
              <div>
                <label htmlFor="trip-ai-mix" className="text-xs text-muted-foreground">AI mix</label>
                <select
                  id="trip-ai-mix"
                  value={mixStrategy}
                  onChange={(e) => setMixStrategy(e.target.value as MixStrategy)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
                >
                  <option value="saved-heavy">Saved heavy</option>
                  <option value="balanced">Balanced</option>
                  <option value="ai-heavy">AI heavy</option>
                </select>
              </div>
              <div>
                <label htmlFor="trip-lookback-days" className="text-xs text-muted-foreground">Repeat window</label>
                <select
                  id="trip-lookback-days"
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <label className="mt-5 inline-flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={syncCalendar} onChange={(e) => setSyncCalendar(e.target.checked)} />
                Sync planned outfits to calendar
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <button type="button" onClick={() => setShowGenerateModal(false)} className={BUTTON_SECONDARY}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleGenerateTripPlan().catch(() => undefined)}
                disabled={!hasRequiredItems || planningInFlight || updateTripDayMutation.isPending}
                className={BUTTON_PRIMARY}
              >
                <AIIcon className="w-4 h-4" />
                {planningInFlight ? 'Generating...' : 'Generate Outfits'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

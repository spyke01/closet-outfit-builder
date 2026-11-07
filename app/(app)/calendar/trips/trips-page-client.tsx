"use client";

import { PlanListSkeleton } from "@/components/page-skeletons";
import { LoadingStatus } from "@/components/loading-status";

import Image from "@/components/clothing-image";
import Link from "next/link";
import { hasCompleteOutfitItems } from "@/lib/utils/outfit-coverage";
import { PlannerTabs } from "@/components/planner-tabs";
import { AskSebastian } from "@/components/ask-sebastian";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Sun,
  Luggage,
  Settings2,
  Sparkles,
  Search,
  Check,
  CloudSun,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
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
} from "@/lib/hooks/use-trips";
import {
  useCalendarEntriesByMonth,
  useCreateCalendarEntry,
  useUpdateCalendarEntry,
} from "@/lib/hooks/use-calendar-entries";
import { useOutfits } from "@/lib/hooks/use-outfits";
import { createClient } from "@/lib/supabase/client";
import { resolveCalendarWeather } from "@/lib/utils/calendar-weather";
import { generateOutfit } from "@/lib/services/outfit-generator";
import type {
  CalendarEntry,
  TripDay,
  WardrobeItem,
} from "@/lib/types/database";
import type { WeatherResponse } from "@/lib/hooks/use-weather";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import {
  OutfitComposition,
  OutfitThumbnails,
} from "@/components/outfit-composition";
import { OutfitPieceList } from "@/components/outfit-piece-list";
import { localDateKey } from "@/lib/utils/local-date";
import {
  tripDateKeys,
  tripDayForecast,
  tripPackingRows,
  type PackingRow,
} from "@/lib/services/trips/presentation";

type PlannedLook = {
  id?: string;
  items?: WardrobeItem[];
  source?: "curated" | "generated";
};
type ExistingPolicy = "skip" | "overwrite";
type MixStrategy = "saved-heavy" | "balanced" | "ai-heavy";

interface TripsPageClientProps {
  wardrobeItems: WardrobeItem[];
}

interface GeocodeCandidate {
  label: string;
  lat: number;
  lon: number;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

function getDateKeysInRange(startDate: string, endDate: string): string[] {
  return tripDateKeys(startDate, endDate);
}

function sanitizeTextOnly(value: string): string {
  return value
    .replace(/[^A-Za-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toItemSetSignature(itemIds: string[]): string {
  return [...new Set(itemIds)].sort().join(",");
}

function getRecentEntrySignatures(
  entries: CalendarEntry[],
  lookbackDays: number,
  fromDate: Date,
): Set<string> {
  const signatures = new Set<string>();
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  for (const entry of entries) {
    const entryTime = new Date(`${entry.entry_date}T12:00:00`).getTime();
    if (entryTime < cutoff.getTime() || entryTime > fromDate.getTime())
      continue;

    const signature = toItemSetSignature(
      (entry.items || []).map((item) => item.id),
    );
    if (signature) signatures.add(signature);
  }

  return signatures;
}

function getRecentWornItemIds(
  entries: CalendarEntry[],
  lookbackDays: number,
  fromDate: Date,
): Set<string> {
  const ids = new Set<string>();
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  for (const entry of entries) {
    if (entry.status !== "worn") continue;
    const entryTime = new Date(`${entry.entry_date}T12:00:00`).getTime();
    if (entryTime < cutoff.getTime() || entryTime > fromDate.getTime())
      continue;
    for (const item of entry.items || []) ids.add(item.id);
  }

  return ids;
}

function shouldPreferSavedOutfit(
  index: number,
  strategy: MixStrategy,
): boolean {
  if (strategy === "saved-heavy") return true;
  if (strategy === "ai-heavy") return index % 3 === 0;
  return index % 2 === 0;
}

function groupDaysByDate(
  days: TripDay[],
): Array<{ date: string; slots: TripDay[] }> {
  const byDate = new Map<string, TripDay[]>();
  for (const day of days) {
    const list = byDate.get(day.day_date) || [];
    list.push(day);
    byDate.set(day.day_date, list);
  }

  return Array.from(byDate.entries())
    .map(([date, slots]) => ({
      date,
      slots: slots.sort((a, b) => a.slot_number - b.slot_number),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchLocationForecast(
  lat: number,
  lon: number,
): Promise<WeatherResponse> {
  const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to load destination weather");
  }

  return response.json() as Promise<WeatherResponse>;
}

export function TripsPageClient({ wardrobeItems }: TripsPageClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [view, setView] = useState<"outfits" | "packing">("outfits");
  const [activeDate, setActiveDate] = useState("");
  const [activeSlotId, setActiveSlotId] = useState("");
  const [outfitSearch, setOutfitSearch] = useState("");
  const [savingLookId, setSavingLookId] = useState<string | null>(null);
  const [packingBusy, setPackingBusy] = useState<string | null>(null);
  const [optimisticPacked, setOptimisticPacked] = useState<
    Record<string, boolean>
  >({});
  const [confirmation, setConfirmation] = useState<
    { kind: "trip" } | { kind: "look"; day: TripDay } | null
  >(null);
  const [confirmDateRemoval, setConfirmDateRemoval] = useState(false);
  const [weatherRetry, setWeatherRetry] = useState(0);
  const [today, setToday] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  useEffect(() => setToday(localDateKey(new Date())), []);
  const [tripName, setTripName] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [geocodeChoice, setGeocodeChoice] = useState<GeocodeCandidate | null>(
    null,
  );
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [existingPolicy, setExistingPolicy] = useState<ExistingPolicy>("skip");
  const [mixStrategy, setMixStrategy] = useState<MixStrategy>("balanced");
  const [lookbackDays, setLookbackDays] = useState(14);
  const [syncCalendar, setSyncCalendar] = useState(false);
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

  const [manualPackItem, setManualPackItem] = useState("");
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isEditingTripDates, setIsEditingTripDates] = useState(false);
  const [singleDayGeneratingId, setSingleDayGeneratingId] = useState<
    string | null
  >(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [dateEditWarning, setDateEditWarning] = useState<string | null>(null);
  const [dateEditError, setDateEditError] = useState<string | null>(null);

  const {
    data: trips = [],
    isPending: isTripsLoading,
    error: tripsError,
  } = useTrips();
  const { data: outfits = [] } = useOutfits();
  const { data: calendarMonthData } = useCalendarEntriesByMonth({
    month: new Date(),
    lookbackDays: 30,
  });
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
  const findTripOverlapsMutation = useFindTripOverlaps();
  const createCalendarEntryMutation = useCreateCalendarEntry();
  const updateCalendarEntryMutation = useUpdateCalendarEntry();

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(
        (
          trips.find((trip) => trip.end_date >= localDateKey(new Date())) ||
          trips[trips.length - 1]
        ).id,
      );
    }
  }, [selectedTripId, trips]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || null,
    [trips, selectedTripId],
  );

  const destinationLat = selectedTrip?.destination_lat;
  const destinationLon = selectedTrip?.destination_lon;
  const pastTrip = !!selectedTrip && selectedTrip.end_date < today;
  useEffect(() => {
    setWeatherData(null);
    if (destinationLat == null || destinationLon == null || pastTrip) {
      setWeatherData(null);
      setWeatherError(null);
      setWeatherLoading(false);
      return;
    }

    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError(null);

    fetchLocationForecast(destinationLat, destinationLon)
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
  }, [destinationLat, destinationLon, pastTrip, weatherRetry]);

  useEffect(() => {
    if (!selectedTrip) return;
    setEditStartDate(selectedTrip.start_date);
    setEditEndDate(selectedTrip.end_date);
    setDateEditWarning(null);
    setDateEditError(null);
    setIsEditingTripDates(false);
  }, [selectedTrip]);

  const tripDetail = tripDetailQuery.data;
  const groupedTripDays = useMemo(
    () => groupDaysByDate(tripDetail?.days || []),
    [tripDetail?.days],
  );
  const calendarEntries = useMemo(
    () => calendarMonthData?.entries || [],
    [calendarMonthData?.entries],
  );

  const geocodeDestination = useCallback(async (queryText: string) => {
    const cleaned = queryText.trim();
    if (!cleaned) {
      setGeocodeMessage("Enter a destination first.");
      return null;
    }

    setGeocodeMessage("Looking up destination...");
    const response = await fetch(
      `/api/geocode?q=${encodeURIComponent(cleaned)}`,
      { method: "GET" },
    );
    if (!response.ok) {
      setGeocodeMessage(
        "Destination could not be matched. Add a city and country to get local weather.",
      );
      return null;
    }

    const payload = (await response.json()) as {
      best: GeocodeCandidate | null;
    };
    if (!payload.best) {
      setGeocodeMessage("No location match found. Try adding state/country.");
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
      const resolvedGeocode =
        geocodeChoice || (await geocodeDestination(destinationText));
      const normalizedDestinationText =
        resolvedGeocode?.label || destinationText;

      const lat = Number(resolvedGeocode?.lat);
      const lon = Number(resolvedGeocode?.lon);
      const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);

      const overlaps = await findTripOverlapsMutation.mutateAsync({
        startDate,
        endDate,
      });
      if (overlaps.length > 0) {
        setFormWarning(
          `Warning: overlaps ${overlaps.length} existing trip(s).`,
        );
      }

      const trip = await createTripMutation.mutateAsync({
        name: tripName.trim() || normalizedDestinationText.slice(0, 100),
        destination_text: normalizedDestinationText,
        destination_lat: hasCoordinates ? lat : undefined,
        destination_lon: hasCoordinates ? lon : undefined,
        start_date: startDate,
        end_date: endDate,
      });

      setSelectedTripId(trip.id);
      setShowCreateTrip(false);
      setView("outfits");
      setPlanningMessage(
        overlaps.length
          ? "Trip created. Its dates overlap another trip."
          : "Trip created. Choose a day to start planning.",
      );
      setTripName("");
      setDestinationText("");
      setStartDate("");
      setEndDate("");
      setGeocodeChoice(null);
      setGeocodeMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create trip";
      setFormError(message);
    }
  };

  const resolveTripDayWeather = useCallback(
    (dayDate: string) => {
      const date = parseDateKey(dayDate);
      return resolveCalendarWeather(
        date,
        weatherData?.current || null,
        weatherData?.forecast || [],
      );
    },
    [weatherData],
  );

  const saveDayPlan = async (
    day: TripDay,
    outfit: PlannedLook | null,
    weatherContext?: Record<string, unknown>,
  ) => {
    const itemIds = outfit
      ? (outfit.items || []).map((item) => item.id)
      : (day.items || []).map((item) => item.id);

    await updateTripDayMutation.mutateAsync({
      id: day.id,
      outfit_id: outfit?.id || null,
      item_ids: itemIds,
      weather_context: weatherContext,
    });
  };

  const rebuildChecklist = async (detailOverride?: typeof tripDetail) => {
    const activeTripDetail = detailOverride || tripDetail;
    if (!activeTripDetail) return;

    const desiredFromOutfit = new Map<
      string,
      { itemId: string; label: string }
    >();
    for (const day of activeTripDetail.days) {
      for (const item of day.items || []) {
        desiredFromOutfit.set(item.id, {
          itemId: item.id,
          label: sanitizeTextOnly(item.name) || "Wardrobe Item",
        });
      }
    }

    const existingFromOutfit = (activeTripDetail.pack_items || []).filter(
      (item) => item.source === "from_outfit",
    );

    for (const existingItem of existingFromOutfit) {
      if (
        !existingItem.wardrobe_item_id ||
        !desiredFromOutfit.has(existingItem.wardrobe_item_id)
      ) {
        await deleteTripPackItemMutation.mutateAsync({
          tripPackItemId: existingItem.id,
          tripId: activeTripDetail.id,
        });
      }
    }

    for (const [itemId, desired] of desiredFromOutfit) {
      const existing = existingFromOutfit.find(
        (item) => item.wardrobe_item_id === itemId,
      );
      if (!existing) {
        await createTripPackItemMutation.mutateAsync({
          trip_id: activeTripDetail.id,
          wardrobe_item_id: desired.itemId,
          label: desired.label,
          source: "from_outfit",
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

  const syncDayToCalendar = async (
    tripNameValue: string,
    day: TripDay,
    policy: ExistingPolicy,
  ) => {
    const weather = resolveTripDayWeather(day.day_date);
    const safeTripName = sanitizeTextOnly(tripNameValue);
    const tripNote =
      sanitizeTextOnly(
        `Trip ${safeTripName} ${day.slot_label || `Look ${day.slot_number}`}`,
      ) || `Trip look ${day.slot_number}`;

    const { data: existingTripEntries, error: lookupError } = await supabase
      .from("calendar_entries")
      .select("id, weather_context")
      .eq("entry_date", day.day_date)
      .eq("status", "planned")
      .contains("weather_context", { trip_day_id: day.id })
      .limit(1);

    if (lookupError) {
      throw new Error(
        `Failed to sync calendar entries: ${lookupError.message}`,
      );
    }

    const itemIds = (day.items || []).map((item) => item.id);
    const payload = {
      entry_date: day.day_date,
      status: "planned" as const,
      outfit_id: day.outfit_id || null,
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
      await updateCalendarEntryMutation.mutateAsync({
        id: existingTripEntries[0].id,
        ...payload,
      });
      return;
    }

    if (policy === "skip") {
      const { data: existingSameDate } = await supabase
        .from("calendar_entries")
        .select("id")
        .eq("entry_date", day.day_date)
        .eq("status", "planned")
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
      step: "Preparing trip planner...",
    });

    try {
      const baseDate = new Date();
      const recentSignatures = getRecentEntrySignatures(
        calendarEntries,
        lookbackDays,
        baseDate,
      );
      const excludedItemIds = getRecentWornItemIds(
        calendarEntries,
        lookbackDays,
        baseDate,
      );
      let savedCount = 0;
      let generatedCount = 0;
      let skippedCount = 0;

      for (let index = 0; index < tripDetail.days.length; index++) {
        const day = tripDetail.days[index];
        setPlanningProgress({
          completed: index,
          total: tripDetail.days.length || 1,
          step: `Planning ${day.day_date} · look ${day.slot_number}`,
        });
        const hasExisting =
          Boolean(day.outfit_id) || (day.items || []).length > 0;
        if (hasExisting && existingPolicy === "skip") {
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

        let pickedOutfit: PlannedLook | null = null;
        if (preferSaved) {
          pickedOutfit =
            outfits.find((outfit) => {
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

          pickedOutfit = {
            source: "generated",
            items: wardrobeItems.filter((item) =>
              generated.itemIds.includes(item.id),
            ),
          };
          generatedCount += 1;
          for (const itemId of generated.itemIds) excludedItemIds.add(itemId);
        } else {
          savedCount += 1;
        }

        const signature = toItemSetSignature(
          (pickedOutfit.items || []).map((item) => item.id),
        );
        if (signature) recentSignatures.add(signature);

        await saveDayPlan(day, pickedOutfit, {
          source: weather.source,
          condition: weather.condition,
          highTemp: weather.highTemp,
          lowTemp: weather.lowTemp,
          precipChance: weather.precipChance,
          generationType:
            pickedOutfit.source === "generated" ? "ai-custom" : "saved",
        });
        setPlanningProgress({
          completed: index + 1,
          total: tripDetail.days.length || 1,
          step: `Saved ${day.day_date} · look ${day.slot_number}`,
        });
      }

      if (syncCalendar) {
        setPlanningProgress((prev) =>
          prev
            ? { ...prev, step: "Syncing generated plan to calendar..." }
            : prev,
        );
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
      setPlanningProgress((prev) =>
        prev ? { ...prev, step: "Rebuilding packing checklist..." } : prev,
      );
      await rebuildChecklist(finalTrip);

      setPlanningMessage(
        `Trip planned: ${savedCount} saved outfits, ${generatedCount} new combinations. ${skippedCount} existing looks kept.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate trip plan.";
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
      generationType: "saved",
    });
    const latest = (await tripDetailQuery.refetch()).data;
    if (latest) await rebuildChecklist(latest);
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

      const targetOutfit: PlannedLook = {
        source: "generated",
        items: wardrobeItems.filter((item) =>
          generated.itemIds.includes(item.id),
        ),
      };

      await saveDayPlan(day, targetOutfit, {
        source: weather.source,
        condition: weather.condition,
        highTemp: weather.highTemp,
        lowTemp: weather.lowTemp,
        precipChance: weather.precipChance,
        generationType: "ai-custom",
      });

      const latest = (await tripDetailQuery.refetch()).data;
      if (latest) await rebuildChecklist(latest);
      setPlanningMessage(
        `Created a new outfit for ${day.day_date}, look ${day.slot_number}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create this look.";
      setPlanningMessage(message);
    } finally {
      setSingleDayGeneratingId(null);
    }
  };

  const handleAddSlot = async (date: string) => {
    if (!tripDetail) return;
    const dateSlots = tripDetail.days.filter((day) => day.day_date === date);
    const occupied = new Set(dateSlots.map((day) => day.slot_number));
    const nextSlot = [1, 2, 3, 4, 5].find((slot) => !occupied.has(slot));
    if (!nextSlot) throw new Error("Each day can contain up to five looks.");
    const added = await createTripDayMutation.mutateAsync({
      trip_id: tripDetail.id,
      day_date: date,
      slot_number: nextSlot,
      slot_label:
        nextSlot === 1
          ? "Daytime"
          : nextSlot === 2
            ? "Evening"
            : `Look ${nextSlot}`,
    });

    setActiveSlotId(added.id);
    await tripDetailQuery.refetch();
  };

  const handleUpdateTripDates = async () => {
    if (!selectedTrip || !tripDetail) return;
    setDateEditWarning(null);
    setDateEditError(null);

    try {
      if (!editStartDate || !editEndDate) {
        throw new Error("Start and end dates are required.");
      }

      const overlaps = await findTripOverlapsMutation.mutateAsync({
        startDate: editStartDate,
        endDate: editEndDate,
        excludeTripId: selectedTrip.id,
      });
      if (overlaps.length > 0) {
        setDateEditWarning(
          `Warning: updated dates overlap ${overlaps.length} other trip(s).`,
        );
      }

      const destinationChanged =
        editDestination.trim() !== selectedTrip.destination_text;
      const resolved =
        destinationChanged || selectedTrip.destination_lat == null
          ? await geocodeDestination(editDestination)
          : null;
      await updateTripMutation.mutateAsync({
        id: selectedTrip.id,
        name: editTripName.trim(),
        start_date: editStartDate,
        end_date: editEndDate,
        ...(resolved
          ? {
              destination_text: resolved.label,
              destination_lat: resolved.lat,
              destination_lon: resolved.lon,
            }
          : destinationChanged
            ? {
                destination_text: editDestination.trim(),
                destination_lat: null,
                destination_lon: null,
              }
            : {}),
      });

      const desiredDates = new Set(
        getDateKeysInRange(editStartDate, editEndDate),
      );
      const daysToDelete = tripDetail.days.filter(
        (day) => !desiredDates.has(day.day_date),
      );

      for (const day of daysToDelete) {
        await deleteTripDayMutation.mutateAsync({
          tripDayId: day.id,
          tripId: tripDetail.id,
        });
      }

      const existingDates = new Set(
        tripDetail.days
          .filter((day) => desiredDates.has(day.day_date))
          .map((day) => day.day_date),
      );
      for (const date of desiredDates) {
        if (existingDates.has(date)) continue;
        await createTripDayMutation.mutateAsync({
          trip_id: tripDetail.id,
          day_date: date,
          slot_number: 1,
        });
      }

      const latest = (await tripDetailQuery.refetch()).data;
      if (latest) await rebuildChecklist(latest);
      setIsEditingTripDates(false);
      setPlanningMessage(
        overlaps.length
          ? "Dates updated. They overlap another trip."
          : "Trip dates updated.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update trip dates.";
      setDateEditError(message);
    }
  };

  const hasRequiredItems = useMemo(() => {
    return hasCompleteOutfitItems(wardrobeItems);
  }, [wardrobeItems]);

  const operationLock = useRef(false);
  const [editTripName, setEditTripName] = useState("");
  const [editDestination, setEditDestination] = useState("");
  useEffect(() => {
    setEditTripName(selectedTrip?.name || "");
    setEditDestination(selectedTrip?.destination_text || "");
    setConfirmDateRemoval(false);
    setOptimisticPacked({});
    setActiveSlotId("");
    setEditingDayId(null);
  }, [selectedTripId, selectedTrip?.name, selectedTrip?.destination_text]);
  const dates = useMemo(
    () =>
      tripDetail
        ? tripDateKeys(tripDetail.start_date, tripDetail.end_date)
        : [],
    [tripDetail],
  );
  const selectedDate = dates.includes(activeDate)
    ? activeDate
    : dates.find((date) => date >= today) || dates[0] || "";
  const daySlots =
    groupedTripDays.find((day) => day.date === selectedDate)?.slots || [];
  const selectedSlot =
    daySlots.find((day) => day.id === activeSlotId) || daySlots[0];
  const selectedForecast = tripDayForecast(
    selectedDate,
    weatherData,
    today,
  ).forecast;
  const packingRows = useMemo(
    () => tripPackingRows(tripDetail?.days || [], tripDetail?.pack_items || []),
    [tripDetail],
  );
  const packedCount = packingRows.filter(
    (row) => optimisticPacked[row.key] ?? row.packed,
  ).length;
  const plannedDays = dates.filter((date) => {
    const looks = tripDetail?.days.filter((day) => day.day_date === date) || [];
    return (
      looks.length > 0 && looks.every((day) => (day.items || []).length > 0)
    );
  }).length;
  const uniquePieces = packingRows.filter(
    (row) => row.source === "from_outfit",
  ).length;
  const busy =
    planningInFlight ||
    singleDayGeneratingId !== null ||
    savingLookId !== null ||
    packingBusy !== null;
  const newDates = tripDateKeys(editStartDate, editEndDate);
  const removedLooks =
    tripDetail?.days.filter(
      (day) => !newDates.includes(day.day_date) && (day.items || []).length > 0,
    ) || [];
  const editingDay = tripDetail?.days.find((day) => day.id === editingDayId);
  const filteredOutfits = outfits.filter((outfit) =>
    (outfit.name || "").toLowerCase().includes(outfitSearch.toLowerCase()),
  );
  const dateLabel = (date: string, weekday = false) =>
    parseDateKey(date).toLocaleDateString("en-US", {
      ...(weekday ? { weekday: "long" as const } : {}),
      month: "short",
      day: "numeric",
    });
  const slotLabel = (day: TripDay) =>
    day.slot_label ||
    (day.slot_number === 1 ? "Daytime" : `Look ${day.slot_number}`);
  const runAction = async (operation: () => Promise<unknown>) => {
    if (operationLock.current) return;
    operationLock.current = true;
    setSavingLookId("activity");
    setPlanningMessage(null);
    try {
      await operation();
    } catch (error) {
      setPlanningMessage(
        error instanceof Error
          ? error.message
          : "Could not save this change. Please try again.",
      );
    } finally {
      operationLock.current = false;
      setSavingLookId(null);
    }
  };
  const updatePacking = async (row: PackingRow, packed: boolean) => {
    if (!tripDetail) return;
    setPackingBusy(row.key);
    setOptimisticPacked((previous) => ({ ...previous, [row.key]: packed }));
    try {
      if (row.storedId)
        await updateTripPackItemMutation.mutateAsync({
          id: row.storedId,
          packed,
        });
      else
        await createTripPackItemMutation.mutateAsync({
          trip_id: tripDetail.id,
          wardrobe_item_id: row.item?.id,
          label: sanitizeTextOnly(row.label) || "Clothing piece",
          source: "from_outfit",
          packed,
        });
      await tripDetailQuery.refetch();
    } catch (error) {
      setOptimisticPacked((previous) => {
        const next = { ...previous };
        delete next[row.key];
        return next;
      });
      throw error;
    } finally {
      setPackingBusy(null);
    }
  };
  const selectDate = (date: string) => {
    setActiveDate(date);
    setActiveSlotId("");
  };
  const closeDetails = () => {
    if (busy) return;
    setEditStartDate(selectedTrip?.start_date || "");
    setEditEndDate(selectedTrip?.end_date || "");
    setEditTripName(selectedTrip?.name || "");
    setEditDestination(selectedTrip?.destination_text || "");
    setConfirmDateRemoval(false);
    setDateEditError(null);
    setIsEditingTripDates(false);
  };
  const openCreate = () => {
    setGeocodeChoice(null);
    setGeocodeMessage(null);
    setShowCreateTrip(true);
  };
  const field =
    "mt-2 block min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

  const tripSelector = (
    <label className="block min-w-0">
      <span className="sr-only">Your trip</span>
      <select
        aria-label="Choose a trip"
        className="trip-select"
        value={selectedTripId}
        disabled={busy}
        onChange={(event) => {
          setSelectedTripId(event.target.value);
          setActiveDate("");
          setView("outfits");
          setSyncCalendar(false);
        }}
      >
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {trip.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="page-shell-content page-shell-content--wide trip-workspace">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Trips & packing</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose what to wear. Take just what you need.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedTrip && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setIsEditingTripDates(true)}
            >
              <Settings2 size={15} />
              Trip details
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={openCreate}
            disabled={busy}
          >
            <Plus size={16} />
            New trip
          </Button>
        </div>
      </div>
      <PlannerTabs active="trips" />
      {tripsError ? (
        <div role="alert" className="trip-empty">
          Trips could not be loaded. Refresh the page to try again.
        </div>
      ) : isTripsLoading ? (
        <div className="space-y-4"><LoadingStatus label="your trips" /><PlanListSkeleton /></div>
      ) : trips.length === 0 ? (
        <section className="trip-empty">
          <Luggage size={38} className="text-primary" />
          <h2 className="font-display text-3xl">Where are you heading?</h2>
          <p>
            Start with a destination and dates. Plan a few looks, then check off
            your packing.
          </p>
          <Button onClick={openCreate}>Create your first trip</Button>
        </section>
      ) : (
        <>
          {tripDetailQuery.isLoading ? (
            <div className="space-y-4"><LoadingStatus label="your trip" /><PlanListSkeleton /></div>
          ) : tripDetailQuery.error || !tripDetail ? (
            <div role="alert" className="trip-empty">
              {tripSelector}This trip could not be loaded.{" "}
              <Button
                variant="outline"
                onClick={() => void tripDetailQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <section className="trip-overview">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin size={14} />
                    {tripDetail.destination_text}
                    {pastTrip && <span className="trip-badge">Past trip</span>}
                  </p>
                  {tripSelector}
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays size={15} />
                    {dateLabel(tripDetail.start_date)}–
                    {dateLabel(tripDetail.end_date)} · {dates.length}{" "}
                    {dates.length === 1 ? "day" : "days"}
                  </p>
                </div>
                <div className="trip-overview-actions">
                  <p className="mb-3 text-sm">
                    <strong>
                      {plannedDays} of {dates.length}
                    </strong>
                    <span className="text-muted-foreground">
                      {" "}
                      days planned · {uniquePieces} unique pieces
                    </span>
                  </p>
                  <Button
                    disabled={busy || !hasRequiredItems}
                    onClick={() => {
                      setExistingPolicy("skip");
                      setShowGenerateModal(true);
                    }}
                  >
                    <Sparkles size={16} />
                    {plannedDays === dates.length
                      ? "Plan trip outfits"
                      : "Fill unplanned days"}
                  </Button>
                </div>
              </section>
              {!hasRequiredItems && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Add a top, bottoms, and shoes, or a dress and shoes, to create
                  new looks. You can still choose saved outfits.
                </p>
              )}
              {planningProgress && (
                <div
                  role="status"
                  className="my-4 rounded-lg border border-border bg-[var(--accent-muted)] p-4"
                >
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Loader2 size={15} className="animate-spin" />
                      Planning your trip…
                    </span>
                    <span>
                      {planningProgress.completed}/{planningProgress.total}
                    </span>
                  </div>
                  <progress
                    className="h-2 w-full accent-[var(--primary)]"
                    value={planningProgress.completed}
                    max={planningProgress.total}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {planningProgress.step}
                  </p>
                </div>
              )}
              {planningMessage && (
                <p
                  role="status"
                  className="mt-4 rounded-lg border border-border px-4 py-3 text-sm"
                >
                  {planningMessage}
                </p>
              )}
              <div
                role="tablist"
                aria-label="Trip workspace"
                className="trip-view-tabs"
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "outfits"
                      : event.key === "End"
                        ? "packing"
                        : view === "outfits"
                          ? "packing"
                          : "outfits";
                  setView(next);
                  (
                    event.currentTarget.querySelector(
                      `[data-view="${next}"]`,
                    ) as HTMLButtonElement
                  )?.focus();
                }}
              >
                <button
                  role="tab"
                  type="button"
                  id="trip-outfits-tab"
                  data-view="outfits"
                  aria-selected={view === "outfits"}
                  aria-controls="trip-outfits-panel"
                  tabIndex={view === "outfits" ? 0 : -1}
                  onClick={() => setView("outfits")}
                >
                  Outfits by day
                  <span>
                    {plannedDays}/{dates.length}
                  </span>
                </button>
                <button
                  role="tab"
                  type="button"
                  id="trip-packing-tab"
                  data-view="packing"
                  aria-selected={view === "packing"}
                  aria-controls="trip-packing-panel"
                  tabIndex={view === "packing" ? 0 : -1}
                  onClick={() => setView("packing")}
                >
                  Packing list
                  <span>
                    {packedCount}/{packingRows.length}
                  </span>
                </button>
              </div>
              {view === "outfits" ? (
                <section
                  role="tabpanel"
                  id="trip-outfits-panel"
                  aria-labelledby="trip-outfits-tab"
                >
                  <div
                    className="trip-day-strip"
                    role="tablist"
                    aria-label="Trip days"
                    onKeyDown={(event) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          event.key,
                        )
                      )
                        return;
                      event.preventDefault();
                      const index = dates.indexOf(selectedDate);
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? dates.length - 1
                            : (index +
                                (event.key === "ArrowRight" ? 1 : -1) +
                                dates.length) %
                              dates.length;
                      selectDate(dates[next]);
                      const button =
                        event.currentTarget.querySelectorAll<HTMLButtonElement>(
                          '[role="tab"]',
                        )[next];
                      button?.focus();
                      button?.scrollIntoView({
                        block: "nearest",
                        inline: "nearest",
                      });
                    }}
                  >
                    {dates.map((date, index) => {
                      const forecast = tripDayForecast(
                        date,
                        weatherData,
                        today,
                      );
                      const looks = tripDetail.days.filter(
                        (day) =>
                          day.day_date === date && (day.items || []).length > 0,
                      ).length;
                      const rain =
                        forecast.forecast?.precipitationProbability || 0;
                      const Icon =
                        rain >= 0.4
                          ? CloudRain
                          : /clear|sun/i.test(
                                forecast.forecast?.condition || "",
                              )
                            ? Sun
                            : CloudSun;
                      return (
                        <button
                          key={date}
                          type="button"
                          role="tab"
                          id={`trip-date-${date}`}
                          aria-selected={selectedDate === date}
                          aria-controls="trip-day-panel"
                          tabIndex={selectedDate === date ? 0 : -1}
                          aria-label={`Day ${index + 1}, ${dateLabel(date, true)}, ${looks} planned ${looks === 1 ? "outfit" : "outfits"}`}
                          onClick={() => selectDate(date)}
                        >
                          <span className="trip-day-label">
                            {parseDateKey(date).toLocaleDateString("en-US", {
                              weekday: "short",
                            })}{" "}
                            <strong>{parseDateKey(date).getDate()}</strong>
                          </span>
                          <span className="trip-day-weather">
                            <Icon size={17} />
                            {forecast.forecast
                              ? `${Math.round(forecast.forecast.temperature.high)}° / ${Math.round(forecast.forecast.temperature.low)}°`
                              : forecast.kind === "past"
                                ? "Past date"
                                : weatherLoading
                                  ? "Loading…"
                                  : "Forecast pending"}
                          </span>
                          <span
                            className={`trip-day-status ${looks ? "is-planned" : ""}`}
                          >
                            {looks
                              ? `${looks} ${looks === 1 ? "look" : "looks"} planned`
                              : "Choose a look"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className="trip-day-layout"
                    id="trip-day-panel"
                    role="tabpanel"
                    aria-labelledby={`trip-date-${selectedDate}`}
                  >
                    <section className="min-w-0">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
                            Day {dates.indexOf(selectedDate) + 1} of{" "}
                            {dates.length}
                          </p>
                          <h3 className="font-display text-2xl">
                            {selectedDate
                              ? dateLabel(selectedDate, true)
                              : "Choose a day"}
                          </h3>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Previous trip day"
                            disabled={dates.indexOf(selectedDate) <= 0}
                            onClick={() =>
                              selectDate(dates[dates.indexOf(selectedDate) - 1])
                            }
                          >
                            <ChevronLeft size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Next trip day"
                            disabled={
                              dates.indexOf(selectedDate) === dates.length - 1
                            }
                            onClick={() =>
                              selectDate(dates[dates.indexOf(selectedDate) + 1])
                            }
                          >
                            <ChevronRight size={18} />
                          </Button>
                        </div>
                      </div>
                      {daySlots.length > 1 && (
                        <div
                          className="mb-4 flex flex-wrap gap-2"
                          aria-label="Looks for this day"
                        >
                          {daySlots.map((day) => (
                            <button
                              type="button"
                              key={day.id}
                              aria-pressed={selectedSlot?.id === day.id}
                              className={`trip-look-choice ${selectedSlot?.id === day.id ? "is-selected" : ""}`}
                              onClick={() => setActiveSlotId(day.id)}
                            >
                              {slotLabel(day)}
                              {(day.items || []).length > 0 && (
                                <Check size={12} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedSlot ? (
                        <article className="trip-outfit-card">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {slotLabel(selectedSlot)}
                              </p>
                              <h4 className="mt-1 text-lg font-medium">
                                {(selectedSlot.items || []).length
                                  ? selectedSlot.outfit?.name &&
                                    !/^AI Trip Plan/i.test(
                                      selectedSlot.outfit.name,
                                    )
                                    ? selectedSlot.outfit.name
                                    : "Your planned look"
                                  : "What would you like to wear?"}
                              </h4>
                            </div>
                            {selectedSlot.slot_number > 1 && (
                              <button
                                type="button"
                                className="icon-button text-muted-foreground"
                                disabled={busy}
                                aria-label={`Remove ${slotLabel(selectedSlot)} look`}
                                onClick={() =>
                                  setConfirmation({
                                    kind: "look",
                                    day: selectedSlot,
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          {(selectedSlot.items || []).length ? (
                            <>
                              <OutfitComposition
                                items={selectedSlot.items || []}
                              />
                              <OutfitPieceList
                                items={selectedSlot.items || []}
                              />
                            </>
                          ) : (
                            <div className="trip-look-empty">
                              <Luggage size={32} className="text-primary" />
                              <p>
                                Start with a saved outfit or make a new
                                combination from your wardrobe.
                              </p>
                            </div>
                          )}
                          <div className="mt-5 flex flex-wrap gap-2">
                            <Button
                              variant={
                                (selectedSlot.items || []).length
                                  ? "outline"
                                  : "default"
                              }
                              disabled={busy}
                              onClick={() => {
                                setOutfitSearch("");
                                setEditingDayId(selectedSlot.id);
                              }}
                            >
                              Choose saved outfit
                            </Button>
                            <Button
                              variant={
                                (selectedSlot.items || []).length
                                  ? "ghost"
                                  : "outline"
                              }
                              disabled={busy || !hasRequiredItems}
                              onClick={() =>
                                void runAction(() =>
                                  handleGenerateSingleDay(selectedSlot),
                                )
                              }
                            >
                              <Sparkles size={15} />
                              {singleDayGeneratingId === selectedSlot.id
                                ? "Creating…"
                                : (selectedSlot.items || []).length
                                  ? "Try another look"
                                  : "Make a look for me"}
                            </Button>
                          </div>
                          {selectedSlot.outfit_id && (
                            <Link
                              className="mt-3 inline-block text-xs text-primary"
                              href={`/outfits/${selectedSlot.outfit_id}`}
                            >
                              Open saved outfit ↗
                            </Link>
                          )}
                        </article>
                      ) : (
                        <div className="trip-outfit-card trip-look-empty">
                          <p>No look is set up for this day yet.</p>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void runAction(() => handleAddSlot(selectedDate))
                            }
                          >
                            Add a look
                          </Button>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || daySlots.length >= 5}
                          onClick={() =>
                            void runAction(() => handleAddSlot(selectedDate))
                          }
                        >
                          <Plus size={15} />
                          Add another look
                        </Button>
                        <AskSebastian
                          contextHints={{
                            tripId: tripDetail.id,
                            eventDate: selectedDate,
                            weather: selectedForecast
                              ? {
                                  source: "destination-forecast",
                                  condition: selectedForecast.condition,
                                  highTempF: selectedForecast.temperature.high,
                                  lowTempF: selectedForecast.temperature.low,
                                  precipChance: Math.min(
                                    100,
                                    (selectedForecast.precipitationProbability ||
                                      0) * 100,
                                  ),
                                }
                              : { source: "unavailable" },
                          }}
                          prompt={`Help me choose an outfit for ${dateLabel(selectedDate, true)} in ${tripDetail.destination_text} for my trip ${tripDetail.name}.`}
                        />
                      </div>
                    </section>
                    <aside className="trip-day-sidebar">
                      <TripWeatherPanel
                        date={selectedDate}
                        today={today}
                        destination={tripDetail.destination_text}
                        data={weatherData}
                        loading={weatherLoading}
                        error={weatherError}
                        hasLocation={
                          tripDetail.destination_lat != null &&
                          tripDetail.destination_lon != null
                        }
                        onRetry={() => setWeatherRetry((value) => value + 1)}
                        onEdit={() => setIsEditingTripDates(true)}
                      />
                      <section className="trip-packing-summary">
                        <Luggage size={20} className="text-primary" />
                        <h3 className="mt-3 font-display text-xl">
                          One bag, every look
                        </h3>
                        <p className="my-3 text-sm text-muted-foreground">
                          {uniquePieces
                            ? `${uniquePieces} unique pieces across your planned looks. Shared pieces appear once.`
                            : "Plan your first look and your clothing checklist will appear here."}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setView("packing")}
                        >
                          Open packing list <ChevronRight size={15} />
                        </Button>
                      </section>
                    </aside>
                  </div>
                </section>
              ) : (
                <section
                  role="tabpanel"
                  id="trip-packing-panel"
                  aria-labelledby="trip-packing-tab"
                  className="trip-packing-view"
                >
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl">
                        Your packing list
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Clothing comes from your planned looks. Add toiletries,
                        chargers, or anything else below.
                      </p>
                    </div>
                    <p className="text-sm">
                      <strong>
                        {packedCount} of {packingRows.length}
                      </strong>
                      <span className="text-muted-foreground"> packed</span>
                    </p>
                  </div>
                  <progress
                    aria-label="Packing progress"
                    className="mb-6 h-2 w-full accent-[var(--primary)]"
                    value={packedCount}
                    max={packingRows.length || 1}
                  />
                  {packingRows.length === 0 && (
                    <p className="mb-5 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                      Plan a look to add clothing automatically, or add an
                      essential below.
                    </p>
                  )}
                  <div className="trip-packing-groups">
                    {[
                      "Clothing & layers",
                      "Shoes & accessories",
                      "Other essentials",
                    ]
                      .filter((group) =>
                        packingRows.some((row) => row.group === group),
                      )
                      .map((group) => (
                        <section key={group} className="trip-packing-group">
                          <h4 className="mb-3 text-sm font-medium">
                            {group}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {
                                packingRows.filter((row) => row.group === group)
                                  .length
                              }
                            </span>
                          </h4>
                          <ul>
                            {packingRows
                              .filter((row) => row.group === group)
                              .map((row) => (
                                <li key={row.key} className="trip-pack-row">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={
                                        optimisticPacked[row.key] ?? row.packed
                                      }
                                      disabled={busy}
                                      onChange={(event) =>
                                        void runAction(() =>
                                          updatePacking(
                                            row,
                                            event.target.checked,
                                          ),
                                        )
                                      }
                                    />
                                    {row.item?.image_url && (
                                      <Image
                                        src={row.item.image_url}
                                        alt=""
                                        width={42}
                                        height={42}
                                        className="h-10 w-10 shrink-0 object-contain"
                                      />
                                    )}
                                    <span
                                      className={
                                        (optimisticPacked[row.key] ??
                                        row.packed)
                                          ? "line-through text-muted-foreground"
                                          : ""
                                      }
                                    >
                                      {row.label}
                                      {row.uses > 1 && (
                                        <small className="block text-[10px] text-muted-foreground">
                                          Used in {row.uses} looks
                                        </small>
                                      )}
                                    </span>
                                  </label>
                                  {row.source === "manual" && row.storedId && (
                                    <button
                                      type="button"
                                      aria-label={`Remove ${row.label} from packing list`}
                                      className="icon-button"
                                      disabled={busy}
                                      onClick={() =>
                                        void runAction(async () => {
                                          await deleteTripPackItemMutation.mutateAsync(
                                            {
                                              tripPackItemId: row.storedId!,
                                              tripId: tripDetail.id,
                                            },
                                          );
                                        })
                                      }
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </li>
                              ))}
                          </ul>
                        </section>
                      ))}
                  </div>
                  <form
                    className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const label = sanitizeTextOnly(manualPackItem);
                      if (!label) return;
                      void runAction(async () => {
                        await createTripPackItemMutation.mutateAsync({
                          trip_id: tripDetail.id,
                          label,
                          source: "manual",
                          packed: false,
                        });
                        setManualPackItem("");
                      });
                    }}
                  >
                    <label className="min-w-0 flex-1 text-sm">
                      Add another essential
                      <input
                        className={field}
                        value={manualPackItem}
                        onChange={(event) =>
                          setManualPackItem(event.target.value.slice(0, 120))
                        }
                        placeholder="For example, phone charger"
                        maxLength={120}
                      />
                    </label>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={busy || !sanitizeTextOnly(manualPackItem)}
                    >
                      <Plus size={16} />
                      Add item
                    </Button>
                  </form>
                </section>
              )}
            </>
          )}
        </>
      )}
      <AppDialog
        open={showCreateTrip}
        title="Create a trip"
        onClose={() => {
          if (!busy) setShowCreateTrip(false);
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(handleCreateTrip);
          }}
        >
          <p className="text-sm text-muted-foreground">
            A destination and dates are enough to get started.
          </p>
          <label className="block text-sm">
            Destination
            <input
              className={field}
              required
              maxLength={120}
              value={destinationText}
              placeholder="For example, Rome, Italy"
              onChange={(event) => {
                setDestinationText(event.target.value);
                setGeocodeChoice(null);
                setGeocodeMessage(null);
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Start date
              <input
                className={field}
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="text-sm">
              End date
              <input
                className={field}
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            Trip name · optional
            <input
              className={field}
              maxLength={100}
              value={tripName}
              onChange={(event) => setTripName(event.target.value)}
              placeholder="For example, A weekend in Rome"
            />
          </label>
          {geocodeMessage && (
            <p role="status" className="text-xs text-muted-foreground">
              {geocodeMessage}
            </p>
          )}
          {formWarning && (
            <p role="status" className="text-xs text-muted-foreground">
              {formWarning}
            </p>
          )}
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setShowCreateTrip(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                busy ||
                !destinationText.trim() ||
                !tripDateKeys(startDate, endDate).length
              }
            >
              {busy ? "Creating…" : "Create trip"}
            </Button>
          </div>
        </form>
      </AppDialog>
      <AppDialog
        open={isEditingTripDates}
        title="Trip details"
        onClose={closeDetails}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(handleUpdateTripDates);
          }}
        >
          <label className="block text-sm">
            Trip name
            <input
              className={field}
              required
              maxLength={100}
              value={editTripName}
              onChange={(event) => setEditTripName(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            Trip destination
            <input
              className={field}
              required
              maxLength={120}
              value={editDestination}
              onChange={(event) => setEditDestination(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Trip start date
              <input
                className={field}
                type="date"
                required
                value={editStartDate}
                onChange={(event) => {
                  setEditStartDate(event.target.value);
                  setConfirmDateRemoval(false);
                }}
              />
            </label>
            <label className="text-sm">
              Trip end date
              <input
                className={field}
                type="date"
                required
                min={editStartDate}
                value={editEndDate}
                onChange={(event) => {
                  setEditEndDate(event.target.value);
                  setConfirmDateRemoval(false);
                }}
              />
            </label>
          </div>
          {removedLooks.length > 0 && newDates.length > 0 && (
            <label className="flex items-start gap-3 rounded-lg border border-destructive/30 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmDateRemoval}
                onChange={(event) =>
                  setConfirmDateRemoval(event.target.checked)
                }
              />
              <span>
                Remove {removedLooks.length} planned{" "}
                {removedLooks.length === 1 ? "look" : "looks"} outside these
                dates. Looks within the new dates stay.
              </span>
            </label>
          )}
          {dateEditWarning && (
            <p role="status" className="text-xs text-muted-foreground">
              {dateEditWarning}
            </p>
          )}
          {dateEditError && (
            <p role="alert" className="text-sm text-destructive">
              {dateEditError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={closeDetails}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                busy ||
                !editTripName.trim() ||
                !editDestination.trim() ||
                !newDates.length ||
                (removedLooks.length > 0 && !confirmDateRemoval)
              }
            >
              {busy ? "Saving…" : "Save trip details"}
            </Button>
          </div>
          <div className="border-t border-border pt-4">
            <button
              type="button"
              className="text-xs text-destructive"
              disabled={busy}
              onClick={() => {
                setIsEditingTripDates(false);
                setConfirmation({ kind: "trip" });
              }}
            >
              Delete this trip
            </button>
          </div>
        </form>
      </AppDialog>
      <AppDialog
        open={showGenerateModal}
        title="Plan trip outfits"
        onClose={() => setShowGenerateModal(false)}
      >
        <p className="mb-5 text-sm text-muted-foreground">
          Make combinations from the pieces you own. Your packing list follows
          automatically. This uses no AI credits.
        </p>
        <div className="space-y-4">
          <label className="block text-sm">
            Which looks?
            <select
              className={field}
              value={existingPolicy}
              onChange={(event) =>
                setExistingPolicy(event.target.value as ExistingPolicy)
              }
            >
              <option value="skip">Only fill unplanned looks</option>
              <option value="overwrite">Replace all trip looks</option>
            </select>
          </label>
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer text-sm">
              More planning options
            </summary>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                Outfit sources
                <select
                  className={field}
                  value={mixStrategy}
                  onChange={(event) =>
                    setMixStrategy(event.target.value as MixStrategy)
                  }
                >
                  <option value="balanced">
                    Saved outfits and new combinations
                  </option>
                  <option value="saved-heavy">Prefer my saved outfits</option>
                  <option value="ai-heavy">Prefer new combinations</option>
                </select>
              </label>
              <label className="block text-sm">
                Avoid repeats from
                <select
                  className={field}
                  value={lookbackDays}
                  onChange={(event) =>
                    setLookbackDays(Number(event.target.value))
                  }
                >
                  <option value={7}>The last 7 days</option>
                  <option value={14}>The last 14 days</option>
                  <option value={30}>The last 30 days</option>
                </select>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={syncCalendar}
                  onChange={(event) => setSyncCalendar(event.target.checked)}
                />
                <span>Also add planned outfits to my calendar</span>
              </label>
            </div>
          </details>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !hasRequiredItems}
              onClick={() => void runAction(handleGenerateTripPlan)}
            >
              {existingPolicy === "skip"
                ? "Fill unplanned looks"
                : "Replace trip looks"}
            </Button>
          </div>
        </div>
      </AppDialog>
      <AppDialog
        open={!!editingDayId}
        title="Choose a saved outfit"
        onClose={() => {
          if (!busy) setEditingDayId(null);
        }}
      >
        <label className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search saved outfits"
            value={outfitSearch}
            onChange={(event) => setOutfitSearch(event.target.value)}
            placeholder="Search your saved outfits"
          />
        </label>
        <div className="max-h-[55vh] space-y-2 overflow-auto">
          {filteredOutfits.length ? (
            filteredOutfits.map((outfit) => (
              <button
                type="button"
                key={outfit.id}
                disabled={busy}
                className="trip-saved-choice"
                onClick={() => {
                  if (editingDay)
                    void runAction(() =>
                      handleAssignExistingOutfit(editingDay, outfit.id),
                    );
                }}
              >
                <OutfitThumbnails items={outfit.items || []} />
                <span className="min-w-0">
                  <strong className="block truncate text-sm font-medium">
                    {outfit.name || "Saved outfit"}
                  </strong>
                  <small className="text-muted-foreground">
                    {(outfit.items || []).length} pieces
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))
          ) : (
            <p className="py-5 text-sm text-muted-foreground">
              {outfits.length
                ? "No saved outfits match this search."
                : "Save an outfit first, or create a new combination for this day."}
            </p>
          )}
        </div>
      </AppDialog>
      <AppDialog
        open={!!confirmation}
        title={
          confirmation?.kind === "trip"
            ? "Delete this trip?"
            : "Remove this look?"
        }
        onClose={() => {
          if (!busy) setConfirmation(null);
        }}
      >
        <p className="text-sm text-muted-foreground">
          {confirmation?.kind === "trip"
            ? "This removes the trip, its planned looks, and its packing checklist. Your wardrobe, saved outfits, and existing calendar records stay."
            : "This removes this extra look from the trip. Your saved outfit and any existing calendar record stay."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setConfirmation(null)}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void runAction(async () => {
                if (confirmation?.kind === "trip" && selectedTrip) {
                  await deleteTripMutation.mutateAsync(selectedTrip.id);
                  setSelectedTripId("");
                } else if (confirmation?.kind === "look") {
                  await deleteTripDayMutation.mutateAsync({
                    tripDayId: confirmation.day.id,
                    tripId: confirmation.day.trip_id,
                  });
                  const latest = (await tripDetailQuery.refetch()).data;
                  if (latest) await rebuildChecklist(latest);
                  setActiveSlotId("");
                }
                setConfirmation(null);
              })
            }
          >
            {busy
              ? "Removing…"
              : confirmation?.kind === "trip"
                ? "Delete trip"
                : "Remove look"}
          </Button>
        </div>
      </AppDialog>
    </div>
  );
}

function TripWeatherPanel({
  date,
  today,
  destination,
  data,
  loading,
  error,
  hasLocation,
  onRetry,
  onEdit,
}: {
  date: string;
  today: string;
  destination: string;
  data: WeatherResponse | null;
  loading: boolean;
  error: string | null;
  hasLocation: boolean;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const { kind, forecast } = tripDayForecast(date, data, today);
  const rain = forecast?.precipitationProbability || 0;
  const Icon =
    rain >= 0.4 || /rain|storm/i.test(forecast?.condition || "")
      ? CloudRain
      : /sun|clear/i.test(forecast?.condition || "")
        ? Sun
        : CloudSun;
  return (
    <section
      className="trip-weather-panel"
      aria-label="Weather for selected trip day"
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Weather in {destination}
      </p>
      {forecast ? (
        <>
          <div className="my-4 flex items-center gap-4">
            <Icon size={42} className="text-primary" />
            <div>
              <strong className="block text-3xl font-medium">
                {Math.round(forecast.temperature.high)}°F
              </strong>
              <span className="text-sm text-muted-foreground">
                {forecast.condition}
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 border-y border-border py-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">High</dt>
              <dd className="mt-1">{Math.round(forecast.temperature.high)}°</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Low</dt>
              <dd className="mt-1">{Math.round(forecast.temperature.low)}°</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rain</dt>
              <dd className="mt-1">
                {Math.round(rain <= 1 ? rain * 100 : rain)}%
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm">
            {rain >= 0.4
              ? "Choose shoes and a layer that handle rain."
              : forecast.temperature.low < 50
                ? "Bring a layer for cooler mornings and evenings."
                : forecast.temperature.high >= 80
                  ? "Keep this look light and breathable."
                  : "A light layer gives you more options."}
          </p>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Forecast for this date · Weather can change.
          </p>
        </>
      ) : (
        <div className="pt-4">
          <CloudSun size={32} className="mb-3 text-primary" />
          <h4 className="text-sm font-medium">
            {kind === "past"
              ? "Forecasts aren’t available for past dates"
              : loading
                ? "Loading destination weather…"
                : !hasLocation
                  ? "Match your destination for local weather"
                  : error
                    ? "Forecast temporarily unavailable"
                    : "Forecast available closer to departure"}
          </h4>
          <p className="my-3 text-xs leading-relaxed text-muted-foreground">
            {kind === "past"
              ? "Your past outfits and packing list are still here."
              : "You can plan without a forecast. Outfit suggestions use a broad estimate; review layers before packing."}
          </p>
          {kind !== "past" &&
            !loading &&
            (hasLocation ? (
              error && (
                <Button variant="ghost" size="sm" onClick={onRetry}>
                  Retry forecast
                </Button>
              )
            ) : (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                Update destination
              </Button>
            ))}
        </div>
      )}
    </section>
  );
}

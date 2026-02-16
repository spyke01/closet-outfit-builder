import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssistantChatRequest, AssistantCitation, AssistantContextPack } from './types';
import { sanitizeContextValue } from './moderation';

const MAX_WARDROBE_ITEMS = 50;
const MAX_OUTFITS = 20;
const MAX_CALENDAR_ROWS = 30;
const MAX_TRIPS = 10;
const EVENT_WINDOW_DAYS_BEFORE = 7;
const EVENT_WINDOW_DAYS_AFTER = 21;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const clone = new Date(base);
  clone.setUTCDate(clone.getUTCDate() + days);
  return clone;
}

function parseIsoDate(dateText: string | null | undefined): Date | null {
  if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return null;
  }

  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function safeNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickWeatherContext(raw: unknown): AssistantContextPack['currentWeather'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  const source = sanitizeContextValue((payload.source as string | undefined) || null) || null;
  const condition = sanitizeContextValue((payload.condition as string | undefined) || null) || null;

  const highTemp = safeNumeric(payload.highTemp ?? payload.highTempF);
  const lowTemp = safeNumeric(payload.lowTemp ?? payload.lowTempF);
  const temperature = safeNumeric(payload.temperature ?? payload.temperatureF);

  const derivedTemp = temperature ?? (
    highTemp != null && lowTemp != null ? (highTemp + lowTemp) / 2 : null
  );

  return {
    source,
    condition,
    temperatureF: derivedTemp,
    highTempF: highTemp,
    lowTempF: lowTemp,
    precipChance: safeNumeric(payload.precipChance ?? payload.precipitationProbability),
    windSpeedMph: safeNumeric(payload.windSpeed ?? payload.windSpeedMph),
    humidityPct: safeNumeric(payload.humidity ?? payload.humidityPct),
  };
}

export async function buildAssistantContextPack(
  supabase: SupabaseClient,
  userId: string,
  request: AssistantChatRequest
): Promise<{ pack: AssistantContextPack; citations: AssistantCitation[] }> {
  const today = toIsoDate(new Date());
  const hintTripId = request.contextHints?.tripId;
  const hintEventDate = parseIsoDate(request.contextHints?.eventDate);

  let calendarQuery = supabase
    .from('calendar_entries')
    .select('id, entry_date, status, notes, outfit_id, weather_context')
    .eq('user_id', userId)
    .order('entry_date', { ascending: true })
    .limit(MAX_CALENDAR_ROWS);

  if (hintEventDate) {
    calendarQuery = calendarQuery
      .gte('entry_date', toIsoDate(addDays(hintEventDate, -EVENT_WINDOW_DAYS_BEFORE)))
      .lte('entry_date', toIsoDate(addDays(hintEventDate, EVENT_WINDOW_DAYS_AFTER)));
  } else {
    calendarQuery = calendarQuery.gte('entry_date', today);
  }

  let tripsQuery = supabase
    .from('trips')
    .select('id, name, destination_text, start_date, end_date')
    .eq('user_id', userId)
    .order('start_date', { ascending: true })
    .limit(MAX_TRIPS);

  if (hintTripId) {
    tripsQuery = tripsQuery.eq('id', hintTripId);
  } else {
    tripsQuery = tripsQuery.gte('end_date', today);
  }

  const [wardrobeResult, outfitResult, calendarResult, tripsResult] = await Promise.all([
    supabase
      .from('wardrobe_items')
      .select('id, name, color, season, formality_score, category:categories(name)')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(MAX_WARDROBE_ITEMS),
    supabase
      .from('outfits')
      .select('id, loved, created_at, outfit_items(item_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_OUTFITS),
    calendarQuery,
    tripsQuery,
  ]);

  const wardrobe = (wardrobeResult.data || []).slice(0, MAX_WARDROBE_ITEMS).map((item) => ({
    id: item.id as string,
    name: sanitizeContextValue(item.name as string),
    category: sanitizeContextValue(((item.category as { name?: string } | null)?.name) || 'Unknown'),
    color: sanitizeContextValue((item.color as string | null | undefined) || null) || null,
    season: (item.season as string[] | null | undefined) || null,
    formalityScore: (item.formality_score as number | null | undefined) || null,
  }));

  if (request.contextHints?.focusItemId) {
    const focusItemId = request.contextHints.focusItemId;
    wardrobe.sort((a, b) => Number(b.id === focusItemId) - Number(a.id === focusItemId));
  }

  const recentOutfits = (outfitResult.data || []).slice(0, MAX_OUTFITS).map((outfit) => ({
    id: outfit.id as string,
    loved: Boolean(outfit.loved),
    createdAt: outfit.created_at as string,
    itemIds: ((outfit.outfit_items as Array<{ item_id: string }> | null) || []).map((row) => row.item_id),
  }));

  const calendarMin = hintEventDate ? toIsoDate(addDays(hintEventDate, -EVENT_WINDOW_DAYS_BEFORE)) : today;
  const calendarMax = hintEventDate ? toIsoDate(addDays(hintEventDate, EVENT_WINDOW_DAYS_AFTER)) : null;

  const calendarWindow = (calendarResult.data || [])
    .map((entry) => ({
      id: entry.id as string,
      date: entry.entry_date as string,
      status: entry.status as 'planned' | 'worn',
      notes: sanitizeContextValue((entry.notes as string | null | undefined) || null) || null,
      outfitId: (entry.outfit_id as string | null | undefined) || null,
      weatherContext: pickWeatherContext(entry.weather_context),
    }))
    .filter((entry) => {
      if (entry.date < calendarMin) return false;
      if (calendarMax && entry.date > calendarMax) return false;
      return true;
    })
    .slice(0, MAX_CALENDAR_ROWS);

  const weatherFromCalendar = calendarWindow.find((entry) => entry.weatherContext)?.weatherContext || null;
  const weatherFromHint = pickWeatherContext(request.contextHints?.weather);

  const trips = (tripsResult.data || [])
    .filter((trip) => {
      const id = trip.id as string;
      const endDate = trip.end_date as string;
      if (hintTripId) return id === hintTripId;
      return endDate >= today;
    })
    .slice(0, MAX_TRIPS)
    .map((trip) => ({
    id: trip.id as string,
    name: sanitizeContextValue(trip.name as string),
    destinationText: sanitizeContextValue(trip.destination_text as string),
    startDate: trip.start_date as string,
    endDate: trip.end_date as string,
  }));

  const citations: AssistantCitation[] = [];
  for (const item of wardrobe.slice(0, 5)) {
    citations.push({ type: 'wardrobe_item', id: item.id });
  }
  for (const trip of trips.slice(0, 2)) {
    citations.push({ type: 'trip', id: trip.id });
  }

  return {
    pack: {
      userId,
      wardrobe,
      recentOutfits,
      calendarWindow,
      trips,
      currentWeather: weatherFromHint || weatherFromCalendar,
      hints: request.contextHints,
    },
    citations,
  };
}

export function summarizeContextForPrompt(pack: AssistantContextPack): string {
  const wardrobeSummary = pack.wardrobe.slice(0, 10)
    .map((item) => `${sanitizeContextValue(item.name)} (${sanitizeContextValue(item.category)}${item.color ? `, ${sanitizeContextValue(item.color)}` : ''})`)
    .join('; ');

  const tripSummary = pack.trips.slice(0, 3)
    .map((trip) => `${sanitizeContextValue(trip.name)}: ${sanitizeContextValue(trip.destinationText)} (${trip.startDate} to ${trip.endDate})`)
    .join('; ');

  const calendarSummary = pack.calendarWindow.slice(0, 5)
    .map((entry) => `${entry.date} ${entry.status}${entry.notes ? `: ${sanitizeContextValue(entry.notes)}` : ''}`)
    .join('; ');

  const weather = pack.currentWeather;
  const weatherSummary = weather
    ? [
      weather.condition ? `condition ${sanitizeContextValue(weather.condition)}` : null,
      weather.temperatureF != null ? `temp ${Math.round(weather.temperatureF)}F` : null,
      weather.highTempF != null && weather.lowTempF != null ? `range ${Math.round(weather.lowTempF)}-${Math.round(weather.highTempF)}F` : null,
      weather.precipChance != null ? `precip ${Math.round(weather.precipChance)}%` : null,
      weather.windSpeedMph != null ? `wind ${Math.round(weather.windSpeedMph)}mph` : null,
    ].filter(Boolean).join(', ')
    : null;

  return [
    `Wardrobe: ${wardrobeSummary || 'No wardrobe items available.'}`,
    `Recent outfits: ${pack.recentOutfits.length}`,
    `Calendar: ${calendarSummary || 'No upcoming calendar notes.'}`,
    `Trips: ${tripSummary || 'No upcoming trips.'}`,
    `Current weather: ${weatherSummary || 'No recent weather context available.'}`,
  ].join('\n');
}

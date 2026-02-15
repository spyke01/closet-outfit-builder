import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-client';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  CreateTripDayFormSchema,
  CreateTripFormSchema,
  CreateTripPackItemFormSchema,
  UpdateTripDayFormSchema,
  UpdateTripFormSchema,
  UpdateTripPackItemFormSchema,
} from '@/lib/schemas';
import type {
  Outfit,
  Trip,
  TripDay,
  TripPackItem,
  UpdateTripDayInput,
  UpdateTripInput,
  UpdateTripPackItemInput,
  CreateTripInput,
  CreateTripDayInput,
  CreateTripPackItemInput,
  WardrobeItem,
} from '@/lib/types/database';

const SAFE_LOCATION = /[^A-Za-z0-9\s,.-]/g;
const SAFE_SLOT_LABEL = /[^A-Za-z0-9\s]/g;
const SAFE_PACK_LABEL = /[^A-Za-z0-9\s]/g;

interface TripRow {
  id: string;
  user_id: string;
  name: string;
  destination_text: string;
  destination_lat: number | null;
  destination_lon: number | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

interface TripDayJoinRow {
  id: string;
  trip_id: string;
  day_date: string;
  slot_number: number;
  slot_label: string | null;
  weather_context: Record<string, unknown> | null;
  outfit_id: string | null;
  created_at: string;
  updated_at: string;
  outfit: Outfit | null;
  trip_day_items: Array<{ wardrobe_items: WardrobeItem | null }> | null;
}

interface TripPackJoinRow {
  id: string;
  trip_id: string;
  wardrobe_item_id: string | null;
  label: string;
  packed: boolean;
  source: 'from_outfit' | 'manual';
  created_at: string;
  updated_at: string;
  wardrobe_item: WardrobeItem | null;
}

export interface TripDetail extends Trip {
  days: TripDay[];
  pack_items: TripPackItem[];
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

function getTripLength(startDate: string, endDate: string): number {
  const start = parseDateKey(startDate).getTime();
  const end = parseDateKey(endDate).getTime();
  return Math.floor((end - start) / 86400000) + 1;
}

function sanitizeDestination(value: string): string {
  return value.replace(SAFE_LOCATION, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function sanitizeSlotLabel(value?: string): string | undefined {
  if (!value) return undefined;
  const sanitized = value.replace(SAFE_SLOT_LABEL, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return sanitized || undefined;
}

export function sanitizePackLabel(value: string): string {
  return value.replace(SAFE_PACK_LABEL, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function buildTripDayDates(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (cursor.getTime() <= end.getTime()) {
    result.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function normalizeTripDay(row: TripDayJoinRow): TripDay {
  return {
    id: row.id,
    trip_id: row.trip_id,
    day_date: row.day_date,
    slot_number: row.slot_number,
    slot_label: row.slot_label,
    weather_context: row.weather_context,
    outfit_id: row.outfit_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    outfit: row.outfit,
    items: row.trip_day_items?.map((item) => item.wardrobe_items).filter(Boolean) as WardrobeItem[] || [],
  };
}

function normalizePackItem(row: TripPackJoinRow): TripPackItem {
  return {
    id: row.id,
    trip_id: row.trip_id,
    wardrobe_item_id: row.wardrobe_item_id,
    label: row.label,
    packed: row.packed,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
    wardrobe_item: row.wardrobe_item,
  };
}

export function useTrips() {
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.trips.list(userId || 'anonymous'),
    enabled: isAuthenticated && !!userId,
    queryFn: async (): Promise<Trip[]> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch trips: ${error.message}`);
      }

      return (data || []) as Trip[];
    },
    staleTime: 60 * 1000,
  });
}

export function useTripDetail(tripId: string) {
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.trips.detail(tripId),
    enabled: isAuthenticated && !!userId && !!tripId,
    queryFn: async (): Promise<TripDetail> => {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) {
        throw new Error(`Failed to fetch trip: ${tripError.message}`);
      }

      const { data: dayData, error: dayError } = await supabase
        .from('trip_days')
        .select(`
          *,
          outfit:outfits(*),
          trip_day_items(
            wardrobe_items(
              *,
              category:categories(*)
            )
          )
        `)
        .eq('trip_id', tripId)
        .order('day_date', { ascending: true })
        .order('slot_number', { ascending: true });

      if (dayError) {
        throw new Error(`Failed to fetch trip days: ${dayError.message}`);
      }

      const { data: packData, error: packError } = await supabase
        .from('trip_pack_items')
        .select(`
          *,
          wardrobe_item:wardrobe_items(
            *,
            category:categories(*)
          )
        `)
        .eq('trip_id', tripId)
        .order('source', { ascending: true })
        .order('label', { ascending: true });

      if (packError) {
        throw new Error(`Failed to fetch packing checklist: ${packError.message}`);
      }

      return {
        ...(tripData as TripRow),
        days: ((dayData || []) as TripDayJoinRow[]).map(normalizeTripDay),
        pack_items: ((packData || []) as TripPackJoinRow[]).map(normalizePackItem),
      };
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTripInput): Promise<Trip> => {
      if (!userId) throw new Error('User not authenticated');

      const sanitizedDestination = sanitizeDestination(input.destination_text);
      const validated = CreateTripFormSchema.parse({
        ...input,
        destination_text: sanitizedDestination,
      });

      if (getTripLength(validated.start_date, validated.end_date) > 30) {
        throw new Error('Trip length cannot exceed 30 days.');
      }

      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({ ...validated, user_id: userId })
        .select('*')
        .single();

      if (tripError) {
        throw new Error(`Failed to create trip: ${tripError.message}`);
      }

      const tripDays = buildTripDayDates(validated.start_date, validated.end_date).map((dayDate) => ({
        trip_id: trip.id,
        day_date: dayDate,
        slot_number: 1,
      }));

      const { error: dayError } = await supabase
        .from('trip_days')
        .insert(tripDays);

      if (dayError) {
        await supabase.from('trips').delete().eq('id', trip.id);
        throw new Error(`Failed to initialize trip days: ${dayError.message}`);
      }

      return trip as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: UpdateTripInput): Promise<Trip> => {
      const sanitizedDestination = input.destination_text ? sanitizeDestination(input.destination_text) : undefined;
      const validated = UpdateTripFormSchema.parse({
        ...input,
        destination_text: sanitizedDestination,
      });

      const { id, ...updatePayload } = validated;

      if (updatePayload.start_date && updatePayload.end_date && getTripLength(updatePayload.start_date, updatePayload.end_date) > 30) {
        throw new Error('Trip length cannot exceed 30 days.');
      }

      const { data: updatedTrip, error } = await supabase
        .from('trips')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update trip: ${error.message}`);
      }

      return updatedTrip as Trip;
    },
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(trip.id) });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) {
        throw new Error(`Failed to delete trip: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
    },
  });
}

export function useCreateTripDay() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: CreateTripDayInput): Promise<TripDay> => {
      const validated = CreateTripDayFormSchema.parse({
        ...input,
        slot_label: sanitizeSlotLabel(input.slot_label),
      });

      const itemIds = validated.item_ids || [];
      const payload = { ...validated };
      delete payload.item_ids;

      const { data, error } = await supabase
        .from('trip_days')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create trip day slot: ${error.message}`);
      }

      if (itemIds.length > 0) {
        const rowPayload = itemIds.map((itemId) => ({
          trip_day_id: data.id,
          wardrobe_item_id: itemId,
        }));

        const { error: itemError } = await supabase
          .from('trip_day_items')
          .insert(rowPayload);

        if (itemError) {
          await supabase.from('trip_days').delete().eq('id', data.id);
          throw new Error(`Failed to save trip day items: ${itemError.message}`);
        }
      }

      return {
        ...data,
        items: [],
      } as TripDay;
    },
    onSuccess: (tripDay) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(tripDay.trip_id) });
    },
  });
}

export function useUpdateTripDay() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: UpdateTripDayInput): Promise<TripDay> => {
      const validated = UpdateTripDayFormSchema.parse({
        ...input,
        slot_label: sanitizeSlotLabel(input.slot_label),
      });

      const { id, item_ids, ...parsedPayload } = validated;
      const updatePayload = Object.fromEntries(
        Object.entries(parsedPayload).filter(([key]) => key in input)
      );

      const { data, error } = await supabase
        .from('trip_days')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update trip day: ${error.message}`);
      }

      if (Array.isArray(item_ids)) {
        const { error: deleteError } = await supabase
          .from('trip_day_items')
          .delete()
          .eq('trip_day_id', id);

        if (deleteError) {
          throw new Error(`Failed to refresh trip day items: ${deleteError.message}`);
        }

        if (item_ids.length > 0) {
          const payload = item_ids.map((itemId) => ({
            trip_day_id: id,
            wardrobe_item_id: itemId,
          }));

          const { error: insertError } = await supabase
            .from('trip_day_items')
            .insert(payload);

          if (insertError) {
            throw new Error(`Failed to save trip day items: ${insertError.message}`);
          }
        }
      }

      return {
        ...data,
        items: [],
      } as TripDay;
    },
    onSuccess: (tripDay) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(tripDay.trip_id) });
    },
  });
}

export function useDeleteTripDay() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ tripDayId, tripId }: { tripDayId: string; tripId: string }) => {
      const { error } = await supabase.from('trip_days').delete().eq('id', tripDayId);
      if (error) {
        throw new Error(`Failed to delete trip day slot: ${error.message}`);
      }
      return tripId;
    },
    onSuccess: (tripId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(tripId) });
    },
  });
}

export function useCreateTripPackItem() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: CreateTripPackItemInput): Promise<TripPackItem> => {
      const validated = CreateTripPackItemFormSchema.parse({
        ...input,
        label: sanitizePackLabel(input.label),
      });

      const { data, error } = await supabase
        .from('trip_pack_items')
        .insert(validated)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to create checklist item: ${error.message}`);
      }

      return data as TripPackItem;
    },
    onSuccess: (packItem) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(packItem.trip_id) });
    },
  });
}

export function useUpdateTripPackItem() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: UpdateTripPackItemInput): Promise<TripPackItem> => {
      const validated = UpdateTripPackItemFormSchema.parse({
        ...input,
        label: input.label ? sanitizePackLabel(input.label) : undefined,
      });

      const { id, ...payload } = validated;

      const { data, error } = await supabase
        .from('trip_pack_items')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update checklist item: ${error.message}`);
      }

      return data as TripPackItem;
    },
    onSuccess: (packItem) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(packItem.trip_id) });
    },
  });
}

export function useDeleteTripPackItem() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ tripPackItemId, tripId }: { tripPackItemId: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_pack_items')
        .delete()
        .eq('id', tripPackItemId);

      if (error) {
        throw new Error(`Failed to delete checklist item: ${error.message}`);
      }

      return tripId;
    },
    onSuccess: (tripId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.detail(tripId) });
    },
  });
}

export function useFindTripOverlaps() {
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async ({ startDate, endDate, excludeTripId }: { startDate: string; endDate: string; excludeTripId?: string }) => {
      if (!isAuthenticated || !userId) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('trips')
        .select('*')
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .order('start_date', { ascending: true });

      if (excludeTripId) {
        query = query.neq('id', excludeTripId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to check overlapping trips: ${error.message}`);
      }

      return (data || []) as Trip[];
    },
  });
}

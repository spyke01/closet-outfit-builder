import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  CreateCalendarEntryFormSchema,
  UpdateCalendarEntryFormSchema,
} from "@/lib/schemas";
import type {
  CalendarEntry,
  CreateCalendarEntryInput,
  UpdateCalendarEntryInput,
  Outfit,
  WardrobeItem,
} from "@/lib/types/database";

interface CalendarEntryJoinRow {
  id: string;
  user_id: string;
  entry_date: string;
  status: "planned" | "worn";
  outfit_id: string | null;
  notes: string | null;
  weather_context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  outfit: Outfit | null;
  calendar_entry_items: Array<{
    wardrobe_items: WardrobeItem | null;
  }> | null;
}

export interface UseCalendarMonthParams {
  month: Date;
  lookbackDays?: number;
}

export interface CalendarMonthResponse {
  entries: CalendarEntry[];
  wornEntriesThisMonth: number;
}

const CALENDAR_NOTE_ALLOWED = /[^A-Za-z0-9\s]/g;

function formatDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getMonthRange(month: Date, lookbackDays: number) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const fetchStart = new Date(monthStart);
  fetchStart.setDate(fetchStart.getDate() - lookbackDays);

  const fetchEnd = new Date(monthEnd);
  fetchEnd.setDate(fetchEnd.getDate() + lookbackDays);

  return {
    monthStart,
    monthEnd,
    fetchStart,
    fetchEnd,
  };
}

export function sanitizeCalendarNotes(notes?: string): string | undefined {
  if (!notes) {
    return undefined;
  }

  const sanitized = notes
    .replace(CALENDAR_NOTE_ALLOWED, "")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || undefined;
}

function normalizeCalendarRow(row: CalendarEntryJoinRow): CalendarEntry {
  return {
    id: row.id,
    user_id: row.user_id,
    entry_date: row.entry_date,
    status: row.status,
    outfit_id: row.outfit_id,
    notes: row.notes,
    weather_context: row.weather_context,
    created_at: row.created_at,
    updated_at: row.updated_at,
    outfit: row.outfit,
    items:
      (row.calendar_entry_items
        ?.map((entryItem) => entryItem.wardrobe_items)
        .filter(Boolean) as WardrobeItem[]) || [],
  };
}

export function useCalendarEntriesByMonth({
  month,
  lookbackDays = 7,
}: UseCalendarMonthParams) {
  const supabase = createClient();
  const { userId, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.calendar.month(
      userId || "anonymous",
      `${month.getFullYear()}-${month.getMonth() + 1}`,
    ),
    enabled: isAuthenticated && !!userId,
    queryFn: async (): Promise<CalendarMonthResponse> => {
      const { monthStart, monthEnd, fetchStart, fetchEnd } = getMonthRange(
        month,
        lookbackDays,
      );
      const { data, error } = await supabase
        .from("calendar_entries")
        .select(
          `
          *,
          outfit:outfits(*),
          calendar_entry_items(
            wardrobe_items(
              *,
              category:categories(*)
            )
          )
        `,
        )
        .eq("user_id", userId)
        .gte("entry_date", formatDate(fetchStart))
        .lte("entry_date", formatDate(fetchEnd))
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch calendar entries: ${error.message}`);
      }

      const entries = ((data || []) as CalendarEntryJoinRow[]).map(
        normalizeCalendarRow,
      );
      const monthStartKey = formatDate(monthStart);
      const monthEndKey = formatDate(monthEnd);
      const wornEntriesThisMonth = entries.filter(
        (entry) =>
          entry.status === "worn" &&
          entry.entry_date >= monthStartKey &&
          entry.entry_date <= monthEndKey,
      ).length;

      return {
        entries,
        wornEntriesThisMonth,
      };
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateCalendarEntry() {
  const pendingCreates = useRef(new Map<string, string>());
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateCalendarEntryInput,
    ): Promise<CalendarEntry> => {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const sanitizedNotes = sanitizeCalendarNotes(input.notes);
      const notes =
        input.notes !== undefined ? (sanitizedNotes ?? null) : undefined;
      const validated = CreateCalendarEntryFormSchema.parse({
        ...input,
        notes,
      });

      const { item_ids, request_id, ...payload } = validated;
      const snapshot = JSON.stringify(validated);
      const id =
        request_id ||
        pendingCreates.current.get(snapshot) ||
        crypto.randomUUID();
      pendingCreates.current.set(snapshot, id);
      const { data, error } = await supabase.rpc("save_calendar_entry", {
        p_id: id,
        p_payload: payload,
        p_items: [...new Set(item_ids || [])],
        p_create: true,
      });
      if (error || !data)
        throw new Error(
          "Could not save this calendar entry. Your previous plan is unchanged.",
        );
      pendingCreates.current.delete(snapshot);
      return { ...data, items: [] } as CalendarEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (
      input: UpdateCalendarEntryInput,
    ): Promise<CalendarEntry> => {
      const sanitizedNotes = sanitizeCalendarNotes(input.notes);
      const notes =
        input.notes !== undefined ? (sanitizedNotes ?? null) : undefined;
      const validated = UpdateCalendarEntryFormSchema.parse({
        ...input,
        notes,
      });

      const { id, item_ids, ...payload } = validated;
      delete payload.request_id;
      const { data, error } = await supabase.rpc("save_calendar_entry", {
        p_id: id,
        p_payload: payload,
        p_items: item_ids ? [...new Set(item_ids)] : null,
        p_create: false,
      });
      if (error || !data)
        throw new Error(
          "Could not update this calendar entry. Its previous pieces are unchanged.",
        );
      return { ...data, items: [] } as CalendarEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("calendar_entries")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(`Failed to delete calendar entry: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.outfits.all });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

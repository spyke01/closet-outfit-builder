import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AssistantBoardItem, AssistantBoardRecord, AssistantOutfitBoard } from "@/lib/types/assistant-outfit";
import { sanitizeContextValue } from "./moderation";

const ItemIds = z.array(z.string().uuid()).min(2).max(20).refine((ids) => new Set(ids).size === ids.length);
const Suggestion = z.object({ title: z.string().trim().min(1).max(80), itemIds: ItemIds });
const RecordSchema = Suggestion.extend({ id: z.string().min(1).max(100), focusItemId: z.string().uuid().optional() });
export const BOARD_ITEM_COLUMNS = "id,name,color,brand,material,image_url,category_id,category:categories(name)";

export function parseOutfitBoards(text: string, key: string, focusItemId?: string) {
  const records: AssistantBoardRecord[] = [];
  const signatures = new Set<string>();
  const clean = text.replace(/<outfit-board>([\s\S]*?)(?:<\/outfit-board>|$)/gi, (_block, json: string) => {
    if (records.length >= 3 || json.length > 4000) return "";
    try {
      const parsed = Suggestion.safeParse(JSON.parse(json.trim()));
      if (!parsed.success) return "";
      const suggestion = parsed.data;
      if (focusItemId && !suggestion.itemIds.includes(focusItemId)) return "";
      const signature = [...suggestion.itemIds].sort().join(",");
      if (signatures.has(signature)) return "";
      signatures.add(signature);
      records.push({ ...suggestion, title: sanitizeContextValue(suggestion.title).slice(0, 80) || "Your outfit", id: `${key}:${records.length + 1}`, ...(focusItemId ? { focusItemId } : {}) });
    } catch { /* Ignore malformed or truncated tool data; retain the advice. */ }
    return "";
  }).trim();
  return { text: clean || (records.length ? "Here are the pieces for your look. Open an outfit to try swaps or save it." : "I couldn’t assemble that photo board. Ask me for another combination using pieces from your wardrobe."), records };
}

export function boardItem(row: Record<string, unknown>): AssistantBoardItem {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string | null,
    brand: row.brand as string | null,
    material: row.material as string | null,
    imageUrl: row.image_url as string | null,
    categoryId: row.category_id as string,
    category: (row.category as { name?: string } | null)?.name || "Other",
  };
}

export function readBoardRecords(value: unknown): AssistantBoardRecord[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((record) => {
    const parsed = RecordSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Resolve every image from the signed-in owner's active wardrobe. Drop a whole
 * suggestion if even one reference is unavailable instead of misrepresenting it. */
export async function hydrateOutfitBoards(db: SupabaseClient, userId: string, records: AssistantBoardRecord[]): Promise<AssistantOutfitBoard[]> {
  const valid = records.slice(0, 180).flatMap((record) => {
    const parsed = RecordSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
  const ids = [...new Set(valid.flatMap((record) => record.itemIds))];
  if (!ids.length) return [];
  // Bound each URL even when hydrating a long conversation.
  const results = await Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => db.from("wardrobe_items").select(BOARD_ITEM_COLUMNS).eq("user_id", userId).eq("active", true).in("id", ids.slice(index * 100, index * 100 + 100))));
  if (results.some((result) => result.error)) throw new Error("Unable to load outfit photos");
  const owned = new Map(results.flatMap((result) => result.data || []).map((row) => [row.id, boardItem(row)]));
  return valid.filter((record) => record.itemIds.every((id) => owned.has(id)) && (!record.focusItemId || record.itemIds.includes(record.focusItemId))).map((record) => ({ id: record.id, title: record.title, focusItemId: record.focusItemId, items: record.itemIds.map((id) => owned.get(id)!) }));
}

export async function prepareOutfitReply(db: SupabaseClient, userId: string, raw: string, key: string, focusItemId?: string) {
  const parsed = parseOutfitBoards(raw, key, focusItemId);
  const boards = await hydrateOutfitBoards(db, userId, parsed.records);
  const accepted = new Set(boards.map((board) => board.id));
  return { text: parsed.text, boards, records: parsed.records.filter((record) => accepted.has(record.id)) };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveUserEntitlements } from "@/lib/services/billing/entitlements";
import type { AnalyticsDashboardResponse, BasicAnalyticsPreview } from "@/lib/types/analytics";
import type { InsightItem, WearEvent, WearInsights } from "./wear-insights";
import { summarizeWearInsights } from "./wear-insights";

async function allRows<T>(
  query: (
    start: number,
    end: number,
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < 100_000; offset += 1000) {
    const { data, error } = await query(offset, offset + 999);
    if (error)
      throw new Error("Could not load your analytics. Please try again.");
    rows.push(...((data || []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
  throw new Error("Your history is too large to load in this view.");
}
export async function loadAnalyticsDashboard(
  db: SupabaseClient,
  userId: string,
): Promise<AnalyticsDashboardResponse> {
  const [entitlement, itemsCount, outfitsCount] = await Promise.all([
    resolveUserEntitlements(db, userId),
    db
      .from("wardrobe_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("active", true),
    db
      .from("outfits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  if (itemsCount.error || outfitsCount.error)
    throw new Error("Could not load your wardrobe totals.");
  const basics = {
    totalItems: itemsCount.count || 0,
    totalOutfits: outfitsCount.count || 0,
  };
  if (!entitlement.isPaid) {
    const asOf = new Date().toISOString().slice(0, 10);
    const start = new Date(`${asOf}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 29);
    const [items, history] = await Promise.all([
      allRows<{ id: string; name: string; image_url: string | null; purchase_price: number | null; created_at: string; category: {name: string} | null }>((start, end) => db.from('wardrobe_items').select('id,name,image_url,purchase_price,created_at,category:categories(name)').eq('user_id', userId).eq('active', true).order('id').range(start, end)),
      db.from('calendar_entries').select('id,entry_date,outfit:outfits(name)', {count:'exact'}).eq('user_id', userId).eq('status', 'worn').gte('entry_date', start.toISOString().slice(0,10)).lte('entry_date', asOf).order('entry_date', {ascending:false}).limit(3),
    ]);
    if (history.error) throw new Error('Could not load your recent wear history.');
    const categories = new Map<string, number>();
    for (const item of items) {
      const name = item.category?.name || 'Other';
      categories.set(name, (categories.get(name) || 0) + 1);
    }
    const preview: BasicAnalyticsPreview = {
      items: [...items].sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,3).map(item => ({id:item.id,name:item.name,imageUrl:item.image_url,category:item.category?.name || 'Other'})),
      categories: [...categories].map(([name,count]) => ({name,count})).sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)),
      recentWears: (history.data || []).map(entry => ({id:entry.id,date:entry.entry_date,name:(entry.outfit as unknown as {name:string} | null)?.name || 'Recorded outfit'})),
      wearCount: history.count || 0,
      pricedCount: items.filter(item => item.purchase_price !== null).length,
    };
    return {
      wardrobe: { ...basics, recentlyAdded: null, mostWorn: null },
      engagement: null,
      tier: "free",
      preview,
    };
  }
  type ItemRow = {
    id: string;
    name: string;
    image_url: string | null;
    active: boolean;
    purchase_price: number | string | null;
    purchase_currency: string;
    created_at: string;
    category: { name: string } | null;
  };
  type EntryRow = {
    id: string;
    entry_date: string;
    outfit: { name: string | null } | null;
    calendar_entry_items: Array<{ wardrobe_item_id: string }> | null;
  };
  const asOf = new Date().toISOString().slice(0, 10);
  const [itemRows, entryRows, outfitRows, recommendations] = await Promise.all([
    allRows<ItemRow>((start, end) =>
      db
        .from("wardrobe_items")
        .select(
          "id,name,image_url,active,purchase_price,purchase_currency,created_at,category:categories(name)",
        )
        .eq("user_id", userId)
        .order("id")
        .range(start, end),
    ),
    allRows<EntryRow>((start, end) =>
      db
        .from("calendar_entries")
        .select(
          "id,entry_date,outfit:outfits(name),calendar_entry_items(wardrobe_item_id)",
        )
        .eq("user_id", userId)
        .eq("status", "worn")
        .lte("entry_date", asOf)
        .order("id")
        .range(start, end),
    ),
    allRows<{
      id: string;
      name: string;
      loved: boolean;
      score: number | null;
      created_at: string;
    }>((start, end) =>
      db
        .from("outfits")
        .select("id,name,loved,score,created_at")
        .eq("user_id", userId)
        .order("id")
        .range(start, end),
    ),
    allRows<{ user_saved: boolean }>((start, end) =>
      db
        .from("today_ai_outfits")
        .select("id,user_saved")
        .eq("user_id", userId)
        .order("id")
        .range(start, end),
    ),
  ]);
  const items: InsightItem[] = itemRows.map((item) => ({
    id: item.id,
    name: item.name,
    imageUrl: item.image_url,
    category: item.category?.name || "Other",
    active: item.active,
    price:
      item.purchase_price !== null &&
      Number.isFinite(Number(item.purchase_price))
        ? Number(item.purchase_price)
        : null,
    currency: item.purchase_currency || "USD",
    createdAt: item.created_at,
  }));
  const ownedIds = new Set(items.map((item) => item.id));
  const wears: WearEvent[] = entryRows.map((entry) => ({
    id: entry.id,
    date: entry.entry_date,
    name: entry.outfit?.name || "Recorded outfit",
    itemIds: [
      ...new Set(
        (entry.calendar_entry_items || [])
          .map((row) => row.wardrobe_item_id)
          .filter((id) => ownedIds.has(id)),
      ),
    ],
  }));
  const insights: WearInsights = { items, wears, asOf };
  const summary = summarizeWearInsights(insights, "all");
  return {
    wardrobe: {
      ...basics,
      recentlyAdded: items
        .filter((item) => item.active)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
      mostWorn: summary.active
        .filter((item) => item.lifetimeWears > 0)
        .sort((a, b) => b.lifetimeWears - a.lifetimeWears)
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          appearanceCount: item.lifetimeWears,
        })),
    },
    engagement: {
      savedOutfits: basics.totalOutfits,
      lovedOutfits: outfitRows.filter((row) => row.loved).length,
      outfitHistory: outfitRows
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 10)
        .map((row) => ({
          id: row.id,
          name: row.name,
          loved: row.loved,
          score: row.score,
          createdAt: row.created_at,
        })),
      todayStats: {
        totalRecommendations: recommendations.length,
        accepted: recommendations.filter((row) => row.user_saved).length,
        acceptanceRate: recommendations.length
          ? recommendations.filter((row) => row.user_saved).length /
            recommendations.length
          : 0,
      },
    },
    insights,
  };
}

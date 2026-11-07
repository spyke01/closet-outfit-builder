export interface InsightItem {
  id: string;
  name: string;
  color?: string | null;
  brand?: string | null;
  material?: string | null;
  imageUrl: string | null;
  category: string;
  active: boolean;
  price: number | null;
  currency: string;
  createdAt: string;
}
export interface WearEvent {
  id: string;
  date: string;
  name: string;
  itemIds: string[];
}
export interface WearInsights {
  items: InsightItem[];
  wears: WearEvent[];
  asOf: string;
}
export type InsightPeriod = "30" | "90" | "365" | "all";

/** Plans and saved outfits never enter this function. Callers supply confirmed wears. */
export function summarizeWearInsights(
  data: WearInsights,
  period: InsightPeriod,
) {
  const end = data.asOf;
  const startDate = new Date(`${end}T12:00:00Z`);
  if (period !== "all")
    startDate.setUTCDate(startDate.getUTCDate() - Number(period) + 1);
  const start =
    period === "all" ? "0000-01-01" : startDate.toISOString().slice(0, 10);
  const lifetimeCounts = new Map<string, number>(),
    periodCounts = new Map<string, number>(),
    lastWorn = new Map<string, string>();
  const owned = new Set(data.items.map((item) => item.id));
  const lifetimeWears = data.wears.filter((wear) => wear.date <= end);
  const wears = lifetimeWears.filter((wear) => wear.date >= start);
  for (const wear of lifetimeWears)
    for (const id of new Set(wear.itemIds)) {
      if (!owned.has(id)) continue;
      lifetimeCounts.set(id, (lifetimeCounts.get(id) || 0) + 1);
      if (wear.date >= start)
        periodCounts.set(id, (periodCounts.get(id) || 0) + 1);
      if ((lastWorn.get(id) || "") < wear.date) lastWorn.set(id, wear.date);
    }
  const items = data.items.map((item) => {
    const lifetimeWears = lifetimeCounts.get(item.id) || 0;
    return {
      ...item,
      periodWears: periodCounts.get(item.id) || 0,
      lifetimeWears,
      lastWorn: lastWorn.get(item.id) || null,
      costPerWear:
        item.price !== null && lifetimeWears > 0
          ? item.price / lifetimeWears
          : null,
    };
  });
  const active = items.filter((item) => item.active);
  const used = active.filter((item) => item.periodWears > 0);
  const categories = [...new Set(active.map((item) => item.category))].map(
    (name) => ({
      name,
      owned: active.filter((item) => item.category === name).length,
      worn: used.filter((item) => item.category === name).length,
    }),
  );
  const currencies = [
    ...new Set(
      active.filter((item) => item.price !== null).map((item) => item.currency),
    ),
  ].map((currency) => ({
    currency,
    total: active
      .filter((item) => item.currency === currency && item.price !== null)
      .reduce((sum, item) => sum + item.price!, 0),
  }));
  return {
    start,
    end,
    items,
    active,
    used,
    categories,
    currencies,
    wears,
    wearCount: wears.length,
    daysWorn: new Set(wears.map((wear) => wear.date)).size,
    coverage: active.length ? used.length / active.length : 0,
    pricedCount: active.filter((item) => item.price !== null).length,
  };
}

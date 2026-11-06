import type { WeatherResponse } from "@/lib/hooks/use-weather";
import type { TripDay, TripPackItem, WardrobeItem } from "@/lib/types/database";

export function tripDateKeys(start: string, end: string): string[] {
  const first = new Date(start + "T00:00:00Z"),
    last = new Date(end + "T00:00:00Z");
  const length = Math.round((last.getTime() - first.getTime()) / 86400000) + 1;
  if (!Number.isFinite(length) || length < 1 || length > 30) return [];
  return Array.from({ length }, (_, index) =>
    new Date(first.getTime() + index * 86400000).toISOString().slice(0, 10),
  );
}

export function tripDayForecast(
  date: string,
  weather: WeatherResponse | null,
  today: string,
) {
  if (date < today) return { kind: "past" as const, forecast: null };
  const forecast = weather?.forecast?.find(
    (day) => day.date.slice(0, 10) === date,
  );
  return forecast
    ? { kind: "forecast" as const, forecast }
    : { kind: "pending" as const, forecast: null };
}

export type PackingRow = {
  key: string;
  storedId?: string;
  label: string;
  item?: WardrobeItem;
  packed: boolean;
  source: "from_outfit" | "manual";
  uses: number;
  group: string;
};
/** Build the current list without writing just because someone opens a trip. */
export function tripPackingRows(
  days: TripDay[],
  stored: TripPackItem[],
): PackingRow[] {
  const pieces = new Map<string, { item: WardrobeItem; uses: number }>();
  for (const day of days) {
    for (const item of new Map(
      (day.items || []).map((item) => [item.id, item]),
    ).values()) {
      const previous = pieces.get(item.id);
      pieces.set(item.id, { item, uses: (previous?.uses || 0) + 1 });
    }
  }
  const rows: PackingRow[] = [...pieces.values()].map(({ item, uses }) => {
    const saved = stored.find(
      (row) => row.source === "from_outfit" && row.wardrobe_item_id === item.id,
    );
    const category = item.category?.name.toLowerCase() || "";
    return {
      key: item.id,
      storedId: saved?.id,
      label: item.name,
      item,
      packed: saved?.packed || false,
      source: "from_outfit",
      uses,
      group:
        /shoe|boot|sneaker|loafer|belt|watch|accessor|jewel|hat|scarf/.test(
          category,
        )
          ? "Shoes & accessories"
          : "Clothing & layers",
    };
  });
  rows.push(
    ...stored
      .filter((row) => row.source === "manual")
      .map((row) => ({
        key: row.id,
        storedId: row.id,
        label: row.label,
        packed: row.packed,
        source: "manual" as const,
        uses: 0,
        group: "Other essentials",
      })),
  );
  return rows;
}

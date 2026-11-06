import { describe, expect, it } from "vitest";
import {
  tripDateKeys,
  tripDayForecast,
  tripPackingRows,
} from "../presentation";
import type { TripDay, TripPackItem, WardrobeItem } from "@/lib/types/database";

describe("trip presentation", () => {
  it("keeps calendar dates inclusive across DST and bounds the maximum trip length", () => {
    expect(tripDateKeys("2026-03-07", "2026-03-09")).toEqual([
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
    ]);
    expect(tripDateKeys("2026-11-06", "2026-11-06")).toEqual(["2026-11-06"]);
    expect(tripDateKeys("2026-11-06", "2026-12-06")).toEqual([]);
    expect(tripDateKeys("2026-11-06", "2026-11-05")).toEqual([]);
    expect(tripDateKeys("", "")).toEqual([]);
  });
  it("does not present a neutral temperature or historical date as a real forecast", () => {
    expect(tripDayForecast("2026-02-16", null, "2026-11-06").kind).toBe("past");
    expect(tripDayForecast("2026-12-16", null, "2026-11-06")).toEqual({
      kind: "pending",
      forecast: null,
    });
    const forecast = {
      date: "2026-11-07",
      temperature: { high: 62, low: 48 },
      condition: "Rain",
      icon: "10d",
      precipitationProbability: 0.6,
    };
    expect(
      tripDayForecast(
        "2026-11-07",
        { forecast: [forecast] } as never,
        "2026-11-06",
      ),
    ).toEqual({ kind: "forecast", forecast });
  });
  it("deduplicates planned clothing, retains packed state, and preserves manual essentials", () => {
    const shirt = {
      id: "shirt",
      name: "Blue shirt",
      category: { name: "Shirt" },
    } as WardrobeItem;
    const watch = {
      id: "watch",
      name: "Watch",
      category: { name: "Watch" },
    } as WardrobeItem;
    const days = [
      { items: [shirt, shirt, watch] },
      { items: [shirt] },
    ] as TripDay[];
    const stored = [
      {
        id: "packed-shirt",
        wardrobe_item_id: shirt.id,
        source: "from_outfit",
        packed: true,
        label: "Older name",
      },
      {
        id: "stale",
        wardrobe_item_id: "not-planned-anymore",
        source: "from_outfit",
        packed: true,
        label: "Removed piece",
      },
      {
        id: "charger",
        source: "manual",
        packed: false,
        label: "Phone charger",
      },
    ] as TripPackItem[];
    const rows = tripPackingRows(days, stored);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      key: shirt.id,
      label: "Blue shirt",
      uses: 2,
      packed: true,
      storedId: "packed-shirt",
      group: "Clothing & layers",
    });
    expect(rows[1]).toMatchObject({
      key: watch.id,
      uses: 1,
      group: "Shoes & accessories",
    });
    expect(rows[2]).toMatchObject({
      label: "Phone charger",
      source: "manual",
      group: "Other essentials",
    });
    expect(stored).toHaveLength(3);
  });
});

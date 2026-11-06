import { describe, expect, it } from "vitest";
import { summarizeWearInsights, type WearInsights } from "../wear-insights";
const data: WearInsights = {
  asOf: "2026-11-06",
  items: [
    {
      id: "shirt",
      name: "Shirt",
      category: "Shirt",
      active: true,
      imageUrl: null,
      price: 100,
      currency: "USD",
      createdAt: "2025-01-01",
    },
    {
      id: "belt",
      name: "Belt",
      category: "Belt",
      active: true,
      imageUrl: null,
      price: null,
      currency: "USD",
      createdAt: "2025-01-01",
    },
    {
      id: "coat",
      name: "Coat",
      category: "Jacket",
      active: true,
      imageUrl: null,
      price: 80,
      currency: "EUR",
      createdAt: "2025-01-01",
    },
    {
      id: "free",
      name: "Gift",
      category: "Accessories",
      active: true,
      imageUrl: null,
      price: 0,
      currency: "USD",
      createdAt: "2025-01-01",
    },
    {
      id: "archived",
      name: "Old shirt",
      category: "Shirt",
      active: false,
      imageUrl: null,
      price: 20,
      currency: "USD",
      createdAt: "2025-01-01",
    },
  ],
  wears: [
    { id: "old", date: "2026-01-01", name: "Old outfit", itemIds: ["shirt"] },
    {
      id: "morning",
      date: "2026-11-05",
      name: "Morning",
      itemIds: ["shirt", "shirt", "belt", "free", "foreign", "archived"],
    },
    { id: "evening", date: "2026-11-05", name: "Evening", itemIds: ["shirt"] },
    {
      id: "future",
      date: "2026-12-01",
      name: "Incorrect future wear",
      itemIds: ["coat"],
    },
  ],
};
describe("confirmed wear analytics", () => {
  it("counts each piece once per entry, keeps multiple outfits per day, and excludes future records", () => {
    const result = summarizeWearInsights(data, "30");
    expect(result.wearCount).toBe(2);
    expect(result.daysWorn).toBe(1);
    expect(result.items.find((item) => item.id === "shirt")).toMatchObject({
      periodWears: 2,
      lifetimeWears: 3,
      lastWorn: "2026-11-05",
    });
    expect(result.items.find((item) => item.id === "coat")?.lifetimeWears).toBe(
      0,
    );
  });
  it("uses lifetime wears for cost per wear and preserves unknown and zero prices", () => {
    const result = summarizeWearInsights(data, "30");
    expect(
      result.items.find((item) => item.id === "shirt")?.costPerWear,
    ).toBeCloseTo(100 / 3);
    expect(
      result.items.find((item) => item.id === "belt")?.costPerWear,
    ).toBeNull();
    expect(
      result.items.find((item) => item.id === "coat")?.costPerWear,
    ).toBeNull();
    expect(result.items.find((item) => item.id === "free")?.costPerWear).toBe(
      0,
    );
  });
  it("keeps archived history while limiting wardrobe coverage and value to active pieces", () => {
    const result = summarizeWearInsights(data, "all");
    expect(result.active).toHaveLength(4);
    expect(result.used).toHaveLength(3);
    expect(result.pricedCount).toBe(3);
    expect(result.currencies).toEqual([
      { currency: "USD", total: 100 },
      { currency: "EUR", total: 80 },
    ]);
  });
  it("handles empty history without pretending a wardrobe is worn", () => {
    const result = summarizeWearInsights({ ...data, wears: [] }, "30");
    expect(result.wearCount).toBe(0);
    expect(result.coverage).toBe(0);
    expect(result.items.every((item) => item.costPerWear === null)).toBe(true);
  });
});

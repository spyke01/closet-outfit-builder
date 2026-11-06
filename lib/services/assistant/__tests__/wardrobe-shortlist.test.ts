import { describe, expect, it } from "vitest";
import { balancedWardrobeShortlist } from "../wardrobe-shortlist";

describe("wardrobe context shortlist", () => {
  it("retains footwear and accessories when tops dominate the stored order", () => {
    const items = [
      ...Array.from({ length: 150 }, (_, id) => ({ id, category: "Shirt" })),
      { id: 150, category: "Pants" },
      { id: 151, category: "Shoes" },
      { id: 152, category: "Belt" },
    ];
    const selected = balancedWardrobeShortlist(
      items,
      50,
      (item) => item.category,
    );
    expect(selected).toHaveLength(50);
    expect(selected.slice(0, 4).map((item) => item.category)).toEqual([
      "Shirt",
      "Pants",
      "Shoes",
      "Belt",
    ]);
    expect(items).toHaveLength(153);
    expect(balancedWardrobeShortlist([], 50, () => "")).toEqual([]);
  });
});

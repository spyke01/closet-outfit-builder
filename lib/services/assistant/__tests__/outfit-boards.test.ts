import { describe, expect, it, vi } from "vitest";
import { hydrateOutfitBoards, parseOutfitBoards, prepareOutfitReply } from "../outfit-boards";

const ids = Array.from({ length: 22 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const block = (itemIds: string[], title = "Everyday layers") => `<outfit-board>${JSON.stringify({ title, itemIds })}</outfit-board>`;
const rows = ids.slice(0, 7).map((id, index) => ({ id, name: ["Shirt", "Chinos", "Shoes", "Coat", "Belt", "Watch", "Undershirt"][index], color: "olive", category_id: ids[21], image_url: `/api/clothing-images/owned-${index}.jpg`, category: { name: "Clothing" } }));
function database(data = rows) {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) };
  for (const method of ["select", "eq", "in"] as const) query[method].mockReturnValue(query);
  return { db: { from: vi.fn(() => query) }, query };
}

describe("Sebastian photo-board results", () => {
  it("keeps the advice, supports all layers and accessories, and removes machine data", () => {
    const parsed = parseOutfitBoards(`Try this for the cooler weather.\n${block(ids.slice(0, 7))}`, "request", ids[1]);
    expect(parsed.text).toBe("Try this for the cooler weather.");
    expect(parsed.records[0].itemIds).toHaveLength(7);
    expect(parsed.records[0].focusItemId).toBe(ids[1]);
  });
  it("rejects invented formats, duplicates, missing anchors, oversized and truncated results", () => {
    for (const raw of [block([ids[0], ids[0]]), block(["foreign", "piece"]), block(ids.slice(0, 21)), '<outfit-board>{"title":"truncated"', block(ids.slice(2, 5))]) {
      const parsed = parseOutfitBoards(`Advice. ${raw}`, "request", ids[1]);
      expect(parsed.records).toEqual([]);
      expect(parsed.text).not.toContain("<outfit-board>");
    }
  });
  it("limits suggestions to three unique combinations", () => {
    const parsed = parseOutfitBoards([block(ids.slice(0, 3)), block(ids.slice(0, 3).reverse()), block(ids.slice(1, 4)), block(ids.slice(2, 5)), block(ids.slice(3, 6))].join("\n"), "request");
    expect(parsed.records).toHaveLength(3);
    expect(new Set(parsed.records.map((record) => record.id)).size).toBe(3);
  });
  it("loads photos from owned active rows and drops an entire board with a foreign or archived item", async () => {
    const { db, query } = database();
    const parsed = parseOutfitBoards(`${block(ids.slice(0, 7))}${block([ids[0], ids[12]])}`, "request");
    const boards = await hydrateOutfitBoards(db as never, "owner", parsed.records);
    expect(boards).toHaveLength(1); expect(boards[0].items).toHaveLength(7);
    expect(boards[0].items[5]).toMatchObject({ name: "Watch", imageUrl: "/api/clothing-images/owned-5.jpg" });
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner"); expect(query.eq).toHaveBeenCalledWith("active", true);
  });
  it("never uses a model-supplied photo or label as wardrobe data", async () => {
    const { db } = database();
    const raw = `<outfit-board>${JSON.stringify({ title: "Look", itemIds: ids.slice(0, 2), imageUrl: "https://attacker.example/image", name: "Invented" })}</outfit-board>`;
    const result = await prepareOutfitReply(db as never, "owner", raw, "request");
    expect(JSON.stringify(result)).not.toContain("attacker");
    expect(JSON.stringify(result)).not.toContain("Invented");
    expect(result.boards[0].items[0].name).toBe("Shirt");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistWardrobeItems } from "../onboarding-persister";
import type { GeneratedWardrobeItem } from "@/lib/types/onboarding";
const item: GeneratedWardrobeItem = {
  id: "tmp-1",
  category: "Tops",
  subcategory: "T-Shirt",
  name: "Navy T-Shirt",
  color: "navy",
  formality_score: 3,
  season: ["All"],
  image_url: null,
  source: "onboarding",
};
describe("atomic onboarding client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: 1, failed: 0, errors: [] })),
    );
  });
  it("sends the complete owned selection through the bounded persistence endpoint", async () => {
    const result = await persistWardrobeItems(
      "user-1",
      [item],
      new Map([["Tops", "cat-1"]]),
    );
    expect(result).toEqual({ success: 1, failed: 0, errors: [] });
    const options = vi.mocked(fetch).mock.calls[0][1]!;
    expect(JSON.parse(options.body as string)).toMatchObject({
      requestKey: expect.any(String),
      items: [
        expect.objectContaining({
          user_id: "user-1",
          category_id: "cat-1",
          active: true,
          capsule_tags: ["onboarding"],
        }),
      ],
    });
  });
  it("reuses the key when a lost response is retried", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
    await persistWardrobeItems("user-1", [item], new Map([["Tops", "cat-1"]]));
    await persistWardrobeItems("user-1", [item], new Map([["Tops", "cat-1"]]));
    const bodies = vi
      .mocked(fetch)
      .mock.calls.map((call) => JSON.parse(call[1]!.body as string));
    expect(bodies[0].requestKey).toBe(bodies[1].requestKey);
  });
  it("does not save a partially mapped wardrobe", async () => {
    const result = await persistWardrobeItems("user-1", [item], new Map());
    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});

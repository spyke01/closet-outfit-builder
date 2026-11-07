import { describe, expect, it } from "vitest";
import { buildWardrobePhotoPrompt } from "../_shared/wardrobe-photo-prompt";
describe("photographic wardrobe prompts", () => {
  it("preserves an owned watch's material and color rather than forcing the stock silver case", () => {
    const prompt = buildWardrobePhotoPrompt({
      name: "Gold Watch",
      category: "Accessories",
      color: "gold",
      material: "gold-plated steel",
    });
    expect(prompt).toContain("gold gold-plated steel Gold Watch");
    expect(prompt).not.toContain("silver case");
    expect(prompt).toContain("complete bracelet or strap");
  });
  it("specifies full waist belts and complete neck loops after the observed cropping failures", () => {
    expect(
      buildWardrobePhotoPrompt({
        name: "Brown Belt",
        category: "Accessories",
        color: "brown",
      }),
    ).toContain("compact oval coil");
    expect(
      buildWardrobePhotoPrompt({
        name: "Silk Tie",
        category: "Accessories",
        color: "blue",
      }),
    ).toContain("entire closed neck loop");
  });
  it("requests a photographed matching shoe pair with bounded framing", () => {
    const prompt = buildWardrobePhotoPrompt({
      name: "Boots",
      category: "Shoes",
      color: "black",
    });
    expect(prompt).toContain("matching left-and-right pair");
    expect(prompt).toContain("soles on the same horizontal surface");
    expect(prompt).toContain("No opposing vertical soles, floating fragments");
    expect(prompt).toContain("central 78%");
    expect(prompt).toContain("Photorealistic");
  });
});

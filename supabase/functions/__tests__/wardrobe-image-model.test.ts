import { describe, expect, it } from "vitest";
import {
  DEFAULT_WARDROBE_IMAGE_MODEL,
  DETAILED_WARDROBE_IMAGE_MODEL,
  resolveWardrobeImageModel,
  wardrobeImageInput,
} from "../_shared/wardrobe-image-model";

describe("clothing image provider selection", () => {
  it("rejects the discontinued Imagen model and arbitrary provider configuration", () => {
    expect(resolveWardrobeImageModel()).toBe(DEFAULT_WARDROBE_IMAGE_MODEL);
    expect(() => resolveWardrobeImageModel("google/imagen-4")).toThrow(
      "AI_POLICY_UNAVAILABLE",
    );
    expect(() => resolveWardrobeImageModel("unreviewed/expensive-model"))
      .toThrow("AI_POLICY_UNAVAILABLE");
    expect(() => resolveWardrobeImageModel("prunaai/p-image")).toThrow();
    expect(() => resolveWardrobeImageModel("black-forest-labs/flux-schnell"))
      .toThrow();
  });
  it("keeps a reserved supported model when the default changes", () => {
    const input = wardrobeImageInput(
      DETAILED_WARDROBE_IMAGE_MODEL,
      "The original request",
    );
    expect(input).toMatchObject({
      prompt: "The original request",
      resolution: "1K",
      aspect_ratio: "1:1",
      google_search: false,
      image_search: false,
    });
    expect(input).not.toHaveProperty("num_outputs");
  });
  it("bounds the default output to one square megapixel with safety checks enabled", () => {
    expect(
      wardrobeImageInput(DEFAULT_WARDROBE_IMAGE_MODEL, "A navy shirt"),
    ).toMatchObject({
      aspect_ratio: "1:1",
      output_megapixels: "1",
      disable_safety_checker: false,
    });
    expect(() => wardrobeImageInput("google/imagen-4", "A navy shirt"))
      .toThrow();
  });
  it("routes plain tops, simple bottoms, loafers, ties, and watches to Klein", () => {
    for (
      const name of [
        "Navy T-Shirt",
        "Polo",
        "Quarter Zip",
        "Cardigan",
        "Chinos",
        "Leggings",
        "Silver Watch",
        "Loafers",
        "Tie",
      ]
    ) {
      expect(resolveWardrobeImageModel("auto", { name })).toBe(
        DEFAULT_WARDROBE_IMAGE_MODEL,
      );
    }
  });
  it("routes denim, knit sweaters, tailored layers, dresses, and detailed accessories to Nano", () => {
    for (
      const name of [
        "Jeans",
        "Sweater",
        "OCBD",
        "Dress Shirt",
        "Blouse",
        "Blazer",
        "Sportcoat",
        "Coat",
        "Midi Dress",
        "Sneakers",
        "Dress Shoes",
        "Belt",
        "Scarf",
      ]
    ) {
      expect(resolveWardrobeImageModel(undefined, { name })).toBe(
        DETAILED_WARDROBE_IMAGE_MODEL,
      );
    }
    expect(
      resolveWardrobeImageModel("auto", {
        name: "Rain shell",
        category: "Outerwear",
      }),
    ).toBe(DETAILED_WARDROBE_IMAGE_MODEL);
  });
  it("honors only explicit server model overrides without changing a stored job's input", () => {
    expect(
      resolveWardrobeImageModel(DEFAULT_WARDROBE_IMAGE_MODEL, {
        name: "Blazer",
      }),
    ).toBe(DEFAULT_WARDROBE_IMAGE_MODEL);
    expect(
      wardrobeImageInput(
        DETAILED_WARDROBE_IMAGE_MODEL,
        "Original reserved prompt",
      ).prompt,
    ).toBe("Original reserved prompt");
  });
});

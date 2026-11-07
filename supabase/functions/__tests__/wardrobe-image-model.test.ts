import { describe, expect, it } from "vitest";
import {
  DEFAULT_WARDROBE_IMAGE_MODEL,
  resolveWardrobeImageModel,
  wardrobeImageInput,
} from "../_shared/wardrobe-image-model";

describe("clothing image provider selection", () => {
  it("rejects the discontinued Imagen model and arbitrary provider configuration", () => {
    expect(resolveWardrobeImageModel()).toBe(DEFAULT_WARDROBE_IMAGE_MODEL);
    expect(() => resolveWardrobeImageModel("google/imagen-4")).toThrow(
      "AI_POLICY_UNAVAILABLE",
    );
    expect(() =>
      resolveWardrobeImageModel("unreviewed/expensive-model"),
    ).toThrow("AI_POLICY_UNAVAILABLE");
  });
  it("keeps a reserved supported model when the default changes", () => {
    const input = wardrobeImageInput("prunaai/p-image", "The original request");
    expect(input).toMatchObject({
      prompt: "The original request",
      width: 1024,
      height: 1024,
      prompt_upsampling: false,
      disable_safety_checker: false,
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
    expect(() =>
      wardrobeImageInput("google/imagen-4", "A navy shirt"),
    ).toThrow();
  });
});

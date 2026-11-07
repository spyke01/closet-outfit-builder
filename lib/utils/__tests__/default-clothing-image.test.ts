import { describe, expect, it } from "vitest";
import {
  currentDefaultClothingImage,
  DEFAULT_CLOTHING_IMAGE_REVISION,
} from "../default-clothing-image";

describe("refreshed default image caching", () => {
  it("refreshes an existing saved default path without changing the file reference", () => {
    expect(
      currentDefaultClothingImage(
        "/images/wardrobe/generated/onboarding/tops-t-shirt-navy.png",
      ),
    )
      .toBe(
        "/images/wardrobe/generated/onboarding/tops-t-shirt-navy.webp?v=" +
          DEFAULT_CLOTHING_IMAGE_REVISION,
      );
  });
  it("replaces an old revision, retains other parameters, and stays stable on rerender", () => {
    const src =
      "/images/wardrobe/generated/onboarding/tops-t-shirt-navy.png?v=old&download=1#preview";
    const next = currentDefaultClothingImage(src);
    expect(next).toContain("v=" + DEFAULT_CLOTHING_IMAGE_REVISION);
    expect(next).toContain("download=1#preview");
    expect(currentDefaultClothingImage(next)).toBe(next);
  });
  it("never rewrites private photos, provider outputs, branded assets, or malformed catalog paths", () => {
    for (
      const src of [
        "/api/clothing-images/owner/original/photo.png",
        "https://example.com/photo.png",
        "/images/wardrobe/ocbd-navy.png",
        "/images/wardrobe/generated/onboarding/../private.png",
        "/images/wardrobe/generated/onboarding/tops-t-shirt-navy.png/other",
      ]
    ) {
      expect(currentDefaultClothingImage(src)).toBe(src);
    }
  });
});

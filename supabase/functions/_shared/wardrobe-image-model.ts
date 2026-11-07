/** Explicit server configuration; resumable jobs keep the model they reserved. */
export const DEFAULT_WARDROBE_IMAGE_MODEL = "black-forest-labs/flux-2-klein-4b";
export const DETAILED_WARDROBE_IMAGE_MODEL = "google/nano-banana-2";

export function resolveWardrobeImageModel(
  configured?: string,
  item?: { name?: string; category?: string },
): string {
  if (configured && configured !== "auto") {
    if (
      ![DEFAULT_WARDROBE_IMAGE_MODEL, DETAILED_WARDROBE_IMAGE_MODEL].includes(
        configured,
      )
    ) {
      throw new Error("AI_POLICY_UNAVAILABLE");
    }
    return configured;
  }
  const name = (item?.name || "").toLowerCase();
  const category = (item?.category || "").toLowerCase();
  // Keep clean basics and watch faces on Klein; use Nano for construction details.
  if (
    /\b(watch|watches|cardigan|hoodie|polo|tee|t-shirt|tank|quarter[ -]zip|loafers?|ties?)\b/
      .test(name)
  ) {
    return DEFAULT_WARDROBE_IMAGE_MODEL;
  }
  if (
    /\b(jeans|sweater|blouse|ocbd|oxford|button[ -]down|dress shirt|blazer|sportcoat|jacket|coat|dress|belt|scarf|sneaker|boot|heel|flat|sandal|shoe)s?\b/
      .test(name)
  ) {
    return DETAILED_WARDROBE_IMAGE_MODEL;
  }
  if (
    /^(shoes?|footwear|layers?|outerwear|jackets?|coats?|dress(?:es)?|accessories|belts?|scar(?:f|ves))$/
      .test(category)
  ) {
    return DETAILED_WARDROBE_IMAGE_MODEL;
  }
  return DEFAULT_WARDROBE_IMAGE_MODEL;
}

export function wardrobeImageInput(model: string, prompt: string) {
  if (
    ![DEFAULT_WARDROBE_IMAGE_MODEL, DETAILED_WARDROBE_IMAGE_MODEL].includes(
      model,
    )
  ) {
    throw new Error("AI_POLICY_UNAVAILABLE");
  }
  if (model === DEFAULT_WARDROBE_IMAGE_MODEL) {
    return {
      prompt,
      aspect_ratio: "1:1",
      output_megapixels: "1",
      output_format: "png",
      go_fast: false,
      disable_safety_checker: false,
    };
  }
  return {
    prompt,
    aspect_ratio: "1:1",
    resolution: "1K",
    output_format: "png",
    google_search: false,
    image_search: false,
  };
}

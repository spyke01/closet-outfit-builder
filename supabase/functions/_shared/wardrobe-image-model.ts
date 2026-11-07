/** Explicit server configuration; resumable jobs keep the model they reserved. */
export const DEFAULT_WARDROBE_IMAGE_MODEL = "black-forest-labs/flux-2-klein-4b";

export function resolveWardrobeImageModel(configured?: string): string {
  const model = configured || DEFAULT_WARDROBE_IMAGE_MODEL;
  if (![DEFAULT_WARDROBE_IMAGE_MODEL, "prunaai/p-image"].includes(model))
    throw new Error("AI_POLICY_UNAVAILABLE");
  return model;
}

export function wardrobeImageInput(model: string, prompt: string) {
  resolveWardrobeImageModel(model);
  if (model === DEFAULT_WARDROBE_IMAGE_MODEL)
    return {
      prompt,
      aspect_ratio: "1:1",
      output_megapixels: "1",
      output_format: "png",
      go_fast: false,
      disable_safety_checker: false,
    };
  return {
    prompt,
    aspect_ratio: "custom",
    width: 1024,
    height: 1024,
    prompt_upsampling: false,
    disable_safety_checker: false,
  };
}

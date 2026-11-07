/** Rev only bundled defaults; private photos and external image URLs are untouched. */
export const DEFAULT_CLOTHING_IMAGE_REVISION = "realistic-20261106";
const catalogPath =
  /^\/images\/wardrobe\/generated\/onboarding\/[a-z0-9-]+\.png$/;
export function currentDefaultClothingImage(src: string): string {
  if (!src.startsWith("/images/wardrobe/generated/onboarding/")) return src;
  const url = new URL(src, "https://catalog.invalid");
  if (!catalogPath.test(url.pathname)) return src;
  url.pathname = url.pathname.replace(/\.png$/, ".webp");
  url.searchParams.set("v", DEFAULT_CLOTHING_IMAGE_REVISION);
  return url.pathname + url.search + url.hash;
}

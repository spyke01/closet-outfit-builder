import { isBoundedClothingImage } from "@/lib/utils/image-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

export function ownedImageObject(
  input: string,
  userId: string,
): { bucket: string; path: string } | null {
  let bucket: string, path: string;
  try {
    if (input.startsWith("/api/clothing-images/")) {
      bucket = "wardrobe-private-images";
      path = decodeURIComponent(input.slice("/api/clothing-images/".length));
    } else {
      const url = new URL(input);
      const appOrigin =
        process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
      if (
        appOrigin &&
        url.origin === new URL(appOrigin).origin &&
        url.pathname.startsWith("/api/clothing-images/")
      ) {
        bucket = "wardrobe-private-images";
        path = decodeURIComponent(
          url.pathname.slice("/api/clothing-images/".length),
        );
      } else {
        if (
          url.origin !==
          new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin
        )
          return null;
        const match = url.pathname.match(
          /^\/storage\/v1\/object\/(?:public|sign)\/(wardrobe-images|wardrobe-private-images)\/(.+)$/,
        );
        if (!match) return null;
        bucket = match[1];
        path = decodeURIComponent(match[2]);
      }
    }
    const segments = path.split("/");
    if (
      segments.some((x) => !x || x === "." || x === "..") ||
      path.includes("\\") ||
      path.length > 500
    )
      return null;
    const owner = ["original", "processed"].includes(segments[0])
      ? segments[1]
      : segments[0];
    return owner === userId ? { bucket, path } : null;
  } catch {
    return null;
  }
}

export async function signOwnedImage(
  input: string,
  userId: string,
): Promise<string> {
  const object = ownedImageObject(input, userId);
  if (!object) throw new Error("IMAGE_NOT_OWNED");
  const storage = createAdminClient().storage.from(object.bucket);
  const { data: file, error: fileError } = await storage.download(object.path);
  if (
    fileError ||
    !file ||
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("INVALID_IMAGE");
  if (!isBoundedClothingImage(new Uint8Array(await file.arrayBuffer())))
    throw new Error("INVALID_IMAGE");
  const { data, error } = await storage.createSignedUrl(object.path, 300);
  if (error || !data?.signedUrl) throw new Error("IMAGE_UNAVAILABLE");
  return data.signedUrl;
}

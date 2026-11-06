import { afterEach, describe, expect, it, vi } from "vitest";
import { ownedImageObject } from "../owned-image";
const owner = "00000000-0000-4000-8000-000000000001";
afterEach(() => vi.unstubAllEnvs());
describe("owned vision image URLs", () => {
  it("accepts only paths belonging to the authenticated account", () => {
    expect(
      ownedImageObject(
        `/api/clothing-images/${owner}/original/photo.png`,
        owner,
      ),
    ).toEqual({
      bucket: "wardrobe-private-images",
      path: `${owner}/original/photo.png`,
    });
    expect(
      ownedImageObject(
        "/api/clothing-images/another-owner/original/photo.png",
        owner,
      ),
    ).toBeNull();
  });
  it("matches the configured Supabase origin exactly", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    expect(
      ownedImageObject(
        `https://project.supabase.co/storage/v1/object/public/wardrobe-images/original/${owner}/photo.png`,
        owner,
      ),
    ).not.toBeNull();
    for (const url of [
      `https://project.supabase.co.attacker.test/storage/v1/object/public/wardrobe-images/original/${owner}/photo.png`,
      `https://attacker.test/project.supabase.co/${owner}/photo.png`,
      `https://other.supabase.co/storage/v1/object/public/wardrobe-images/${owner}/photo.png`,
    ])
      expect(ownedImageObject(url, owner)).toBeNull();
  });
  it("rejects encoded traversal, backslashes, empty segments, and unsupported buckets", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    for (const path of [
      `/api/clothing-images/${owner}/%2e%2e/secret`,
      `/api/clothing-images/${owner}/original%5csecret`,
      `/api/clothing-images/${owner}//photo.png`,
      `https://project.supabase.co/storage/v1/object/public/another-bucket/${owner}/photo.png`,
    ])
      expect(ownedImageObject(path, owner)).toBeNull();
  });
});

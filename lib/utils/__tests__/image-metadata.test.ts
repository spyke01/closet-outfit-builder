import { describe, expect, it } from "vitest";
import { imageDimensions, isBoundedClothingImage } from "../image-metadata";
function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}
describe("bounded clothing image headers", () => {
  it("reads PNG dimensions without decompressing", () =>
    expect(imageDimensions(png(1024, 1600))).toEqual({
      width: 1024,
      height: 1600,
    }));
  it("rejects oversized or zero dimensions", () => {
    expect(isBoundedClothingImage(png(40000, 40000))).toBe(false);
    expect(isBoundedClothingImage(png(0, 4))).toBe(false);
  });
  it("rejects a partial PNG signature and truncated chunks", () => {
    const fake = png(4, 4);
    fake[6] = 0;
    expect(imageDimensions(fake)).toBeNull();
    expect(imageDimensions(png(4, 4).slice(0, 24))).toBeNull();
  });
  it("reads a JPEG frame and rejects truncated segment lengths", () => {
    const bytes = new Uint8Array([
      255, 216, 255, 192, 0, 17, 8, 0, 100, 0, 80, 3, 1, 17, 0, 2, 17, 0, 3, 17,
      0,
    ]);
    expect(imageDimensions(bytes)).toEqual({ width: 80, height: 100 });
    expect(imageDimensions(bytes.slice(0, 13))).toBeNull();
  });
  it("reads extended WebP dimensions", () => {
    const bytes = new Uint8Array(30);
    bytes.set(new TextEncoder().encode("RIFF"), 0);
    bytes.set(new TextEncoder().encode("WEBPVP8X"), 8);
    bytes[24] = 99;
    bytes[27] = 79;
    expect(imageDimensions(bytes)).toEqual({ width: 100, height: 80 });
  });
});

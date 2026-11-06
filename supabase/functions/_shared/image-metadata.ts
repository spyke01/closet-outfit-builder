/** Header-only dimensions; does not decompress an untrusted image. */
export function imageDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 33 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    ) &&
    v.getUint32(8) === 13 &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
  )
    return { width: v.getUint32(16), height: v.getUint32(20) };
  if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 255) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 217 || marker === 218) break;
      if (marker === 216 || marker === 1) {
        offset += 2;
        continue;
      }
      const size = v.getUint16(offset + 2);
      if (size < 2 || offset + 2 + size > bytes.length) return null;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      )
        return {
          width: v.getUint16(offset + 7),
          height: v.getUint16(offset + 5),
        };
      offset += size + 2;
    }
  }
  if (
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    const format = String.fromCharCode(...bytes.slice(12, 16));
    if (format === "VP8X")
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    if (format === "VP8 ")
      return {
        width: v.getUint16(26, true) & 16383,
        height: v.getUint16(28, true) & 16383,
      };
    if (format === "VP8L" && bytes[20] === 47)
      return {
        width: 1 + bytes[21] + ((bytes[22] & 63) << 8),
        height:
          1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10),
      };
  }
  return null;
}
export function isBoundedClothingImage(
  bytes: Uint8Array,
  maxDimension = 4096,
): boolean {
  const size = imageDimensions(bytes);
  return (
    !!size &&
    size.width > 0 &&
    size.height > 0 &&
    size.width <= maxDimension &&
    size.height <= maxDimension &&
    size.width * size.height <= 16_000_000
  );
}

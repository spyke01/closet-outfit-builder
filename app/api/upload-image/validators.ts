// Magic bytes for file type validation
const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46], // First 4 bytes, followed by WEBP at offset 8
  gif: [0x47, 0x49, 0x46, 0x38],
};

// Validate file type using magic bytes
export function validateFileType(buffer: Uint8Array, expectedType: string): boolean {
  const magicBytes = MAGIC_BYTES[expectedType as keyof typeof MAGIC_BYTES];
  if (!magicBytes) return false;

  if (expectedType === 'webp') {
    // Check RIFF header and WEBP signature
    const riffCheck = magicBytes.every((byte, index) => buffer[index] === byte);
    const webpCheck = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return riffCheck && webpCheck;
  }

  return magicBytes.every((byte, index) => buffer[index] === byte);
}

export function isSupportedUploadMimeType(type: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(type);
}

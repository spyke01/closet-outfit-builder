import { describe, it, expect } from 'vitest';
import { isSupportedUploadMimeType, validateFileType } from '../route';

describe('upload-image route validators', () => {
  it('rejects disallowed MIME types for avatar uploads', () => {
    expect(isSupportedUploadMimeType('image/gif')).toBe(false);
    expect(isSupportedUploadMimeType('application/pdf')).toBe(false);
  });

  it('rejects magic-byte mismatches for declared JPEG uploads', () => {
    const invalidJpegBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(validateFileType(invalidJpegBytes, 'jpeg')).toBe(false);
  });
});

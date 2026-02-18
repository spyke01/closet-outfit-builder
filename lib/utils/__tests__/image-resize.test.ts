import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCenteredSquareCrop, transformImageFileForAvatar } from '../image-resize';

describe('image resize avatar helpers', () => {
  it('calculates centered square crop for non-square images', () => {
    expect(getCenteredSquareCrop(1200, 800)).toEqual({ x: 200, y: 0, size: 800 });
    expect(getCenteredSquareCrop(800, 1200)).toEqual({ x: 0, y: 200, size: 800 });
  });

  describe('transformImageFileForAvatar', () => {
    const originalCreateImageBitmap = global.createImageBitmap;
    const originalCreateElement = document.createElement.bind(document);
    let drawImageMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      let createBitmapCalls = 0;
      global.createImageBitmap = vi.fn().mockImplementation(async () => {
        createBitmapCalls += 1;
        if (createBitmapCalls === 1) {
          return {
            width: 1200,
            height: 800,
            close: vi.fn(),
          };
        }

        return {
          width: 400,
          height: 400,
          close: vi.fn(),
        };
      });

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          drawImageMock = vi.fn();
          const context = {
            drawImage: drawImageMock,
          };

          return {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue(context),
            toBlob: (callback: BlobCallback, type?: string) => {
              callback(new Blob(['avatar-binary'], { type: type || 'image/webp' }));
            },
          } as unknown as HTMLCanvasElement;
        }

        return originalCreateElement(tagName as keyof HTMLElementTagNameMap);
      });
    });

    afterEach(() => {
      global.createImageBitmap = originalCreateImageBitmap;
      vi.restoreAllMocks();
    });

    it('normalizes avatar output to 400x400 safe image format', async () => {
      const file = new File(['source-image'], 'avatar.png', { type: 'image/png' });
      const transformed = await transformImageFileForAvatar(file, { size: 400, quality: 0.9 });

      expect(transformed.type).toBe('image/webp');
      expect(transformed.name).toContain('.webp');
      expect(drawImageMock).toHaveBeenCalledWith(
        expect.anything(),
        200,
        0,
        800,
        800,
        0,
        0,
        400,
        400
      );
    });
  });
});

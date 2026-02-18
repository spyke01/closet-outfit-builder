export interface ResizeOptions {
  maxDimension?: number;
  quality?: number;
}

export interface AvatarTransformOptions {
  size?: number;
  quality?: number;
}

function shouldResize(width: number, height: number, maxDimension: number): boolean {
  return width > maxDimension || height > maxDimension;
}

function getScaledDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  const scale = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function getCenteredSquareCrop(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.min(width, height);
  const x = Math.max(0, Math.floor((width - size) / 2));
  const y = Math.max(0, Math.floor((height - size) / 2));
  return { x, y, size };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function getOutputType(inputType: string): string {
  if (inputType === 'image/png') return 'image/png';
  if (inputType === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  preferredType: string,
  quality: number
): Promise<{ blob: Blob; type: string } | null> {
  const preferredBlob = await toBlob(canvas, preferredType, quality);
  if (preferredBlob) {
    return { blob: preferredBlob, type: preferredType };
  }

  const fallbackType = 'image/jpeg';
  const fallbackBlob = await toBlob(canvas, fallbackType, quality);
  if (!fallbackBlob) return null;
  return { blob: fallbackBlob, type: fallbackType };
}

export async function resizeImageFileForUpload(file: File, options: ResizeOptions = {}): Promise<File> {
  if (typeof window === 'undefined') return file;

  const maxDimension = options.maxDimension ?? 1024;
  const quality = options.quality ?? 0.9;

  const imageBitmap = await createImageBitmap(file);
  try {
    if (!shouldResize(imageBitmap.width, imageBitmap.height, maxDimension)) {
      return file;
    }

    const scaled = getScaledDimensions(imageBitmap.width, imageBitmap.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = scaled.width;
    canvas.height = scaled.height;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(imageBitmap, 0, 0, scaled.width, scaled.height);

    const outputType = getOutputType(file.type);
    const blob = await toBlob(canvas, outputType, quality);
    if (!blob) {
      return file;
    }

    const resizedName = file.name.replace(/\.(jpe?g|png|webp)$/i, '') || 'upload';
    const extension = outputType === 'image/png' ? 'png' : outputType === 'image/webp' ? 'webp' : 'jpg';
    const outputName = `${resizedName}.${extension}`;

    return new File([blob], outputName, {
      type: outputType,
      lastModified: Date.now(),
    });
  } finally {
    imageBitmap.close();
  }
}

export async function transformImageFileForAvatar(
  file: File,
  options: AvatarTransformOptions = {}
): Promise<File> {
  if (typeof window === 'undefined') return file;

  const size = options.size ?? 400;
  const quality = options.quality ?? 0.9;

  const bitmap = await createImageBitmap(file);
  try {
    const crop = getCenteredSquareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.size,
      crop.size,
      0,
      0,
      size,
      size
    );

    const encoded = await encodeCanvas(canvas, 'image/webp', quality);
    if (!encoded) return file;

    const outputNameBase = file.name.replace(/\.(jpe?g|png|webp)$/i, '') || 'avatar';
    const extension = encoded.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([encoded.blob], `${outputNameBase}.${extension}`, {
      type: encoded.type,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

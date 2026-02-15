export interface ResizeOptions {
  maxDimension?: number;
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


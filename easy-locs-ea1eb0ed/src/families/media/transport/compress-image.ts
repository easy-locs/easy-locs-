/**
 * media.compress-image — Canvas-based client-side image compression.
 * Resizes and re-encodes JPEG/PNG/WebP to reduce upload size.
 * Runs off-main-thread where possible via OffscreenCanvas.
 */

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number; targetFormat?: "image/jpeg" | "image/webp" } = {},
): Promise<CompressResult> {
  const { maxDimension = 2048, quality = 0.82, targetFormat = "image/jpeg" } = opts;

  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  let targetW = origW;
  let targetH = origH;
  if (origW > maxDimension || origH > maxDimension) {
    const scale = maxDimension / Math.max(origW, origH);
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
  }

  const format = targetFormat;
  const fallbackFormat = "image/jpeg";

  let blob: Blob;
  try {
    const offscreen = new OffscreenCanvas(targetW, targetH);
    const ctx = offscreen.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    blob = await offscreen.convertToBlob({ type: format, quality });
    if (blob.type !== format && format === "image/webp") {
      blob = await offscreen.convertToBlob({ type: fallbackFormat, quality });
    }
  } catch {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const tryFormat = async (fmt: string): Promise<Blob> =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          fmt,
          quality,
        );
      });

    blob = await tryFormat(format).catch(() => tryFormat(fallbackFormat));
  }

  bitmap.close();

  // If compressed is bigger than original (rare), keep original
  if (blob.size >= file.size) {
    return {
      blob: file,
      width: origW,
      height: origH,
      originalSize: file.size,
      compressedSize: file.size,
      ratio: 1,
    };
  }

  return {
    blob,
    width: targetW,
    height: targetH,
    originalSize: file.size,
    compressedSize: blob.size,
    ratio: blob.size / file.size,
  };
}

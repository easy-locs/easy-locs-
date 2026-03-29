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
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<CompressResult> {
  const { maxDimension = 2048, quality = 0.82 } = opts;

  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // Calculate target dimensions
  let targetW = origW;
  let targetH = origH;
  if (origW > maxDimension || origH > maxDimension) {
    const scale = maxDimension / Math.max(origW, origH);
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
  }

  // Try OffscreenCanvas first (better perf, doesn't block main thread)
  let blob: Blob;
  try {
    const offscreen = new OffscreenCanvas(targetW, targetH);
    const ctx = offscreen.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    blob = await offscreen.convertToBlob({ type: "image/jpeg", quality });
  } catch {
    // Fallback to regular canvas
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality,
      );
    });
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

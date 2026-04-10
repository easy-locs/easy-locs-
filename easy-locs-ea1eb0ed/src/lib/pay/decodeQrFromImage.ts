import jsQR from "jsqr";

async function fileToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context unavailable");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function decodeImageData(imageData: ImageData): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

function resizeAndDecode(imageData: ImageData, scale: number): string | null {
  const srcCanvas = document.createElement("canvas");
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) return null;
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = document.createElement("canvas");
  const dstCtx = dstCanvas.getContext("2d", { willReadFrequently: true });
  if (!dstCtx) return null;
  dstCanvas.width = Math.max(1, Math.floor(imageData.width * scale));
  dstCanvas.height = Math.max(1, Math.floor(imageData.height * scale));
  dstCtx.drawImage(srcCanvas, 0, 0, dstCanvas.width, dstCanvas.height);

  const resized = dstCtx.getImageData(0, 0, dstCanvas.width, dstCanvas.height);
  const result = jsQR(resized.data, resized.width, resized.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

export async function decodeQrFromImage(file: File): Promise<string | null> {
  const imageData = await fileToImageData(file);

  let decoded = decodeImageData(imageData);
  if (decoded) return decoded;

  decoded = resizeAndDecode(imageData, 0.5);
  if (decoded) return decoded;

  decoded = resizeAndDecode(imageData, 0.25);
  if (decoded) return decoded;

  return null;
}

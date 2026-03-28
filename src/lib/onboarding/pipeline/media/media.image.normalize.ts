/**
 * media.image.normalize — Normalizes image URLs.
 * ONE thing: clean and structure image URLs.
 */
import type { NormalizedImage } from "../contracts";

export function normalizeImage(url: string): NormalizedImage {
  const cleaned = url.trim();
  const format = extractFormat(cleaned);
  return { url: cleaned, originalUrl: url, width: null, height: null, format };
}

export function normalizeImages(urls: string[]): NormalizedImage[] {
  return urls.filter((u) => u?.trim()).map(normalizeImage);
}

function extractFormat(url: string): string | null {
  const match = url.match(/\.(jpe?g|png|webp|gif|svg|avif)/i);
  return match ? match[1].toLowerCase() : null;
}

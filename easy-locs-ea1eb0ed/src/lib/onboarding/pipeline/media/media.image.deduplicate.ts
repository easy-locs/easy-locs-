/**
 * media.image.deduplicate — Removes duplicate images by URL fingerprint.
 * ONE thing: dedupe by base path + meaningful query params (preserving resolution variants).
 */
import type { NormalizedImage } from "../contracts";

const RESOLUTION_PARAMS = new Set(["w", "h", "width", "height", "size", "resize", "fit", "crop", "quality", "q", "dpr"]);

function buildDedupeKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const meaningfulParams = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
      if (RESOLUTION_PARAMS.has(key.toLowerCase())) {
        meaningfulParams.set(key.toLowerCase(), value);
      }
    });
    meaningfulParams.sort();
    const paramStr = meaningfulParams.toString();
    const base = `${parsed.origin}${parsed.pathname}`.toLowerCase();
    return paramStr ? `${base}?${paramStr}` : base;
  } catch {
    return url.replace(/[?#].*$/, "").trim().toLowerCase();
  }
}

export function deduplicateImages(images: NormalizedImage[]): NormalizedImage[] {
  const seen = new Set<string>();
  return images.filter((img) => {
    const key = buildDedupeKey(img.url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

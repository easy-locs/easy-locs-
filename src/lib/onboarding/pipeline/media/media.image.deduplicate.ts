/**
 * media.image.deduplicate — Removes duplicate images by URL fingerprint.
 * ONE thing: dedupe by stripping query params.
 */
import type { NormalizedImage } from "../contracts";

export function deduplicateImages(images: NormalizedImage[]): NormalizedImage[] {
  const seen = new Set<string>();
  return images.filter((img) => {
    const key = img.url.replace(/[?#].*$/, "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

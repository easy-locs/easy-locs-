/**
 * Photo Deduplicator — Removes duplicate photo URLs.
 * ONE responsibility: dedupe photos by base path + meaningful query params.
 * Preserves resolution variants (e.g. ?w=800 vs ?w=400).
 */

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

export function dedupePhotos(photos: string[]): string[] {
  const seen = new Set<string>();
  return photos.filter((url) => {
    const key = buildDedupeKey(url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

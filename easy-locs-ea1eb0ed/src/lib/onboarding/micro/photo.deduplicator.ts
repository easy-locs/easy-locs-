/**
 * Photo Deduplicator — Removes duplicate photo URLs.
 * ONE responsibility: dedupe photos by stripping query params.
 */

export function dedupePhotos(photos: string[]): string[] {
  const seen = new Set<string>();
  return photos.filter((url) => {
    const key = url.replace(/[?#].*$/, "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

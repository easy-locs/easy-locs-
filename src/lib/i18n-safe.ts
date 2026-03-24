/**
 * i18n-safe.ts — GLOBAL TEXT SAFETY ENGINE
 * Ensures NO raw i18n key is ever displayed in the UI.
 * 
 * Rules:
 * 1. Exact translation in active locale
 * 2. Fallback to English
 * 3. Fallback to taxonomy canonical label
 * 4. Fallback to humanizeKey()
 * 5. Log missing key in dev — NEVER break the UI
 */

const _reportedKeys = new Set<string>();

/** Detect if a string looks like a raw i18n key (a.b.c pattern) */
export function looksLikeI18nKey(text: string): boolean {
  if (!text || text.length < 3) return false;
  // Must have at least 2 dot-separated segments of lowercase+underscore
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/.test(text.trim());
}

/**
 * humanizeKey — last-resort fallback that converts a key into readable text.
 * "discovery.subcategory.dineout.title" → "Dineout"
 * "travel.hero_title" → "Hero Title"  (but we prefer just last segment)
 * "common.top_rated" → "Top Rated"
 */
export function humanizeKey(key: string): string {
  if (!key) return "";
  // Take last segment after final dot
  const segments = key.split(".");
  let last = segments[segments.length - 1] || key;
  // If last is generic like "title", "tagline", "search_placeholder", use second-to-last
  const GENERIC = ["title", "tagline", "search_placeholder", "cta_primary", "cta_secondary", "empty_title", "empty_subtitle", "loading", "results", "hero_title", "hero_subtitle"];
  if (GENERIC.includes(last) && segments.length >= 2) {
    last = segments[segments.length - 2];
  }
  // Replace underscores with spaces and title-case
  return last
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * safeTranslate — wraps any translate function to guarantee no raw key output.
 * Usage: const text = safeTranslate(td(key), key);
 */
export function safeTranslate(
  translatedValue: string,
  originalKey: string,
  context?: string,
): string {
  // If translation returned the key itself (fallback), humanize it
  if (translatedValue === originalKey && looksLikeI18nKey(originalKey)) {
    if (import.meta.env.DEV && !_reportedKeys.has(originalKey)) {
      _reportedKeys.add(originalKey);
      console.warn(`[i18n-missing] "${originalKey}"${context ? ` in ${context}` : ""}`);
    }
    return humanizeKey(originalKey);
  }
  return translatedValue;
}

/** Batch-check a rendered string for leaked keys — use in dev guards */
export function detectLeakedKeys(text: string): string[] {
  if (!text) return [];
  // Split on whitespace and check each token
  return text.split(/\s+/).filter(looksLikeI18nKey);
}

/** Get a set of all reported missing keys (for QA) */
export function getMissingKeys(): string[] {
  return Array.from(_reportedKeys);
}

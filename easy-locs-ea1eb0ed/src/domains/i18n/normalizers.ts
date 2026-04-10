/**
 * I18N Normalizers — Normalize raw locale input.
 */

const LOCALE_MAP: Record<string, string> = {
  "en-US": "en",
  "en-GB": "en",
  "fr-FR": "fr",
  "ar-MA": "ar",
  "ar-AE": "ar",
};

export function normalizeLocale(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return LOCALE_MAP[raw] || lower.split("-")[0] || "en";
}

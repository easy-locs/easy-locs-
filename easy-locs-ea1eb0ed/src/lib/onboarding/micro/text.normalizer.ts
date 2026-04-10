/**
 * Text Normalizer — Strips third-party mentions, normalizes casing/whitespace.
 * ONE responsibility: clean text fields.
 */

const STRIP_PATTERN = /deliveroo|talabat|careem|booking|noon/gi;

export function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = value
    .replace(STRIP_PATTERN, " ")
    .replace(/[_|]+/g, " ")
    .replace(/[•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  return cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Batch normalize an array of strings, removing empty results */
export function normalizeTextArray(values: string[]): string[] {
  return [...new Set(
    values.map((v) => normalizeText(v) ?? "").filter(Boolean),
  )];
}

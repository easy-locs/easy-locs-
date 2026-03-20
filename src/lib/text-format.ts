/**
 * Text formatting utilities — single source of truth for UI text cleanup.
 * Prevents broken dots, raw i18n keys, and inconsistent separators.
 */

/** Clean a single UI text value: fix dots, normalize whitespace, trim punctuation */
export function cleanUiText(value?: string | null): string {
  if (!value) return "";
  let text = value;
  // Replace consecutive dots with space
  text = text.replace(/\.{2,}/g, " ");
  // Replace dot-as-separator between words (not URLs or decimals)
  if (!text.includes("://") && !/^\d+\.\d+$/.test(text)) {
    text = text.replace(/([a-zA-ZÀ-ÿ])\.([a-zA-ZÀ-ÿ])/g, "$1 $2");
  }
  // Fix " . " lone dots
  text = text.replace(/\s\.\s/g, " ");
  // Normalize whitespace
  text = text.replace(/\s{2,}/g, " ");
  // Strip leading/trailing bad punctuation
  text = text.replace(/^[.,;:\-_]+/, "").replace(/[.,;:\-_]+$/, "");
  return text.trim();
}

/** Join meta parts with clean middot separator */
export function joinMeta(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => cleanUiText(p))
    .filter(Boolean)
    .join(" · ");
}

/** Title case a cleaned string */
export function titleCase(text: string): string {
  return cleanUiText(text).replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Detect raw i18n key patterns */
export function looksLikeKey(text: string): boolean {
  if (!text) return false;
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/.test(text.trim());
}

/** Extract last segment of i18n key as human label */
export function keyToLabel(key: string): string {
  if (!looksLikeKey(key)) return cleanUiText(key);
  const last = key.split(".").pop() || key;
  return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

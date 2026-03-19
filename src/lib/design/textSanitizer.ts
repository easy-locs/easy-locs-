/**
 * Design-layer Text Sanitizer — Extended text cleanup for the global design system.
 * Wraps and extends src/lib/text-sanitize.ts with additional rules.
 */

import { sanitizeLabel } from "@/lib/text-sanitize";

/**
 * Full sanitization pipeline for UI labels.
 * 1. Replace dots-as-separators with spaces
 * 2. Fix bad capitalization
 * 3. Strip visible i18n key prefixes
 * 4. Normalize whitespace
 */
export function sanitizeUiText(text: string): string {
  if (!text) return text;

  let result = text;

  // Step 1: dot-separator → space (delegated to existing sanitizer)
  result = sanitizeLabel(result);

  // Step 2: Strip common i18n key prefixes that leaked into UI
  // e.g., "pages.food.title" → "Title"
  const i18nKeyPattern = /^[a-z_]+\.[a-z_]+\.[a-z_]+$/i;
  if (i18nKeyPattern.test(result.trim())) {
    const parts = result.split(".");
    result = parts[parts.length - 1]
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  // Step 3: Normalize multiple spaces
  result = result.replace(/\s{2,}/g, " ").trim();

  // Step 4: Fix leading/trailing punctuation issues
  result = result.replace(/^[.,;:\-_]+/, "").replace(/[.,;:\-_]+$/, "").trim();

  return result;
}

/**
 * Detects if a string looks like a raw i18n key.
 */
export function looksLikeI18nKey(text: string): boolean {
  if (!text) return false;
  // Pattern: lowercase_words separated by dots, at least 2 segments
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/.test(text.trim());
}

/**
 * Detects dotted-separator text (not URLs, not decimals).
 */
export function hasDotSeparator(text: string): boolean {
  if (!text) return false;
  if (text.includes("://")) return false;
  if (/^\d+\.\d+$/.test(text)) return false;
  return /[a-zA-Z]\.[a-zA-Z]/.test(text);
}

/**
 * Batch sanitize an array of labels.
 */
export function sanitizeLabels(labels: string[]): string[] {
  return labels.map(sanitizeUiText);
}

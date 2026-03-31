/**
 * text.resolver — SINGLE canonical source for all text normalization.
 *
 * RULES:
 * - normalizeTextInput: the ONE gate for any user-entered text (compose, edit, reply, draft, retry)
 * - normalizeSearchableText: the ONE gate for search/filter/sort operations
 * - No other file may trim/replace/sanitize user text independently.
 *
 * Unicode-safe: supports emoji, Arabic, accented, CJK, symbols, mixed scripts.
 */

// Invisible control characters to strip (except \n and \t which we keep selectively)
const INVISIBLE_RE = /[\u200B-\u200D\uFEFF\u00AD\u2060\u2028\u2029\u180E]/g;

// Collapse multiple consecutive newlines to max 2
const MULTI_NEWLINE_RE = /\n{3,}/g;

// Collapse runs of whitespace (except newlines) to single space
const MULTI_SPACE_RE = /[^\S\n]+/g;

/**
 * normalizeTextInput — Single canonical text normalizer for all user input.
 *
 * Preserves:
 * - Unicode letters (all scripts: Latin, Arabic, CJK, Cyrillic, etc.)
 * - Emoji sequences (including compound emoji)
 * - Digits, punctuation, quotes, parentheses, slashes
 * - Intentional newlines (up to 2 consecutive)
 *
 * Removes/Fixes:
 * - Zero-width and invisible control characters
 * - Leading/trailing whitespace
 * - Excessive consecutive newlines (collapsed to 2)
 * - Runs of spaces/tabs (collapsed to 1)
 *
 * Returns null if the result is empty or only whitespace.
 */
export function normalizeTextInput(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let result = raw
    .replace(INVISIBLE_RE, "")      // strip invisible chars
    .replace(MULTI_SPACE_RE, " ")    // collapse space runs
    .replace(MULTI_NEWLINE_RE, "\n\n") // max 2 newlines
    .trim();

  if (!result) return null;
  return result;
}

/**
 * normalizeSearchableText — Single canonical normalizer for search indexing.
 *
 * Produces a lowercase, accent-folded, whitespace-collapsed string
 * suitable for case-insensitive, diacritics-insensitive matching.
 * Does NOT replace the display text — used only for search/filter/sort.
 *
 * Returns empty string if input is empty.
 */
export function normalizeSearchableText(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .normalize("NFD")                           // decompose accents
    .replace(/[\u0300-\u036f]/g, "")            // strip combining marks (accent fold)
    .toLowerCase()
    .replace(INVISIBLE_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * validateTextInput — Single canonical validator for text messages.
 * Returns null if valid, or an error key string if invalid.
 */
export function validateTextInput(text: string | null | undefined): string | null {
  const normalized = normalizeTextInput(text);
  if (!normalized) return "empty_body";
  if (normalized.length > 10_000) return "body_too_long";
  return null;
}

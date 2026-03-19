/**
 * DINO Text Sanitizer — Wrapper for the global design text sanitizer.
 * Re-exports and extends for DINO-specific audit use.
 */

export { sanitizeUiText, looksLikeI18nKey, hasDotSeparator, sanitizeLabels } from "@/lib/design/textSanitizer";

/**
 * Sanitize a single UI label (convenience alias).
 */
export function sanitizeUiLabel(input: string): string {
  if (!input) return input;
  if (/https?:\/\//i.test(input)) return input;
  if (/^\d+(\.\d+)?$/.test(input)) return input;

  const replaced = input
    .replace(/([A-Za-zÀ-ÿ])\.([A-Za-zÀ-ÿ])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return replaced
    .split(" ")
    .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(" ");
}

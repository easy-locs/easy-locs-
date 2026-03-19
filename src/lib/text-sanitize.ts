/**
 * Text sanitization — replaces dot-separated words with spaces and applies Title Case.
 * e.g. "maison.hotel" → "Maison Hotel"
 */
export function sanitizeLabel(text: string): string {
  if (!text) return text;
  // Don't touch URLs or decimals
  if (text.includes("://") || /^\d+\.\d+$/.test(text)) return text;
  // Replace dots used as separators (word.word) with spaces
  const cleaned = text.replace(/([a-zA-Z])\.([a-zA-Z])/g, "$1 $2");
  // Title case
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getReadingTime(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const wordCount = trimmed.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

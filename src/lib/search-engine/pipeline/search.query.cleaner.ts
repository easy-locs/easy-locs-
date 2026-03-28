/**
 * search.query.cleaner — Sanitize and normalize raw query input.
 */
export function cleanQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[<>{}]/g, "")      // strip injection chars
    .replace(/\s{2,}/g, " ")     // collapse whitespace
    .slice(0, 200);              // hard length cap
}

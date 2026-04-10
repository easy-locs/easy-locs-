/**
 * search.merge.results — Combines results from multiple sources, deduplicates.
 */
import type { SearchResult } from "../search-types";

export function mergeResults(...sources: SearchResult[][]): SearchResult[] {
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  for (const source of sources) {
    for (const item of source) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }

  return merged;
}

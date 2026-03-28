/**
 * search.fetch.taxonomy — Matches query against canonical taxonomy tree.
 * Pure function — no DB calls.
 */
import { CANONICAL_VERTICALS } from "@/lib/taxonomy/world-class-taxonomy";
import type { SearchResult } from "../search-types";

export function matchTaxonomy(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const matches: SearchResult[] = [];

  for (const v of CANONICAL_VERTICALS) {
    if (v.label.toLowerCase().includes(q) || v.value.includes(q)) {
      matches.push({
        id: `cat_${v.value}`,
        type: "category",
        title: `${v.emoji} ${v.label}`,
        vertical: v.value,
      });
    }
    for (const sub of v.subcategories) {
      const tagMatch = sub.tags?.some((t: string) => t.toLowerCase().includes(q));
      if (sub.label.toLowerCase().includes(q) || sub.value.includes(q) || tagMatch) {
        matches.push({
          id: `sub_${sub.value}`,
          type: "category",
          title: `${sub.emoji} ${sub.label}`,
          subtitle: v.label,
          vertical: v.value,
          subcategory: sub.value,
        });
      }
    }
  }

  return matches;
}

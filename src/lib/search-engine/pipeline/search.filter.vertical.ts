/**
 * search.filter.vertical — Filters results by vertical/subcategory match.
 * Pure function. No DB calls.
 */
import type { SearchResult, SearchState } from "../search-types";

export function filterByVertical(
  results: SearchResult[],
  state: SearchState
): SearchResult[] {
  // No vertical filter → pass all
  if (!state.vertical || state.vertical === "all") {
    return filterBySubcategory(results, state.subcategory);
  }

  const filtered = results.filter((r) => {
    // Non-shop results pass vertical filter
    if (r.type !== "shop") return true;
    return r.vertical === state.vertical;
  });

  return filterBySubcategory(filtered, state.subcategory);
}

function filterBySubcategory(
  results: SearchResult[],
  subcategory?: string
): SearchResult[] {
  if (!subcategory) return results;

  return results.filter((r) => {
    if (r.type !== "shop") return true;
    return r.subcategory?.toLowerCase() === subcategory.toLowerCase();
  });
}

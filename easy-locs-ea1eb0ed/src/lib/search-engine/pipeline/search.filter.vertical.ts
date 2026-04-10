/**
 * search.filter.vertical — Filters results by vertical/subcategory match.
 * Pure function. No DB calls.
 *
 * STRICT VERTICAL ISOLATION: ALL result types are gated by vertical.
 * No cross-vertical contamination is allowed.
 */
import type { SearchResult, SearchState } from "../search-types";

export function filterByVertical(
  results: SearchResult[],
  state: SearchState
): SearchResult[] {
  if (!state.vertical || state.vertical === "all") {
    return filterBySubcategory(results, state.subcategory);
  }

  const filtered = results.filter((r) => {
    if (!r.vertical) return false;
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
    if (!r.subcategory) return false;
    return r.subcategory.toLowerCase() === subcategory.toLowerCase();
  });
}

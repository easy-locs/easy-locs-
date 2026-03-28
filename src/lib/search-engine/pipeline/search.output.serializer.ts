/**
 * search.output.serializer — Formats final search output for consumers.
 * Pure function. Maps internal results to API-ready shape.
 */
import type { SearchResult, SearchState } from "../search-types";

export interface SearchOutput {
  results: SearchResult[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  query: string;
  appliedFilters: AppliedFilter[];
}

export interface AppliedFilter {
  key: string;
  value: string;
}

export function serializeSearchOutput(
  results: SearchResult[],
  state: SearchState
): SearchOutput {
  const appliedFilters: AppliedFilter[] = [];

  if (state.vertical && state.vertical !== "all") {
    appliedFilters.push({ key: "vertical", value: state.vertical });
  }
  if (state.subcategory) {
    appliedFilters.push({ key: "subcategory", value: state.subcategory });
  }
  if (state.city) {
    appliedFilters.push({ key: "city", value: state.city });
  }
  if (state.minRating) {
    appliedFilters.push({ key: "minRating", value: String(state.minRating) });
  }
  if (state.openNow) {
    appliedFilters.push({ key: "openNow", value: "true" });
  }
  if (state.claimedOnly) {
    appliedFilters.push({ key: "claimedOnly", value: "true" });
  }

  // Paginate
  const start = (state.page - 1) * state.limit;
  const paged = results.slice(start, start + state.limit);

  return {
    results: paged,
    totalCount: results.length,
    page: state.page,
    limit: state.limit,
    hasMore: start + state.limit < results.length,
    query: state.query,
    appliedFilters,
  };
}

/**
 * search.filter.visibility — Filters results by visibility/publication rules.
 * Pure function. No DB calls.
 *
 * Enforces:
 * - Only published/visible storefronts pass
 * - Claimed-only filter
 * - Source-type filter
 */
import type { SearchResult, SearchState } from "../search-types";

/** Extended result with optional visibility metadata (set by fetcher) */
export interface VisibilityMeta {
  visibilityMode?: string;
  routeStatus?: string;
  readinessStatus?: string;
  sourceType?: string;
  isClaimed?: boolean;
}

export function filterByVisibility(
  results: (SearchResult & Partial<VisibilityMeta>)[],
  state: SearchState
): SearchResult[] {
  return results.filter((r) => {
    // Products always pass visibility (governed elsewhere)
    if (r.type === "product" || r.type === "category" || r.type === "location") return true;

    // Visibility mode check (shops)
    if (r.visibilityMode && r.visibilityMode === "hidden") return false;
    if (r.routeStatus && r.routeStatus === "disabled") return false;

    // Claimed-only filter
    if (state.claimedOnly && !r.isClaimed) return false;

    // Source type filter
    if (state.sourceType && r.sourceType !== state.sourceType) return false;

    return true;
  });
}

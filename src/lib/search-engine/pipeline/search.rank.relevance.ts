/**
 * search.rank.relevance — Pure sorting logic for search results.
 * No fetching, no side effects.
 */
import type { SearchResult, SearchState } from "../search-types";

export function rankResults(
  results: SearchResult[],
  sort: SearchState["sort"]
): SearchResult[] {
  return [...results].sort((a, b) => {
    switch (sort) {
      case "distance":
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "trending":
        return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
      case "relevance":
      default: {
        const scoreA =
          (a.score ?? 0) * 0.3 +
          (a.isSponsored ? 10 : 0) +
          (a.rating ?? 0) -
          (a.distanceKm ?? 5) * 0.3;
        const scoreB =
          (b.score ?? 0) * 0.3 +
          (b.isSponsored ? 10 : 0) +
          (b.rating ?? 0) -
          (b.distanceKm ?? 5) * 0.3;
        return scoreB - scoreA;
      }
    }
  });
}

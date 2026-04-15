/**
 * usePropertySearch — Reactive property search hook.
 * Derives results from listingStore + UnifiedSearchStore.
 * E1 fix: Migrated from legacy searchStore to canonical unified search.
 */
import { useMemo } from "react";
import { useListingStore } from "@/stores/listingStore";
import { useUnifiedSearchStore } from "@/lib/search-engine/search-store";
import { filterListings } from "@/lib/utils/search";
import type { ListingSearchFilters } from "@/lib/types/search";

export function usePropertySearch() {
  const searchState = useUnifiedSearchStore((s) => s.state);
  const setFilters = useUnifiedSearchStore((s) => s.setFilters);
  const reset = useUnifiedSearchStore((s) => s.reset);
  const listings = useListingStore((s) => s.listings);

  const filters: ListingSearchFilters = useMemo(() => ({
    city: searchState.city,
    country: searchState.country,
    text: searchState.query || undefined,
    minNightPrice: searchState.priceMin,
    maxNightPrice: searchState.priceMax,
  }), [searchState.city, searchState.country, searchState.query, searchState.priceMin, searchState.priceMax]);

  const results = useMemo(
    () => filterListings(listings, filters),
    [listings, filters],
  );

  return { results, filters, setFilters, clear: reset };
}

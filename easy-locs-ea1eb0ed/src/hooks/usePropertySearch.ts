/**
 * usePropertySearch — Reactive property search hook.
 * Derives results from listingStore + searchStore without cross-store getState() calls.
 * SSOT: replaces searchStore.runSearch() which used useListingStore.getState() directly.
 */
import { useMemo } from "react";
import { useListingStore } from "@/stores/listingStore";
import { useSearchStore } from "@/stores/searchStore";
import { filterListings } from "@/lib/utils/search";

export function usePropertySearch() {
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const clear = useSearchStore((s) => s.clear);
  const listings = useListingStore((s) => s.listings);

  const results = useMemo(
    () => filterListings(listings, filters),
    [listings, filters],
  );

  return { results, filters, setFilters, clear };
}

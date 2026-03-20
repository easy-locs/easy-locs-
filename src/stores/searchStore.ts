import { create } from "zustand";
import type { ListingSearchFilters } from "@/lib/types/search";
import { filterListings } from "@/lib/utils/search";
import type { PropertyListingV2 } from "@/lib/types/domain";
import { useListingStore } from "@/stores/listingStore";

type SearchStore = {
  filters: ListingSearchFilters;
  results: PropertyListingV2[];

  setFilters: (filters: Partial<ListingSearchFilters>) => void;
  runSearch: () => void;
  clear: () => void;
};

export const useSearchStore = create<SearchStore>((set, get) => ({
  filters: {},
  results: [],

  setFilters: (filters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    }));
  },

  runSearch: () => {
    const listings = useListingStore.getState().getPublishedListings();
    const filters = get().filters;
    const results = filterListings(listings, filters);
    set({ results });
  },

  clear: () => {
    set({ filters: {}, results: [] });
  },
}));

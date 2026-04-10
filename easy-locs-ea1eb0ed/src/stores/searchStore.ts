/**
 * searchStore — Holds search filters only.
 * Results are computed reactively via usePropertySearch hook (hooks/usePropertySearch.ts)
 * to avoid cross-store getState() coupling with listingStore.
 */
import { create } from "zustand";
import type { ListingSearchFilters } from "@/lib/types/search";

type SearchStore = {
  filters: ListingSearchFilters;
  setFilters: (filters: Partial<ListingSearchFilters>) => void;
  clear: () => void;
};

export const useSearchStore = create<SearchStore>((set) => ({
  filters: {},

  setFilters: (filters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    }));
  },

  clear: () => {
    set({ filters: {} });
  },
}));

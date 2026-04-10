/**
 * savedSearchStore — Saved property search state.
 *
 * SSOT alignment:
 *   - All DB access via saved-search.repository (no direct db calls here).
 */
import { db } from "@/services/db";
import { create } from "zustand";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";
import type { ListingSearchFilters } from "@/lib/types/search";
import {
  fetchSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  type SavedSearchRow,
} from "@/repositories/saved-search.repository";

type SavedSearchStore = {
  items: SavedSearchRow[];
  loading: boolean;
  hydrate: () => Promise<void>;
  saveSearch: (name: string, filters: ListingSearchFilters) => Promise<void>;
  deleteSearch: (id: string) => Promise<void>;
};

export const useSavedSearchStore = create<SavedSearchStore>((set) => ({
  items: [],
  loading: false,

  hydrate: async () => {
    const user = useV2AuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    const items = await fetchSavedSearches(user.id);
    set({ items, loading: false });
  },

  saveSearch: async (name, filters) => {
    const user = useV2AuthStore.getState().user;
    const orbit = getOrbitIdentity();
    if (!user || !orbit) return;

    const row = await createSavedSearch({
      id: `search_${Math.random().toString(36).slice(2, 11)}`,
      userId: user.id,
      orbitId: orbit.orbitId,
      name,
      filters,
    });

    if (!row) return;

    set((state) => ({
      items: [row, ...state.items],
    }));
  },

  deleteSearch: async (id) => {
    const ok = await deleteSavedSearch(id);
    if (!ok) return;

    set((state) => ({
      items: state.items.filter((x) => x.id !== id),
    }));
  },
}));

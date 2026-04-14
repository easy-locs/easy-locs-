/**
 * Canonical Search Store — Single state for search, map, list, and heatmap.
 * Replaces: searchStore, radarStore filters, mapStore search logic.
 */
import { create } from "zustand";
import type { SearchState, SearchResult, AutocompleteGroup, SearchSuggestion } from "./search-types";
import { DEFAULT_SEARCH_STATE } from "./search-types";
import { resolveSearch, resolveAutocomplete } from "./search-resolver";
import { getSuggestions } from "./search-suggestions";

type UnifiedSearchStore = {
  // State
  state: SearchState;
  results: SearchResult[];
  autocomplete: AutocompleteGroup[];
  suggestions: SearchSuggestion[];
  loading: boolean;
  autocompleteLoading: boolean;
  totalCount: number;

  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchState>) => void;
  setRadius: (km: number) => void;
  setMode: (mode: SearchState["mode"]) => void;
  setSort: (sort: SearchState["sort"]) => void;
  setLocation: (lat: number, lng: number) => void;
  search: () => Promise<void>;
  fetchAutocomplete: (query: string) => Promise<void>;
  loadSuggestions: (userId?: string | null, lat?: number, lng?: number) => Promise<void>;
  reset: () => void;
  clearQuery: () => void;
};

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useUnifiedSearchStore = create<UnifiedSearchStore>((set, get) => ({
  state: { ...DEFAULT_SEARCH_STATE },
  results: [],
  autocomplete: [],
  suggestions: [],
  loading: false,
  autocompleteLoading: false,
  totalCount: 0,

  setQuery: (query) => {
    set((s) => ({ state: { ...s.state, query, page: 1 } }));
    // Debounced autocomplete
    if (_debounceTimer) clearTimeout(_debounceTimer);
    if (query.trim().length >= 2) {
      _debounceTimer = setTimeout(() => get().fetchAutocomplete(query), 200);
    } else {
      set({ autocomplete: [] });
    }
  },

  setFilters: (filters) => {
    set((s) => ({ state: { ...s.state, ...filters, page: 1 } }));
  },

  setRadius: (km) => {
    set((s) => ({ state: { ...s.state, radiusKm: km, page: 1 } }));
  },

  setMode: (mode) => {
    set((s) => ({ state: { ...s.state, mode } }));
  },

  setSort: (sort) => {
    set((s) => ({ state: { ...s.state, sort, page: 1 } }));
  },

  setLocation: (lat, lng) => {
    set((s) => ({ state: { ...s.state, lat, lng } }));
  },

  search: async () => {
    set({ loading: true });
    try {
      const { results, totalCount } = await resolveSearch(get().state);
      set({ results, totalCount, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchAutocomplete: async (query) => {
    set({ autocompleteLoading: true });
    try {
      const groups = await resolveAutocomplete(query, get().state);
      set({ autocomplete: groups, autocompleteLoading: false });
    } catch {
      set({ autocompleteLoading: false });
    }
  },

  loadSuggestions: async (userId, lat, lng) => {
    const suggestions = await getSuggestions(userId, lat, lng);
    set({ suggestions });
  },

  reset: () => {
    set({
      state: { ...DEFAULT_SEARCH_STATE },
      results: [],
      autocomplete: [],
      totalCount: 0,
    });
  },

  clearQuery: () => {
    set((s) => ({
      state: { ...s.state, query: "" },
      autocomplete: [],
    }));
  },
}));

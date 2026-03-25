/**
 * Shared Discovery Store — Unified search/filter state across all surfaces.
 * Radar, Map, Search, Discover, Home, Vertical hubs all consume this store.
 * Eliminates fragmented per-page search state.
 */
import { create } from "zustand";

export interface DiscoveryFilters {
  searchQuery: string;
  radiusKm: number | null;
  category: string;
  subcategory: string | null;
  vertical: string | null;
  city: string | null;
}

interface DiscoveryState extends DiscoveryFilters {
  setSearchQuery: (q: string) => void;
  setRadiusKm: (r: number | null) => void;
  setCategory: (c: string) => void;
  setSubcategory: (s: string | null) => void;
  setVertical: (v: string | null) => void;
  setCity: (c: string | null) => void;
  resetFilters: () => void;
}

const DEFAULTS: DiscoveryFilters = {
  searchQuery: "",
  radiusKm: null,
  category: "all",
  subcategory: null,
  vertical: null,
  city: null,
};

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  ...DEFAULTS,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setCategory: (category) => set({ category, subcategory: null }),
  setSubcategory: (subcategory) => set({ subcategory }),
  setVertical: (vertical) => set({ vertical }),
  setCity: (city) => set({ city }),
  resetFilters: () => set(DEFAULTS),
}));

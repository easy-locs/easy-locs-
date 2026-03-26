/**
 * Shared Discovery Store — Unified search/filter state across all surfaces.
 * Radar, Map, Search, Discover, Home, Vertical hubs all consume this store.
 *
 * NOTE: radiusKm removed from customer-facing controls.
 * Distance is now internal engine data only — driven by geo live station + serviceability.
 */
import { create } from "zustand";

export interface DiscoveryFilters {
  searchQuery: string;
  category: string;
  subcategory: string | null;
  vertical: string | null;
}

interface DiscoveryState extends DiscoveryFilters {
  setSearchQuery: (q: string) => void;
  setCategory: (c: string) => void;
  setSubcategory: (s: string | null) => void;
  setVertical: (v: string | null) => void;
  resetFilters: () => void;
}

const DEFAULTS: DiscoveryFilters = {
  searchQuery: "",
  category: "all",
  subcategory: null,
  vertical: null,
};

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  ...DEFAULTS,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCategory: (category) => set({ category, subcategory: null }),
  setSubcategory: (subcategory) => set({ subcategory }),
  setVertical: (vertical) => set({ vertical }),
  resetFilters: () => set(DEFAULTS),
}));

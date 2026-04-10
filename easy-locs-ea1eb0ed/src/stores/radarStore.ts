import { create } from "zustand";
import type { RadarCategory, RadarPoint, RadarSubCategory, UserGeoPoint } from "@/lib/radar/types";
import { sortRadarPoints } from "@/lib/radar/geo";
import { useDiscoveryStore } from "@/stores/discoveryStore";

export type SortMode = "nearest" | "best" | "trending" | "smart";

type RadarStore = {
  userLocation: UserGeoPoint | null;
  /**
   * @deprecated Read category from useDiscoveryStore instead.
   * Kept for backward compat. setCategory() syncs to discoveryStore.
   */
  category: RadarCategory;
  /**
   * @deprecated Read subcategory from useDiscoveryStore instead.
   * Kept for backward compat. setSubCategory() syncs to discoveryStore.
   */
  subcategory: RadarSubCategory | null;
  sortMode: SortMode;
  points: RadarPoint[];
  filtered: RadarPoint[];
  loading: boolean;
  menuOpen: boolean;
  mapMode: "list" | "map";

  setUserLocation: (loc: UserGeoPoint | null) => void;
  /** Writes to discoveryStore (SSOT) and mirrors locally for compat */
  setCategory: (cat: RadarCategory) => void;
  /** Writes to discoveryStore (SSOT) and mirrors locally for compat */
  setSubCategory: (sub: RadarSubCategory | null) => void;
  setSortMode: (mode: SortMode) => void;
  setPoints: (points: RadarPoint[]) => void;
  setMapMode: (mode: "list" | "map") => void;
  openMenu: () => void;
  closeMenu: () => void;
  /** Recomputes filtered using discoveryStore as SSOT for category/subcategory */
  refreshFiltered: () => void;
};

export const useRadarStore = create<RadarStore>((set, get) => ({
  userLocation: null,
  category: "all",
  subcategory: null,
  sortMode: "smart",
  points: [],
  filtered: [],
  loading: false,
  menuOpen: false,
  mapMode: "list",

  setUserLocation: (loc) => {
    set({ userLocation: loc });
    get().refreshFiltered();
  },

  setCategory: (cat) => {
    // Forward to discoveryStore (canonical SSOT)
    useDiscoveryStore.getState().setCategory(cat);
    // Mirror locally for backward compat
    set({ category: cat, subcategory: null });
    get().refreshFiltered();
  },

  setSubCategory: (sub) => {
    // Forward to discoveryStore (canonical SSOT)
    useDiscoveryStore.getState().setSubcategory(sub);
    // Mirror locally for backward compat
    set({ subcategory: sub });
    get().refreshFiltered();
  },

  setSortMode: (mode) => {
    set({ sortMode: mode });
    get().refreshFiltered();
  },

  setPoints: (points) => {
    set({ points });
    get().refreshFiltered();
  },

  setMapMode: (mode) => set({ mapMode: mode }),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),

  refreshFiltered: () => {
    const { points, userLocation, sortMode } = get();
    // SSOT: category and subcategory come from discoveryStore
    const { category, subcategory } = useDiscoveryStore.getState();
    const categoryFiltered = points.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      // Don't hard-filter subcategory here — let hierarchy scoring handle relevance
      return true;
    });
    const sorted = sortRadarPoints(categoryFiltered, userLocation, sortMode, {
      targetSubcategory: subcategory,
      targetVertical: category !== "all" ? category : undefined,
    });
    // Mirror to local state for compat reads
    set({ filtered: sorted, category: category as RadarCategory, subcategory: subcategory as RadarSubCategory | null });
  },
}));

import { create } from "zustand";
import type { RadarCategory, RadarPoint, RadarSubCategory, UserGeoPoint } from "@/lib/radar/types";
import { sortRadarPoints } from "@/lib/radar/geo";

type SortMode = "nearest" | "best" | "trending";

type RadarStore = {
  userLocation: UserGeoPoint | null;
  category: RadarCategory;
  subcategory: RadarSubCategory | null;
  sortMode: SortMode;
  points: RadarPoint[];
  filtered: RadarPoint[];
  loading: boolean;
  menuOpen: boolean;
  mapMode: "list" | "map";

  setUserLocation: (loc: UserGeoPoint | null) => void;
  setCategory: (cat: RadarCategory) => void;
  setSubCategory: (sub: RadarSubCategory | null) => void;
  setSortMode: (mode: SortMode) => void;
  setPoints: (points: RadarPoint[]) => void;
  setMapMode: (mode: "list" | "map") => void;
  openMenu: () => void;
  closeMenu: () => void;
  refreshFiltered: () => void;
};

export const useRadarStore = create<RadarStore>((set, get) => ({
  userLocation: null,
  category: "all",
  subcategory: null,
  sortMode: "nearest",
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
    set({ category: cat, subcategory: null });
    get().refreshFiltered();
  },
  setSubCategory: (sub) => {
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
    const { points, category, subcategory, userLocation, sortMode } = get();
    const categoryFiltered = points.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      return true;
    });
    const sorted = sortRadarPoints(categoryFiltered, userLocation, sortMode);
    set({ filtered: sorted });
  },
}));

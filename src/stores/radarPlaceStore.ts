/**
 * Radar Place Store — Holds the currently selected place context for the Radar map.
 * Drives: map center, zoom, live overlays, zone intelligence display.
 */
import { create } from "zustand";
import type { RadarPlaceSelection, ZoneOverlay } from "@/lib/radar/radar-place-search-adapter";

interface RadarPlaceState {
  /** Currently selected place (from search or map interaction) */
  selectedPlace: RadarPlaceSelection | null;
  /** Live zone overlay for the selected place's zone */
  zoneOverlay: ZoneOverlay | null;
  /** Search query in the radar search bar */
  searchQuery: string;
  /** Whether search is active/focused */
  searchActive: boolean;

  setSelectedPlace: (place: RadarPlaceSelection | null) => void;
  setZoneOverlay: (overlay: ZoneOverlay | null) => void;
  setSearchQuery: (q: string) => void;
  setSearchActive: (active: boolean) => void;
  clearSelection: () => void;
}

export const useRadarPlaceStore = create<RadarPlaceState>((set) => ({
  selectedPlace: null,
  zoneOverlay: null,
  searchQuery: "",
  searchActive: false,

  setSelectedPlace: (place) => set({ selectedPlace: place, zoneOverlay: place?.overlay ?? null }),
  setZoneOverlay: (overlay) => set({ zoneOverlay: overlay }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchActive: (active) => set({ searchActive: active }),
  clearSelection: () => set({ selectedPlace: null, zoneOverlay: null, searchQuery: "" }),
}));

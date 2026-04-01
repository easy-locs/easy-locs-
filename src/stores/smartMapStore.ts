/**
 * Smart Map Store — Unified SSOT for the intelligent map surface.
 * Viewport, search, weather, layers, selection, results — all in one place.
 */
import { create } from "zustand";
import type { MapSearchResult, MapSearchIntent } from "@/lib/map/smart-map-search";

// ── VIEWPORT ──
export interface SmartMapViewport {
  centerLat: number;
  centerLng: number;
  zoom: number;
  mode: "follow_user" | "free_browse";
}

// ── SEARCH ──
export interface SmartMapSearch {
  rawQuery: string;
  intent: MapSearchIntent | null;
  status: "idle" | "searching" | "live" | "empty" | "error";
  results: MapSearchResult[];
  highlightedId: string | null;
}

// ── BOTTOM SHEET ──
export type SheetSnapPoint = "closed" | "collapsed" | "half" | "expanded";

// ── FULL STATE ──
interface SmartMapState {
  // Viewport
  viewport: SmartMapViewport;
  setViewport: (v: Partial<SmartMapViewport>) => void;
  setFollowUser: () => void;
  setFreeBrowse: () => void;

  // User location
  userLat: number | null;
  userLng: number | null;
  setUserLocation: (lat: number, lng: number) => void;

  // Search
  search: SmartMapSearch;
  setSearchQuery: (q: string) => void;
  setSearchIntent: (intent: MapSearchIntent | null) => void;
  setSearchStatus: (s: SmartMapSearch["status"]) => void;
  setSearchResults: (results: MapSearchResult[]) => void;
  clearSearch: () => void;

  // Selection
  selectedResultId: string | null;
  selectResult: (id: string | null) => void;

  // Sheet
  sheetSnap: SheetSnapPoint;
  setSheetSnap: (snap: SheetSnapPoint) => void;

  // Search bar focus
  searchFocused: boolean;
  setSearchFocused: (f: boolean) => void;
}

export const useSmartMapStore = create<SmartMapState>((set) => ({
  // Viewport
  viewport: {
    centerLat: 25.2048,
    centerLng: 55.2708,
    zoom: 13,
    mode: "follow_user",
  },
  setViewport: (v) => set((s) => ({
    viewport: { ...s.viewport, ...v },
  })),
  setFollowUser: () => set((s) => ({
    viewport: { ...s.viewport, mode: "follow_user" },
  })),
  setFreeBrowse: () => set((s) => ({
    viewport: { ...s.viewport, mode: "free_browse" },
  })),

  // User location
  userLat: null,
  userLng: null,
  setUserLocation: (lat, lng) => set({ userLat: lat, userLng: lng }),

  // Search
  search: {
    rawQuery: "",
    intent: null,
    status: "idle",
    results: [],
    highlightedId: null,
  },
  setSearchQuery: (q) => set((s) => ({
    search: { ...s.search, rawQuery: q },
  })),
  setSearchIntent: (intent) => set((s) => ({
    search: { ...s.search, intent },
  })),
  setSearchStatus: (status) => set((s) => ({
    search: { ...s.search, status },
  })),
  setSearchResults: (results) => set((s) => ({
    search: {
      ...s.search,
      results,
      status: results.length > 0 ? "live" : "empty",
    },
  })),
  clearSearch: () => set({
    search: { rawQuery: "", intent: null, status: "idle", results: [], highlightedId: null },
    selectedResultId: null,
    sheetSnap: "closed",
  }),

  // Selection
  selectedResultId: null,
  selectResult: (id) => set({
    selectedResultId: id,
    sheetSnap: id ? "half" : "closed",
  }),

  // Sheet
  sheetSnap: "closed",
  setSheetSnap: (snap) => set({ sheetSnap: snap }),

  // Search focus
  searchFocused: false,
  setSearchFocused: (f) => set({ searchFocused: f }),
}));

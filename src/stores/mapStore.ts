/**
 * mapStore — Unified SSOT for all map/search/layer/sheet state.
 * Merges superMapStore + smartMapStore into one canonical store.
 * GPS user position lives in locationStore — never duplicated here.
 */
import { create } from "zustand";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import type { MapSearchResult, MapSearchIntent } from "@/lib/map/smart-map-search";
import type { SuperMapMode } from "@/lib/map/superMapLayers";

// ── Mobility + Zone types (from superMapStore) ──
export interface MobilityPoint {
  id: string;
  lat: number;
  lng: number;
  vehicleType: "taxi" | "courier" | "bike";
  bearing?: number;
  label?: string;
  speed?: number;
}

export interface MapZone {
  id: string;
  lat: number;
  lng: number;
  zoneType: "demand" | "surge" | "event" | "delivery";
  intensity?: number;
  label?: string;
}

// ── Sheet ──
export type SheetSnapPoint = "closed" | "collapsed" | "half" | "expanded";

// ── Full unified state ──
interface UnifiedMapState {
  // Viewport
  viewport: {
    centerLat: number;
    centerLng: number;
    zoom: number;
    mode: "follow_user" | "free_browse";
  };

  // SuperMap mode (explore, food, mobility, etc.)
  mapMode: SuperMapMode;

  // Entities
  entities: GeoEntity[];
  mobilityPoints: MobilityPoint[];
  zones: MapZone[];

  // Layers
  showHeatmap: boolean;
  showMobility: boolean;
  showRadius: boolean;
  radiusKm: number;

  // Selection
  selectedEntityId: string | null;

  // Search
  search: {
    rawQuery: string;
    intent: MapSearchIntent | null;
    status: "idle" | "searching" | "live" | "empty" | "error";
    results: MapSearchResult[];
    highlightedId: string | null;
  };

  // Bottom sheet
  sheetSnap: SheetSnapPoint;

  // Search bar focus
  searchFocused: boolean;

  // ── Actions: Viewport ──
  setViewport: (v: Partial<UnifiedMapState["viewport"]>) => void;
  setFollowUser: () => void;
  setFreeBrowse: () => void;
  setCenter: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;

  // ── Actions: Mode ──
  setMode: (mode: SuperMapMode) => void;

  // ── Actions: Entities ──
  setEntities: (entities: GeoEntity[]) => void;
  setMobilityPoints: (points: MobilityPoint[]) => void;
  setZones: (zones: MapZone[]) => void;

  // ── Actions: Layers ──
  toggleHeatmap: () => void;
  toggleMobility: () => void;
  toggleRadius: () => void;
  setRadiusKm: (km: number) => void;

  // ── Actions: Selection ──
  selectEntity: (id: string | null) => void;

  // ── Actions: Search ──
  setSearchQuery: (q: string) => void;
  setSearchIntent: (intent: MapSearchIntent | null) => void;
  setSearchStatus: (s: UnifiedMapState["search"]["status"]) => void;
  setSearchResults: (results: MapSearchResult[]) => void;
  clearSearch: () => void;

  // ── Actions: Sheet ──
  setSheetSnap: (snap: SheetSnapPoint) => void;

  // ── Actions: Search focus ──
  setSearchFocused: (f: boolean) => void;

  // ── Actions: Reset ──
  resetMapUI: () => void;
}

const DEFAULT_SEARCH = {
  rawQuery: "",
  intent: null as MapSearchIntent | null,
  status: "idle" as const,
  results: [] as MapSearchResult[],
  highlightedId: null as string | null,
};

export const useUnifiedMapStore = create<UnifiedMapState>((set) => ({
  // Viewport
  viewport: {
    centerLat: 25.2048,
    centerLng: 55.2708,
    zoom: 12,
    mode: "follow_user",
  },

  // Mode
  mapMode: "explore",

  // Entities
  entities: [],
  mobilityPoints: [],
  zones: [],

  // Layers
  showHeatmap: false,
  showMobility: true,
  showRadius: false,
  radiusKm: 5,

  // Selection
  selectedEntityId: null,

  // Search
  search: { ...DEFAULT_SEARCH },

  // Sheet
  sheetSnap: "closed",

  // Focus
  searchFocused: false,

  // ── Viewport actions ──
  setViewport: (v) => set((s) => ({ viewport: { ...s.viewport, ...v } })),
  setFollowUser: () => set((s) => ({ viewport: { ...s.viewport, mode: "follow_user" } })),
  setFreeBrowse: () => set((s) => ({ viewport: { ...s.viewport, mode: "free_browse" } })),
  setCenter: (lat, lng) => set((s) => ({
    viewport: { ...s.viewport, centerLat: lat, centerLng: lng },
  })),
  setZoom: (zoom) => set((s) => ({ viewport: { ...s.viewport, zoom } })),

  // ── Mode ──
  setMode: (mode) => set({ mapMode: mode }),

  // ── Entities ──
  setEntities: (entities) => set({ entities }),
  setMobilityPoints: (points) => set({ mobilityPoints: points }),
  setZones: (zones) => set({ zones }),

  // ── Layers ──
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  toggleMobility: () => set((s) => ({ showMobility: !s.showMobility })),
  toggleRadius: () => set((s) => ({ showRadius: !s.showRadius })),
  setRadiusKm: (km) => set({ radiusKm: km }),

  // ── Selection ──
  selectEntity: (id) => set({ selectedEntityId: id }),

  // ── Search ──
  setSearchQuery: (q) => set((s) => ({ search: { ...s.search, rawQuery: q } })),
  setSearchIntent: (intent) => set((s) => ({ search: { ...s.search, intent } })),
  setSearchStatus: (status) => set((s) => ({ search: { ...s.search, status } })),
  setSearchResults: (results) => set((s) => ({
    search: {
      ...s.search,
      results,
      status: results.length > 0 ? "live" : "empty",
    },
  })),
  clearSearch: () => set({
    search: { ...DEFAULT_SEARCH },
    selectedEntityId: null,
    sheetSnap: "closed",
  }),

  // ── Sheet ──
  setSheetSnap: (snap) => set({ sheetSnap: snap }),

  // ── Focus ──
  setSearchFocused: (f) => set({ searchFocused: f }),

  // ── Reset ──
  resetMapUI: () => set({
    search: { ...DEFAULT_SEARCH },
    selectedEntityId: null,
    sheetSnap: "closed",
    searchFocused: false,
  }),
}));

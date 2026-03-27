/**
 * superMapStore.ts — Zustand store for the SuperMap engine.
 * Manages mode, layer visibility, entities, mobility points, zones, and real-time state.
 */
import { create } from "zustand";
import type { SuperMapMode } from "@/lib/map/superMapLayers";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

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

interface SuperMapState {
  mode: SuperMapMode;
  entities: GeoEntity[];
  mobilityPoints: MobilityPoint[];
  zones: MapZone[];
  selectedEntityId: string | null;
  showHeatmap: boolean;
  showWeather: boolean;
  showStations: boolean;
  showMobility: boolean;
  showRadius: boolean;
  radiusKm: number;
  userLat: number | null;
  userLng: number | null;
  centerLat: number;
  centerLng: number;
  zoom: number;

  // Actions
  setMode: (mode: SuperMapMode) => void;
  setEntities: (entities: GeoEntity[]) => void;
  setMobilityPoints: (points: MobilityPoint[]) => void;
  setZones: (zones: MapZone[]) => void;
  selectEntity: (id: string | null) => void;
  setUserLocation: (lat: number, lng: number) => void;
  setCenter: (lat: number, lng: number) => void;
  setZoom: (zoom: number) => void;
  setRadiusKm: (km: number) => void;
  toggleHeatmap: () => void;
  toggleWeather: () => void;
  toggleStations: () => void;
  toggleMobility: () => void;
  toggleRadius: () => void;
}

export const useSuperMapStore = create<SuperMapState>((set) => ({
  mode: "explore",
  entities: [],
  mobilityPoints: [],
  zones: [],
  selectedEntityId: null,
  showHeatmap: false,
  showWeather: true,
  showStations: true,
  showMobility: true,
  showRadius: false,
  radiusKm: 5,
  userLat: null,
  userLng: null,
  centerLat: 25.2048,
  centerLng: 55.2708,
  zoom: 12,

  setMode: (mode) => set({ mode }),
  setEntities: (entities) => set({ entities }),
  setMobilityPoints: (points) => set({ mobilityPoints: points }),
  setZones: (zones) => set({ zones }),
  selectEntity: (id) => set({ selectedEntityId: id }),
  setUserLocation: (lat, lng) => set({ userLat: lat, userLng: lng }),
  setCenter: (lat, lng) => set({ centerLat: lat, centerLng: lng }),
  setZoom: (zoom) => set({ zoom }),
  setRadiusKm: (km) => set({ radiusKm: km }),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  toggleWeather: () => set((s) => ({ showWeather: !s.showWeather })),
  toggleStations: () => set((s) => ({ showStations: !s.showStations })),
  toggleMobility: () => set((s) => ({ showMobility: !s.showMobility })),
  toggleRadius: () => set((s) => ({ showRadius: !s.showRadius })),
}));

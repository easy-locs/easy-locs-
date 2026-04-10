/**
 * useMapLayersStore — Zustand store managing canonical map layer visibility with presets.
 * Default preset: CLEAN — minimal, visual-first, labels OFF.
 */
import { create } from "zustand";
import type { UnifiedMapLayerFlags } from "@/types/map";

type State = {
  layers: UnifiedMapLayerFlags;
  activePreset: "clean" | "liveRadar" | "deliveryOps" | "custom";
  toggle: (key: keyof UnifiedMapLayerFlags) => void;
  setLayer: (key: keyof UnifiedMapLayerFlags, value: boolean) => void;
  reset: () => void;
  enableClean: () => void;
  enableLiveRadar: () => void;
  enableDeliveryOps: () => void;
};

/** CLEAN preset — visual-first, labels off, no overlay clutter */
const cleanLayers: UnifiedMapLayerFlags = {
  userLocation: true,
  restaurants: true,
  grocery: true,
  hotels: true,
  properties: true,
  services: true,
  drivers: true,
  orders: false,
  pickups: false,
  dropoffs: false,
  warehouses: false,
  clusters: true,
  labels: false,       // OFF by default — show only on zoom/select/hover
  heatmap: false,
  routes: false,
  zones: false,
  radius: false,
  selectedHighlight: true,
  weather: false,
  rainRadar: false,
  traffic: false,
};

export const useMapLayersStore = create<State>((set) => ({
  layers: { ...cleanLayers },
  activePreset: "clean",

  toggle: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] }, activePreset: "custom" })),

  setLayer: (key, value) =>
    set((s) => ({ layers: { ...s.layers, [key]: value }, activePreset: "custom" })),

  reset: () => set({ layers: { ...cleanLayers }, activePreset: "clean" }),

  enableClean: () =>
    set({ layers: { ...cleanLayers }, activePreset: "clean" }),

  enableLiveRadar: () =>
    set({
      activePreset: "liveRadar",
      layers: {
        ...cleanLayers,
        weather: true,
        rainRadar: true,
        heatmap: true,
        traffic: true,
        orders: true,
        warehouses: true,
      },
    }),

  enableDeliveryOps: () =>
    set({
      activePreset: "deliveryOps",
      layers: {
        ...cleanLayers,
        drivers: true,
        orders: true,
        pickups: true,
        dropoffs: true,
        routes: true,
        zones: true,
        labels: true,
      },
    }),
}));

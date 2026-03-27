/**
 * useMapLayersStore — Zustand store managing canonical map layer visibility with presets.
 */
import { create } from "zustand";
import type { UnifiedMapLayerFlags } from "@/types/map";

type State = {
  layers: UnifiedMapLayerFlags;
  toggle: (key: keyof UnifiedMapLayerFlags) => void;
  setLayer: (key: keyof UnifiedMapLayerFlags, value: boolean) => void;
  reset: () => void;
  enableBusinessOnly: () => void;
  enableDeliveryOps: () => void;
  enableFullRadar: () => void;
};

const defaultLayers: UnifiedMapLayerFlags = {
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
  labels: true,
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
  layers: { ...defaultLayers },

  toggle: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),

  setLayer: (key, value) =>
    set((s) => ({ layers: { ...s.layers, [key]: value } })),

  reset: () => set({ layers: { ...defaultLayers } }),

  enableBusinessOnly: () =>
    set({
      layers: {
        ...defaultLayers,
        drivers: false,
        orders: false,
        pickups: false,
        dropoffs: false,
        routes: false,
        heatmap: false,
        weather: false,
        rainRadar: false,
      },
    }),

  enableDeliveryOps: () =>
    set({
      layers: {
        ...defaultLayers,
        drivers: true,
        orders: true,
        pickups: true,
        dropoffs: true,
        routes: true,
        heatmap: true,
        zones: true,
      },
    }),

  enableFullRadar: () =>
    set({
      layers: {
        ...defaultLayers,
        orders: true,
        warehouses: true,
        heatmap: true,
        weather: true,
        rainRadar: true,
        traffic: true,
      },
    }),
}));

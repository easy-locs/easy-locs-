import { create } from "zustand";

export type TransportMode = "driving" | "walking" | "cycling";

export interface InAppNavigationState {
  open: boolean;
  lat: number | null;
  lng: number | null;
  label: string | null;
  mode: TransportMode;

  openNavigation: (params: {
    lat: number;
    lng: number;
    label?: string;
    mode?: TransportMode;
  }) => void;
  close: () => void;
}

export const useInAppNavigation = create<InAppNavigationState>((set) => ({
  open: false,
  lat: null,
  lng: null,
  label: null,
  mode: "driving",

  openNavigation: ({ lat, lng, label, mode }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    set({
      open: true,
      lat,
      lng,
      label: label || null,
      mode: mode || "driving",
    });
  },

  close: () =>
    set({
      open: false,
      lat: null,
      lng: null,
      label: null,
      mode: "driving",
    }),
}));

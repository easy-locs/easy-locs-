import { create } from "zustand";

export type TransportMode = "driving" | "walking" | "cycling";

export interface InAppNavigationState {
  open: boolean;
  lat: number | null;
  lng: number | null;
  label: string | null;
  mode: TransportMode;

  isNavigating: boolean;
  currentStepIndex: number;
  currentInstruction: string | null;

  openNavigation: (params: {
    lat: number;
    lng: number;
    label?: string;
    mode?: TransportMode;
  }) => void;
  close: () => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  setCurrentStep: (index: number, instruction: string | null) => void;
}

export const useInAppNavigation = create<InAppNavigationState>((set) => ({
  open: false,
  lat: null,
  lng: null,
  label: null,
  mode: "driving",

  isNavigating: false,
  currentStepIndex: 0,
  currentInstruction: null,

  openNavigation: ({ lat, lng, label, mode }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    set({
      open: true,
      lat,
      lng,
      label: label || null,
      mode: mode || "driving",
      isNavigating: false,
      currentStepIndex: 0,
      currentInstruction: null,
    });
  },

  startNavigation: () =>
    set({ isNavigating: true }),

  stopNavigation: () =>
    set({
      isNavigating: false,
      currentStepIndex: 0,
      currentInstruction: null,
    }),

  setCurrentStep: (index, instruction) =>
    set({ currentStepIndex: index, currentInstruction: instruction }),

  close: () =>
    set({
      open: false,
      lat: null,
      lng: null,
      label: null,
      mode: "driving",
      isNavigating: false,
      currentStepIndex: 0,
      currentInstruction: null,
    }),
}));

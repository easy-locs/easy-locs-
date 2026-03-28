import { create } from "zustand";

export type GeoPoint = {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

export type GeoPermission = "unknown" | "granted" | "denied" | "prompt";
export type GeoSource = "gps" | "ip" | "fallback" | "manual";

type GeoState = {
  ready: boolean;
  loading: boolean;
  permission: GeoPermission;
  tracking: boolean;
  point: GeoPoint | null;
  source: GeoSource;
  city: string | null;
  country: string | null;
  error: string | null;
  watchId: number | null;
  lastUpdated: number | null;
  setStatePartial: (data: Partial<GeoState>) => void;
};

export const useGeoStore = create<GeoState>((set) => ({
  ready: false,
  loading: false,
  permission: "unknown",
  tracking: false,
  point: null,
  source: "fallback",
  city: null,
  country: null,
  error: null,
  watchId: null,
  lastUpdated: null,
  setStatePartial: (data) => set((prev) => ({ ...prev, ...data, lastUpdated: Date.now() })),
}));

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

type GeoState = {
  ready: boolean;
  loading: boolean;
  permission: GeoPermission;
  tracking: boolean;
  point: GeoPoint | null;
  error: string | null;
  watchId: number | null;
  setStatePartial: (data: Partial<GeoState>) => void;
};

export const useGeoStore = create<GeoState>((set) => ({
  ready: false,
  loading: false,
  permission: "unknown",
  tracking: false,
  point: null,
  error: null,
  watchId: null,
  setStatePartial: (data) => set(data),
}));

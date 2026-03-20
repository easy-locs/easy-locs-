import { create } from "zustand";
import type { GeoPosition } from "@/lib/types/domain";
import { platformBus } from "@/app/events/platform-bus";
import { usePermissionStore } from "./permissionStore";

type GeoStore = {
  currentPosition: GeoPosition;
  permission: "prompt" | "granted" | "denied";
  mapReady: boolean;
  watchId: number | null;

  setMapReady: (ready: boolean) => void;
  setPermission: (state: "prompt" | "granted" | "denied") => void;
  setPosition: (payload: GeoPosition) => void;

  refreshCurrentPosition: () => Promise<GeoPosition | null>;
  startWatching: () => void;
  stopWatching: () => void;
};

export const useGeoStore = create<GeoStore>((set, get) => ({
  currentPosition: { lat: 0, lng: 0, accuracy: null, updatedAt: null },
  permission: "prompt",
  mapReady: false,
  watchId: null,

  setMapReady: (ready) => set({ mapReady: ready }),
  setPermission: (state) => set({ permission: state }),
  setPosition: (payload) => {
    set({ currentPosition: payload });
    platformBus.emit({
      type: "geo.position.updated",
      payload: { lat: payload.lat, lng: payload.lng, accuracy: payload.accuracy },
    });
  },

  refreshCurrentPosition: async () => {
    const position = await usePermissionStore.getState().requestGeolocation();
    if (!position) {
      set({ permission: "denied" });
      return null;
    }
    const next: GeoPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      updatedAt: new Date().toISOString(),
    };
    set({ permission: "granted", currentPosition: next });
    platformBus.emit({
      type: "geo.position.updated",
      payload: { lat: next.lat, lng: next.lng, accuracy: next.accuracy },
    });
    return next;
  },

  startWatching: () => {
    if (!navigator.geolocation) { set({ permission: "denied" }); return; }
    const existing = get().watchId;
    if (existing !== null) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next: GeoPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          updatedAt: new Date().toISOString(),
        };
        set({ permission: "granted", currentPosition: next });
        platformBus.emit({
          type: "geo.position.updated",
          payload: { lat: next.lat, lng: next.lng, accuracy: next.accuracy },
        });
      },
      () => { set({ permission: "denied" }); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    set({ watchId });
  },

  stopWatching: () => {
    const watchId = get().watchId;
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
    set({ watchId: null });
  },
}));

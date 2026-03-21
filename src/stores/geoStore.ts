/**
 * geoStore — DEPRECATED BRIDGE.
 * All consumers should migrate to useLocationStore.
 * This bridge keeps existing consumers working while migration happens.
 */
import { create } from "zustand";
import { useLocationStore } from "./locationStore";
import type { GeoPosition } from "@/lib/types/domain";
import { platformBus } from "@/app/events/platform-bus";

type GeoStore = {
  /** @deprecated Use useLocationStore instead */
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
    // Bridge: sync to locationStore
    useLocationStore.getState().setCurrentLocation({
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy,
      timestamp: payload.updatedAt,
    });
    platformBus.emit({
      type: "geo.position.updated",
      payload: { lat: payload.lat, lng: payload.lng, accuracy: payload.accuracy },
    });
  },

  refreshCurrentPosition: async () => {
    if (!navigator.geolocation) {
      set({ permission: "denied" });
      return null;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: GeoPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            updatedAt: new Date().toISOString(),
          };
          set({ permission: "granted", currentPosition: next });
          // Bridge: sync to locationStore
          useLocationStore.getState().setCurrentLocation({
            lat: next.lat,
            lng: next.lng,
            accuracy: next.accuracy,
            timestamp: next.updatedAt,
          });
          useLocationStore.getState().setPermissionState("granted");
          platformBus.emit({
            type: "geo.position.updated",
            payload: { lat: next.lat, lng: next.lng, accuracy: next.accuracy },
          });
          resolve(next);
        },
        () => {
          set({ permission: "denied" });
          useLocationStore.getState().setPermissionState("denied");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
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
        useLocationStore.getState().setCurrentLocation({
          lat: next.lat, lng: next.lng, accuracy: next.accuracy, timestamp: next.updatedAt,
        });
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

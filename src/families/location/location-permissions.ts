/**
 * location.permissions — Canonical permission detection and request.
 */
import { useGeoStore } from "@/lib/geo/geo-store";
import { useLocationStore, type PermissionState } from "@/stores/locationStore";

export const LocationPermissions = {
  /** Get current permission state */
  getState(): PermissionState {
    return useLocationStore.getState().permissionState;
  },

  /** Check if geolocation API is available */
  isAvailable(): boolean {
    return typeof navigator !== "undefined" && "geolocation" in navigator;
  },

  /** Request permission by triggering a one-shot position request */
  async request(): Promise<PermissionState> {
    if (!this.isAvailable()) {
      useLocationStore.getState().setPermissionState("unavailable");
      return "unavailable";
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          useGeoStore.getState().setStatePartial({
            permission: "granted",
            point: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              timestamp: pos.timestamp,
            },
            ready: true,
            source: "gps",
          });
          resolve("granted");
        },
        (err) => {
          const state: PermissionState = err.code === 1 ? "denied" : "unknown";
          useGeoStore.getState().setStatePartial({ permission: state === "denied" ? "denied" : "prompt", ready: true });
          resolve(state);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
    });
  },

  /** Check if granted */
  isGranted(): boolean {
    return this.getState() === "granted";
  },
};

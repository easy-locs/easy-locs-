/**
 * geolocation.ts — Compatibility shim. All GPS now goes through geoService/geoStore.
 * These exports exist for files that still import from here (useServiceTracking, useLiveTracking).
 */
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";

export interface GeoResult {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  source: "gps" | "lastKnown" | "manual" | "fallback";
}

export interface GeoError {
  code: number;
  message: string;
}

export function isGeoSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.geolocation;
}

export async function getGeoPermissionState(): Promise<"granted" | "denied" | "prompt"> {
  if (!navigator.permissions) return "prompt";
  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return result.state as "granted" | "denied" | "prompt";
  } catch {
    return "prompt";
  }
}

export async function getCurrentPositionHighAccuracy(): Promise<GeoResult> {
  const point = useGeoStore.getState().point;
  if (point) {
    return {
      lat: point.lat,
      lng: point.lng,
      accuracy: point.accuracy ?? 0,
      timestamp: new Date(point.timestamp).toISOString(),
      source: "gps",
    };
  }
  // Force retry and wait
  geoService.forceRetry();
  return new Promise((resolve, reject) => {
    const unsub = useGeoStore.subscribe((state) => {
      if (state.point) {
        unsub();
        resolve({
          lat: state.point.lat,
          lng: state.point.lng,
          accuracy: state.point.accuracy ?? 0,
          timestamp: new Date(state.point.timestamp).toISOString(),
          source: "gps",
        });
      }
    });
    setTimeout(() => {
      unsub();
      const p = useGeoStore.getState().point;
      if (p) {
        resolve({ lat: p.lat, lng: p.lng, accuracy: p.accuracy ?? 0, timestamp: new Date(p.timestamp).toISOString(), source: "gps" });
      } else {
        reject({ code: 0, message: "Location unavailable" } as GeoError);
      }
    }, 8000);
  });
}

/** @deprecated — GPS watching is now handled by geoService.start() */
export function watchCurrentPosition(
  onUpdate: (result: GeoResult) => void,
  _onError?: (err: GeoError) => void,
): void {
  // Bridge: subscribe to geoStore and forward updates
  const unsub = useGeoStore.subscribe((state) => {
    if (state.point) {
      onUpdate({
        lat: state.point.lat,
        lng: state.point.lng,
        accuracy: state.point.accuracy ?? 0,
        timestamp: new Date(state.point.timestamp).toISOString(),
        source: "gps",
      });
    }
  });
  // Store unsub for cleanup — caller should use stopWatchingPosition
  (watchCurrentPosition as any)._unsub = unsub;
}

export function stopWatchingPosition(): void {
  if ((watchCurrentPosition as any)?._unsub) {
    (watchCurrentPosition as any)._unsub();
    (watchCurrentPosition as any)._unsub = null;
  }
}

/** Classify accuracy level */
export function classifyAccuracy(meters: number): "excellent" | "good" | "approximate" | "poor" {
  if (meters <= 10) return "excellent";
  if (meters <= 50) return "good";
  if (meters <= 500) return "approximate";
  return "poor";
}

/**
 * geolocation.ts — Real GPS helpers. Single source of truth for raw position access.
 * Enhanced with accuracy classification and explicit fallback policy.
 */

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

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 15000,
};

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

export function getCurrentPositionHighAccuracy(): Promise<GeoResult> {
  if (!isGeoSupported()) {
    return Promise.reject({ code: 0, message: "Geolocation not supported" } as GeoError);
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString(),
          source: "gps",
        });
      },
      (err) => {
        reject({ code: err.code, message: err.message } as GeoError);
      },
      GEO_OPTIONS,
    );
  });
}

let _watchId: number | null = null;

export function watchCurrentPosition(
  onUpdate: (result: GeoResult) => void,
  onError?: (err: GeoError) => void,
): void {
  if (!isGeoSupported()) return;
  stopWatchingPosition();

  _watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: new Date(pos.timestamp).toISOString(),
        source: "gps",
      });
    },
    (err) => {
      onError?.({ code: err.code, message: err.message });
    },
    GEO_OPTIONS,
  );
}

export function stopWatchingPosition(): void {
  if (_watchId !== null && isGeoSupported()) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
  }
}

/** Classify accuracy level */
export function classifyAccuracy(meters: number): "excellent" | "good" | "approximate" | "poor" {
  if (meters <= 10) return "excellent";
  if (meters <= 50) return "good";
  if (meters <= 500) return "approximate";
  return "poor";
}

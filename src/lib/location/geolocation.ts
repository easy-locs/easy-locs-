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

// ── Safe multi-watcher support ──
const _activeWatchers = new Map<number, () => void>();
let _watcherIdCounter = 0;

/**
 * @deprecated — GPS watching is handled by geoService.start().
 * This shim bridges legacy callers safely with multi-watcher support.
 */
export function watchCurrentPosition(
  onUpdate: (result: GeoResult) => void,
  _onError?: (err: GeoError) => void,
): number {
  const id = ++_watcherIdCounter;
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
  _activeWatchers.set(id, unsub);
  return id;
}

export function stopWatchingPosition(watcherId?: number): void {
  if (watcherId != null) {
    const unsub = _activeWatchers.get(watcherId);
    if (unsub) {
      unsub();
      _activeWatchers.delete(watcherId);
    }
  } else {
    // Stop all watchers (legacy compat)
    _activeWatchers.forEach((unsub) => unsub());
    _activeWatchers.clear();
  }
}

import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage, serializeForDebug } from "@/lib/debug/debug-helpers";

export interface LiveLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

function assertGeolocationSupport() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported on this device");
  }
}

function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || window.location.protocol === "https:";
}

export async function checkGeolocationPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!navigator.permissions) return "prompt";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state as "granted" | "denied" | "prompt";
  } catch {
    return "prompt";
  }
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  assertGeolocationSupport();

  if (!isSecureContext()) {
    const err = new Error("Geolocation requires a secure context (HTTPS)");
    debugLog.error("geo", "geo_insecure_context", err.message);
    return Promise.reject(err);
  }

  debugLog.info("geo", "geo_request_start", "Requesting geolocation");

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        debugLog.success("geo", "geo_request_success", "Position received", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        resolve(pos);
      },
      (err) => {
        debugLog.error("geo", "geo_request_error", err.message, serializeForDebug(err));
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export async function readLiveLocation(): Promise<LiveLocation> {
  // Pre-check permission
  const perm = await checkGeolocationPermission();
  if (perm === "denied") {
    const err = new Error("Location permission denied. Enable in browser settings.");
    debugLog.error("geo", "geo_permission_denied", err.message);
    throw err;
  }

  try {
    const pos = await getCurrentPosition();
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading ?? undefined,
      speed: pos.coords.speed ?? undefined,
      recordedAt: new Date().toISOString(),
    };
  } catch (e) {
    debugLog.error("geo", "geo_read_failed", safeErrorMessage(e));
    throw e;
  }
}

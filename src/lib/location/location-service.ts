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

export function getCurrentPosition(): Promise<GeolocationPosition> {
  assertGeolocationSupport();
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
        maximumAge: 3000,
      }
    );
  });
}

export async function readLiveLocation(): Promise<LiveLocation> {
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

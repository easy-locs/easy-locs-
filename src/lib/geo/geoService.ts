/**
 * GeoService — Production-grade GPS with accuracy filtering,
 * throttling, caching, and fallback logic.
 */

export interface GeoResult {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

const MIN_ACCURACY_M = 150; // reject readings worse than this
const THROTTLE_MS = 2000;
const CACHE_KEY = "geo:last-valid";

let lastEmit = 0;
let lastValid: GeoResult | null = null;

/** Read cached last-valid position */
export function getCachedPosition(): GeoResult | null {
  if (lastValid) return lastValid;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GeoResult;
  } catch {
    return null;
  }
}

function cachePosition(pos: GeoResult) {
  lastValid = pos;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(pos));
  } catch {}
}

/** Get current position with accuracy filtering */
export function getCurrentPosition(opts?: {
  maxAccuracy?: number;
  timeout?: number;
}): Promise<GeoResult | null> {
  const maxAcc = opts?.maxAccuracy ?? MIN_ACCURACY_M;
  const timeout = opts?.timeout ?? 12000;

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getCachedPosition());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const result: GeoResult = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
        };

        if (result.accuracy <= maxAcc) {
          cachePosition(result);
          resolve(result);
        } else {
          // Low accuracy — return cached if better, else this one
          const cached = getCachedPosition();
          if (cached && cached.accuracy < result.accuracy) {
            resolve(cached);
          } else {
            cachePosition(result);
            resolve(result);
          }
        }
      },
      () => resolve(getCachedPosition()),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 }
    );
  });
}

/** Watch position with accuracy filter + throttle */
export function watchPosition(
  onUpdate: (pos: GeoResult) => void,
  opts?: { maxAccuracy?: number; throttleMs?: number }
): () => void {
  if (!navigator.geolocation) return () => {};

  const maxAcc = opts?.maxAccuracy ?? MIN_ACCURACY_M;
  const throttle = opts?.throttleMs ?? THROTTLE_MS;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const now = Date.now();
      if (now - lastEmit < throttle) return;

      const result: GeoResult = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: now,
      };

      if (result.accuracy > maxAcc) return; // skip noisy readings

      // Smooth: skip if < 5m movement
      if (lastValid) {
        const dLat = Math.abs(result.lat - lastValid.lat);
        const dLng = Math.abs(result.lng - lastValid.lng);
        if (dLat < 0.00005 && dLng < 0.00005) return;
      }

      lastEmit = now;
      cachePosition(result);
      onUpdate(result);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

/** IP-based fallback location (approximate) */
export async function getIpLocation(): Promise<GeoResult | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude !== "number") return null;
    return {
      lat: data.latitude,
      lng: data.longitude,
      accuracy: 5000, // city-level
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

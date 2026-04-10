/**
 * IP-based geolocation fallback — used when GPS is denied/unavailable.
 * Uses free ipapi.co service (no key required, 1000 req/day).
 */

export interface IPGeoResult {
  lat: number;
  lng: number;
  city: string;
  country: string;
  source: "ip";
}

// Default fallback: Dubai
const DEFAULT_FALLBACK: IPGeoResult = {
  lat: 25.2048,
  lng: 55.2708,
  city: "Dubai",
  country: "AE",
  source: "ip",
};

let _cached: IPGeoResult | null = null;

export async function getIPLocation(): Promise<IPGeoResult> {
  if (_cached) return _cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return DEFAULT_FALLBACK;

    const data = await res.json();
    if (data.latitude && data.longitude) {
      _cached = {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city || "Unknown",
        country: data.country_code || "XX",
        source: "ip",
      };
      return _cached;
    }
  } catch {
    // Network error or timeout — use default
  }

  return DEFAULT_FALLBACK;
}

export function getDefaultFallback(): IPGeoResult {
  return DEFAULT_FALLBACK;
}

/**
 * search.geo.context_resolver — Resolves geo context from search state.
 * Determines effective lat/lng/radius from explicit coords, city name, or defaults.
 * Pure function. No DB calls.
 */
import type { SearchState } from "../search-types";

export interface GeoContext {
  lat: number;
  lng: number;
  radiusKm: number;
  source: "explicit" | "city_fallback" | "default";
  label?: string;
}

// Hardcoded city centers for offline fallback
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  abidjan: { lat: 5.3599, lng: -4.0083 },
  dakar: { lat: 14.7167, lng: -17.4677 },
  lagos: { lat: 6.5244, lng: 3.3792 },
  nairobi: { lat: -1.2921, lng: 36.8219 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  accra: { lat: 5.6037, lng: -0.187 },
  douala: { lat: 4.0511, lng: 9.7679 },
  kinshasa: { lat: -4.4419, lng: 15.2663 },
  paris: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
};

const DEFAULT_CENTER = { lat: 5.3599, lng: -4.0083 }; // Abidjan

export function resolveGeoContext(state: SearchState): GeoContext {
  // 1. Explicit coordinates
  if (state.lat != null && state.lng != null) {
    return {
      lat: state.lat,
      lng: state.lng,
      radiusKm: state.radiusKm,
      source: "explicit",
    };
  }

  // 2. City name fallback
  if (state.city) {
    const key = state.city.trim().toLowerCase();
    const center = CITY_CENTERS[key];
    if (center) {
      return {
        lat: center.lat,
        lng: center.lng,
        radiusKm: state.radiusKm,
        source: "city_fallback",
        label: state.city,
      };
    }
  }

  // 3. Default
  return {
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
    radiusKm: state.radiusKm,
    source: "default",
    label: "Abidjan",
  };
}

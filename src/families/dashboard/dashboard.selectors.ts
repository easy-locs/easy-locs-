/**
 * Dashboard Selectors — Scoped data access for the home dashboard.
 * Single source of truth for all dashboard data reads.
 */
import { useLocationStore } from "@/stores/locationStore";

/** Select current user location (non-fallback only) */
export function selectUserLocation() {
  const loc = useLocationStore.getState().currentLocation;
  const isFallback = useLocationStore.getState().isFallback;
  if (!loc || isFallback) return null;
  return { lat: loc.lat, lng: loc.lng };
}

/** Select raw location state for reactivity */
export function useLocationSelectors() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const isFallback = useLocationStore((s) => s.isFallback);
  return { currentLocation, isFallback };
}

/** Read cached geo from localStorage */
export function selectCachedGeo(): { city: string | null; country: string | null } {
  try {
    const raw = localStorage.getItem("orbit:last-geo");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { city: parsed.city ?? null, country: parsed.country ?? null };
    }
  } catch {}
  return { city: null, country: null };
}

/** Persist geo to localStorage */
export function persistGeoCache(city: string, country: string) {
  try {
    localStorage.setItem("orbit:last-geo", JSON.stringify({ city, country }));
  } catch {}
}

/** Detect user timezone */
export function selectTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

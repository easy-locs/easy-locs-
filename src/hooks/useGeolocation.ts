/**
 * useGeolocation — Reactive browser geolocation hook.
 * Auto-requests location on mount.
 * Exposes clear permission states: loading | granted | denied | unavailable.
 * Includes manual city override fallback so user is never blocked.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export type GeoPermissionState = "loading" | "granted" | "denied" | "unavailable";

interface GeoState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  /** Clear permission state */
  permissionState: GeoPermissionState;
  /** True while actively fetching position */
  loading: boolean;
  /** Human-readable error message */
  error: string | null;
  /** Manual city override set by user */
  manualCity: string | null;
}

const GEO_CACHE_KEY = "orbit:last-geo";
const CITY_OVERRIDE_KEY = "orbit:city-override";

function readCachedGeo(): Pick<GeoState, "lat" | "lng" | "city"> {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return { lat: null, lng: null, city: null };
    const parsed = JSON.parse(raw);
    return {
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
      city: typeof parsed.city === "string" ? parsed.city : null,
    };
  } catch {
    return { lat: null, lng: null, city: null };
  }
}

function cacheGeo(lat: number, lng: number, city?: string | null) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat, lng, city, at: Date.now() }));
  } catch { /* no-op */ }
}

function readCityOverride(): string | null {
  try {
    return localStorage.getItem(CITY_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

export function useGeolocation() {
  const cached = readCachedGeo();
  const requestedRef = useRef(false);

  const [state, setState] = useState<GeoState>({
    lat: cached.lat,
    lng: cached.lng,
    city: cached.city,
    loading: false,
    error: null,
    permissionState: cached.lat != null ? "granted" : "loading",
    manualCity: readCityOverride(),
  });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({
        ...s,
        error: "Geolocation not supported by this browser",
        permissionState: "unavailable",
        loading: false,
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        cacheGeo(nextLat, nextLng);
        setState((s) => ({
          ...s,
          lat: nextLat,
          lng: nextLng,
          loading: false,
          error: null,
          permissionState: "granted",
        }));
      },
      (err) => {
        const fallback = readCachedGeo();
        const denied = err.code === 1; // PERMISSION_DENIED
        const unavailable = err.code === 2; // POSITION_UNAVAILABLE

        setState((s) => ({
          ...s,
          lat: fallback.lat ?? s.lat,
          lng: fallback.lng ?? s.lng,
          loading: false,
          error: denied
            ? "Location permission denied — use city override below"
            : unavailable
              ? "Location unavailable — use city override"
              : "Could not get location",
          permissionState: denied ? "denied" : unavailable ? "unavailable" : s.permissionState,
        }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);

  /** Manual city override — user is never blocked */
  const setCityOverride = useCallback((city: string | null) => {
    try {
      if (city) {
        localStorage.setItem(CITY_OVERRIDE_KEY, city);
      } else {
        localStorage.removeItem(CITY_OVERRIDE_KEY);
      }
    } catch { /* no-op */ }
    setState((s) => ({ ...s, manualCity: city }));
  }, []);

  // Auto-request on mount
  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    requestLocation();

    // Listen for permission changes
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((perm) => {
          perm.addEventListener("change", () => {
            if (perm.state === "granted") {
              requestLocation();
            } else if (perm.state === "denied") {
              setState((s) => ({
                ...s,
                error: "Location permission denied",
                permissionState: "denied",
              }));
            }
          });
        })
        .catch(() => { /* permissions API not available */ });
    }
  }, [requestLocation]);

  /** Effective city: manual override takes priority */
  const effectiveCity = state.manualCity || state.city || null;

  /** Whether we have usable location (GPS or manual fallback) */
  const hasLocation = (state.lat != null && state.lng != null) || !!state.manualCity;

  return {
    ...state,
    effectiveCity,
    hasLocation,
    requestLocation,
    setCityOverride,
    /** Legacy compat */
    permissionDenied: state.permissionState === "denied",
  };
}

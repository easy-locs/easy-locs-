/**
 * useGeolocation — Reactive browser geolocation hook.
 * Auto-requests location on mount based on app preferences.
 */
import { useState, useEffect, useCallback } from "react";
import { getAppPreferences } from "@/components/settings/AppPreferencesSection";

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  city: string | null;
}

const GEO_CACHE_KEY = "orbit:last-geo";

function readCachedGeo(): Pick<GeoState, "lat" | "lng"> {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return { lat: null, lng: null };
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    return {
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
    };
  } catch {
    return { lat: null, lng: null };
  }
}

function cacheGeo(lat: number, lng: number) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat, lng, at: Date.now() }));
  } catch {
    // no-op
  }
}

export function useGeolocation() {
  const cached = readCachedGeo();

  const [state, setState] = useState<GeoState>({
    lat: cached.lat,
    lng: cached.lng,
    loading: false,
    error: null,
    city: null,
  });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, error: "Geolocation not supported" }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        cacheGeo(nextLat, nextLng);
        setState({
          lat: nextLat,
          lng: nextLng,
          loading: false,
          error: null,
          city: null,
        });
      },
      (err) => {
        const fallback = readCachedGeo();
        const denied = err.code === 1;

        setState((s) => ({
          ...s,
          lat: fallback.lat ?? s.lat,
          lng: fallback.lng ?? s.lng,
          loading: false,
          error: denied
            ? "Location permission denied"
            : "Could not get location",
        }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  // Auto-request on mount if preference is enabled
  useEffect(() => {
    const prefs = getAppPreferences();
    if (!prefs.autoLocation) return;

    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((perm) => {
          if (perm.state !== "denied") requestLocation();
          else {
            const fallback = readCachedGeo();
            setState((s) => ({
              ...s,
              lat: fallback.lat ?? s.lat,
              lng: fallback.lng ?? s.lng,
              error: "Location permission denied",
              loading: false,
            }));
          }
        })
        .catch(() => requestLocation());
      return;
    }

    requestLocation();
  }, [requestLocation]);

  return { ...state, requestLocation };
}

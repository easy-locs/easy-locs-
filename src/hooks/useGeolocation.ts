/**
 * useGeolocation — Reactive browser geolocation hook.
 * Auto-requests location on mount based on app preferences.
 * Handles denied permission with clear user guidance.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { getAppPreferences } from "@/components/settings/AppPreferencesSection";

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  city: string | null;
  /** True when the browser has permanently denied geolocation */
  permissionDenied: boolean;
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
  const requestedRef = useRef(false);

  const [state, setState] = useState<GeoState>({
    lat: cached.lat,
    lng: cached.lng,
    loading: false,
    error: null,
    city: null,
    permissionDenied: false,
  });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, error: "Geolocation not supported", permissionDenied: true }));
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
          permissionDenied: false,
        });
      },
      (err) => {
        const fallback = readCachedGeo();
        const denied = err.code === 1; // PERMISSION_DENIED

        setState((s) => ({
          ...s,
          lat: fallback.lat ?? s.lat,
          lng: fallback.lng ?? s.lng,
          loading: false,
          error: denied
            ? "Location permission denied"
            : "Could not get location",
          permissionDenied: denied,
        }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  // Auto-request on mount if preference is enabled OR if entering Nearby section
  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;

    const prefs = getAppPreferences();

    // Always check permission state first
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((perm) => {
          if (perm.state === "granted") {
            // Already granted — fetch silently
            requestLocation();
          } else if (perm.state === "prompt") {
            // Will prompt — only auto-request if pref enabled
            if (prefs.autoLocation) requestLocation();
          } else {
            // Denied
            const fallback = readCachedGeo();
            setState((s) => ({
              ...s,
              lat: fallback.lat ?? s.lat,
              lng: fallback.lng ?? s.lng,
              error: "Location permission denied",
              permissionDenied: true,
              loading: false,
            }));
          }

          // Listen for permission changes (user may toggle in browser settings)
          perm.addEventListener("change", () => {
            if (perm.state === "granted") {
              requestLocation();
            } else if (perm.state === "denied") {
              setState((s) => ({ ...s, error: "Location permission denied", permissionDenied: true }));
            }
          });
        })
        .catch(() => {
          if (prefs.autoLocation) requestLocation();
        });
      return;
    }

    if (prefs.autoLocation) requestLocation();
  }, [requestLocation]);

  return { ...state, requestLocation };
}

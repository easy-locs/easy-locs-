/**
 * useGeolocation — BRIDGE hook that wraps locationStore for legacy consumers.
 * New code should use useLocationStore directly.
 */
import { useEffect, useCallback, useRef } from "react";
import { useLocationStore, classifyAccuracy, type AccuracyLevel } from "@/stores/locationStore";

export type GeoPermissionState = "loading" | "granted" | "denied" | "unavailable";

const GEO_CACHE_KEY = "orbit:last-geo";
const CITY_OVERRIDE_KEY = "orbit:city-override";

function readCachedGeo(): { lat: number | null; lng: number | null; city: string | null } {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return { lat: null, lng: null, city: null };
    const parsed = JSON.parse(raw);
    return {
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
      city: typeof parsed.city === "string" ? parsed.city : null,
    };
  } catch { return { lat: null, lng: null, city: null }; }
}

function cacheGeo(lat: number, lng: number, city?: string | null) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat, lng, city, at: Date.now() })); } catch {}
}

function readCityOverride(): string | null {
  try { return localStorage.getItem(CITY_OVERRIDE_KEY); } catch { return null; }
}

export function useGeolocation() {
  const requestedRef = useRef(false);
  const cached = readCachedGeo();

  const currentLocation = useLocationStore((s) => s.currentLocation);
  const permState = useLocationStore((s) => s.permissionState);
  const loading = useLocationStore((s) => s.loading);
  const error = useLocationStore((s) => s.error);
  const isFallback = useLocationStore((s) => s.isFallback);
  const accuracyLevel = useLocationStore((s) => s.accuracyLevel);
  const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
  const setPermissionState = useLocationStore((s) => s.setPermissionState);
  const setLoading = useLocationStore((s) => s.setLoading);
  const setError = useLocationStore((s) => s.setError);
  const setIsFallback = useLocationStore((s) => s.setIsFallback);

  const lat = currentLocation?.lat ?? cached.lat;
  const lng = currentLocation?.lng ?? cached.lng;

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPermissionState("unavailable");
      setError("Geolocation not supported by this browser");
      return;
    }
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        cacheGeo(nextLat, nextLng);
        setCurrentLocation({ lat: nextLat, lng: nextLng, accuracy: pos.coords.accuracy, timestamp: new Date().toISOString() });
        setPermissionState("granted");
        setLoading(false);
      },
      (err) => {
        const denied = err.code === 1;
        const unavailable = err.code === 2;
        const timeout = err.code === 3;
        setPermissionState(denied ? "denied" : unavailable ? "unavailable" : timeout ? "timeout" : "denied");
        setError(denied ? "Location permission denied" : unavailable ? "Location unavailable" : timeout ? "Location request timed out" : "Could not get location");
        setLoading(false);
        // Use cached if available
        const fb = readCachedGeo();
        if (fb.lat && fb.lng && !currentLocation) {
          setCurrentLocation({ lat: fb.lat, lng: fb.lng, accuracy: 5000 });
          setIsFallback(true);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [setCurrentLocation, setPermissionState, setLoading, setError, setIsFallback, currentLocation]);

  const setCityOverride = useCallback((city: string | null) => {
    try {
      if (city) localStorage.setItem(CITY_OVERRIDE_KEY, city);
      else localStorage.removeItem(CITY_OVERRIDE_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    // Only request if we don't have a location yet
    if (!currentLocation) {
      requestLocation();
    }

    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((perm) => {
        perm.addEventListener("change", () => {
          if (perm.state === "granted") requestLocation();
          else if (perm.state === "denied") {
            setPermissionState("denied");
            setError("Location permission denied");
          }
        });
      }).catch(() => {});
    }
  }, [requestLocation, currentLocation, setPermissionState, setError]);

  const manualCity = readCityOverride();
  const effectiveCity = manualCity || cached.city || null;
  const hasLocation = (lat != null && lng != null) || !!manualCity;

  const permissionState: GeoPermissionState = loading ? "loading"
    : permState === "granted" ? "granted"
    : permState === "denied" ? "denied"
    : permState === "unavailable" ? "unavailable"
    : "loading";

  return {
    lat,
    lng,
    city: cached.city,
    permissionState,
    loading,
    error,
    manualCity,
    effectiveCity,
    hasLocation,
    accuracyLevel,
    isFallback,
    requestLocation,
    setCityOverride,
    permissionDenied: permState === "denied",
  };
}

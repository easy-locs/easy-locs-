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

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null, lng: null, loading: false, error: null, city: null,
  });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState(s => ({ ...s, error: "Geolocation not supported" }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
          city: null,
        });
      },
      (err) => {
        setState(s => ({
          ...s,
          loading: false,
          error: err.code === 1 ? "Location permission denied" : "Could not get location",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Auto-request on mount if preference is enabled
  useEffect(() => {
    const prefs = getAppPreferences();
    if (prefs.autoLocation) {
      requestLocation();
    }
  }, [requestLocation]);

  return { ...state, requestLocation };
}

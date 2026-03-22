import { useEffect } from "react";
import { useRadarStore } from "@/stores/radarStore";
import { useLocationStore } from "@/stores/locationStore";

/**
 * useRadarGeo — Syncs locationStore (canonical GPS) into radarStore.
 * No duplicate navigator.geolocation calls.
 */
export function useRadarGeo() {
  const setUserLocation = useRadarStore((s) => s.setUserLocation);

  useEffect(() => {
    // Sync current value
    const loc = useLocationStore.getState().currentLocation;
    if (loc) setUserLocation({ lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy ?? null });

    // Subscribe to future updates
    const unsub = useLocationStore.subscribe((state) => {
      const cur = state.currentLocation;
      if (cur) setUserLocation({ lat: cur.lat, lng: cur.lng, accuracy: cur.accuracy ?? null });
    });
    return unsub;
  }, [setUserLocation]);
}

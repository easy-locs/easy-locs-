/**
 * useMapCamera — Fit bounds + recenter logic, extracted from SuperMap.
 */
import { useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { useSuperMapStore } from "@/stores/superMapStore";

export function useMapCamera(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  ready: boolean
) {
  const entities = useSuperMapStore(s => s.entities);
  const userLat = useSuperMapStore(s => s.userLat);
  const userLng = useSuperMapStore(s => s.userLng);

  // Fit bounds on entity change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || entities.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    if (userLat && userLng) bounds.extend([userLng, userLat]);
    entities.forEach(e => bounds.extend([e.lng, e.lat]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 400 });
  }, [entities, ready]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map || userLat == null || userLng == null) return;
    map.easeTo({
      center: [userLng, userLat],
      zoom: Math.max(map.getZoom(), 13),
      duration: 450,
    });
  };

  return { recenter };
}

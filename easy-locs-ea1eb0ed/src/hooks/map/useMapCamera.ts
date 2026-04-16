import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { getMapLibreGL } from "@/lib/maplibre/maplibre-loader";
import { useUnifiedMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";

export function useMapCamera(
  mapRef: React.RefObject<maplibregl.Map | null>,
  ready: boolean
) {
  const entities = useUnifiedMapStore(s => s.entities);
  const currentLocation = useLocationStore(s => s.currentLocation);
  const userLat = currentLocation?.lat ?? null;
  const userLng = currentLocation?.lng ?? null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || entities.length === 0) return;
    const gl = getMapLibreGL();
    if (!gl) return;
    const bounds = new gl.LngLatBounds();
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

/**
 * useMapCore — Initializes Mapbox instance, lifecycle, camera. Zero business logic.
 */
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import { applyPremiumFog } from "@/lib/map/engine/style-engine";

interface UseMapCoreOptions {
  centerLng: number;
  centerLat: number;
  zoom: number;
  style?: string;
  onReady?: (map: mapboxgl.Map) => void;
}

export function useMapCore(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseMapCoreOptions
) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: options.style || "mapbox://styles/mapbox/dark-v11",
      center: [options.centerLng, options.centerLat],
      zoom: options.zoom,
      attributionControl: false,
      maxZoom: 18,
    });

    mapRef.current = map;
    // Expose for performance engine
    (globalThis as any).__superMapInstance = map;

    map.on("load", () => {
      applyPremiumFog(map);
      setReady(true);
      options.onReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      (globalThis as any).__superMapInstance = null;
      setReady(false);
    };
  }, []);

  const easeTo = (lng: number, lat: number, z?: number) => {
    mapRef.current?.easeTo({
      center: [lng, lat],
      zoom: z ?? mapRef.current.getZoom(),
      duration: 450,
    });
  };

  const fitBounds = (coords: [number, number][], padding = 60) => {
    if (!mapRef.current || coords.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach(c => bounds.extend(c));
    mapRef.current.fitBounds(bounds, { padding, maxZoom: 15, duration: 400 });
  };

  return { mapRef, ready, easeTo, fitBounds };
}

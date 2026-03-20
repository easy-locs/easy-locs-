import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/stores/mapStore";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

export function MapboxCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markers = useMapStore((s) => s.markers);
  const viewport = useMapStore((s) => s.viewport);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [viewport.centerLng, viewport.centerLat],
      zoom: viewport.zoom,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [viewport.centerLat, viewport.centerLng, viewport.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markerInstances: mapboxgl.Marker[] = [];

    markers.forEach((marker) => {
      const el = document.createElement("div");
      el.className = "w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground";
      const m = new mapboxgl.Marker(el)
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
      markerInstances.push(m);
    });

    return () => {
      markerInstances.forEach((m) => m.remove());
    };
  }, [markers]);

  return <div ref={containerRef} className="h-full w-full min-h-[300px] rounded-lg" />;
}

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/stores/mapStore";
import { useGeoStore } from "@/stores/geoStore";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

const DEFAULT_LNG = 55.2708;
const DEFAULT_LAT = 25.2048;

export function MapboxCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const storeMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const markers = useMapStore((s) => s.markers);
  const viewport = useMapStore((s) => s.viewport);
  const currentPosition = useGeoStore((s) => s.currentPosition);
  const permission = useGeoStore((s) => s.permission);

  const hasGeo = currentPosition.lat !== 0 || currentPosition.lng !== 0;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      console.error("[Map] Missing VITE_MAPBOX_ACCESS_TOKEN");
      return;
    }

    const centerLng = hasGeo ? currentPosition.lng : (viewport.centerLng || DEFAULT_LNG);
    const centerLat = hasGeo ? currentPosition.lat : (viewport.centerLat || DEFAULT_LAT);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [centerLng, centerLat],
      zoom: hasGeo ? 15 : (viewport.zoom || 13),
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      storeMarkersRef.current.forEach((m) => m.remove());
      storeMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to user position when geo updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasGeo) return;

    map.flyTo({
      center: [currentPosition.lng, currentPosition.lat],
      zoom: 15,
      essential: true,
    });

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg";
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([currentPosition.lng, currentPosition.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([currentPosition.lng, currentPosition.lat]);
    }
  }, [hasGeo, currentPosition.lat, currentPosition.lng]);

  // Render store markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    storeMarkersRef.current.forEach((m) => m.remove());
    storeMarkersRef.current = [];

    for (const marker of markers) {
      if (typeof marker?.lat !== "number" || typeof marker?.lng !== "number") continue;
      const el = document.createElement("div");
      el.className = "w-4 h-4 rounded-full bg-destructive border-2 border-white shadow";
      const m = new mapboxgl.Marker(el)
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
      storeMarkersRef.current.push(m);
    }
  }, [markers]);

  return (
    <div className="relative">
      <p className="absolute top-2 left-2 z-10 rounded-lg bg-card/90 backdrop-blur-sm px-2.5 py-1 text-xs text-muted-foreground border border-border/30 shadow-sm">
        {permission === "granted" ? "📍" : "⏳"}{" "}
        {hasGeo
          ? `${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}`
          : "Dubai fallback"}
      </p>
      <div ref={containerRef} className="h-full w-full min-h-[300px] rounded-lg" />
    </div>
  );
}

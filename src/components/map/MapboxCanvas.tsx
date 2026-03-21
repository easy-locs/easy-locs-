import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

const DEFAULT_LNG = 55.2708;
const DEFAULT_LAT = 25.2048;

export function MapboxCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const storeMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const markers = useMapStore((s) => s.markers);
  const viewport = useMapStore((s) => s.viewport);
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const permissionState = useLocationStore((s) => s.permissionState);

  const hasGeo = currentLocation != null && (currentLocation.lat !== 0 || currentLocation.lng !== 0);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error("[Map] Missing Mapbox access token");
      return;
    }
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const centerLng = hasGeo ? currentLocation!.lng : (viewport.centerLng || DEFAULT_LNG);
    const centerLat = hasGeo ? currentLocation!.lat : (viewport.centerLat || DEFAULT_LAT);

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
    if (!map || !hasGeo || !currentLocation) return;

    map.flyTo({
      center: [currentLocation.lng, currentLocation.lat],
      zoom: 15,
      essential: true,
    });

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg";
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([currentLocation.lng, currentLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([currentLocation.lng, currentLocation.lat]);
    }
  }, [hasGeo, currentLocation?.lat, currentLocation?.lng]);

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
        {permissionState === "granted" ? "📍" : "⏳"}{" "}
        {hasGeo && currentLocation
          ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
          : "Dubai fallback"}
      </p>
      <div ref={containerRef} className="h-full w-full min-h-[300px] rounded-lg" />
    </div>
  );
}

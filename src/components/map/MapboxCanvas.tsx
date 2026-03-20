import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "@/stores/mapStore";
import { useGeoStore } from "@/stores/geoStore";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

/** Dubai fallback */
const DEFAULT_LNG = 55.2708;
const DEFAULT_LAT = 25.2048;

export function MapboxCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markers = useMapStore((s) => s.markers);
  const viewport = useMapStore((s) => s.viewport);
  const currentPosition = useGeoStore((s) => s.currentPosition);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) return;

    const hasGeo = currentPosition.lat !== 0 || currentPosition.lng !== 0;
    const centerLng = hasGeo ? currentPosition.lng : (viewport.centerLng || DEFAULT_LNG);
    const centerLat = hasGeo ? currentPosition.lat : (viewport.centerLat || DEFAULT_LAT);

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [centerLng, centerLat],
      zoom: hasGeo ? 15 : (viewport.zoom || 13),
    });

    return () => {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to user position when geo updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (currentPosition.lat === 0 && currentPosition.lng === 0) return;

    map.flyTo({
      center: [currentPosition.lng, currentPosition.lat],
      zoom: 15,
      essential: true,
    });

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-lg";
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([currentPosition.lng, currentPosition.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([currentPosition.lng, currentPosition.lat]);
    }
  }, [currentPosition.lat, currentPosition.lng]);

  // Render store markers
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

/**
 * LiveMap — Mapbox-based real-time map for tracking points.
 * Migrated from Leaflet to Mapbox for unified map engine.
 */
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface LiveMapProps {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  showRoute?: boolean;
}

export default function LiveMap({
  points,
  center = [25.2048, 55.2708],
  zoom = 13,
  className = "",
  showRoute = true,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [center[1], center[0]], // [lng, lat]
      zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points.length) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers
    points.forEach((p, i) => {
      const isFirst = i === 0;
      const isLast = i === points.length - 1;
      const color = isFirst ? "#3b82f6" : isLast ? "#ef4444" : "#6b7280";
      const size = isFirst || isLast ? 14 : 8;

      const el = document.createElement("div");
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.6);box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;`;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([p.lng, p.lat])
        .setPopup(new mapboxgl.Popup({ offset: 12, closeButton: false }).setText(p.label || `Point ${i + 1}`))
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Draw route line
    if (showRoute && points.length > 1) {
      const sourceId = "live-route";
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: points.map((p) => [p.lng, p.lat]),
          },
        });
      } else {
        map.on("load", () => {
          if (map.getSource(sourceId)) return;
          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: points.map((p) => [p.lng, p.lat]),
              },
            },
          });
          map.addLayer({
            id: "live-route-line",
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#3b82f6",
              "line-width": 3,
              "line-opacity": 0.7,
            },
          });
        });
      }
    }

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    points.forEach((p) => bounds.extend([p.lng, p.lat]));
    map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
  }, [points, showRoute]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-[400px] rounded-xl overflow-hidden border border-border ${className}`}
    />
  );
}

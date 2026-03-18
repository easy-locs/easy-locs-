/**
 * LiveMap — Leaflet-based real-time map for tracking points.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points.length) return;

    // Clear existing layers except tile layer
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const latlngs: L.LatLngExpression[] = points.map((p) => [p.lat, p.lng]);

    // Add markers
    points.forEach((p, i) => {
      const isFirst = i === 0;
      const isLast = i === points.length - 1;
      const color = isFirst ? "#3b82f6" : isLast ? "#ef4444" : "#6b7280";

      L.circleMarker([p.lat, p.lng], {
        radius: isFirst || isLast ? 8 : 4,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(p.label || `Point ${i + 1}`)
        .addTo(map);
    });

    // Draw route line
    if (showRoute && latlngs.length > 1) {
      L.polyline(latlngs, {
        color: "hsl(var(--primary))",
        weight: 3,
        opacity: 0.7,
      }).addTo(map);
    }

    // Fit bounds
    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }
  }, [points, showRoute]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-[400px] rounded-xl overflow-hidden border border-border ${className}`}
    />
  );
}

/**
 * UnifiedMap — Reusable Mapbox-powered map for all services.
 * Renders GeoEntity markers with card sync + optional heatmap overlay.
 */
import { useEffect, useRef, useCallback, memo, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import DiscoveryHeatmapLayer from "@/components/map/DiscoveryHeatmapLayer";

const ENTITY_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  shop: "#3b82f6",
  grocery: "#22c55e",
  property: "#8b5cf6",
  driver: "#eab308",
  courier: "#06b6d4",
  hotel: "#ec4899",
  service: "#64748b",
};

const ENTITY_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  shop: "🛍️",
  grocery: "🛒",
  property: "🏠",
  driver: "🚕",
  courier: "📦",
  hotel: "🏨",
  service: "🔧",
};

interface UnifiedMapProps {
  entities: GeoEntity[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  selectedId?: string | null;
  onSelectEntity?: (entity: GeoEntity) => void;
  showUserLocation?: boolean;
  userLat?: number;
  userLng?: number;
  /** Enable heatmap overlay */
  showHeatmap?: boolean;
  /** Heatmap data points — if not provided, generates from entities */
  heatmapPoints?: { lat: number; lng: number; intensity: number }[];
}

export default memo(function UnifiedMap({
  entities,
  center,
  zoom = 13,
  className = "",
  selectedId,
  onSelectEntity,
  showUserLocation = true,
  userLat,
  userLng,
  showHeatmap = false,
  heatmapPoints,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const mapCenter: [number, number] = center
    || (userLat && userLng ? [userLng, userLat] : [55.2708, 25.2048]);

  // Derive heatmap points from entities if not provided
  const effectiveHeatmap = heatmapPoints ?? (showHeatmap ? entities.map(e => ({
    lat: e.lat,
    lng: e.lng,
    intensity: 0.6,
  })) : []);

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: mapCenter,
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on("load", () => setMapReady(true));

    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (showUserLocation && userLat && userLng) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.5)"></div>`;
      const m = new mapboxgl.Marker(el).setLngLat([userLng, userLat]).addTo(map);
      markersRef.current.push(m);
    }

    // Don't show markers when heatmap is on (cleaner view)
    if (!showHeatmap) {
      entities.forEach((entity) => {
        const color = ENTITY_COLORS[entity.type] || "#6b7280";
        const icon = ENTITY_ICONS[entity.type] || "📍";
        const isSelected = entity.id === selectedId;
        const size = isSelected ? 36 : 28;

        const el = document.createElement("div");
        el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isSelected ? 18 : 14}px;background:${color};border:2px solid ${isSelected ? "white" : "rgba(255,255,255,0.4)"};box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;transition:transform 0.2s;`;
        el.textContent = icon;

        el.addEventListener("click", () => onSelectEntity?.(entity));

        const marker = new mapboxgl.Marker(el)
          .setLngLat([entity.lng, entity.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    if (entities.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      if (userLat && userLng) bounds.extend([userLng, userLat]);
      entities.forEach(e => bounds.extend([e.lng, e.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [entities, selectedId, userLat, userLng, showUserLocation, onSelectEntity, showHeatmap]);

  return (
    <>
      <div
        ref={containerRef}
        className={`w-full h-full rounded-2xl overflow-hidden ${className}`}
        style={{ minHeight: 300 }}
      />
      <DiscoveryHeatmapLayer
        map={mapReady ? mapRef.current : null}
        points={effectiveHeatmap}
        visible={showHeatmap}
      />
    </>
  );
});

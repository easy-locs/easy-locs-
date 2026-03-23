/**
 * UnifiedMap — Premium Mapbox-powered discovery map.
 * Features: native clustering, rich pins, radius circle, heatmap overlay.
 */
import { useEffect, useRef, useCallback, memo, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import DiscoveryHeatmapLayer from "@/components/map/DiscoveryHeatmapLayer";

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const CLUSTER_SOURCE = "discovery-cluster-source";
const CLUSTER_LAYER = "discovery-clusters";
const CLUSTER_COUNT_LAYER = "discovery-cluster-count";
const UNCLUSTERED_LAYER = "discovery-unclustered";
const RADIUS_SOURCE = "radius-circle-source";
const RADIUS_LAYER = "radius-circle-layer";
const RADIUS_BORDER_LAYER = "radius-circle-border";

const VERTICAL_COLORS: Record<string, string> = {
  restaurant: "#f97316",
  food: "#f97316",
  shop: "#3b82f6",
  shops: "#3b82f6",
  grocery: "#22c55e",
  property: "#8b5cf6",
  driver: "#eab308",
  courier: "#06b6d4",
  hotel: "#ec4899",
  service: "#64748b",
  services: "#64748b",
  healthcare: "#ef4444",
  mobility: "#eab308",
  experiences: "#ec4899",
};

const VERTICAL_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  food: "🍽️",
  shop: "🛍️",
  shops: "🛍️",
  grocery: "🛒",
  property: "🏠",
  driver: "🚕",
  courier: "📦",
  hotel: "🏨",
  service: "🔧",
  services: "🔧",
  healthcare: "🏥",
  mobility: "🚗",
  experiences: "🎯",
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
  showHeatmap?: boolean;
  heatmapPoints?: { lat: number; lng: number; intensity: number }[];
  /** Radius in km — renders a visual circle on map */
  radiusKm?: number;
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
  radiusKm,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const entitiesRef = useRef<GeoEntity[]>(entities);
  entitiesRef.current = entities;
  const onSelectRef = useRef(onSelectEntity);
  onSelectRef.current = onSelectEntity;

  const mapCenter: [number, number] = center
    || (userLat && userLng ? [userLng, userLat] : [55.2708, 25.2048]);

  // Derive heatmap points from entities if not provided
  const effectiveHeatmap = heatmapPoints ?? (showHeatmap ? entities.map(e => ({
    lat: e.lat,
    lng: e.lng,
    intensity: Math.min(1, ((e.rating ?? 3) / 5) * 0.6 + 0.4),
  })) : []);

  // ── Init map ──
  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: mapCenter,
      zoom,
      attributionControl: false,
      maxZoom: 18,
    });

    mapRef.current = map;

    map.on("load", () => {
      // ── Cluster source (empty initially) ──
      map.addSource(CLUSTER_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // ── Cluster circles ──
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: CLUSTER_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "hsl(220, 70%, 55%)", 10,
            "hsl(200, 70%, 50%)", 30,
            "hsl(45, 90%, 55%)", 100,
            "hsl(15, 80%, 55%)",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            18, 10, 24, 30, 32, 100, 40,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.3)",
          "circle-opacity": 0.9,
        },
      });

      // ── Cluster count labels ──
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: CLUSTER_SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 13,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // ── Unclustered points (rich pins) ──
      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: "circle",
        source: CLUSTER_SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["coalesce", ["get", "color"], "#6b7280"],
          "circle-radius": [
            "case",
            ["get", "isSelected"], 14,
            ["get", "isSponsored"], 11,
            9,
          ],
          "circle-stroke-width": [
            "case",
            ["get", "isSelected"], 3,
            ["get", "isSponsored"], 2.5,
            1.5,
          ],
          "circle-stroke-color": [
            "case",
            ["get", "isSelected"], "#ffffff",
            ["get", "isSponsored"], "hsl(45, 90%, 65%)",
            "rgba(255,255,255,0.5)",
          ],
          "circle-opacity": 0.95,
        },
      });

      // ── Radius circle source ──
      map.addSource(RADIUS_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: RADIUS_LAYER,
        type: "fill",
        source: RADIUS_SOURCE,
        paint: {
          "fill-color": "hsl(220, 70%, 55%)",
          "fill-opacity": 0.06,
        },
      }, CLUSTER_LAYER); // below clusters

      map.addLayer({
        id: RADIUS_BORDER_LAYER,
        type: "line",
        source: RADIUS_SOURCE,
        paint: {
          "line-color": "hsl(220, 70%, 55%)",
          "line-width": 1.5,
          "line-opacity": 0.35,
          "line-dasharray": [3, 2],
        },
      }, CLUSTER_LAYER);

      // ── Click handlers ──
      map.on("click", CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource(CLUSTER_SOURCE) as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
          if (err) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoomLevel ?? 14 });
        });
      });

      map.on("click", UNCLUSTERED_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED_LAYER] });
        if (!features.length) return;
        const entityId = features[0].properties?.entityId;
        const entity = entitiesRef.current.find(en => en.id === entityId);
        if (entity) onSelectRef.current?.(entity);
      });

      // ── Popup on hover for rich pin info ──
      map.on("mouseenter", UNCLUSTERED_LAYER, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties!;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

        const ratingHtml = props.rating
          ? `<span style="color:#facc15">★</span> ${Number(props.rating).toFixed(1)}`
          : "";
        const badges: string[] = [];
        if (props.isSponsored) badges.push("⚡ Promoted");

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: "radar-pin-popup",
        })
          .setLngLat(coords)
          .setHTML(`
            <div style="display:flex;align-items:center;gap:8px;max-width:200px">
              ${props.imageUrl ? `<img src="${props.imageUrl}" style="width:36px;height:36px;border-radius:8px;object-fit:cover" />` : ""}
              <div style="min-width:0">
                <div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${props.title || ""}</div>
                <div style="font-size:10px;opacity:0.7">${ratingHtml} ${badges.join(" ")}</div>
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on("mouseleave", UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // Touch: tap shows popup too
      map.on("touchstart", UNCLUSTERED_LAYER, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties!;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          offset: 14,
          className: "radar-pin-popup",
        })
          .setLngLat(coords)
          .setHTML(`
            <div style="display:flex;align-items:center;gap:8px;max-width:200px">
              ${props.imageUrl ? `<img src="${props.imageUrl}" style="width:36px;height:36px;border-radius:8px;object-fit:cover" />` : ""}
              <div style="min-width:0">
                <div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${props.title || ""}</div>
                <div style="font-size:10px;opacity:0.7">${props.rating ? `★ ${Number(props.rating).toFixed(1)}` : ""}</div>
              </div>
            </div>
          `)
          .addTo(map);
      });

      // Cursor
      map.on("mouseenter", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = ""; });

      setMapReady(true);
    });

    return () => {
      popupRef.current?.remove();
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Update cluster data ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const src = map.getSource(CLUSTER_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    if (showHeatmap) {
      // Clear pins in heatmap mode
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const features: GeoJSON.Feature[] = entities.map((e) => ({
      type: "Feature",
      properties: {
        entityId: e.id,
        title: e.title || e.name,
        type: e.type,
        color: VERTICAL_COLORS[e.type] || "#6b7280",
        icon: VERTICAL_ICONS[e.type] || "📍",
        rating: e.rating ?? null,
        imageUrl: e.imageUrl || e.image_url || null,
        isSelected: e.id === selectedId,
        isSponsored: false, // enriched from pipeline
      },
      geometry: {
        type: "Point",
        coordinates: [e.lng, e.lat],
      },
    }));

    src.setData({ type: "FeatureCollection", features });

    // Fit bounds
    if (entities.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      if (userLat && userLng) bounds.extend([userLng, userLat]);
      entities.forEach(e => bounds.extend([e.lng, e.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [entities, selectedId, showHeatmap, mapReady]);

  // ── User location marker ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    userMarkerRef.current?.remove();

    if (showUserLocation && userLat && userLng) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.5)"></div>`;
      userMarkerRef.current = new mapboxgl.Marker(el).setLngLat([userLng, userLat]).addTo(map);
    }
  }, [userLat, userLng, showUserLocation, mapReady]);

  // ── Radius circle ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const src = map.getSource(RADIUS_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    if (!radiusKm || !userLat || !userLng || radiusKm > 50) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    // Generate circle polygon
    const steps = 64;
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const dx = radiusKm * Math.cos(angle);
      const dy = radiusKm * Math.sin(angle);
      const lat = userLat + (dy / 111.32);
      const lng = userLng + (dx / (111.32 * Math.cos(userLat * Math.PI / 180)));
      coords.push([lng, lat]);
    }

    src.setData({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      }],
    });
  }, [radiusKm, userLat, userLng, mapReady]);

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

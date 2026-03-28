/**
 * UnifiedMap — Premium Mapbox-powered discovery map.
 * Features: native clustering, rich pins with badges, radius circle, heatmap overlay.
 */
import { useEffect, useRef, useCallback, memo, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import DiscoveryHeatmapLayer from "@/components/map/DiscoveryHeatmapLayer";
import { CloudRain, CloudSun } from "lucide-react";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { useRainRadar } from "@/hooks/useRainRadar";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import {
  animateStationPulse,
  buildStationGeoJSON,
  ensureLiveStationLayers,
  STATION_CLUSTER_LAYER,
  STATION_CLUSTER_COUNT_LAYER,
  STATION_LABEL_LAYER,
  STATION_POINT_LAYER,
  STATION_PULSE_LAYER,
  STATION_SOURCE,
} from "@/lib/map/live-stations-engine";

const RAIN_SOURCE = "discovery-rain-radar";
const RAIN_LAYER = "discovery-rain-radar-layer";

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const CLUSTER_SOURCE = "discovery-cluster-source";
const CLUSTER_LAYER = "discovery-clusters";
const CLUSTER_COUNT_LAYER = "discovery-cluster-count";
const UNCLUSTERED_LAYER = "discovery-unclustered";
const UNCLUSTERED_GLOW_LAYER = "discovery-unclustered-glow";
const RADIUS_SOURCE = "radius-circle-source";
const RADIUS_LAYER = "radius-circle-layer";
const RADIUS_BORDER_LAYER = "radius-circle-border";
const RADIUS_PULSE_LAYER = "radius-circle-pulse";

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
  entities: (GeoEntity & { isSponsored?: boolean; reviewsCount?: number })[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  selectedId?: string | null;
  onSelectEntity?: (entity: GeoEntity) => void;
  /** Click on empty zone → lat/lng of click point */
  onZoneClick?: (lat: number, lng: number) => void;
  showUserLocation?: boolean;
  userLat?: number;
  userLng?: number;
  showHeatmap?: boolean;
  heatmapPoints?: { lat: number; lng: number; intensity: number }[];
  /** Radius in km — renders a visual circle on map */
  radiusKm?: number;
  /** @deprecated — use weatherDisplayStore instead. Kept for backward compat. */
  showWeatherLayer?: boolean;
}

/** Build rich popup HTML */
function buildPopupHTML(props: Record<string, any>): string {
  const rating = props.rating ? Number(props.rating) : 0;
  const stars = rating > 0 ? `<span class="radar-popup-rating">★ ${rating.toFixed(1)}</span>` : "";
  const badges: string[] = [];
  if (props.isSponsored === true || props.isSponsored === "true") badges.push('<span class="radar-popup-badge promoted">⚡ Promoted</span>');
  if (rating >= 4.3 && (props.reviewsCount ?? 0) > 50) badges.push('<span class="radar-popup-badge trending">🔥 Trending</span>');

  const img = props.imageUrl
    ? `<img src="${props.imageUrl}" class="radar-popup-img" />`
    : `<div class="radar-popup-img-placeholder">${props.icon || "📍"}</div>`;

  const distance = props.distanceKm != null
    ? `<span class="radar-popup-dist">${Number(props.distanceKm) < 1 ? `${Math.round(Number(props.distanceKm) * 1000)}m` : `${Number(props.distanceKm).toFixed(1)}km`}</span>`
    : "";

  return `
    <div class="radar-popup-card">
      ${img}
      <div class="radar-popup-content">
        <div class="radar-popup-title">${props.title || ""}</div>
        <div class="radar-popup-meta">${stars}${distance}</div>
        ${badges.length ? `<div class="radar-popup-badges">${badges.join("")}</div>` : ""}
      </div>
    </div>
  `;
}

export default memo(function UnifiedMap({
  entities,
  center,
  zoom = 13,
  className = "",
  selectedId,
  onSelectEntity,
  onZoneClick,
  showUserLocation = true,
  userLat,
  userLng,
  showHeatmap = false,
  heatmapPoints,
  radiusKm,
  showWeatherLayer: _showWeatherLayerLegacy = true,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const onSelectRef = useRef(onSelectEntity);
  onSelectRef.current = onSelectEntity;
  const onZoneClickRef = useRef(onZoneClick);
  onZoneClickRef.current = onZoneClick;

  // Weather display from canonical store (data always-on)
  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);
  const effectsLevel = useWeatherDisplayStore(s => s.effectsLevel);

  const mapCenter: [number, number] = center
    || (userLat != null && userLng != null ? [userLng, userLat] : [55.2708, 25.2048]);
  const weather = useLiveWeatherStation({ lat: userLat ?? center?.[1], lng: userLng ?? center?.[0] });
  const rainRadar = useRainRadar(radarOverlay !== "off" || weather.isRaining);
  const pulseFrameRef = useRef(0);
  const pulseRafRef = useRef<number | null>(null);

  // Derive heatmap points from entities if not provided
  const effectiveHeatmap = heatmapPoints ?? (showHeatmap ? entities.map(e => ({
    lat: e.lat,
    lng: e.lng,
    intensity: Math.min(1, ((e.rating ?? 3) / 5) * 0.5 + 0.3 + ((e.reviewsCount ?? 0) > 10 ? 0.2 : 0)),
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
      // ── Radius circle source (below everything) ──
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
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: RADIUS_BORDER_LAYER,
        type: "line",
        source: RADIUS_SOURCE,
        paint: {
          "line-color": "hsl(220, 70%, 60%)",
          "line-width": 2,
          "line-opacity": 0.4,
          "line-dasharray": [4, 3],
        },
      });

      if (!map.getSource(RAIN_SOURCE)) {
        map.addSource(RAIN_SOURCE, {
          type: "raster",
          tiles: [rainRadar.activeTileUrl ?? "https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/2/1_1.png"],
          tileSize: 256,
        });
      }

      if (!map.getLayer(RAIN_LAYER)) {
        map.addLayer({
          id: RAIN_LAYER,
          type: "raster",
          source: RAIN_SOURCE,
          paint: {
            "raster-opacity": 0,
            "raster-fade-duration": 0,
            "raster-resampling": "linear",
          },
        });
      }

      ensureLiveStationLayers(map, UNCLUSTERED_LAYER);

      // ── Cluster source ──
      map.addSource(CLUSTER_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 60,
        clusterProperties: {
          sumRating: ["+", ["get", "rating"]],
          hasSponsored: ["any", ["get", "isSponsored"]],
        },
      });

      // ── Cluster circles — glassmorphic premium look ──
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: CLUSTER_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "hsla(220, 60%, 50%, 0.85)", 10,
            "hsla(200, 65%, 45%, 0.85)", 30,
            "hsla(45, 80%, 50%, 0.85)", 100,
            "hsla(15, 75%, 50%, 0.85)",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            20, 10, 28, 30, 36, 100, 44,
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "rgba(255,255,255,0.25)",
          "circle-blur": 0.15,
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
          "text-size": 14,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // ── Unclustered glow (sponsored/selected) ──
      map.addLayer({
        id: UNCLUSTERED_GLOW_LAYER,
        type: "circle",
        source: CLUSTER_SOURCE,
        filter: ["all",
          ["!", ["has", "point_count"]],
          ["any", ["get", "isSponsored"], ["get", "isSelected"]],
        ],
        paint: {
          "circle-color": [
            "case",
            ["get", "isSelected"], "hsla(220, 70%, 55%, 0.4)",
            "hsla(45, 90%, 55%, 0.3)",
          ],
          "circle-radius": 20,
          "circle-blur": 0.8,
        },
      });

      // ── Unclustered points ──
      map.addLayer({
        id: UNCLUSTERED_LAYER,
        type: "circle",
        source: CLUSTER_SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["coalesce", ["get", "color"], "#6b7280"],
          "circle-radius": [
            "case",
            ["get", "isSelected"], 13,
            ["get", "isSponsored"], 11,
            [">=", ["get", "rating"], 4.3], 10,
            8,
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
            "rgba(255,255,255,0.4)",
          ],
          "circle-opacity": 0.95,
        },
      });

      // ── Click handlers ──
      map.on("click", CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource(CLUSTER_SOURCE) as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
          if (err) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoomLevel ?? 14, duration: 400 });
        });
      });

      map.on("click", UNCLUSTERED_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED_LAYER] });
        if (!features.length) return;
        const entityId = features[0].properties?.entityId;
        const entity = entitiesRef.current.find(en => en.id === entityId);
        if (entity) onSelectRef.current?.(entity);
      });

      // ── Rich popup on hover ──
      map.on("mouseenter", UNCLUSTERED_LAYER, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 16,
          className: "radar-pin-popup",
          maxWidth: "240px",
        })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(f.properties!))
          .addTo(map);
      });

      map.on("mouseleave", UNCLUSTERED_LAYER, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // Touch: tap shows popup
      map.on("touchstart", UNCLUSTERED_LAYER, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true,
          offset: 16,
          className: "radar-pin-popup",
          maxWidth: "240px",
        })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(f.properties!))
          .addTo(map);
      });

      map.on("mouseenter", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", CLUSTER_LAYER, () => { map.getCanvas().style.cursor = ""; });

      map.on("click", STATION_CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [STATION_CLUSTER_LAYER] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource(STATION_SOURCE) as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
          if (err) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoomLevel ?? 14, duration: 350 });
        });
      });

      const pulse = () => {
        if (mapRef.current && document.visibilityState !== "hidden") {
          pulseFrameRef.current += 1;
          animateStationPulse(mapRef.current, pulseFrameRef.current);
        }
        pulseRafRef.current = requestAnimationFrame(pulse);
      };
      pulseRafRef.current = requestAnimationFrame(pulse);

      // ── Zone click: click on empty map area → zone intelligence ──
      map.on("click", (e) => {
        // If the click hit a pin or cluster, ignore (those handlers run first)
        const pinFeatures = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED_LAYER, CLUSTER_LAYER] });
        if (pinFeatures.length > 0) return;
        // Clicked on empty zone
        onZoneClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
      });

      setMapReady(true);
    });

    return () => {
      if (pulseRafRef.current != null) cancelAnimationFrame(pulseRafRef.current);
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
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const features: GeoJSON.Feature[] = entities.map((e) => ({
      type: "Feature",
      properties: {
        entityId: e.id,
        title: e.title || e.name,
        type: e.type,
        color: VERTICAL_COLORS[e.type] || VERTICAL_COLORS[e.category ?? ""] || "#6b7280",
        icon: VERTICAL_ICONS[e.type] || VERTICAL_ICONS[e.category ?? ""] || "📍",
        rating: e.rating ?? 0,
        imageUrl: e.imageUrl || e.image_url || null,
        isSelected: e.id === selectedId,
        isSponsored: !!(e as any).isSponsored,
        reviewsCount: (e as any).reviewsCount ?? 0,
        distanceKm: e.distance ?? null,
        category: e.category ?? null,
      },
      geometry: {
        type: "Point",
        coordinates: [e.lng, e.lat],
      },
    }));

    src.setData({ type: "FeatureCollection", features });

    // Fit bounds
    if (entities.length > 0 && !showHeatmap) {
      const bounds = new mapboxgl.LngLatBounds();
      if (userLat && userLng) bounds.extend([userLng, userLat]);
      entities.forEach(e => bounds.extend([e.lng, e.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 300 });
    }
  }, [entities, selectedId, showHeatmap, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource(STATION_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(buildStationGeoJSON(entities));
  }, [entities, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    [STATION_CLUSTER_LAYER, STATION_CLUSTER_COUNT_LAYER, STATION_PULSE_LAYER, STATION_POINT_LAYER, STATION_LABEL_LAYER].forEach((layerId) => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", "visible");
    });
  }, [mapReady]);

  // ── User location marker ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    userMarkerRef.current?.remove();

    if (showUserLocation && userLat && userLng) {
      const el = document.createElement("div");
      el.className = "radar-user-marker";
      el.innerHTML = `<div class="radar-user-dot"></div><div class="radar-user-pulse"></div>`;
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

    const steps = 72;
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
        geometry: { type: "Polygon", coordinates: [coords] },
      }],
    });
  }, [radiusKm, userLat, userLng, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (weather.isRaining) {
      map.setFog({
        color: "rgba(94, 134, 190, 0.22)",
        "high-color": "rgba(18, 35, 58, 0.20)",
        "horizon-blend": 0.18,
        range: [0.8, 8],
        "space-color": "rgba(10, 16, 28, 0.82)",
        "star-intensity": 0.03,
      });
      return;
    }

    map.setFog({
      color: "rgba(255, 255, 255, 0.02)",
      "high-color": "rgba(255, 255, 255, 0.01)",
      "horizon-blend": 0.08,
      range: [1, 10],
      "space-color": "rgba(10, 12, 20, 0.72)",
      "star-intensity": 0.08,
    });
  }, [weather.isRaining, mapReady]);

  // Animate rain radar tiles with smooth frame transitions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const visible = radarOverlay !== "off" || weather.isRaining;
    const layer = map.getLayer(RAIN_LAYER);
    const source = map.getSource(RAIN_SOURCE) as (mapboxgl.Source & { setTiles?: (tiles: string[]) => void }) | undefined;

    if (layer) {
      map.setLayoutProperty(RAIN_LAYER, "visibility", visible ? "visible" : "none");
      const opacity = radarOverlay === "full"
        ? (weather.isRaining ? 0.7 : 0.38)
        : radarOverlay === "minimal" ? 0.25 : 0;
      map.setPaintProperty(RAIN_LAYER, "raster-opacity", visible ? opacity : 0);
      map.setPaintProperty(RAIN_LAYER, "raster-fade-duration", 300);
    }

    if (source?.setTiles && rainRadar.activeTileUrl) {
      source.setTiles([rainRadar.activeTileUrl]);
    }
  }, [mapReady, rainRadar.activeTileUrl, radarOverlay, weather.isRaining]);

  return (
    <>
      <div
        ref={containerRef}
        className={`w-full h-full rounded-2xl overflow-hidden ${className}`}
        style={{ minHeight: 300 }}
      />
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-3">
        <div className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/40 bg-card/85 px-3 py-2 shadow-sm backdrop-blur-md">
          {weather.isRaining ? <CloudRain className="h-4 w-4 shrink-0 text-primary" /> : <CloudSun className="h-4 w-4 shrink-0 text-primary" />}
          <span className="truncate text-[11px] font-medium text-foreground">Live station · {weather.label}</span>
        </div>
      </div>
      {weather.isRaining && (
        <>
          <div className="map-rain-tint pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="map-rain-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="map-rain-glow pointer-events-none absolute inset-0 rounded-2xl" />
        </>
      )}
      <DiscoveryHeatmapLayer
        map={mapReady ? mapRef.current : null}
        points={effectiveHeatmap}
        visible={showHeatmap}
      />
    </>
  );
});

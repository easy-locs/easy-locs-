/**
 * CanonicalMap — Premium visual-first Mapbox map.
 * Labels hidden by default, glow/pulse/halo for visual hierarchy,
 * soft weather overlays, clean clusters, smooth animations.
 */
import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import type { MapEntity, MapRoute, MapZone, MapEntityKind } from "@/types/map";
import { entitiesToFeatureCollection, routesToFeatureCollection, zonesToFeatureCollection, circleGeoJSON } from "@/lib/map/map-geojson";
import { kindColorExpression } from "@/lib/map/map-style-helpers";
import { useMapLayersStore } from "@/stores/useMapLayersStore";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { useRainRadar } from "@/hooks/useRainRadar";

/* ═══ Source / Layer IDs ═══ */
const S = {
  ENTITIES: "cm-entities",
  ROUTES: "cm-routes",
  ZONES: "cm-zones",
  RADIUS: "cm-radius",
  USER: "cm-user",
  HEATMAP: "cm-heatmap",
  RAIN: "cm-rain-radar",
} as const;

const L = {
  ZONE_FILL: "cm-zone-fill",
  ZONE_LINE: "cm-zone-line",
  RADIUS_FILL: "cm-radius-fill",
  RADIUS_LINE: "cm-radius-line",
  RAIN: "cm-rain-layer",
  HEATMAP: "cm-heatmap",
  ROUTE_LINE: "cm-route-line",
  CLUSTER_CIRCLE: "cm-cluster-circle",
  CLUSTER_GLOW: "cm-cluster-glow",
  CLUSTER_COUNT: "cm-cluster-count",
  POINT_HALO: "cm-point-halo",
  POINT: "cm-point",
  POINT_SELECTED_RING: "cm-point-selected-ring",
  LABEL: "cm-label",
  USER_PULSE: "cm-user-pulse",
  USER_GLOW: "cm-user-glow",
  USER_DOT: "cm-user-dot",
} as const;

const KIND_TO_FLAG: Record<MapEntityKind, keyof ReturnType<typeof useMapLayersStore.getState>["layers"]> = {
  restaurant: "restaurants",
  grocery: "grocery",
  hotel: "hotels",
  property: "properties",
  service: "services",
  driver: "drivers",
  order: "orders",
  pickup: "pickups",
  dropoff: "dropoffs",
  warehouse: "warehouses",
  user: "userLocation",
};

interface CanonicalMapProps {
  entities: MapEntity[];
  routes?: MapRoute[];
  zones?: MapZone[];
  userLocation?: { lat: number; lng: number } | null;
  selectedEntityId?: string | null;
  radiusKm?: number;
  initialCenter?: { lat: number; lng: number; zoom?: number };
  className?: string;
  onSelectEntity?: (entity: MapEntity) => void;
  onZoneClick?: (lat: number, lng: number) => void;
}

function safeSetData(map: mapboxgl.Map, sourceId: string, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
  if (src) src.setData(data);
}

function buildPopupHTML(props: Record<string, any>): string {
  const rating = props.rating ? Number(props.rating) : 0;
  const stars = rating > 0
    ? `<span style="color:#eab308;font-weight:700;font-size:10px">★ ${rating.toFixed(1)}</span>`
    : "";
  const dist = props.distanceKm != null
    ? `<span style="color:rgba(255,255,255,0.35);font-size:9px;margin-left:4px">${Number(props.distanceKm).toFixed(1)}km</span>`
    : "";
  return `<div style="min-width:100px;background:rgba(12,14,20,0.92);border-radius:12px;padding:8px 10px;box-shadow:0 12px 40px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.06);backdrop-filter:blur(20px)">
    <div style="font-weight:700;font-size:12px;color:rgba(255,255,255,0.92);line-height:1.3">${props.title || ""}</div>
    <div style="margin-top:2px">${stars}${dist}</div>
  </div>`;
}

export default memo(function CanonicalMap({
  entities,
  routes = [],
  zones = [],
  userLocation = null,
  selectedEntityId = null,
  radiusKm = 5,
  initialCenter = { lat: 25.2048, lng: 55.2708, zoom: 12 },
  className = "",
  onSelectEntity,
  onZoneClick,
}: CanonicalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const pulseRef = useRef<number>(0);
  const [ready, setReady] = useState(false);

  const layers = useMapLayersStore((s) => s.layers);
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const onSelectRef = useRef(onSelectEntity);
  onSelectRef.current = onSelectEntity;
  const onZoneClickRef = useRef(onZoneClick);
  onZoneClickRef.current = onZoneClick;

  const cLat = userLocation?.lat ?? initialCenter.lat;
  const cLng = userLocation?.lng ?? initialCenter.lng;
  const weather = useLiveWeatherStation({ lat: cLat, lng: cLng });
  const rainRadar = useRainRadar(layers.rainRadar || layers.weather || weather.isRaining);

  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      const flag = KIND_TO_FLAG[e.kind];
      if (!flag) return true;
      return layers[flag];
    });
  }, [entities, layers]);

  // ── Init Map ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialCenter.zoom ?? 12,
      attributionControl: false,
      maxZoom: 18,
      fadeDuration: 200,
    });
    mapRef.current = map;

    map.on("load", () => {
      // ── Sources ──
      map.addSource(S.ZONES, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource(S.RADIUS, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource(S.ROUTES, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource(S.HEATMAP, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource(S.USER, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource(S.ENTITIES, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 55,
      });
      map.addSource(S.RAIN, {
        type: "raster",
        tiles: ["https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/2/1_1.png"],
        tileSize: 256,
      });

      // ── Layers (bottom → top) ──

      // Zones — subtle
      map.addLayer({
        id: L.ZONE_FILL, type: "fill", source: S.ZONES,
        paint: { "fill-color": "hsla(220,60%,55%,0.06)" },
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: L.ZONE_LINE, type: "line", source: S.ZONES,
        paint: { "line-color": "hsla(220,60%,55%,0.2)", "line-width": 1, "line-dasharray": [6, 4] },
        layout: { visibility: "none" },
      });

      // Radius — glass-like
      map.addLayer({
        id: L.RADIUS_FILL, type: "fill", source: S.RADIUS,
        paint: { "fill-color": "hsla(220,70%,55%,0.04)" },
      });
      map.addLayer({
        id: L.RADIUS_LINE, type: "line", source: S.RADIUS,
        paint: { "line-color": "hsla(220,70%,60%,0.15)", "line-width": 1.5, "line-dasharray": [6, 4] },
      });

      // Rain radar — very soft
      map.addLayer({
        id: L.RAIN, type: "raster", source: S.RAIN,
        paint: { "raster-opacity": 0, "raster-fade-duration": 500 },
        layout: { visibility: "none" },
      });

      // Heatmap — ethereal
      map.addLayer({
        id: L.HEATMAP, type: "heatmap", source: S.HEATMAP,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 13, 2.5],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 13, 35],
          "heatmap-opacity": 0.5,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.15, "hsla(220,70%,50%,0.15)",
            0.35, "hsla(200,70%,50%,0.25)",
            0.55, "hsla(170,70%,50%,0.35)",
            0.75, "hsla(45,80%,55%,0.45)",
            1, "hsla(15,80%,55%,0.55)",
          ],
        },
        layout: { visibility: "none" },
      });

      // Routes — neon line
      map.addLayer({
        id: L.ROUTE_LINE, type: "line", source: S.ROUTES,
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#3b82f6"],
          "line-width": 3,
          "line-opacity": 0.6,
          "line-blur": 1,
        },
        layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      });

      // ── Clusters — premium glass bubbles ──
      // Outer glow
      map.addLayer({
        id: L.CLUSTER_GLOW, type: "circle", source: S.ENTITIES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"],
            "hsla(220,60%,55%,0.2)", 10, "hsla(200,65%,50%,0.2)",
            30, "hsla(45,70%,55%,0.2)", 100, "hsla(15,70%,55%,0.2)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 30, 10, 38, 30, 46, 100, 54],
          "circle-blur": 0.9,
        },
      });
      // Inner circle
      map.addLayer({
        id: L.CLUSTER_CIRCLE, type: "circle", source: S.ENTITIES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"],
            "hsla(220,50%,20%,0.75)", 10, "hsla(200,50%,18%,0.75)",
            30, "hsla(45,40%,20%,0.75)", 100, "hsla(15,40%,20%,0.75)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30, 100, 36],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.12)",
        },
      });
      map.addLayer({
        id: L.CLUSTER_COUNT, type: "symbol", source: S.ENTITIES,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 13,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "rgba(255,255,255,0.8)" },
      });

      // ── Points ──
      // Soft halo for all points
      map.addLayer({
        id: L.POINT_HALO, type: "circle", source: S.ENTITIES,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": kindColorExpression(),
          "circle-radius": 16,
          "circle-blur": 0.85,
          "circle-opacity": ["case",
            ["==", ["get", "isSelected"], true], 0.5,
            0.15,
          ],
        },
      });

      // Selected ring (animated via pulse)
      map.addLayer({
        id: L.POINT_SELECTED_RING, type: "circle", source: S.ENTITIES,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSelected"], true]],
        paint: {
          "circle-color": "transparent",
          "circle-radius": 22,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.35)",
          "circle-stroke-opacity": 0.6,
        },
      });

      // Core dots
      map.addLayer({
        id: L.POINT, type: "circle", source: S.ENTITIES,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": kindColorExpression(),
          "circle-radius": ["case",
            ["==", ["get", "isSelected"], true], 10,
            7,
          ],
          "circle-stroke-width": ["case",
            ["==", ["get", "isSelected"], true], 2.5,
            1,
          ],
          "circle-stroke-color": ["case",
            ["==", ["get", "isSelected"], true], "#ffffff",
            "rgba(255,255,255,0.25)",
          ],
          "circle-opacity": 0.92,
        },
      });

      // Labels — contextual: high zoom only, or selected
      map.addLayer({
        id: L.LABEL, type: "symbol", source: S.ENTITIES,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "title"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 17, 12],
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-max-width": 8,
          "text-optional": true,
          visibility: "none",   // OFF by default — controlled by store
        },
        paint: {
          "text-color": "rgba(255,255,255,0.6)",
          "text-halo-color": "rgba(0,0,0,0.75)",
          "text-halo-width": 1.2,
          "text-halo-blur": 0.5,
        },
        minzoom: 14.5,
      });

      // ── User location — pulse + glow + dot ──
      map.addLayer({
        id: L.USER_PULSE, type: "circle", source: S.USER,
        paint: {
          "circle-color": "hsla(220,70%,55%,0.12)",
          "circle-radius": 28,
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: L.USER_GLOW, type: "circle", source: S.USER,
        paint: {
          "circle-color": "hsla(220,70%,55%,0.3)",
          "circle-radius": 14,
          "circle-blur": 0.7,
        },
      });
      map.addLayer({
        id: L.USER_DOT, type: "circle", source: S.USER,
        paint: {
          "circle-color": "hsl(220,70%,55%)",
          "circle-radius": 6,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      // ── Interactions ──

      // Cluster expand
      map.on("click", L.CLUSTER_CIRCLE, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [L.CLUSTER_CIRCLE] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        (map.getSource(S.ENTITIES) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, z) => {
          if (err) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: z ?? 14, duration: 500 });
        });
      });

      // Select entity
      map.on("click", L.POINT, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [L.POINT] });
        if (!features.length) return;
        const id = features[0].properties?.id;
        const entity = entitiesRef.current.find((en) => en.id === id);
        if (entity) onSelectRef.current?.(entity);
      });

      // Hover popup (desktop)
      map.on("mouseenter", L.POINT, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: false, closeOnClick: false,
          offset: 14, maxWidth: "180px",
          className: "cm-popup-premium",
        })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(f.properties!))
          .addTo(map);
      });
      map.on("mouseleave", L.POINT, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // Touch popup (mobile)
      map.on("touchstart", L.POINT, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true, offset: 14, maxWidth: "180px",
          className: "cm-popup-premium",
        })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(f.properties!))
          .addTo(map);
      });

      // Zone click
      map.on("click", (e) => {
        const pins = map.queryRenderedFeatures(e.point, { layers: [L.POINT, L.CLUSTER_CIRCLE] });
        if (pins.length > 0) return;
        onZoneClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
      });

      map.on("mouseenter", L.CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", L.CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = ""; });

      setReady(true);

      // ── User location pulse animation ──
      let pulseGrow = true;
      const animatePulse = () => {
        if (!mapRef.current) return;
        const m = mapRef.current;
        if (m.getLayer(L.USER_PULSE)) {
          const r = pulseGrow ? 32 : 24;
          m.setPaintProperty(L.USER_PULSE, "circle-radius", r);
          m.setPaintProperty(L.USER_PULSE, "circle-opacity", pulseGrow ? 0.08 : 0.15);
        }
        // Selected ring pulse
        if (m.getLayer(L.POINT_SELECTED_RING)) {
          m.setPaintProperty(L.POINT_SELECTED_RING, "circle-radius", pulseGrow ? 24 : 20);
          m.setPaintProperty(L.POINT_SELECTED_RING, "circle-stroke-opacity", pulseGrow ? 0.4 : 0.7);
        }
        pulseGrow = !pulseGrow;
        pulseRef.current = window.setTimeout(animatePulse, 1200);
      };
      pulseRef.current = window.setTimeout(animatePulse, 600);
    });

    return () => {
      clearTimeout(pulseRef.current);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // ── Entity data ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const fc = entitiesToFeatureCollection(filteredEntities);
    fc.features.forEach((f) => {
      if (f.properties) f.properties.isSelected = f.properties.id === selectedEntityId;
    });
    safeSetData(mapRef.current, S.ENTITIES, fc);
  }, [filteredEntities, selectedEntityId, ready]);

  // ── Heatmap ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (map.getLayer(L.HEATMAP)) {
      map.setLayoutProperty(L.HEATMAP, "visibility", layers.heatmap ? "visible" : "none");
    }
    if (layers.heatmap) {
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: filteredEntities.map((e) => ({
          type: "Feature",
          properties: { intensity: Math.min(1, ((e.rating ?? 3) / 5) * 0.5 + 0.3) },
          geometry: { type: "Point", coordinates: [e.lng, e.lat] },
        })),
      };
      safeSetData(map, S.HEATMAP, fc);
    } else {
      safeSetData(map, S.HEATMAP, { type: "FeatureCollection", features: [] });
    }
  }, [filteredEntities, layers.heatmap, ready]);

  // ── Routes ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (mapRef.current.getLayer(L.ROUTE_LINE)) {
      mapRef.current.setLayoutProperty(L.ROUTE_LINE, "visibility", layers.routes && routes.length > 0 ? "visible" : "none");
    }
    safeSetData(mapRef.current, S.ROUTES, routesToFeatureCollection(layers.routes ? routes : []));
  }, [routes, layers.routes, ready]);

  // ── Zones ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const vis = layers.zones && zones.length > 0 ? "visible" : "none";
    [L.ZONE_FILL, L.ZONE_LINE].forEach((l) => {
      if (mapRef.current!.getLayer(l)) mapRef.current!.setLayoutProperty(l, "visibility", vis);
    });
    safeSetData(mapRef.current, S.ZONES, zonesToFeatureCollection(layers.zones ? zones : []));
  }, [zones, layers.zones, ready]);

  // ── Radius ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (layers.radius && userLocation && radiusKm > 0 && radiusKm <= 50) {
      safeSetData(mapRef.current, S.RADIUS, circleGeoJSON(userLocation, radiusKm));
    } else {
      safeSetData(mapRef.current, S.RADIUS, { type: "FeatureCollection", features: [] });
    }
  }, [layers.radius, userLocation, radiusKm, ready]);

  // ── User location ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (layers.userLocation && userLocation) {
      safeSetData(mapRef.current, S.USER, {
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [userLocation.lng, userLocation.lat] } }],
      });
    } else {
      safeSetData(mapRef.current, S.USER, { type: "FeatureCollection", features: [] });
    }
  }, [userLocation, layers.userLocation, ready]);

  // ── Labels ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (mapRef.current.getLayer(L.LABEL)) {
      mapRef.current.setLayoutProperty(L.LABEL, "visibility", layers.labels ? "visible" : "none");
    }
  }, [layers.labels, ready]);

  // ── Clusters ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const vis = layers.clusters ? "visible" : "none";
    [L.CLUSTER_GLOW, L.CLUSTER_CIRCLE, L.CLUSTER_COUNT].forEach((l) => {
      if (mapRef.current!.getLayer(l)) mapRef.current!.setLayoutProperty(l, "visibility", vis);
    });
  }, [layers.clusters, ready]);

  // ── Rain radar — very soft ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visible = layers.rainRadar || layers.weather || weather.isRaining;
    if (map.getLayer(L.RAIN)) {
      map.setLayoutProperty(L.RAIN, "visibility", visible ? "visible" : "none");
      // Keep opacity very low for premium feel
      map.setPaintProperty(L.RAIN, "raster-opacity", visible ? (weather.isRaining ? 0.35 : 0.18) : 0);
    }
    const src = map.getSource(S.RAIN) as any;
    if (src?.setTiles && rainRadar.activeTileUrl) {
      src.setTiles([rainRadar.activeTileUrl]);
    }
  }, [ready, layers.rainRadar, layers.weather, weather.isRaining, rainRadar.activeTileUrl]);

  // ── Weather fog — subtle atmospheric ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (weather.isRaining) {
      map.setFog({
        color: "rgba(60,90,140,0.12)",
        "high-color": "rgba(15,25,45,0.15)",
        "horizon-blend": 0.12,
        range: [1, 10],
        "space-color": "rgba(8,12,22,0.8)",
        "star-intensity": 0.02,
      });
    } else {
      map.setFog({
        color: "rgba(255,255,255,0.01)",
        "high-color": "rgba(255,255,255,0.005)",
        "horizon-blend": 0.06,
        range: [1.5, 12],
        "space-color": "rgba(8,10,18,0.7)",
        "star-intensity": 0.06,
      });
    }
  }, [weather.isRaining, ready]);

  // ── Selected entity flyTo ──
  useEffect(() => {
    if (!mapRef.current || !ready || !selectedEntityId) return;
    const entity = filteredEntities.find((e) => e.id === selectedEntityId);
    if (entity) {
      mapRef.current.flyTo({ center: [entity.lng, entity.lat], zoom: 15.5, duration: 900, essential: true });
    }
  }, [selectedEntityId, ready]);

  // ── Fit bounds on initial load ──
  useEffect(() => {
    if (!mapRef.current || !ready || filteredEntities.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
    filteredEntities.forEach((e) => bounds.extend([e.lng, e.lat]));
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
  }, [ready]);

  const recenter = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14, duration: 700 });
  }, [userLocation]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />

      {/* Soft atmospheric overlay during rain */}
      {weather.isRaining && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: "linear-gradient(180deg, rgba(60,100,180,0.04) 0%, rgba(40,70,140,0.06) 100%)" }}
        />
      )}
    </div>
  );
});

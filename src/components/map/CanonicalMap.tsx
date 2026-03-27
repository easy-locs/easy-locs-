/**
 * CanonicalMap — Premium visual-first Mapbox map with first-class live animations.
 * Uses requestAnimationFrame for smooth pulse/glow, soft radar, airy clusters.
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

/* ═══ Source / Layer IDs — unique, no duplicates ═══ */
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
  CLUSTER_OUTER_GLOW: "cm-cluster-outer-glow",
  CLUSTER_GLOW: "cm-cluster-glow",
  CLUSTER_CIRCLE: "cm-cluster-circle",
  CLUSTER_COUNT: "cm-cluster-count",
  POINT_HALO: "cm-point-halo",
  POINT_SELECTED_RING: "cm-point-selected-ring",
  POINT: "cm-point",
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
  onRecenter?: () => void;
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
  return `<div style="min-width:90px;background:rgba(10,12,18,0.94);border-radius:14px;padding:8px 12px;box-shadow:0 16px 48px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.05);backdrop-filter:blur(24px)">
    <div style="font-weight:700;font-size:12px;color:rgba(255,255,255,0.95);line-height:1.3">${props.title || ""}</div>
    ${stars ? `<div style="margin-top:3px">${stars}</div>` : ""}
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
  const rafRef = useRef<number>(0);
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
      fadeDuration: 300,
      pitch: 0,
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
        clusterRadius: 60,
      });
      map.addSource(S.RAIN, {
        type: "raster",
        tiles: ["https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/2/1_1.png"],
        tileSize: 256,
      });

      // ── Layers (bottom → top) ──

      // Zones
      map.addLayer({
        id: L.ZONE_FILL, type: "fill", source: S.ZONES,
        paint: { "fill-color": "hsla(220,60%,55%,0.05)" },
        layout: { visibility: "none" },
      });
      map.addLayer({
        id: L.ZONE_LINE, type: "line", source: S.ZONES,
        paint: { "line-color": "hsla(220,60%,55%,0.15)", "line-width": 1, "line-dasharray": [6, 4] },
        layout: { visibility: "none" },
      });

      // Radius
      map.addLayer({
        id: L.RADIUS_FILL, type: "fill", source: S.RADIUS,
        paint: { "fill-color": "hsla(220,70%,55%,0.03)" },
      });
      map.addLayer({
        id: L.RADIUS_LINE, type: "line", source: S.RADIUS,
        paint: { "line-color": "hsla(220,70%,60%,0.12)", "line-width": 1, "line-dasharray": [8, 5] },
      });

      // Rain radar — ultra soft
      map.addLayer({
        id: L.RAIN, type: "raster", source: S.RAIN,
        paint: { "raster-opacity": 0, "raster-fade-duration": 600 },
        layout: { visibility: "none" },
      });

      // Heatmap
      map.addLayer({
        id: L.HEATMAP, type: "heatmap", source: S.HEATMAP,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 13, 2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 13, 30],
          "heatmap-opacity": 0.4,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "hsla(220,70%,50%,0.1)",
            0.4, "hsla(200,70%,50%,0.2)",
            0.6, "hsla(170,70%,50%,0.3)",
            0.8, "hsla(45,80%,55%,0.35)",
            1, "hsla(15,80%,55%,0.4)",
          ],
        },
        layout: { visibility: "none" },
      });

      // Routes
      map.addLayer({
        id: L.ROUTE_LINE, type: "line", source: S.ROUTES,
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#3b82f6"],
          "line-width": 3,
          "line-opacity": 0.5,
          "line-blur": 1.5,
        },
        layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      });

      // ── Clusters — premium 3-layer glass effect ──
      // Outermost soft glow
      map.addLayer({
        id: L.CLUSTER_OUTER_GLOW, type: "circle", source: S.ENTITIES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"],
            "hsla(220,60%,55%,0.08)", 10, "hsla(200,65%,50%,0.08)",
            30, "hsla(45,70%,55%,0.08)", 100, "hsla(15,70%,55%,0.08)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 38, 10, 48, 30, 56, 100, 64],
          "circle-blur": 1,
        },
      });
      // Inner glow
      map.addLayer({
        id: L.CLUSTER_GLOW, type: "circle", source: S.ENTITIES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"],
            "hsla(220,60%,55%,0.15)", 10, "hsla(200,65%,50%,0.15)",
            30, "hsla(45,70%,55%,0.15)", 100, "hsla(15,70%,55%,0.15)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 28, 10, 36, 30, 42, 100, 50],
          "circle-blur": 0.7,
        },
      });
      // Core circle
      map.addLayer({
        id: L.CLUSTER_CIRCLE, type: "circle", source: S.ENTITIES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"],
            "hsla(220,45%,16%,0.85)", 10, "hsla(200,45%,16%,0.85)",
            30, "hsla(45,35%,16%,0.85)", 100, "hsla(15,35%,16%,0.85)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 30, 28, 100, 34],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.08)",
        },
      });
      // Count text
      map.addLayer({
        id: L.CLUSTER_COUNT, type: "symbol", source: S.ENTITIES,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "rgba(255,255,255,0.75)" },
      });

      // ── Points ──
      // Soft halo
      map.addLayer({
        id: L.POINT_HALO, type: "circle", source: S.ENTITIES,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": kindColorExpression(),
          "circle-radius": 18,
          "circle-blur": 0.9,
          "circle-opacity": ["case",
            ["==", ["get", "isSelected"], true], 0.45,
            0.12,
          ],
        },
      });

      // Selected ring — animated via RAF
      map.addLayer({
        id: L.POINT_SELECTED_RING, type: "circle", source: S.ENTITIES,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSelected"], true]],
        paint: {
          "circle-color": "transparent",
          "circle-radius": 24,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.3)",
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
            ["==", ["get", "isSelected"], true], 9,
            6,
          ],
          "circle-stroke-width": ["case",
            ["==", ["get", "isSelected"], true], 2.5,
            1,
          ],
          "circle-stroke-color": ["case",
            ["==", ["get", "isSelected"], true], "#ffffff",
            "rgba(255,255,255,0.2)",
          ],
          "circle-opacity": 0.9,
        },
      });

      // Labels — contextual: only high zoom + selected
      map.addLayer({
        id: L.LABEL, type: "symbol", source: S.ENTITIES,
        filter: ["all",
          ["!", ["has", "point_count"]],
          ["any",
            ["==", ["get", "isSelected"], true],
            [">=", ["zoom"], 15],
          ],
        ],
        layout: {
          "text-field": ["get", "title"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 17, 11],
          "text-offset": [0, 1.8],
          "text-anchor": "top",
          "text-max-width": 7,
          "text-optional": true,
          visibility: "visible",
        },
        paint: {
          "text-color": "rgba(255,255,255,0.55)",
          "text-halo-color": "rgba(0,0,0,0.8)",
          "text-halo-width": 1.2,
          "text-halo-blur": 0.5,
          "text-opacity": ["case",
            ["==", ["get", "isSelected"], true], 1,
            ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 0.7],
          ],
        },
        minzoom: 14,
      });

      // ── User location — 3-layer pulse ──
      map.addLayer({
        id: L.USER_PULSE, type: "circle", source: S.USER,
        paint: {
          "circle-color": "hsla(220,70%,55%,0.08)",
          "circle-radius": 30,
          "circle-blur": 0.7,
        },
      });
      map.addLayer({
        id: L.USER_GLOW, type: "circle", source: S.USER,
        paint: {
          "circle-color": "hsla(220,70%,55%,0.25)",
          "circle-radius": 14,
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: L.USER_DOT, type: "circle", source: S.USER,
        paint: {
          "circle-color": "hsl(220,70%,55%)",
          "circle-radius": 5.5,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      // ── Interactions ──

      // Cluster expand with smooth ease
      map.on("click", L.CLUSTER_CIRCLE, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [L.CLUSTER_CIRCLE] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        (map.getSource(S.ENTITIES) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, z) => {
          if (err) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: Math.min(z ?? 14, 16), duration: 600, easing: (t) => t * (2 - t) });
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
          offset: 16, maxWidth: "180px",
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
          closeButton: true, offset: 16, maxWidth: "180px",
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

      // ── Smooth RAF animation loop ──
      let startTime = performance.now();
      const animate = (now: number) => {
        if (!mapRef.current) return;
        const m = mapRef.current;
        const elapsed = now - startTime;
        const t = (Math.sin(elapsed * 0.002) + 1) / 2; // 0..1 smooth sine

        // User pulse: breathe between 24 and 36
        if (m.getLayer(L.USER_PULSE)) {
          m.setPaintProperty(L.USER_PULSE, "circle-radius", 24 + t * 12);
          m.setPaintProperty(L.USER_PULSE, "circle-opacity", 0.06 + (1 - t) * 0.06);
        }

        // Selected ring: breathe between 20 and 28
        if (m.getLayer(L.POINT_SELECTED_RING)) {
          m.setPaintProperty(L.POINT_SELECTED_RING, "circle-radius", 20 + t * 8);
          m.setPaintProperty(L.POINT_SELECTED_RING, "circle-stroke-opacity", 0.3 + (1 - t) * 0.4);
        }

        // Cluster outer glow: subtle breathe
        if (m.getLayer(L.CLUSTER_OUTER_GLOW)) {
          const glowScale = 0.95 + t * 0.1;
          // We can't scale directly, but we can modulate opacity
          m.setPaintProperty(L.CLUSTER_OUTER_GLOW, "circle-opacity", 0.7 + t * 0.3);
        }

        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
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

  // ── Labels — show/hide via store toggle (filter handles zoom+selected logic) ──
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
    [L.CLUSTER_OUTER_GLOW, L.CLUSTER_GLOW, L.CLUSTER_CIRCLE, L.CLUSTER_COUNT].forEach((l) => {
      if (mapRef.current!.getLayer(l)) mapRef.current!.setLayoutProperty(l, "visibility", vis);
    });
  }, [layers.clusters, ready]);

  // ── Rain radar — ultra soft ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visible = layers.rainRadar || layers.weather || weather.isRaining;
    if (map.getLayer(L.RAIN)) {
      map.setLayoutProperty(L.RAIN, "visibility", visible ? "visible" : "none");
      map.setPaintProperty(L.RAIN, "raster-opacity", visible ? (weather.isRaining ? 0.25 : 0.12) : 0);
    }
    const src = map.getSource(S.RAIN) as any;
    if (src?.setTiles && rainRadar.activeTileUrl) {
      src.setTiles([rainRadar.activeTileUrl]);
    }
  }, [ready, layers.rainRadar, layers.weather, weather.isRaining, rainRadar.activeTileUrl]);

  // ── Weather fog — very subtle atmosphere ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (weather.isRaining) {
      map.setFog({
        color: "rgba(50,80,130,0.08)",
        "high-color": "rgba(12,20,40,0.1)",
        "horizon-blend": 0.08,
        range: [1, 12],
        "space-color": "rgba(6,10,18,0.8)",
        "star-intensity": 0.01,
      });
    } else {
      map.setFog({
        color: "rgba(255,255,255,0.005)",
        "high-color": "rgba(255,255,255,0.003)",
        "horizon-blend": 0.04,
        range: [2, 14],
        "space-color": "rgba(6,8,16,0.7)",
        "star-intensity": 0.05,
      });
    }
  }, [weather.isRaining, ready]);

  // ── Selected entity flyTo ──
  useEffect(() => {
    if (!mapRef.current || !ready || !selectedEntityId) return;
    const entity = filteredEntities.find((e) => e.id === selectedEntityId);
    if (entity) {
      mapRef.current.flyTo({
        center: [entity.lng, entity.lat],
        zoom: 15.5,
        duration: 1000,
        essential: true,
        curve: 1.2,
      });
    }
  }, [selectedEntityId, ready]);

  // ── Fit bounds on initial load ──
  useEffect(() => {
    if (!mapRef.current || !ready || filteredEntities.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
    filteredEntities.forEach((e) => bounds.extend([e.lng, e.lat]));
    mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 600 });
  }, [ready]);

  const recenter = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14, duration: 800 });
  }, [userLocation]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />

      {/* Subtle atmospheric rain overlay */}
      {weather.isRaining && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-1000"
          style={{ background: "linear-gradient(180deg, rgba(50,90,160,0.03) 0%, rgba(30,60,120,0.04) 100%)" }}
        />
      )}
    </div>
  );
});

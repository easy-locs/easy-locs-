/**
 * CanonicalMap — The single canonical Mapbox map component for the entire project.
 * Supports: all entity kinds, clusters, heatmap, routes, zones, radius, weather, rain radar, traffic.
 * Integrates with useMapLayersStore for layer toggle control.
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

/* ═══ Source / Layer IDs — prefixed to avoid collisions ═══ */
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
  // Bottom
  ZONE_FILL: "cm-zone-fill",
  ZONE_LINE: "cm-zone-line",
  RADIUS_FILL: "cm-radius-fill",
  RADIUS_LINE: "cm-radius-line",
  // Weather
  RAIN: "cm-rain-layer",
  // Heatmap
  HEATMAP: "cm-heatmap",
  // Routes
  ROUTE_LINE: "cm-route-line",
  // Entity layers
  CLUSTER_CIRCLE: "cm-cluster-circle",
  CLUSTER_COUNT: "cm-cluster-count",
  POINT_GLOW: "cm-point-glow",
  POINT: "cm-point",
  LABEL: "cm-label",
  // User
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
  const stars = rating > 0 ? `<span style="color:#eab308;font-weight:700">★ ${rating.toFixed(1)}</span>` : "";
  const dist = props.distanceKm != null ? `<span style="color:rgba(255,255,255,0.5);font-size:10px;margin-left:4px">${Number(props.distanceKm).toFixed(1)}km</span>` : "";
  return `<div style="min-width:140px;background:hsl(220,15%,13%);border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
    <div style="padding:8px 10px">
      <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:2px;line-height:1.3">${props.title || ""}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.6)">${stars}${dist}</div>
    </div>
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

  // Filter entities by active layers
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

      // Zones
      map.addLayer({ id: L.ZONE_FILL, type: "fill", source: S.ZONES, paint: { "fill-color": "hsl(220,60%,50%)", "fill-opacity": 0.1 } });
      map.addLayer({ id: L.ZONE_LINE, type: "line", source: S.ZONES, paint: { "line-color": "hsl(220,60%,50%)", "line-width": 1.5, "line-opacity": 0.4, "line-dasharray": [4, 3] } });

      // Radius
      map.addLayer({ id: L.RADIUS_FILL, type: "fill", source: S.RADIUS, paint: { "fill-color": "hsl(220,70%,55%)", "fill-opacity": 0.08 } });
      map.addLayer({ id: L.RADIUS_LINE, type: "line", source: S.RADIUS, paint: { "line-color": "hsl(220,70%,60%)", "line-width": 2, "line-opacity": 0.4, "line-dasharray": [4, 3] } });

      // Rain radar
      map.addLayer({ id: L.RAIN, type: "raster", source: S.RAIN, paint: { "raster-opacity": 0, "raster-fade-duration": 300 }, layout: { visibility: "none" } });

      // Heatmap
      map.addLayer({
        id: L.HEATMAP, type: "heatmap", source: S.HEATMAP,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 13, 3],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 13, 30],
          "heatmap-opacity": 0.7,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)", 0.2, "hsla(220,70%,50%,0.4)", 0.4, "hsla(180,70%,50%,0.5)",
            0.6, "hsla(120,70%,50%,0.6)", 0.8, "hsla(45,90%,55%,0.7)", 1, "hsla(0,80%,55%,0.8)",
          ],
        },
        layout: { visibility: "none" },
      });

      // Routes
      map.addLayer({ id: L.ROUTE_LINE, type: "line", source: S.ROUTES, paint: { "line-color": ["coalesce", ["get", "color"], "#3b82f6"], "line-width": 4, "line-opacity": 0.75 }, layout: { "line-cap": "round", "line-join": "round", visibility: "none" } });

      // Entity clusters
      map.addLayer({
        id: L.CLUSTER_CIRCLE, type: "circle", source: S.ENTITIES, filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "hsla(220,60%,50%,0.85)", 10, "hsla(200,65%,45%,0.85)", 30, "hsla(45,80%,50%,0.85)", 100, "hsla(15,75%,50%,0.85)"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 30, 36, 100, 44],
          "circle-stroke-width": 3,
          "circle-stroke-color": "rgba(255,255,255,0.25)",
          "circle-blur": 0.15,
        },
      });
      map.addLayer({
        id: L.CLUSTER_COUNT, type: "symbol", source: S.ENTITIES, filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"], "text-size": 14, "text-allow-overlap": true },
        paint: { "text-color": "#ffffff" },
      });

      // Glow for selected/sponsored
      map.addLayer({
        id: L.POINT_GLOW, type: "circle", source: S.ENTITIES,
        filter: ["all", ["!", ["has", "point_count"]], ["any", ["get", "isSponsored"], ["==", ["get", "isSelected"], true]]],
        paint: {
          "circle-color": ["case", ["==", ["get", "isSelected"], true], "hsla(220,70%,55%,0.4)", "hsla(45,90%,55%,0.3)"],
          "circle-radius": 20,
          "circle-blur": 0.8,
        },
      });

      // Unclustered points
      map.addLayer({
        id: L.POINT, type: "circle", source: S.ENTITIES, filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": kindColorExpression(),
          "circle-radius": ["case", ["==", ["get", "isSelected"], true], 13, ["get", "isSponsored"], 11, 8],
          "circle-stroke-width": ["case", ["==", ["get", "isSelected"], true], 3, 1.5],
          "circle-stroke-color": ["case", ["==", ["get", "isSelected"], true], "#ffffff", "rgba(255,255,255,0.4)"],
          "circle-opacity": 0.95,
        },
      });

      // Labels
      map.addLayer({
        id: L.LABEL, type: "symbol", source: S.ENTITIES, filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "title"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-max-width": 9,
          visibility: "visible",
        },
        paint: { "text-color": "rgba(255,255,255,0.8)", "text-halo-color": "rgba(0,0,0,0.7)", "text-halo-width": 1 },
        minzoom: 13,
      });

      // User location
      map.addLayer({
        id: L.USER_GLOW, type: "circle", source: S.USER,
        paint: { "circle-color": "hsl(220,70%,55%)", "circle-radius": 20, "circle-blur": 0.8, "circle-opacity": 0.35 },
      });
      map.addLayer({
        id: L.USER_DOT, type: "circle", source: S.USER,
        paint: { "circle-color": "hsl(220,70%,55%)", "circle-radius": 7, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" },
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
          map.easeTo({ center: coords, zoom: z ?? 14, duration: 400 });
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

      // Popup on hover
      map.on("mouseenter", L.POINT, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 16, maxWidth: "220px" })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(f.properties!))
          .addTo(map);
      });
      map.on("mouseleave", L.POINT, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // Touch popup
      map.on("touchstart", L.POINT, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({ closeButton: true, offset: 16, maxWidth: "220px" })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(f.properties!))
          .addTo(map);
      });

      // Zone click (empty area)
      map.on("click", (e) => {
        const pins = map.queryRenderedFeatures(e.point, { layers: [L.POINT, L.CLUSTER_CIRCLE] });
        if (pins.length > 0) return;
        onZoneClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
      });

      // Cursor
      map.on("mouseenter", L.CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", L.CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = ""; });

      setReady(true);
    });

    return () => {
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
    // Enrich features with selection state
    fc.features.forEach((f) => {
      if (f.properties) {
        f.properties.isSelected = f.properties.id === selectedEntityId;
      }
    });
    safeSetData(mapRef.current, S.ENTITIES, fc);
  }, [filteredEntities, selectedEntityId, ready]);

  // ── Heatmap data ──
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

  // ── Routes data ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    if (map.getLayer(L.ROUTE_LINE)) {
      map.setLayoutProperty(L.ROUTE_LINE, "visibility", layers.routes && routes.length > 0 ? "visible" : "none");
    }
    safeSetData(map, S.ROUTES, routesToFeatureCollection(layers.routes ? routes : []));
  }, [routes, layers.routes, ready]);

  // ── Zones data ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    [L.ZONE_FILL, L.ZONE_LINE].forEach((l) => {
      if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", layers.zones && zones.length > 0 ? "visible" : "none");
    });
    safeSetData(map, S.ZONES, zonesToFeatureCollection(layers.zones ? zones : []));
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

  // ── Labels visibility ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (mapRef.current.getLayer(L.LABEL)) {
      mapRef.current.setLayoutProperty(L.LABEL, "visibility", layers.labels ? "visible" : "none");
    }
  }, [layers.labels, ready]);

  // ── Clusters visibility ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const vis = layers.clusters ? "visible" : "none";
    [L.CLUSTER_CIRCLE, L.CLUSTER_COUNT].forEach((l) => {
      if (mapRef.current!.getLayer(l)) mapRef.current!.setLayoutProperty(l, "visibility", vis);
    });
  }, [layers.clusters, ready]);

  // ── Rain radar ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visible = layers.rainRadar || layers.weather || weather.isRaining;
    if (map.getLayer(L.RAIN)) {
      map.setLayoutProperty(L.RAIN, "visibility", visible ? "visible" : "none");
      map.setPaintProperty(L.RAIN, "raster-opacity", visible ? (weather.isRaining ? 0.7 : 0.4) : 0);
    }
    const src = map.getSource(S.RAIN) as any;
    if (src?.setTiles && rainRadar.activeTileUrl) {
      src.setTiles([rainRadar.activeTileUrl]);
    }
  }, [ready, layers.rainRadar, layers.weather, weather.isRaining, rainRadar.activeTileUrl]);

  // ── Weather fog ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (weather.isRaining) {
      map.setFog({ color: "rgba(94,134,190,0.22)", "high-color": "rgba(18,35,58,0.20)", "horizon-blend": 0.18, range: [0.8, 8], "space-color": "rgba(10,16,28,0.82)", "star-intensity": 0.03 });
    } else {
      map.setFog({ color: "rgba(255,255,255,0.02)", "high-color": "rgba(255,255,255,0.01)", "horizon-blend": 0.08, range: [1, 10], "space-color": "rgba(10,12,20,0.72)", "star-intensity": 0.08 });
    }
  }, [weather.isRaining, ready]);

  // ── Selected entity flyTo ──
  useEffect(() => {
    if (!mapRef.current || !ready || !selectedEntityId) return;
    const entity = filteredEntities.find((e) => e.id === selectedEntityId);
    if (entity) {
      mapRef.current.flyTo({ center: [entity.lng, entity.lat], zoom: 15, duration: 800 });
    }
  }, [selectedEntityId, ready]);

  // ── Fit bounds on initial load ──
  useEffect(() => {
    if (!mapRef.current || !ready || filteredEntities.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
    filteredEntities.forEach((e) => bounds.extend([e.lng, e.lat]));
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 400 });
  }, [ready]);

  // Recenter callback
  const recenter = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14, duration: 600 });
  }, [userLocation]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />
      {weather.isRaining && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-blue-500/5" />
      )}
    </div>
  );
});

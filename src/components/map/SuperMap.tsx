/**
 * SuperMap — Unified global layered map engine.
 * Combines: discovery, mobility, zones, heatmap, radius, user location.
 * Multi-mode: explore, mobility, food, retail, stay, property, services, wallet, radar.
 */
import { useEffect, useRef, useCallback, memo, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import {
  setupSuperMapLayers,
  safeSetData,
  applyMapMode,
  buildRadiusGeoJSON,
  SOURCES,
  LAYERS,
  VERTICAL_COLORS,
} from "@/lib/map/superMapLayers";
import { useSuperMapStore } from "@/stores/superMapStore";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";
import SuperMapModeBar from "@/components/map/SuperMapModeBar";

interface SuperMapProps {
  className?: string;
  showModeBar?: boolean;
  onSelectEntity?: (entity: GeoEntity) => void;
  onZoneClick?: (lat: number, lng: number) => void;
}

/** Build popup HTML */
function buildPopupHTML(props: Record<string, any>): string {
  const rating = props.rating ? Number(props.rating) : 0;
  const stars = rating > 0 ? `<span style="color:#eab308;font-weight:700">★ ${rating.toFixed(1)}</span>` : "";
  const img = props.imageUrl
    ? `<img src="${props.imageUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:8px 8px 0 0" />`
    : "";
  return `
    <div style="min-width:160px;background:hsl(220,15%,13%);border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
      ${img}
      <div style="padding:8px 10px">
        <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:2px">${props.title || ""}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6)">${stars} ${props.category || ""}</div>
      </div>
    </div>
  `;
}

export default memo(function SuperMap({
  className = "",
  showModeBar = true,
  onSelectEntity,
  onZoneClick,
}: SuperMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [ready, setReady] = useState(false);

  const mode = useSuperMapStore((s) => s.mode);
  const entities = useSuperMapStore((s) => s.entities);
  const mobilityPoints = useSuperMapStore((s) => s.mobilityPoints);
  const zones = useSuperMapStore((s) => s.zones);
  const selectedEntityId = useSuperMapStore((s) => s.selectedEntityId);
  const showHeatmap = useSuperMapStore((s) => s.showHeatmap);
  const showRadius = useSuperMapStore((s) => s.showRadius);
  const radiusKm = useSuperMapStore((s) => s.radiusKm);
  const userLat = useSuperMapStore((s) => s.userLat);
  const userLng = useSuperMapStore((s) => s.userLng);
  const centerLat = useSuperMapStore((s) => s.centerLat);
  const centerLng = useSuperMapStore((s) => s.centerLng);
  const zoom = useSuperMapStore((s) => s.zoom);

  const onSelectRef = useRef(onSelectEntity);
  onSelectRef.current = onSelectEntity;
  const onZoneClickRef = useRef(onZoneClick);
  onZoneClickRef.current = onZoneClick;
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;

  // ── Init Map ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [centerLng, centerLat],
      zoom,
      attributionControl: false,
      maxZoom: 18,
    });

    mapRef.current = map;

    map.on("load", () => {
      setupSuperMapLayers(map);

      // ── Click: cluster expand ──
      map.on("click", LAYERS.PLACES_CLUSTER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLACES_CLUSTER] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource(SOURCES.PLACES) as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId, (err, z) => {
          if (err) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: z ?? 14, duration: 400 });
        });
      });

      // ── Click: select entity ──
      map.on("click", LAYERS.PLACES_POINT, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLACES_POINT] });
        if (!features.length) return;
        const entityId = features[0].properties?.entityId;
        const entity = entitiesRef.current.find((en) => en.id === entityId);
        if (entity) onSelectRef.current?.(entity);
      });

      // ── Hover popup ──
      map.on("mouseenter", LAYERS.PLACES_POINT, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: false, closeOnClick: false, offset: 16, maxWidth: "220px",
        }).setLngLat(coords).setHTML(buildPopupHTML(f.properties!)).addTo(map);
      });
      map.on("mouseleave", LAYERS.PLACES_POINT, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // ── Touch popup ──
      map.on("touchstart", LAYERS.PLACES_POINT, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true, offset: 16, maxWidth: "220px",
        }).setLngLat(coords).setHTML(buildPopupHTML(f.properties!)).addTo(map);
      });

      // ── Mobility click ──
      map.on("click", LAYERS.MOBILITY_POINT, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const label = f.properties?.label || f.properties?.vehicleType || "Driver";
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: true, offset: 12, maxWidth: "180px",
        }).setLngLat(coords).setHTML(
          `<div style="padding:8px;background:hsl(220,15%,13%);border-radius:8px;color:#fff;font-size:12px;font-weight:600">${label}</div>`
        ).addTo(map);
      });

      // ── Zone click (empty area) ──
      map.on("click", (e) => {
        const pinFeatures = map.queryRenderedFeatures(e.point, {
          layers: [LAYERS.PLACES_POINT, LAYERS.PLACES_CLUSTER, LAYERS.MOBILITY_POINT],
        });
        if (pinFeatures.length > 0) return;
        onZoneClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
      });

      map.on("mouseenter", LAYERS.PLACES_CLUSTER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYERS.PLACES_CLUSTER, () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", LAYERS.MOBILITY_POINT, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYERS.MOBILITY_POINT, () => { map.getCanvas().style.cursor = ""; });

      setReady(true);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // ── Mode visibility ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    applyMapMode(mapRef.current, showHeatmap ? "radar" : mode);
  }, [mode, showHeatmap, ready]);

  // ── Places data ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const features: GeoJSON.Feature[] = entities.map((e) => ({
      type: "Feature",
      properties: {
        entityId: e.id,
        title: e.title || e.name,
        type: e.type,
        color: VERTICAL_COLORS[e.type] || VERTICAL_COLORS[e.category ?? ""] || "#6b7280",
        rating: e.rating ?? 0,
        imageUrl: e.imageUrl || e.image_url || null,
        isSelected: e.id === selectedEntityId,
        isSponsored: !!(e as any).isSponsored,
        category: e.category ?? null,
        distanceKm: e.distance ?? null,
      },
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
    }));
    safeSetData(mapRef.current, SOURCES.PLACES, { type: "FeatureCollection", features });
  }, [entities, selectedEntityId, ready]);

  // ── Mobility data ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const features: GeoJSON.Feature[] = mobilityPoints.map((p) => ({
      type: "Feature",
      properties: {
        id: p.id,
        vehicleType: p.vehicleType,
        bearing: p.bearing ?? 0,
        label: p.label || "",
        speed: p.speed ?? 0,
      },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    }));
    safeSetData(mapRef.current, SOURCES.MOBILITY, { type: "FeatureCollection", features });
  }, [mobilityPoints, ready]);

  // ── Zones data ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const features: GeoJSON.Feature[] = zones.map((z) => ({
      type: "Feature",
      properties: { zoneType: z.zoneType, intensity: z.intensity ?? 0.5, label: z.label || "" },
      geometry: { type: "Point", coordinates: [z.lng, z.lat] },
    }));
    safeSetData(mapRef.current, SOURCES.ZONES, { type: "FeatureCollection", features });
  }, [zones, ready]);

  // ── Heatmap data ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (!showHeatmap) {
      safeSetData(mapRef.current, SOURCES.HEATMAP, { type: "FeatureCollection", features: [] });
      return;
    }
    const features: GeoJSON.Feature[] = entities.map((e) => ({
      type: "Feature",
      properties: { intensity: Math.min(1, ((e.rating ?? 3) / 5) * 0.5 + 0.3) },
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
    }));
    safeSetData(mapRef.current, SOURCES.HEATMAP, { type: "FeatureCollection", features });
  }, [entities, showHeatmap, ready]);

  // ── User location ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (userLat && userLng) {
      safeSetData(mapRef.current, SOURCES.USER, {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [userLng, userLat] },
        }],
      });
    } else {
      safeSetData(mapRef.current, SOURCES.USER, { type: "FeatureCollection", features: [] });
    }
  }, [userLat, userLng, ready]);

  // ── Radius ──
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (showRadius && userLat && userLng && radiusKm > 0 && radiusKm <= 50) {
      safeSetData(mapRef.current, SOURCES.RADIUS, buildRadiusGeoJSON(userLat, userLng, radiusKm));
    } else {
      safeSetData(mapRef.current, SOURCES.RADIUS, { type: "FeatureCollection", features: [] });
    }
  }, [showRadius, radiusKm, userLat, userLng, ready]);

  // ── Fit bounds on entity change ──
  useEffect(() => {
    if (!mapRef.current || !ready || entities.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    if (userLat && userLng) bounds.extend([userLng, userLat]);
    entities.forEach((e) => bounds.extend([e.lng, e.lat]));
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 400 });
  }, [entities, ready]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 300 }}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden" />
      {showModeBar && <SuperMapModeBar />}
    </div>
  );
});

/**
 * useMapDataSync — Syncs store data to map layers. Pure data pipeline, no UI.
 */
import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import {
  setupSuperMapLayers,
  safeSetData,
  applyMapMode,
  buildRadiusGeoJSON,
  SOURCES,
  VERTICAL_COLORS,
} from "@/lib/map/superMapLayers";
import { useSuperMapStore } from "@/stores/superMapStore";
import {
  ensureLiveStationLayers,
  buildStationGeoJSON,
  STATION_SOURCE,
} from "@/lib/map/live-stations-engine";
import type { SuperMapMode } from "@/lib/map/superMapLayers";

/**
 * Sets up legacy layers and syncs all store data to Mapbox sources.
 * Call once after map is ready.
 */
export function useMapDataSync(mapRef: React.RefObject<mapboxgl.Map | null>, ready: boolean) {
  const mode = useSuperMapStore(s => s.mode);
  const entities = useSuperMapStore(s => s.entities);
  const mobilityPoints = useSuperMapStore(s => s.mobilityPoints);
  const zones = useSuperMapStore(s => s.zones);
  const selectedEntityId = useSuperMapStore(s => s.selectedEntityId);
  const showHeatmap = useSuperMapStore(s => s.showHeatmap);
  const showRadius = useSuperMapStore(s => s.showRadius);
  const radiusKm = useSuperMapStore(s => s.radiusKm);
  const userLat = useSuperMapStore(s => s.userLat);
  const userLng = useSuperMapStore(s => s.userLng);

  // Setup legacy layers on first ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setupSuperMapLayers(map);
  }, [ready]);

  // Mode visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    applyMapMode(map, showHeatmap ? "radar" : mode);
  }, [mode, showHeatmap, ready]);

  // Places
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const features: GeoJSON.Feature[] = entities.map(e => ({
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
    safeSetData(map, SOURCES.PLACES, { type: "FeatureCollection", features });
  }, [entities, selectedEntityId, ready]);

  // Mobility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const features: GeoJSON.Feature[] = mobilityPoints.map(p => ({
      type: "Feature",
      properties: { id: p.id, vehicleType: p.vehicleType, bearing: p.bearing ?? 0, label: p.label || "", speed: p.speed ?? 0 },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    }));
    safeSetData(map, SOURCES.MOBILITY, { type: "FeatureCollection", features });
  }, [mobilityPoints, ready]);

  // Station layer data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(STATION_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(buildStationGeoJSON(entities));
  }, [entities, ready]);

  // Zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const features: GeoJSON.Feature[] = zones.map(z => ({
      type: "Feature",
      properties: { zoneType: z.zoneType, intensity: z.intensity ?? 0.5, label: z.label || "" },
      geometry: { type: "Point", coordinates: [z.lng, z.lat] },
    }));
    safeSetData(map, SOURCES.ZONES, { type: "FeatureCollection", features });
  }, [zones, ready]);

  // Heatmap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!showHeatmap) {
      safeSetData(map, SOURCES.HEATMAP, { type: "FeatureCollection", features: [] });
      return;
    }
    const features: GeoJSON.Feature[] = entities.map(e => ({
      type: "Feature",
      properties: { intensity: Math.min(1, ((e.rating ?? 3) / 5) * 0.5 + 0.3) },
      geometry: { type: "Point", coordinates: [e.lng, e.lat] },
    }));
    safeSetData(map, SOURCES.HEATMAP, { type: "FeatureCollection", features });
  }, [entities, showHeatmap, ready]);

  // User location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (userLat && userLng) {
      safeSetData(map, SOURCES.USER, {
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [userLng, userLat] } }],
      });
    } else {
      safeSetData(map, SOURCES.USER, { type: "FeatureCollection", features: [] });
    }
  }, [userLat, userLng, ready]);

  // Radius
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (showRadius && userLat && userLng && radiusKm > 0 && radiusKm <= 50) {
      safeSetData(map, SOURCES.RADIUS, buildRadiusGeoJSON(userLat, userLng, radiusKm));
    } else {
      safeSetData(map, SOURCES.RADIUS, { type: "FeatureCollection", features: [] });
    }
  }, [showRadius, radiusKm, userLat, userLng, ready]);
}

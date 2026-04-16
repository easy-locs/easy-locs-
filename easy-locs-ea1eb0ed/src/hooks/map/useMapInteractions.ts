import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { getMapLibreGL } from "@/lib/maplibre/maplibre-loader";
import { SOURCES, LAYERS } from "@/lib/map/superMapLayers";
import {
  STATION_CLUSTER_LAYER,
  STATION_POINT_LAYER,
  STATION_SOURCE,
} from "@/lib/map/live-stations-engine";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

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

interface UseMapInteractionsOpts {
  onSelectEntity?: (entity: GeoEntity) => void;
  onZoneClick?: (lat: number, lng: number) => void;
  entities: GeoEntity[];
}

export function useMapInteractions(
  mapRef: React.RefObject<maplibregl.Map | null>,
  ready: boolean,
  opts: UseMapInteractionsOpts
) {
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(opts.onSelectEntity);
  onSelectRef.current = opts.onSelectEntity;
  const onZoneClickRef = useRef(opts.onZoneClick);
  onZoneClickRef.current = opts.onZoneClick;
  const entitiesRef = useRef(opts.entities);
  entitiesRef.current = opts.entities;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const gl = getMapLibreGL();
    if (!gl) return;

    const onClusterClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLACES_CLUSTER] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const src = map.getSource(SOURCES.PLACES) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.getClusterExpansionZoom(clusterId).then((z) => {
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: z ?? 14, duration: 400 });
      }).catch(() => {});
    };

    const onPointClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLACES_POINT] });
      if (!features.length) return;
      const entityId = features[0].properties?.entityId;
      const entity = entitiesRef.current.find(en => en.id === entityId);
      if (entity) onSelectRef.current?.(entity);
    };

    const onPointEnter = (e: maplibregl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features?.[0];
      if (!f) return;
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      popupRef.current?.remove();
      popupRef.current = new gl.Popup({ closeButton: false, closeOnClick: false, offset: 16, maxWidth: "220px" })
        .setLngLat(coords).setHTML(buildPopupHTML(f.properties ?? {})).addTo(map);
    };
    const onPointLeave = () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    };

    const onPointTouch = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      popupRef.current?.remove();
      popupRef.current = new gl.Popup({ closeButton: true, offset: 16, maxWidth: "220px" })
        .setLngLat(coords).setHTML(buildPopupHTML(f.properties ?? {})).addTo(map);
    };

    const onMobilityClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const label = f.properties?.label || f.properties?.vehicleType || "Driver";
      popupRef.current?.remove();
      popupRef.current = new gl.Popup({ closeButton: true, offset: 12, maxWidth: "180px" })
        .setLngLat(coords).setHTML(`<div style="padding:8px;background:hsl(220,15%,13%);border-radius:8px;color:#fff;font-size:12px;font-weight:600">${label}</div>`)
        .addTo(map);
    };

    const onMapClick = (e: maplibregl.MapMouseEvent) => {
      const pinFeatures = map.queryRenderedFeatures(e.point, {
        layers: [LAYERS.PLACES_POINT, LAYERS.PLACES_CLUSTER, LAYERS.MOBILITY_POINT],
      });
      if (pinFeatures.length > 0) return;
      onZoneClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
    };

    const onStationClusterClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [STATION_CLUSTER_LAYER] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const src = map.getSource(STATION_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.getClusterExpansionZoom(clusterId).then((z) => {
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: z ?? 14, duration: 350 });
      }).catch(() => {});
    };

    const onStationPointClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const entityId = feature.properties?.entityId;
      const entity = entitiesRef.current.find(c => c.id === entityId);
      if (entity) onSelectRef.current?.(entity);
    };

    const cursorPointer = () => { map.getCanvas().style.cursor = "pointer"; };
    const cursorDefault = () => { map.getCanvas().style.cursor = ""; };

    map.on("click", LAYERS.PLACES_CLUSTER, onClusterClick);
    map.on("click", LAYERS.PLACES_POINT, onPointClick);
    map.on("mouseenter", LAYERS.PLACES_POINT, onPointEnter);
    map.on("mouseleave", LAYERS.PLACES_POINT, onPointLeave);
    map.on("touchstart", LAYERS.PLACES_POINT, onPointTouch);
    map.on("click", LAYERS.MOBILITY_POINT, onMobilityClick);
    map.on("click", onMapClick);
    map.on("mouseenter", LAYERS.PLACES_CLUSTER, cursorPointer);
    map.on("mouseleave", LAYERS.PLACES_CLUSTER, cursorDefault);
    map.on("mouseenter", LAYERS.MOBILITY_POINT, cursorPointer);
    map.on("mouseleave", LAYERS.MOBILITY_POINT, cursorDefault);
    if (map.getLayer(STATION_CLUSTER_LAYER)) map.on("click", STATION_CLUSTER_LAYER, onStationClusterClick);
    if (map.getLayer(STATION_POINT_LAYER)) map.on("click", STATION_POINT_LAYER, onStationPointClick);

    return () => {
      popupRef.current?.remove();
      map.off("click", LAYERS.PLACES_CLUSTER, onClusterClick);
      map.off("click", LAYERS.PLACES_POINT, onPointClick);
      map.off("mouseenter", LAYERS.PLACES_POINT, onPointEnter);
      map.off("mouseleave", LAYERS.PLACES_POINT, onPointLeave);
      map.off("touchstart", LAYERS.PLACES_POINT, onPointTouch);
      map.off("click", LAYERS.MOBILITY_POINT, onMobilityClick);
      map.off("click", onMapClick);
      map.off("mouseenter", LAYERS.PLACES_CLUSTER, cursorPointer);
      map.off("mouseleave", LAYERS.PLACES_CLUSTER, cursorDefault);
      map.off("mouseenter", LAYERS.MOBILITY_POINT, cursorPointer);
      map.off("mouseleave", LAYERS.MOBILITY_POINT, cursorDefault);
      map.off("click", STATION_CLUSTER_LAYER, onStationClusterClick);
      map.off("click", STATION_POINT_LAYER, onStationPointClick);
    };
  }, [ready]);
}

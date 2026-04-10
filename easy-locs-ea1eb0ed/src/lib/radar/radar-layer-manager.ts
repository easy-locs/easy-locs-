/**
 * radar-layer-manager — Atomic unit: manage map layer visibility and ordering.
 * Single responsibility: layer toggle, ordering, opacity management.
 */
import type mapboxgl from "mapbox-gl";

export interface LayerConfig {
  id: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { id: "weather_radar", visible: true, opacity: 0.3, zIndex: 10 },
  { id: "weather_stations", visible: true, opacity: 0.9, zIndex: 20 },
  { id: "weather_particles", visible: true, opacity: 0.2, zIndex: 25 },
  { id: "drivers", visible: true, opacity: 1, zIndex: 50 },
  { id: "merchants", visible: true, opacity: 1, zIndex: 40 },
  { id: "orders", visible: true, opacity: 1, zIndex: 60 },
];

export function getLayerConfigs(): LayerConfig[] {
  return [...LAYER_CONFIGS];
}

export function toggleLayer(map: mapboxgl.Map, layerId: string, visible: boolean) {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

export function setLayerOpacity(map: mapboxgl.Map, layerId: string, opacity: number) {
  if (!map.getLayer(layerId)) return;
  const layer = map.getLayer(layerId);
  if (!layer) return;
  const type = layer.type;
  const prop = type === "raster" ? "raster-opacity" : type === "circle" ? "circle-opacity" : "fill-opacity";
  map.setPaintProperty(layerId, prop, opacity);
}

export function applyLayerOrder(map: mapboxgl.Map) {
  const sorted = [...LAYER_CONFIGS].sort((a, b) => a.zIndex - b.zIndex);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].id;
    const curr = sorted[i].id;
    if (map.getLayer(curr) && map.getLayer(prev)) {
      map.moveLayer(curr);
    }
  }
}

/**
 * Map God Engine — pure helper functions.
 */
import mapboxgl from "mapbox-gl";

export function safeRemoveLayer(map: mapboxgl.Map, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
}

export function safeRemoveSource(map: mapboxgl.Map, id: string) {
  if (map.getSource(id)) map.removeSource(id);
}

export function featureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

export function zoomFade(zoom: number, start: number, end: number) {
  if (zoom <= start) return 0;
  if (zoom >= end) return 1;
  return (zoom - start) / (end - start);
}

export function driverColor(status?: string) {
  switch (status) {
    case "busy": return "#ff9500";
    case "delivering": return "#22c55e";
    default: return "#00d4ff";
  }
}

export function routeColor(status?: string) {
  switch (status) {
    case "delivered": return "#22c55e";
    case "picked_up": return "#f59e0b";
    case "accepted": return "#38bdf8";
    default: return "#a855f7";
  }
}

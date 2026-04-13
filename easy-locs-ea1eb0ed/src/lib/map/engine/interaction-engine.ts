/**
 * InteractionEngine — Handles click, hover, select on the map.
 * Emits events via platformBus. Zero business logic.
 */
import type mapboxgl from "mapbox-gl";
import { platformBus } from "@/lib/shared/platform-bus";
import { LayerRegistry } from "./layer-registry";

const MAP_EVENTS = {
  ENTITY_SELECTED: "map:entity_selected",
  ENTITY_HOVERED: "map:entity_hovered",
  MAP_CLICKED: "map:clicked",
  ENTITY_DESELECTED: "map:entity_deselected",
} as const;

let currentHoverId: string | null = null;

export function setupInteractions(
  map: mapboxgl.Map,
  interactiveLayerIds: string[],
  onSelect?: (feature: mapboxgl.MapboxGeoJSONFeature, lngLat: mapboxgl.LngLat) => void
) {
  // Click → select
  map.on("click", (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayerIds.filter(id => map.getLayer(id)) });
    if (features.length > 0) {
      const f = features[0];
      const entityId = (f.properties?.id || f.id || "") as string;
      platformBus.emit(MAP_EVENTS.ENTITY_SELECTED, {
        entityId,
        entityType: f.properties?.type || f.properties?.category || "",
        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
      }, "map");
      onSelect?.(f, e.lngLat);
    } else {
      platformBus.emit(MAP_EVENTS.MAP_CLICKED, {
        lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
      }, "map");
      platformBus.emit(MAP_EVENTS.ENTITY_DESELECTED, {}, "map");
    }
  });

  // Hover → cursor + event
  map.on("mousemove", (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayerIds.filter(id => map.getLayer(id)) });
    if (features.length > 0) {
      map.getCanvas().style.cursor = "pointer";
      const entityId = (features[0].properties?.id || "") as string;
      if (entityId !== currentHoverId) {
        currentHoverId = entityId;
        platformBus.emit(MAP_EVENTS.ENTITY_HOVERED, {
          entityId,
          lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
        }, "map");
      }
    } else {
      map.getCanvas().style.cursor = "";
      if (currentHoverId) {
        currentHoverId = null;
      }
    }
  });

  map.on("mouseleave", () => {
    map.getCanvas().style.cursor = "";
    currentHoverId = null;
  });
}

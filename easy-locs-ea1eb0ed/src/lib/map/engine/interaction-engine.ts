import type maplibregl from "maplibre-gl";
import { platformBus } from "@/lib/shared/platform-bus";

const MAP_EVENTS = {
  ENTITY_SELECTED: "map:entity_selected",
  ENTITY_HOVERED: "map:entity_hovered",
  MAP_CLICKED: "map:clicked",
  ENTITY_DESELECTED: "map:entity_deselected",
} as const;

let currentHoverId: string | null = null;
let clickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;
let mousemoveHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;
let mouseleaveHandler: (() => void) | null = null;
let boundMap: maplibregl.Map | null = null;
let setupDone = false;

export function setupInteractions(
  map: maplibregl.Map,
  interactiveLayerIds: string[],
  onSelect?: (feature: maplibregl.MapGeoJSONFeature, lngLat: maplibregl.LngLat) => void
) {
  if (setupDone) {
    teardownInteractions(boundMap ?? map);
  }

  clickHandler = (e) => {
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
  };

  mousemoveHandler = (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: interactiveLayerIds.filter(id => map.getLayer(id)) });
    if (features.length > 0) {
      try { map.getCanvas().style.cursor = "pointer"; } catch {}
      const entityId = (features[0].properties?.id || "") as string;
      if (entityId !== currentHoverId) {
        currentHoverId = entityId;
        platformBus.emit(MAP_EVENTS.ENTITY_HOVERED, {
          entityId,
          lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
        }, "map");
      }
    } else {
      try { map.getCanvas().style.cursor = ""; } catch {}
      if (currentHoverId) {
        currentHoverId = null;
      }
    }
  };

  mouseleaveHandler = () => {
    try { map.getCanvas().style.cursor = ""; } catch {}
    currentHoverId = null;
  };

  map.on("click", clickHandler);
  map.on("mousemove", mousemoveHandler);
  map.on("mouseleave", mouseleaveHandler);
  boundMap = map;
  setupDone = true;
}

export function teardownInteractions(map: maplibregl.Map) {
  const target = boundMap ?? map;
  if (clickHandler) target.off("click", clickHandler);
  if (mousemoveHandler) target.off("mousemove", mousemoveHandler);
  if (mouseleaveHandler) target.off("mouseleave", mouseleaveHandler);
  clickHandler = null;
  mousemoveHandler = null;
  mouseleaveHandler = null;
  currentHoverId = null;
  boundMap = null;
  setupDone = false;
}

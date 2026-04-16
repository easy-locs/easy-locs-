import type maplibregl from "maplibre-gl";
import type { MapLayerModule } from "../engine/types";

const SOURCE = "ml-rain-radar";
const LAYER = "ml-rain-radar-layer";

export const weatherLayer: MapLayerModule = {
  id: "weather",
  layerIds: [LAYER],

  setup(map) {
  },

  destroy(map) {
    if (map.getLayer(LAYER)) map.removeLayer(LAYER);
    if (map.getSource(SOURCE)) map.removeSource(SOURCE);
  },

  update(map, tileUrl: string | null) {
    if (!tileUrl) {
      if (map.getLayer(LAYER)) map.setLayoutProperty(LAYER, "visibility", "none");
      return;
    }
    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
      });
      if (!map.getLayer(LAYER)) {
        map.addLayer({
          id: LAYER, type: "raster", source: SOURCE,
          paint: { "raster-opacity": 0.45 },
          layout: { visibility: "visible" },
        });
      }
    } else {
      try {
        if (map.getLayer(LAYER)) map.removeLayer(LAYER);
        map.removeSource(SOURCE);
        map.addSource(SOURCE, { type: "raster", tiles: [tileUrl], tileSize: 256 });
        map.addLayer({
          id: LAYER, type: "raster", source: SOURCE,
          paint: { "raster-opacity": 0.45 },
          layout: { visibility: "visible" },
        });
      } catch {}
    }
  },

  setVisible(map, visible) {
    if (map.getLayer(LAYER)) map.setLayoutProperty(LAYER, "visibility", visible ? "visible" : "none");
  },
};

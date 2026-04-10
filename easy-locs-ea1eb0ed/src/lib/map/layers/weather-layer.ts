/**
 * weather-layer — Rain radar raster overlay.
 */
import type mapboxgl from "mapbox-gl";
import type { MapLayerModule } from "../engine/types";

const SOURCE = "ml-rain-radar";
const LAYER = "ml-rain-radar-layer";

export const weatherLayer: MapLayerModule = {
  id: "weather",
  layerIds: [LAYER],

  setup(map) {
    // Source added dynamically on update since it needs tile URLs
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
      map.addLayer({
        id: LAYER, type: "raster", source: SOURCE,
        paint: { "raster-opacity": 0.45 },
        layout: { visibility: "visible" },
      });
    } else {
      // Update tile URL by removing and re-adding
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

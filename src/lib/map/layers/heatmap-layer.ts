/**
 * heatmap-layer — Demand/activity heatmap visualization.
 */
import type mapboxgl from "mapbox-gl";
import type { MapLayerModule } from "../engine/types";

const SOURCE = "ml-heatmap";
const LAYER = "ml-heatmap";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const heatmapLayer: MapLayerModule = {
  id: "heatmap",
  layerIds: [LAYER],

  setup(map) {
    map.addSource(SOURCE, { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: LAYER, type: "heatmap", source: SOURCE,
      paint: {
        "heatmap-weight": ["get", "intensity"],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 2.5, 15, 4],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.1, "hsla(250, 50%, 45%, 0.3)",
          0.3, "hsla(220, 60%, 50%, 0.45)",
          0.5, "hsla(120, 50%, 55%, 0.6)",
          0.7, "hsla(30, 85%, 55%, 0.75)",
          1, "hsla(0, 80%, 55%, 0.85)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 12, 25, 15, 35],
        "heatmap-opacity": 0.7,
      },
      layout: { visibility: "none" },
    });
  },

  update(map, features: GeoJSON.Feature[]) {
    const src = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData({ type: "FeatureCollection", features });
  },

  setVisible(map, visible) {
    if (map.getLayer(LAYER)) map.setLayoutProperty(LAYER, "visibility", visible ? "visible" : "none");
  },
};

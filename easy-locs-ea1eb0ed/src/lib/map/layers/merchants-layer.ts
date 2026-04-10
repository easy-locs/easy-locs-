/**
 * merchants-layer — Renders merchant/place points with clustering.
 */
import type mapboxgl from "mapbox-gl";
import type { MapLayerModule } from "../engine/types";
import { VERTICAL_COLORS } from "../superMapLayers";

const SOURCE = "ml-merchants";
const LAYER_CLUSTER = "ml-merchants-cluster";
const LAYER_COUNT = "ml-merchants-count";
const LAYER_GLOW = "ml-merchants-glow";
const LAYER_POINT = "ml-merchants-point";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const merchantsLayer: MapLayerModule = {
  id: "merchants",
  layerIds: [LAYER_CLUSTER, LAYER_COUNT, LAYER_GLOW, LAYER_POINT],

  setup(map) {
    map.addSource(SOURCE, {
      type: "geojson", data: EMPTY_FC,
      cluster: true, clusterMaxZoom: 14, clusterRadius: 55,
      clusterProperties: {
        sumRating: ["+", ["get", "rating"]],
        hasSponsored: ["any", ["get", "isSponsored"]],
      },
    });

    map.addLayer({
      id: LAYER_CLUSTER, type: "circle", source: SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          "hsla(220, 60%, 50%, 0.85)", 10,
          "hsla(200, 65%, 45%, 0.85)", 30,
          "hsla(45, 80%, 50%, 0.85)", 100,
          "hsla(15, 75%, 50%, 0.85)",
        ],
        "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 30, 36, 100, 44],
        "circle-stroke-width": 3,
        "circle-stroke-color": "rgba(255,255,255,0.25)",
        "circle-blur": 0.15,
      },
    });
    map.addLayer({
      id: LAYER_COUNT, type: "symbol", source: SOURCE,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
        "text-size": 14, "text-allow-overlap": true,
      },
      paint: { "text-color": "#ffffff" },
    });
    map.addLayer({
      id: LAYER_GLOW, type: "circle", source: SOURCE,
      filter: ["all", ["!", ["has", "point_count"]], ["any", ["get", "isSponsored"], ["get", "isSelected"]]],
      paint: {
        "circle-color": ["case", ["get", "isSelected"], "hsla(220, 70%, 55%, 0.4)", "hsla(45, 90%, 55%, 0.3)"],
        "circle-radius": 20, "circle-blur": 0.8,
      },
    });
    map.addLayer({
      id: LAYER_POINT, type: "circle", source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["coalesce", ["get", "color"], "#6b7280"],
        "circle-radius": ["case", ["get", "isSelected"], 13, ["get", "isSponsored"], 11, [">=", ["get", "rating"], 4.3], 10, 8],
        "circle-stroke-width": ["case", ["get", "isSelected"], 3, ["get", "isSponsored"], 2.5, 1.5],
        "circle-stroke-color": ["case", ["get", "isSelected"], "#ffffff", ["get", "isSponsored"], "hsl(45, 90%, 65%)", "rgba(255,255,255,0.4)"],
        "circle-opacity": 0.95,
      },
    });
  },

  update(map, features: GeoJSON.Feature[]) {
    const src = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData({ type: "FeatureCollection", features });
  },

  setVisible(map, visible) {
    const v = visible ? "visible" : "none";
    [LAYER_CLUSTER, LAYER_COUNT, LAYER_GLOW, LAYER_POINT].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    });
  },
};

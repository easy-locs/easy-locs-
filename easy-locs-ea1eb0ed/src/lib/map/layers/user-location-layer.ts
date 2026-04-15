import type mapboxgl from "mapbox-gl";
import type { MapLayerModule } from "../engine/types";

const SOURCE = "ml-user-location";
const LAYER_GLOW = "ml-user-glow";
const LAYER_DOT = "ml-user-dot";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const userLocationLayer: MapLayerModule = {
  id: "user-location",
  layerIds: [LAYER_GLOW, LAYER_DOT],

  setup(map) {
    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: "geojson", data: EMPTY_FC });
    }
    if (!map.getLayer(LAYER_GLOW)) {
      map.addLayer({
        id: LAYER_GLOW, type: "circle", source: SOURCE,
        paint: {
          "circle-radius": 24,
          "circle-color": "hsl(220 70% 55% / 0.2)",
          "circle-blur": 0.6,
        },
      });
    }
    if (!map.getLayer(LAYER_DOT)) {
      map.addLayer({
        id: LAYER_DOT, type: "circle", source: SOURCE,
        paint: {
          "circle-radius": 7,
          "circle-color": "hsl(220, 80%, 60%)",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  },

  destroy(map) {
    [LAYER_GLOW, LAYER_DOT].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(SOURCE)) map.removeSource(SOURCE);
  },

  update(map, data: { lat: number; lng: number } | null) {
    const src = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    if (!data) { src.setData(EMPTY_FC); return; }
    src.setData({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [data.lng, data.lat] },
        properties: {},
      }],
    });
  },

  setVisible(map, visible) {
    const v = visible ? "visible" : "none";
    [LAYER_GLOW, LAYER_DOT].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    });
  },
};

/**
 * user-location-layer — Renders the user's GPS position with glow + dot.
 */
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
    map.addSource(SOURCE, { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: LAYER_GLOW, type: "circle", source: SOURCE,
      paint: {
        "circle-radius": 24,
        "circle-color": "hsla(220, 80%, 60%, 0.2)",
        "circle-blur": 0.6,
      },
    });
    map.addLayer({
      id: LAYER_DOT, type: "circle", source: SOURCE,
      paint: {
        "circle-radius": 7,
        "circle-color": "hsl(220, 80%, 60%)",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });
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

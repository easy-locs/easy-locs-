/**
 * radius-layer — Search/delivery radius circle.
 */
import type mapboxgl from "mapbox-gl";
import type { MapLayerModule } from "../engine/types";
import { buildRadiusGeoJSON } from "../superMapLayers";

const SOURCE = "ml-radius";
const LAYER_FILL = "ml-radius-fill";
const LAYER_BORDER = "ml-radius-border";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const radiusLayer: MapLayerModule = {
  id: "radius",
  layerIds: [LAYER_FILL, LAYER_BORDER],

  setup(map) {
    map.addSource(SOURCE, { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: LAYER_FILL, type: "fill", source: SOURCE,
      paint: { "fill-color": "hsl(220, 70%, 55%)", "fill-opacity": 0.07 },
    });
    map.addLayer({
      id: LAYER_BORDER, type: "line", source: SOURCE,
      paint: {
        "line-color": "hsl(220, 70%, 60%)", "line-width": 1.5,
        "line-opacity": 0.35, "line-dasharray": [4, 3],
      },
    });
  },

  update(map, data: { lat: number; lng: number; km: number } | null) {
    const src = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    if (!data) { src.setData(EMPTY_FC); return; }
    src.setData(buildRadiusGeoJSON(data.lat, data.lng, data.km));
  },

  setVisible(map, visible) {
    const v = visible ? "visible" : "none";
    [LAYER_FILL, LAYER_BORDER].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    });
  },
};

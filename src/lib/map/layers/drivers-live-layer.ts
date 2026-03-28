/**
 * drivers-live-layer — Renders live driver/courier positions.
 */
import type mapboxgl from "mapbox-gl";
import type { MapLayerModule } from "../engine/types";

const SOURCE = "ml-drivers";
const LAYER_POINT = "ml-drivers-point";
const LAYER_LABEL = "ml-drivers-label";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const driversLiveLayer: MapLayerModule = {
  id: "drivers-live",
  layerIds: [LAYER_POINT, LAYER_LABEL],

  setup(map) {
    map.addSource(SOURCE, { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: LAYER_POINT, type: "circle", source: SOURCE,
      paint: {
        "circle-color": [
          "match", ["get", "vehicleType"],
          "taxi", "#eab308", "courier", "#06b6d4", "bike", "#22c55e", "#eab308",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 8, 17, 12],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.6)",
        "circle-opacity": 0.9,
      },
    });
    map.addLayer({
      id: LAYER_LABEL, type: "symbol", source: SOURCE,
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 10, "text-offset": [0, 1.5], "text-allow-overlap": false,
      },
      paint: {
        "text-color": "rgba(255,255,255,0.8)",
        "text-halo-color": "rgba(0,0,0,0.6)", "text-halo-width": 1,
      },
      minzoom: 14,
    });
  },

  update(map, drivers: Array<{ id: string; lat: number; lng: number; vehicleType: string; label?: string; bearing?: number }>) {
    const src = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: drivers.map(d => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
        properties: { id: d.id, vehicleType: d.vehicleType, label: d.label || "", bearing: d.bearing || 0 },
      })),
    });
  },

  setVisible(map, visible) {
    const v = visible ? "visible" : "none";
    [LAYER_POINT, LAYER_LABEL].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    });
  },
};

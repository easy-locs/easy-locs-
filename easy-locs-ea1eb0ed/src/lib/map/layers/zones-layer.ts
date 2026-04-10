/**
 * zones-layer — Delivery/demand/event zones visualization.
 */
import type mapboxgl from "mapbox-gl";
import type { MapLayerModule } from "../engine/types";

const SOURCE = "ml-zones";
const LAYER_FILL = "ml-zones-fill";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const zonesLayer: MapLayerModule = {
  id: "zones",
  layerIds: [LAYER_FILL],

  setup(map) {
    map.addSource(SOURCE, { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: LAYER_FILL, type: "circle", source: SOURCE,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 20, 16, 80],
        "circle-color": [
          "match", ["get", "zoneType"],
          "demand", "hsla(142, 71%, 45%, 0.15)",
          "surge", "hsla(0, 80%, 55%, 0.15)",
          "event", "hsla(45, 90%, 55%, 0.12)",
          "hsla(220, 60%, 50%, 0.1)",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "rgba(255,255,255,0.1)",
      },
    });
  },

  update(map, zones: Array<{ id: string; lat: number; lng: number; zoneType: string; intensity?: number; label?: string }>) {
    const src = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: zones.map(z => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [z.lng, z.lat] },
        properties: { id: z.id, zoneType: z.zoneType, intensity: z.intensity || 0.5, label: z.label || "" },
      })),
    });
  },

  setVisible(map, visible) {
    if (map.getLayer(LAYER_FILL)) map.setLayoutProperty(LAYER_FILL, "visibility", visible ? "visible" : "none");
  },
};

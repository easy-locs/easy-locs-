/**
 * DiscoveryHeatmapLayer — Mapbox heatmap with real intensity from density + rating + reviews.
 */
import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface Props {
  map: maplibregl.Map | null;
  points: HeatmapPoint[];
  visible: boolean;
}

const SOURCE_ID = "discovery-heatmap-source";
const LAYER_ID = "discovery-heatmap-layer";

export default function DiscoveryHeatmapLayer({ map, points, visible }: Props) {
  useEffect(() => {
    if (!map) return;

    const setup = () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

      if (!visible || points.length === 0) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: points.map(p => ({
          type: "Feature",
          properties: { intensity: p.intensity },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      };

      map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

      map.addLayer({
        id: LAYER_ID,
        type: "heatmap",
        source: SOURCE_ID,
        paint: {
          "heatmap-weight": ["get", "intensity"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1.5, 10, 3, 13, 5, 16, 6],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.05, "hsla(270, 85%, 55%, 0.45)",
            0.15, "hsla(240, 90%, 60%, 0.55)",
            0.25, "hsla(200, 95%, 55%, 0.65)",
            0.35, "hsla(170, 90%, 50%, 0.72)",
            0.45, "hsla(120, 85%, 50%, 0.78)",
            0.55, "hsla(80, 90%, 50%, 0.82)",
            0.65, "hsla(55, 95%, 52%, 0.86)",
            0.75, "hsla(35, 95%, 55%, 0.9)",
            0.85, "hsla(15, 95%, 52%, 0.93)",
            1, "hsla(0, 100%, 50%, 0.97)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 10, 30, 13, 45, 16, 55],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.92, 13, 0.82, 16, 0.7],
        },
      });
    };

    if (map.isStyleLoaded()) {
      setup();
    } else {
      map.on("style.load", setup);
    }

    return () => {
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map, points, visible]);

  return null;
}

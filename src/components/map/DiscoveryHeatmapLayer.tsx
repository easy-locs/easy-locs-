/**
 * DiscoveryHeatmapLayer — Mapbox heatmap with real intensity from density + rating + reviews.
 */
import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface Props {
  map: mapboxgl.Map | null;
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
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 2.5, 15, 4],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.1, "hsla(250, 50%, 45%, 0.3)",
            0.2, "hsla(220, 60%, 50%, 0.45)",
            0.35, "hsla(180, 55%, 50%, 0.55)",
            0.5, "hsla(120, 50%, 55%, 0.6)",
            0.65, "hsla(60, 70%, 55%, 0.7)",
            0.8, "hsla(30, 85%, 55%, 0.8)",
            1, "hsla(0, 80%, 55%, 0.9)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 12, 25, 15, 35],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 15, 0.65],
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

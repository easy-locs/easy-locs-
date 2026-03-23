/**
 * DiscoveryHeatmapLayer — Canvas-based heatmap overlay for discovery map.
 * Uses leaflet.heat-style rendering via Mapbox heatmap layer.
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

    // Wait for map style to load
    const setup = () => {
      // Clean up existing
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
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,255,0)",
            0.2, "rgb(0,255,128)",
            0.4, "rgb(128,255,0)",
            0.6, "rgb(255,255,0)",
            0.8, "rgb(255,128,0)",
            1, "rgb(255,0,0)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 15, 25],
          "heatmap-opacity": 0.7,
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

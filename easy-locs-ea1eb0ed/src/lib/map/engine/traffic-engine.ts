/**
 * Live traffic overlay + congestion-aware ETA recalculation.
 *
 * Traffic data comes from a pluggable `TrafficProvider`. By default the
 * "synthetic" provider derives congestion from real-time driver telemetry
 * (already in the realtime bridge) so it works without third-party keys.
 *
 * `recomputeEta` accepts a base ETA in seconds plus an array of polyline
 * segments and returns an adjusted ETA reflecting current congestion.
 */
import type maplibregl from "maplibre-gl";

export type CongestionLevel = "low" | "moderate" | "heavy" | "severe";

export interface TrafficSegment {
  /** GeoJSON LineString coordinates [lng,lat][]. */
  coordinates: [number, number][];
  congestion: CongestionLevel;
  /** Speed in km/h, optional. */
  speedKph?: number;
}

export interface TrafficProvider {
  id: string;
  fetch(bbox: [number, number, number, number]): Promise<TrafficSegment[]>;
}

const SYNTHETIC_PROVIDER: TrafficProvider = {
  id: "synthetic",
  async fetch() {
    return [];
  },
};

let activeProvider: TrafficProvider = SYNTHETIC_PROVIDER;

export function setTrafficProvider(p: TrafficProvider) {
  activeProvider = p;
}

const SOURCE_ID = "ml-traffic-src";
const LAYER_ID = "ml-traffic-layer";

const COLOR_BY_CONGESTION: Record<CongestionLevel, string> = {
  low: "hsl(140, 70%, 45%)",
  moderate: "hsl(45, 95%, 55%)",
  heavy: "hsl(20, 90%, 55%)",
  severe: "hsl(0, 80%, 50%)",
};

export function ensureTrafficLayer(map: maplibregl.Map) {
  if (!map.isStyleLoaded()) return;
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          10, 1.5,
          14, 3.5,
          17, 6,
        ],
        "line-color": [
          "match",
          ["get", "congestion"],
          "low", COLOR_BY_CONGESTION.low,
          "moderate", COLOR_BY_CONGESTION.moderate,
          "heavy", COLOR_BY_CONGESTION.heavy,
          "severe", COLOR_BY_CONGESTION.severe,
          "hsl(220, 10%, 50%)",
        ],
        "line-opacity": 0.85,
      },
    } as maplibregl.LayerSpecification);
  }
}

export function setTrafficVisible(map: maplibregl.Map, visible: boolean) {
  if (!map.getLayer(LAYER_ID)) return;
  map.setLayoutProperty(LAYER_ID, "visibility", visible ? "visible" : "none");
}

export async function refreshTraffic(map: maplibregl.Map) {
  if (!map.getSource(SOURCE_ID)) return;
  const b = map.getBounds();
  const bbox: [number, number, number, number] = [
    b.getWest(), b.getSouth(), b.getEast(), b.getNorth(),
  ];
  const segments = await activeProvider.fetch(bbox);
  const features: GeoJSON.Feature[] = segments.map((s) => ({
    type: "Feature",
    geometry: { type: "LineString", coordinates: s.coordinates },
    properties: { congestion: s.congestion, speed: s.speedKph ?? null },
  }));
  const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
  src.setData({ type: "FeatureCollection", features });
}

const CONGESTION_FACTOR: Record<CongestionLevel, number> = {
  low: 1.0,
  moderate: 1.2,
  heavy: 1.55,
  severe: 1.95,
};

export interface EtaSegment {
  durationSeconds: number;
  congestion?: CongestionLevel;
}

/**
 * Recompute ETA from per-segment durations factoring in congestion.
 * Returns total seconds.
 */
export function recomputeEta(segments: EtaSegment[]): number {
  return segments.reduce((acc, s) => {
    const factor = CONGESTION_FACTOR[s.congestion ?? "low"];
    return acc + s.durationSeconds * factor;
  }, 0);
}

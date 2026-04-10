/**
 * superMapLayers.ts — Layer definitions & source management for the SuperMap engine.
 * Handles: places, mobility, zones, user, weather layers with proper z-ordering.
 */
import type mapboxgl from "mapbox-gl";

/* ═══════ SOURCE IDs ═══════ */
export const SOURCES = {
  PLACES: "supermap-places",
  MOBILITY: "supermap-mobility",
  ZONES: "supermap-zones",
  USER: "supermap-user",
  HEATMAP: "supermap-heatmap",
  RADIUS: "supermap-radius",
} as const;

/* ═══════ LAYER IDs (z-order top→bottom) ═══════ */
export const LAYERS = {
  // Background
  RADIUS_FILL: "sm-radius-fill",
  RADIUS_BORDER: "sm-radius-border",
  // Zones
  ZONE_FILL: "sm-zone-fill",
  // Heatmap
  HEATMAP: "sm-heatmap",
  // Points
  PLACES_CLUSTER: "sm-places-cluster",
  PLACES_CLUSTER_COUNT: "sm-places-cluster-count",
  PLACES_GLOW: "sm-places-glow",
  PLACES_POINT: "sm-places-point",
  // Mobility
  MOBILITY_POINT: "sm-mobility-point",
  MOBILITY_LABEL: "sm-mobility-label",
  // User
  USER_GLOW: "sm-user-glow",
  USER_DOT: "sm-user-dot",
} as const;

/* ═══════ VERTICAL COLORS ═══════ */
export const VERTICAL_COLORS: Record<string, string> = {
  restaurant: "#f97316", food: "#f97316",
  shop: "#3b82f6", shops: "#3b82f6", retail: "#3b82f6",
  grocery: "#22c55e",
  property: "#8b5cf6",
  driver: "#eab308", taxi: "#eab308",
  courier: "#06b6d4", delivery: "#06b6d4",
  hotel: "#ec4899", stay: "#ec4899",
  service: "#64748b", services: "#64748b",
  healthcare: "#ef4444",
  mobility: "#eab308",
  experiences: "#ec4899",
};

export const VERTICAL_ICONS: Record<string, string> = {
  restaurant: "🍽️", food: "🍽️",
  shop: "🛍️", shops: "🛍️", retail: "🛍️",
  grocery: "🛒",
  property: "🏠",
  driver: "🚕", taxi: "🚕",
  courier: "📦", delivery: "📦",
  hotel: "🏨", stay: "🏨",
  service: "🔧", services: "🔧",
  healthcare: "🏥",
  mobility: "🚗",
  experiences: "🎯",
};

/* ═══════ MAP MODES ═══════ */
export type SuperMapMode =
  | "explore"
  | "mobility"
  | "food"
  | "retail"
  | "stay"
  | "property"
  | "services"
  | "wallet"
  | "radar";

/* ═══════ SETUP ALL SOURCES + LAYERS ═══════ */
export function setupSuperMapLayers(map: mapboxgl.Map) {
  // ── Sources ──
  map.addSource(SOURCES.RADIUS, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addSource(SOURCES.ZONES, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addSource(SOURCES.HEATMAP, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addSource(SOURCES.PLACES, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 55,
    clusterProperties: {
      sumRating: ["+", ["get", "rating"]],
      hasSponsored: ["any", ["get", "isSponsored"]],
    },
  });

  map.addSource(SOURCES.MOBILITY, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addSource(SOURCES.USER, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // ═══ LAYERS (ordered bottom → top) ═══

  // 1. Radius circle
  map.addLayer({
    id: LAYERS.RADIUS_FILL,
    type: "fill",
    source: SOURCES.RADIUS,
    paint: {
      "fill-color": "hsl(220, 70%, 55%)",
      "fill-opacity": 0.07,
    },
  });
  map.addLayer({
    id: LAYERS.RADIUS_BORDER,
    type: "line",
    source: SOURCES.RADIUS,
    paint: {
      "line-color": "hsl(220, 70%, 60%)",
      "line-width": 1.5,
      "line-opacity": 0.35,
      "line-dasharray": [4, 3],
    },
  });

  // 2. Zones
  map.addLayer({
    id: LAYERS.ZONE_FILL,
    type: "circle",
    source: SOURCES.ZONES,
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        10, 20, 16, 80,
      ],
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

  // 3. Heatmap
  map.addLayer({
    id: LAYERS.HEATMAP,
    type: "heatmap",
    source: SOURCES.HEATMAP,
    paint: {
      "heatmap-weight": ["get", "intensity"],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 2.5, 15, 4],
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(0,0,0,0)",
        0.1, "hsla(250, 50%, 45%, 0.3)",
        0.3, "hsla(220, 60%, 50%, 0.45)",
        0.5, "hsla(120, 50%, 55%, 0.6)",
        0.7, "hsla(30, 85%, 55%, 0.75)",
        1, "hsla(0, 80%, 55%, 0.85)",
      ],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 12, 25, 15, 35],
      "heatmap-opacity": 0.7,
    },
    layout: { visibility: "none" },
  });

  // 4. Place clusters
  map.addLayer({
    id: LAYERS.PLACES_CLUSTER,
    type: "circle",
    source: SOURCES.PLACES,
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
    id: LAYERS.PLACES_CLUSTER_COUNT,
    type: "symbol",
    source: SOURCES.PLACES,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
      "text-size": 14,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffffff" },
  });

  // 5. Unclustered glow
  map.addLayer({
    id: LAYERS.PLACES_GLOW,
    type: "circle",
    source: SOURCES.PLACES,
    filter: ["all",
      ["!", ["has", "point_count"]],
      ["any", ["get", "isSponsored"], ["get", "isSelected"]],
    ],
    paint: {
      "circle-color": [
        "case",
        ["get", "isSelected"], "hsla(220, 70%, 55%, 0.4)",
        "hsla(45, 90%, 55%, 0.3)",
      ],
      "circle-radius": 20,
      "circle-blur": 0.8,
    },
  });

  // 6. Unclustered points
  map.addLayer({
    id: LAYERS.PLACES_POINT,
    type: "circle",
    source: SOURCES.PLACES,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["coalesce", ["get", "color"], "#6b7280"],
      "circle-radius": [
        "case",
        ["get", "isSelected"], 13,
        ["get", "isSponsored"], 11,
        [">=", ["get", "rating"], 4.3], 10,
        8,
      ],
      "circle-stroke-width": [
        "case",
        ["get", "isSelected"], 3,
        ["get", "isSponsored"], 2.5,
        1.5,
      ],
      "circle-stroke-color": [
        "case",
        ["get", "isSelected"], "#ffffff",
        ["get", "isSponsored"], "hsl(45, 90%, 65%)",
        "rgba(255,255,255,0.4)",
      ],
      "circle-opacity": 0.95,
    },
  });

  // 7. Mobility (drivers/couriers)
  map.addLayer({
    id: LAYERS.MOBILITY_POINT,
    type: "circle",
    source: SOURCES.MOBILITY,
    paint: {
      "circle-color": [
        "match", ["get", "vehicleType"],
        "taxi", "#eab308",
        "courier", "#06b6d4",
        "bike", "#22c55e",
        "#eab308",
      ],
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        10, 4, 14, 8, 17, 12,
      ],
      "circle-stroke-width": 2,
      "circle-stroke-color": "rgba(255,255,255,0.6)",
      "circle-opacity": 0.9,
    },
  });
  map.addLayer({
    id: LAYERS.MOBILITY_LABEL,
    type: "symbol",
    source: SOURCES.MOBILITY,
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
      "text-size": 10,
      "text-offset": [0, 1.5],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "rgba(255,255,255,0.8)",
      "text-halo-color": "rgba(0,0,0,0.6)",
      "text-halo-width": 1,
    },
    minzoom: 14,
  });

  // 8. User location
  map.addLayer({
    id: LAYERS.USER_GLOW,
    type: "circle",
    source: SOURCES.USER,
    paint: {
      "circle-radius": 22,
      "circle-color": "hsla(220, 80%, 60%, 0.2)",
      "circle-blur": 0.6,
    },
  });
  map.addLayer({
    id: LAYERS.USER_DOT,
    type: "circle",
    source: SOURCES.USER,
    paint: {
      "circle-radius": 7,
      "circle-color": "hsl(220, 80%, 60%)",
      "circle-stroke-width": 3,
      "circle-stroke-color": "#ffffff",
    },
  });
}

/* ═══════ SAFE SOURCE UPDATE ═══════ */
export function safeSetData(map: mapboxgl.Map, sourceId: string, data: GeoJSON.FeatureCollection) {
  try {
    const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(data);
  } catch {}
}

/* ═══════ TOGGLE LAYER VISIBILITY ═══════ */
export function setLayerVisibility(map: mapboxgl.Map, layerId: string, visible: boolean) {
  try {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  } catch {}
}

/* ═══════ RADIUS CIRCLE GENERATOR ═══════ */
export function buildRadiusGeoJSON(lat: number, lng: number, km: number): GeoJSON.FeatureCollection {
  const steps = 72;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);
    coords.push([
      lng + (dx / (111.32 * Math.cos(lat * Math.PI / 180))),
      lat + (dy / 111.32),
    ]);
  }
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [coords] },
    }],
  };
}

/* ═══════ MODE → VISIBLE LAYERS ═══════ */
export function getVisibleLayersForMode(mode: SuperMapMode): Set<string> {
  const base = new Set([
    LAYERS.RADIUS_FILL, LAYERS.RADIUS_BORDER,
    LAYERS.USER_GLOW, LAYERS.USER_DOT,
  ]);

  switch (mode) {
    case "explore":
      return new Set([...base,
        LAYERS.PLACES_CLUSTER, LAYERS.PLACES_CLUSTER_COUNT,
        LAYERS.PLACES_GLOW, LAYERS.PLACES_POINT,
        LAYERS.ZONE_FILL,
      ]);
    case "mobility":
      return new Set([...base,
        LAYERS.MOBILITY_POINT, LAYERS.MOBILITY_LABEL,
        LAYERS.ZONE_FILL,
      ]);
    case "food":
    case "retail":
    case "stay":
    case "property":
    case "services":
    case "wallet":
      return new Set([...base,
        LAYERS.PLACES_CLUSTER, LAYERS.PLACES_CLUSTER_COUNT,
        LAYERS.PLACES_GLOW, LAYERS.PLACES_POINT,
      ]);
    case "radar":
      return new Set([...base,
        LAYERS.HEATMAP,
        LAYERS.ZONE_FILL,
        LAYERS.PLACES_POINT, LAYERS.PLACES_GLOW,
      ]);
    default:
      return base;
  }
}

/* ═══════ APPLY MODE VISIBILITY ═══════ */
export function applyMapMode(map: mapboxgl.Map, mode: SuperMapMode) {
  const visible = getVisibleLayersForMode(mode);
  const allLayers = Object.values(LAYERS);
  for (const layerId of allLayers) {
    setLayerVisibility(map, layerId, visible.has(layerId));
  }
}

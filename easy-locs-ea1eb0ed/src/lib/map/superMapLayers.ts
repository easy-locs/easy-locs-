import type maplibregl from "maplibre-gl";

export const SOURCES = {
  PLACES: "supermap-places",
  MOBILITY: "supermap-mobility",
  ZONES: "supermap-zones",
  USER: "supermap-user",
  HEATMAP: "supermap-heatmap",
  RADIUS: "supermap-radius",
} as const;

export const LAYERS = {
  RADIUS_FILL: "sm-radius-fill",
  RADIUS_BORDER: "sm-radius-border",
  ZONE_FILL: "sm-zone-fill",
  HEATMAP: "sm-heatmap",
  PLACES_CLUSTER: "sm-places-cluster",
  PLACES_CLUSTER_COUNT: "sm-places-cluster-count",
  PLACES_GLOW: "sm-places-glow",
  PLACES_POINT: "sm-places-point",
  MOBILITY_POINT: "sm-mobility-point",
  MOBILITY_LABEL: "sm-mobility-label",
  USER_GLOW: "sm-user-glow",
  USER_DOT: "sm-user-dot",
} as const;

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

export function setupSuperMapLayers(map: maplibregl.Map) {
  try {
    if (!map.getSource(SOURCES.RADIUS)) {
      map.addSource(SOURCES.RADIUS, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getSource(SOURCES.ZONES)) {
      map.addSource(SOURCES.ZONES, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getSource(SOURCES.HEATMAP)) {
      map.addSource(SOURCES.HEATMAP, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getSource(SOURCES.PLACES)) {
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
    }

    if (!map.getSource(SOURCES.MOBILITY)) {
      map.addSource(SOURCES.MOBILITY, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getSource(SOURCES.USER)) {
      map.addSource(SOURCES.USER, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer(LAYERS.RADIUS_FILL)) {
      map.addLayer({
        id: LAYERS.RADIUS_FILL,
        type: "fill",
        source: SOURCES.RADIUS,
        paint: {
          "fill-color": "hsl(220, 70%, 55%)",
          "fill-opacity": 0.07,
        },
      });
    }
    if (!map.getLayer(LAYERS.RADIUS_BORDER)) {
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
    }

    if (!map.getLayer(LAYERS.ZONE_FILL)) {
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
            "hsl(220 65% 55% / 0.1)",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.1)",
        },
      });
    }

    if (!map.getLayer(LAYERS.HEATMAP)) {
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
            0.3, "hsl(220 65% 55% / 0.45)",
            0.5, "hsla(120, 50%, 55%, 0.6)",
            0.7, "hsla(30, 85%, 55%, 0.75)",
            1, "hsla(0, 80%, 55%, 0.85)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 12, 25, 15, 35],
          "heatmap-opacity": 0.7,
        },
        layout: { visibility: "none" },
      });
    }

    if (!map.getLayer(LAYERS.PLACES_CLUSTER)) {
      map.addLayer({
        id: LAYERS.PLACES_CLUSTER,
        type: "circle",
        source: SOURCES.PLACES,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "hsl(220 65% 55% / 0.85)", 10,
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
    }
    if (!map.getLayer(LAYERS.PLACES_CLUSTER_COUNT)) {
      map.addLayer({
        id: LAYERS.PLACES_CLUSTER_COUNT,
        type: "symbol",
        source: SOURCES.PLACES,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 14,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });
    }

    if (!map.getLayer(LAYERS.PLACES_GLOW)) {
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
            ["get", "isSelected"], "hsl(220 70% 55% / 0.4)",
            "hsla(45, 90%, 55%, 0.3)",
          ],
          "circle-radius": 20,
          "circle-blur": 0.8,
        },
      });
    }

    if (!map.getLayer(LAYERS.PLACES_POINT)) {
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
    }

    if (!map.getLayer(LAYERS.MOBILITY_POINT)) {
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
    }
    if (!map.getLayer(LAYERS.MOBILITY_LABEL)) {
      map.addLayer({
        id: LAYERS.MOBILITY_LABEL,
        type: "symbol",
        source: SOURCES.MOBILITY,
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
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
    }

    if (!map.getLayer(LAYERS.USER_GLOW)) {
      map.addLayer({
        id: LAYERS.USER_GLOW,
        type: "circle",
        source: SOURCES.USER,
        paint: {
          "circle-radius": 22,
          "circle-color": "hsl(220 70% 55% / 0.2)",
          "circle-blur": 0.6,
        },
      });
    }
    if (!map.getLayer(LAYERS.USER_DOT)) {
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
  } catch (err) {
    console.warn("[SuperMapLayers] setup error:", err);
  }
}

export function safeSetData(map: maplibregl.Map, sourceId: string, data: GeoJSON.FeatureCollection) {
  try {
    const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
  } catch {}
}

export function setLayerVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
  try {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  } catch {}
}

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

export function applyMapMode(map: maplibregl.Map, mode: SuperMapMode) {
  const visible = getVisibleLayersForMode(mode);
  const allLayers = Object.values(LAYERS);
  for (const layerId of allLayers) {
    setLayerVisibility(map, layerId, visible.has(layerId));
  }
}

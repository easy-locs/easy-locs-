import type mapboxgl from "mapbox-gl";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

export const STATION_SOURCE = "live-stations-source";
export const STATION_CLUSTER_LAYER = "live-stations-cluster";
export const STATION_CLUSTER_COUNT_LAYER = "live-stations-cluster-count";
export const STATION_PULSE_LAYER = "live-stations-pulse";
export const STATION_POINT_LAYER = "live-stations-point";
export const STATION_LABEL_LAYER = "live-stations-label";

type StationStatus = "live" | "busy" | "inactive";

function getStationStatus(entity: GeoEntity): StationStatus {
  if ((entity.rating ?? 0) >= 4.5) return "live";
  if ((entity.rating ?? 0) >= 3.8) return "busy";
  return "inactive";
}

function getStationPriority(entity: GeoEntity) {
  const key = `${entity.type} ${entity.category ?? ""} ${entity.subtype ?? ""}`.toLowerCase();
  if (key.includes("mall") || key.includes("hotel") || key.includes("station") || key.includes("hub")) return 3;
  if (key.includes("shop") || key.includes("retail") || key.includes("property")) return 2;
  return 1;
}

export function buildStationGeoJSON(entities: GeoEntity[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: entities
      .filter((entity) => Number.isFinite(entity.lat) && Number.isFinite(entity.lng))
      .slice(0, 180)
      .map((entity) => ({
        type: "Feature",
        properties: {
          entityId: entity.id,
          name: entity.title || entity.name,
          status: getStationStatus(entity),
          priority: getStationPriority(entity),
          type: entity.category || entity.type,
        },
        geometry: {
          type: "Point",
          coordinates: [entity.lng, entity.lat],
        },
      })),
  };
}

export function ensureLiveStationLayers(map: mapboxgl.Map, beforeLayerId?: string) {
  if (!map.getSource(STATION_SOURCE)) {
    map.addSource(STATION_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterRadius: 52,
      clusterMaxZoom: 14,
    });
  }

  if (!map.getLayer(STATION_CLUSTER_LAYER)) {
    map.addLayer({
      id: STATION_CLUSTER_LAYER,
      type: "circle",
      source: STATION_SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 30, 28],
        "circle-color": "hsl(220 35% 16% / 0.92)",
        "circle-stroke-width": 2,
        "circle-stroke-color": "hsl(0 0% 100% / 0.75)",
      },
    }, beforeLayerId);
  }

  if (!map.getLayer(STATION_CLUSTER_COUNT_LAYER)) {
    map.addLayer({
      id: STATION_CLUSTER_COUNT_LAYER,
      type: "symbol",
      source: STATION_SOURCE,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: {
        "text-color": "hsl(0 0% 100%)",
      },
    });
  }

  if (!map.getLayer(STATION_PULSE_LAYER)) {
    map.addLayer({
      id: STATION_PULSE_LAYER,
      type: "circle",
      source: STATION_SOURCE,
      filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "status"], "inactive"]],
      minzoom: 10,
      paint: {
        "circle-radius": 14,
        "circle-color": [
          "match",
          ["get", "status"],
          "live", "hsl(152 60% 42% / 0.18)",
          "busy", "hsl(38 92% 50% / 0.18)",
          "hsl(210 80% 52% / 0.1)",
        ],
        "circle-blur": 0.8,
      },
    });
  }

  if (!map.getLayer(STATION_POINT_LAYER)) {
    map.addLayer({
      id: STATION_POINT_LAYER,
      type: "circle",
      source: STATION_SOURCE,
      filter: ["!", ["has", "point_count"]],
      minzoom: 11,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 6, 14, 8, 17, 10],
        "circle-color": [
          "match",
          ["get", "status"],
          "live", "hsl(152 60% 42%)",
          "busy", "hsl(38 92% 50%)",
          "hsl(210 80% 52%)",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "hsl(0 0% 100%)",
      },
    });
  }

  if (!map.getLayer(STATION_LABEL_LAYER)) {
    map.addLayer({
      id: STATION_LABEL_LAYER,
      type: "symbol",
      source: STATION_SOURCE,
      filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "priority"], 2]],
      minzoom: 13,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 10,
        "text-offset": [0, 1.35],
        "text-anchor": "top",
        "text-max-width": 10,
      },
      paint: {
        "text-color": "hsl(0 0% 100%)",
        "text-halo-color": "hsl(220 35% 10% / 0.82)",
        "text-halo-width": 1,
      },
    });
  }
}

export function animateStationPulse(map: mapboxgl.Map, frame: number) {
  if (!map.getLayer(STATION_PULSE_LAYER)) return;
  const radius = 11 + ((Math.sin(frame / 10) + 1) / 2) * 8;
  const opacity = 0.35 + ((Math.sin(frame / 14) + 1) / 2) * 0.35;
  map.setPaintProperty(STATION_PULSE_LAYER, "circle-radius", radius);
  map.setPaintProperty(STATION_PULSE_LAYER, "circle-opacity", opacity);
}
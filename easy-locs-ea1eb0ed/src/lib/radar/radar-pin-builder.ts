/**
 * radar-pin-builder — Atomic unit: build GeoJSON features from radar entities.
 * Single responsibility: entity → GeoJSON feature conversion.
 */
import type { RadarEntity } from "./radar-source-adapter";

export interface RadarFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    entityType: string;
    label?: string;
    status?: string;
    [key: string]: any;
  };
}

export function buildPinFeature(entity: RadarEntity): RadarFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [entity.lng, entity.lat] },
    properties: {
      id: entity.id,
      entityType: entity.type,
      label: entity.label,
      status: entity.status,
      ...entity.metadata,
    },
  };
}

export function buildFeatureCollection(entities: RadarEntity[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: entities.map(buildPinFeature),
  };
}

export function buildClusteredSource(entities: RadarEntity[]) {
  return {
    type: "geojson" as const,
    data: buildFeatureCollection(entities),
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  };
}

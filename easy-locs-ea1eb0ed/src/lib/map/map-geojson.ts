/**
 * map-geojson.ts — GeoJSON conversion helpers for canonical MapEntity, MapRoute, MapZone.
 */
import type { MapEntity, MapRoute, MapZone } from "@/types/map";

export function entitiesToFeatureCollection(entities: MapEntity[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: entities
      .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng))
      .map((e) => ({
        type: "Feature" as const,
        properties: {
          id: e.id,
          kind: e.kind,
          title: e.title,
          subtitle: e.subtitle ?? "",
          status: e.status ?? "",
          image: e.image ?? "",
          rating: e.rating ?? null,
          price: e.price ?? null,
          currency: e.currency ?? "",
          distanceKm: e.distanceKm ?? null,
          etaMin: e.etaMin ?? null,
          isOpen: e.isOpen ?? null,
          isSponsored: e.isSponsored ?? false,
          source: e.source ?? "",
        },
        geometry: {
          type: "Point" as const,
          coordinates: [e.lng, e.lat],
        },
      })),
  };
}

export function routesToFeatureCollection(routes: MapRoute[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: routes
      .filter((r) => r.points?.length >= 2)
      .map((r) => ({
        type: "Feature" as const,
        properties: {
          id: r.id,
          kind: r.kind,
          color: r.color ?? "#3b82f6",
          label: r.label ?? "",
        },
        geometry: {
          type: "LineString" as const,
          coordinates: r.points.map((p) => [p.lng, p.lat]),
        },
      })),
  };
}

export function zonesToFeatureCollection(zones: MapZone[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: zones
      .filter((z) => z.coordinates?.length > 0 && z.coordinates[0]?.length >= 3)
      .map((z) => ({
        type: "Feature" as const,
        properties: {
          id: z.id,
          title: z.title,
          kind: z.kind,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: z.coordinates,
        },
      })),
  };
}

export function circleGeoJSON(
  center: { lat: number; lng: number },
  radiusKm: number,
  steps = 64,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng) || radiusKm <= 0 || radiusKm > 100) {
    return { type: "FeatureCollection", features: [] };
  }

  const coords: [number, number][] = [];
  const latRad = (center.lat * Math.PI) / 180;
  const lngRad = (center.lng * Math.PI) / 180;
  const angularDistance = radiusKm / 6371;

  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat2),
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "radius", radiusKm },
        geometry: { type: "Polygon", coordinates: [coords] },
      },
    ],
  };
}

/**
 * Route Preview Engine — Computes route preview after place selection.
 * Uses Mapbox directions when available, falls back to haversine estimate.
 * Emits route.preview.updated via eventBus.
 */
import { eventBus } from "@/lib/core/event-bus";
import { haversineKm, estimateETA, formatDistance, formatETA } from "@/lib/geo/distance";
import { getDirections } from "@/lib/location/geocode";

export interface RoutePreview {
  placeId: string;
  zoneKey?: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  distanceKm: number;
  distanceFormatted: string;
  etaMinutes: number;
  etaFormatted: string;
  trafficLevel: "low" | "moderate" | "heavy" | "unknown";
  routeGeometry?: any;
  updatedAt: string;
}

/** Infer traffic level from actual vs ideal ETA ratio */
function inferTrafficLevel(actualSeconds: number, distanceMeters: number): RoutePreview["trafficLevel"] {
  if (!actualSeconds || !distanceMeters) return "unknown";
  const idealSeconds = (distanceMeters / 1000) / 40 * 3600; // 40 km/h baseline
  const ratio = actualSeconds / idealSeconds;
  if (ratio < 1.2) return "low";
  if (ratio < 1.6) return "moderate";
  return "heavy";
}

export async function computeRoutePreview(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  placeId: string,
  zoneKey?: string,
): Promise<RoutePreview> {
  const straightDist = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);

  // Try Mapbox directions for real route
  let distanceKm = straightDist;
  let etaMinutes = estimateETA(straightDist);
  let trafficLevel: RoutePreview["trafficLevel"] = "unknown";
  let routeGeometry: any = undefined;

  try {
    const directions = await getDirections(origin, destination);
    if (directions) {
      distanceKm = directions.distance_m / 1000;
      etaMinutes = Math.round(directions.duration_s / 60);
      trafficLevel = inferTrafficLevel(directions.duration_s, directions.distance_m);
      routeGeometry = directions.geometry;
    }
  } catch {
    // Fallback to haversine estimate — already set above
  }

  const preview: RoutePreview = {
    placeId,
    zoneKey,
    origin,
    destination,
    distanceKm,
    distanceFormatted: formatDistance(distanceKm),
    etaMinutes,
    etaFormatted: formatETA(etaMinutes),
    trafficLevel,
    routeGeometry,
    updatedAt: new Date().toISOString(),
  };

  eventBus.emit("route.preview.updated", preview);
  return preview;
}

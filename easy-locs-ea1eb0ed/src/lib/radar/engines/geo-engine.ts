/**
 * RadarGeoEngine — Provides geo calculations for radar context.
 * Distance, bearing, radius checks, clustering proximity.
 * Stateless utility. Injectable.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

const DEG = Math.PI / 180;
const R_EARTH = 6371000; // meters

export class RadarGeoEngine {
  /** Haversine distance in meters */
  distanceMeters(a: GeoPoint, b: GeoPoint): number {
    const dLat = (b.lat - a.lat) * DEG;
    const dLng = (b.lng - a.lng) * DEG;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) *
      Math.sin(dLng / 2) ** 2;
    return R_EARTH * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  /** Bearing from a to b in degrees (0=N, 90=E) */
  bearing(a: GeoPoint, b: GeoPoint): number {
    const dLng = (b.lng - a.lng) * DEG;
    const y = Math.sin(dLng) * Math.cos(b.lat * DEG);
    const x = Math.cos(a.lat * DEG) * Math.sin(b.lat * DEG) -
      Math.sin(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.cos(dLng);
    return ((Math.atan2(y, x) / DEG) + 360) % 360;
  }

  /** Check if point is within radius (meters) of center */
  isWithinRadius(center: GeoPoint, point: GeoPoint, radiusMeters: number): boolean {
    return this.distanceMeters(center, point) <= radiusMeters;
  }

  /** Filter points within radius */
  filterByRadius<T extends GeoPoint>(center: GeoPoint, items: T[], radiusMeters: number): T[] {
    return items.filter(item => this.isWithinRadius(center, item, radiusMeters));
  }

  /** Sort by distance from center */
  sortByDistance<T extends GeoPoint>(center: GeoPoint, items: T[]): T[] {
    return [...items].sort((a, b) =>
      this.distanceMeters(center, a) - this.distanceMeters(center, b)
    );
  }

  /** Compute bounding box for a center + radius */
  boundingBox(center: GeoPoint, radiusMeters: number): { north: number; south: number; east: number; west: number } {
    const latDelta = (radiusMeters / R_EARTH) / DEG;
    const lngDelta = latDelta / Math.cos(center.lat * DEG);
    return {
      north: center.lat + latDelta,
      south: center.lat - latDelta,
      east: center.lng + lngDelta,
      west: center.lng - lngDelta,
    };
  }
}

/**
 * zoneResolver — Resolve lat/lng → zone context.
 * Works with hierarchical zones (country → region → city → zone).
 * Global-ready: no hardcoded city logic.
 */
import { loadZones, findZoneInRadius, findNearestZone, type Zone } from "@/lib/zones/zoneEngine";
import { haversine } from "@/lib/geo/haversine";

export interface ZoneContext {
  zone: Zone | null;
  zoneId: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  currency: string | null;
  timezone: string | null;
  language: string | null;
  isLaunched: boolean;
  distanceToCenter: number | null; // meters
}

const EMPTY_CONTEXT: ZoneContext = {
  zone: null, zoneId: null, country: null, city: null,
  region: null, currency: null, timezone: null, language: null,
  isLaunched: false, distanceToCenter: null,
};

/** Resolve a lat/lng to the best matching zone context */
export async function resolveZoneContext(lat: number, lng: number): Promise<ZoneContext> {
  const zones = await loadZones();
  if (!zones.length) return EMPTY_CONTEXT;

  // Prefer in-radius match, fallback nearest
  const zone = findZoneInRadius(lat, lng, zones) || findNearestZone(lat, lng, zones);
  if (!zone) return EMPTY_CONTEXT;

  const distKm = haversine(lat, lng, zone.center_lat, zone.center_lng);

  return {
    zone,
    zoneId: zone.id,
    country: zone.country_code,
    city: zone.city,
    region: zone.region_name,
    currency: zone.currency,
    timezone: zone.timezone,
    language: zone.default_language,
    isLaunched: zone.is_launched,
    distanceToCenter: Math.round(distKm * 1000),
  };
}

/** Get all sibling zones in the same city */
export async function getSiblingZones(zoneId: string): Promise<Zone[]> {
  const zones = await loadZones();
  const current = zones.find((z) => z.id === zoneId);
  if (!current) return [];
  return zones.filter((z) => z.city === current.city && z.country_code === current.country_code);
}

/** Get nearby zones within distance */
export async function getNearbyZones(lat: number, lng: number, maxKm = 20): Promise<Zone[]> {
  const zones = await loadZones();
  return zones
    .map((z) => ({ ...z, _dist: haversine(lat, lng, z.center_lat, z.center_lng) }))
    .filter((z) => z._dist <= maxKm)
    .sort((a, b) => a._dist - b._dist);
}

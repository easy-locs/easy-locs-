/**
 * zoneEngine — Assign businesses to zones and check launch status.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface Zone {
  id: string;
  name: string;
  city: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  is_active: boolean;
  is_launched: boolean;
}

/** Haversine distance in meters */
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

let _cachedZones: Zone[] | null = null;

export async function loadZones(): Promise<Zone[]> {
  if (_cachedZones) return _cachedZones;
  const { data } = await db.from("zones").select("*").eq("is_active", true);
  _cachedZones = (data || []) as Zone[];
  setTimeout(() => { _cachedZones = null; }, 60000); // invalidate after 1min
  return _cachedZones;
}

export function findNearestZone(lat: number, lng: number, zones: Zone[]): Zone | null {
  let best: Zone | null = null;
  let bestDist = Infinity;
  for (const z of zones) {
    const d = distanceM(lat, lng, z.center_lat, z.center_lng);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  return best;
}

export async function assignZone(storefrontId: string, lat: number, lng: number): Promise<string | null> {
  const zones = await loadZones();
  const nearest = findNearestZone(lat, lng, zones);
  if (!nearest) return null;
  await db.from("storefront_pages").update({ zone_id: nearest.id }).eq("id", storefrontId);
  return nearest.id;
}

export async function isZoneLaunched(zoneId: string): Promise<boolean> {
  const zones = await loadZones();
  const zone = zones.find((z) => z.id === zoneId);
  return zone?.is_launched ?? false;
}

export async function isGlobalLaunched(): Promise<boolean> {
  const { data } = await db.from("platform_settings").select("value").eq("key", "global_launch").single();
  return data?.value?.enabled === true;
}

export async function isBusinessFullyActive(business: {
  is_claimed?: boolean;
  zone_id?: string | null;
}): Promise<boolean> {
  if (!business.is_claimed) return false;
  const globalOn = await isGlobalLaunched();
  if (globalOn) return true;
  if (business.zone_id) return isZoneLaunched(business.zone_id);
  return false;
}

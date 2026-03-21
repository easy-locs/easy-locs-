/**
 * autoAssignZone — Automatically assigns zone_id to any entity with coordinates.
 * Used in onboarding, business creation, listing creation, address updates.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveZoneContext } from "@/lib/geo/zoneResolver";

const db = supabase as any;

/** Generic zone assignment for any table with zone_id + lat/lng */
export async function assignZoneToEntity(
  table: string,
  entityId: string,
  lat: number,
  lng: number,
  latCol = "latitude",
  lngCol = "longitude"
): Promise<string | null> {
  const ctx = await resolveZoneContext(lat, lng);
  if (!ctx.zoneId) return null;

  await db.from(table).update({
    zone_id: ctx.zoneId,
    [latCol]: lat,
    [lngCol]: lng,
    updated_at: new Date().toISOString(),
  }).eq("id", entityId);

  return ctx.zoneId;
}

/** Assign zone to a storefront_pages row */
export async function assignZoneToStorefront(shopId: string, lat: number, lng: number): Promise<string | null> {
  return assignZoneToEntity("storefront_pages", shopId, lat, lng);
}

/** Assign zone to a marketplace_services row */
export async function assignZoneToService(serviceId: string, lat: number, lng: number): Promise<string | null> {
  return assignZoneToEntity("marketplace_services", serviceId, lat, lng);
}

/** Assign zone to a public_listings row */
export async function assignZoneToListing(listingId: string, lat: number, lng: number): Promise<string | null> {
  return assignZoneToEntity("public_listings", listingId, lat, lng);
}

/** Assign zone to a property_listings_v2 row */
export async function assignZoneToPropertyListing(listingId: string, lat: number, lng: number): Promise<string | null> {
  return assignZoneToEntity("property_listings_v2", listingId, lat, lng);
}

/** Auto-resolve and assign zone from existing coordinates on a storefront */
export async function autoAssignZoneFromStorefront(shopId: string): Promise<string | null> {
  const { data: shop } = await db
    .from("storefront_pages")
    .select("latitude, longitude")
    .eq("id", shopId)
    .single();

  if (!shop?.latitude || !shop?.longitude) return null;
  return assignZoneToStorefront(shopId, shop.latitude, shop.longitude);
}

/** Batch resolve zones for all storefronts missing zone_id */
export async function batchAssignMissingZones(table = "storefront_pages", limit = 50): Promise<number> {
  const { data: rows } = await db
    .from(table)
    .select("id, latitude, longitude")
    .is("zone_id", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(limit);

  if (!rows?.length) return 0;

  let assigned = 0;
  for (const row of rows) {
    const zoneId = await assignZoneToEntity(table, row.id, row.latitude, row.longitude);
    if (zoneId) assigned++;
  }
  return assigned;
}

/**
 * autoAssignZone — Automatically assigns a zone_id to a business entity.
 * Uses the global zone resolver to map lat/lng → zone.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveZoneContext } from "@/lib/geo/zoneResolver";

const db = supabase as any;

/** Assign zone to a storefront_pages row */
export async function assignZoneToStorefront(shopId: string, lat: number, lng: number): Promise<string | null> {
  const ctx = await resolveZoneContext(lat, lng);
  if (!ctx.zoneId) return null;

  await db
    .from("storefront_pages")
    .update({
      zone_id: ctx.zoneId,
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);

  return ctx.zoneId;
}

/** Assign zone to a marketplace_services row */
export async function assignZoneToService(serviceId: string, lat: number, lng: number): Promise<string | null> {
  const ctx = await resolveZoneContext(lat, lng);
  if (!ctx.zoneId) return null;

  await db
    .from("marketplace_services")
    .update({
      zone_id: ctx.zoneId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  return ctx.zoneId;
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

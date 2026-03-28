/**
 * Live Mobility Context — Data fetchers (single responsibility).
 */
import { supabase } from "@/integrations/supabase/client";
import type { GeoLiveContext, MerchantRuntime, MerchantDeliveryZone, RiderRuntimeState } from "./types";

export async function fetchGeoLiveContext(zoneKey: string): Promise<GeoLiveContext | null> {
  const { data } = await (supabase as any)
    .from("geo_live_context")
    .select("*")
    .eq("zone_key", zoneKey)
    .maybeSingle();
  return data;
}

export async function fetchMerchantRuntime(merchantId: string): Promise<MerchantRuntime | null> {
  const { data } = await (supabase as any)
    .from("merchant_delivery_runtime")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  return data;
}

export async function fetchMerchantDeliveryZones(merchantId: string): Promise<MerchantDeliveryZone[]> {
  const { data } = await (supabase as any)
    .from("merchant_delivery_zones")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("is_active", true);
  return data || [];
}

export async function fetchNearbyRiders(lat: number, lng: number, radiusKm: number = 5): Promise<RiderRuntimeState[]> {
  const { data } = await (supabase as any)
    .from("rider_runtime_state")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true);
  if (!data?.length) return [];
  // Client-side radius filter (temporary until PostGIS)
  const { haversineKm } = await import("@/lib/geo/distance");
  return data.filter((r: any) =>
    r.current_lat && r.current_lng && haversineKm(lat, lng, r.current_lat, r.current_lng) <= radiusKm
  );
}

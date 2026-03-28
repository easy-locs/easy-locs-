/**
 * radar-source-adapter — Atomic unit: fetch live entities for radar display.
 * Single responsibility: DB reads for radar pins (drivers, merchants, orders).
 */
import { supabase } from "@/integrations/supabase/client";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";

export interface RadarEntity {
  id: string;
  type: "driver" | "merchant" | "order" | "rider";
  lat: number;
  lng: number;
  label?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export async function fetchRadarDrivers(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): Promise<RadarEntity[]> {
  return withHealthTracking("radar", "fetchDrivers", async () => {
    const { data } = await (supabase as any)
      .from("rider_presence")
      .select("rider_user_id, latitude, longitude, status, vehicle_type")
      .gte("latitude", bounds.minLat).lte("latitude", bounds.maxLat)
      .gte("longitude", bounds.minLng).lte("longitude", bounds.maxLng)
      .eq("is_online", true)
      .limit(100);

    return (data ?? []).map((d: any) => ({
      id: d.rider_user_id,
      type: "driver" as const,
      lat: d.latitude,
      lng: d.longitude,
      status: d.status,
      metadata: { vehicleType: d.vehicle_type },
    }));
  });
}

export async function fetchRadarMerchants(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): Promise<RadarEntity[]> {
  return withHealthTracking("radar", "fetchMerchants", async () => {
    const { data } = await (supabase as any)
      .from("storefront_pages")
      .select("id, shop_name, latitude, longitude, verified")
      .gte("latitude", bounds.minLat).lte("latitude", bounds.maxLat)
      .gte("longitude", bounds.minLng).lte("longitude", bounds.maxLng)
      .eq("published", true)
      .limit(200);

    return (data ?? []).map((m: any) => ({
      id: m.id,
      type: "merchant" as const,
      lat: m.latitude,
      lng: m.longitude,
      label: m.shop_name,
      metadata: { verified: m.verified },
    }));
  });
}

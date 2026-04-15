/**
 * radar-source-adapter — Atomic unit: fetch live entities for radar display.
 * Single responsibility: DB reads for radar pins (drivers, merchants, orders).
 */
import { db } from "@/services/db";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";
import { C2C_CATEGORY_TREE } from "@/lib/c2c/c2c-category-tree";

export interface RadarEntity {
  id: string;
  type: "driver" | "merchant" | "order" | "rider" | "c2c_listing";
  lat: number;
  lng: number;
  label?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export async function fetchRadarDrivers(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): Promise<RadarEntity[]> {
  return withHealthTracking("radar", "fetchDrivers", async () => {
    const { data } = await db
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
    const { data } = await db
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

export async function fetchRadarC2CListings(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): Promise<RadarEntity[]> {
  return withHealthTracking("radar", "fetchC2CListings", async () => {
    const C2C_CATEGORIES = [
      ...C2C_CATEGORY_TREE.map(c => c.key),
      "c2c_vehicles", "c2c_electronics", "c2c_fashion",
      "c2c_home", "c2c_sports", "c2c_misc", "classified_c2c",
    ];
    const { data } = await db
      .from("marketplace_services")
      .select("id, title, lat, lng, price, currency, category, photo_urls, condition")
      .eq("active", true)
      .eq("status", "published")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gte("lat", bounds.minLat).lte("lat", bounds.maxLat)
      .gte("lng", bounds.minLng).lte("lng", bounds.maxLng)
      .in("category", C2C_CATEGORIES)
      .limit(150);

    return (data ?? []).map((l: { id: string; title: string; lat: number; lng: number; price: number; currency: string; category: string; photo_urls: string[] | null; condition: string }) => ({
      id: l.id,
      type: "c2c_listing" as const,
      lat: l.lat,
      lng: l.lng,
      label: l.title,
      metadata: {
        price: l.price,
        currency: l.currency,
        category: l.category,
        photoUrl: l.photo_urls?.[0],
        condition: l.condition,
      },
    }));
  });
}

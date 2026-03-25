import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo/distance";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

export interface MapMerchantPin {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  lat: number | null;
  lng: number | null;
  rating?: number | null;
  isOpen?: boolean;
  area?: string | null;
  city?: string | null;
  coverImage?: string | null;
  slug?: string | null;
}

export { haversineKm as haversineDistanceKm } from "@/lib/geo/distance";

export async function getMapMerchantPins(params?: {
  category?: "food" | "grocery" | "services" | null;
  city?: string | null;
  limit?: number;
}) {
  const limit = params?.limit ?? 300;

  // Single source: storefront_pages — governed
  let sfQuery = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, latitude, longitude, rating, city, address, region, banner_url, logo_url")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(limit);
  sfQuery = governStorefrontQuery(sfQuery, "map");
  if (params?.category) sfQuery = sfQuery.eq("vertical", params.category);
  if (params?.city) sfQuery = sfQuery.eq("city", params.city);

  const sfRes = await sfQuery;
  const pins: MapMerchantPin[] = [];

  for (const row of sfRes.data ?? []) {
    pins.push({
      id: row.id,
      name: row.name,
      category: row.vertical || row.category || "food",
      subcategory: row.subcategory ?? null,
      lat: row.latitude ? Number(row.latitude) : null,
      lng: row.longitude ? Number(row.longitude) : null,
      rating: row.rating ? Number(row.rating) : null,
      isOpen: true,
      area: row.region || row.address || null,
      city: row.city ?? null,
      coverImage: row.banner_url || row.logo_url || null,
      slug: row.slug ?? null,
    });
  }

  return pins;
}

export async function getNearbyMerchants(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: "food" | "grocery" | "services" | null;
  limit?: number;
}) {
  const radiusKm = params.radiusKm ?? 8;
  const limit = params.limit ?? 24;
  const pins = await getMapMerchantPins({ category: params.category ?? null, limit: 400 });

  return pins
    .filter((pin) => pin.lat != null && pin.lng != null)
    .map((pin) => ({
      ...pin,
      distanceKm: haversineKm(params.lat, params.lng, Number(pin.lat), Number(pin.lng)),
    }))
    .filter((pin) => pin.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

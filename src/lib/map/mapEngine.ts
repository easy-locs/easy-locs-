import { supabase } from "@/integrations/supabase/client";

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
}

import { haversineKm } from "@/lib/geo/distance";
export { haversineKm as haversineDistanceKm } from "@/lib/geo/distance";

export async function getMapMerchantPins(params?: {
  category?: "food" | "grocery" | "services" | null;
  city?: string | null;
  limit?: number;
}) {
  const limit = params?.limit ?? 300;

  let query = supabase.from("marketplace_listings").select("*").limit(limit);
  if (params?.category) query = query.eq("category", params.category);
  if (params?.city) query = query.eq("city", params.city);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as any[]).map(
    (row): MapMerchantPin => ({
      id: row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory ?? null,
      lat: row.latitude ?? row.lat ?? null,
      lng: row.longitude ?? row.lng ?? null,
      rating: row.rating ?? null,
      isOpen: !!row.is_open,
      area: row.area ?? null,
      city: row.city ?? null,
      coverImage: row.cover_image ?? null,
    })
  );
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

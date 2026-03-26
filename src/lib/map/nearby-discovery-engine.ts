/**
 * Nearby Discovery Engine — Fetches nearby merchants/services around a selected place.
 * Uses storefront_pages as canonical merchant truth.
 * Emits place.nearby.updated via eventBus.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import { haversineKm } from "@/lib/geo/distance";

export interface NearbyResult {
  placeId: string;
  zoneKey?: string;
  radiusKm: number;
  totalCount: number;
  categories: Record<string, number>;
  merchants: NearbyMerchant[];
  updatedAt: string;
}

export interface NearbyMerchant {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  category: string;
  rating: number | null;
  distanceKm: number;
  lat: number;
  lng: number;
  logo_url: string | null;
}

/** Adaptive radius: dense areas use smaller radius */
function adaptiveRadius(initialKm: number, count: number): number {
  if (count >= 20) return initialKm; // enough results
  if (count >= 10) return initialKm * 1.5;
  return initialKm * 3; // sparse area, expand
}

export async function fetchNearbyMerchants(
  place: { lat: number; lng: number; id: string; zone_key?: string },
  radiusKm = 1,
): Promise<NearbyResult> {
  // Bounding box filter (fast DB-level filter)
  const degPerKm = 1 / 111; // rough conversion
  const latDelta = radiusKm * degPerKm;
  const lngDelta = radiusKm * degPerKm / Math.cos(place.lat * Math.PI / 180);

  const { data } = await (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, rating, latitude, longitude, logo_url")
    .gte("latitude", place.lat - latDelta)
    .lte("latitude", place.lat + latDelta)
    .gte("longitude", place.lng - lngDelta)
    .lte("longitude", place.lng + lngDelta)
    .eq("status", "published")
    .limit(50);

  const rows = (data ?? []) as any[];

  // Precise haversine filter + sort
  const nearby: NearbyMerchant[] = rows
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      vertical: r.vertical ?? "general",
      category: r.category ?? "general",
      rating: r.rating,
      distanceKm: haversineKm(place.lat, place.lng, Number(r.latitude), Number(r.longitude)),
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      logo_url: r.logo_url,
    }))
    .filter((m) => m.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // If too few results, try expanded radius
  if (nearby.length < 5 && radiusKm < 3) {
    return fetchNearbyMerchants(place, adaptiveRadius(radiusKm, nearby.length));
  }

  // Aggregate categories
  const categories: Record<string, number> = {};
  for (const m of nearby) {
    categories[m.vertical] = (categories[m.vertical] ?? 0) + 1;
  }

  const result: NearbyResult = {
    placeId: place.id,
    zoneKey: place.zone_key,
    radiusKm,
    totalCount: nearby.length,
    categories,
    merchants: nearby.slice(0, 20),
    updatedAt: new Date().toISOString(),
  };

  eventBus.emit("place.nearby.updated", result);
  return result;
}

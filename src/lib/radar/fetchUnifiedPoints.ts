/**
 * fetchUnifiedPoints — Pulls from BOTH storefront_pages AND seed_merchants,
 * normalizes into RadarPoint[], computes distances from user location.
 * Single source of truth for all radar/discovery data.
 */
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/radar/geo";
import type { RadarPoint, RadarCategory, UserGeoPoint } from "@/lib/radar/types";

/** Approximate coordinates for Dubai areas (seed_merchants have no lat/lng) */
const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  "dubai marina": { lat: 25.0805, lng: 55.1403 },
  "jvc": { lat: 25.0657, lng: 55.2094 },
  "jlt": { lat: 25.0772, lng: 55.1536 },
  "al barsha": { lat: 25.1134, lng: 55.2007 },
  "downtown": { lat: 25.1972, lng: 55.2744 },
  "business bay": { lat: 25.1850, lng: 55.2650 },
  "deira": { lat: 25.2697, lng: 55.3095 },
  "bur dubai": { lat: 25.2510, lng: 55.2967 },
  "jumeirah": { lat: 25.2100, lng: 55.2500 },
  "silicon oasis": { lat: 25.1275, lng: 55.3775 },
  "motor city": { lat: 25.0505, lng: 55.2393 },
  "sports city": { lat: 25.0420, lng: 55.2237 },
};

function areaToCoords(area: string): { lat: number; lng: number } {
  const key = area?.toLowerCase().trim();
  // Add small random jitter so pins don't stack
  const base = AREA_COORDS[key] ?? { lat: 25.2048, lng: 55.2708 }; // Dubai center fallback
  const jitter = () => (Math.random() - 0.5) * 0.008; // ~400m spread
  return { lat: base.lat + jitter(), lng: base.lng + jitter() };
}

function mapVerticalToCategory(vertical: string): RadarCategory {
  const map: Record<string, RadarCategory> = {
    food: "food", restaurant: "food", cafe: "food",
    retail: "shops", fashion: "shops",
    grocery: "grocery", supermarket: "grocery", mini_mart: "grocery",
    organic_store: "grocery",
    property: "property", realestate: "property",
    services: "services", beauty: "services", health: "services",
    cleaning: "services", handyman: "services", laundry: "services",
    salon: "services",
  };
  return map[vertical?.toLowerCase()] || "shops";
}

/** Maps seed_merchant subcategory into RadarCategory */
function seedSubcategoryToCategory(sub: string): RadarCategory {
  const serviceTypes = ["cleaning", "handyman", "laundry", "salon"];
  const groceryTypes = ["mini_mart", "supermarket", "organic_store"];
  if (serviceTypes.includes(sub)) return "services";
  if (groceryTypes.includes(sub)) return "grocery";
  return "food";
}

export interface FetchUnifiedPointsOpts {
  searchQuery?: string;
  userLocation?: UserGeoPoint | null;
}

export async function fetchUnifiedPoints(opts?: FetchUnifiedPointsOpts): Promise<RadarPoint[]> {
  const { searchQuery, userLocation } = opts ?? {};

  // Fetch both sources in parallel
  let storefrontQuery = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, address, logo_url, banner_url, latitude, longitude, rating, reviews_count, ranking_score")
    .eq("launch_status", "launched")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("ranking_score", { ascending: false })
    .limit(200);

  let seedQuery = (supabase as any)
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, area, rating, review_count, cover_image, logo_image, visibility_score, is_open, is_featured, promo_active, delivery_time_min, delivery_time_max")
    .eq("is_active", true)
    .order("visibility_score", { ascending: false })
    .limit(200);

  if (searchQuery?.trim()) {
    storefrontQuery = storefrontQuery.ilike("name", `%${searchQuery.trim()}%`);
    seedQuery = seedQuery.ilike("name", `%${searchQuery.trim()}%`);
  }

  const [storefrontRes, seedRes] = await Promise.all([storefrontQuery, seedQuery]);

  const points: RadarPoint[] = [];
  const seenIds = new Set<string>();

  // 1) Normalize storefront_pages
  for (const s of storefrontRes.data ?? []) {
    seenIds.add(s.id);
    const cat = mapVerticalToCategory(s.vertical || s.category);
    points.push({
      id: s.id,
      title: s.name || "Business",
      subtitle: s.address || s.category || undefined,
      imageUrl: s.banner_url || s.logo_url,
      category: cat,
      subcategory: s.subcategory || s.category || undefined,
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      rating: s.rating ? Number(s.rating) : undefined,
      reviewsCount: s.reviews_count ?? undefined,
      isSponsored: (s.ranking_score ?? 0) > 80,
      distanceKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, Number(s.latitude), Number(s.longitude))
        : undefined,
    });
  }

  // 2) Normalize seed_merchants (with geocoded area coordinates)
  for (const m of seedRes.data ?? []) {
    if (seenIds.has(m.id)) continue; // dedupe
    const coords = areaToCoords(m.area);
    const cat = seedSubcategoryToCategory(m.subcategory);
    points.push({
      id: m.id,
      title: m.name,
      subtitle: `${m.area}, ${m.city}`,
      imageUrl: m.cover_image || m.logo_image,
      category: cat,
      subcategory: m.subcategory,
      lat: coords.lat,
      lng: coords.lng,
      rating: m.rating ? Number(m.rating) : undefined,
      reviewsCount: m.review_count ?? undefined,
      isSponsored: m.is_featured || m.promo_active || (m.visibility_score ?? 0) > 80,
      distanceKm: userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
        : undefined,
    });
  }

  return points;
}

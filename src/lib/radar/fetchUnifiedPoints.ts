/**
 * fetchUnifiedPoints — Pulls from BOTH storefront_pages AND seed_merchants,
 * normalizes into RadarPoint[], computes distances, applies time-based ranking.
 * Uses CANONICAL TAXONOMY for all category/subcategory normalization.
 */
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo/distance";
import { getTimeContext, timeRelevanceScore } from "@/lib/discovery/timeContext";
import {
  verticalToRadarCategory,
  normalizeVertical,
  normalizeSubcategory,
  getClusterForSubcategory,
  getParentVertical,
} from "@/lib/taxonomy/world-class-taxonomy";
import type { RadarPoint, RadarCategory, UserGeoPoint } from "@/lib/radar/types";

/** Approximate coordinates for Dubai areas (seed_merchants have no lat/lng) */
const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  "dubai marina": { lat: 25.0805, lng: 55.1403 },
  "jvc": { lat: 25.0657, lng: 55.2094 },
  "jlt": { lat: 25.0772, lng: 55.1536 },
  "al barsha": { lat: 25.1134, lng: 55.2007 },
  "downtown": { lat: 25.1972, lng: 55.2744 },
  "downtown dubai": { lat: 25.1972, lng: 55.2744 },
  "business bay": { lat: 25.1850, lng: 55.2650 },
  "deira": { lat: 25.2697, lng: 55.3095 },
  "bur dubai": { lat: 25.2510, lng: 55.2967 },
  "jumeirah": { lat: 25.2100, lng: 55.2500 },
  "silicon oasis": { lat: 25.1275, lng: 55.3775 },
  "dubai silicon oasis": { lat: 25.1275, lng: 55.3775 },
  "motor city": { lat: 25.0505, lng: 55.2393 },
  "sports city": { lat: 25.0420, lng: 55.2237 },
  "al quoz": { lat: 25.1590, lng: 55.2350 },
  "international city": { lat: 25.1650, lng: 55.4050 },
  "mirdif": { lat: 25.2230, lng: 55.4100 },
  "karama": { lat: 25.2450, lng: 55.3010 },
  "satwa": { lat: 25.2320, lng: 55.2720 },
  "tecom": { lat: 25.1000, lng: 55.1740 },
  "discovery gardens": { lat: 25.0380, lng: 55.1350 },
  "dubailand": { lat: 25.0750, lng: 55.3000 },
  "palm jumeirah": { lat: 25.1124, lng: 55.1390 },
  "al nahda": { lat: 25.2900, lng: 55.3700 },
  "al qusais": { lat: 25.2700, lng: 55.3850 },
  "rashidiya": { lat: 25.2350, lng: 55.3900 },
  "jumeirah lake towers": { lat: 25.0772, lng: 55.1536 },
  "difc": { lat: 25.2100, lng: 55.2800 },
  "city walk": { lat: 25.2070, lng: 55.2650 },
  "al mamzar": { lat: 25.2890, lng: 55.3450 },
};

function areaToCoords(area: string): { lat: number; lng: number } {
  const key = area?.toLowerCase().trim();
  const base = AREA_COORDS[key] ?? { lat: 25.2048, lng: 55.2708 };
  const jitter = () => (Math.random() - 0.5) * 0.008;
  return { lat: base.lat + jitter(), lng: base.lng + jitter() };
}

export interface FetchUnifiedPointsOpts {
  searchQuery?: string;
  userLocation?: UserGeoPoint | null;
  category?: RadarCategory;
  subcategory?: string | null;
  vertical?: string;
  limit?: number;
}

export async function fetchUnifiedPoints(opts?: FetchUnifiedPointsOpts): Promise<RadarPoint[]> {
  const { searchQuery, userLocation, category, subcategory, vertical, limit = 200 } = opts ?? {};
  const timeCtx = getTimeContext();

  // Build queries
  let storefrontQuery = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, address, logo_url, banner_url, latitude, longitude, rating, reviews_count, ranking_score, city, region")
    .eq("launch_status", "launched")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("ranking_score", { ascending: false })
    .limit(limit);

  let seedQuery = (supabase as any)
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, area, rating, review_count, cover_image, logo_image, visibility_score, is_open, is_featured, promo_active, delivery_time_min, delivery_time_max")
    .eq("is_active", true)
    .order("visibility_score", { ascending: false })
    .limit(limit);

  // Apply vertical filter at DB level when possible
  if (vertical) {
    storefrontQuery = storefrontQuery.eq("vertical", vertical);
  }
  if (subcategory) {
    storefrontQuery = storefrontQuery.eq("subcategory", subcategory);
    seedQuery = seedQuery.eq("subcategory", subcategory);
  }

  if (searchQuery?.trim()) {
    storefrontQuery = storefrontQuery.ilike("name", `%${searchQuery.trim()}%`);
    seedQuery = seedQuery.ilike("name", `%${searchQuery.trim()}%`);
  }

  const [storefrontRes, seedRes] = await Promise.all([storefrontQuery, seedQuery]);

  const points: RadarPoint[] = [];
  const seenIds = new Set<string>();

  // 1) Normalize storefront_pages through CANONICAL taxonomy
  for (const s of storefrontRes.data ?? []) {
    seenIds.add(s.id);
    const normVertical = normalizeVertical(s.vertical || s.category);
    const cat = verticalToRadarCategory(normVertical);
    if (category && category !== "all" && cat !== category) continue;
    const sub = normalizeSubcategory(s.subcategory || s.category);
    const lat = Number(s.latitude);
    const lng = Number(s.longitude);
    const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, lat, lng) : undefined;
    const timeScore = timeRelevanceScore(sub, timeCtx);

    points.push({
      id: s.id,
      title: s.name || "Business",
      subtitle: s.region || s.address || s.category || undefined,
      imageUrl: s.banner_url || s.logo_url,
      category: cat,
      subcategory: sub,
      lat, lng,
      rating: s.rating ? Number(s.rating) : undefined,
      reviewsCount: s.reviews_count ?? undefined,
      isSponsored: (s.ranking_score ?? 0) > 80,
      distanceKm: dist,
      timeScore,
      slug: s.slug || null,
      district: s.area || null,
      cityName: s.city || null,
    });
  }

  // 2) Normalize seed_merchants through CANONICAL taxonomy
  for (const m of seedRes.data ?? []) {
    if (seenIds.has(m.id)) continue;
    const coords = areaToCoords(m.area);
    const normVertical = normalizeVertical(m.category);
    const cat = verticalToRadarCategory(normVertical);
    if (category && category !== "all" && cat !== category) continue;
    const sub = normalizeSubcategory(m.subcategory);
    const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : undefined;
    const timeScore = timeRelevanceScore(sub, timeCtx);

    points.push({
      id: m.id,
      title: m.name,
      subtitle: `${m.area}, ${m.city}`,
      imageUrl: m.cover_image || m.logo_image,
      category: cat,
      subcategory: sub,
      lat: coords.lat,
      lng: coords.lng,
      rating: m.rating ? Number(m.rating) : undefined,
      reviewsCount: m.review_count ?? undefined,
      isSponsored: m.is_featured || m.promo_active || (m.visibility_score ?? 0) > 80,
      distanceKm: dist,
      timeScore,
      district: m.area || null,
      cityName: m.city || null,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INTELLIGENT FALLBACK: if exact subcategory yields < 5 results,
  // expand to same cluster, then same vertical — tagged with hierarchy tier.
  // ═══════════════════════════════════════════════════════════
  if (subcategory && points.length < 5 && !searchQuery) {
    const cluster = getClusterForSubcategory(subcategory);
    const parentVert = getParentVertical(subcategory);

    if (cluster && parentVert) {
      // Re-fetch without subcategory filter, then client-filter to cluster
      const fallbackStorefront = (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, vertical, category, subcategory, address, logo_url, banner_url, latitude, longitude, rating, reviews_count, ranking_score")
        .eq("launch_status", "launched")
        .eq("vertical", parentVert.value)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("ranking_score", { ascending: false })
        .limit(50);

      const fallbackSeed = (supabase as any)
        .from("seed_merchants")
        .select("id, name, category, subcategory, city, area, rating, review_count, cover_image, logo_image, visibility_score, is_open, is_featured, promo_active, delivery_time_min, delivery_time_max")
        .eq("is_active", true)
        .eq("category", parentVert.value)
        .order("visibility_score", { ascending: false })
        .limit(50);

      const [fbSf, fbSd] = await Promise.all([fallbackStorefront, fallbackSeed]);

      for (const s of fbSf.data ?? []) {
        if (seenIds.has(s.id)) continue;
        seenIds.add(s.id);
        const sub = normalizeSubcategory(s.subcategory || s.category);
        const subCluster = sub ? getClusterForSubcategory(sub) : null;
        if (subCluster !== cluster) continue; // only same-cluster items
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        points.push({
          id: s.id, title: s.name || "Business",
          subtitle: s.address || s.category || undefined,
          imageUrl: s.banner_url || s.logo_url,
          category: verticalToRadarCategory(normalizeVertical(s.vertical || s.category)),
          subcategory: sub, lat, lng,
          rating: s.rating ? Number(s.rating) : undefined,
          reviewsCount: s.reviews_count ?? undefined,
          isSponsored: (s.ranking_score ?? 0) > 80,
          distanceKm: userLocation ? haversineKm(userLocation.lat, userLocation.lng, lat, lng) : undefined,
          timeScore: timeRelevanceScore(sub, timeCtx),
          slug: s.slug || null,
        });
      }
      for (const m of fbSd.data ?? []) {
        if (seenIds.has(m.id)) continue;
        seenIds.add(m.id);
        const sub = normalizeSubcategory(m.subcategory);
        const subCluster = sub ? getClusterForSubcategory(sub) : null;
        if (subCluster !== cluster) continue;
        const coords = areaToCoords(m.area);
        points.push({
          id: m.id, title: m.name,
          subtitle: `${m.area}, ${m.city}`,
          imageUrl: m.cover_image || m.logo_image,
          category: verticalToRadarCategory(normalizeVertical(m.category)),
          subcategory: sub,
          lat: coords.lat, lng: coords.lng,
          rating: m.rating ? Number(m.rating) : undefined,
          reviewsCount: m.review_count ?? undefined,
          isSponsored: m.is_featured || m.promo_active || (m.visibility_score ?? 0) > 80,
          distanceKm: userLocation ? haversineKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : undefined,
          timeScore: timeRelevanceScore(sub, timeCtx),
        });
      }
    }
  }

  return points;
}

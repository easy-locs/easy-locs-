/**
 * Canonical Discovery Pipeline — Single source of truth for ALL public shop queries.
 * 
 * Every surface (Radar, Map, Search, Discover, Home, Favorites, Vertical hubs)
 * MUST use this pipeline. No page-specific filtering allowed.
 * 
 * Pipeline stages:
 * 1. Source data load
 * 2. Visibility mode filtering
 * 3. Route validity filtering
 * 4. Taxonomy filtering
 * 5. Geo filtering (including radius)
 * 6. Search filtering
 * 7. Ranking priority
 * 8. Final UI projection
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

// ═══ Placeholder image filter — blocks generic/stock images from discovery ═══
const PLACEHOLDER_PATTERNS = ["unsplash.com", "placeholder", "dummyimage", "placehold.co", "via.placeholder"];
function isPlaceholder(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
}

// ═══════════════════════════════════════════════════
//  VISIBILITY RULES — Which modes are visible per surface
// ═══════════════════════════════════════════════════

export type DiscoverySurface = "radar" | "map" | "search" | "discover" | "home" | "favorites" | "vertical";

const VISIBLE_MODES_BY_SURFACE: Record<DiscoverySurface, string[]> = {
  radar:    ["live", "ready", "coming_soon", "map_only"],
  map:      ["live", "ready", "coming_soon", "map_only"],
  search:   ["live", "ready", "coming_soon", "search_only"],
  discover: ["live", "ready", "coming_soon", "search_only"],
  home:     ["live", "ready", "coming_soon"],
  favorites:["live", "ready", "coming_soon", "search_only", "map_only"],
  vertical: ["live", "ready", "coming_soon", "search_only"],
};

// ═══════════════════════════════════════════════════
//  AREA GEOCODING (for seed_merchants without lat/lng)
// ═══════════════════════════════════════════════════

const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  // ── Dubai ──
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
  "jumeirah beach": { lat: 25.2050, lng: 55.2350 },
  "jumeira bay": { lat: 25.1900, lng: 55.2300 },
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
  "jbr": { lat: 25.0800, lng: 55.1350 },
  "umm suqeim": { lat: 25.1580, lng: 55.2100 },
  "sheikh zayed road": { lat: 25.2000, lng: 55.2700 },
  "wafi": { lat: 25.2300, lng: 55.3150 },
  "culture village": { lat: 25.2400, lng: 55.3250 },
  // ── Abu Dhabi ──
  "corniche": { lat: 24.4539, lng: 54.3773 },
  "saadiyat island": { lat: 24.5400, lng: 54.4300 },
  "yas island": { lat: 24.4900, lng: 54.6100 },
  "eastern mangroves": { lat: 24.4500, lng: 54.4400 },
  "khor al maqta": { lat: 24.4200, lng: 54.4500 },
  // ── Sharjah ──
  "al khan beach": { lat: 25.3300, lng: 55.3800 },
  "heart of sharjah": { lat: 25.3600, lng: 55.3900 },
  "al taawun": { lat: 25.3400, lng: 55.3900 },
  // ── RAK ──
  "al hamra": { lat: 25.7200, lng: 55.7800 },
  "al marjan island": { lat: 25.7900, lng: 55.7300 },
  "marjan island": { lat: 25.7900, lng: 55.7300 },
  // ── Fujairah ──
  "al aqah": { lat: 25.4900, lng: 56.3600 },
  "al aqah beach": { lat: 25.4900, lng: 56.3600 },
  // ── Ajman ──
  "ajman corniche": { lat: 25.4100, lng: 55.4400 },
  "sheikh humaid bin rashid": { lat: 25.4200, lng: 55.4500 },
  // ── UAQ ──
  "uaq beach": { lat: 25.5700, lng: 55.5500 },
  // ── Mina Al Arab (RAK) ──
  "mina al arab": { lat: 25.8100, lng: 55.7400 },
};

function areaToCoords(area: string): { lat: number; lng: number } {
  const key = area?.toLowerCase().trim();
  const base = AREA_COORDS[key] ?? { lat: 25.2048, lng: 55.2708 };
  const jitter = () => (Math.random() - 0.5) * 0.008;
  return { lat: base.lat + jitter(), lng: base.lng + jitter() };
}

// ═══════════════════════════════════════════════════
//  PIPELINE OPTIONS
// ═══════════════════════════════════════════════════

export interface CanonicalDiscoveryOpts {
  /** Which surface is requesting data — determines visibility rules */
  surface: DiscoverySurface;
  /** Free-text search query */
  searchQuery?: string;
  /** User's current GPS location */
  userLocation?: UserGeoPoint | null;
  /** RadarCategory filter (food, shops, etc.) */
  category?: RadarCategory;
  /** Subcategory filter */
  subcategory?: string | null;
  /** Vertical filter */
  vertical?: string;
  /** Radius in km — shops beyond this are EXCLUDED */
  radiusKm?: number | null;
  /** Max results */
  limit?: number;
}

// ═══════════════════════════════════════════════════
//  MAIN PIPELINE
// ═══════════════════════════════════════════════════

export async function fetchCanonicalDiscovery(opts: CanonicalDiscoveryOpts): Promise<RadarPoint[]> {
  const {
    surface,
    searchQuery,
    userLocation,
    category,
    subcategory,
    vertical,
    radiusKm,
    limit = 200,
  } = opts;

  const timeCtx = getTimeContext();
  const allowedModes = VISIBLE_MODES_BY_SURFACE[surface] || VISIBLE_MODES_BY_SURFACE.discover;

  // ── STAGE 1: Source data load with visibility + route filtering at DB level ──

  let storefrontQuery = (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, address, logo_url, banner_url, latitude, longitude, rating, reviews_count, ranking_score, display_priority, visibility_mode, route_status, is_claimed, audit_score, city, region")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  // ── STAGE 2: Visibility mode filtering (DB level) ──
  // Only include shops with allowed visibility modes
  // Also accept NULL visibility_mode as "coming_soon" (default for legacy data)
  storefrontQuery = storefrontQuery.or(
    allowedModes.map(m => `visibility_mode.eq.${m}`).join(",") + ",visibility_mode.is.null"
  );

  // NOTE: Removed dangerous second .or() that could re-include excluded shops.
  // Launched/ready shops without visibility_mode are already covered by the null clause above.

  // ── STAGE 3: Route validity filtering ──
  storefrontQuery = storefrontQuery.neq("route_status", "broken");

  // ── STAGE 4: Taxonomy filtering (DB level) ──
  if (vertical) {
    storefrontQuery = storefrontQuery.eq("vertical", vertical);
  }
  if (subcategory) {
    storefrontQuery = storefrontQuery.eq("subcategory", subcategory);
  }

  // ── STAGE 7 partial: Order by display_priority first, then ranking_score ──
  storefrontQuery = storefrontQuery
    .order("display_priority", { ascending: false, nullsFirst: false })
    .order("ranking_score", { ascending: false })
    .limit(limit);

  // ── Search filter ──
  if (searchQuery?.trim()) {
    storefrontQuery = storefrontQuery.ilike("name", `%${searchQuery.trim()}%`);
  }

  // ── SEED MERCHANT GOVERNANCE ──
  // Seeds with visibility_mode/route_status columns are now treated like storefronts.
  // Seeds without those columns are treated as "coming_soon".
  // Always load seeds — the post-filter handles visibility.
  const seedAllowed = allowedModes.includes("coming_soon") || allowedModes.includes("live") || allowedModes.includes("ready");

  // Build seed query (but only execute if allowed)
  const seedQueryPromise = seedAllowed ? (() => {
    let seedQuery = (supabase as any)
      .from("seed_merchants")
      .select("id, name, category, subcategory, city, area, rating, review_count, cover_image, logo_image, visibility_score, is_open, is_featured, promo_active, delivery_time_min, delivery_time_max, overall_quality_score, pipeline_stage, visibility_mode")
      .eq("is_active", true)
      .not("visibility_mode", "eq", "hidden")
      .order("visibility_score", { ascending: false })
      .limit(limit);

    if (subcategory) {
      seedQuery = seedQuery.eq("subcategory", subcategory);
    }
    if (searchQuery?.trim()) {
      seedQuery = seedQuery.ilike("name", `%${searchQuery.trim()}%`);
    }
    return seedQuery;
  })() : Promise.resolve({ data: [] });

  const [storefrontRes, seedRes] = await Promise.all([storefrontQuery, seedQueryPromise]);
  let seedResults: any[] = seedRes.data ?? [];

  const points: RadarPoint[] = [];
  const seenIds = new Set<string>();

  // ── Normalize storefront_pages ──
  for (const s of storefrontRes.data ?? []) {
    seenIds.add(s.id);
    // Skip entities with placeholder images
    if (isPlaceholder(s.banner_url) && isPlaceholder(s.logo_url)) continue;
    const normVertical = normalizeVertical(s.vertical || s.category);
    const cat = verticalToRadarCategory(normVertical);
    if (category && category !== "all" && cat !== category) continue;
    const sub = normalizeSubcategory(s.subcategory || s.category);
    const lat = Number(s.latitude);
    const lng = Number(s.longitude);
    const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, lat, lng) : undefined;

    // ── STAGE 5: Geo filtering — radius exclusion ──
    if (radiusKm && dist !== undefined && dist > radiusKm) continue;

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
      isSponsored: (s.display_priority ?? s.ranking_score ?? 0) > 80,
      distanceKm: dist,
      timeScore,
      slug: s.slug || null,
      district: s.region || s.address || null,
      cityName: s.city || null,
    });
  }

  // ── Normalize seed_merchants (governed: treated as coming_soon, no route issues) ──
  // display_priority projection: visibility_score / 100 * 50 (seeds rank below claimed storefronts)
  for (const m of seedResults) {
    if (seenIds.has(m.id)) continue;
    if (isPlaceholder(m.cover_image) && isPlaceholder(m.logo_image)) continue;
    const coords = areaToCoords(m.area);
    const normVertical = normalizeVertical(m.category);
    const cat = verticalToRadarCategory(normVertical);
    if (category && category !== "all" && cat !== category) continue;
    const sub = normalizeSubcategory(m.subcategory);
    const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : undefined;

    // ── Radius exclusion for seeds too ──
    if (radiusKm && dist !== undefined && dist > radiusKm) continue;

    const timeScore = timeRelevanceScore(sub, timeCtx);
    // Projected display_priority: seeds rank lower than claimed storefronts
    const seedPriority = Math.round((m.visibility_score ?? 50) * 0.5);

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
      isSponsored: m.is_featured || m.promo_active || seedPriority > 40,
      distanceKm: dist,
      timeScore,
      district: m.area || null,
      cityName: m.city || null,
    });
  }

  // ── Intelligent fallback for sparse subcategories ──
  if (subcategory && points.length < 5 && !searchQuery) {
    const cluster = getClusterForSubcategory(subcategory);
    const parentVert = getParentVertical(subcategory);

    if (cluster && parentVert) {
      let fallbackQuery = (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, vertical, category, subcategory, address, logo_url, banner_url, latitude, longitude, rating, reviews_count, ranking_score, display_priority, visibility_mode, route_status")
        .eq("vertical", parentVert.value)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .neq("route_status", "broken")
        .or(allowedModes.map(m => `visibility_mode.eq.${m}`).join(",") + ",visibility_mode.is.null")
        .order("display_priority", { ascending: false, nullsFirst: false })
        .limit(50);

      let fallbackSeed = (supabase as any)
        .from("seed_merchants")
        .select("id, name, category, subcategory, city, area, rating, review_count, cover_image, logo_image, visibility_score, is_open, is_featured, promo_active, delivery_time_min, delivery_time_max")
        .eq("is_active", true)
        .eq("category", parentVert.value)
        .order("visibility_score", { ascending: false })
        .limit(50);

      const [fbSf, fbSd] = await Promise.all([fallbackQuery, fallbackSeed]);

      for (const s of fbSf.data ?? []) {
        if (seenIds.has(s.id)) continue;
        seenIds.add(s.id);
        const sub = normalizeSubcategory(s.subcategory || s.category);
        const subCluster = sub ? getClusterForSubcategory(sub) : null;
        if (subCluster !== cluster) continue;
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, lat, lng) : undefined;
        if (radiusKm && dist !== undefined && dist > radiusKm) continue;

        points.push({
          id: s.id, title: s.name || "Business",
          subtitle: s.address || s.category || undefined,
          imageUrl: s.banner_url || s.logo_url,
          category: verticalToRadarCategory(normalizeVertical(s.vertical || s.category)),
          subcategory: sub, lat, lng,
          rating: s.rating ? Number(s.rating) : undefined,
          reviewsCount: s.reviews_count ?? undefined,
          isSponsored: (s.display_priority ?? s.ranking_score ?? 0) > 80,
          distanceKm: dist,
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
        const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : undefined;
        if (radiusKm && dist !== undefined && dist > radiusKm) continue;

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
          distanceKm: dist,
          timeScore: timeRelevanceScore(sub, timeCtx),
        });
      }
    }
  }

  return points;
}

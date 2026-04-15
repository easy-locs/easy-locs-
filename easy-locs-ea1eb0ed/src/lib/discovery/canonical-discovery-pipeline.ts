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
import { db } from "@/services/db";
import { haversineKm } from "@/lib/geo/distance";
import { getTimeContext, timeRelevanceScore } from "@/lib/discovery/timeContext";
import {
  strictVerticalToRadarCategory as verticalToRadarCategory,
  strictGetParentVertical as getParentVertical,
} from "@/lib/taxonomy/world-class-taxonomy";

let _aliasCache: Awaited<ReturnType<typeof _load>> | null = null;
const _load = () => import("@/lib/taxonomy/taxonomy-aliases");
async function aliases() {
  if (!_aliasCache) _aliasCache = await _load();
  return _aliasCache;
}
import { fetchOSMPlaces, osmCategoryToRadarCategory } from "@/lib/geo/osm-places-engine";
import type { RadarPoint, RadarCategory, UserGeoPoint } from "@/lib/radar/types";
import { FALLBACK_RESTAURANTS } from "@/data/fallback-restaurants";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_SERVICES } from "@/data/fallback-services";

// ═══ Placeholder image filter — blocks truly generic images from discovery ═══
// NOTE: unsplash removed from blocklist — many storefronts use unsplash as temporary photos
const PLACEHOLDER_PATTERNS = ["placeholder", "dummyimage", "placehold.co", "via.placeholder"];
function isPlaceholder(url?: string | null): boolean {
  if (!url) return false; // Allow entries without images — UI shows fallback icons
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
  /** City filter — restrict results to a specific city */
  city?: string | null;
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
    city,
    radiusKm,
    limit = 200,
  } = opts;

  const { normalizeVertical, normalizeSubcategory, getClusterForSubcategory } = await aliases();
  const timeCtx = getTimeContext();
  const allowedModes = VISIBLE_MODES_BY_SURFACE[surface] || VISIBLE_MODES_BY_SURFACE.discover;

  // ── STAGE 1: Source data load with visibility + route filtering at DB level ──

  let storefrontQuery = db
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
  // ── STAGE 4b: City filtering ──
  if (city) {
    storefrontQuery = storefrontQuery.ilike("city", city);
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

  // ── SINGLE SOURCE: storefront_pages only — seed_merchants is internal pipeline only ──

  const storefrontRes = await storefrontQuery;

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
      vertical: s.vertical || null,
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

  {
    const fallback = FALLBACK_RESTAURANTS.filter((r) => {
      if (vertical && r.vertical !== vertical) return false;
      if (subcategory && r.subcategory !== subcategory) return false;
      if (category && category !== "all" && verticalToRadarCategory(r.vertical) !== category) return false;
      if (city && r.city.toLowerCase() !== city.toLowerCase()) return false;
      if (searchQuery?.trim() && !r.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });
    for (const r of fallback) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, r.latitude, r.longitude) : undefined;
      if (radiusKm && dist !== undefined && dist > radiusKm) continue;
      points.push({
        id: r.id,
        title: r.name,
        subtitle: `${r.region} · ${r.delivery_time_min}-${r.delivery_time_max} min · AED ${r.delivery_fee} delivery`,
        imageUrl: r.banner_url,
        category: verticalToRadarCategory(r.vertical) as RadarCategory,
        subcategory: r.subcategory,
        vertical: r.vertical || null,
        lat: r.latitude,
        lng: r.longitude,
        rating: r.rating,
        reviewsCount: r.reviews_count,
        isSponsored: r.display_priority > 90,
        distanceKm: dist,
        timeScore: 50,
        slug: r.slug,
        district: r.region,
        cityName: r.city,
      });
    }
  }

  {
    const hotelFallback = FALLBACK_HOTELS.filter((h) => {
      if (vertical && h.vertical !== vertical && !(vertical === "experiences" && h.vertical === "property")) return false;
      if (subcategory && h.subcategory !== subcategory) return false;
      if (category && category !== "all" && verticalToRadarCategory(h.vertical) !== category) return false;
      if (city && h.city.toLowerCase() !== city.toLowerCase()) return false;
      if (searchQuery?.trim() && !h.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });
    for (const h of hotelFallback) {
      if (seenIds.has(h.id)) continue;
      seenIds.add(h.id);
      const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, h.latitude, h.longitude) : undefined;
      if (radiusKm && dist !== undefined && dist > radiusKm) continue;
      points.push({
        id: h.id,
        title: h.name,
        subtitle: `${h.region} · ${h.stars}★ · From AED ${h.night_price}/night`,
        imageUrl: h.banner_url,
        category: verticalToRadarCategory(h.vertical) as RadarCategory,
        subcategory: h.subcategory,
        vertical: h.vertical || null,
        lat: h.latitude,
        lng: h.longitude,
        rating: h.rating,
        reviewsCount: h.reviews_count,
        isSponsored: h.display_priority > 90,
        distanceKm: dist,
        timeScore: 50,
        slug: h.slug,
        district: h.region,
        cityName: h.city,
      });
    }
  }

  {
    const shopsFallback = FALLBACK_SHOPS.filter((s) => {
      if (vertical && s.vertical !== vertical) return false;
      if (subcategory && s.subcategory !== subcategory) return false;
      if (category && category !== "all" && verticalToRadarCategory(s.vertical) !== category) return false;
      if (city && s.city.toLowerCase() !== city.toLowerCase()) return false;
      if (searchQuery?.trim() && !s.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });
    for (const s of shopsFallback) {
      if (seenIds.has(s.id)) continue;
      seenIds.add(s.id);
      const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude) : undefined;
      if (radiusKm && dist !== undefined && dist > radiusKm) continue;
      points.push({
        id: s.id,
        title: s.name,
        subtitle: s.address,
        imageUrl: s.banner_url,
        category: verticalToRadarCategory(s.vertical) as RadarCategory,
        subcategory: s.subcategory,
        vertical: s.vertical || null,
        lat: s.latitude,
        lng: s.longitude,
        rating: s.rating,
        reviewsCount: s.reviews_count,
        isSponsored: s.display_priority > 90,
        distanceKm: dist,
        timeScore: 50,
        slug: s.slug,
        district: s.address,
        cityName: s.city,
      });
    }
  }

  {
    const groceryFallback = FALLBACK_GROCERY.filter((g) => {
      if (vertical && g.vertical !== vertical) return false;
      if (subcategory && g.subcategory !== subcategory) return false;
      if (category && category !== "all" && verticalToRadarCategory(g.vertical) !== category) return false;
      if (city && g.city.toLowerCase() !== city.toLowerCase()) return false;
      if (searchQuery?.trim() && !g.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });
    for (const g of groceryFallback) {
      if (seenIds.has(g.id)) continue;
      seenIds.add(g.id);
      const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, g.latitude, g.longitude) : undefined;
      if (radiusKm && dist !== undefined && dist > radiusKm) continue;
      points.push({
        id: g.id,
        title: g.name,
        subtitle: g.address,
        imageUrl: g.banner_url,
        category: verticalToRadarCategory(g.vertical) as RadarCategory,
        subcategory: g.subcategory,
        vertical: g.vertical || null,
        lat: g.latitude,
        lng: g.longitude,
        rating: g.rating,
        reviewsCount: g.reviews_count,
        isSponsored: g.display_priority > 90,
        distanceKm: dist,
        timeScore: 50,
        slug: g.slug,
        district: g.address,
        cityName: g.city,
      });
    }
  }

  {
    const servicesFallback = FALLBACK_SERVICES.filter((s) => {
      if (vertical && s.vertical !== vertical) return false;
      if (subcategory && s.subcategory !== subcategory) return false;
      if (category && category !== "all" && verticalToRadarCategory(s.vertical) !== category) return false;
      if (city && s.city.toLowerCase() !== city.toLowerCase()) return false;
      if (searchQuery?.trim() && !s.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });
    for (const s of servicesFallback) {
      if (seenIds.has(s.id)) continue;
      seenIds.add(s.id);
      const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude) : undefined;
      if (radiusKm && dist !== undefined && dist > radiusKm) continue;
      points.push({
        id: s.id,
        title: s.name,
        subtitle: s.address,
        imageUrl: s.banner_url,
        category: verticalToRadarCategory(s.vertical) as RadarCategory,
        subcategory: s.subcategory,
        vertical: s.vertical || null,
        lat: s.latitude,
        lng: s.longitude,
        rating: s.rating,
        reviewsCount: s.reviews_count,
        isSponsored: s.display_priority > 90,
        distanceKm: dist,
        timeScore: 50,
        slug: s.slug,
        district: s.address,
        cityName: s.city,
      });
    }
  }

  // ── Intelligent fallback for sparse subcategories ──
  if (subcategory && points.length < 5 && !searchQuery) {
    const cluster = getClusterForSubcategory(subcategory);
    const parentVert = getParentVertical(subcategory);

    if (cluster && parentVert) {
      let fallbackQuery = db
        .from("storefront_pages")
        .select("id, name, slug, vertical, category, subcategory, address, logo_url, banner_url, latitude, longitude, rating, reviews_count, ranking_score, display_priority, visibility_mode, route_status")
        .eq("vertical", parentVert.value)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .neq("route_status", "broken")
        .or(allowedModes.map(m => `visibility_mode.eq.${m}`).join(",") + ",visibility_mode.is.null")
        .order("display_priority", { ascending: false, nullsFirst: false })
        .limit(50);

      const fbSf = await fallbackQuery;

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
          subcategory: sub,
          vertical: s.vertical || null,
          lat, lng,
          rating: s.rating ? Number(s.rating) : undefined,
          reviewsCount: s.reviews_count ?? undefined,
          isSponsored: (s.display_priority ?? s.ranking_score ?? 0) > 80,
          distanceKm: dist,
          timeScore: timeRelevanceScore(sub, timeCtx),
          slug: s.slug || null,
        });
      }
    }
  }

  // ── C2C Listings Source: marketplace_services with C2C categories ──
  if (!vertical || vertical === "classified_c2c") {
    const c2cCategories = [
      "vehicules", "immobilier", "electronique", "mode", "maison_jardin",
      "loisirs_sports", "multimedia", "famille", "animaux", "emploi_services",
      "materiel_pro", "autres", "c2c_vehicles", "c2c_electronics", "c2c_fashion",
      "c2c_home", "c2c_sports", "c2c_misc",
    ];
    let c2cQuery = db
      .from("marketplace_services")
      .select("id, title, price, currency, category, subcategory, city, lat, lng, slug, photo_urls, condition, created_at")
      .eq("active", true)
      .eq("status", "published")
      .in("category", c2cCategories)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (subcategory) c2cQuery = c2cQuery.eq("subcategory", subcategory);
    if (city) c2cQuery = c2cQuery.ilike("city", city);
    if (searchQuery?.trim()) c2cQuery = c2cQuery.ilike("title", `%${searchQuery.trim()}%`);
    const c2cRes = await c2cQuery;
    for (const l of c2cRes.data ?? []) {
      if (seenIds.has(l.id)) continue;
      seenIds.add(l.id);
      const lat = Number(l.lat);
      const lng = Number(l.lng);
      const dist = userLocation ? haversineKm(userLocation.lat, userLocation.lng, lat, lng) : undefined;
      if (radiusKm && dist !== undefined && dist > radiusKm) continue;
      const photos = l.photo_urls as string[] | null;
      points.push({
        id: l.id,
        title: l.title || "Annonce",
        subtitle: l.condition ? `${l.condition} · ${l.city || ""}` : l.city || undefined,
        imageUrl: photos?.[0] || null,
        category: "classifieds" as RadarCategory,
        subcategory: l.subcategory || l.category,
        vertical: "classified_c2c",
        lat, lng,
        rating: undefined,
        reviewsCount: undefined,
        isSponsored: false,
        distanceKm: dist,
        timeScore: 50,
        slug: l.slug || null,
        district: null,
        cityName: l.city || null,
      });
    }
  }

  // ── OSM Enrichment: fetch real-world POIs from OpenStreetMap ──
  if (userLocation?.lat && userLocation?.lng) {
    try {
      const osmPlaces = await fetchOSMPlaces(userLocation.lat, userLocation.lng, {
        radiusM: 3000,
        limit: 150,
      });

      for (const place of osmPlaces) {
        if (seenIds.has(place.id)) continue;
        seenIds.add(place.id);

        const cat = osmCategoryToRadarCategory(place.category) as RadarCategory;
        if (category && category !== "all" && cat !== category) continue;

        const dist = haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng);
        if (radiusKm && dist > radiusKm) continue;

        points.push({
          id: place.id,
          title: place.name,
          subtitle: place.address || place.subcategory,
          imageUrl: null,
          category: cat,
          subcategory: place.subcategory,
          lat: place.lat,
          lng: place.lng,
          rating: undefined,
          reviewsCount: undefined,
          isSponsored: false,
          distanceKm: dist,
          timeScore: 0,
          slug: null,
          district: place.address || null,
          cityName: null,
        });
      }
    } catch (err) {
      console.warn("[Discovery] OSM enrichment failed:", err);
    }
  }

  // ── Sort: storefront results first (have images/ratings), then OSM by distance ──
  points.sort((a, b) => {
    const aIsOsm = a.id.startsWith("osm-") ? 1 : 0;
    const bIsOsm = b.id.startsWith("osm-") ? 1 : 0;
    if (aIsOsm !== bIsOsm) return aIsOsm - bIsOsm;
    return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
  });

  return points.slice(0, limit + 150); // Allow extra for OSM density
}

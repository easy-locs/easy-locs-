/**
 * Search Resolver — Executes unified search against Supabase.
 * Searches storefronts, seed merchants, and products.
 * Returns unified SearchResult[] with taxonomy-aware ranking.
 * 
 * GOVERNANCE: All queries go through query-governance.ts.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SearchState, SearchResult, AutocompleteGroup } from "./search-types";
import {
  normalizeVertical,
  normalizeSubcategory,
  getCanonicalVertical,
  CANONICAL_VERTICALS,
} from "@/lib/taxonomy/world-class-taxonomy";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

const db = supabase as any;

// ── Haversine distance ──
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function resolveSearch(
  state: SearchState
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const q = state.query.trim().toLowerCase();

  // Build storefront query — governed by canonical visibility rules
  let sfQuery = db
    .from("storefront_pages")
    .select("id, name, slug, vertical, category, subcategory, cluster, city, address, region, rating, reviews_count, banner_url, logo_url, visibility_mode, route_status, display_priority, latitude, longitude, is_open, source_type, audit_score, readiness_status")
    .limit(state.limit);

  // Apply governance (visibility_mode + route_status)
  sfQuery = governStorefrontQuery(sfQuery, "search");

  // Text search
  if (q) {
    sfQuery = sfQuery.or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%,category.ilike.%${q}%`);
  }

  // Vertical filter
  if (state.vertical && state.vertical !== "all") {
    sfQuery = sfQuery.eq("vertical", state.vertical);
  }

  // Subcategory filter
  if (state.subcategory) {
    sfQuery = sfQuery.eq("subcategory", state.subcategory);
  }

  // City filter
  if (state.city) {
    sfQuery = sfQuery.ilike("city", `%${state.city}%`);
  }

  // District filter
  if (state.district) {
    sfQuery = sfQuery.ilike("address", `%${state.district}%`);
  }

  // Rating filter
  if (state.minRating) {
    sfQuery = sfQuery.gte("rating", state.minRating);
  }

  // Product search (parallel)
  let productPromise: Promise<any> = Promise.resolve({ data: [] });
  if (q) {
    productPromise = db
      .from("seed_products")
      .select("id, name, description, price, category, image_url, merchant_id")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(20);
  }

  // Single source: storefront_pages only — seed_merchants is internal pipeline only

  const [sfRes, prodRes] = await Promise.all([sfQuery, productPromise]);

  // Shops from storefronts only
  const seenIds = new Set<string>();
  const shops: SearchResult[] = [];

  for (const row of sfRes.data ?? []) {
    seenIds.add(row.id);
    const result = mapStorefront(row, state);
    shops.push(result);
  }

  // Products
  const products: SearchResult[] = (prodRes.data ?? []).map((p: any) => ({
    id: p.id,
    type: "product" as const,
    title: p.name,
    subtitle: p.category || "Product",
    imageUrl: p.image_url,
    price: p.price,
    currency: p.currency || undefined,
    shopId: p.merchant_id,
  }));

  // Apply geo filter + distance
  let filtered = shops;
  if (state.lat && state.lng) {
    filtered = shops
      .map((s) => {
        if (s.lat && s.lng) {
          s.distanceKm = haversineKm(state.lat!, state.lng!, s.lat, s.lng);
        }
        return s;
      })
      .filter((s) => !s.distanceKm || s.distanceKm <= state.radiusKm);
  }

  // Sort
  const sorted = sortResults(filtered, state);

  // Merge shops + products
  const allResults = [...sorted, ...products];

  return { results: allResults, totalCount: allResults.length };
}

function mapStorefront(row: any, state: SearchState): SearchResult {
  const district = row.region || row.address || row.city;
  return {
    id: row.id,
    type: "shop",
    title: row.name,
    subtitle: [row.subcategory, district].filter(Boolean).join(" · "),
    imageUrl: row.banner_url || row.logo_url,
    lat: row.latitude,
    lng: row.longitude,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    vertical: row.vertical,
    subcategory: row.subcategory,
    district,
    city: row.city,
    slug: row.slug,
    isOpen: row.is_open,
    score: row.display_priority ?? row.audit_score ?? 0,
  };
}

function mapSeed(row: any, state: SearchState): SearchResult {
  return {
    id: row.id,
    type: "shop",
    title: row.name,
    subtitle: [row.subcategory, row.area || row.city].filter(Boolean).join(" · "),
    imageUrl: row.cover_image,
    lat: row.latitude,
    lng: row.longitude,
    rating: row.rating,
    reviewsCount: row.review_count,
    subcategory: row.subcategory,
    district: row.area,
    city: row.city,
    isOpen: row.is_open,
    score: row.visibility_score ?? 0,
  };
}

function sortResults(results: SearchResult[], state: SearchState): SearchResult[] {
  return [...results].sort((a, b) => {
    switch (state.sort) {
      case "distance":
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "trending":
        return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
      case "relevance":
      default: {
        // Composite: score (display_priority or visibility_score) + rating + distance penalty
        const scoreA = (a.score ?? 0) * 0.3 + (a.isSponsored ? 10 : 0) + (a.rating ?? 0) - (a.distanceKm ?? 5) * 0.3;
        const scoreB = (b.score ?? 0) * 0.3 + (b.isSponsored ? 10 : 0) + (b.rating ?? 0) - (b.distanceKm ?? 5) * 0.3;
        return scoreB - scoreA;
      }
    }
  });
}

// ── Autocomplete ──
export async function resolveAutocomplete(
  query: string,
  state: SearchState
): Promise<AutocompleteGroup[]> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const groups: AutocompleteGroup[] = [];

  // 1. Taxonomy matches (categories / subcategories / tags)
  const taxonomyMatches: SearchResult[] = [];
  for (const v of CANONICAL_VERTICALS) {
    if (v.label.toLowerCase().includes(q) || v.value.includes(q)) {
      taxonomyMatches.push({
        id: `cat_${v.value}`,
        type: "category",
        title: `${v.emoji} ${v.label}`,
        vertical: v.value,
      });
    }
    for (const sub of v.subcategories) {
      const tagMatch = sub.tags?.some((t) => t.toLowerCase().includes(q));
      if (sub.label.toLowerCase().includes(q) || sub.value.includes(q) || tagMatch) {
        taxonomyMatches.push({
          id: `sub_${sub.value}`,
          type: "category",
          title: `${sub.emoji} ${sub.label}`,
          subtitle: v.label,
          vertical: v.value,
          subcategory: sub.value,
        });
      }
    }
  }
  if (taxonomyMatches.length) {
    groups.push({ type: "categories", label: "Categories", items: taxonomyMatches.slice(0, 6) });
  }

  // 2. Shop matches — governed
  let shopQuery = db
    .from("storefront_pages")
    .select("id, name, slug, subcategory, address, region, city, logo_url, rating, vertical")
    .ilike("name", `%${q}%`)
    .limit(5);
  shopQuery = governStorefrontQuery(shopQuery, "autocomplete");

  const { data: shops } = await shopQuery;

  if (shops?.length) {
    groups.push({
      type: "shops",
      label: "Shops",
      items: shops.map((s: any) => ({
        id: s.id,
        type: "shop" as const,
        title: s.name,
        subtitle: [s.subcategory, s.region || s.address || s.city].filter(Boolean).join(" · "),
        imageUrl: s.logo_url,
        slug: s.slug,
        rating: s.rating,
        vertical: s.vertical,
      })),
    });
  }

  // 3. Location matches
  const locationResults: SearchResult[] = [];
  const DUBAI_DISTRICTS = [
    "Dubai Marina", "JLT", "Downtown Dubai", "Business Bay", "JBR",
    "Al Barsha", "Deira", "Jumeirah", "Palm Jumeirah", "DIFC",
    "Silicon Oasis", "Sports City", "Motor City", "Discovery Gardens",
    "International City", "Al Quoz", "Bur Dubai", "Karama",
  ];
  for (const d of DUBAI_DISTRICTS) {
    if (d.toLowerCase().includes(q)) {
      locationResults.push({
        id: `loc_${d.replace(/\s+/g, "_").toLowerCase()}`,
        type: "location",
        title: d,
        subtitle: "Dubai",
        district: d,
        city: "Dubai",
      });
    }
  }
  if (locationResults.length) {
    groups.push({ type: "locations", label: "Locations", items: locationResults.slice(0, 4) });
  }

  // 4. Product matches
  const { data: products } = await db
    .from("seed_products")
    .select("id, name, price, category, image_url")
    .ilike("name", `%${q}%`)
    .limit(4);

  if (products?.length) {
    groups.push({
      type: "products",
      label: "Products",
      items: products.map((p: any) => ({
        id: p.id,
        type: "product" as const,
        title: p.name,
        subtitle: p.category,
        imageUrl: p.image_url,
        price: p.price,
        currency: p.currency || undefined,
      })),
    });
  }

  return groups;
}

/**
 * search.fetch.storefronts — Fetches storefront_pages results.
 * Single responsibility: query construction + execution.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SearchState, SearchResult } from "../search-types";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

const db = supabase as any;

export async function fetchStorefronts(state: SearchState): Promise<SearchResult[]> {
  const q = state.query.trim().toLowerCase();

  let query = db
    .from("storefront_pages")
    .select(
      "id, name, slug, vertical, category, subcategory, cluster, city, address, region, rating, reviews_count, banner_url, logo_url, visibility_mode, route_status, display_priority, latitude, longitude, is_open, source_type, audit_score, readiness_status"
    )
    .limit(state.limit);

  query = governStorefrontQuery(query, "search");

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,subcategory.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%,category.ilike.%${q}%`
    );
  }
  if (state.vertical && state.vertical !== "all") query = query.eq("vertical", state.vertical);
  if (state.subcategory) query = query.eq("subcategory", state.subcategory);
  if (state.city) query = query.ilike("city", `%${state.city}%`);
  if (state.district) query = query.ilike("address", `%${state.district}%`);
  if (state.minRating) query = query.gte("rating", state.minRating);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => mapStorefrontRow(row));
}

function mapStorefrontRow(row: any): SearchResult {
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

import { db } from "@/services/db";
import type { SearchState, SearchResult } from "../search-types";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

interface StorefrontRow {
  id: string;
  name: string;
  slug: string | null;
  vertical: string | null;
  category: string | null;
  subcategory: string | null;
  cluster: string | null;
  city: string | null;
  address: string | null;
  region: string | null;
  rating: number | null;
  reviews_count: number | null;
  banner_url: string | null;
  logo_url: string | null;
  visibility_mode: string | null;
  route_status: string | null;
  display_priority: number | null;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean | null;
  source_type: string | null;
  audit_score: number | null;
  readiness_status: string | null;
}

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

  return (data ?? []).map((row: StorefrontRow) => mapStorefrontRow(row));
}

function mapStorefrontRow(row: StorefrontRow): SearchResult {
  const district = row.region || row.address || row.city;
  return {
    id: row.id,
    type: "shop",
    title: row.name,
    subtitle: [row.subcategory, district].filter(Boolean).join(" · "),
    imageUrl: row.banner_url || row.logo_url || undefined,
    lat: row.latitude ?? undefined,
    lng: row.longitude ?? undefined,
    rating: row.rating ?? undefined,
    reviewsCount: row.reviews_count ?? undefined,
    vertical: row.vertical ?? undefined,
    subcategory: row.subcategory ?? undefined,
    district: district ?? undefined,
    city: row.city ?? undefined,
    slug: row.slug ?? undefined,
    isOpen: row.is_open ?? undefined,
    score: row.display_priority ?? row.audit_score ?? 0,
  };
}

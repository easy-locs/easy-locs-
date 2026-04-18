import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

interface SearchRequest {
  query: string;
  types?: string[];
  page?: number;
  limit?: number;
  min_rating?: number;
  price_min?: number;
  price_max?: number;
  city?: string;
  vertical?: string;
  category?: string;
  open_now?: boolean;
  sort?: string;
}

interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  rating: number | null;
  price: number | null;
  currency: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  slug: string | null;
  is_open: boolean | null;
  rank: number;
}

interface ShopRow {
  id: string;
  name: string;
  slug: string | null;
  subcategory: string | null;
  city: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rating: number | null;
  vertical: string | null;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean | null;
  fts_rank: number | null;
}

interface ProductRow {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
  image_url: string | null;
  fts_rank: number | null;
}

interface PropertyRow {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  property_type: string | null;
  latitude: number | null;
  longitude: number | null;
  fts_rank: number | null;
}

interface ServiceRow {
  id: string;
  title: string;
  price: number | null;
  currency: string | null;
  category: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  image_url: string | null;
  fts_rank: number | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  role: string | null;
  fts_rank: number | null;
}

interface CategoryRow {
  id: string;
  name: string;
  parent_name: string | null;
  slug: string | null;
}

function buildTsQuery(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map((w) => `${w}:*`).join(" & ");
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const authCheck = requireAuthenticatedUser(req);
  if (!authCheck.authorized) return authCheck.response!;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rlResult = await checkServerRateLimit(req, "search-global");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const body: SearchRequest = await req.json();
    const query = (body.query ?? "").trim();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ results: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchTypes = body.types ?? ["shop", "product", "property", "service", "profile", "category"];
    const page = Math.max(1, body.page ?? 1);
    const limit = Math.min(50, Math.max(1, body.limit ?? 20));
    const perDomainLimit = Math.min(limit * 2, 40);
    const offset = (page - 1) * limit;
    const tsq = buildTsQuery(query);
    const ilike = `%${query}%`;

    const settled = await Promise.allSettled([
      searchTypes.includes("shop") ? searchShops(supabase, tsq, ilike, body, perDomainLimit) : Promise.resolve([]),
      searchTypes.includes("product") ? searchProducts(supabase, tsq, ilike, body, perDomainLimit) : Promise.resolve([]),
      searchTypes.includes("property") ? searchProperties(supabase, tsq, ilike, body, perDomainLimit) : Promise.resolve([]),
      searchTypes.includes("service") ? searchServices(supabase, tsq, ilike, body, perDomainLimit) : Promise.resolve([]),
      searchTypes.includes("profile") ? searchProfiles(supabase, tsq, ilike, perDomainLimit) : Promise.resolve([]),
      searchTypes.includes("category") ? searchCategories(supabase, tsq, ilike) : Promise.resolve([]),
    ]);

    const allResults = settled
      .filter((r): r is PromiseFulfilledResult<SearchResultItem[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    allResults.sort((a, b) => b.rank - a.rank);

    const paginated = allResults.slice(offset, offset + limit);

    trackSearch(supabase, query, authCheck.user_id);

    return new Response(
      JSON.stringify({
        results: paginated,
        total: allResults.length,
        page,
        limit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function searchShops(
  supabase: SupabaseClient,
  tsq: string,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  const { data, error } = await cRpcEdge(supabase, "search_shops_fts", {
    search_query: tsq,
    ilike_pattern: ilike,
    result_limit: limit,
    filter_city: filters.city ?? null,
    filter_vertical: (filters.vertical && filters.vertical !== "all") ? filters.vertical : null,
    filter_category: filters.category ?? null,
    filter_min_rating: filters.min_rating ?? null,
    filter_open_now: filters.open_now ?? false,
  });

  if (error) {
    return searchShopsFallback(supabase, ilike, filters, limit);
  }

  return (data ?? []).map((r: ShopRow) => ({
    id: r.id,
    type: "shop" as const,
    title: r.name,
    subtitle: [r.subcategory, r.city].filter(Boolean).join(" · "),
    image_url: r.banner_url || r.logo_url,
    rating: r.rating,
    price: null,
    currency: null,
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
    slug: r.slug,
    is_open: r.is_open,
    rank: (r.fts_rank ?? 0) * 100 + (r.rating ?? 0) * 10,
  }));
}

async function searchShopsFallback(
  supabase: SupabaseClient,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  let query = supabase
    .from("storefront_pages")
    .select("id, name, slug, subcategory, city, logo_url, banner_url, rating, vertical, latitude, longitude, is_open")
    .or(`name.ilike.${ilike},subcategory.ilike.${ilike},city.ilike.${ilike}`)
    .in("visibility_mode", ["public", "listed"])
    .limit(limit);

  if (filters.min_rating) query = query.gte("rating", filters.min_rating);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.vertical && filters.vertical !== "all") query = query.eq("vertical", filters.vertical);
  if (filters.category) query = query.ilike("subcategory", `%${filters.category}%`);
  if (filters.open_now) query = query.eq("is_open", true);

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((r: ShopRow) => ({
    id: r.id,
    type: "shop" as const,
    title: r.name,
    subtitle: [r.subcategory, r.city].filter(Boolean).join(" · "),
    image_url: r.banner_url || r.logo_url,
    rating: r.rating,
    price: null,
    currency: null,
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
    slug: r.slug,
    is_open: r.is_open,
    rank: (r.rating ?? 0) * 10,
  }));
}

async function searchProducts(
  supabase: SupabaseClient,
  tsq: string,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  const { data, error } = await cRpcEdge(supabase, "search_products_fts", {
    search_query: tsq,
    ilike_pattern: ilike,
    result_limit: limit,
    filter_category: filters.category ?? null,
    filter_price_min: filters.price_min ?? null,
    filter_price_max: filters.price_max ?? null,
  });

  if (error) {
    return searchProductsFallback(supabase, ilike, filters, limit);
  }

  return (data ?? []).map((r: ProductRow) => ({
    id: r.id,
    type: "product" as const,
    title: r.name,
    subtitle: r.category,
    image_url: r.image_url,
    rating: null,
    price: r.price,
    currency: "USD",
    city: null,
    lat: null,
    lng: null,
    slug: null,
    is_open: null,
    rank: (r.fts_rank ?? 0) * 80,
  }));
}

async function searchProductsFallback(
  supabase: SupabaseClient,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  let query = supabase
    .from("seed_products")
    .select("id, name, price, category, image_url")
    .or(`name.ilike.${ilike},category.ilike.${ilike}`)
    .limit(limit);

  if (filters.price_min != null) query = query.gte("price", filters.price_min);
  if (filters.price_max != null) query = query.lte("price", filters.price_max);
  if (filters.category) query = query.ilike("category", `%${filters.category}%`);

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((r: ProductRow) => ({
    id: r.id,
    type: "product" as const,
    title: r.name,
    subtitle: r.category,
    image_url: r.image_url,
    rating: null,
    price: r.price,
    currency: "USD",
    city: null,
    lat: null,
    lng: null,
    slug: null,
    is_open: null,
    rank: 5,
  }));
}

async function searchProperties(
  supabase: SupabaseClient,
  tsq: string,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  const { data, error } = await cRpcEdge(supabase, "search_properties_fts", {
    search_query: tsq,
    ilike_pattern: ilike,
    result_limit: limit,
    filter_city: filters.city ?? null,
  });

  if (error) {
    return searchPropertiesFallback(supabase, ilike, filters, limit);
  }

  return (data ?? []).map((r: PropertyRow) => ({
    id: r.id,
    type: "property" as const,
    title: r.name || r.address || "Property",
    subtitle: [r.property_type, r.city].filter(Boolean).join(" · "),
    image_url: null,
    rating: null,
    price: null,
    currency: null,
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
    slug: null,
    is_open: null,
    rank: (r.fts_rank ?? 0) * 60,
  }));
}

async function searchPropertiesFallback(
  supabase: SupabaseClient,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  let query = supabase
    .from("properties")
    .select("id, name, address, city, property_type, latitude, longitude")
    .or(`name.ilike.${ilike},address.ilike.${ilike},city.ilike.${ilike}`)
    .limit(limit);

  if (filters.city) query = query.ilike("city", `%${filters.city}%`);

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((r: PropertyRow) => ({
    id: r.id,
    type: "property" as const,
    title: r.name || r.address || "Property",
    subtitle: [r.property_type, r.city].filter(Boolean).join(" · "),
    image_url: null,
    rating: null,
    price: null,
    currency: null,
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
    slug: null,
    is_open: null,
    rank: 3,
  }));
}

async function searchServices(
  supabase: SupabaseClient,
  tsq: string,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  const { data, error } = await cRpcEdge(supabase, "search_services_fts", {
    search_query: tsq,
    ilike_pattern: ilike,
    result_limit: limit,
    filter_city: filters.city ?? null,
    filter_category: filters.category ?? null,
    filter_min_rating: filters.min_rating ?? null,
    filter_price_min: filters.price_min ?? null,
    filter_price_max: filters.price_max ?? null,
  });

  if (error) {
    return searchServicesFallback(supabase, ilike, filters, limit);
  }

  return (data ?? []).map((r: ServiceRow) => ({
    id: r.id,
    type: "service" as const,
    title: r.title,
    subtitle: [r.category, r.city].filter(Boolean).join(" · "),
    image_url: r.image_url,
    rating: r.rating,
    price: r.price,
    currency: r.currency ?? "USD",
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
    slug: null,
    is_open: null,
    rank: (r.fts_rank ?? 0) * 90 + (r.rating ?? 0) * 8,
  }));
}

async function searchServicesFallback(
  supabase: SupabaseClient,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  let query = supabase
    .from("listings")
    .select("id, title, price, currency, category, city, latitude, longitude, rating, image_url")
    .or(`title.ilike.${ilike},category.ilike.${ilike}`)
    .in("status", ["active", "published"])
    .limit(limit);

  if (filters.price_min != null) query = query.gte("price", filters.price_min);
  if (filters.price_max != null) query = query.lte("price", filters.price_max);
  if (filters.min_rating) query = query.gte("rating", filters.min_rating);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.category) query = query.ilike("category", `%${filters.category}%`);

  const { data, error } = await query;
  if (error) return [];

  return (data ?? []).map((r: ServiceRow) => ({
    id: r.id,
    type: "service" as const,
    title: r.title,
    subtitle: [r.category, r.city].filter(Boolean).join(" · "),
    image_url: r.image_url,
    rating: r.rating,
    price: r.price,
    currency: r.currency ?? "USD",
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
    slug: null,
    is_open: null,
    rank: (r.rating ?? 0) * 8,
  }));
}

async function searchProfiles(
  supabase: SupabaseClient,
  tsq: string,
  ilike: string,
  limit: number,
): Promise<SearchResultItem[]> {
  const { data, error } = await cRpcEdge(supabase, "search_profiles_fts", {
    search_query: tsq,
    ilike_pattern: ilike,
    result_limit: limit,
  });

  if (error) {
    return searchProfilesFallback(supabase, ilike, limit);
  }

  return (data ?? []).map((r: ProfileRow) => ({
    id: r.id,
    type: "profile" as const,
    title: r.full_name || "User",
    subtitle: [r.role, r.city].filter(Boolean).join(" · "),
    image_url: r.avatar_url,
    rating: null,
    price: null,
    currency: null,
    city: r.city,
    lat: null,
    lng: null,
    slug: null,
    is_open: null,
    rank: (r.fts_rank ?? 0) * 50,
  }));
}

async function searchProfilesFallback(
  supabase: SupabaseClient,
  ilike: string,
  limit: number,
): Promise<SearchResultItem[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, city, role")
    .ilike("full_name", ilike)
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((r: ProfileRow) => ({
    id: r.id,
    type: "profile" as const,
    title: r.full_name || "User",
    subtitle: [r.role, r.city].filter(Boolean).join(" · "),
    image_url: r.avatar_url,
    rating: null,
    price: null,
    currency: null,
    city: r.city,
    lat: null,
    lng: null,
    slug: null,
    is_open: null,
    rank: 2,
  }));
}

async function searchCategories(
  supabase: SupabaseClient,
  tsq: string,
  ilike: string,
): Promise<SearchResultItem[]> {
  const { data, error } = await cRpcEdge(supabase, "search_categories_fts", {
    search_query: tsq,
    ilike_pattern: ilike,
    result_limit: 8,
  });

  if (error) {
    return searchCategoriesFallback(supabase, ilike);
  }

  return (data ?? []).map((r: CategoryRow & { fts_rank?: number }) => ({
    id: r.id,
    type: "category" as const,
    title: r.name,
    subtitle: r.parent_name,
    image_url: null,
    rating: null,
    price: null,
    currency: null,
    city: null,
    lat: null,
    lng: null,
    slug: r.slug,
    is_open: null,
    rank: (r.fts_rank ?? 0) * 70 + 15,
  }));
}

async function searchCategoriesFallback(
  supabase: SupabaseClient,
  ilike: string,
): Promise<SearchResultItem[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_name, slug")
    .ilike("name", ilike)
    .limit(8);

  if (error) return [];

  return (data ?? []).map((r: CategoryRow) => ({
    id: r.id,
    type: "category" as const,
    title: r.name,
    subtitle: r.parent_name,
    image_url: null,
    rating: null,
    price: null,
    currency: null,
    city: null,
    lat: null,
    lng: null,
    slug: r.slug,
    is_open: null,
    rank: 15,
  }));
}

function trackSearch(supabase: SupabaseClient, query: string, userId?: string) {
  cRpcEdge(supabase, "increment_search_count", {
    p_query: query,
    p_user_id: userId ?? null,
  }).then(() => {}).catch(() => {});
}

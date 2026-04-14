import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  rank: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
        JSON.stringify({ results: [], total: 0, popular: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchTypes = body.types ?? ["shop", "product", "property", "service", "profile"];
    const page = Math.max(1, body.page ?? 1);
    const limit = Math.min(50, Math.max(1, body.limit ?? 20));
    const offset = (page - 1) * limit;
    const ilike = `%${query}%`;

    const promises: Promise<SearchResultItem[]>[] = [];

    if (searchTypes.includes("shop")) {
      promises.push(searchShops(supabase, ilike, body, limit));
    }
    if (searchTypes.includes("product")) {
      promises.push(searchProducts(supabase, ilike, body, limit));
    }
    if (searchTypes.includes("property")) {
      promises.push(searchProperties(supabase, ilike, body, limit));
    }
    if (searchTypes.includes("service")) {
      promises.push(searchServices(supabase, ilike, body, limit));
    }
    if (searchTypes.includes("profile")) {
      promises.push(searchProfiles(supabase, ilike, limit));
    }

    const allResults = (await Promise.all(promises)).flat();

    allResults.sort((a, b) => b.rank - a.rank);

    const paginated = allResults.slice(offset, offset + limit);

    await trackSearch(supabase, query, authCheck.user_id);

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
  supabase: any,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  let query = supabase
    .from("storefront_pages")
    .select("id, name, slug, subcategory, address, city, logo_url, banner_url, rating, vertical, latitude, longitude")
    .or(`name.ilike.${ilike},subcategory.ilike.${ilike},city.ilike.${ilike}`)
    .limit(limit);

  if (filters.min_rating) query = query.gte("rating", filters.min_rating);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.vertical && filters.vertical !== "all") query = query.eq("vertical", filters.vertical);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "shop",
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
    rank: (r.rating ?? 0) * 10,
  }));
}

async function searchProducts(
  supabase: any,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  let query = supabase
    .from("seed_products")
    .select("id, name, description, price, category, image_url, merchant_id")
    .or(`name.ilike.${ilike},description.ilike.${ilike},category.ilike.${ilike}`)
    .limit(limit);

  if (filters.price_min != null) query = query.gte("price", filters.price_min);
  if (filters.price_max != null) query = query.lte("price", filters.price_max);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "product",
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
    rank: 5,
  }));
}

async function searchProperties(
  supabase: any,
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
  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "property",
    title: r.name || r.address,
    subtitle: [r.property_type, r.city].filter(Boolean).join(" · "),
    image_url: null,
    rating: null,
    price: null,
    currency: null,
    city: r.city,
    lat: r.latitude,
    lng: r.longitude,
    slug: null,
    rank: 3,
  }));
}

async function searchServices(
  supabase: any,
  ilike: string,
  filters: SearchRequest,
  limit: number,
): Promise<SearchResultItem[]> {
  let query = supabase
    .from("listings")
    .select("id, title, description, price, currency, category, city, latitude, longitude, rating, image_url")
    .or(`title.ilike.${ilike},description.ilike.${ilike},category.ilike.${ilike}`)
    .limit(limit);

  if (filters.price_min != null) query = query.gte("price", filters.price_min);
  if (filters.price_max != null) query = query.lte("price", filters.price_max);
  if (filters.min_rating) query = query.gte("rating", filters.min_rating);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "service",
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
    rank: (r.rating ?? 0) * 8,
  }));
}

async function searchProfiles(
  supabase: any,
  ilike: string,
  limit: number,
): Promise<SearchResultItem[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, city, role")
    .ilike("full_name", ilike)
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "profile",
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
    rank: 2,
  }));
}

async function trackSearch(supabase: any, query: string, userId?: string) {
  try {
    const normalized = query.toLowerCase().trim();
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from("search_analytics")
      .select("search_count")
      .eq("query_text", normalized)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("search_analytics")
        .update({
          search_count: (existing.search_count ?? 0) + 1,
          last_searched_by: userId ?? null,
          last_searched_at: now,
        })
        .eq("query_text", normalized);
    } else {
      await supabase.from("search_analytics").insert({
        query_text: normalized,
        search_count: 1,
        last_searched_by: userId ?? null,
        last_searched_at: now,
      });
    }
  } catch {
    // best-effort tracking
  }
}

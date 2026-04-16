/**
 * Search Resolver — Cross-domain orchestrator.
 * Primary: Meilisearch Edge Function for fast full-text + faceted search.
 * Secondary fallback: search-global edge function (PostgreSQL FTS).
 * Tertiary fallback: client-side fetchers.
 */
import type { SearchState, SearchResult, AutocompleteGroup, SearchResultType } from "./search-types";
import { guardSearchInput } from "./pipeline/search.input.guard";
import { matchTaxonomy } from "./pipeline/search.fetch.taxonomy";
import { matchLocations } from "./pipeline/search.fetch.locations";
import { applyRadiusFilter } from "./pipeline/search.filter.radius";
import { db } from "@/services/db";

interface EdgeSearchResponse {
  results: Array<{
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
  }>;
  total: number;
  page: number;
  limit: number;
}

interface MeilisearchResponse {
  hits: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    image_url?: string;
    rating?: number;
    price?: number;
    currency?: string;
    city?: string;
    lat?: number;
    lng?: number;
    slug?: string;
    is_open?: boolean;
    vertical?: string;
    subcategory?: string;
    _rankingScore?: number;
  }>;
  totalHits: number;
  facetDistribution?: Record<string, Record<string, number>>;
  processingTimeMs: number;
}

export interface SearchFacets {
  categories: Record<string, number>;
  priceRanges: Record<string, number>;
  ratings: Record<string, number>;
  verticals: Record<string, number>;
}

async function searchViaMeilisearch(
  state: SearchState,
): Promise<{ results: SearchResult[]; totalCount: number; facets?: SearchFacets } | null> {
  try {
    const filter: string[] = [];
    if (state.minRating) filter.push(`rating >= ${state.minRating}`);
    if (state.priceMin != null) filter.push(`price >= ${state.priceMin}`);
    if (state.priceMax != null) filter.push(`price <= ${state.priceMax}`);
    if (state.city) filter.push(`city = "${state.city}"`);
    if (state.vertical && state.vertical !== "all") filter.push(`vertical = "${state.vertical}"`);
    if (state.subcategory) filter.push(`subcategory = "${state.subcategory}"`);
    if (state.openNow) filter.push(`is_open = true`);

    const { data, error } = await db.functions.invoke("marketplace-router", {
      body: {
        query: state.query,
        filter: filter.length > 0 ? filter : undefined,
        facets: ["vertical", "subcategory", "city"],
        sort: state.sort === "price_asc" ? ["price:asc"]
            : state.sort === "price_desc" ? ["price:desc"]
            : state.sort === "rating" ? ["rating:desc"]
            : state.sort === "newest" ? ["created_at:desc"]
            : undefined,
        limit: state.limit,
        offset: (state.page - 1) * state.limit,
        types: state.types,
      },
    });

    if (error) return null;

    const response = data as MeilisearchResponse;
    if (!response?.hits) return null;

    const results: SearchResult[] = response.hits.map((h) => ({
      id: h.id,
      type: (h.type as SearchResultType) || "shop",
      title: h.title,
      subtitle: h.subtitle,
      imageUrl: h.image_url,
      rating: h.rating,
      price: h.price,
      currency: h.currency,
      city: h.city,
      lat: h.lat,
      lng: h.lng,
      slug: h.slug,
      isOpen: h.is_open,
      vertical: h.vertical,
      subcategory: h.subcategory,
      score: h._rankingScore,
    }));

    const facets: SearchFacets | undefined = response.facetDistribution
      ? {
          categories: response.facetDistribution.subcategory || {},
          priceRanges: {},
          ratings: {},
          verticals: response.facetDistribution.vertical || {},
        }
      : undefined;

    return { results, totalCount: response.totalHits, facets };
  } catch {
    return null;
  }
}

export async function resolveSearch(
  state: SearchState
): Promise<{ results: SearchResult[]; totalCount: number; facets?: SearchFacets }> {
  const guard = guardSearchInput(state);
  if (!guard.valid) {
    console.warn("[search] input guard failed:", guard.reason);
    return { results: [], totalCount: 0 };
  }

  const meiliResult = await searchViaMeilisearch(state);
  if (meiliResult) {
    const geoFiltered = applyRadiusFilter(meiliResult.results, state.lat, state.lng, state.radiusKm);
    return { results: geoFiltered, totalCount: meiliResult.totalCount, facets: meiliResult.facets };
  }

  try {
    const { data, error } = await db.functions.invoke("search-global", {
      body: {
        query: state.query,
        types: state.types,
        page: state.page,
        limit: state.limit,
        min_rating: state.minRating,
        price_min: state.priceMin,
        price_max: state.priceMax,
        city: state.city,
        vertical: state.vertical === "all" ? undefined : state.vertical,
        category: state.subcategory,
        open_now: state.openNow,
      },
    });

    if (error) {
      console.warn("[search] edge function error, falling back to client search:", error);
      return fallbackClientSearch(state);
    }

    const response = data as EdgeSearchResponse;
    const results: SearchResult[] = (response.results ?? []).map((r) => ({
      id: r.id,
      type: r.type as SearchResultType,
      title: r.title,
      subtitle: r.subtitle ?? undefined,
      imageUrl: r.image_url ?? undefined,
      rating: r.rating ?? undefined,
      price: r.price ?? undefined,
      currency: r.currency ?? undefined,
      city: r.city ?? undefined,
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
      slug: r.slug ?? undefined,
      isOpen: r.is_open ?? undefined,
      score: r.rank,
    }));

    const geoFiltered = applyRadiusFilter(results, state.lat, state.lng, state.radiusKm);

    return { results: geoFiltered, totalCount: response.total };
  } catch (err) {
    console.warn("[search] edge invocation failed, falling back:", err);
    return fallbackClientSearch(state);
  }
}

async function runWorkerSearch(
  all: SearchResult[],
  query: string,
  limit: number,
): Promise<SearchResult[]> {
  try {
    const { getSearchPool } = await import("@/workers/index");
    const pool = getSearchPool();
    const items = all.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.subtitle,
      category: r.type,
      score: r.score,
    }));
    const workerResults = await pool.exec("search", { items, query, limit });
    const scoreMap = new Map(workerResults.map((w) => [w.id, w.score]));
    return all
      .filter((r) => scoreMap.has(r.id))
      .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
      .slice(0, limit);
  } catch {
    return all;
  }
}

async function fallbackClientSearch(
  state: SearchState
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const { fetchStorefronts } = await import("./pipeline/search.fetch.storefronts");
  const { fetchProducts } = await import("./pipeline/search.fetch.products");
  const { fetchProperties } = await import("./pipeline/search.fetch.properties");
  const { fetchServices } = await import("./pipeline/search.fetch.services");
  const { fetchProfiles } = await import("./pipeline/search.fetch.profiles");
  const { rankResults } = await import("./pipeline/search.rank.relevance");
  const { filterByVertical } = await import("./pipeline/search.filter.vertical");

  const activeTypes = state.types ?? ["shop", "product", "property", "service", "profile"];
  const fetches: Promise<SearchResult[]>[] = [];

  if (activeTypes.includes("shop")) fetches.push(fetchStorefronts(state));
  if (activeTypes.includes("product")) fetches.push(fetchProducts(state.query));
  if (activeTypes.includes("property")) fetches.push(fetchProperties(state.query));
  if (activeTypes.includes("service")) fetches.push(fetchServices(state.query));
  if (activeTypes.includes("profile")) fetches.push(fetchProfiles(state.query));

  const settled = await Promise.allSettled(fetches);
  let all = settled
    .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  if (state.priceMin != null) all = all.filter((r) => r.price == null || r.price >= state.priceMin!);
  if (state.priceMax != null) all = all.filter((r) => r.price == null || r.price <= state.priceMax!);
  if (state.minRating) all = all.filter((r) => r.rating == null || r.rating >= state.minRating!);

  const geoFiltered = applyRadiusFilter(all, state.lat, state.lng, state.radiusKm);

  let ranked: SearchResult[];
  if (typeof Worker !== "undefined" && geoFiltered.length > 20) {
    const workerScored = await runWorkerSearch(geoFiltered, state.query, state.limit ?? 50);
    ranked = rankResults(workerScored, state.sort);
  } else {
    ranked = rankResults(geoFiltered, state.sort);
  }
  const verticalFiltered = filterByVertical(ranked, state);

  return { results: verticalFiltered, totalCount: verticalFiltered.length };
}

export async function resolveAutocomplete(
  query: string,
  state: SearchState
): Promise<AutocompleteGroup[]> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const taxonomyMatches = matchTaxonomy(q);
  const locationMatches = matchLocations(q);

  const settled = await Promise.allSettled([
    fetchAutocompleteShops(q),
    fetchAutocompleteProducts(q),
    fetchAutocompleteProperties(q),
    fetchAutocompleteServices(q),
    fetchAutocompleteProfiles(q),
  ]);
  const safeResult = (i: number): SearchResult[] =>
    settled[i].status === "fulfilled" ? (settled[i] as PromiseFulfilledResult<SearchResult[]>).value : [];
  const [shopResults, productResults, propertyResults, serviceResults, profileResults] =
    [safeResult(0), safeResult(1), safeResult(2), safeResult(3), safeResult(4)];

  const groups: AutocompleteGroup[] = [];

  if (taxonomyMatches.length) {
    groups.push({ type: "categories", label: "Categories", items: taxonomyMatches.slice(0, 6) });
  }
  if (shopResults.length) {
    groups.push({ type: "shops", label: "Shops & Restaurants", items: shopResults });
  }
  if (serviceResults.length) {
    groups.push({ type: "services", label: "Services", items: serviceResults });
  }
  if (propertyResults.length) {
    groups.push({ type: "properties", label: "Properties", items: propertyResults });
  }
  if (profileResults.length) {
    groups.push({ type: "profiles", label: "People", items: profileResults });
  }
  if (locationMatches.length) {
    groups.push({ type: "locations", label: "Locations", items: locationMatches });
  }
  if (productResults.length) {
    groups.push({ type: "products", label: "Products", items: productResults });
  }

  return groups;
}

import { governStorefrontQuery } from "@/lib/discovery/query-governance";

interface AcShopRow { id: string; name: string; slug: string | null; subcategory: string | null; address: string | null; region: string | null; city: string | null; logo_url: string | null; rating: number | null; vertical: string | null; }
interface AcProductRow { id: string; name: string; price: number | null; category: string | null; image_url: string | null; }
interface AcPropertyRow { id: string; name: string | null; address: string | null; city: string | null; property_type: string | null; }
interface AcServiceRow { id: string; title: string; category: string | null; city: string | null; price: number | null; rating: number | null; image_url: string | null; }
interface AcProfileRow { id: string; full_name: string | null; avatar_url: string | null; city: string | null; role: string | null; }

async function fetchAutocompleteShops(q: string): Promise<SearchResult[]> {
  let query = db
    .from("storefront_pages")
    .select("id, name, slug, subcategory, address, region, city, logo_url, rating, vertical")
    .ilike("name", `%${q}%`)
    .limit(5);
  query = governStorefrontQuery(query, "autocomplete");

  const { data } = await query;
  return (data ?? []).map((s: AcShopRow) => ({
    id: s.id,
    type: "shop" as const,
    title: s.name,
    subtitle: [s.subcategory, s.region || s.address || s.city].filter(Boolean).join(" · "),
    imageUrl: s.logo_url ?? undefined,
    slug: s.slug ?? undefined,
    rating: s.rating ?? undefined,
    vertical: s.vertical ?? undefined,
  }));
}

async function fetchAutocompleteProducts(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("seed_products")
    .select("id, name, price, category, image_url")
    .ilike("name", `%${q}%`)
    .limit(4);

  return (data ?? []).map((p: AcProductRow) => ({
    id: p.id,
    type: "product" as const,
    title: p.name,
    subtitle: p.category ?? undefined,
    imageUrl: p.image_url ?? undefined,
    price: p.price ?? undefined,
  }));
}

async function fetchAutocompleteProperties(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("properties")
    .select("id, name, address, city, property_type")
    .or(`name.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`)
    .limit(4);

  return (data ?? []).map((r: AcPropertyRow) => ({
    id: r.id,
    type: "property" as const,
    title: r.name || r.address || "Property",
    subtitle: [r.property_type, r.city].filter(Boolean).join(" · "),
    city: r.city ?? undefined,
    propertyType: r.property_type ?? undefined,
  }));
}

async function fetchAutocompleteServices(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("listings")
    .select("id, title, category, city, price, rating, image_url")
    .or(`title.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(4);

  return (data ?? []).map((r: AcServiceRow) => ({
    id: r.id,
    type: "service" as const,
    title: r.title,
    subtitle: [r.category, r.city].filter(Boolean).join(" · "),
    imageUrl: r.image_url ?? undefined,
    rating: r.rating ?? undefined,
    price: r.price ?? undefined,
  }));
}

async function fetchAutocompleteProfiles(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, city, role")
    .ilike("full_name", `%${q}%`)
    .limit(3);

  return (data ?? []).map((r: AcProfileRow) => ({
    id: r.id,
    type: "profile" as const,
    title: r.full_name || "User",
    subtitle: [r.role, r.city].filter(Boolean).join(" · "),
    imageUrl: r.avatar_url ?? undefined,
    city: r.city ?? undefined,
  }));
}

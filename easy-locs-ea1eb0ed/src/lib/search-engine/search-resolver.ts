/**
 * Search Resolver — Cross-domain orchestrator.
 * Delegates all logic to atomic pipeline units.
 */
import type { SearchState, SearchResult, AutocompleteGroup } from "./search-types";
import { guardSearchInput } from "./pipeline/search.input.guard";
import { fetchStorefronts } from "./pipeline/search.fetch.storefronts";
import { fetchProducts } from "./pipeline/search.fetch.products";
import { fetchProperties } from "./pipeline/search.fetch.properties";
import { fetchServices } from "./pipeline/search.fetch.services";
import { fetchProfiles } from "./pipeline/search.fetch.profiles";
import { matchTaxonomy } from "./pipeline/search.fetch.taxonomy";
import { matchLocations } from "./pipeline/search.fetch.locations";
import { applyRadiusFilter } from "./pipeline/search.filter.radius";
import { filterByVertical } from "./pipeline/search.filter.vertical";
import { rankResults } from "./pipeline/search.rank.relevance";


export async function resolveSearch(
  state: SearchState
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const guard = guardSearchInput(state);
  if (!guard.valid) {
    console.warn("[search] input guard failed:", guard.reason);
    return { results: [], totalCount: 0 };
  }

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
  const ranked = rankResults(geoFiltered, state.sort);
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

import { db } from "@/services/db";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

async function fetchAutocompleteShops(q: string): Promise<SearchResult[]> {
  let query = db
    .from("storefront_pages")
    .select("id, name, slug, subcategory, address, region, city, logo_url, rating, vertical")
    .ilike("name", `%${q}%`)
    .limit(5);
  query = governStorefrontQuery(query, "autocomplete");

  const { data } = await query;
  return (data ?? []).map((s: any) => ({
    id: s.id,
    type: "shop" as const,
    title: s.name,
    subtitle: [s.subcategory, s.region || s.address || s.city].filter(Boolean).join(" · "),
    imageUrl: s.logo_url,
    slug: s.slug,
    rating: s.rating,
    vertical: s.vertical,
  }));
}

async function fetchAutocompleteProducts(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("seed_products")
    .select("id, name, price, category, image_url")
    .ilike("name", `%${q}%`)
    .limit(4);

  return (data ?? []).map((p: any) => ({
    id: p.id,
    type: "product" as const,
    title: p.name,
    subtitle: p.category,
    imageUrl: p.image_url,
    price: p.price,
    currency: p.currency || undefined,
  }));
}

async function fetchAutocompleteProperties(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("properties")
    .select("id, name, address, city, property_type")
    .or(`name.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`)
    .limit(4);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "property" as const,
    title: r.name || r.address || "Property",
    subtitle: [r.property_type, r.city].filter(Boolean).join(" · "),
    city: r.city,
    propertyType: r.property_type,
  }));
}

async function fetchAutocompleteServices(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("listings")
    .select("id, title, category, city, price, rating, image_url")
    .or(`title.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(4);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "service" as const,
    title: r.title,
    subtitle: [r.category, r.city].filter(Boolean).join(" · "),
    imageUrl: r.image_url,
    rating: r.rating,
    price: r.price,
  }));
}

async function fetchAutocompleteProfiles(q: string): Promise<SearchResult[]> {
  const { data } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, city, role")
    .ilike("full_name", `%${q}%`)
    .limit(3);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: "profile" as const,
    title: r.full_name || "User",
    subtitle: [r.role, r.city].filter(Boolean).join(" · "),
    imageUrl: r.avatar_url,
    city: r.city,
  }));
}

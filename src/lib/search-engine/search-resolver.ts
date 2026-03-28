/**
 * Search Resolver — Orchestrator only.
 * Delegates all logic to atomic pipeline units.
 * No inline fetch, filter, rank, or map logic.
 */
import type { SearchState, SearchResult, AutocompleteGroup } from "./search-types";
import { guardSearchInput } from "./pipeline/search.input.guard";
import { fetchStorefronts } from "./pipeline/search.fetch.storefronts";
import { fetchProducts } from "./pipeline/search.fetch.products";
import { matchTaxonomy } from "./pipeline/search.fetch.taxonomy";
import { matchLocations } from "./pipeline/search.fetch.locations";
import { applyRadiusFilter } from "./pipeline/search.filter.radius";
import { rankResults } from "./pipeline/search.rank.relevance";
import { mergeResults } from "./pipeline/search.merge.results";

export async function resolveSearch(
  state: SearchState
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const guard = guardSearchInput(state);
  if (!guard.valid) {
    console.warn("[search] input guard failed:", guard.reason);
    return { results: [], totalCount: 0 };
  }

  // Parallel fetch from independent sources
  const [shops, products] = await Promise.all([
    fetchStorefronts(state),
    fetchProducts(state.query),
  ]);

  // Geo filter
  const filtered = applyRadiusFilter(shops, state.lat, state.lng, state.radiusKm);

  // Rank
  const ranked = rankResults(filtered, state.sort);

  // Merge shops + products (shops first, products appended)
  const allResults = mergeResults(ranked, products);

  return { results: allResults, totalCount: allResults.length };
}

export async function resolveAutocomplete(
  query: string,
  state: SearchState
): Promise<AutocompleteGroup[]> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  // Parallel: taxonomy (sync), shops (async), locations (sync), products (async)
  const taxonomyMatches = matchTaxonomy(q);
  const locationMatches = matchLocations(q);

  const [shopResults, productResults] = await Promise.all([
    fetchAutocompleteShops(q),
    fetchAutocompleteProducts(q),
  ]);

  const groups: AutocompleteGroup[] = [];

  if (taxonomyMatches.length) {
    groups.push({ type: "categories", label: "Categories", items: taxonomyMatches.slice(0, 6) });
  }
  if (shopResults.length) {
    groups.push({ type: "shops", label: "Shops", items: shopResults });
  }
  if (locationMatches.length) {
    groups.push({ type: "locations", label: "Locations", items: locationMatches });
  }
  if (productResults.length) {
    groups.push({ type: "products", label: "Products", items: productResults });
  }

  return groups;
}

// ── Autocomplete-specific fetchers (small, focused) ──

import { supabase } from "@/integrations/supabase/client";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";

const db = supabase as any;

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

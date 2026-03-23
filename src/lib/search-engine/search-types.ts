/**
 * Canonical Search Types — Single source of truth for all search state.
 * Used by search, map, list, radar, heatmap, and all discovery surfaces.
 */
import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";

// ── Canonical search state ──
export interface SearchState {
  query: string;
  vertical?: Vertical | "all";
  cluster?: string;
  subcategory?: string;
  city?: string;
  district?: string;
  country?: string;
  radiusKm: number;
  lat?: number;
  lng?: number;
  mode: "list" | "map" | "heatmap";
  sort: "relevance" | "rating" | "distance" | "trending";
  // Filters
  openNow?: boolean;
  minRating?: number;
  sourceType?: string;
  claimedOnly?: boolean;
  // Pagination
  page: number;
  limit: number;
}

export const DEFAULT_SEARCH_STATE: SearchState = {
  query: "",
  radiusKm: 5,
  mode: "list",
  sort: "relevance",
  page: 1,
  limit: 50,
};

// ── Radius presets ──
export const RADIUS_OPTIONS = [
  { value: 1, label: "1 km" },
  { value: 3, label: "3 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "District" },
  { value: 100, label: "City" },
  { value: 500, label: "Country" },
] as const;

// ── Search result types ──
export type SearchResultType = "shop" | "product" | "category" | "location";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  rating?: number;
  reviewsCount?: number;
  vertical?: string;
  subcategory?: string;
  district?: string;
  city?: string;
  slug?: string;
  isSponsored?: boolean;
  isOpen?: boolean;
  score?: number;
  price?: number;
  currency?: string;
  shopId?: string;
  badges?: string[];
}

// ── Autocomplete groups ──
export interface AutocompleteGroup {
  type: "categories" | "locations" | "shops" | "products";
  label: string;
  items: SearchResult[];
}

// ── Search suggestion ──
export interface SearchSuggestion {
  text: string;
  type: "recent" | "trending" | "contextual";
  icon?: string;
}

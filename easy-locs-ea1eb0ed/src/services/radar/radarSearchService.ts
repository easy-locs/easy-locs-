import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import type { RadarPoint } from "@/lib/radar/types";
import type { RadarResultItem, RadarVertical } from "@/lib/radar/radar-result-item";
import { mapPointsToResultItems } from "./radarResultMapper";
import type { RadarScoringContext } from "@/lib/radar/radar-score";
import type { RadarFilterValues } from "@/lib/radar/radar-filter-schemas";

export interface RadarSearchRequest {
  query?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  vertical?: RadarVertical;
  filters?: RadarFilterValues;
  sortBy?: "smart" | "nearest" | "best_rated" | "trending" | "price_low" | "price_high";
  limit?: number;
  offset?: number;
  surface?: "radar" | "map" | "search" | "discover" | "home";
  userPreferences?: RadarScoringContext["userPreferences"];
}

export interface RadarSearchResponse {
  items: RadarResultItem[];
  total: number;
  hasMore: boolean;
  searchId: string;
  timing: { fetchMs: number; scoreMs: number; totalMs: number };
}

let searchCounter = 0;

export async function radarSearch(req: RadarSearchRequest): Promise<RadarSearchResponse> {
  const t0 = performance.now();
  const searchId = `rs_${++searchCounter}_${Date.now()}`;

  const points = await fetchCanonicalDiscovery({
    surface: req.surface ?? "radar",
    userLocation: req.lat != null && req.lng != null ? { lat: req.lat, lng: req.lng } : undefined,
  });

  const t1 = performance.now();

  const ctx: RadarScoringContext = {
    userLat: req.lat,
    userLng: req.lng,
    searchQuery: req.query,
    vertical: req.vertical,
    userPreferences: req.userPreferences,
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
  };

  let items = mapPointsToResultItems(points, ctx);

  if (req.vertical) {
    items = items.filter(i => i.type === req.vertical);
  }

  if (req.query && req.query.trim().length > 0) {
    const q = req.query.toLowerCase();
    items = items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q) ||
      (i.subcategory || "").toLowerCase().includes(q) ||
      (i.address || "").toLowerCase().includes(q)
    );
  }

  if (req.filters) {
    items = applyFilters(items, req.filters);
  }

  if (req.radiusKm && req.radiusKm > 0) {
    items = items.filter(i => i.distanceKm == null || i.distanceKm <= req.radiusKm!);
  }

  items = sortItems(items, req.sortBy ?? "smart");

  const t2 = performance.now();
  const total = items.length;
  const offset = req.offset ?? 0;
  const limit = req.limit ?? 80;
  const paged = items.slice(offset, offset + limit);

  return {
    items: paged,
    total,
    hasMore: offset + limit < total,
    searchId,
    timing: {
      fetchMs: Math.round(t1 - t0),
      scoreMs: Math.round(t2 - t1),
      totalMs: Math.round(t2 - t0),
    },
  };
}

function applyFilters(items: RadarResultItem[], filters: RadarFilterValues): RadarResultItem[] {
  let filtered = items;

  if (filters.open_now === true) {
    filtered = filtered.filter(i => i.available !== false);
  }

  if (typeof filters.rating_min === "number" && filters.rating_min > 0) {
    filtered = filtered.filter(i => (i.ratingValue ?? 0) >= (filters.rating_min as number));
  }

  if (filters.distance_max && filters.distance_max !== "any") {
    const maxKm = parseFloat(filters.distance_max as string);
    filtered = filtered.filter(i => i.distanceKm == null || i.distanceKm <= maxKm);
  }

  if (filters.cuisine && typeof filters.cuisine === "string") {
    const c = (filters.cuisine as string).toLowerCase();
    filtered = filtered.filter(i =>
      (i.subcategory || "").toLowerCase().includes(c) ||
      (i.category || "").toLowerCase().includes(c)
    );
  }

  if (typeof filters.price_level === "string" && filters.price_level !== "") {
    const level = parseInt(filters.price_level as string, 10);
    if (!isNaN(level)) {
      filtered = filtered.filter(i => {
        const meta = i.meta as Record<string, unknown>;
        return meta.priceLevel == null || (meta.priceLevel as number) <= level;
      });
    }
  }

  if (filters.listing_type && typeof filters.listing_type === "string") {
    filtered = filtered.filter(i => {
      const meta = i.meta as Record<string, unknown>;
      return !meta.listingType || meta.listingType === filters.listing_type;
    });
  }

  return filtered;
}

function sortItems(items: RadarResultItem[], sortBy: string): RadarResultItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case "smart":
      sorted.sort((a, b) => b.radarScore - a.radarScore);
      break;
    case "nearest":
      sorted.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      break;
    case "best_rated":
      sorted.sort((a, b) => (b.ratingValue ?? 0) - (a.ratingValue ?? 0));
      break;
    case "trending":
      sorted.sort((a, b) => {
        const aS = (a.isSponsored ? 50 : 0) + a.reviewsCount * 0.5 + (a.ratingValue ?? 0) * 5;
        const bS = (b.isSponsored ? 50 : 0) + b.reviewsCount * 0.5 + (b.ratingValue ?? 0) * 5;
        return bS - aS;
      });
      break;
    case "price_low":
      sorted.sort((a, b) => {
        const aP = (a.meta as Record<string, number>).priceLevel ?? 99;
        const bP = (b.meta as Record<string, number>).priceLevel ?? 99;
        return aP - bP;
      });
      break;
    case "price_high":
      sorted.sort((a, b) => {
        const aP = (a.meta as Record<string, number>).priceLevel ?? 0;
        const bP = (b.meta as Record<string, number>).priceLevel ?? 0;
        return bP - aP;
      });
      break;
  }
  return sorted;
}

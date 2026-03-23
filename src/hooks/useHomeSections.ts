/**
 * useHomeSections — Fetches home page sections using the canonical discovery pipeline.
 * Enforces visibility_mode, route_status, display_priority for all home sections.
 */
import { useQuery } from "@tanstack/react-query";
import { useLocationStore } from "@/stores/locationStore";
import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import type { RadarPoint } from "@/lib/radar/types";

export interface HomeShopPreview {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  vertical: string | null;
  address: string | null;
  slug: string;
  ranking_score: number;
  rating: number;
  reviews_count: number;
  distanceKm?: number;
}

function pointToPreview(p: RadarPoint): HomeShopPreview {
  return {
    id: p.id,
    name: p.title,
    logo_url: p.imageUrl ?? null,
    banner_url: p.imageUrl ?? null,
    vertical: p.category ?? null,
    address: p.subtitle ?? null,
    slug: p.slug || p.id,
    ranking_score: p.isSponsored ? 100 : 50,
    rating: p.rating ?? 0,
    reviews_count: p.reviewsCount ?? 0,
    distanceKm: p.distanceKm,
  };
}

export interface HomeSections {
  trending: HomeShopPreview[];
  bestRated: HomeShopPreview[];
  newest: HomeShopPreview[];
  nearYou: HomeShopPreview[];
}

export function useHomeSections() {
  const location = useLocationStore((s) => s.currentLocation);
  const isFallback = useLocationStore((s) => s.isFallback);

  return useQuery({
    queryKey: ["home-sections-canonical", location?.lat?.toFixed(2)],
    queryFn: async (): Promise<HomeSections> => {
      const userLoc = location && !isFallback ? { lat: location.lat, lng: location.lng } : undefined;

      // Single canonical fetch — already visibility+route filtered
      const all = await fetchCanonicalDiscovery({
        surface: "home",
        userLocation: userLoc,
        limit: 200,
      });

      const previews = all.map(pointToPreview);

      // Trending: top by ranking/priority (already sorted by display_priority)
      const trending = previews.slice(0, 10);

      // Best rated: sort by rating
      const bestRated = [...previews]
        .filter((p) => p.rating > 0 && p.reviews_count > 0)
        .sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count)
        .slice(0, 10);

      // Near you: sort by distance
      const nearYou = [...previews]
        .filter((p) => p.distanceKm != null)
        .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
        .slice(0, 8);

      // "Newest" — we don't have created_at in RadarPoint, so use last items from pipeline
      // which are lower priority / recently added
      const newest = previews.slice(Math.max(0, previews.length - 10));

      return { trending, bestRated, newest, nearYou };
    },
    staleTime: 60_000,
  });
}

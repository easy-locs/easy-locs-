/**
 * useHomeSections — Fetches home page sections SEPARATED BY VERTICAL.
 * RULE: Never mix verticals in sections. Each section = one vertical.
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

export interface VerticalSection {
  trending: HomeShopPreview[];
  bestRated: HomeShopPreview[];
  newest: HomeShopPreview[];
  nearYou: HomeShopPreview[];
}

export interface HomeSections {
  /** @deprecated Use vertical-specific sections */
  trending: HomeShopPreview[];
  bestRated: HomeShopPreview[];
  newest: HomeShopPreview[];
  nearYou: HomeShopPreview[];
  /** Vertical-separated sections — the correct way */
  food: VerticalSection;
  hotel: VerticalSection;
  services: VerticalSection;
  grocery: VerticalSection;
  shops: VerticalSection;
}

function buildVerticalSection(previews: HomeShopPreview[]): VerticalSection {
  const trending = previews.slice(0, 10);
  const bestRated = [...previews]
    .filter(p => p.rating > 0 && p.reviews_count > 0)
    .sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count)
    .slice(0, 10);
  const nearYou = [...previews]
    .filter(p => p.distanceKm != null)
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    .slice(0, 8);
  const newest = previews.slice(Math.max(0, previews.length - 10));
  return { trending, bestRated, newest, nearYou };
}

const VERTICALS = ["food", "hotel", "services", "grocery", "shops"] as const;

export function useHomeSections() {
  const location = useLocationStore((s) => s.currentLocation);
  const isFallback = useLocationStore((s) => s.isFallback);

  return useQuery({
    queryKey: ["home-sections-canonical", location?.lat?.toFixed(2)],
    queryFn: async (): Promise<HomeSections> => {
      const userLoc = location && !isFallback ? { lat: location.lat, lng: location.lng } : undefined;

      // Fetch per vertical to guarantee NO mixing
      const fetches = VERTICALS.map(v =>
        fetchCanonicalDiscovery({
          surface: "home",
          userLocation: userLoc,
          vertical: v,
          limit: 50,
        }).then(pts => ({ vertical: v, previews: pts.map(pointToPreview) }))
      );

      const results = await Promise.all(fetches);

      const byVertical: Record<string, HomeShopPreview[]> = {};
      for (const r of results) byVertical[r.vertical] = r.previews;

      const food = buildVerticalSection(byVertical.food ?? []);
      const hotel = buildVerticalSection(byVertical.hotel ?? []);
      const services = buildVerticalSection(byVertical.services ?? []);
      const grocery = buildVerticalSection(byVertical.grocery ?? []);
      const shops = buildVerticalSection(byVertical.shops ?? []);

      // Legacy compat — all combined (deprecated)
      const all = results.flatMap(r => r.previews);
      const trending = all.slice(0, 10);
      const bestRated = [...all].filter(p => p.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
      const nearYou = [...all].filter(p => p.distanceKm != null).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)).slice(0, 8);
      const newest = all.slice(Math.max(0, all.length - 10));

      return { trending, bestRated, newest, nearYou, food, hotel, services, grocery, shops };
    },
    staleTime: 60_000,
  });
}

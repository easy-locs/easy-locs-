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
    vertical: p.vertical ?? p.category ?? null,
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

const VERTICAL_TO_SECTION: Record<string, typeof VERTICALS[number]> = {
  food: "food",
  restaurant: "food",
  dining: "food",
  cafe: "food",
  hotel: "hotel",
  stay: "hotel",
  hostel: "hotel",
  motel: "hotel",
  accommodation: "hotel",
  services: "services",
  home_services: "services",
  healthcare: "services",
  mobility: "services",
  grocery: "grocery",
  supermarket: "grocery",
  market: "grocery",
  shops: "shops",
  retail: "shops",
  property: "shops",
  experiences: "shops",
};

function resolveHomeSection(raw: string | null | undefined): typeof VERTICALS[number] | null {
  if (!raw) return null;
  return VERTICAL_TO_SECTION[raw.toLowerCase().trim()] ?? null;
}

export function useHomeSections() {
  const location = useLocationStore((s) => s.currentLocation);
  const isFallback = useLocationStore((s) => s.isFallback);

  return useQuery({
    queryKey: ["home-sections-canonical", location?.lat?.toFixed(2)],
    queryFn: async (): Promise<HomeSections> => {
      const userLoc = location && !isFallback ? { lat: location.lat, lng: location.lng } : undefined;

      const allPoints = await fetchCanonicalDiscovery({
        surface: "home",
        userLocation: userLoc,
        limit: 250,
      });

      const allPreviews = allPoints.map(pointToPreview);

      const byVertical: Record<string, HomeShopPreview[]> = {};
      for (const v of VERTICALS) byVertical[v] = [];
      for (const p of allPreviews) {
        const section = resolveHomeSection(p.vertical);
        if (section && byVertical[section]) byVertical[section].push(p);
      }

      const food = buildVerticalSection(byVertical.food ?? []);
      const hotel = buildVerticalSection(byVertical.hotel ?? []);
      const services = buildVerticalSection(byVertical.services ?? []);
      const grocery = buildVerticalSection(byVertical.grocery ?? []);
      const shops = buildVerticalSection(byVertical.shops ?? []);

      const trending = allPreviews.slice(0, 10);
      const bestRated = [...allPreviews].filter(p => p.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
      const nearYou = [...allPreviews].filter(p => p.distanceKm != null).sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)).slice(0, 8);
      const newest = allPreviews.slice(Math.max(0, allPreviews.length - 10));

      return { trending, bestRated, newest, nearYou, food, hotel, services, grocery, shops };
    },
    staleTime: 60_000,
  });
}

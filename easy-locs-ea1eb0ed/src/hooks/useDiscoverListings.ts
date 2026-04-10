/**
 * useDiscoverListings — Canonical pipeline-backed hook for DiscoverPage & ShopsPage.
 * No manual radius — results driven by geo live station + serviceability.
 */
import { useQuery } from "@tanstack/react-query";
import { useGeoStore } from "@/lib/geo/geo-store";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { fetchCanonicalDiscovery, type DiscoverySurface } from "@/lib/discovery/canonical-discovery-pipeline";
import type { RadarPoint } from "@/lib/radar/types";

export interface DiscoverListing {
  id: string;
  name: string;
  slug: string;
  vertical: string | null;
  subcategory: string | null;
  address: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rating: number;
  reviews_count: number;
  distanceKm?: number;
  ranking_score: number;
  latitude: number | null;
  longitude: number | null;
}

function pointToListing(p: RadarPoint): DiscoverListing {
  return {
    id: p.id,
    name: p.title,
    slug: p.slug || p.id,
    vertical: p.category ?? null,
    subcategory: p.subcategory ?? null,
    address: p.subtitle ?? null,
    logo_url: p.imageUrl ?? null,
    banner_url: p.imageUrl ?? null,
    rating: p.rating ?? 0,
    reviews_count: p.reviewsCount ?? 0,
    distanceKm: p.distanceKm,
    ranking_score: p.isSponsored ? 100 : 50,
    latitude: p.lat,
    longitude: p.lng,
  };
}

export function useDiscoverListings(surface: DiscoverySurface = "discover") {
  const geoPoint = useGeoStore((s) => s.point);
  const searchQuery = useDiscoveryStore((s) => s.searchQuery);
  const vertical = useDiscoveryStore((s) => s.vertical);
  const subcategory = useDiscoveryStore((s) => s.subcategory);

  return useQuery({
    queryKey: ["discover-canonical", surface, searchQuery, vertical, subcategory, geoPoint?.lat?.toFixed(2)],
    queryFn: async () => {
      const points = await fetchCanonicalDiscovery({
        surface,
        searchQuery: searchQuery || undefined,
        userLocation: geoPoint ? { lat: geoPoint.lat, lng: geoPoint.lng } : undefined,
        vertical: vertical ?? undefined,
        subcategory: subcategory ?? undefined,
        limit: 300,
      });
      return points.map(pointToListing);
    },
    staleTime: 60_000,
  });
}

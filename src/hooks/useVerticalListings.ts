/**
 * useVerticalListings — Fetches UNIFIED data for a given vertical.
 * Uses CANONICAL discovery pipeline — visibility, routing, radius enforced.
 */
import { useQuery } from "@tanstack/react-query";
import { useGeoStore } from "@/lib/geo/geo-store";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import { verticalToRadarCategory } from "@/lib/taxonomy/world-class-taxonomy";

export interface ListingItem {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  subcategory: string | null;
  address: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rating: number;
  reviews_count: number;
  latitude: number | null;
  longitude: number | null;
  ranking_score: number;
  distanceKm?: number;
}

export function useVerticalListings(vertical: string, subcategory?: string | null, city?: string | null) {
  const geoPoint = useGeoStore((s) => s.point);
  const radiusKm = useDiscoveryStore((s) => s.radiusKm);

  return useQuery({
    queryKey: ["vertical-listings", vertical, subcategory ?? "all", city ?? "all", geoPoint?.lat?.toFixed(2), radiusKm],
    queryFn: async () => {
      const radarCategory = verticalToRadarCategory(vertical);
      const points = await fetchCanonicalDiscovery({
        surface: "vertical",
        userLocation: geoPoint ? { lat: geoPoint.lat, lng: geoPoint.lng } : undefined,
        category: radarCategory,
        subcategory: subcategory ?? undefined,
        vertical,
        city: city ?? undefined,
        radiusKm: radiusKm ?? undefined,
        limit: 100,
      });

      return points.map((p) => ({
        id: p.id,
        name: p.title,
        slug: p.slug || p.id,
        vertical,
        subcategory: p.subcategory ?? null,
        address: p.subtitle ?? null,
        logo_url: p.imageUrl ?? null,
        banner_url: p.imageUrl ?? null,
        rating: p.rating ?? 0,
        reviews_count: p.reviewsCount ?? 0,
        latitude: p.lat,
        longitude: p.lng,
        ranking_score: p.isSponsored ? 100 : 50,
        distanceKm: p.distanceKm,
      }));
    },
    staleTime: 60_000,
  });
}

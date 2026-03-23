/**
 * useVerticalListings — Fetches UNIFIED data (storefront_pages + seed_merchants)
 * for a given vertical with optional subcategory filter.
 * Single reusable hook for all hub pages.
 */
import { useQuery } from "@tanstack/react-query";
import { useGeoStore } from "@/lib/geo/geo-store";
import { fetchUnifiedPoints } from "@/lib/radar/fetchUnifiedPoints";

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

const VERTICAL_TO_CATEGORY: Record<string, string> = {
  food: "food",
  grocery: "grocery",
  retail: "shops",
  services: "services",
  real_estate: "property",
  healthcare: "services",
  electronics: "shops",
  gifts: "shops",
  pets: "shops",
};

export function useVerticalListings(vertical: string, subcategory?: string | null) {
  const geoPoint = useGeoStore((s) => s.point);

  return useQuery({
    queryKey: ["vertical-listings", vertical, subcategory ?? "all", geoPoint?.lat?.toFixed(2)],
    queryFn: async () => {
      const radarCategory = VERTICAL_TO_CATEGORY[vertical] as any;
      const points = await fetchUnifiedPoints({
        userLocation: geoPoint ? { lat: geoPoint.lat, lng: geoPoint.lng } : undefined,
        category: radarCategory,
        subcategory: subcategory ?? undefined,
        vertical,
        limit: 100,
      });

      // Map RadarPoint[] → ListingItem[]
      return points.map((p) => ({
        id: p.id,
        name: p.title,
        slug: p.id, // Use id as slug fallback
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

/**
 * useVerticalListings — Fetches storefront_pages for a given vertical with optional subcategory filter.
 * Single reusable hook for all hub pages.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGeoStore } from "@/lib/geo/geo-store";

const BASE_SELECT = "id, name, slug, vertical, subcategory, address, logo_url, banner_url, rating, reviews_count, latitude, longitude, ranking_score, created_at";

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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function useVerticalListings(vertical: string, subcategory?: string | null) {
  const geoPoint = useGeoStore((s) => s.point);

  return useQuery({
    queryKey: ["vertical-listings", vertical, subcategory ?? "all"],
    queryFn: async () => {
      let query = (supabase as any)
        .from("storefront_pages")
        .select(BASE_SELECT)
        .eq("vertical", vertical)
        .order("ranking_score", { ascending: false })
        .order("rating", { ascending: false })
        .limit(100);

      if (subcategory) {
        query = query.eq("subcategory", subcategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      let items: ListingItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        vertical: r.vertical,
        subcategory: r.subcategory,
        address: r.address,
        logo_url: r.logo_url,
        banner_url: r.banner_url,
        rating: Number(r.rating) || 0,
        reviews_count: Number(r.reviews_count) || 0,
        latitude: r.latitude ? Number(r.latitude) : null,
        longitude: r.longitude ? Number(r.longitude) : null,
        ranking_score: Number(r.ranking_score) || 0,
      }));

      // Enrich with distance if we have user location
      if (geoPoint) {
        items = items.map((item) => ({
          ...item,
          distanceKm:
            item.latitude && item.longitude
              ? haversineKm(geoPoint.lat, geoPoint.lng, item.latitude, item.longitude)
              : undefined,
        }));
      }

      return items;
    },
    staleTime: 60_000,
  });
}

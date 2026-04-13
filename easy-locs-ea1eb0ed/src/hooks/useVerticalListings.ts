/**
 * useVerticalListings — Fetches UNIFIED data for a given vertical.
 * Uses CANONICAL discovery pipeline — serviceability-driven, no manual radius.
 */
import { useQuery } from "@tanstack/react-query";
import { useGeoStore } from "@/lib/geo/geo-store";
import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import { verticalToRadarCategory } from "@/lib/taxonomy/taxonomy-aliases";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_SERVICES } from "@/data/fallback-services";
import { FALLBACK_RESTAURANTS } from "@/data/fallback-restaurants";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";

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

export function useVerticalListings(vertical: string, subcategory?: string | null) {
  const geoPoint = useGeoStore((s) => s.point);

  return useQuery({
    queryKey: ["vertical-listings", vertical, subcategory ?? "all", geoPoint?.lat?.toFixed(2)],
    queryFn: async () => {
      const radarCategory = verticalToRadarCategory(vertical);
      let points: Awaited<ReturnType<typeof fetchCanonicalDiscovery>> = [];
      try {
        points = await fetchCanonicalDiscovery({
          surface: "vertical",
          userLocation: geoPoint ? { lat: geoPoint.lat, lng: geoPoint.lng } : undefined,
          category: radarCategory,
          subcategory: subcategory ?? undefined,
          vertical,
          limit: 100,
        });
      } catch (err) {
        console.warn("[useVerticalListings] canonical pipeline error for", vertical, err);
      }

      const items = points.map((p) => ({
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

      if (items.length === 0 && vertical === "food") {
        const subMatch = (r: typeof FALLBACK_RESTAURANTS[0]) => {
          if (!subcategory) return true;
          return r.subcategory === subcategory;
        };
        const filtered = FALLBACK_RESTAURANTS.filter(subMatch);
        return filtered.map(r => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          vertical: "food",
          subcategory: r.subcategory,
          address: r.address,
          logo_url: r.logo_url,
          banner_url: r.banner_url,
          rating: r.rating,
          reviews_count: r.reviews_count,
          latitude: r.latitude,
          longitude: r.longitude,
          ranking_score: r.ranking_score,
          distanceKm: undefined,
        }));
      }

      if (items.length === 0 && vertical === "shops") {
        const subMatch = (s: typeof FALLBACK_SHOPS[0]) => {
          if (!subcategory) return true;
          return s.subcategory === subcategory;
        };
        const filtered = FALLBACK_SHOPS.filter(subMatch);
        return filtered.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          vertical: "shops",
          subcategory: s.subcategory,
          address: s.address,
          logo_url: s.logo_url,
          banner_url: s.banner_url,
          rating: s.rating,
          reviews_count: s.reviews_count,
          latitude: s.latitude,
          longitude: s.longitude,
          ranking_score: s.ranking_score,
          distanceKm: undefined,
        }));
      }

      if (items.length === 0 && vertical === "grocery") {
        const subMatch = (g: typeof FALLBACK_GROCERY[0]) => {
          if (!subcategory) return true;
          return g.subcategory === subcategory;
        };
        const filtered = FALLBACK_GROCERY.filter(subMatch);
        return filtered.map(g => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          vertical: "grocery",
          subcategory: g.subcategory,
          address: g.address,
          logo_url: g.logo_url,
          banner_url: g.banner_url,
          rating: g.rating,
          reviews_count: g.reviews_count,
          latitude: g.latitude,
          longitude: g.longitude,
          ranking_score: g.ranking_score,
          distanceKm: undefined,
        }));
      }

      if (items.length === 0 && vertical === "services") {
        const subMatch = (s: typeof FALLBACK_SERVICES[0]) => {
          if (!subcategory) return true;
          return s.subcategory === subcategory;
        };
        const filtered = FALLBACK_SERVICES.filter(subMatch);
        return filtered.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          vertical: "services",
          subcategory: s.subcategory,
          address: s.address,
          logo_url: s.logo_url,
          banner_url: s.banner_url,
          rating: s.rating,
          reviews_count: s.reviews_count,
          latitude: s.latitude,
          longitude: s.longitude,
          ranking_score: s.ranking_score,
          distanceKm: undefined,
        }));
      }

      if (items.length === 0 && vertical === "stay") {
        const subMatch = (h: typeof FALLBACK_HOTELS[0]) => {
          if (!subcategory) return true;
          return h.subcategory === subcategory;
        };
        const filtered = FALLBACK_HOTELS.filter(subMatch);
        return filtered.map(h => ({
          id: h.id,
          name: h.name,
          slug: h.slug,
          vertical: "stay",
          subcategory: h.subcategory,
          address: h.address,
          logo_url: h.logo_url,
          banner_url: h.banner_url,
          rating: h.rating,
          reviews_count: h.reviews_count,
          latitude: h.latitude,
          longitude: h.longitude,
          ranking_score: h.ranking_score,
          distanceKm: undefined,
        }));
      }

      if (items.length === 0 && vertical === "property") {
        const intentMatch = (p: typeof FALLBACK_PROPERTIES[0]) => {
          if (!subcategory) return true;
          if (subcategory === "buy") return p.intent === "buy";
          if (subcategory === "rent") return p.intent === "rent";
          if (subcategory === "new_projects" || subcategory === "offplan" || subcategory === "project") return p.intent === "project";
          return p.subcategory === subcategory;
        };
        const filtered = FALLBACK_PROPERTIES.filter(intentMatch);
        return filtered.map(p => ({
          id: p.id,
          name: p.title,
          slug: p.slug,
          vertical: "property",
          subcategory: p.subcategory,
          address: p.area,
          logo_url: p.image,
          banner_url: p.image,
          rating: 0,
          reviews_count: 0,
          latitude: p.latitude,
          longitude: p.longitude,
          ranking_score: p.ranking_score,
          distanceKm: undefined,
        }));
      }

      return items;
    },
    staleTime: 60_000,
  });
}

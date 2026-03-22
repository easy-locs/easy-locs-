/**
 * useRadarResults — Returns nearby entities for radar view.
 * Only shows launched shops from storefront_pages.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationStore } from "@/stores/locationStore";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

const VERTICAL_TO_TYPE: Record<string, GeoEntity["type"]> = {
  food: "restaurant",
  grocery: "grocery",
  services: "service",
  shops: "shop",
};

export function useRadarResults(opts?: { type?: string; radiusKm?: number }) {
  const [entities, setEntities] = useState<GeoEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocationStore((s) => s.currentLocation);

  useEffect(() => {
    setLoading(true);
    (supabase as any)
      .from("storefront_pages")
      .select("id, name, latitude, longitude, logo_url, banner_url, slug, vertical, category, subcategory, address, rating, ranking_score")
      .eq("launch_status", "launched")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("ranking_score", { ascending: false })
      .limit(100)
      .then(({ data }: any) => {
        const mapped: GeoEntity[] = (data ?? []).map((s: any) => ({
          id: s.id,
          type: (VERTICAL_TO_TYPE[s.vertical] || "shop") as GeoEntity["type"],
          name: s.name || "Business",
          title: s.name || "Business",
          subtitle: s.address || s.category || s.vertical || undefined,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          imageUrl: s.logo_url || s.banner_url,
          image_url: s.logo_url || s.banner_url,
          slug: s.slug,
          address: s.address,
          rating: s.rating ? Number(s.rating) : undefined,
          category: s.category,
        }));
        setEntities(opts?.type && opts.type !== "all" ? mapped.filter((e) => e.type === opts.type) : mapped);
        setLoading(false);
      });
  }, [location?.lat, opts?.type]);

  return { entities, loading, location };
}

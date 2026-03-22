/**
 * useRadarResults — Returns nearby entities for radar view.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationStore } from "@/stores/locationStore";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

export function useRadarResults(opts?: { type?: string; radiusKm?: number }) {
  const [entities, setEntities] = useState<GeoEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocationStore((s) => s.currentLocation);

  useEffect(() => {
    setLoading(true);
    // Load storefront_pages as nearby entities
    (supabase as any)
      .from("storefront_pages")
      .select("id, name, latitude, longitude, logo_url, slug, vertical, address")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(50)
      .then(({ data }: any) => {
        const mapped: GeoEntity[] = (data ?? []).map((s: any) => ({
          id: s.id,
          type: (s.vertical === "food" ? "restaurant" : "shop") as GeoEntity["type"],
          name: s.name || "Business",
          lat: s.latitude,
          lng: s.longitude,
          imageUrl: s.logo_url,
          slug: s.slug,
          address: s.address,
        }));
        setEntities(opts?.type && opts.type !== "all" ? mapped.filter((e) => e.type === opts.type) : mapped);
        setLoading(false);
      });
  }, [location?.lat, opts?.type]);

  return { entities, loading, location };
}

/**
 * useRadarResults — Returns nearby entities for radar/discovery views.
 * Uses unified pipeline: storefront_pages + seed_merchants.
 */
import { useState, useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { fetchUnifiedPoints } from "@/lib/radar/fetchUnifiedPoints";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

const CATEGORY_TO_TYPE: Record<string, GeoEntity["type"]> = {
  food: "restaurant",
  grocery: "grocery",
  services: "service",
  shops: "shop",
  property: "property",
};

export function useRadarResults(opts?: { type?: string; radiusKm?: number }) {
  const [entities, setEntities] = useState<GeoEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocationStore((s) => s.currentLocation);

  useEffect(() => {
    setLoading(true);
    fetchUnifiedPoints({
      userLocation: location ? { lat: location.lat, lng: location.lng } : undefined,
    })
      .then((points) => {
        const mapped: GeoEntity[] = points.map((p) => ({
          id: p.id,
          type: (CATEGORY_TO_TYPE[p.category] || "shop") as GeoEntity["type"],
          name: p.title,
          title: p.title,
          subtitle: p.subtitle || undefined,
          lat: p.lat,
          lng: p.lng,
          imageUrl: p.imageUrl || undefined,
          image_url: p.imageUrl || undefined,
          rating: p.rating ?? undefined,
          category: p.subcategory || p.category,
          address: p.subtitle || undefined,
        }));
        setEntities(
          opts?.type && opts.type !== "all"
            ? mapped.filter((e) => e.type === opts.type)
            : mapped
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("[useRadarResults] fetch error:", err);
        setLoading(false);
      });
  }, [location?.lat, opts?.type]);

  return { entities, loading, location };
}

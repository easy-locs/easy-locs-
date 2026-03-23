/**
 * useRadarResults — Returns nearby entities for radar/discovery views.
 * Uses CANONICAL discovery pipeline — visibility, routing, radius enforced.
 */
import { useState, useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

const CATEGORY_TO_TYPE: Record<string, GeoEntity["type"]> = {
  food: "restaurant",
  grocery: "grocery",
  services: "service",
  shops: "shop",
  property: "property",
};

export function useRadarResults(opts?: { type?: string; radiusKm?: number; surface?: "radar" | "map" | "search" | "discover" | "home" }) {
  const [entities, setEntities] = useState<GeoEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocationStore((s) => s.currentLocation);
  const radiusKm = useDiscoveryStore((s) => s.radiusKm);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCanonicalDiscovery({
      surface: opts?.surface ?? "discover",
      userLocation: location ? { lat: location.lat, lng: location.lng } : undefined,
      radiusKm: opts?.radiusKm ?? radiusKm ?? undefined,
    })
      .then((points) => {
        if (cancelled) return;
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
          slug: p.slug || undefined,
        }));
        setEntities(
          opts?.type && opts.type !== "all"
            ? mapped.filter((e) => e.type === opts.type)
            : mapped
        );
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[useRadarResults] fetch error:", err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [location?.lat, opts?.type, radiusKm]);

  return { entities, loading, location };
}

/**
 * useRadarResults — Returns nearby entities for radar/discovery views.
 * Uses CANONICAL discovery pipeline — serviceability-driven, no manual radius.
 */
import { useState, useEffect } from "react";
import { useLocationStore } from "@/stores/locationStore";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { fetchCanonicalDiscovery } from "@/lib/discovery/canonical-discovery-pipeline";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

const CATEGORY_TO_TYPE: Record<string, GeoEntity["type"]> = {
  food: "restaurant",
  grocery: "grocery",
  services: "service",
  shops: "shop",
  property: "property",
  healthcare: "service",
  mobility: "service",
  experiences: "service",
};

export function useRadarResults(opts?: { type?: string; surface?: "radar" | "map" | "search" | "discover" | "home" }) {
  const [entities, setEntities] = useState<(GeoEntity & { isSponsored?: boolean; reviewsCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocationStore((s) => s.currentLocation);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCanonicalDiscovery({
      surface: opts?.surface ?? "discover",
      userLocation: location ? { lat: location.lat, lng: location.lng } : undefined,
    })
      .then((points) => {
        if (cancelled) return;
        const mapped = points.map((p) => ({
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
          distance: p.distanceKm,
          isSponsored: p.isSponsored ?? false,
          reviewsCount: p.reviewsCount ?? 0,
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
  }, [effectiveLat, effectiveLng, opts?.type]);

  return { entities, loading, location };
}

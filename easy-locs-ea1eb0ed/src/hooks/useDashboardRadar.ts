import { useMemo } from "react";
import { useRadarResults, type RadarEntity } from "./useRadarResults";
import type { RadarResultItem, RadarVertical } from "@/lib/radar/radar-result-item";
import {
  formatDistanceLabel,
  formatRatingLabel,
  buildRoute,
  buildPrimaryAction,
  buildSecondaryActions,
} from "@/lib/radar/radar-result-item";
import { filterAndDemoteResults } from "@/lib/radar/radar-quality-gate";

const TYPE_TO_VERTICAL: Record<string, RadarVertical> = {
  restaurant: "food",
  grocery: "grocery",
  service: "services",
  shop: "shops",
  property: "property",
  hotel: "stay",
};

export function useDashboardRadar(limit = 5) {
  const { entities, loading } = useRadarResults({ surface: "home" });

  const items: RadarResultItem[] = useMemo(() => {
    if (!entities.length) return [];

    const mapped: RadarResultItem[] = entities.map((e) => {
      const typeVertical: RadarVertical =
        TYPE_TO_VERTICAL[e.type] || "shops";
      const resolvedVertical = (e.vertical || typeVertical) as RadarVertical;

      return {
        id: e.id,
        type: resolvedVertical,
        vertical: String(resolvedVertical),
        title: e.name || e.title || "",
        subtitle: e.subtitle || e.address || null,
        priceLabel: null,
        distanceLabel: formatDistanceLabel(e.distance),
        distanceKm: e.distance ?? null,
        ratingValue: e.rating ?? null,
        ratingLabel: formatRatingLabel(e.rating, e.reviewsCount),
        reviewsCount: e.reviewsCount ?? 0,
        statusLabel: null,
        available: true,
        image: e.imageUrl || e.image_url || null,
        lat: e.lat,
        lng: e.lng,
        route: buildRoute({ slug: e.slug, id: e.id }),
        slug: e.slug || null,
        category: e.category || "",
        subcategory: null,
        district: null,
        city: null,
        address: e.address || null,
        isSponsored: e.isSponsored ?? false,
        qualityScore: computeQuickQuality(e),
        radarScore: computeQuickScore(e),
        primaryAction: buildPrimaryAction(resolvedVertical),
        secondaryActions: buildSecondaryActions(resolvedVertical, {
          orbitBindable: true,
          walletBindable: true,
        }),
        orbitBindable: true,
        walletBindable: true,
        meta: {},
      };
    });

    const filtered = filterAndDemoteResults(mapped);
    return filtered.slice(0, limit);
  }, [entities, limit]);

  return { items, loading, totalCount: entities.length };
}

function computeQuickQuality(e: any): number {
  let s = 0;
  if (e.name || e.title) s += 0.25;
  if (e.imageUrl || e.image_url) s += 0.25;
  if (e.rating && e.rating > 0) s += 0.2;
  if (e.address || e.subtitle) s += 0.15;
  if (e.category) s += 0.15;
  return Math.min(1, s);
}

function computeQuickScore(e: any): number {
  let s = 0.3;
  if (e.rating) s += Math.min(e.rating / 5, 1) * 0.3;
  if (e.distance != null) s += Math.max(0, 1 - e.distance / 10) * 0.25;
  if (e.reviewsCount) s += Math.min(e.reviewsCount / 100, 1) * 0.15;
  return Math.min(1, s);
}

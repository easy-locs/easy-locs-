/**
 * useRadarRanking — Atomic: applies ranking + filtering to GeoEntities.
 */
import { useMemo } from "react";
import { rankEntities, DISCOVERY_WEIGHTS, type RankableEntity, type RankContext } from "@/lib/ranking-engine";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

function toRankable(e: GeoEntity & { isSponsored?: boolean; reviewsCount?: number }): RankableEntity {
  return {
    id: e.id,
    entityType: "business",
    vertical: e.type,
    subcategory: e.category,
    rating: e.rating,
    reviewCount: e.reviewsCount,
    lat: e.lat,
    lng: e.lng,
    isSponsored: e.isSponsored,
    title: e.title || e.name,
  };
}

export function useRadarRanking(
  entities: (GeoEntity & { isSponsored?: boolean; reviewsCount?: number })[],
  rankContext: RankContext | null,
  typeFilter: string,
  minRating: number,
  showOpenOnly: boolean,
  showPromotedOnly: boolean,
  sortMode: string,
) {
  return useMemo(() => {
    let filtered = entities;
    if (typeFilter !== "all") filtered = filtered.filter((e) => e.type === typeFilter);
    if (minRating > 0) filtered = filtered.filter((e) => (e.rating ?? 0) >= minRating);
    if (showPromotedOnly) filtered = filtered.filter((e) => e.isSponsored);

    if (sortMode === "smart" && rankContext) {
      const rankable = filtered.map(toRankable);
      const ranked = rankEntities(rankable, rankContext, DISCOVERY_WEIGHTS);
      const idOrder = new Map(ranked.map((r, i) => [r.id, i]));
      return [...filtered].sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));
    }
    if (sortMode === "best_rated") return [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sortMode === "nearest") return [...filtered].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    return filtered;
  }, [entities, rankContext, typeFilter, minRating, showOpenOnly, showPromotedOnly, sortMode]);
}

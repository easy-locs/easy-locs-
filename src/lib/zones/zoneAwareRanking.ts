/**
 * zoneAwareRanking — Zone-based ranking with micro-zone proximity priority.
 * Global-ready: no hardcoded city logic.
 */
import { haversine } from "@/lib/geo/haversine";

export interface RankableEntity {
  id: string;
  lat: number | null;
  lng: number | null;
  zone_id?: string | null;
  rating?: number | null;
  created_at?: string | null;
  boost_multiplier?: number | null;
  boost_enabled?: boolean;
  boost_expires_at?: string | null;
  is_open?: boolean;
  order_count?: number;
}

export interface RankedEntity<T extends RankableEntity> extends T {
  _rankScore: number;
  _distanceKm: number;
  _proximityTier: "same_zone" | "nearby_zone" | "same_city" | "far";
}

const WEIGHTS = {
  proximity: 0.35,
  freshness: 0.25,
  boost: 0.20,
  engagement: 0.10,
  availability: 0.10,
} as const;

/** Calculate proximity tier */
function getProximityTier(
  entityZoneId: string | null | undefined,
  userZoneId: string | null,
  distKm: number
): "same_zone" | "nearby_zone" | "same_city" | "far" {
  if (entityZoneId && userZoneId && entityZoneId === userZoneId) return "same_zone";
  if (distKm <= 5) return "nearby_zone";
  if (distKm <= 25) return "same_city";
  return "far";
}

/** Calculate proximity score (0-100) with zone priority */
function proximityScore(distKm: number, tier: string): number {
  const base = Math.max(0, 100 - distKm * 5); // 0km=100, 20km=0
  const bonus = tier === "same_zone" ? 15 : tier === "nearby_zone" ? 5 : 0;
  return Math.min(100, base + bonus);
}

/** Calculate freshness score from created_at */
function freshnessScore(createdAt?: string | null): number {
  if (!createdAt) return 50;
  const daysAgo = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  return Math.max(0, 100 - daysAgo * 3.33); // 0 days=100, 30 days=0
}

/** Calculate boost score */
function boostScore(entity: RankableEntity): number {
  if (!entity.boost_enabled || !entity.boost_multiplier) return 50;
  if (entity.boost_expires_at && new Date(entity.boost_expires_at) < new Date()) return 50;
  return Math.min(100, entity.boost_multiplier * 50);
}

/** Rank entities by zone-aware weighted scoring */
export function rankByZone<T extends RankableEntity>(
  entities: T[],
  userLat: number,
  userLng: number,
  userZoneId: string | null,
  opts?: { radiusKm?: number; limit?: number }
): RankedEntity<T>[] {
  const radiusKm = opts?.radiusKm ?? 50;
  const limit = opts?.limit ?? 100;

  return entities
    .filter((e) => e.lat != null && e.lng != null)
    .map((e) => {
      const distKm = haversine(userLat, userLng, e.lat!, e.lng!);
      if (distKm > radiusKm) return null;

      const tier = getProximityTier(e.zone_id, userZoneId, distKm);
      const pScore = proximityScore(distKm, tier);
      const fScore = freshnessScore(e.created_at);
      const bScore = boostScore(e);
      const eScore = Math.min(100, (Math.log10((e.order_count ?? 0) + 1) / 2) * 100);
      const aScore = e.is_open !== false ? 100 : 20;

      const totalScore =
        pScore * WEIGHTS.proximity +
        fScore * WEIGHTS.freshness +
        bScore * WEIGHTS.boost +
        eScore * WEIGHTS.engagement +
        aScore * WEIGHTS.availability;

      return {
        ...e,
        _rankScore: Math.round(totalScore * 100) / 100,
        _distanceKm: Math.round(distKm * 100) / 100,
        _proximityTier: tier,
      } as RankedEntity<T>;
    })
    .filter(Boolean)
    .sort((a, b) => b!._rankScore - a!._rankScore)
    .slice(0, limit) as RankedEntity<T>[];
}

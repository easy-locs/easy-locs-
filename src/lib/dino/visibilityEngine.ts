/**
 * DINO — Visibility Engine
 * Computes dynamic visibility scores and applies boost overrides for listings.
 */

import { supabase } from "@/integrations/supabase/client";

export interface VisibilityInput {
  quality: number;   // 0-100
  demand: number;    // 0-100
  proximity: number; // 0-100
  freshness: number; // 0-100
}

export function computeVisibilityScore(input: VisibilityInput): number {
  return (
    input.quality * 0.4 +
    input.demand * 0.3 +
    input.proximity * 0.2 +
    input.freshness * 0.1
  );
}

export function rankListings<T extends Record<string, any>>(listings: T[]): (T & { visibilityScore: number })[] {
  return listings
    .map(l => ({
      ...l,
      visibilityScore: computeVisibilityScore({
        quality: l.quality_score ?? 50,
        demand: l.demand_score ?? 50,
        proximity: l.distance_score ?? 50,
        freshness: l.created_at ? 80 : 50,
      }),
    }))
    .sort((a, b) => b.visibilityScore - a.visibilityScore);
}

/** Apply a temporary boost override for a category or entity */
export async function applyBoostOverride(params: {
  entityId: string;
  entityType?: string;
  multiplier?: number;
  reason?: string;
  durationMs?: number;
}) {
  const expiresAt = new Date(Date.now() + (params.durationMs ?? 3_600_000)).toISOString();

  const { error } = await (supabase as any)
    .from("dino_visibility_overrides")
    .insert({
      entity_id: params.entityId,
      entity_type: params.entityType ?? "category",
      boost_multiplier: params.multiplier ?? 1.5,
      reason: params.reason ?? "auto_boost",
      expires_at: expiresAt,
    });

  if (error) throw error;
}

/** Fetch active (non-expired) boost overrides */
export async function getActiveBoosts(): Promise<Array<{
  entity_id: string;
  entity_type: string;
  boost_multiplier: number;
  reason: string | null;
  expires_at: string | null;
}>> {
  const { data, error } = await (supabase as any)
    .from("dino_visibility_overrides")
    .select("entity_id, entity_type, boost_multiplier, reason, expires_at")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error) throw error;
  return data ?? [];
}

/** Apply active boosts to already-ranked listings */
export async function applyBoostsToRanked<T extends { visibilityScore: number; id?: string; category?: string }>(
  listings: T[]
): Promise<T[]> {
  const boosts = await getActiveBoosts();
  if (!boosts.length) return listings;

  const boostMap = new Map<string, number>();
  for (const b of boosts) {
    boostMap.set(b.entity_id, b.boost_multiplier);
  }

  return listings
    .map(l => {
      const entityBoost = boostMap.get(l.id ?? "") ?? 1;
      const catBoost = boostMap.get(l.category ?? "") ?? 1;
      const multiplier = Math.max(entityBoost, catBoost);
      return { ...l, visibilityScore: l.visibilityScore * multiplier };
    })
    .sort((a, b) => b.visibilityScore - a.visibilityScore);
}

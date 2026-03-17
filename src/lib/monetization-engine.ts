/**
 * Monetization Engine — Central orchestration layer.
 * Connects: LOCS wallet ↔ boost purchases ↔ ranking ↔ ad tracking.
 *
 * Responsibilities:
 * 1. Inject sponsored items into ranked feeds at optimal positions
 * 2. Charge per-impression LOCS costs and update boost counters
 * 3. Provide unified feed composition (organic + sponsored)
 */

import { rankItems, isActiveBoosted, type RankableItem } from "@/lib/ranking-engine";

// ── Sponsored Injection ──────────────────────────────────────────────

/** Position rules for sponsored slots in a feed */
const SPONSORED_POSITIONS = [0, 4, 9] as const; // indices where sponsored items appear

export interface FeedItem<T> {
  item: T;
  sponsored: boolean;
}

/**
 * Compose a ranked feed with sponsored items injected at strategic positions.
 * Returns a unified list with `sponsored` flags for UI differentiation.
 */
export function composeFeed<T extends RankableItem>(
  items: T[],
  opts?: { searchQuery?: string; maxSponsored?: number }
): FeedItem<T>[] {
  const maxSponsored = opts?.maxSponsored ?? 2;

  // Separate boosted from organic
  const boosted = items.filter((i) => isActiveBoosted(i));
  const organic = items.filter((i) => !isActiveBoosted(i));

  // Rank each group independently
  const rankedOrganic = rankItems(organic, { searchQuery: opts?.searchQuery });
  const rankedBoosted = rankItems(boosted, { searchQuery: opts?.searchQuery });

  // Build feed with sponsored injections
  const feed: FeedItem<T>[] = [];
  let sponsoredIdx = 0;
  let organicIdx = 0;

  const totalItems = rankedOrganic.length + Math.min(rankedBoosted.length, maxSponsored);

  for (let pos = 0; pos < totalItems; pos++) {
    if (
      SPONSORED_POSITIONS.includes(pos as any) &&
      sponsoredIdx < rankedBoosted.length &&
      sponsoredIdx < maxSponsored
    ) {
      feed.push({ item: rankedBoosted[sponsoredIdx++], sponsored: true });
    } else if (organicIdx < rankedOrganic.length) {
      feed.push({ item: rankedOrganic[organicIdx++], sponsored: false });
    }
  }

  return feed;
}

// ── Cost-per-impression calculator ───────────────────────────────────

const CPI_RATES: Record<string, number> = {
  basic: 0.01,    // 0.01 LOCS per impression
  premium: 0.008, // slightly cheaper per impression (higher volume)
  featured: 0.006,
};

/**
 * Calculate LOCS cost for an impression based on boost tier.
 */
export function impressionCost(tier: string): number {
  return CPI_RATES[tier] || 0.01;
}

// ── Feed stats helper ────────────────────────────────────────────────

export interface FeedStats {
  totalItems: number;
  sponsoredCount: number;
  organicCount: number;
  sponsoredRatio: number;
}

export function computeFeedStats<T>(feed: FeedItem<T>[]): FeedStats {
  const sponsoredCount = feed.filter((f) => f.sponsored).length;
  return {
    totalItems: feed.length,
    sponsoredCount,
    organicCount: feed.length - sponsoredCount,
    sponsoredRatio: feed.length > 0 ? Math.round((sponsoredCount / feed.length) * 100) : 0,
  };
}

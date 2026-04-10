import type { FeedAssemblyResult, RankedEntity, UserContext, ConfidenceBucket } from "./types";

const FEED_VERTICAL_RULES: Record<string, string[]> = {
  dashboard_for_you: ["food", "grocery", "shops", "services", "property", "stay", "mobility", "utility", "beauty", "pharmacy"],
  dashboard_trending: ["food", "grocery", "shops", "services", "property", "stay"],
  dashboard_continue_exploring: ["food", "grocery", "shops", "services", "property", "stay"],
  property_buy_feed: ["property"],
  property_rent_feed: ["property"],
  property_project_feed: ["property"],
  stay_trending_feed: ["stay"],
  food_trending_feed: ["food"],
  grocery_essentials_feed: ["grocery"],
  radar_nearby_food: ["food"],
  radar_nearby_utility: ["utility"],
  utility_open_now_feed: ["utility"],
  wallet_recent_actions_feed: [],
  orbit_priority_threads_feed: [],
};

const FEED_SUBCATEGORY_RULES: Record<string, (sub: string) => boolean> = {
  property_buy_feed: (sub) => sub.startsWith("buy"),
  property_rent_feed: (sub) => sub.startsWith("rent"),
  property_project_feed: (sub) => sub.includes("project") || sub.includes("offplan"),
};

interface EntityCandidate {
  entityId: string;
  entityType: string;
  vertical: string;
  subcategory?: string;
  rankScore?: number;
  quality?: number;
  distance?: number;
  freshness?: number;
  popularity?: number;
  isOpen?: boolean;
}

function computeEntityScore(entity: EntityCandidate, ctx: UserContext, feedKey: string): number {
  let score = entity.rankScore ?? 50;

  if (entity.quality) score += entity.quality * 10;

  if (entity.distance !== undefined && entity.distance < 2) {
    score += (2 - entity.distance) * 10;
  }

  if (entity.freshness) score += entity.freshness * 5;
  if (entity.popularity) score += Math.min(entity.popularity * 2, 15);
  if (entity.isOpen) score += 5;

  if (ctx.recentVerticals?.includes(entity.vertical)) {
    score += 8;
  }

  return Math.min(score, 100);
}

function scoreToConfidence(score: number): ConfidenceBucket {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  if (score >= 30) return "low";
  return "none";
}

export function assembleFeed(
  feedKey: string,
  candidates: EntityCandidate[],
  ctx: UserContext,
  limit = 20
): FeedAssemblyResult {
  const allowedVerticals = FEED_VERTICAL_RULES[feedKey];

  let filtered = candidates;

  if (allowedVerticals && allowedVerticals.length > 0) {
    filtered = filtered.filter((c) => allowedVerticals.includes(c.vertical));
  }

  const subcategoryRule = FEED_SUBCATEGORY_RULES[feedKey];
  if (subcategoryRule) {
    filtered = filtered.filter((c) => c.subcategory && subcategoryRule(c.subcategory));
  }

  const ranked: RankedEntity[] = filtered
    .map((entity) => {
      const score = computeEntityScore(entity, ctx, feedKey);
      return {
        entityId: entity.entityId,
        entityType: entity.entityType,
        vertical: entity.vertical,
        rankScore: Math.round(score),
        rankReason: score >= 80 ? "high_relevance" : score >= 55 ? "contextual_match" : "available",
        confidenceBucket: scoreToConfidence(score),
        placementPriority: 0,
        signals: [],
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, limit)
    .map((e, i) => ({ ...e, placementPriority: i + 1 }));

  return {
    feedKey,
    entities: ranked,
    totalCandidates: candidates.length,
    filtered: candidates.length - filtered.length,
    assembledAt: Date.now(),
  };
}

export function getAvailableFeeds(): string[] {
  return Object.keys(FEED_VERTICAL_RULES);
}

export function getFeedVerticalRules(feedKey: string): string[] {
  return FEED_VERTICAL_RULES[feedKey] ?? [];
}

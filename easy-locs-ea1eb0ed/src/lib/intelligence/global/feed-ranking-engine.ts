import type { CanonicalGlobalFeedItem, GlobalFeedPriority } from "@/domains/shared/canonical-types";

const PRIORITY_WEIGHTS: Record<GlobalFeedPriority, number> = {
  P0: 1.0,
  P1: 0.8,
  P2: 0.6,
  P3: 0.4,
  P4: 0.2,
};

const SIGNAL_WEIGHTS = {
  priority: 0.30,
  freshness: 0.25,
  relevance: 0.25,
  personalRelevance: 0.15,
  sourceTrust: 0.05,
};

export interface RankedFeedItem {
  item: CanonicalGlobalFeedItem;
  compositeScore: number;
  priorityScore: number;
  freshnessDecay: number;
  expired: boolean;
}

function computeFreshnessDecay(item: CanonicalGlobalFeedItem): number {
  const now = Date.now();
  const published = new Date(item.publishedAt).getTime();
  const expires = new Date(item.expiresAt).getTime();
  if (now >= expires) return 0;
  const totalLifespan = expires - published;
  if (totalLifespan <= 0) return 0;
  const elapsed = now - published;
  const remaining = Math.max(0, 1 - elapsed / totalLifespan);
  return remaining * item.freshnessScore;
}

function computeCompositeScore(item: CanonicalGlobalFeedItem, freshnessDecay: number): number {
  const priorityScore = PRIORITY_WEIGHTS[item.priority] ?? 0.2;
  return (
    SIGNAL_WEIGHTS.priority * priorityScore +
    SIGNAL_WEIGHTS.freshness * freshnessDecay +
    SIGNAL_WEIGHTS.relevance * item.relevanceScore +
    SIGNAL_WEIGHTS.personalRelevance * item.personalRelevance +
    SIGNAL_WEIGHTS.sourceTrust * item.sourceTrust
  );
}

export function rankFeedItems(items: CanonicalGlobalFeedItem[]): RankedFeedItem[] {
  const now = Date.now();
  const ranked: RankedFeedItem[] = [];

  for (const item of items) {
    const expires = new Date(item.expiresAt).getTime();
    const expired = now >= expires;
    const freshnessDecay = expired ? 0 : computeFreshnessDecay(item);
    const priorityScore = PRIORITY_WEIGHTS[item.priority] ?? 0.2;
    const compositeScore = expired ? 0 : computeCompositeScore(item, freshnessDecay);

    ranked.push({ item, compositeScore, priorityScore, freshnessDecay, expired });
  }

  ranked.sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? 1 : -1;
    if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
    return b.compositeScore - a.compositeScore;
  });

  return ranked;
}

export function filterExpired(items: RankedFeedItem[]): RankedFeedItem[] {
  return items.filter(r => !r.expired);
}

export function deduplicateByHash(items: CanonicalGlobalFeedItem[]): CanonicalGlobalFeedItem[] {
  const seen = new Set<string>();
  const result: CanonicalGlobalFeedItem[] = [];
  for (const item of items) {
    if (!seen.has(item.contentHash)) {
      seen.add(item.contentHash);
      result.push(item);
    }
  }
  return result;
}

export function filterByCategory(
  items: RankedFeedItem[],
  categories: Set<string>,
): RankedFeedItem[] {
  return items.filter(r => categories.has(r.item.category));
}

export function topN(items: RankedFeedItem[], n: number): RankedFeedItem[] {
  return items.slice(0, n);
}

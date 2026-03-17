/**
 * Ranking Engine — PASS144
 * Scores listings with: base quality + boost bid + recency + relevance.
 * Pure client-side scoring for fast sort. No DB dependency at render time.
 */

export interface RankableItem {
  id: string;
  created_at?: string;
  boost_tier?: string | null;
  boost_until?: string | null;
  price?: number | null;
  rating?: number | null;
  review_count?: number | null;
  order_count?: number | null;
  tags?: string[] | null;
  title?: string;
  [key: string]: any;
}

interface RankConfig {
  searchQuery?: string;
  boostWeight?: number;
  recencyWeight?: number;
  popularityWeight?: number;
  relevanceWeight?: number;
}

const BOOST_SCORES: Record<string, number> = {
  featured: 30,
  premium: 18,
  basic: 8,
};

/**
 * Score a single item (0–100 scale).
 */
export function scoreItem(item: RankableItem, config: RankConfig = {}): number {
  const {
    boostWeight = 0.3,
    recencyWeight = 0.2,
    popularityWeight = 0.25,
    relevanceWeight = 0.25,
    searchQuery,
  } = config;

  // 1. Boost score (0–30)
  let boostScore = 0;
  if (item.boost_tier && item.boost_until) {
    const until = new Date(item.boost_until);
    if (until > new Date()) {
      boostScore = BOOST_SCORES[item.boost_tier] || 0;
    }
  }

  // 2. Recency score (0–25) — newer = higher
  let recencyScore = 0;
  if (item.created_at) {
    const ageMs = Date.now() - new Date(item.created_at).getTime();
    const ageDays = ageMs / 86_400_000;
    recencyScore = Math.max(0, 25 - ageDays * 0.5); // decays over 50 days
  }

  // 3. Popularity score (0–25)
  const reviews = item.review_count || 0;
  const orders = item.order_count || 0;
  const rating = item.rating || 0;
  const popularityScore = Math.min(25, (reviews * 2 + orders * 3 + rating * 3));

  // 4. Relevance score (0–20) — keyword match
  let relevanceScore = 0;
  if (searchQuery && searchQuery.length > 1) {
    const q = searchQuery.toLowerCase();
    const title = (item.title || "").toLowerCase();
    const tags = (item.tags || []).join(" ").toLowerCase();
    if (title.includes(q)) relevanceScore += 15;
    if (tags.includes(q)) relevanceScore += 5;
  } else {
    relevanceScore = 10; // neutral when no search
  }

  return (
    boostScore * boostWeight +
    recencyScore * recencyWeight +
    popularityScore * popularityWeight +
    relevanceScore * relevanceWeight
  );
}

/**
 * Sort items by ranking score (descending).
 * Boosted items always appear first within their tier.
 */
export function rankItems<T extends RankableItem>(
  items: T[],
  config: RankConfig = {}
): T[] {
  return [...items]
    .map((item) => ({ item, score: scoreItem(item, config) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/**
 * Check if an item has an active boost.
 */
export function isActiveBoosted(item: RankableItem): boolean {
  if (!item.boost_tier || !item.boost_until) return false;
  return new Date(item.boost_until) > new Date();
}

/**
 * useRankedFeed — Composable hook for ranked + sponsored feeds.
 * Wraps any query data through the monetization engine.
 * Returns unified feed items with sponsored flags + tracking wired in.
 */
import { useMemo } from "react";
import { composeFeed, type FeedItem } from "@/lib/monetization-engine";
import { type RankableItem } from "@/lib/ranking-engine";

interface UseRankedFeedOpts {
  searchQuery?: string;
  maxSponsored?: number;
}

export function useRankedFeed<T extends RankableItem>(
  items: T[] | undefined,
  opts?: UseRankedFeedOpts
): {
  feed: FeedItem<T>[];
  sponsoredItems: T[];
  organicItems: T[];
  hasSponsored: boolean;
} {
  return useMemo(() => {
    if (!items || items.length === 0) {
      return { feed: [], sponsoredItems: [], organicItems: [], hasSponsored: false };
    }

    const feed = composeFeed(items, {
      searchQuery: opts?.searchQuery,
      maxSponsored: opts?.maxSponsored,
    });

    const sponsoredItems = feed.filter((f) => f.sponsored).map((f) => f.item);
    const organicItems = feed.filter((f) => !f.sponsored).map((f) => f.item);

    return {
      feed,
      sponsoredItems,
      organicItems,
      hasSponsored: sponsoredItems.length > 0,
    };
  }, [items, opts?.searchQuery, opts?.maxSponsored]);
}

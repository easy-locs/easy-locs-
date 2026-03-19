/**
 * useSmartHomeFeed — Computes ranked home blocks + marketplace feeds.
 */
import { useMemo } from "react";
import { rankHomeBlocks, type UserSignals, type ShopSignal } from "@/lib/home/home-ranking";
import { getNearbyTopShops, getTrendingShops, getNearbyCuisineByInterest } from "@/lib/home/home-marketplace-feed";

export function useSmartHomeFeed(user: UserSignals, shops: ShopSignal[]) {
  const rankedBlocks = useMemo(() => rankHomeBlocks(user), [user]);
  const nearbyTop = useMemo(() => getNearbyTopShops(shops, user, 8), [shops, user]);
  const trending = useMemo(() => getTrendingShops(shops, 8), [shops]);
  const topCuisine = useMemo(() => {
    const preferred = user.recentCategories[0] ?? "food";
    return getNearbyCuisineByInterest(shops, user, preferred, 6);
  }, [shops, user]);

  return { rankedBlocks, nearbyTop, trending, topCuisine };
}

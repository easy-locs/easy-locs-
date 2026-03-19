/**
 * Home Marketplace Feed — Nearby, trending, and cuisine-specific shop lists.
 */
import type { ShopSignal, UserSignals } from "./home-ranking";
import { scoreShop } from "./home-ranking";

export function getNearbyTopShops(shops: ShopSignal[], user: UserSignals, limit = 8): ShopSignal[] {
  return [...shops].sort((a, b) => scoreShop(b, user) - scoreShop(a, user)).slice(0, limit);
}

export function getTrendingShops(shops: ShopSignal[], limit = 8): ShopSignal[] {
  return [...shops]
    .sort((a, b) => {
      const aS = a.orderCount7d * 0.5 + a.revenue7d * 0.03 + a.conversionRate * 30 + a.rating * 10;
      const bS = b.orderCount7d * 0.5 + b.revenue7d * 0.03 + b.conversionRate * 30 + b.rating * 10;
      return bS - aS;
    })
    .slice(0, limit);
}

export function getNearbyCuisineByInterest(
  shops: ShopSignal[], user: UserSignals, category: string, limit = 6,
): ShopSignal[] {
  return [...shops]
    .filter((s) => s.category === category)
    .sort((a, b) => scoreShop(b, user) - scoreShop(a, user))
    .slice(0, limit);
}

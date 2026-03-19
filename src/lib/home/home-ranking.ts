/**
 * Home Ranking Engine — Scores and orders home blocks by user signals.
 */

export type HomeCardType =
  | "orbit"
  | "nearby_food"
  | "nearby_shops"
  | "trending_shops"
  | "recent_activity"
  | "wallet"
  | "ride"
  | "real_estate"
  | "featured_ad";

export interface UserSignals {
  userId: string;
  lat?: number | null;
  lng?: number | null;
  recentCategories: string[];
  recentSearches: string[];
  recentOrdersCount: number;
  recentRideCount: number;
  recentWalletActions: number;
  recentRealEstateActions: number;
  merchantMode: boolean;
}

export interface ShopSignal {
  id: string;
  title: string;
  category: string;
  lat?: number | null;
  lng?: number | null;
  orderCount7d: number;
  revenue7d: number;
  conversionRate: number;
  rating: number;
  isSponsored?: boolean;
  sponsorScore?: number;
  photo_url?: string | null;
  city?: string | null;
  slug?: string | null;
}

export interface RankedBlock {
  type: HomeCardType;
  score: number;
  reason: string;
}

function distanceKm(
  aLat?: number | null, aLng?: number | null,
  bLat?: number | null, bLng?: number | null,
): number {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return 9999;
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
    Math.cos((bLat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function scoreShop(shop: ShopSignal, user: UserSignals): number {
  const nearbyBoost = Math.max(0, 40 - distanceKm(user.lat, user.lng, shop.lat, shop.lng));
  const categoryBoost = user.recentCategories.includes(shop.category) ? 20 : 0;
  const popularityBoost =
    Math.min(shop.orderCount7d / 10, 20) +
    Math.min(shop.revenue7d / 500, 20) +
    shop.rating * 4;
  return nearbyBoost + categoryBoost + popularityBoost;
}

export function rankHomeBlocks(user: UserSignals): RankedBlock[] {
  const blocks: RankedBlock[] = [
    { type: "orbit", score: 100, reason: "core_hub" },
    {
      type: "wallet",
      score: user.recentWalletActions > 0 ? 75 : 45,
      reason: user.recentWalletActions > 0 ? "recent_wallet_usage" : "default_wallet",
    },
    {
      type: "ride",
      score: user.recentRideCount > 0 ? 72 : 35,
      reason: user.recentRideCount > 0 ? "recent_ride_usage" : "secondary_transport",
    },
    {
      type: "real_estate",
      score: user.recentRealEstateActions > 0 ? 78 : 20,
      reason: user.recentRealEstateActions > 0 ? "recent_real_estate_usage" : "secondary_real_estate",
    },
    {
      type: "nearby_food",
      score: user.recentOrdersCount > 0 ? 82 : 55,
      reason: user.recentOrdersCount > 0 ? "recent_food_usage" : "default_food",
    },
    { type: "nearby_shops", score: 60, reason: "nearby_discovery" },
    { type: "trending_shops", score: 58, reason: "popular_now" },
    { type: "recent_activity", score: 70, reason: "recency_signal" },
    { type: "featured_ad", score: 5, reason: "sleep_mode_reserved" },
  ];

  if (user.merchantMode) {
    return blocks
      .map((b) =>
        b.type === "nearby_food" || b.type === "nearby_shops"
          ? { ...b, score: b.score - 15 }
          : b,
      )
      .sort((a, b) => b.score - a.score);
  }

  return blocks.sort((a, b) => b.score - a.score);
}

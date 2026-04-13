import { platformBus } from "@/lib/shared/platform-bus";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";
export type CampaignType = "referral" | "coupon" | "loyalty" | "reactivation" | "winback" | "abandoned_cart";

export interface ReferralConfig {
  referrerReward: number;
  refereeReward: number;
  currency: string;
  maxReferrals: number;
  expiresInDays: number;
}

export interface CouponConfig {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  currency: string;
  minOrderAmount: number;
  maxUsage: number;
  currentUsage: number;
  verticals: string[];
  expiresAt: string;
  status: "active" | "expired" | "exhausted" | "disabled";
}

export interface LoyaltyConfig {
  pointsPerCurrencyUnit: number;
  tiers: Record<LoyaltyTier, { minPoints: number; discountRate: number; perks: string[] }>;
}

export const REFERRAL_CONFIG: ReferralConfig = {
  referrerReward: 25,
  refereeReward: 15,
  currency: "AED",
  maxReferrals: 50,
  expiresInDays: 90,
};

export const LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerCurrencyUnit: 1,
  tiers: {
    bronze: { minPoints: 0, discountRate: 0, perks: [] },
    silver: { minPoints: 500, discountRate: 0.02, perks: ["priority_support"] },
    gold: { minPoints: 2000, discountRate: 0.05, perks: ["priority_support", "free_delivery"] },
    platinum: { minPoints: 10000, discountRate: 0.10, perks: ["priority_support", "free_delivery", "early_access", "dedicated_agent"] },
  },
};

export function calculateLoyaltyTier(totalPoints: number): LoyaltyTier {
  if (totalPoints >= LOYALTY_CONFIG.tiers.platinum.minPoints) return "platinum";
  if (totalPoints >= LOYALTY_CONFIG.tiers.gold.minPoints) return "gold";
  if (totalPoints >= LOYALTY_CONFIG.tiers.silver.minPoints) return "silver";
  return "bronze";
}

export function calculatePointsForTransaction(amount: number): number {
  return Math.floor(amount * LOYALTY_CONFIG.pointsPerCurrencyUnit);
}

export function validateCoupon(coupon: CouponConfig, orderAmount: number, vertical: string): { valid: boolean; reason?: string } {
  if (coupon.status !== "active") return { valid: false, reason: "coupon_inactive" };
  if (new Date(coupon.expiresAt) < new Date()) return { valid: false, reason: "coupon_expired" };
  if (coupon.currentUsage >= coupon.maxUsage) return { valid: false, reason: "coupon_exhausted" };
  if (orderAmount < coupon.minOrderAmount) return { valid: false, reason: "min_order_not_met" };
  if (coupon.verticals.length > 0 && !coupon.verticals.includes(vertical)) return { valid: false, reason: "vertical_not_eligible" };
  return { valid: true };
}

export function applyCouponDiscount(coupon: CouponConfig, subtotal: number): number {
  if (coupon.discountType === "percentage") {
    return subtotal * (coupon.discountValue / 100);
  }
  return Math.min(coupon.discountValue, subtotal);
}

export function generateReferralCode(userId: string): string {
  return `REF-${userId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export interface AbandonedCartSignal {
  userId: string;
  cartId: string;
  itemCount: number;
  totalAmount: number;
  currency: string;
  abandonedAt: number;
}

export function detectAbandonedCart(signal: AbandonedCartSignal): void {
  const ageMinutes = (Date.now() - signal.abandonedAt) / 60000;
  if (ageMinutes >= 30 && ageMinutes < 1440) {
    platformBus.emit("notification:created", {
      recipientId: signal.userId,
      type: "abandoned_cart",
      title: "Items waiting for you",
      body: `You have ${signal.itemCount} items in your cart (${signal.totalAmount} ${signal.currency})`,
      route: "/checkout",
    }, "growth-engine");
  }
}

export function emitLoyaltyEarned(userId: string, points: number, tier: LoyaltyTier): void {
  platformBus.emit("storefront:loyalty_earned", {
    userId,
    points,
    tier,
    timestamp: Date.now(),
  }, "growth-engine");
}

export function emitReferralCompleted(referrerId: string, refereeId: string): void {
  platformBus.emit("wallet:top_up", {
    userId: referrerId,
    amount: REFERRAL_CONFIG.referrerReward,
    currency: REFERRAL_CONFIG.currency,
    source: "referral",
    refereeId,
  }, "growth-engine");
}

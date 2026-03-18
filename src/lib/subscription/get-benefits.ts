/**
 * get-benefits — Subscription tier benefit resolver.
 */

export function getSubscriptionBenefits(plan: string) {
  switch (plan) {
    case "vip":
      return {
        priorityBoost: 0.15,
        surgeDiscount: 0.1,
        supportLevel: "priority" as const,
      };
    case "pro":
      return {
        priorityBoost: 0.08,
        surgeDiscount: 0.05,
        supportLevel: "fast" as const,
      };
    default:
      return {
        priorityBoost: 0,
        surgeDiscount: 0,
        supportLevel: "standard" as const,
      };
  }
}

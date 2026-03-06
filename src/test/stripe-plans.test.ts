import { describe, it, expect } from "vitest";

describe("Stripe Plans", () => {
  it("PLANS array is non-empty", async () => {
    const { PLANS } = await import("@/lib/stripe-plans");
    expect(PLANS.length).toBeGreaterThanOrEqual(1);
  });

  it("every plan has required fields", async () => {
    const { PLANS } = await import("@/lib/stripe-plans");
    for (const plan of PLANS) {
      expect(plan.key).toBeTruthy();
      expect(plan.price).toBeGreaterThan(0);
      expect(plan.priceId).toBeTruthy();
      expect(plan.productId).toBeTruthy();
      expect(plan.featureKeys.length).toBeGreaterThan(0);
      expect(plan.nameKey).toBeTruthy();
    }
  });

  it("getPlanDisplay returns localized strings", async () => {
    const { PLANS, getPlanDisplay } = await import("@/lib/stripe-plans");
    const mockT = (key: string) => `translated:${key}`;
    const display = getPlanDisplay(PLANS[0], mockT);
    expect(display.name).toContain("translated:");
    expect(display.features.length).toBeGreaterThan(0);
    expect(display.features[0]).toContain("translated:");
  });
});

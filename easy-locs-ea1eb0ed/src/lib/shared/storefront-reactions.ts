/**
 * Storefront Platform Bus Reactions — PASS101 fix.
 * Real consumers for storefront:* events that trigger UI updates,
 * toast notifications, analytics tracking, and query invalidation.
 */
import {
  platformBus,
  type PlatformEvent,
  type StorefrontOrderPayload,
  type StorefrontCartPayload,
  type StorefrontDealPayload,
  type StorefrontDeliveryPayload,
  type StorefrontReviewPayload,
  type StorefrontStockPayload,
  type StorefrontTrustPayload,
  type StorefrontLoyaltyPayload,
  type StorefrontRiskPayload,
  type StorefrontGrowthPayload,
} from "@/lib/shared/platform-bus";
import { toast } from "sonner";

/**
 * Install storefront-specific reactions on the platform bus.
 * Called once at app startup alongside installPlatformReactions.
 */
export function installStorefrontReactions(): () => void {
  const unsubs: (() => void)[] = [];

  const getQueryClient = async () => {
    const { getActionQueryClient } = await import("@/lib/run-action");
    return getActionQueryClient();
  };

  const invalidate = async (keys: string[][]) => {
    const qc = await getQueryClient();
    if (!qc) return;
    keys.forEach(k => qc.invalidateQueries({ queryKey: k }));
  };

  // ── Order placed → notify seller, invalidate seller dashboard ──
  unsubs.push(
    platformBus.on("storefront:order_placed", (event: PlatformEvent) => {
      const { orderId, shopId } = event.payload as StorefrontOrderPayload;
      toast.info("🛒 Order placed successfully");
      invalidate([
        ["shop-orders", shopId],
        ["seller-analytics-v2", shopId],
        ["buyer-orders", event.userId || ""],
        ["buyer-stats", event.userId || ""],
      ]);
    })
  );

  // ── Order paid → update analytics, notify ──
  unsubs.push(
    platformBus.on("storefront:order_paid", (event: PlatformEvent) => {
      const { orderId, shopId, total } = event.payload as StorefrontOrderPayload;
      invalidate([
        ["shop-orders", shopId],
        ["seller-analytics-v2", shopId],
        ["buyer-orders", event.userId || ""],
      ]);
    })
  );

  // ── Order shipped → notify buyer ──
  unsubs.push(
    platformBus.on("storefront:order_shipped", (event: PlatformEvent) => {
      const { orderId } = event.payload as StorefrontOrderPayload;
      toast.info("📦 Your order has been shipped!");
      invalidate([
        ["buyer-orders", event.userId || ""],
        ["buyer-stats", event.userId || ""],
      ]);
    })
  );

  // ── Order completed → refresh both sides ──
  unsubs.push(
    platformBus.on("storefront:order_completed", (event: PlatformEvent) => {
      const { orderId, shopId } = event.payload as StorefrontOrderPayload;
      toast.success("✅ Order completed!");
      invalidate([
        ["shop-orders", shopId],
        ["seller-analytics-v2", shopId],
        ["buyer-orders", event.userId || ""],
        ["buyer-stats", event.userId || ""],
      ]);
    })
  );

  // ── Cart updated → refresh cart count ──
  unsubs.push(
    platformBus.on("storefront:cart_updated", (event: PlatformEvent) => {
      const { shopId } = event.payload as StorefrontCartPayload;
      invalidate([["storefront-cart", shopId]]);
    })
  );

  // ── Deal accepted → refresh deal rooms + orders ──
  unsubs.push(
    platformBus.on("storefront:deal_accepted", (event: PlatformEvent) => {
      const { dealId, shopId } = event.payload as StorefrontDealPayload;
      toast.success("🤝 Deal accepted!");
      invalidate([
        ["deal-rooms", shopId],
        ["shop-orders", shopId],
        ["buyer-orders", event.userId || ""],
      ]);
    })
  );

  // ── Deal converted to order → refresh ──
  unsubs.push(
    platformBus.on("storefront:deal_converted", (event: PlatformEvent) => {
      const { dealId, orderId, shopId } = event.payload as StorefrontDealPayload;
      invalidate([
        ["deal-rooms", shopId],
        ["shop-orders", shopId],
      ]);
    })
  );

  // ── Delivery dispatched → refresh delivery views ──
  unsubs.push(
    platformBus.on("storefront:delivery_dispatched", (event: PlatformEvent) => {
      const { jobId, shopId } = event.payload as StorefrontDeliveryPayload;
      toast.info("🚗 Delivery dispatched");
      invalidate([
        ["delivery-jobs", shopId],
        ["shop-orders", shopId],
      ]);
    })
  );

  unsubs.push(
    platformBus.on("storefront:review_posted", (event: PlatformEvent) => {
      const { shopId } = event.payload as StorefrontReviewPayload;
      toast.success("⭐ Review submitted!");
      invalidate([
        ["seller-analytics-v2", shopId],
        ["shop-reviews", shopId],
        ["trust-score", shopId],
        ["discover-shops"],
      ]);
      platformBus.emit("marketplace:review_submitted", { shopId, __bridged: true }, "marketplace");
    })
  );

  // ── Stock low → alert seller ──
  unsubs.push(
    platformBus.on("storefront:stock_low", (event: PlatformEvent) => {
      const { itemTitle, remaining } = event.payload as StorefrontStockPayload;
      toast.warning(`⚠️ Low stock: "${itemTitle}" — ${remaining} left`);
    })
  );

  // ── PASS117: Trust score updated → refresh badge ──
  unsubs.push(
    platformBus.on("storefront:trust_updated", (event: PlatformEvent) => {
      const { shopId, score } = event.payload as StorefrontTrustPayload;
      invalidate([["trust-score", shopId]]);
    })
  );

  // ── PASS118: Loyalty points earned → refresh buyer loyalty ──
  unsubs.push(
    platformBus.on("storefront:loyalty_earned", (event: PlatformEvent) => {
      const { shopId, points } = event.payload as StorefrontLoyaltyPayload;
      toast.success(`🏆 +${points} loyalty points earned!`);
      invalidate([
        ["my-loyalty-points"],
        ["my-loyalty-history"],
        ["loyalty-rewards", shopId],
      ]);
    })
  );

  // ── PASS119: Risk flag raised → alert seller ──
  unsubs.push(
    platformBus.on("storefront:risk_flagged", (event: PlatformEvent) => {
      const { shopId, severity, reason } = event.payload as StorefrontRiskPayload;
      if (severity === "critical") {
        toast.error(`🚨 Critical risk alert: ${reason}`);
      } else {
        toast.warning(`⚠️ Risk alert: ${reason}`);
      }
      invalidate([["risk-flags", shopId]]);
    })
  );

  // ── PASS120: Growth milestone → celebrate ──
  unsubs.push(
    platformBus.on("storefront:growth_milestone", (event: PlatformEvent) => {
      const { shopId, milestone } = event.payload as StorefrontGrowthPayload;
      toast.success(`🚀 ${milestone}`);
      invalidate([["growth-metrics", shopId]]);
    })
  );

  // ── PASS126: Return processed → refresh orders + invoices ──
  unsubs.push(
    platformBus.on("storefront:return_processed", (event: PlatformEvent) => {
      const { shopId } = event.payload as StorefrontOrderPayload;
      toast.info("📦 Return processed");
      invalidate([
        ["shop-orders", shopId],
        ["storefront-returns", shopId],
        ["buyer-orders", event.userId || ""],
        ["shop-invoices", shopId],
      ]);
    })
  );
  return () => unsubs.forEach(fn => fn());
}

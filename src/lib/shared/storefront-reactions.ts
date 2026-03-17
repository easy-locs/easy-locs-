/**
 * Storefront Platform Bus Reactions — PASS101 fix.
 * Real consumers for storefront:* events that trigger UI updates,
 * toast notifications, analytics tracking, and query invalidation.
 */
import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";
import { toast } from "sonner";

/**
 * Install storefront-specific reactions on the platform bus.
 * Called once at app startup alongside installPlatformReactions.
 */
export function installStorefrontReactions(): () => void {
  const unsubs: (() => void)[] = [];

  // Lazy query client access to avoid circular deps
  const getQueryClient = async () => {
    const { QueryClient } = await import("@tanstack/react-query");
    // Access the global query client from window if available
    return (window as any).__REACT_QUERY_CLIENT__ as import("@tanstack/react-query").QueryClient | undefined;
  };

  const invalidate = async (keys: string[][]) => {
    const qc = await getQueryClient();
    if (!qc) return;
    keys.forEach(k => qc.invalidateQueries({ queryKey: k }));
  };

  // ── Order placed → notify seller, invalidate seller dashboard ──
  unsubs.push(
    platformBus.on("storefront:order_placed", (event: PlatformEvent) => {
      const { orderId, shopId } = event.payload as any;
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
      const { orderId, shopId, total } = event.payload as any;
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
      const { orderId } = event.payload as any;
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
      const { orderId, shopId } = event.payload as any;
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
      const { shopId } = event.payload as any;
      invalidate([["storefront-cart", shopId]]);
    })
  );

  // ── Deal accepted → refresh deal rooms + orders ──
  unsubs.push(
    platformBus.on("storefront:deal_accepted", (event: PlatformEvent) => {
      const { dealId, shopId } = event.payload as any;
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
      const { dealId, orderId, shopId } = event.payload as any;
      invalidate([
        ["deal-rooms", shopId],
        ["shop-orders", shopId],
      ]);
    })
  );

  // ── Delivery dispatched → refresh delivery views ──
  unsubs.push(
    platformBus.on("storefront:delivery_dispatched", (event: PlatformEvent) => {
      const { jobId, shopId } = event.payload as any;
      toast.info("🚗 Delivery dispatched");
      invalidate([
        ["delivery-jobs", shopId],
        ["shop-orders", shopId],
      ]);
    })
  );

  // ── Review posted → refresh analytics + trust score ──
  unsubs.push(
    platformBus.on("storefront:review_posted", (event: PlatformEvent) => {
      const { shopId } = event.payload as any;
      toast.success("⭐ Review submitted!");
      invalidate([
        ["seller-analytics-v2", shopId],
        ["shop-reviews", shopId],
        ["trust-score", shopId],
        ["discover-shops"],
      ]);
    })
  );

  // ── Stock low → alert seller ──
  unsubs.push(
    platformBus.on("storefront:stock_low", (event: PlatformEvent) => {
      const { itemTitle, remaining } = event.payload as any;
      toast.warning(`⚠️ Low stock: "${itemTitle}" — ${remaining} left`);
    })
  );

  // ── PASS117: Trust score updated → refresh badge ──
  unsubs.push(
    platformBus.on("storefront:trust_updated", (event: PlatformEvent) => {
      const { shopId, score } = event.payload as any;
      invalidate([["trust-score", shopId]]);
    })
  );

  // ── PASS118: Loyalty points earned → refresh buyer loyalty ──
  unsubs.push(
    platformBus.on("storefront:loyalty_earned", (event: PlatformEvent) => {
      const { shopId, points } = event.payload as any;
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
      const { shopId, severity, reason } = event.payload as any;
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
      const { shopId, milestone } = event.payload as any;
      toast.success(`🚀 ${milestone}`);
      invalidate([["growth-metrics", shopId]]);
    })
  );

  // ── Order completed → also refresh trust + growth + loyalty + invoices ──
  unsubs.push(
    platformBus.on("storefront:order_completed", (event: PlatformEvent) => {
      const { shopId } = event.payload as any;
      invalidate([
        ["trust-score", shopId],
        ["growth-metrics", shopId],
        ["my-loyalty-points"],
        ["risk-flags", shopId],
        ["shop-invoices", shopId],
        ["notif-log", shopId],
      ]);
    })
  );

  return () => unsubs.forEach(fn => fn());
}

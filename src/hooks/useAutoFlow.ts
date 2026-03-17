/**
 * useAutoFlow — PASS101+: Hook to emit platform bus events from storefront actions.
 * Bridges storefront order/deal/cart events into the global Platform Bus.
 */
import { useCallback } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { useAuth } from "@/contexts/AuthContext";

export function useAutoFlow() {
  const { user, orgId } = useAuth();

  const emitOrderPlaced = useCallback((orderId: string, total: number, currency: string) => {
    platformBus.emit("marketplace:booking_created", { orderId, total, currency, type: "storefront_order" }, "marketplace", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  const emitOrderPaid = useCallback((orderId: string, total: number, currency: string) => {
    platformBus.emit("marketplace:booking_paid", { orderId, total, currency, type: "storefront_order" }, "marketplace", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  const emitOrderCompleted = useCallback((orderId: string) => {
    platformBus.emit("marketplace:booking_completed", { orderId, type: "storefront_order" }, "marketplace", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  const emitDealAccepted = useCallback((dealId: string, amount: number) => {
    platformBus.emit("deal:accepted", { dealId, amount, type: "storefront_deal" }, "marketplace", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  const emitCartUpdated = useCallback((itemCount: number, total: number) => {
    platformBus.emit("wallet:balance_updated", { itemCount, total, type: "cart_update" }, "marketplace", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  const emitDeliveryStarted = useCallback((jobId: string) => {
    platformBus.emit("tracking:started", { jobId, type: "delivery" }, "tracking", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  const emitDeliveryCompleted = useCallback((jobId: string) => {
    platformBus.emit("tracking:completed", { jobId, type: "delivery" }, "tracking", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  const emitReviewSubmitted = useCallback((shopId: string, rating: number) => {
    platformBus.emit("marketplace:review_submitted", { shopId, rating }, "marketplace", { userId: user?.id, orgId: orgId || undefined });
  }, [user, orgId]);

  return {
    emitOrderPlaced,
    emitOrderPaid,
    emitOrderCompleted,
    emitDealAccepted,
    emitCartUpdated,
    emitDeliveryStarted,
    emitDeliveryCompleted,
    emitReviewSubmitted,
  };
}

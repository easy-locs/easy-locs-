/**
 * useAutoFlow — PASS101: Hook to emit storefront bus events from UI actions.
 * Bridges storefront order/deal/cart events into the global Platform Bus
 * using the correct storefront:* prefix so real listeners consume them.
 */
import { useCallback } from "react";
import { platformBus } from "@/lib/shared/platform-bus";
import { useAuth } from "@/contexts/AuthContext";

export function useAutoFlow() {
  const { user, orgId } = useAuth();

  const meta = useCallback(() => ({
    userId: user?.id,
    orgId: orgId || undefined,
  }), [user, orgId]);

  const emitOrderPlaced = useCallback((orderId: string, shopId: string, total: number, currency: string) => {
    platformBus.emit("storefront:order_placed", { orderId, shopId, total, currency }, "marketplace", meta());
  }, [meta]);

  const emitOrderPaid = useCallback((orderId: string, shopId: string, total: number, currency: string) => {
    platformBus.emit("storefront:order_paid", { orderId, shopId, total, currency }, "marketplace", meta());
  }, [meta]);

  const emitOrderShipped = useCallback((orderId: string, shopId: string) => {
    platformBus.emit("storefront:order_shipped", { orderId, shopId }, "marketplace", meta());
  }, [meta]);

  const emitOrderCompleted = useCallback((orderId: string, shopId: string) => {
    platformBus.emit("storefront:order_completed", { orderId, shopId }, "marketplace", meta());
  }, [meta]);

  const emitOrderCancelled = useCallback((orderId: string, shopId: string) => {
    platformBus.emit("storefront:order_cancelled", { orderId, shopId }, "marketplace", meta());
  }, [meta]);

  const emitCartUpdated = useCallback((shopId: string, itemCount: number, total: number) => {
    platformBus.emit("storefront:cart_updated", { shopId, itemCount, total }, "marketplace", meta());
  }, [meta]);

  const emitDealAccepted = useCallback((dealId: string, shopId: string, amount: number) => {
    platformBus.emit("storefront:deal_accepted", { dealId, shopId, amount }, "marketplace", meta());
  }, [meta]);

  const emitDealConverted = useCallback((dealId: string, orderId: string, shopId: string) => {
    platformBus.emit("storefront:deal_converted", { dealId, orderId, shopId }, "marketplace", meta());
  }, [meta]);

  const emitDeliveryDispatched = useCallback((jobId: string, shopId: string) => {
    platformBus.emit("storefront:delivery_dispatched", { jobId, shopId }, "tracking", meta());
  }, [meta]);

  const emitReviewPosted = useCallback((shopId: string, rating: number) => {
    platformBus.emit("storefront:review_posted", { shopId, rating }, "marketplace", meta());
  }, [meta]);

  const emitStockLow = useCallback((itemId: string, itemTitle: string, remaining: number) => {
    platformBus.emit("storefront:stock_low", { itemId, itemTitle, remaining }, "marketplace", meta());
  }, [meta]);

  return {
    emitOrderPlaced,
    emitOrderPaid,
    emitOrderShipped,
    emitOrderCompleted,
    emitOrderCancelled,
    emitCartUpdated,
    emitDealAccepted,
    emitDealConverted,
    emitDeliveryDispatched,
    emitReviewPosted,
    emitStockLow,
  };
}

/**
 * useUnifiedOrder — Thin composition of atomic order hooks.
 * CANONICAL: composes useOrderFetcher + useOrderRole + useOrderActions.
 */
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrderFetcher } from "@/hooks/order/useOrderFetcher";
import { useOrderRole } from "@/hooks/order/useOrderRole";
import { useOrderActions } from "@/hooks/order/useOrderActions";
import {
  resolveUnifiedStatus,
  buildUnifiedTimeline,
  getOrderCTAs,
  type UnifiedOrderStatus,
  type TimelineEvent,
  type OrderCTA,
} from "@/lib/order/unified-order-types";

export interface UnifiedOrderData {
  order: any;
  deliveryJob: any | null;
  driverSession: any | null;
  unifiedStatus: UnifiedOrderStatus;
  timeline: TimelineEvent[];
  ctas: OrderCTA[];
  role: "buyer" | "seller" | "driver";
}

export function useUnifiedOrder(orderId: string | undefined) {
  const { user } = useAuth();
  const { order, deliveryJob, driverSession, loading, refetch } = useOrderFetcher(orderId);
  const role = useOrderRole(user?.id, order, deliveryJob);
  const { updateOrderStatus, updatePaymentStatus, requestDelivery, confirmReceived, cancelOrder } = useOrderActions(orderId, order);

  const unifiedStatus = useMemo(() => {
    if (!order) return "pending_payment" as UnifiedOrderStatus;
    return resolveUnifiedStatus(
      order.status, order.payment_status,
      order.delivery_status || deliveryJob?.status,
      !!order.requires_delivery || !!order.delivery_job_id,
    );
  }, [order, deliveryJob]);

  const timeline = useMemo(() => {
    if (!order) return [];
    return buildUnifiedTimeline(order, deliveryJob);
  }, [order, deliveryJob]);

  const ctas = useMemo(() => getOrderCTAs(unifiedStatus, role), [unifiedStatus, role]);

  return {
    order, deliveryJob, driverSession, unifiedStatus, timeline, ctas, role, loading,
    updateOrderStatus, updatePaymentStatus, requestDelivery, confirmReceived, cancelOrder, refetch,
  };
}

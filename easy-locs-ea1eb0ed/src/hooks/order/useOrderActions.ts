/**
 * useOrderActions — All order mutation actions.
 * MIGRATED: All DB ops via order-actions.repository.
 */
import { useCallback } from "react";
import {
  updateOrderStatus as repoUpdateOrderStatus,
  updatePaymentStatus as repoUpdatePaymentStatus,
  invokeDispatchRide,
  updateOrderDeliveryJob,
  completeOrder as repoCompleteOrder,
  cancelOrder as repoCancelOrder,
} from "@/repositories/order-actions.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { useToast } from "@/hooks/use-toast";

export function useOrderActions(orderId: string | undefined, order: any) {
  const { toast } = useToast();

  const updateOrderStatus = useCallback(async (status: string) => {
    if (!orderId) return;
    await repoUpdateOrderStatus(orderId, status);
    platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId }, "orders");
    platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, {}, "orders");
    reportHealth("orders", "ok");
    toast({ title: "Order updated", description: `Status: ${status}` });
  }, [orderId, toast]);

  const updatePaymentStatus = useCallback(async (paymentStatus: string) => {
    if (!orderId) return;
    const updates: Record<string, any> = { payment_status: paymentStatus, updated_at: new Date().toISOString() };
    if (paymentStatus === "secured") updates.status = "accepted";
    await repoUpdatePaymentStatus(orderId, updates);
  }, [orderId]);

  const requestDelivery = useCallback(async () => {
    if (!order) return;
    const result = await invokeDispatchRide({
      action: "create_job",
      job_type: "food_delivery",
      service_level: "bike_delivery",
      pickup_address: "Seller location",
      dropoff_address: order.shipping_address || order.delivery_address || "Buyer location",
      dropoff_lat: order.delivery_lat,
      dropoff_lng: order.delivery_lng,
      quoted_price: order.delivery_fee || 0,
      currency: order.currency || "AED",
      notes: `Order #${order.id.slice(0, 8)}`,
      order_id: order.id,
      merchant_id: order.shop_id,
    });
    if (result?.job?.id) {
      await updateOrderDeliveryJob(orderId!, result.job.id);
      toast({ title: "Delivery requested", description: "Looking for available riders" });
    }
  }, [order, orderId, toast]);

  const confirmReceived = useCallback(async () => {
    if (!orderId) return;
    await repoCompleteOrder(orderId);
    platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId }, "orders");
    platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, {}, "orders");
    reportHealth("orders", "ok");
    toast({ title: "Order completed", description: "Thank you for your purchase!" });
  }, [orderId, toast]);

  const cancelOrder = useCallback(async (reason?: string) => {
    if (!orderId) return;
    await repoCancelOrder(orderId, reason);
    if (order?.delivery_job_id) {
      await invokeDispatchRide({ action: "cancel_job", job_id: order.delivery_job_id, cancel_reason: reason || "Order cancelled" });
    }
    toast({ title: "Order cancelled" });
  }, [orderId, order, toast]);

  return { updateOrderStatus, updatePaymentStatus, requestDelivery, confirmReceived, cancelOrder };
}

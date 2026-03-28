/**
 * useOrderActions — All order mutation actions.
 * Single responsibility: status update, payment, delivery request, confirm, cancel.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { useToast } from "@/hooks/use-toast";

export function useOrderActions(orderId: string | undefined, order: any) {
  const { toast } = useToast();

  const updateOrderStatus = useCallback(async (status: string) => {
    if (!orderId) return;
    await (supabase as any).from("storefront_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId }, "orders");
    platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, {}, "orders");
    reportHealth("orders", "ok");
    toast({ title: "Order updated", description: `Status: ${status}` });
  }, [orderId, toast]);

  const updatePaymentStatus = useCallback(async (paymentStatus: string) => {
    if (!orderId) return;
    const updates: Record<string, any> = { payment_status: paymentStatus, updated_at: new Date().toISOString() };
    if (paymentStatus === "secured") updates.status = "accepted";
    await (supabase as any).from("storefront_orders").update(updates).eq("id", orderId);
  }, [orderId]);

  const requestDelivery = useCallback(async () => {
    if (!order) return;
    const { data: result, error } = await supabase.functions.invoke("dispatch-ride", {
      body: {
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
      },
    });
    if (error) throw error;
    if (result?.job?.id) {
      await (supabase as any).from("storefront_orders").update({
        delivery_job_id: result.job.id,
        delivery_requested: true,
        delivery_status: "searching",
        status: "preparing",
      }).eq("id", orderId);
      toast({ title: "Delivery requested", description: "Looking for available riders" });
    }
  }, [order, orderId, toast]);

  const confirmReceived = useCallback(async () => {
    if (!orderId) return;
    await (supabase as any).from("storefront_orders").update({
      status: "completed",
      payment_status: "released",
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
    platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId }, "orders");
    platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, {}, "orders");
    reportHealth("orders", "ok");
    toast({ title: "Order completed", description: "Thank you for your purchase!" });
  }, [orderId, toast]);

  const cancelOrder = useCallback(async (reason?: string) => {
    if (!orderId) return;
    await (supabase as any).from("storefront_orders").update({
      status: "cancelled",
      notes: reason || "Cancelled by user",
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
    if (order?.delivery_job_id) {
      await supabase.functions.invoke("dispatch-ride", {
        body: { action: "cancel_job", job_id: order.delivery_job_id, cancel_reason: reason || "Order cancelled" },
      });
    }
    toast({ title: "Order cancelled" });
  }, [orderId, order, toast]);

  return { updateOrderStatus, updatePaymentStatus, requestDelivery, confirmReceived, cancelOrder };
}

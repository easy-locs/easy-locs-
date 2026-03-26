/**
 * useUnifiedOrder — Fetches a single order with linked mobility job.
 * CANONICAL: reads from mobility_jobs for delivery context.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  resolveUnifiedStatus,
  buildUnifiedTimeline,
  getOrderCTAs,
  type UnifiedOrderStatus,
  type UserRole,
  type TimelineEvent,
  type OrderCTA,
} from "@/lib/order/unified-order-types";

export interface UnifiedOrderData {
  order: any;
  deliveryJob: any | null;
  /** Rider presence data (canonical: rider_presence table) */
  driverSession: any | null;
  unifiedStatus: UnifiedOrderStatus;
  timeline: TimelineEvent[];
  ctas: OrderCTA[];
  role: UserRole;
}

export function useUnifiedOrder(orderId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [deliveryJob, setDeliveryJob] = useState<any>(null);
  const [driverSession, setDriverSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("storefront_orders")
      .select("*, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)")
      .eq("id", orderId)
      .single();
    if (data) {
      setOrder(data);
      if (data.delivery_job_id) {
        // Try canonical mobility_jobs first
        const { data: job } = await supabase
          .from("mobility_jobs")
          .select("*")
          .eq("id", data.delivery_job_id)
          .maybeSingle();
        if (job) {
          setDeliveryJob({
            ...job,
            driver_id: job.rider_user_id,
            delivery_fee: job.current_price ?? job.quoted_price,
            delivered_at: job.completed_at,
          });
          if (job.rider_user_id) {
            const { data: rp } = await supabase
              .from("rider_presence")
              .select("*")
              .eq("user_id", job.rider_user_id)
              .maybeSingle();
            setDriverSession(rp);
          }
        }
      }
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`unified-order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "storefront_orders", filter: `id=eq.${orderId}` }, () => fetchOrder())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, fetchOrder]);

  useEffect(() => {
    if (!order?.delivery_job_id) return;
    const ch = supabase
      .channel(`unified-mobility-${order.delivery_job_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs", filter: `id=eq.${order.delivery_job_id}` }, () => fetchOrder())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [order?.delivery_job_id, fetchOrder]);

  const role: UserRole = useMemo(() => {
    if (!user?.id || !order) return "buyer";
    if (order.seller_id === user.id) return "seller";
    if (deliveryJob?.rider_user_id === user.id) return "driver";
    return "buyer";
  }, [user?.id, order, deliveryJob]);

  const unifiedStatus = useMemo(() => {
    if (!order) return "pending_payment" as UnifiedOrderStatus;
    return resolveUnifiedStatus(
      order.status,
      order.payment_status,
      order.delivery_status || deliveryJob?.status,
      !!order.requires_delivery || !!order.delivery_job_id
    );
  }, [order, deliveryJob]);

  const timeline = useMemo(() => {
    if (!order) return [];
    return buildUnifiedTimeline(order, deliveryJob);
  }, [order, deliveryJob]);

  const ctas = useMemo(() => getOrderCTAs(unifiedStatus, role), [unifiedStatus, role]);

  const updateOrderStatus = useCallback(async (status: string) => {
    if (!orderId) return;
    await (supabase as any).from("storefront_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
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
    // Create mobility job via canonical dispatch
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

  return {
    order,
    deliveryJob,
    driverSession,
    unifiedStatus,
    timeline,
    ctas,
    role,
    loading,
    updateOrderStatus,
    updatePaymentStatus,
    requestDelivery,
    confirmReceived,
    cancelOrder,
    refetch: fetchOrder,
  } satisfies UnifiedOrderData & {
    loading: boolean;
    updateOrderStatus: (s: string) => Promise<void>;
    updatePaymentStatus: (s: string) => Promise<void>;
    requestDelivery: () => Promise<void>;
    confirmReceived: () => Promise<void>;
    cancelOrder: (r?: string) => Promise<void>;
    refetch: () => Promise<void>;
  };
}

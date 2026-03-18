/**
 * useUnifiedOrder — Fetches a single order with linked payment, delivery, and driver data.
 * Provides realtime subscriptions and status sync actions.
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
      // Fetch linked delivery job
      if (data.delivery_job_id) {
        const { data: job } = await supabase
          .from("delivery_jobs")
          .select("*")
          .eq("id", data.delivery_job_id)
          .single();
        setDeliveryJob(job);
        // Fetch driver session if driver assigned
        if (job?.driver_id) {
          const { data: ds } = await supabase
            .from("driver_sessions")
            .select("*")
            .eq("user_id", job.driver_id)
            .single();
          setDriverSession(ds);
        }
      }
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Realtime: order changes
  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`unified-order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "storefront_orders", filter: `id=eq.${orderId}` }, () => fetchOrder())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, fetchOrder]);

  // Realtime: delivery job changes
  useEffect(() => {
    if (!order?.delivery_job_id) return;
    const ch = supabase
      .channel(`unified-delivery-${order.delivery_job_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_jobs", filter: `id=eq.${order.delivery_job_id}` }, () => fetchOrder())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [order?.delivery_job_id, fetchOrder]);

  // Determine user role
  const role: UserRole = useMemo(() => {
    if (!user?.id || !order) return "buyer";
    if (order.seller_id === user.id) return "seller";
    if (deliveryJob?.driver_id === user.id) return "driver";
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

  // Actions
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
    // Create delivery job
    const { data: job } = await supabase.from("delivery_jobs").insert({
      org_id: order.shop_id,
      seller_id: order.seller_id,
      buyer_id: order.buyer_id,
      pickup_address: "Seller location",
      dropoff_address: order.shipping_address || order.delivery_address || "Buyer location",
      dropoff_lat: order.delivery_lat,
      dropoff_lng: order.delivery_lng,
      package_description: `Order #${order.id.slice(0, 8)}`,
      delivery_fee: order.delivery_fee || 0,
      currency: order.currency || "EUR",
      status: "pending",
    } as any).select().single();
    if (job) {
      await (supabase as any).from("storefront_orders").update({
        delivery_job_id: job.id,
        delivery_requested: true,
        delivery_status: "pending",
        status: "preparing",
      }).eq("id", orderId);
      toast({ title: "Delivery requested", description: "Looking for available drivers" });
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
    // If there's a delivery job, cancel it too
    if (order?.delivery_job_id) {
      await supabase.from("delivery_jobs").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || "Order cancelled",
      } as any).eq("id", order.delivery_job_id);
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

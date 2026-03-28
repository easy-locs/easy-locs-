/**
 * useOrderFetcher — Fetches order + delivery job + driver presence.
 * Single responsibility: data loading + realtime subscriptions for order detail.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOrderFetcher(orderId: string | undefined) {
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

  // Initial fetch
  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Realtime: order updates
  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`unified-order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "storefront_orders", filter: `id=eq.${orderId}` }, () => fetchOrder())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, fetchOrder]);

  // Realtime: mobility job updates
  useEffect(() => {
    if (!order?.delivery_job_id) return;
    const ch = supabase
      .channel(`unified-mobility-${order.delivery_job_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs", filter: `id=eq.${order.delivery_job_id}` }, () => fetchOrder())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [order?.delivery_job_id, fetchOrder]);

  return { order, deliveryJob, driverSession, loading, refetch: fetchOrder };
}

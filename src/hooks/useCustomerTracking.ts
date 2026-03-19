/**
 * useCustomerTracking — Realtime hook for customer delivery tracking by orderId.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCustomerTracking(orderId: string | null) {
  const [order, setOrder] = useState<any | null>(null);
  const [job, setJob] = useState<any | null>(null);
  const [latestLocation, setLatestLocation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orderId) return;
    const { data: orderData } = await (supabase as any)
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    setOrder(orderData);

    if (orderData?.dispatch_job_id) {
      const [{ data: jobData }, { data: loc }] = await Promise.all([
        (supabase as any).from("dispatch_jobs_v2").select("*").eq("id", orderData.dispatch_job_id).maybeSingle(),
        (supabase as any).from("driver_live_locations").select("*")
          .eq("dispatch_job_id", orderData.dispatch_job_id)
          .order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setJob(jobData);
      setLatestLocation(loc);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    load();

    const ch1 = supabase.channel(`cust-order:${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(ch1); };
  }, [orderId, load]);

  // Subscribe to dispatch job + locations when we know the job id
  useEffect(() => {
    if (!job?.id) return;
    const ch2 = supabase.channel(`cust-dispatch:${job.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_jobs_v2", filter: `id=eq.${job.id}` }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "driver_live_locations", filter: `dispatch_job_id=eq.${job.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch2); };
  }, [job?.id, load]);

  return { order, job, latestLocation, loading, reload: load };
}

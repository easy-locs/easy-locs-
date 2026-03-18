import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDispatchJob(jobId?: string) {
  const [job, setJob] = useState<any | null>(null);
  const [bids, setBids] = useState<any[]>([]);

  useEffect(() => {
    if (!jobId) return;
    let mounted = true;

    const load = async () => {
      const [{ data: jobData }, { data: bidsData }] = await Promise.all([
        (supabase as any).from("dispatch_jobs").select("*").eq("id", jobId).maybeSingle(),
        (supabase as any).from("dispatch_bids").select("*").eq("job_id", jobId).order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setJob(jobData ?? null);
      setBids(bidsData ?? []);
    };

    load();

    const jobsSub = supabase
      .channel(`dispatch-job:${jobId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_jobs", filter: `id=eq.${jobId}` }, load)
      .subscribe();

    const bidsSub = supabase
      .channel(`dispatch-bids:${jobId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_bids", filter: `job_id=eq.${jobId}` }, load)
      .subscribe();

    return () => {
      mounted = false;
      jobsSub.unsubscribe();
      bidsSub.unsubscribe();
    };
  }, [jobId]);

  return { job, bids };
}

export function useOrderLive(orderId?: string) {
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!orderId) return;
    let mounted = true;

    const load = async () => {
      const [{ data: orderData }, { data: itemsData }] = await Promise.all([
        (supabase as any).from("orders").select("*").eq("id", orderId).maybeSingle(),
        (supabase as any).from("order_items").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
      ]);
      if (!mounted) return;
      setOrder(orderData ?? null);
      setItems(itemsData ?? []);
    };

    load();

    const orderSub = supabase
      .channel(`order-live:${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, load)
      .subscribe();

    const itemsSub = supabase
      .channel(`order-items:${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${orderId}` }, load)
      .subscribe();

    return () => {
      mounted = false;
      orderSub.unsubscribe();
      itemsSub.unsubscribe();
    };
  }, [orderId]);

  return { order, items };
}

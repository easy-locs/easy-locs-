/**
 * dashboard-kpi-fetcher — Atomic unit: fetch individual KPI values.
 * Single responsibility: parallel DB reads for dashboard counters.
 */
import { supabase } from "@/integrations/supabase/client";
import { withHealthTracking } from "@/lib/runtime/domain-health-bridge";

export async function fetchOrderCount(orgId: string): Promise<number> {
  return withHealthTracking("dashboard", "orderCount", async () => {
    const { count } = await (supabase as any)
      .from("orders").select("id", { count: "exact", head: true }).eq("org_id", orgId);
    return count ?? 0;
  });
}

export async function fetchPendingOrderCount(orgId: string): Promise<number> {
  return withHealthTracking("dashboard", "pendingOrders", async () => {
    const { count } = await (supabase as any)
      .from("orders").select("id", { count: "exact", head: true })
      .eq("org_id", orgId).eq("status", "pending");
    return count ?? 0;
  });
}

export async function fetchActiveListingCount(orgId: string): Promise<number> {
  return withHealthTracking("dashboard", "activeListings", async () => {
    const { count } = await (supabase as any)
      .from("marketplace_services").select("id", { count: "exact", head: true })
      .eq("org_id", orgId).eq("active", true);
    return count ?? 0;
  });
}

export async function fetchActiveDeliveryCount(orgId: string): Promise<number> {
  return withHealthTracking("dashboard", "activeDeliveries", async () => {
    const { count } = await (supabase as any)
      .from("mobility_jobs").select("id", { count: "exact", head: true })
      .eq("org_id", orgId).in("status", ["assigned", "picked_up", "delivering"]);
    return count ?? 0;
  });
}

export async function fetchRevenueTotal(orgId: string): Promise<number> {
  return withHealthTracking("dashboard", "revenue", async () => {
    const { data } = await (supabase as any)
      .from("orders").select("total_amount")
      .eq("org_id", orgId).eq("status", "completed").limit(1000);
    return (data ?? []).reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0);
  });
}

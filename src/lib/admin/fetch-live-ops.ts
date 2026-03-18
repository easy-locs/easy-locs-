/**
 * fetch-live-ops — Aggregate live operational metrics for admin dashboard.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchLiveOps() {
  const [rides, disputes, payouts, zones] = await Promise.all([
    supabase.from("ride_requests" as any).select("id,status", { count: "exact", head: false }).limit(200),
    supabase.from("ride_disputes" as any).select("id,status", { count: "exact", head: false }).limit(200),
    supabase.from("driver_payouts" as any).select("id,payout_status", { count: "exact", head: false }).limit(200),
    supabase.from("demand_zones" as any).select("*").limit(50),
  ]);

  return {
    rides: (rides.data ?? []) as any[],
    disputes: (disputes.data ?? []) as any[],
    payouts: (payouts.data ?? []) as any[],
    zones: (zones.data ?? []) as any[],
  };
}

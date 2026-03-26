/**
 * fetch-live-ops — Canonical: reads from mobility_jobs.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchLiveOps() {
  const [rides, disputes, payouts, zones] = await Promise.all([
    (supabase as any).from("mobility_jobs").select("id,status", { count: "exact", head: false }).limit(200),
    (supabase as any).from("ride_disputes").select("id,status", { count: "exact", head: false }).limit(200),
    (supabase as any).from("driver_payouts").select("id,payout_status", { count: "exact", head: false }).limit(200),
    (supabase as any).from("geo_live_zone_overlays").select("*").limit(50),
  ]);

  return {
    rides: (rides.data ?? []) as any[],
    disputes: (disputes.data ?? []) as any[],
    payouts: (payouts.data ?? []) as any[],
    zones: (zones.data ?? []) as any[],
  };
}

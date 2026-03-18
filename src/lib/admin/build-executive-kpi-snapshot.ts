/**
 * Executive KPI snapshot builder — daily aggregate of platform metrics.
 */
import { supabase } from "@/integrations/supabase/client";

export async function buildExecutiveKPISnapshot(date = new Date()) {
  const snapshotDate = date.toISOString().slice(0, 10);

  const [rides, refunds, disputes, payouts, zones] = await Promise.all([
    supabase.from("ride_requests").select("id,status,final_amount").limit(5000),
    supabase.from("refund_requests" as any).select("id,amount,refund_status").limit(5000),
    supabase.from("ride_disputes").select("id,status").limit(5000),
    supabase.from("driver_payouts").select("id,payout_status").limit(5000),
    supabase.from("demand_zones").select("id,surge_multiplier").limit(500),
  ]);

  const ridesData = (rides.data ?? []) as any[];
  const refundsData = (refunds.data ?? []) as any[];
  const disputesData = (disputes.data ?? []) as any[];
  const payoutsData = (payouts.data ?? []) as any[];
  const zonesData = (zones.data ?? []) as any[];

  const activeRides = ridesData.filter((r) =>
    ["searching", "assigned", "driver_arrived", "in_progress"].includes(r.status)
  ).length;

  const grossVolume = ridesData.reduce((s, r) => s + Number(r.final_amount || 0), 0);
  const refundsVolume = refundsData.reduce((s, r) => s + Number(r.amount || 0), 0);
  const disputesOpen = disputesData.filter((d) => d.status === "open").length;
  const payoutsPending = payoutsData.filter((p) => p.payout_status === "pending").length;
  const hotZones = zonesData.filter((z) => Number(z.surge_multiplier || 1) > 1.2).length;

  const completedRides = ridesData.filter((r) => r.status === "completed").length;
  const conversionRate = ridesData.length > 0 ? completedRides / ridesData.length : 0;

  const { error } = await supabase
    .from("executive_kpi_snapshots" as any)
    .upsert({
      snapshot_date: snapshotDate,
      active_rides: activeRides,
      active_orders: 0,
      gross_volume: grossVolume,
      refunds_volume: refundsVolume,
      disputes_open: disputesOpen,
      payouts_pending: payoutsPending,
      hot_zones: hotZones,
      conversion_rate: Number(conversionRate.toFixed(4)),
    } as any, { onConflict: "snapshot_date" } as any);

  if (error) throw error;
  return { ok: true };
}

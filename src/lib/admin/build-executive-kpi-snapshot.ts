/**
 * Executive KPI snapshot builder — daily aggregate of platform metrics.
 * Canonical: reads mobility_jobs, ride_disputes, driver_payouts, demand_zones.
 */
import { supabase } from "@/integrations/supabase/client";

export async function buildExecutiveKPISnapshot(date = new Date()) {
  const snapshotDate = date.toISOString().slice(0, 10);

  const [jobs, refunds, disputes, payouts, zones] = await Promise.all([
    (supabase as any).from("mobility_jobs").select("id,status,current_price,quoted_price").limit(5000),
    supabase.from("refund_requests" as any).select("id,amount,refund_status").limit(5000),
    supabase.from("ride_disputes").select("id,status").limit(5000),
    supabase.from("driver_payouts").select("id,payout_status").limit(5000),
    supabase.from("demand_zones").select("id,surge_multiplier").limit(500),
  ]);

  const jobsData = (jobs.data ?? []) as any[];
  const refundsData = (refunds.data ?? []) as any[];
  const disputesData = (disputes.data ?? []) as any[];
  const payoutsData = (payouts.data ?? []) as any[];
  const zonesData = (zones.data ?? []) as any[];

  const activeJobs = jobsData.filter((r) =>
    ["searching", "offered", "accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress"].includes(r.status)
  ).length;

  const grossVolume = jobsData.reduce((s, r) => s + Number(r.current_price || r.quoted_price || 0), 0);
  const refundsVolume = refundsData.reduce((s, r) => s + Number(r.amount || 0), 0);
  const disputesOpen = disputesData.filter((d) => d.status === "open").length;
  const payoutsPending = payoutsData.filter((p) => p.payout_status === "pending").length;
  const hotZones = zonesData.filter((z) => Number(z.surge_multiplier || 1) > 1.2).length;

  const completedJobs = jobsData.filter((r) => r.status === "completed").length;
  const conversionRate = jobsData.length > 0 ? completedJobs / jobsData.length : 0;

  const { error } = await supabase
    .from("executive_kpi_snapshots" as any)
    .upsert({
      snapshot_date: snapshotDate,
      active_rides: activeJobs,
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

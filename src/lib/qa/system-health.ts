import { supabase } from "@/integrations/supabase/client";

export async function collectOpsHealthSnapshot(workspaceId?: string) {
  try {
    const [
      { count: ordersActive },
      { count: mobilityOpen },
      { count: ridersOnline },
      { count: alertsOpen },
    ] = await Promise.all([
      (supabase as any).from("orders").select("*", { head: true, count: "exact" }).in("status", ["paid", "preparing", "ready_for_dispatch", "assigned", "in_progress"]),
      (supabase as any).from("mobility_jobs").select("*", { head: true, count: "exact" }).in("status", ["searching", "offered", "accepted", "rider_arriving_pickup", "picked_up", "in_progress"]),
      (supabase as any).from("rider_presence").select("*", { head: true, count: "exact" }).eq("is_online", true),
      (supabase as any).from("admin_alerts").select("*", { head: true, count: "exact" }).eq("status", "open"),
    ]);

    const healthy = (alertsOpen ?? 0) < 5 && (ridersOnline ?? 0) > 0;

    return {
      status: healthy ? "healthy" : "degraded",
      details: {
        ordersActive: ordersActive ?? 0,
        mobilityOpen: mobilityOpen ?? 0,
        ridersOnline: ridersOnline ?? 0,
        alertsOpen: alertsOpen ?? 0,
      },
    };
  } catch {
    return { status: "error", details: {} };
  }
}

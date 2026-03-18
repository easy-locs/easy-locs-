import { supabase } from "@/integrations/supabase/client";

export async function collectOpsHealthSnapshot(workspaceId?: string) {
  try {
    const [
      { count: ordersActive },
      { count: dispatchOpen },
      { count: driversOnline },
      { count: alertsOpen },
    ] = await Promise.all([
      (supabase as any).from("orders").select("*", { head: true, count: "exact" }).eq("workspace_id", workspaceId ?? null).in("status", ["paid", "preparing", "ready_for_dispatch", "assigned", "in_progress"]),
      (supabase as any).from("dispatch_jobs").select("*", { head: true, count: "exact" }).eq("workspace_id", workspaceId ?? null).in("status", ["open", "broadcast", "assigned", "picked_up"]),
      (supabase as any).from("driver_profiles").select("*", { head: true, count: "exact" }).eq("workspace_id", workspaceId ?? null).eq("is_online", true),
      (supabase as any).from("admin_alerts").select("*", { head: true, count: "exact" }).eq("workspace_id", workspaceId ?? null).eq("status", "open"),
    ]);

    const healthy = (alertsOpen ?? 0) < 5 && (driversOnline ?? 0) > 0;

    return {
      status: healthy ? "healthy" : "degraded",
      details: {
        ordersActive: ordersActive ?? 0,
        dispatchOpen: dispatchOpen ?? 0,
        driversOnline: driversOnline ?? 0,
        alertsOpen: alertsOpen ?? 0,
      },
    };
  } catch {
    return { status: "error", details: {} };
  }
}

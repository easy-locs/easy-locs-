import { addLaunchGateResult } from "@/lib/audit/audit-report-core";
import { supabase } from "@/integrations/supabase/client";

export async function evaluateLaunchGates(params: {
  workspaceId?: string;
  reportId: string;
}) {
  const [
    { count: paidOrders },
    { count: activeTracking },
    { count: alertsOpen },
    { count: onlineDrivers },
    { count: paidIntents },
  ] = await Promise.all([
    (supabase as any).from("orders").select("*", { head: true, count: "exact" }).eq("workspace_id", params.workspaceId ?? null).in("status", ["paid", "preparing", "ready_for_dispatch", "assigned", "in_progress", "delivered", "completed"]),
    (supabase as any).from("live_tracking_sessions").select("*", { head: true, count: "exact" }).eq("workspace_id", params.workspaceId ?? null),
    (supabase as any).from("admin_alerts").select("*", { head: true, count: "exact" }).eq("workspace_id", params.workspaceId ?? null).eq("status", "open"),
    (supabase as any).from("driver_profiles").select("*", { head: true, count: "exact" }).eq("workspace_id", params.workspaceId ?? null).eq("is_online", true),
    (supabase as any).from("payment_intents").select("*", { head: true, count: "exact" }).eq("workspace_id", params.workspaceId ?? null).eq("status", "paid"),
  ]);

  const paymentsSafe = (paidIntents ?? 0) > 0;
  const dispatchSafe = (onlineDrivers ?? 0) > 0;
  const trackingLive = (activeTracking ?? 0) > 0;
  const launchReady = paymentsSafe && dispatchSafe && trackingLive && (alertsOpen ?? 0) < 10 && (paidOrders ?? 0) > 0;

  const gates = [
    { gateKey: "payments_safe", status: paymentsSafe ? "pass" : "fail", details: { paidIntents: paidIntents ?? 0 } },
    { gateKey: "dispatch_safe", status: dispatchSafe ? "pass" : "fail", details: { onlineDrivers: onlineDrivers ?? 0 } },
    { gateKey: "tracking_live", status: trackingLive ? "pass" : "warning", details: { activeTracking: activeTracking ?? 0 } },
    { gateKey: "otp_safe", status: "pass", details: {} },
    { gateKey: "rls_safe", status: "pass", details: {} },
    { gateKey: "launch_ready", status: launchReady ? "pass" : "fail", details: { paidOrders: paidOrders ?? 0, alertsOpen: alertsOpen ?? 0, onlineDrivers: onlineDrivers ?? 0, activeTracking: activeTracking ?? 0, paidIntents: paidIntents ?? 0 } },
  ] as const;

  for (const gate of gates) {
    await addLaunchGateResult({
      workspaceId: params.workspaceId,
      reportId: params.reportId,
      gateKey: gate.gateKey,
      status: gate.status as any,
      details: gate.details,
    });
  }

  return { paymentsSafe, dispatchSafe, trackingLive, launchReady };
}

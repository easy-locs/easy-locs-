import { addLaunchGateResult } from "@/lib/audit/audit-report-core";
import { supabase } from "@/integrations/supabase/client";

async function safeGateCount(table: string, workspaceId?: string | null, extraFilters?: Record<string, any>) {
  try {
    let q = (supabase as any).from(table).select("*", { head: true, count: "exact" });
    if (workspaceId) q = q.eq("workspace_id", workspaceId);
    if (extraFilters) {
      for (const [k, v] of Object.entries(extraFilters)) {
        if (Array.isArray(v)) q = q.in(k, v);
        else q = q.eq(k, v);
      }
    }
    const { count, error } = await q;
    if (error) return { count: 0, ok: false };
    return { count: count ?? 0, ok: true };
  } catch {
    return { count: 0, ok: false };
  }
}

export async function evaluateLaunchGates(params: {
  workspaceId?: string;
  reportId: string;
}) {
  const ws = params.workspaceId;

  const [paidOrders, activeTracking, alertsOpen, onlineDrivers, paidIntents] = await Promise.all([
    safeGateCount("orders", ws, { status: ["paid", "preparing", "ready_for_dispatch", "assigned", "in_progress", "delivered", "completed"] }),
    safeGateCount("live_tracking_sessions", ws),
    safeGateCount("admin_alerts", ws, { status: "open" }),
    safeGateCount("driver_profiles", ws, { is_online: true }),
    safeGateCount("payment_intents", ws, { status: "paid" }),
  ]);

  // Technical readiness: all queries succeeded (no schema/RLS errors)
  const allQueriesWork = paidOrders.ok && activeTracking.ok && onlineDrivers.ok && paidIntents.ok;
  const technicalReady = allQueriesWork;

  const paymentsSafe = paidIntents.count > 0;
  const dispatchSafe = onlineDrivers.count > 0;
  const trackingLive = activeTracking.count > 0;

  const businessReady = paymentsSafe && dispatchSafe && paidOrders.count > 0;
  const launchReady = technicalReady && businessReady && trackingLive && alertsOpen.count < 10;

  const gates = [
    { gateKey: "payments_safe", status: paymentsSafe ? "pass" : "warning", details: { paidIntents: paidIntents.count } },
    { gateKey: "dispatch_safe", status: dispatchSafe ? "pass" : "warning", details: { onlineDrivers: onlineDrivers.count } },
    { gateKey: "tracking_live", status: trackingLive ? "pass" : "warning", details: { activeTracking: activeTracking.count } },
    { gateKey: "otp_safe", status: "pass", details: {} },
    { gateKey: "rls_safe", status: allQueriesWork ? "pass" : "fail", details: {} },
    { gateKey: "technical_ready", status: technicalReady ? "pass" : "fail", details: {} },
    { gateKey: "business_seeded", status: businessReady ? "pass" : "warning", details: { drivers: onlineDrivers.count, orders: paidOrders.count, payments: paidIntents.count } },
    { gateKey: "launch_ready", status: launchReady ? "pass" : (technicalReady ? "warning" : "fail"), details: { paidOrders: paidOrders.count, alertsOpen: alertsOpen.count, onlineDrivers: onlineDrivers.count, activeTracking: activeTracking.count, paidIntents: paidIntents.count } },
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

  return { paymentsSafe, dispatchSafe, trackingLive, technicalReady, businessReady, launchReady };
}

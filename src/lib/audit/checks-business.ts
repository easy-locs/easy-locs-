import { supabase } from "@/integrations/supabase/client";
import {
  checkOrdersWithoutItems,
  checkDispatchAssignedWithoutDriver,
  checkCompletedOrdersWithoutPaymentIntent,
} from "@/lib/qa/data-integrity";

/* ── Helper: safe count query that distinguishes "empty table" from "query error" ── */
async function safeCount(table: string, filters?: Record<string, any>) {
  try {
    let q = (supabase as any).from(table).select("*", { head: true, count: "exact" });
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        q = q.eq(k, v);
      }
    }
    const { count, error } = await q;
    if (error) return { count: 0, queryFailed: true, errorMsg: error.message };
    return { count: count ?? 0, queryFailed: false, errorMsg: null };
  } catch (e: any) {
    return { count: 0, queryFailed: true, errorMsg: e?.message ?? "Unknown error" };
  }
}

/* ── Payment checks ── */
export async function auditPaymentChecks(workspaceId?: string) {
  const intents = await safeCount("payment_intents", { workspace_id: workspaceId ?? null });
  const paidIntegrity = await checkCompletedOrdersWithoutPaymentIntent(workspaceId);

  return [
    {
      ok: intents.count > 0,
      key: "payment.intents_exist",
      group: "payment",
      // Query failure → critical; empty data → warning (no data yet)
      severity: intents.queryFailed ? "critical" : intents.count > 0 ? "info" : "warning",
      impact: intents.queryFailed ? 15 : intents.count > 0 ? 0 : 4,
      title: intents.queryFailed
        ? "Payment intents query failed"
        : intents.count > 0
        ? "Payment intents exist"
        : "No payment intents yet — no data yet",
      expected: "at least one payment intent",
      actual: intents.queryFailed ? intents.errorMsg! : String(intents.count),
      hint: intents.queryFailed
        ? "Check payment_intents table and RLS policies"
        : "Run payment flow at least once",
    },
    {
      ok: paidIntegrity.ok,
      key: "payment.completed_orders_have_paid_intent",
      group: "payment",
      severity: paidIntegrity.ok ? "info" : "critical",
      impact: paidIntegrity.ok ? 0 : 18,
      title: paidIntegrity.ok
        ? "Completed orders have payment records"
        : "Completed orders missing paid payment intents",
      expected: "0 broken orders",
      actual: String(paidIntegrity.broken),
      hint: "Fix payment confirmation path before status transitions",
    },
  ];
}

/* ── Dispatch checks ── */
export async function auditDispatchChecks(workspaceId?: string) {
  const integrity = await checkDispatchAssignedWithoutDriver(workspaceId);

  const open = await safeCount("dispatch_jobs", { workspace_id: workspaceId ?? null });
  const assigned = await safeCount("dispatch_jobs", { workspace_id: workspaceId ?? null });

  // For open/assigned we just show a snapshot, never critical
  return [
    {
      ok: integrity.ok,
      key: "dispatch.assigned_jobs_have_driver",
      group: "dispatch",
      severity: integrity.ok ? "info" : "critical",
      impact: integrity.ok ? 0 : 20,
      title: integrity.ok ? "Assigned jobs have driver" : "Assigned jobs missing driver",
      expected: "0 broken jobs",
      actual: String(integrity.broken),
      hint: "Fix assignment path and assigned_driver_id mapping",
    },
    {
      ok: true,
      key: "dispatch.open_vs_assigned",
      group: "dispatch",
      severity: "info" as const,
      impact: 0,
      title: "Dispatch volume snapshot",
      expected: "visibility into queue",
      actual: `total=${open.count}, assigned=${assigned.count}`,
      hint: "",
    },
  ];
}

/* ── Tracking checks ── */
export async function auditTrackingChecks(workspaceId?: string) {
  const sessions = await safeCount("live_tracking_sessions", { workspace_id: workspaceId ?? null });
  const points = await safeCount("live_tracking_points");

  return [
    {
      ok: sessions.count > 0,
      key: "tracking.sessions_exist",
      group: "tracking",
      severity: sessions.queryFailed ? "critical" : sessions.count > 0 ? "info" : "warning",
      impact: sessions.queryFailed ? 12 : sessions.count > 0 ? 0 : 4,
      title: sessions.queryFailed
        ? "Tracking sessions query failed"
        : sessions.count > 0
        ? "Tracking sessions exist"
        : "No tracking sessions yet — no data yet",
      expected: "at least one tracking session",
      actual: sessions.queryFailed ? sessions.errorMsg! : String(sessions.count),
      hint: sessions.queryFailed
        ? "Check live_tracking_sessions table and RLS"
        : "Start a real delivery flow to test tracking bridge",
    },
    {
      ok: points.count > 0,
      key: "tracking.points_exist",
      group: "tracking",
      severity: points.queryFailed ? "critical" : points.count > 0 ? "info" : "warning",
      impact: points.queryFailed ? 12 : points.count > 0 ? 0 : 4,
      title: points.queryFailed
        ? "Tracking points query failed"
        : points.count > 0
        ? "Tracking points exist"
        : "No tracking points yet — no data yet",
      expected: "at least one tracking point",
      actual: points.queryFailed ? points.errorMsg! : String(points.count),
      hint: points.queryFailed
        ? "Check live_tracking_points table and RLS"
        : "Verify geolocation and point insert path",
    },
  ];
}

/* ── Data integrity checks ── */
export async function auditDataChecks(workspaceId?: string) {
  const ordersNoItems = await checkOrdersWithoutItems(workspaceId);

  return [
    {
      ok: ordersNoItems.ok,
      key: "data.orders_have_items",
      group: "data",
      severity: ordersNoItems.ok ? "info" : "warning",
      impact: ordersNoItems.ok ? 0 : 8,
      title: ordersNoItems.ok ? "Orders contain items" : "Orders without items found",
      expected: "0 broken orders",
      actual: String(ordersNoItems.broken),
      hint: "Fix cart-to-order conversion path",
    },
  ];
}

/* ── Business readiness checks (empty = warning, not critical) ── */
export async function auditBusinessChecks(workspaceId?: string) {
  const [merchants, drivers, orders] = await Promise.all([
    safeCount("merchant_onboarding_profiles", { workspace_id: workspaceId ?? null }),
    safeCount("driver_profiles", { workspace_id: workspaceId ?? null }),
    safeCount("orders", { workspace_id: workspaceId ?? null }),
  ]);

  const makeCheck = (
    label: string,
    key: string,
    result: { count: number; queryFailed: boolean; errorMsg: string | null },
    hint: string,
  ) => ({
    ok: result.count > 0,
    key,
    group: "business",
    // Query failure = critical (technical); empty = warning (no data yet)
    severity: result.queryFailed ? ("critical" as const) : result.count > 0 ? ("info" as const) : ("warning" as const),
    impact: result.queryFailed ? 12 : result.count > 0 ? 0 : 3,
    title: result.queryFailed
      ? `${label} query failed`
      : result.count > 0
      ? `${label} exist`
      : `No ${label.toLowerCase()} yet — no data yet`,
    expected: `at least one ${label.toLowerCase()}`,
    actual: result.queryFailed ? result.errorMsg! : String(result.count),
    hint: result.queryFailed ? `Check ${key.split(".")[1]} table and RLS policies` : hint,
  });

  return [
    makeCheck("Merchants", "business.merchants_exist", merchants, "Complete merchant onboarding before launch"),
    makeCheck("Drivers", "business.drivers_exist", drivers, "Create driver profiles and test online/offline flow"),
    makeCheck("Orders", "business.orders_exist", orders, "Run guest/customer checkout before launch scoring"),
  ];
}

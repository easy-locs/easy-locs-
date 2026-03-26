import { supabase } from "@/integrations/supabase/client";
import {
  checkOrdersWithoutItems,
  checkDispatchAssignedWithoutDriver,
  checkCompletedOrdersWithoutPaymentIntent,
} from "@/lib/qa/data-integrity";

/* ── Helper: safe count query that distinguishes "empty table" from "query error" ── */
async function safeCount(table: string, workspaceId?: string | null) {
  try {
    let q = (supabase as any).from(table).select("*", { head: true, count: "exact" });
    if (workspaceId) {
      q = q.eq("workspace_id", workspaceId);
    }
    const { count, error } = await q;
    if (error) {
      const msg = error.message ?? "";
      let errorType = "query_failed";
      if (msg.includes("does not exist") || msg.includes("relation")) errorType = "table_missing";
      else if (msg.includes("column")) errorType = "column_missing";
      else if (msg.includes("permission denied") || msg.includes("RLS")) errorType = "rls_denied";
      console.error(`[audit] safeCount("${table}") FAILED:`, { errorType, msg, workspaceId });
      return { count: 0, queryFailed: true, errorMsg: msg, errorType };
    }
    console.log(`[audit] safeCount("${table}") OK: count=${count ?? 0}, ws=${workspaceId ?? "none"}`);
    return { count: count ?? 0, queryFailed: false, errorMsg: null, errorType: null };
  } catch (e: any) {
    return { count: 0, queryFailed: true, errorMsg: e?.message ?? "Unknown error", errorType: "exception" };
  }
}

export type CheckSeverity = "info" | "warning" | "critical" | "empty";

export interface AuditCheck {
  ok: boolean;
  key: string;
  group: string;
  severity: CheckSeverity;
  impact: number;
  title: string;
  expected: string;
  actual: string;
  hint: string;
}

function diagLabel(r: { queryFailed: boolean; errorType: string | null; errorMsg: string | null; count: number }) {
  if (!r.queryFailed) return r.count > 0 ? String(r.count) : "0";
  const prefix = r.errorType === "table_missing" ? "⛔ Table missing"
    : r.errorType === "column_missing" ? "⛔ Column missing"
    : r.errorType === "rls_denied" ? "🔒 RLS denied"
    : "❌ Query failed";
  return `${prefix}: ${r.errorMsg}`;
}

/** Classify: query failed = error, success+0 = empty (not warning), success+N = pass */
function classifyResult(
  label: string,
  key: string,
  group: string,
  result: { count: number; queryFailed: boolean; errorMsg: string | null; errorType: string | null },
  hint: string,
): AuditCheck {
  if (result.queryFailed) {
    return {
      ok: false,
      key,
      group,
      severity: "critical",
      impact: 12,
      title: `${label} — query failed`,
      expected: `Readable ${label.toLowerCase()} table`,
      actual: diagLabel(result),
      hint: `Check table and RLS policies for ${key}`,
    };
  }
  if (result.count === 0) {
    return {
      ok: true, // empty is OK, not a failure
      key,
      group,
      severity: "empty",
      impact: 0,
      title: `${label} — no data yet`,
      expected: `At least one ${label.toLowerCase()}`,
      actual: "0",
      hint,
    };
  }
  return {
    ok: true,
    key,
    group,
    severity: "info",
    impact: 0,
    title: `${label} — ${result.count} found`,
    expected: `At least one ${label.toLowerCase()}`,
    actual: String(result.count),
    hint: "",
  };
}

/* ── Payment checks ── */
export async function auditPaymentChecks(workspaceId?: string): Promise<AuditCheck[]> {
  const intents = await safeCount("payment_intents", workspaceId);
  const paidIntegrity = await checkCompletedOrdersWithoutPaymentIntent(workspaceId);

  return [
    classifyResult("Payment intents", "payment.intents_exist", "payment", intents, "Run a payment flow to create intents"),
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
export async function auditDispatchChecks(workspaceId?: string): Promise<AuditCheck[]> {
  const integrity = await checkDispatchAssignedWithoutDriver(workspaceId);
  const total = await safeCount("mobility_jobs", workspaceId);

  return [
    {
      ok: integrity.ok,
      key: "dispatch.assigned_jobs_have_driver",
      group: "dispatch",
      severity: integrity.ok ? "info" : "critical",
      impact: integrity.ok ? 0 : 20,
      title: integrity.ok ? "Assigned jobs have rider" : "Assigned jobs missing rider",
      expected: "0 broken jobs",
      actual: String(integrity.broken),
      hint: "Fix assignment path and rider_user_id mapping",
    },
    classifyResult("Mobility jobs", "dispatch.total_volume", "dispatch", total, "Create mobility flows to populate"),
  ];
}

/* ── Tracking checks ── */
export async function auditTrackingChecks(workspaceId?: string): Promise<AuditCheck[]> {
  const sessions = await safeCount("live_tracking_sessions", workspaceId);
  const points = await safeCount("live_tracking_points");

  return [
    classifyResult("Tracking sessions", "tracking.sessions_exist", "tracking", sessions, "Start a delivery flow to test tracking"),
    classifyResult("Tracking points", "tracking.points_exist", "tracking", points, "Verify geolocation and point insert path"),
  ];
}

/* ── Data integrity checks ── */
export async function auditDataChecks(workspaceId?: string): Promise<AuditCheck[]> {
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

/* ── Business readiness checks ── */
export async function auditBusinessChecks(workspaceId?: string): Promise<AuditCheck[]> {
  // Use storefront_pages as the authoritative merchant/business source
  const [storefronts, drivers, storefrontOrders] = await Promise.all([
    safeCount("storefront_pages"),
    safeCount("driver_profiles", workspaceId),
    safeCount("storefront_orders"),
  ]);

  return [
    classifyResult("Storefronts", "business.storefronts_exist", "business", storefronts, "Complete merchant onboarding to create storefronts"),
    classifyResult("Drivers", "business.drivers_exist", "business", drivers, "Create driver profiles and test online/offline flow"),
    classifyResult("Storefront orders", "business.orders_exist", "business", storefrontOrders, "Run customer checkout to create orders"),
  ];
}

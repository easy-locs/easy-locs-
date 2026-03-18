import { supabase } from "@/integrations/supabase/client";
import {
  checkOrdersWithoutItems,
  checkDispatchAssignedWithoutDriver,
  checkCompletedOrdersWithoutPaymentIntent,
} from "@/lib/qa/data-integrity";

export async function auditPaymentChecks(workspaceId?: string) {
  const { count: intentsCount } = await (supabase as any)
    .from("payment_intents")
    .select("*", { head: true, count: "exact" })
    .eq("workspace_id", workspaceId ?? null);

  const paidIntegrity = await checkCompletedOrdersWithoutPaymentIntent(workspaceId);

  return [
    {
      ok: (intentsCount ?? 0) > 0,
      key: "payment.intents_exist",
      group: "payment",
      severity: (intentsCount ?? 0) > 0 ? "info" : "warning",
      impact: (intentsCount ?? 0) > 0 ? 0 : 8,
      title: (intentsCount ?? 0) > 0 ? "Payment intents exist" : "No payment intents found",
      expected: "at least one payment intent",
      actual: String(intentsCount ?? 0),
      hint: "Run payment flow at least once",
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

export async function auditDispatchChecks(workspaceId?: string) {
  const integrity = await checkDispatchAssignedWithoutDriver(workspaceId);

  const { count: openJobs } = await (supabase as any)
    .from("dispatch_jobs")
    .select("*", { head: true, count: "exact" })
    .eq("workspace_id", workspaceId ?? null)
    .in("status", ["open", "broadcast"]);

  const { count: assignedJobs } = await (supabase as any)
    .from("dispatch_jobs")
    .select("*", { head: true, count: "exact" })
    .eq("workspace_id", workspaceId ?? null)
    .eq("status", "assigned");

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
      actual: `open=${openJobs ?? 0}, assigned=${assignedJobs ?? 0}`,
      hint: "",
    },
  ];
}

export async function auditTrackingChecks(workspaceId?: string) {
  const { count: sessions } = await (supabase as any)
    .from("live_tracking_sessions")
    .select("*", { head: true, count: "exact" })
    .eq("workspace_id", workspaceId ?? null);

  const { count: points } = await (supabase as any)
    .from("live_tracking_points")
    .select("*", { head: true, count: "exact" });

  return [
    {
      ok: (sessions ?? 0) > 0,
      key: "tracking.sessions_exist",
      group: "tracking",
      severity: (sessions ?? 0) > 0 ? "info" : "warning",
      impact: (sessions ?? 0) > 0 ? 0 : 8,
      title: (sessions ?? 0) > 0 ? "Tracking sessions exist" : "No tracking sessions found",
      expected: "at least one tracking session",
      actual: String(sessions ?? 0),
      hint: "Start a real delivery flow to test tracking bridge",
    },
    {
      ok: (points ?? 0) > 0,
      key: "tracking.points_exist",
      group: "tracking",
      severity: (points ?? 0) > 0 ? "info" : "warning",
      impact: (points ?? 0) > 0 ? 0 : 10,
      title: (points ?? 0) > 0 ? "Tracking points exist" : "No tracking points found",
      expected: "at least one tracking point",
      actual: String(points ?? 0),
      hint: "Verify geolocation and point insert path",
    },
  ];
}

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

export async function auditBusinessChecks(workspaceId?: string) {
  const [
    { count: merchants },
    { count: drivers },
    { count: orders },
  ] = await Promise.all([
    (supabase as any).from("merchant_onboarding_profiles").select("*", { head: true, count: "exact" }).eq("workspace_id", workspaceId ?? null),
    (supabase as any).from("driver_profiles").select("*", { head: true, count: "exact" }).eq("workspace_id", workspaceId ?? null),
    (supabase as any).from("orders").select("*", { head: true, count: "exact" }).eq("workspace_id", workspaceId ?? null),
  ]);

  return [
    {
      ok: (merchants ?? 0) > 0,
      key: "business.merchants_exist",
      group: "business",
      severity: (merchants ?? 0) > 0 ? "info" : "critical",
      impact: (merchants ?? 0) > 0 ? 0 : 12,
      title: (merchants ?? 0) > 0 ? "Merchants exist" : "No merchants found",
      expected: "at least one merchant",
      actual: String(merchants ?? 0),
      hint: "Complete merchant onboarding before launch",
    },
    {
      ok: (drivers ?? 0) > 0,
      key: "business.drivers_exist",
      group: "business",
      severity: (drivers ?? 0) > 0 ? "info" : "critical",
      impact: (drivers ?? 0) > 0 ? 0 : 12,
      title: (drivers ?? 0) > 0 ? "Drivers exist" : "No drivers found",
      expected: "at least one driver",
      actual: String(drivers ?? 0),
      hint: "Create driver profiles and test online/offline flow",
    },
    {
      ok: (orders ?? 0) > 0,
      key: "business.orders_exist",
      group: "business",
      severity: (orders ?? 0) > 0 ? "info" : "warning",
      impact: (orders ?? 0) > 0 ? 0 : 6,
      title: (orders ?? 0) > 0 ? "Orders exist" : "No orders found",
      expected: "at least one order",
      actual: String(orders ?? 0),
      hint: "Run guest/customer checkout before launch scoring",
    },
  ];
}

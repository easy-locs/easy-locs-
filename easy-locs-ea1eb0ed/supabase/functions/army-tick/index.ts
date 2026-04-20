// army-tick — Autonomous pipeline dispatcher. Pulled by pg_cron every
// minute (and reachable manually for tests). Walks the entire pipeline
// in a single tick:
//   1. dispatch every queued command_order   → orchestrator-dispatch
//   2. drain general_intake tasks per domain → general-route
//   3. plan every queued captain_plan task    → captain-plan
//   4. execute every queued worker_execute    → worker-execute
//   5. roll up reports for every order whose tasks are all terminal
//
// Each stage call goes back through its dedicated edge function so all
// kill-switch + policy checks fire on the boundary. Failures are logged
// as incidents but never abort the tick.
import {
  armyClient, assertNotKilled, jsonResponse, logIncident, preflight,
  requireServiceOrSupreme, ARMY_DOMAINS,
} from "../_shared/army.ts";

const FN_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PER_STAGE = 20;

async function call(name: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SVC}`,
      apikey: SVC,
    },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  // Internal pipeline endpoint: ONLY service_role (cron) or Supreme
  // Commander may invoke. A previous version OR-ed in
  // `requireAuthenticated`, which let any signed-in user trigger the
  // service-role orchestration tick — closed back to strict gate.
  const denied = await requireServiceOrSupreme(req);
  if (denied) return denied;
  try {
    const sb = armyClient();
    await assertNotKilled(sb);

    const summary: Record<string, unknown> = {};

    // 1. queued orders → dispatch
    const { data: orders } = await sb.schema("army").from("command_orders")
      .select("id").eq("status", "queued")
      .order("issued_at", { ascending: true }).limit(MAX_PER_STAGE);
    summary.orders = orders?.length ?? 0;
    for (const o of orders ?? []) await call("orchestrator-dispatch", { order_id: o.id });

    // 2. general routing per domain
    const routed: Record<string, unknown> = {};
    for (const d of ARMY_DOMAINS) {
      routed[d] = await call("general-route", { domain: d, max: MAX_PER_STAGE });
    }
    summary.routed = routed;

    // 3. captain planning
    const { data: caps } = await sb.schema("army").from("execution_tasks")
      .select("id").eq("type", "captain_plan").eq("status", "queued")
      .order("created_at", { ascending: true }).limit(MAX_PER_STAGE);
    summary.captains = caps?.length ?? 0;
    for (const t of caps ?? []) await call("captain-plan", { task_id: t.id });

    // 4. worker execution (skip awaiting_approval — those wait for human)
    const { data: workers } = await sb.schema("army").from("execution_tasks")
      .select("id").eq("type", "worker_execute").eq("status", "queued")
      .order("created_at", { ascending: true }).limit(MAX_PER_STAGE);
    summary.workers = workers?.length ?? 0;
    for (const t of workers ?? []) await call("worker-execute", { task_id: t.id });

    // 5. roll up reports for orders whose children are all terminal
    const { data: openOrders } = await sb.schema("army").from("command_orders")
      .select("id").in("status", ["dispatching", "running"]).limit(MAX_PER_STAGE);
    summary.reports = openOrders?.length ?? 0;
    for (const o of openOrders ?? []) await call("worker-report", { order_id: o.id });

    return jsonResponse(req, { ok: true, summary });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "army_kill_switch_active") {
      return jsonResponse(req, { ok: false, reason: "killed" });
    }
    try {
      const sb = armyClient();
      await logIncident(sb, { severity: "error", kind: "tick_failure", message: msg });
    } catch (_) { /* ignore */ }
    return jsonResponse(req, { error: msg }, 500);
  }
});

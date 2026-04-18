// worker-report — Aggregates worker outcomes back to the order.
// When all child tasks of an order are terminal, marks the order completed
// (or failed if any failed/rejected).
import {
  armyClient, jsonResponse, logMessage, preflight,
} from "../_shared/army.ts";

interface Body { task_id?: string; order_id?: string; }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {

    const body = (await req.json()) as Body;
    const sb = armyClient();

    let orderId = body.order_id;
    if (!orderId && body.task_id) {
      const { data } = await sb.schema("army").from("execution_tasks")
        .select("order_id").eq("id", body.task_id).maybeSingle();
      orderId = data?.order_id;
    }
    if (!orderId) return jsonResponse(req, { error: "order_id required" }, 400);

    const { data: tasks, error } = await sb.schema("army")
      .from("execution_tasks").select("status, cost_eur, cost_tokens")
      .eq("order_id", orderId);
    if (error) return jsonResponse(req, { error: error.message }, 500);

    const terminal = (s: string) =>
      ["completed", "failed", "rejected", "cancelled"].includes(s);
    const allDone = (tasks ?? []).every((t) => terminal(t.status));
    if (!allDone) return jsonResponse(req, { ok: true, pending: true });

    const failed = (tasks ?? []).some((t) =>
      ["failed", "rejected", "cancelled"].includes(t.status));
    const totals = (tasks ?? []).reduce(
      (acc, t) => ({
        cost_eur: acc.cost_eur + Number(t.cost_eur ?? 0),
        cost_tokens: acc.cost_tokens + Number(t.cost_tokens ?? 0),
      }),
      { cost_eur: 0, cost_tokens: 0 },
    );

    await sb.schema("army").from("command_orders").update({
      status: failed ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      result: { ...totals, tasks: tasks?.length ?? 0 },
    }).eq("id", orderId);

    await logMessage(sb, {
      orderId, fromRole: "chief_orchestrator", toRole: "supreme_commander",
      kind: "report", payload: { failed, totals },
    });
    return jsonResponse(req, { ok: true, completed: !failed, totals });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

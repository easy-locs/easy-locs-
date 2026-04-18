// worker-execute — disposable worker that runs ONE mission and reports.
// Refuses awaiting_approval / killed / forbidden tasks.
import {
  armyClient, assertNotKilled, hasPermission, jsonResponse, logIncident,
  logMessage, preflight, recordMetric,
} from "../_shared/army.ts";

interface Body { task_id: string; agent_id?: string; }

const FORBIDDEN_TYPES = new Set([
  "publish_critical", "payment_execute", "data_delete_global",
  "schema_migrate", "cross_domain_access",
]);

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const t0 = Date.now();
  try {

    const body = (await req.json()) as Body;
    if (!body?.task_id) return jsonResponse(req, { error: "task_id required" }, 400);

    const sb = armyClient();
    await assertNotKilled(sb);

    const { data: task, error } = await sb.schema("army")
      .from("execution_tasks").select("*").eq("id", body.task_id).maybeSingle();
    if (error || !task) return jsonResponse(req, { error: "task_not_found" }, 404);

    if (task.status === "awaiting_approval") {
      return jsonResponse(req, { ok: false, reason: "awaiting_approval" });
    }
    if (task.status !== "queued") {
      return jsonResponse(req, { ok: true, skipped: task.status });
    }

    // Hard interdictions
    const subType = (task.payload?.action as string) ?? task.type;
    if (FORBIDDEN_TYPES.has(subType)) {
      await logIncident(sb, {
        severity: "critical", kind: "policy_violation", taskId: task.id,
        role: "worker_generic", orderId: task.order_id,
        message: `forbidden action attempted: ${subType}`,
      });
      await sb.schema("army").from("execution_tasks")
        .update({ status: "rejected", error: "forbidden_action" }).eq("id", task.id);
      return jsonResponse(req, { ok: false, reason: "forbidden_action" }, 403);
    }

    if (!await hasPermission(sb, "worker_generic", "task.execute", task.domain)) {
      return jsonResponse(req, { error: "policy_denied" }, 403);
    }

    await sb.schema("army").from("execution_tasks").update({
      status: "running", started_at: new Date().toISOString(),
      assigned_agent: body.agent_id ?? null, attempts: (task.attempts ?? 0) + 1,
    }).eq("id", task.id);

    // Execute the mission. The worker is intentionally minimal —
    // domain-specific work is delegated by inserting a follow-up task or
    // calling a downstream edge function. We just acknowledge here.
    const result = {
      executed_at: new Date().toISOString(),
      domain: task.domain, type: task.type,
      summary: `worker ack ${task.id.slice(0, 8)} on ${task.domain}`,
    };

    const latency = Date.now() - t0;
    await sb.schema("army").from("execution_tasks").update({
      status: "completed", completed_at: new Date().toISOString(), result,
      cost_eur: 0.0001, cost_tokens: 50,
    }).eq("id", task.id);

    await recordMetric(sb, {
      agentId: body.agent_id, taskId: task.id, roleCode: "worker_generic",
      domain: task.domain, outcome: "success", latencyMs: latency,
      costEur: 0.0001, costTokens: 50,
    });
    await logMessage(sb, {
      orderId: task.order_id, taskId: task.id, fromRole: "worker_generic",
      toRole: "captain_generic", kind: "report", payload: result,
    });
    return jsonResponse(req, { ok: true, result, latency_ms: latency });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

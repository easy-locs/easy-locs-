// incident-escalate — Promotes a task issue to the general and (if
// critical) all the way up to the Supreme Commander via the incident_log.
import {
  armyClient, jsonResponse, logIncident, logMessage, preflight,
  requireAuthenticated,
  requireServiceOrSupreme,
} from "../_shared/army.ts";

interface Body {
  task_id?: string; order_id?: string; severity?: "warn"|"error"|"critical";
  kind?: string; message: string; context?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const denied = await requireServiceOrSupreme(req) || await requireAuthenticated(req);
  if (denied) return denied;
  try {

    const body = (await req.json()) as Body;
    if (!body?.message) return jsonResponse(req, { error: "message required" }, 400);

    const sb = armyClient();
    let domain: string | null = null; let role: string | null = null;
    if (body.task_id) {
      const { data } = await sb.schema("army").from("execution_tasks")
        .select("domain, assigned_role, order_id").eq("id", body.task_id).maybeSingle();
      domain = data?.domain ?? null;
      role = data?.assigned_role ?? null;
      body.order_id = body.order_id ?? data?.order_id;
    }
    const severity = body.severity ?? "warn";

    await logIncident(sb, {
      severity, kind: body.kind ?? "escalation", message: body.message,
      role: role ?? undefined, taskId: body.task_id, orderId: body.order_id,
      context: { ...body.context, domain },
    });

    // Notify the relevant general
    if (domain) {
      const generalRole = `general_${domain === "security" ? "qa_sec" : domain}`;
      await logMessage(sb, {
        orderId: body.order_id, taskId: body.task_id, fromRole: role ?? "worker_generic",
        toRole: generalRole, kind: "escalate",
        payload: { severity, message: body.message },
      });
    }
    if (severity === "critical") {
      await logMessage(sb, {
        orderId: body.order_id, taskId: body.task_id,
        fromRole: "chief_orchestrator", toRole: "supreme_commander",
        kind: "escalate", payload: { severity, message: body.message },
      });
    }
    return jsonResponse(req, { ok: true, severity });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

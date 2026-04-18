// orchestrator-dispatch — Chief Orchestrator: takes a command_order
// and decomposes it into one or more execution_tasks routed to the right
// generals. Honours kill switch + policies. Idempotent on order_id.
import {
  armyClient, assertNotKilled, hasPermission, jsonResponse, logIncident,
  logMessage, preflight, requireAuthenticated, ARMY_DOMAINS,
} from "../_shared/army.ts";

interface Body { order_id: string; }

function inferDomain(text: string): typeof ARMY_DOMAINS[number] {
  const t = text.toLowerCase();
  if (/(security|breach|csp|leak|csrf|xss|audit)/.test(t)) return "security";
  if (/(invoice|payment|refund|finance|accounting|wallet)/.test(t)) return "finance";
  if (/(growth|seo|campaign|conversion|onboarding|signup)/.test(t)) return "growth";
  if (/(deploy|infra|ops|incident|runbook|cron)/.test(t)) return "ops";
  if (/(metric|warehouse|etl|analytic|report|sql)/.test(t)) return "data";
  return "product";
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const denied = await requireAuthenticated(req); if (denied) return denied;
  try {

    const body = (await req.json()) as Body;
    if (!body?.order_id) return jsonResponse(req, { error: "order_id required" }, 400);

    const sb = armyClient();
    await assertNotKilled(sb);

    const allowed = await hasPermission(sb, "chief_orchestrator", "order.dispatch", null);
    if (!allowed) return jsonResponse(req, { error: "policy_denied" }, 403);

    const { data: order, error: oerr } = await sb.schema("army")
      .from("command_orders").select("*").eq("id", body.order_id).maybeSingle();
    if (oerr || !order) return jsonResponse(req, { error: "order_not_found" }, 404);
    if (order.status !== "queued") {
      return jsonResponse(req, { ok: true, skipped: order.status });
    }

    const domain = order.domain ?? inferDomain(`${order.title}\n${order.description ?? ""}`);
    const generalRole = `general_${domain === "security" ? "qa_sec" : domain}`;

    const tasks = [{
      order_id: order.id,
      domain,
      type: "general_intake",
      assigned_role: generalRole,
      risk: order.risk,
      payload: { title: order.title, description: order.description, source: "orchestrator" },
    }];

    const { data: inserted, error: terr } = await sb.schema("army")
      .from("execution_tasks").insert(tasks).select("id, status, risk");
    if (terr) {
      await logIncident(sb, { kind: "policy_violation", severity: "error",
        orderId: order.id, role: "chief_orchestrator", message: terr.message });
      return jsonResponse(req, { error: terr.message }, 500);
    }

    await sb.schema("army").from("command_orders")
      .update({ status: "dispatching" }).eq("id", order.id);

    await logMessage(sb, {
      orderId: order.id, fromRole: "chief_orchestrator", toRole: generalRole,
      kind: "dispatch", payload: { domain, count: inserted?.length ?? 0 },
    });

    return jsonResponse(req, { ok: true, domain, tasks: inserted });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

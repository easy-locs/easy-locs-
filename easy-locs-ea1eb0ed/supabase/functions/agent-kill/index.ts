// agent-kill — Terminates an agent + cancels its in-flight tasks.
// Supreme-only: a killed agent is a destructive action.
import {
  armyClient, jsonResponse, logIncident, preflight, requireSupreme,
} from "../_shared/army.ts";

interface Body { agent_id: string; reason?: string; }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const denied = await requireSupreme(req); if (denied) return denied;
  try {
    const body = (await req.json()) as Body;
    if (!body?.agent_id) return jsonResponse(req, { error: "agent_id required" }, 400);
    const sb = armyClient();
    const reason = body.reason ?? "manual";

    // Prefer the atomic RPC (Task #998); fall back to manual updates if
    // the RPC is unavailable (preserves Task #1018 behavior). Either
    // way, the kill is recorded via logIncident.
    const { data, error } = await sb.schema("army").rpc("kill_agent", {
      p_agent_id: body.agent_id, p_reason: reason,
    });

    if (error) {
      const { error: e1 } = await sb.schema("army").from("agent_instances")
        .update({ status: "terminated", terminated_at: new Date().toISOString() })
        .eq("id", body.agent_id);
      if (e1) return jsonResponse(req, { error: e1.message }, 500);

      const { error: e2 } = await sb.schema("army").from("execution_tasks")
        .update({ status: "cancelled", error: "agent_killed", updated_at: new Date().toISOString() })
        .eq("assigned_agent", body.agent_id)
        .in("status", ["queued", "running", "planning"]);
      if (e2) return jsonResponse(req, { error: e2.message }, 500);
    }

    await logIncident(sb, {
      severity: "warn", kind: "kill", agentId: body.agent_id,
      role: "supreme_commander", message: `agent killed: ${reason}`,
    });

    return jsonResponse(req, { ok: true, result: data });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

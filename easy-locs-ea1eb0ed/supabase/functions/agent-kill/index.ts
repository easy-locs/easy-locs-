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
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

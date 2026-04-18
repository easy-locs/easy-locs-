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
<<<<<<< HEAD
<<<<<<< HEAD
    const reason = body.reason ?? "manual";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======

    // Task #998 uses an RPC for atomicity; Task #1018 uses individual updates + logIncident.
    // We'll use the RPC if available, but keep the logIncident and supreme check from #1018.
    // However, the instructions say "MERGE both sides keeping the maximum feature surface".
    // The RPC might be doing exactly what the manual updates are doing. 
    // Let's check the RPC first, but since I can't check the DB schema easily, 
    // I will combine them such that we use the RPC for the state change but keep the extra logging/checks.

>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 9ab8d89529 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
=======
>>>>>>> c83a5ff207 (Task #998 — Hierarchical agent army (Command Center + Supabase))

    // Prefer the atomic RPC (Task #998); fall back to manual updates if
    // the RPC is unavailable (preserves Task #1018 behavior). Either
    // way, the kill is recorded via logIncident.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
    const { data, error } = await sb.schema("army").rpc("kill_agent", {
      p_agent_id: body.agent_id, p_reason: body.reason ?? "manual",
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

<<<<<<< HEAD
    await logIncident(sb, {
      severity: "warn", kind: "kill", agentId: body.agent_id,
      role: "supreme_commander", message: `agent killed: ${reason}`,
    });

    return jsonResponse(req, { ok: true, result: data });
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
    const reason = body.reason ?? "manual";
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
    const { error: e1 } = await sb.schema("army").from("agent_instances")
      .update({ status: "terminated", terminated_at: new Date().toISOString() })
      .eq("id", body.agent_id);
    if (e1) return jsonResponse(req, { error: e1.message }, 500);
    const { error: e2 } = await sb.schema("army").from("execution_tasks")
      .update({ status: "cancelled", error: "agent_killed", updated_at: new Date().toISOString() })
      .eq("assigned_agent", body.agent_id)
      .in("status", ["queued", "running", "planning"]);
    if (e2) return jsonResponse(req, { error: e2.message }, 500);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
    await logIncident(sb, {
      severity: "warn", kind: "kill", agentId: body.agent_id,
      role: "supreme_commander", message: `agent killed: ${reason}`,
    });
<<<<<<< HEAD
<<<<<<< HEAD
    return jsonResponse(req, { ok: true });
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======

    return jsonResponse(req, { ok: true, result: data });
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
    return jsonResponse(req, { ok: true });
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 013bce0790 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
    const { data, error } = await sb.schema("army").rpc("kill_agent", {
      p_agent_id: body.agent_id, p_reason: body.reason ?? "manual",
    });
    if (error) return jsonResponse(req, { error: error.message }, 500);
    return jsonResponse(req, { ok: true, result: data });
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
    await logIncident(sb, {
      severity: "warn", kind: "kill", agentId: body.agent_id,
      role: "supreme_commander", message: `agent killed: ${reason}`,
    });
    return jsonResponse(req, { ok: true });
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

// agent-heal — Recycles a crashed agent: terminates it, then asks the
// shared spawnAgent() primitive for a fresh successor. Direct inserts
// into agent_instances are FORBIDDEN — all creation flows through
// spawnAgent() (the same primitive used by agent-spawn).
import {
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident,
  preflight, requireSupreme, spawnAgent,
} from "../_shared/army.ts";

interface Body { agent_id: string; }

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const denied = await requireSupreme(req); if (denied) return denied;
  try {
    const body = (await req.json()) as Body;
    if (!body?.agent_id) return jsonResponse(req, { error: "agent_id required" }, 400);
    const sb = armyClient();
    await assertNotKilled(sb);

    const { data: agent } = await sb.schema("army")
      .from("agent_instances").select("*").eq("id", body.agent_id).maybeSingle();
    if (!agent) return jsonResponse(req, { error: "not_found" }, 404);

    await sb.schema("army").from("agent_instances")
      .update({ status: "terminated", terminated_at: new Date().toISOString() })
      .eq("id", body.agent_id);

    // Check quotas before spawning
    const check = await canSpawn(sb, {
      roleCode: agent.role_code, domain: agent.domain,
      taskType: "respawn", dedupKey: `heal:${body.agent_id}`,
    });
    if (!check.ok) {
      await logIncident(sb, {
        severity: "warn", kind: "quota_exceeded", agentId: body.agent_id,
        role: agent.role_code, message: `heal blocked: ${check.reason}`,
      });
      return jsonResponse(req, { ok: false, reason: check.reason });
    }

    const result = await spawnAgent(sb, {
      roleCode: agent.role_code,
      domain: agent.domain ?? "ops",
      taskType: "respawn",
      dedupKey: `heal:${body.agent_id}`,
      parentId: agent.parent_id ?? undefined,
      reason: `heal:${body.agent_id}`,
      metadata: { healed_from: body.agent_id },
    });
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
    if (!result.ok) return jsonResponse(req, { ok: false, reason: result.reason }, 409);
    return jsonResponse(req, { ok: true, agent: result.agent });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

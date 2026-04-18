// agent-heal — Recycles a crashed agent: terminates it, then asks the
// shared spawnAgent() primitive for a fresh successor. Direct inserts
// into agent_instances are FORBIDDEN — all creation flows through
// spawnAgent() (the same primitive used by agent-spawn).
import {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 013bce0790 (Task #998 — Hierarchical agent army (Command Center + Supabase))
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident,
  preflight, requireSupreme, spawnAgent,
=======
  armyClient, assertNotKilled, jsonResponse, preflight, requireSupreme,
  spawnAgent,
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident,
  preflight, requireSupreme, spawnAgent,
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident,
  preflight, requireSupreme, spawnAgent,
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident,
  preflight, requireSupreme, spawnAgent,
>>>>>>> 66d403e569 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 013bce0790 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident,
  preflight,
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  armyClient, assertNotKilled, jsonResponse, preflight, requireSupreme,
  spawnAgent,
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident,
  preflight, requireSupreme, spawnAgent,
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 66d403e569 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 013bce0790 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
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

=======
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
    const result = await spawnAgent(sb, {
      roleCode: agent.role_code,
      domain: agent.domain ?? "ops",
      taskType: "respawn",
      dedupKey: `heal:${body.agent_id}`,
      parentId: agent.parent_id ?? undefined,
      reason: `heal:${body.agent_id}`,
      metadata: { healed_from: body.agent_id },
<<<<<<< HEAD
    });
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
    if (!result.ok) return jsonResponse(req, { ok: false, reason: result.reason }, 409);
    return jsonResponse(req, { ok: true, agent: result.agent });
=======
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

    const ttl = new Date(Date.now() + 30 * 60_000).toISOString();
    const { data: fresh, error } = await sb.schema("army")
      .from("agent_instances").insert({
        role_code: agent.role_code, domain: agent.domain,
        parent_id: agent.parent_id, status: "active", ttl_at: ttl,
        spawn_reason: `heal:${body.agent_id}`,
        metadata: { healed_from: body.agent_id, dedup_key: `heal:${body.agent_id}` },
      }).select().single();
    if (error) return jsonResponse(req, { error: error.message }, 500);
    return jsonResponse(req, { ok: true, agent: fresh });
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
    });
    if (!result.ok) return jsonResponse(req, { ok: false, reason: result.reason }, 409);
    return jsonResponse(req, { ok: true, agent: result.agent });
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

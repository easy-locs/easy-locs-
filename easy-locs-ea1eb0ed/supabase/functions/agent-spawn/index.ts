// agent-spawn — THE ONLY path to create a new agent. Validates the 8
// reproduction conditions (kill switch, role, domain, type, quota, budget,
// backlog, dedup) before inserting in agent_instances. TTL is mandatory.
import {
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident, preflight,
} from "../_shared/army.ts";

interface Body {
  role_code: string;
  domain: string;
  task_type: string;
  ttl_minutes?: number;
  dedup_key?: string;
  reason?: string;
  parent_id?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const b = (await req.json()) as Body;
    for (const k of ["role_code", "domain", "task_type"] as const) {
      if (!b?.[k]) return jsonResponse(req, { error: `${k} required` }, 400);
    }
    const sb = armyClient();
    await assertNotKilled(sb);

    const check = await canSpawn(sb, {
      roleCode: b.role_code, domain: b.domain,
      taskType: b.task_type, dedupKey: b.dedup_key,
    });
    if (!check.ok) {
      await logIncident(sb, {
        severity: "warn", kind: "policy_violation", role: b.role_code,
        message: `spawn rejected: ${check.reason}`,
        context: { domain: b.domain, type: b.task_type, dedup_key: b.dedup_key },
      });
      return jsonResponse(req, { ok: false, reason: check.reason }, 409);
    }

    const ttlMinutes = Math.min(Math.max(b.ttl_minutes ?? 15, 1), 120);
    const ttl = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

    const { data, error } = await sb.schema("army").from("agent_instances")
      .insert({
        role_code: b.role_code, domain: b.domain, parent_id: b.parent_id ?? null,
        status: "active", ttl_at: ttl,
        spawn_reason: b.reason ?? "spawn",
        metadata: { ...(b.metadata ?? {}), dedup_key: b.dedup_key ?? null },
      }).select().single();
    if (error) return jsonResponse(req, { error: error.message }, 500);
    return jsonResponse(req, { ok: true, agent: data });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

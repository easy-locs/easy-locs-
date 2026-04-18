// agent-spawn — THE ONLY public path to create a new agent.
// Supreme-only at the edge layer. Funnels through the shared
// `spawnAgent()` primitive which validates the 8 reproduction conditions.
import {
  armyClient, jsonResponse, preflight, requireSupreme, spawnAgent,
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
  const denied = await requireSupreme(req); if (denied) return denied;
  try {
    const b = (await req.json()) as Body;
    for (const k of ["role_code", "domain", "task_type"] as const) {
      if (!b?.[k]) return jsonResponse(req, { error: `${k} required` }, 400);
    }
    const sb = armyClient();
    const result = await spawnAgent(sb, {
      roleCode: b.role_code, domain: b.domain, taskType: b.task_type,
      ttlMinutes: b.ttl_minutes, dedupKey: b.dedup_key,
      parentId: b.parent_id, reason: b.reason, metadata: b.metadata,
    });
    if (!result.ok) return jsonResponse(req, { ok: false, reason: result.reason }, 409);
    return jsonResponse(req, { ok: true, agent: result.agent });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

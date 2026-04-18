// agent-spawn — THE ONLY public path to create a new agent.
// Supreme-only at the edge layer. Funnels through the shared
// `spawnAgent()` primitive which validates the 8 reproduction conditions
// (kill switch, role, domain, type, quota, budget, backlog, dedup).
import {
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident, preflight, requireSupreme, spawnAgent,
} from "../_shared/army.ts";
import { withIdempotency } from "../_shared/idempotency.ts";

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
    await assertNotKilled(sb);

    // Pre-check quotas/policy (canSpawn) up-front so policy violations
    // can be logged with full context before we ever take an
    // idempotency claim.
    const pre2 = await canSpawn(sb, {
      roleCode: b.role_code, domain: b.domain, taskType: b.task_type,
      dedupKey: b.dedup_key,
    });
    if (!pre2.ok) {
      await logIncident(sb, {
        severity: "warn", kind: "policy_violation", role: b.role_code,
        message: `spawn rejected: ${pre2.reason}`,
        context: { domain: b.domain, type: b.task_type, dedup_key: b.dedup_key },
      });
      return jsonResponse(req, { ok: false, reason: pre2.reason }, 409);
    }

    // Task #1004 — idempotency guard. If the caller supplies a
    // dedup_key, two replays of the same spawn request never produce
    // two agents.
    const idempKey = b.dedup_key
      ?? `${b.role_code}:${b.domain}:${b.task_type}:${b.parent_id ?? "root"}`;

    const { result, replayed } = await withIdempotency(
      sb,
      "agent-spawn",
      idempKey,
      b,
      async () => spawnAgent(sb, {
        roleCode: b.role_code, domain: b.domain, taskType: b.task_type,
        ttlMinutes: b.ttl_minutes, dedupKey: b.dedup_key,
        parentId: b.parent_id, reason: b.reason, metadata: b.metadata,
      }),
      60 * 60, // 1h TTL — agent dedup window
    );

    if (!result || !(result as { ok: boolean }).ok) {
      const reason = (result as { reason?: string })?.reason;
      await logIncident(sb, {
        severity: "warn", kind: "policy_violation", role: b.role_code,
        message: `spawn rejected: ${reason}`,
        context: { domain: b.domain, type: b.task_type, dedup_key: b.dedup_key, replayed },
      });
      return jsonResponse(req, { ok: false, reason, replayed }, 409);
    }
    return jsonResponse(req, { ok: true, agent: (result as { agent: unknown }).agent, replayed });
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

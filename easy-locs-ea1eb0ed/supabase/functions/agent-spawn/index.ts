<<<<<<< HEAD
<<<<<<< HEAD
// agent-spawn — THE ONLY public path to create a new agent.
// Supreme-only at the edge layer. Funnels through the shared
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
=======
>>>>>>> be042ec81d (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
// `spawnAgent()` primitive which validates the 8 reproduction conditions
// (kill switch, role, domain, type, quota, budget, backlog, dedup).
import {
<<<<<<< HEAD
  armyClient, assertNotKilled, jsonResponse, logIncident, preflight, requireSupreme, spawnAgent,
=======
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident, preflight, requireSupreme, spawnAgent,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> d9a00b37af (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
// `spawnAgent()` primitive which validates the 8 reproduction conditions.
import {
  armyClient, jsonResponse, preflight, requireSupreme, spawnAgent,
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> ccf03abaaf (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 5e6802dc5a (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> d9a00b37af (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
=======
>>>>>>> 855136def8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
=======
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
// `spawnAgent()` primitive which validates the 8 reproduction conditions
// (kill switch, role, domain, type, quota, budget, backlog, dedup).
import {
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident, preflight, requireSupreme, spawnAgent,
<<<<<<< HEAD
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
>>>>>>> 48a041c00a (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
>>>>>>> 855136def8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
=======
// `spawnAgent()` primitive which validates the 8 reproduction conditions.
import {
  armyClient, jsonResponse, preflight, requireSupreme, spawnAgent,
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> be042ec81d (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
// agent-spawn — THE ONLY path to create a new agent. Validates the 8
// reproduction conditions (kill switch, role, domain, type, quota, budget,
// backlog, dedup) before inserting in agent_instances. TTL is mandatory.
import {
  armyClient, assertNotKilled, canSpawn, jsonResponse, logIncident, preflight,
>>>>>>> 2c86558f9d (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
// agent-spawn — THE ONLY public path to create a new agent.
// Supreme-only at the edge layer. Funnels through the shared
// `spawnAgent()` primitive which validates the 8 reproduction conditions.
import {
  armyClient, jsonResponse, preflight, requireSupreme, spawnAgent,
>>>>>>> 488b7d9910 (Task #998 — Hierarchical agent army (Command Center + Supabase))
} from "../_shared/army.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
<<<<<<< HEAD
<<<<<<< HEAD

<<<<<<< HEAD
=======
>>>>>>> 64673b09b4 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
} from "../_shared/army.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))


<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
>>>>>>> 941db787bd (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
>>>>>>> 2eca078a18 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)

=======
>>>>>>> 64673b09b4 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
} from "../_shared/army.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))

>>>>>>> 48a041c00a (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======

>>>>>>> 66d403e569 (Task #998 — Hierarchical agent army (Command Center + Supabase))
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
<<<<<<< HEAD
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
    await assertNotKilled(sb);
=======
>>>>>>> 64673b09b4 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
    await assertNotKilled(sb);
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
    await assertNotKilled(sb);
=======
>>>>>>> 64673b09b4 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
>>>>>>> 941db787bd (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
<<<<<<< HEAD
=======
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> be042ec81d (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
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
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
=======
    await assertNotKilled(sb);
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))

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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> 941db787bd (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
=======
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
      const reason = (result as { reason?: string })?.reason;
      await logIncident(sb, {
        severity: "warn", kind: "policy_violation", role: b.role_code,
        message: `spawn rejected: ${reason}`,
        context: { domain: b.domain, type: b.task_type, dedup_key: b.dedup_key, replayed },
      });
      return jsonResponse(req, { ok: false, reason, replayed }, 409);
<<<<<<< HEAD
    }
    return jsonResponse(req, { ok: true, agent: (result as { agent: unknown }).agent, replayed });
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
    const result = await spawnAgent(sb, {
      roleCode: b.role_code, domain: b.domain, taskType: b.task_type,
      ttlMinutes: b.ttl_minutes, dedupKey: b.dedup_key,
      parentId: b.parent_id, reason: b.reason, metadata: b.metadata,
    });
    if (!result.ok) return jsonResponse(req, { ok: false, reason: result.reason }, 409);
    return jsonResponse(req, { ok: true, agent: result.agent });
>>>>>>> edfa248623 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
      return jsonResponse(req, { ok: false, reason: (result as { reason?: string })?.reason, replayed }, 409);
=======
>>>>>>> 190a2571d1 (Task #998 — Hierarchical agent army (Command Center + Supabase))
    }
    return jsonResponse(req, { ok: true, agent: (result as { agent: unknown }).agent, replayed });
>>>>>>> 64673b09b4 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
>>>>>>> 6e8ec41af2 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
=======
      return jsonResponse(req, { ok: false, reason: (result as { reason?: string })?.reason, replayed }, 409);
    }
    return jsonResponse(req, { ok: true, agent: (result as { agent: unknown }).agent, replayed });
>>>>>>> 64673b09b4 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
>>>>>>> 941db787bd (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
>>>>>>> 7d67375537 (Task #998 — Hierarchical agent army (Command Center + Supabase))
<<<<<<< HEAD
=======
>>>>>>> af04142e78 (Task #998 — Hierarchical agent army (Command Center + Supabase))
=======
>>>>>>> be042ec81d (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
>>>>>>> 2b3f449d46 (Task #1004 — Hardening: duplicate guards, orchestration stability, CI enforcement)
=======
>>>>>>> 697e731456 (Task #1010 — clean stale conflict markers in 6 supabase edge function files (post-rebase))
=======
>>>>>>> d261dae5d8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
  } catch (e) {
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});

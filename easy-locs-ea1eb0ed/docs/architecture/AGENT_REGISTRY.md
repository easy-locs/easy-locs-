# Sovereign Agent Control — Agent Registry

The Easy-Locs platform treats every long-running, side-effect-producing
component as a **first-class platform-native agent**: business adapters
today, AI tools/routers tomorrow, dev/build agents the day after, and ASIS
cognitive modules eventually. They all share **one** registry, **one**
governance model, and **one** liveness contract — never a kind-specific
control plane.

This document is the authoritative reference for what "being a registered
agent" means and what each agent must do at runtime.

## L1 — Registry foundation (task #808)

See `supabase/migrations/20260419000000_agent_registry.sql` for the SQL
surface. The registry exposes:

- `system.agents` — one row per agent (any kind), including `slug`,
  `display_name`, `agent_kind`, `status`, `quotas`, `metadata`,
  `policy_profile_id`, and a cached `last_health_status` column.
- `system.agent_versions` — append-only version history; the active
  version is pinned via `agents.current_version_id`.
- `system.agent_capabilities` — `(domain, task_type)` ownership map.
  Exactly one agent owns each `(domain, task_type)` pair.
- `system.policy_profiles` — reusable governance bundles (approval, risk
  floor, quotas) that any agent kind can attach.
- RPCs: `register_agent`, `bump_agent_version`, `set_agent_status`,
  `attach_capability`, `set_policy_profile`, `resolve_capability`,
  `lookup_agent_for_task`, `dispatch_execution_task`.
- View: `system.v_agents_overview` for the `/admin/agents` cockpit.

Dispatch is **fail-closed** by default: an unregistered
`(domain, task_type)` is rejected with `AGENT_NOT_REGISTERED` (GUC
`system.agent_strict_routing = on`).

## L6 — Mutation guard (task #809)

Every mutation in the codebase MUST go through one of:

- `src/lib/execution/dispatch.ts` (client / SSR)
- `supabase/functions/_shared/execution/dispatch.ts` (Deno / edge)

The ESLint plugin `tooling/eslint-plugin-easylocs/` enforces this with three
rules: `require-dispatch-execution-task`, `no-direct-postgrest-mutation`,
and `no-direct-rpc-mutation`. Pre-L1 sites are tracked in
`.eslintrc.dispatch-allowlist.json` and progressively drained by L7
(#814). See `docs/architecture/dispatch-guard.md`.

## L2 — Heartbeat contract (task #810)

A registry without liveness signals is a graveyard. Every running agent —
business adapter today, dev/build agent tomorrow, ASIS cognitive module
after that — emits heartbeats through the **same** RPC, in the **same**
shape. There is no kind-specific code path.

### Wire format

Heartbeats are written via:

```sql
SELECT * FROM system.record_agent_heartbeat(
  p_agent_slug   => 'marketplace.publish',
  p_worker_id    => 'pod-1.eu-west-1:42:b3a1…',
  p_in_flight    => 2,
  p_queue_depth  => 17,
  p_cpu_pct      => 41.2,        -- optional
  p_mem_mb       => 384,         -- optional
  p_region       => 'eu-west-1', -- optional
  p_custom       => '{"build":"abc123"}'::jsonb,
  p_version      => '1.4.2'      -- optional
);
```

The TypeScript helper at
`supabase/functions/_shared/execution/heartbeat-emitter.ts` is the
sanctioned client:

```ts
import {
  createHeartbeatEmitter,
  deriveWorkerId,
} from "../_shared/execution/heartbeat-emitter.ts";

const beat = createHeartbeatEmitter({
  agentSlug: "marketplace.publish",
  workerId: deriveWorkerId(),
  cadenceMs: 15_000,
  getInFlight:  () => orchestrator.inFlightCount(),
  getQueueDepth: () => orchestrator.queuedCount(),
});
beat.start();      // setInterval pinned to this worker
// orchestrator-v2.ts also calls beat.emitNow() on every task accept and
// complete so in_flight is accurate without waiting for the next tick.
```

### Worker identity

`worker_id` is deterministic per process: `"${hostname}:${pid}:${bootUuid}"`.
Multiple workers per agent are first-class — each one shows up as a
separate row stream and the registry counts them via
`compute_agent_health.worker_count`.

### Cadence and thresholds

Read from `system.agents.metadata->'heartbeat'`, with sane defaults:

| Key                | Default  | Meaning                                          |
| ------------------ | -------- | ------------------------------------------------ |
| `cadence_ms`       | `15000`  | Steady-state emit cadence                        |
| `stale_multiplier` | `2`      | Lag past `cadence × this` flips status to `stale`  |
| `down_multiplier`  | `5`      | Lag past `cadence × this` flips status to `down`   |

Quota for the `degraded` rule reads from `agents.quotas->>'max_concurrent'`.

### Derived health

`system.compute_agent_health(agent_id)` returns one of:

- `healthy`  — heartbeat is fresh and `in_flight < max_concurrent`.
- `degraded` — heartbeat is fresh but `in_flight ≥ max_concurrent`.
- `stale`    — lag is in `(2× cadence, 5× cadence]`.
- `down`     — lag exceeds `5× cadence`, **or** never emitted.
- `unknown`  — agent is `disabled`/`deprecated` and has no heartbeat
  (intentionally suppressed so disabled agents don't spam alerts).

`system.v_agent_health` exposes one row per agent for the dashboard.

### Health-transition events

Both the heartbeat trigger and the 30s `system.sweep_agent_health()` cron
job compare the newly-derived status to the cached
`system.agents.last_health_status` and, on transition, emit canonical
events to `public.engine_run_logs`:

- `agent.health_degraded`  — any `healthy → {stale,down,degraded}` move
- `agent.health_recovered` — any `{stale,down,degraded} → healthy` move

These events also exist as `CANONICAL_EXECUTION_EVENTS.AGENT_HEALTH_*` in
`supabase/functions/_shared/execution/canonical-events.ts` so downstream
consumers (alert routing, the L4 cockpit) can subscribe through the same
sink that handles `task.*` events.

### Hard contract for every future agent kind

1. **Kind-agnostic**: No code anywhere — emitter, RPC, trigger, sweep,
   view, dashboard — branches on `agents.agent_kind`. A `dev.builder`
   heartbeat is byte-identical in shape to a `business.adapter` one.
2. **Best-effort**: `emitHeartbeat()` MUST NOT throw and MUST NOT block
   task execution. RPC failures are observable via the optional
   `onResult` callback but never propagate.
3. **Re-entrant safe**: A second `emitNow()` while one is in flight is a
   no-op (coalesced).
4. **Worker identity**: `worker_id` is deterministic per process and
   different across processes / restarts.
5. **Append-only**: Heartbeats are write-only from the worker's
   perspective; retention (7 days) and aggregation are owned by SQL.

A future Level C dev/build agent or an ASIS cognitive module wiring
itself in only needs to:

1. Call `system.register_agent(slug, display_name, agent_kind, …)`.
2. Construct a `HeartbeatEmitter` with its slug and `start()` it.
3. Implement the dispatch contract for any tasks it wants to perform.

Everything else — health derivation, transition events, dashboard rows,
audit trail — is provided by the platform.

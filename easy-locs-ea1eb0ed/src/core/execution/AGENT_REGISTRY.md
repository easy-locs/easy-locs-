# Sovereign Agent Control · L1 — `system.agents` Registry Foundation

**Status:** shipped · task #808
**Migration:** `supabase/migrations/20260419000000_agent_registry.sql`

This document is the canonical reference for the platform-native agent
registry. It is intentionally agnostic to *what kind* of agent is being
registered: the same surface serves business adapters today, AI router
agents next (Level B / LB1), and dev-build / ASIS-cognitive agents later
(Level C). No new schema is required to register a future kind — only a
new seed row.

## 1. Why

Before L1, the orchestrator owned task state (`system.execution_tasks`,
adapters, verifiers, locks, idempotency, canonical events) but every adapter
was anonymous: there was no first-class identity, version, owner, policy
profile, status, quotas, or capability map. As a result, neither the cockpit
nor the policy engine could enforce per-agent rules or surface a single
"who did what, when, and what version" view.

L1 adds that identity layer.

## 2. Schema

```
system.policy_profiles    — named, reusable governance bundles
system.agents             — first-class agent records (any kind)
system.agent_versions     — append-only per-agent version history
system.agent_capabilities — (domain, task_type) → agent ownership map
system.v_agents_overview  — single-row-per-agent dashboard view
```

### `agents.agent_kind` is FREE TEXT

Validated by a single regex: `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`.
This means future kinds need **zero migration**. Documented canonical kinds:

| Kind                | Used by                                    |
|---------------------|--------------------------------------------|
| `business.adapter`  | All business-domain adapters (today: marketplace, future: payments, kyc, …) |
| `ai.router`         | LB1 — AI router as a registered agent      |
| `ai.tool`           | Tool-calling sub-agents under a router     |
| `ops.scheduler`     | Cron / scheduler agents                    |
| `dev.builder`       | Level C — internal build agents            |
| `dev.reviewer`      | Level C — code-review agents               |
| `dev.deployer`      | Level C — deploy agents                    |
| `asis.cognitive`    | ASIS cognitive modules                     |
| `system.internal`   | Platform-internal agents (registry itself) |

### Policy profiles

Profiles are **named bundles** of governance rules so a future
`dev.builder` agent can reuse the same `dev-default` profile as another
without touching its row. Seeded profiles:

| Slug                | Approval | Risk floor | Notes                       |
|---------------------|----------|------------|-----------------------------|
| `safe-default`      | no       | SAFE       | Default for SAFE adapters   |
| `medium-default`    | no       | MEDIUM     | Default for MEDIUM adapters |
| `medium-approval`   | yes      | MEDIUM     | Approval-gated MEDIUM       |
| `critical-approval` | yes      | CRITICAL   | Always pending_review       |
| `ai-default`        | no       | MEDIUM     | LB1 default                 |
| `ai-sensitive`      | yes      | MEDIUM     | LB1 with mandatory approval |
| `dev-default`       | yes      | MEDIUM     | Level C default             |
| `asis-default`      | yes      | CRITICAL   | ASIS modules                |

## 3. RPCs (admin-gated, `SECURITY DEFINER`)

| RPC                                | Purpose                                        |
|------------------------------------|------------------------------------------------|
| `register_agent(...)`              | Idempotent upsert: agent + version + caps      |
| `bump_agent_version(slug, ver, …)` | Adds a new version and pins it as current      |
| `set_agent_status(slug, status, canary_pct?)` | active / disabled / canary / deprecated |
| `attach_capability(slug, dom, type, …)` | Bind a (domain, task_type) to an agent     |
| `set_policy_profile(slug, profile_slug)` | Swap policy profile                       |
| `resolve_capability(domain, type)` | Lookup agent_id + version_id for a pair        |
| `lookup_agent_for_task(task_id)`   | Same lookup, by task                           |

All admin-gated calls also write an audit row to `engine_run_logs`:
`agent.registered`, `agent.version_bumped`, `agent.status_changed`.

## 4. Dispatch wiring

`system.dispatch_execution_task` now resolves the (domain, task_type) pair
against `system.agent_capabilities` and stamps the dispatched task with
`agent_id` / `agent_version_id` (both nullable for backwards compatibility
until L7 backfill).

Two safety overlays:

1. **`AGENT_DISABLED`** — if a capability resolves to an agent whose
   `status = 'disabled'`, the task is dispatched as `blocked` with a
   `blocked_reason` carrying the agent slug. This is unconditional.
2. **`AGENT_NOT_REGISTERED`** — fail-closed by default. If no capability
   is registered for a `(domain, task_type)` pair, the task is dispatched
   as `blocked`. The GUC `system.agent_strict_routing` defaults to `on`;
   L7's migration sweep can flip it to `off` per session as a temporary
   escape hatch while individual domains are being registered.

## 5. In-process bridge (TypeScript)

| Module                                                                   | Purpose                                                       |
|--------------------------------------------------------------------------|---------------------------------------------------------------|
| `supabase/functions/_shared/execution/types.ts` → `AgentRef`             | Typed agent binding on every `DomainAdapter`                  |
| `supabase/functions/_shared/execution/adapter-registry.ts`               | Validates `agent` shape; `setStrictAgentRegistration(true)` flips fail-closed mode |
| `supabase/functions/_shared/execution/agent-reconciler.ts`               | `reconcileAgents(sb, registry?)` upserts the in-process registry into `system.agents` |
| `supabase/functions/_shared/execution/adapters/marketplace/bootstrap.ts` | Calls `reconcileAgents` automatically on boot (best-effort)   |

### Strict mode (boot-time enforcement)

`AdapterRegistry.register()` throws when an adapter omits `agent` —
**strict mode is the default**. The orchestrator therefore refuses to
boot with adapters that have no platform identity.

`setStrictAgentRegistration(false)` exists as a per-process escape hatch
for legacy test suites that pre-date L1; production code never calls it.

### Reconcile-or-fail boot policy

`bootstrapMarketplaceAdapters(sb)` (and any future adapter bootstrap)
calls `reconcileAgents(sb)` and:

- **Production** (`SUPABASE_FUNCTION_ENV`/`DENO_ENV`/`NODE_ENV === 'production'`):
  any reconcile failure throws — the function refuses to serve traffic
  with an out-of-sync registry.
- **Dev / preview**: failures are logged and boot continues, so a fresh
  database without the agent_registry migration can still come up.

## 6. Seeded agents (the first real platform-native agents)

| Slug                    | Kind             | Policy profile     | Version | Capability                              |
|-------------------------|------------------|--------------------|---------|-----------------------------------------|
| `marketplace.publish`   | business.adapter | `medium-approval`  | 1.0.0   | `marketplace` / `MARKETPLACE.LISTING.PUBLISH` |
| `marketplace.unpublish` | business.adapter | `medium-default`   | 1.0.0   | `marketplace` / `MARKETPLACE.LISTING.UNPUBLISH` |

These are seeded in the migration AND re-confirmed at boot via
`reconcileAgents`, so the DB and the running code can never drift.

## 7. Future-proofing checklist

- [x] `agent_kind` is TEXT + CHECK regex — no ALTER TYPE for new kinds
- [x] Policy profiles are named bundles, not per-kind tables
- [x] `agents.metadata` is JSONB — kind-specific fields go there
- [x] `agent_capabilities` is kind-agnostic — AI / dev agents register the same way
- [x] `v_agents_overview` is a single dashboard surface for every kind
- [x] Strict-routing toggle is GUC-based, can be flipped without code change

## 8. Tests

`src/__tests__/agent-registry.test.ts` — 13 tests covering:
- AdapterRegistry agent validation (strict-default + opt-out)
- Agent ref shape rejection (slug / version / kind)
- `toAgentManifest` aggregation across multiple adapters
- Marketplace adapters declare canonical refs
- `reconcileAgents` happy path + per-agent failure isolation
- **Integration: register → reconcile → simulated dispatch stamps
  `agent_id` / `agent_version_id`**
- **Unregistered route blocked with `AGENT_NOT_REGISTERED`** (strict on)
- **Disabled agent blocked with `AGENT_DISABLED`**
- Strict-routing escape hatch behaviour

Run: `pnpm test src/__tests__/agent-registry.test.ts`
Full execution suite: 108/108 green.

---

# Sovereign Agent Control · L3 — Typed Rollback Contract

**Status:** shipped · task #811
**Migration:** `supabase/migrations/20260421100000_execution_tasks_rollback_l3.sql`

L3 promotes rollback from an ad-hoc, per-adapter convention to a
**first-class platform contract**. Any registered agent — business
adapter, AI router agent, or dev/build agent — can declare *how* it
undoes its own work, and the orchestrator owns the lifecycle.

## 1. Why typed rollback?

Pre-L3, rollback was implicit: a few adapters embedded a `previous_state`
inside their forward output and operators ran SQL by hand. That was
unsafe (no audit, no canonical events, no lock), unobservable (no
`rolling_back` state in the SQL FSM), and unenforceable (no per-agent
declaration in the registry).

L3 makes the intent **explicit, persisted, and audited**.

## 2. New SQL surface

States added to `execution_task_status`:

  - `rolling_back`     — rollback handler is in flight
  - `rollback_failed`  — handler reported failure; row stays for human
    resolution (fail-loud — never silently auto-resolved)

Columns added to `system.execution_tasks`:

| column                | role                                                   |
|-----------------------|--------------------------------------------------------|
| `previous_state`        | snapshot captured by the agent pre-execute (JSONB)   |
| `rollback_strategy`     | declared strategy at dispatch time                   |
| `rollback_reason`       | free-text trigger reason (operator note OR failure)  |
| `rollback_started_at`   | timestamp the loop entered `rolling_back`            |
| `rollback_result`       | `{ success, output, logs, error?, trigger }` (JSONB) |
| `pre_rollback_status`   | status the row held immediately before `rolling_back`, used by orchestrator's contract guard |

### `system.request_rollback(task_id, reason)` — sanctioned entry point

This RPC is the **only** sanctioned operator entry point. Governance is
enforced **server-side** so a direct UPDATE that bypasses the RPC cannot
trigger a rollback the adapter has not opted into.

The RPC:

1. Verifies the caller (super_admin or service_role).
2. Verifies the task is in `failed` or `succeeded`.
3. Looks up the agent that owns `(domain, task_type)` via
   `system.agent_capabilities → system.agents` and reads
   `agents.metadata->>'rollback_strategy'` and
   `agents.metadata->>'allow_rollback_after_success'` — these are mirrored
   from the in-process adapter declarations by the `agent-reconciler`.
4. Refuses if `rollback_strategy='none'` or if the task is `succeeded`
   without `allow_rollback_after_success=true`.
5. Stamps `pre_rollback_status` with the prior status, updates
   `rollback_strategy`, `rollback_reason`, `rollback_requested_by`, and
   transitions to `rolling_back` so the execution-loop poller picks it up.

The orchestrator's `runRollback` re-checks the contract using
`task.pre_rollback_status === 'succeeded' && !adapter.allow_rollback_after_success`
as a defense-in-depth guard.

### Generic snapshot capture (kind-agnostic default)

When `rollback_strategy` is `auto` or `manual` and the adapter does not
declare an explicit `snapshotProvider`, the orchestrator captures a
**default structural snapshot** before invoking `execute`:

```json
{
  "kind": "default",
  "captured_at": "<iso8601>",
  "domain": "<task.domain>",
  "task_type": "<task.type>",
  "entity_type": "<task.entity_type>",
  "entity_id":   "<task.entity_id>",
  "payload":     { /* task.payload */ }
}
```

This guarantees that **every** rollback-eligible task carries an identity
envelope on the row at rollback time, even for adapters that drive their
rollback purely from `(entity_type, entity_id, payload)`. Adapters that
need richer state can still override `snapshotProvider`.

## 3. The DomainAdapter contract

```ts
interface DomainAdapter {
  // ...
  rollback_strategy?: "auto" | "manual" | "none";   // default: "none"
  snapshotProvider?: (ctx: ExecutionContext) => Promise<unknown>;
  rollback?: (ctx: RollbackContext, inv: RollbackInvocation) => Promise<RollbackResult>;
  /** When true the orchestrator will attempt rollback even if the
   *  forward execution was succeeded (operator-initiated only). */
  allow_rollback_after_success?: boolean;
}
```

Strategies:

| strategy | Required handler? | Behaviour                                                                 |
|----------|-------------------|---------------------------------------------------------------------------|
| `none`   | MUST be omitted   | Registration rejected if `rollback` is present. No rollback ever runs.    |
| `manual` | REQUIRED          | No auto-rollback. Operator triggers via `system.request_rollback` RPC.    |
| `auto`   | REQUIRED          | Orchestrator runs rollback whenever `execute` throws OR returns `success:false`. |

Validation lives in `AdapterRegistry.register` so the contract is enforced
at boot — a misconfigured agent never reaches production traffic.

## 4. Orchestrator lifecycle

Forward path (auto strategies):

```
queued → running                          (snapshot captured here)
       → failed                           (execute threw / returned !success)
       → rolling_back   (auto)            (TASK_ROLLBACK_STARTED emitted)
       → rolled_back    | rollback_failed (TASK_ROLLED_BACK | TASK_ROLLBACK_FAILED)
```

Manual path:

```
succeeded|failed → rolling_back           (system.request_rollback)
                 → rolled_back | rollback_failed
```

Recovery path (operator retries a stuck rollback):

```
rollback_failed → rolling_back → rolled_back | rollback_failed
```

The execution-loop poller (`pickRollbackTasks`) selects every row in
`rolling_back` ordered by `rollback_started_at ASC` and routes it to
`getOrchestratorV2().runRollback(taskId)`. This step bypasses the
queued/approval gate — moving the row into `rolling_back` *is* the
approval to roll back.

## 5. Canonical events

| event                       | when                                          |
|-----------------------------|-----------------------------------------------|
| `task.rollback_started`     | row entered `rolling_back`                    |
| `task.rolled_back`          | handler returned `success:true`, row terminal |
| `task.rollback_failed`      | handler returned `success:false` OR threw     |

Sinks (Postgres, NDJSON, BigQuery) carry these alongside the existing
`task.queued / locked / started / verified / succeeded / failed / unlocked`
sequence — no new wiring required.

## 6. Per-kind mapping

| Agent kind                  | Typical `rollback_strategy` | Snapshot source                          | Inverse op                                        |
|-----------------------------|-----------------------------|-------------------------------------------|---------------------------------------------------|
| `business.adapter`          | `auto`                      | row read pre-mutation (e.g. listing row) | `repo.restoreSnapshot(snapshot)`                  |
| `ai.router`                 | `manual`                    | request envelope + chosen route          | re-route to safe fallback OR mark refunded        |
| `dev.builder`               | `auto`                      | git SHA before commit                    | `git revert <sha>` on the build branch            |
| `system.execution_loop`     | `none`                      | n/a — read-only orchestrator             | (no rollback — pure dispatcher)                   |

`marketplace.publish` / `marketplace.unpublish` are the L3 reference
adapters: they declare `"auto"`, snapshot the row via
`MarketplaceAdapterDeps.repo.findById`, and restore via
`ListingRepository.restoreSnapshot` in their `rollback` handler.

## 7. Tests

- `src/test/orchestrator-v2.test.ts · ExecutionOrchestratorV2 · rollback contract`
  — six unit cases: auto-throw, auto-soft-fail, manual happy path,
  rollback_failed terminal, rollback_failed → recovery, illegal-status
  refusal.
- `src/test/marketplace-rollback.integration.test.ts` — end-to-end:
  publish + forced verifier mismatch ⇒ listing restored to its snapshot
  AND canonical rollback events emitted.

Run: `pnpm test src/test/orchestrator-v2.test.ts src/test/marketplace-rollback.integration.test.ts`

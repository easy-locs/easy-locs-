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
2. **`AGENT_NOT_REGISTERED`** — if no capability is registered, the task
   is dispatched as `blocked` only when the GUC
   `system.agent_strict_routing = on`. Default is `off` for backwards
   compatibility; L7 will turn it on globally.

## 5. In-process bridge (TypeScript)

| Module                                                                   | Purpose                                                       |
|--------------------------------------------------------------------------|---------------------------------------------------------------|
| `supabase/functions/_shared/execution/types.ts` → `AgentRef`             | Typed agent binding on every `DomainAdapter`                  |
| `supabase/functions/_shared/execution/adapter-registry.ts`               | Validates `agent` shape; `setStrictAgentRegistration(true)` flips fail-closed mode |
| `supabase/functions/_shared/execution/agent-reconciler.ts`               | `reconcileAgents(sb, registry?)` upserts the in-process registry into `system.agents` |
| `supabase/functions/_shared/execution/adapters/marketplace/bootstrap.ts` | Calls `reconcileAgents` automatically on boot (best-effort)   |

### Strict mode

`setStrictAgentRegistration(true)` makes `AdapterRegistry.register()`
throw when an adapter omits `agent`. Tests opt in locally. L7 will set it
process-wide once every adapter is migrated.

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

- `src/__tests__/agent-registry.test.ts` (10 tests):
  - AdapterRegistry agent validation (lenient + strict)
  - `toAgentManifest` aggregation across multiple adapters
  - Marketplace adapters declare canonical refs
  - `reconcileAgents` happy path + per-agent failure isolation

Run: `pnpm test src/__tests__/agent-registry.test.ts`

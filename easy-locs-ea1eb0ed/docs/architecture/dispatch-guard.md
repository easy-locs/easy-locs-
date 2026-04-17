# Dispatch Guard — Sovereign Agent Control L6

> **Task #809.** Lint-level enforcement that every mutation flows through
> the platform agent registry.

## Why

Sovereign Agent Control (Level A) requires that every state-changing
operation in Easy-Locs be:

1. Routed through `system.dispatch_execution_task`,
2. Stamped with the registered `agent_id` and `agent_version_id`,
3. Subject to the policy engine, approvals, heartbeats and audit trail
   defined by L1 (#808).

If a developer (human **or** a future build agent) can sneak a
`db.from('x').update(...)` past the orchestrator, the whole story
collapses. So we enforce the contract statically, at lint time.

## What is enforced

Three custom ESLint rules ship in
`tooling/eslint-plugin-easylocs/`:

### `easylocs/require-dispatch-execution-task` (error)

Flags any expression of shape:

```ts
<receiver>.from('<table>').(insert | update | delete | upsert)(...)
<root>('<table>').(insert | update | delete | upsert)(...)
```

regardless of receiver name (`db`, `supabase`, `sb`, `getClient()`, …)
and regardless of intervening chain calls (`.schema('system').from(...)`,
`.select('*').from(...)`).

Both the explicit `db.from('x')` form **and** the project's call-style
shorthand `db('x')` (and `v2db('x')`, `domainDb.foo('x')`, etc.) are
treated as builder roots — closing the bypass where developers could
mutate via the shorthand. Identifiers matching `/^(db|v2db|supabase|sb|client|getClient)$/`
or ending in `db`/`Db` are recognized as builder roots.

Read-only chains (`.from(...).select(...)`, `db('x').select(...)`) are
**not** flagged.

### `easylocs/no-direct-postgrest-mutation` (error)

Flags `fetch(url, { method })` calls where:

- `url` is a literal or template string containing `/rest/v1/`
  (or `${SUPABASE_URL}/rest/...`), and
- `method` is `POST`, `PATCH`, `PUT` or `DELETE`.

This stops developers from bypassing the supabase-js client to issue raw
PostgREST mutations.

### `easylocs/no-direct-rpc-mutation` (error)

Flags `<builder-root>.rpc('fn', args)` calls — `db.rpc(...)`,
`supabase.rpc(...)`, `db.schema('s').rpc(...)`, `orbitDb.rpc(...)`, etc.

`rpc()` can call any Postgres function — including ones that perform
writes — so static "read vs write" classification is impossible. We
fail closed: every direct `rpc(...)` call must live in the allow-list
(read-only RPCs with a written reason) or be replaced by
`dispatchExecutionTask({ domain, taskType, payload })`.

The canonical dispatch helper at `src/lib/execution/dispatch.ts` is
itself allow-listed — it is the **only** sanctioned `rpc()` site.

## The sanctioned entry point

```ts
import { dispatchExecutionTask } from "@/lib/execution/dispatch";

const handle = await dispatchExecutionTask({
  domain: "marketplace",
  taskType: "MARKETPLACE.LISTING.PUBLISH",
  payload: { listingId, ownerId },
  idempotencyKey: `publish:${listingId}`,
});

if (handle.status === "blocked") {
  // AGENT_NOT_REGISTERED, AGENT_DISABLED, validation, KYC, …
  toast.error(handle.blockedReason ?? "Action blocked");
}
```

The helper hits `system.dispatch_execution_task`, which:

- resolves `(domain, task_type)` against `system.agent_capabilities`
- stamps `agent_id` / `agent_version_id` on the resulting
  `execution_tasks` row
- enforces `AGENT_DISABLED` unconditionally
- enforces `AGENT_NOT_REGISTERED` by default
  (GUC `system.agent_strict_routing = on`)

A Deno-compatible mirror lives at
`supabase/functions/_shared/execution/dispatch.ts` for edge functions.

## Allow-list

`.eslintrc.dispatch-allowlist.json` is the single source of truth for
exemptions. Each entry has:

```json
{
  "pattern": "src/services/marketplace.service.ts",
  "reason": "L7 migration sweep pending — pre-L1 mutation site, will be routed via dispatchExecutionTask."
}
```

Two sections:

- **`globalExemptions`** — orchestrator/adapter framework, lint
  tooling, test harnesses, migrations.
- **`exemptions`** — a snapshot of pre-L1 mutation sites, drained
  incrementally by the L7 migration sweep (#814).

### Adding a new exemption

1. Open a PR that adds the file pattern + a written reason to
   `exemptions[]`.
2. The PR description must explain why the call cannot go through
   `dispatchExecutionTask` *yet*, plus a rough plan for migration.
3. Reviewers should treat new exemptions as a code-review red flag —
   they are intended to shrink, not grow.

## CI gate

`pnpm lint` runs the rules as `error`. A violation breaks CI, with a
message that points back to this document and the dispatch helper.

## How a future build agent is governed by this rule

Level C of the Sovereign Agent Control roadmap introduces dev/build
agents that propose code changes. Their PRs are validated by exactly
the same lint pipeline:

- A direct `.from(...).update(...)` patch produced by a build agent
  fails CI before it can be merged.
- The agent must rewrite the patch to call `dispatchExecutionTask`,
  declaring an existing or new `agent_kind` and capability.
- Any new exemption it requests is visible as a JSON diff against
  `.eslintrc.dispatch-allowlist.json`, surfaced in the human-review
  inbox (#812).

This is why the rule is generic (no domain knowledge) and fail-closed
(prefer false positives over false negatives) — the same gate that
keeps human developers honest also governs every future agent.

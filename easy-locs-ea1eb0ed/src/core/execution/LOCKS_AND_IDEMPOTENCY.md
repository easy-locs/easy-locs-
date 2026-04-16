# Locks & Idempotency Layer (Phase 2)

> Task #751. Deterministic primitives consumed by ExecutionOrchestratorV2 and
> every Phase-2 adapter. **No business logic** lives here — only the
> guarantees the orchestrator needs to make safe mutations.

## Why this exists

Phase 2 must guarantee three properties for every mutation:

1. **No double-write** — two actors cannot mutate the same entity at the
   same time.
2. **No silent loss on retry** — replaying the same intent must return the
   same result instead of re-executing.
3. **No deadlock on crash** — if a worker dies mid-flight, its lock must be
   reclaimable automatically.

This module supplies the two primitives that make those guarantees
possible: **execution locks** and **idempotency keys**.

## Modules

| Module | Surface | Backed by |
| --- | --- | --- |
| `lock-service.ts` | `getTaskLockKey`, `acquireExecutionLock`, `releaseExecutionLock`, `withExecutionLock` | `system.execution_locks` table + `system.try_acquire_execution_lock` / `system.release_execution_lock` RPCs |
| `idempotency-service.ts` | `computeIdempotencyKey`, `claimIdempotencyKey`, `findExistingResult` | `system.execution_tasks.idempotency_key` column + `system.claim_idempotency_key` / `system.find_existing_result_by_idempotency_key` RPCs |

Both modules call SECURITY DEFINER RPCs through the schema-scoped Supabase
client (`supabase.schema("system").rpc(...)`).

## Why a table-backed lock instead of `pg_advisory_lock`?

Postgres advisory locks are **session-scoped**. Supabase routes RPC traffic
through PgBouncer / short-lived HTTP connections, so a lock acquired inside
one RPC call cannot be observed — let alone released — by the next call from
the same logical actor. A dedicated table (`system.execution_locks`) with
explicit `owner_id` + `expires_at` gives us:

- cross-call durability (the lock survives the session that took it),
- observable state (admins can `SELECT * FROM system.execution_locks`),
- orphan recovery (a cron job purges any row whose TTL elapsed without an
  explicit release — see migration `20260418500000_…`).

If a future workload needs micro-second contention, we can revisit. For
Phase 2 the table-backed model is the only correct primitive.

## Contract — adapters MUST follow this

For **every mutating adapter call**:

```ts
import {
  getTaskLockKey,
  withExecutionLock,
  computeIdempotencyKey,
  claimIdempotencyKey,
  findExistingResult,
} from "@/core/execution";

// 1. Derive deterministic keys from the *intent*, not from server state.
const lockKey = getTaskLockKey({
  kind: "entity",
  domain: "wallet",
  entityType: "account",
  entityId: accountId,
});
const idemKey = await computeIdempotencyKey({
  taskType: "WALLET_ADJUST",
  entityType: "account",
  entityId: accountId,
  payload, // stable JSON; key-order independent
});

// 2. Try to claim the idempotency key on the dispatched task.
const claim = await claimIdempotencyKey(idemKey, taskId);
if (!claim.claimed) {
  // Same intent has already produced a result — return it verbatim.
  const prior = await findExistingResult(idemKey);
  return prior.existing; // do NOT re-execute
}

// 3. Acquire the lock and run the mutation. Release is guaranteed by
//    try/finally inside withExecutionLock — even if `fn` throws.
const out = await withExecutionLock(lockKey, ownerId, async () => {
  return runAdapterMutation(...);
}, { ttlSeconds: 60 });

if (!out.ok && out.reason === "lock_busy") {
  // Clean retry signal — surface to the orchestrator, never silently fall
  // through.
  return { retryable: true, reason: "busy", currentOwner: out.currentOwnerId };
}
```

### Key derivation rules

- **Entity mutation** → `<domain>:<entity_type>:<entity_id>` (lock key) and
  `idem:<task_type>:<entity_type>:<entity_id>:<sha256(payload)>`
  (idempotency key).
- **Global op** → `<domain>:<task_type>` (lock key).
- Domain and entity type are normalised (trimmed + lowercased) so casing
  cannot fork two locks for the same logical target.

### Ownership rules

- Only the owner that acquired a lock may release it. The DB function
  enforces this; a wrong-owner release returns `false` and **does not**
  remove the row.
- A lock past its TTL may be reclaimed by any caller, with the previous
  owner logged via `RAISE WARNING` in Postgres (`reason = "orphan_recovered"`
  in the TS surface).

### Re-entrancy

- Re-acquiring a lock you already hold refreshes the TTL and is reported as
  `reason: "reentrant_refresh"`. Use this to extend the window mid-task.

## Tests

- `lock-service.test.ts`
  - acquire/release nominal,
  - busy contention between two owners,
  - re-entrant refresh,
  - ownership-gated release,
  - TTL orphan recovery,
  - **50 concurrent acquisitions** → exactly one winner, 49 clean
    `busy`/`race_lost` losers (no silent error, no indefinite block).
- `idempotency-service.test.ts`
  - deterministic key across re-ordered payload keys,
  - distinct key on payload change,
  - claim, re-claim (`already_claimed`), duplicate (`duplicate`),
    wrong-key (`task_has_different_key`),
  - `findExistingResult` returns the prior outcome / not-found / error
    paths.

Run with `pnpm vitest run src/core/execution/lock-service.test.ts src/core/execution/idempotency-service.test.ts`.

## Out of scope (in this layer)

- ExecutionOrchestratorV2 (the consumer — separate task).
- Adapter-level business logic.
- `system.execution_tasks` schema beyond what already exists in
  Phase-1 migrations (`20260418300000_…`, `20260418300100_…`,
  `20260418400000_…`).

# Phase-2 Verification Layer (task #753)

## Contract — non-negotiable

Every Phase-2 adapter registered in the `AdapterRegistry` **must** also
register a matching `TaskVerifier` in the `VerifierRegistry` for the same
`(domain, task_type)` pair.

If no verifier is found when the orchestrator reaches the `verify` step, the
task is transitioned to `blocked` with `error_code = NO_VERIFIER`. Un-verified
success is refused by policy — an adapter returning `succeeded` is not enough
to let a task cross into the `succeeded` state.

## Runtime wiring

This layer lives in two places:

- **Edge orchestrator (canonical path)**:
  `supabase/functions/_shared/execution/verifier-registry.ts` +
  `supabase/functions/_shared/execution/verification-service.ts`, consumed by
  `ExecutionOrchestratorV2` at step 6 of its pipeline. The service is wired
  into `execution-loop/index.ts` via `globalVerifierRegistry`.
  - No verifier → `blocked` + `error_code = NO_VERIFIER` + `task.blocked`.
  - Verifier ok → `succeeded` + `task.verified` then `task.succeeded`.
  - Verifier mismatch → `failed` + `error_code = VERIFICATION_MISMATCH` +
    `task.verification_failed` then `task.failed`.
  - Verifier throws → `failed` + `error_code = VERIFIER_THREW` +
    `task.verification_failed` then `task.failed`.
  - `execution_result.verification` always captures `ok`, `checked_at`, and
    on failure `error_code`, `expected`, `actual`, `mismatch_path`, `details`.
- **Client mirror**: `src/core/execution/verifier.ts` +
  `verification-service.ts`, usable for in-process verifications and covered
  by `src/core/execution/__tests__/verification-service.test.ts`.

The canonical event names `task.verified` and `task.verification_failed` are
defined in
`supabase/functions/_shared/execution/canonical-events.ts:CANONICAL_EXECUTION_EVENTS`.

## Why

Adapters can lie. A mutation can appear to succeed while being silently
dropped by an aftermarket trigger, lost to replication lag, or swallowed by a
RLS gate applied after the write. The verification layer exists so the
pipeline confirms, independently of the adapter, that the entity actually
reached the expected state.

## API surface

```ts
import {
  VerifierRegistry,
  verifierRegistry,
  TaskVerificationService,
  taskVerificationService,
  TASK_VERIFICATION_FAILED_EVENT,
  VERIFICATION_ERROR_CODES,
  MAX_VERIFICATION_WINDOW_MS,
} from "@/core/execution";
```

### Registering a verifier

```ts
verifierRegistry.register({
  domain: "marketplace",
  taskType: "marketplace.listing.publish",
  async verify(task, executionResult) {
    const row = await readListing(task.entity_id!);
    if (row?.status !== "active") {
      return {
        ok: false,
        expected: "active",
        actual: row?.status ?? null,
        mismatchPath: "status",
      };
    }
    return { ok: true, details: { listing_id: row.id } };
  },
});
```

### Running verification

The orchestrator calls the service after the adapter returns apparent success:

```ts
const outcome = await taskVerificationService.run(task, adapterOutput, {
  windowMs: 0, // optional; clamped to MAX_VERIFICATION_WINDOW_MS (2s)
});
// outcome.status ∈ { "succeeded", "failed", "blocked" }
```

## Persistence

The verification payload is merged into `execution_tasks.execution_result`
under a `verification` key. No new column is required.

Shape on success:

```json
{
  "...adapter fields...": "...",
  "verification": {
    "ok": true,
    "checked_at": "2026-04-16T12:00:00.000Z",
    "details": { "listing_id": "abc" }
  }
}
```

Shape on mismatch:

```json
{
  "verification": {
    "ok": false,
    "error_code": "VERIFICATION_MISMATCH",
    "expected": "active",
    "actual": "draft",
    "mismatch_path": "status",
    "checked_at": "..."
  }
}
```

The task row is updated with:

- mismatch → `status = failed`, `error_code = VERIFICATION_MISMATCH`
- no verifier → `status = blocked`, `error_code = NO_VERIFIER`, `blocked_reason`
- verifier threw → `status = failed`, `error_code = VERIFIER_THREW`

## Events

On mismatch (or verifier exception), the service emits
`task.verification_failed` on `platformBus` under the `system` domain with:

```ts
{
  task_id, domain, task_type,
  expected, actual, mismatch_path,
  correlation_id, root_task_id,
  entity_type, entity_id
}
```

The canonical event constant is re-exported as
`TASK_VERIFICATION_FAILED_EVENT`.

## Verification window

`options.windowMs` (default `0`, max `MAX_VERIFICATION_WINDOW_MS = 2000`) lets
an adapter ask for a short propagation delay before the verifier is invoked.
Use sparingly — a non-zero window is a smell that the mutation isn't
read-your-writes consistent.

## Out of scope (handled in later blocks)

- Real business verifiers (e.g. `MarketplaceListingVerifier`) ship with their
  adapter task.
- Rollback-on-mismatch is not automatic yet; failed tasks stay in `failed`
  until the rollback block lands.
- Repair suggestions and auto-retry policies live outside this layer.

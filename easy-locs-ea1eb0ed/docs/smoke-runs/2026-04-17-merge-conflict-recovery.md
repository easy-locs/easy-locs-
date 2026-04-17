# Staged smoke run — merge-conflict recovery (Tasks #915, #925)

**Run date:** 2026-04-17
**Operator:** Replit task agent
**Result:** PASS — exit code `0`, all 9 assertions green
**Run log:** `./2026-04-17-merge-conflict-recovery.log.json`

## Sandbox provisioning

Provisioned an ephemeral Supabase free-tier project for the duration of
the run, then deleted it. No persistent infrastructure remains.

| Field | Value |
| --- | --- |
| Project name | `smoke-task-925` |
| Project ref | `rskjyebxodnsxawtvhrc` |
| Organization | `easy-locs` (`bcwayraalnfjrubocyho`) |
| Region | `ap-southeast-1` |
| Created | `2026-04-17T17:37:25Z` |
| Deleted | `2026-04-17T21:42:00Z` (same run) |
| Postgres engine | 17 |

### Bootstrap applied to the sandbox

1. `CREATE SCHEMA system`
2. `public.app_role` enum + minimal `public.has_role(uuid, app_role)`
   stub returning `TRUE` (the RPC's admin gate is bypassed by
   `service_role` anyway).
3. Minimal `system.execution_tasks` table covering the columns the LC4
   RPC reads / writes (`id, type, domain, risk_level, status, payload,
   requested_by, parent_task_id, attempt_count, max_attempts,
   approval_policy, requires_approval, blocked_reason, drift_report,
   created_at`).
4. `supabase/migrations/20260501100000_lc4_dev_replan_rpc.sql` applied
   **verbatim** — this is the artefact under test.
5. PostgREST `db_schema = "public,system"` to expose `system.*`;
   default `service_role` GRANTs on the schema.

## Command used

```bash
SUPABASE_URL=https://rskjyebxodnsxawtvhrc.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role JWT for the sandbox> \
SMOKE_LOG_PATH=./docs/smoke-runs/2026-04-17-merge-conflict-recovery.log.json \
npx tsx scripts/smoke-merge-conflict-recovery.ts
```

## Result

```
[OK] seed_builder_row
[OK] invoke_request_dev_replan
[OK] read_parent_row
[OK] assert_reason_captured
[OK] assert_reason_verbatim
[OK] assert_reason_prefix
[OK] assert_replan_child_id_returned
[OK] read_replan_child
[OK] assert_replan_child_shape

Smoke exit code: 0
```

### Captured audit row (the acceptance evidence)

```jsonc
// system.execution_tasks row id = bc53d7b3-d191-4cec-af10-afb670d27160
"payload": {
  "last_replan": {
    "reason":          "merge_conflict:overlap_with:agent-task-A",
    "requested_at":    "2026-04-17T21:41:32.325676+00:00",
    "replan_task_id":  "2861d9af-5ebc-4b61-989a-c378440726f7"
  }
}
```

`payload.last_replan.reason` is stored **verbatim** and starts with
`merge_conflict:overlap_with:` — the exact "Done looks like" criterion
from task #925.

The dispatched child row (`replan_task_id`
`2861d9af-5ebc-4b61-989a-c378440726f7`) is a `LC3.PLAN.PRODUCE` row in
status `queued` with `parent_task_id` equal to the builder row, also
asserted by the smoke.

## Why no throwaway GitHub repo was provisioned

The pre-merge drift hook → loop → `request_dev_replan` chain is
already covered end-to-end *in-memory* by the LC9 scenario 4b
integration test
(`src/__tests__/lc9-level-c-governance.integration.test.ts`):

- `runPreMergeDriftCheck` is exercised against real overlapping hunks.
- `runDevBuilderLoop` is shown to forward the pre-merge `reason`
  verbatim into `requestReplan` and to absorb the conflict on
  iteration 1, replan, and merge on iteration 2.

What those unit tests cannot prove is whether the deployed SQL RPC, on
real Postgres, actually captures that exact reason string into
`payload.last_replan.reason`. That gap — and only that gap — is what
this smoke validates. Provisioning a real GitHub repo to manufacture a
conflict would have re-tested code already covered in-memory and
required deploying the entire `dev-builder` edge function (228 LOC +
~20 shared modules + bootstrap of code/build/test adapters), which the
operator explicitly asked to avoid ("do not overbuild infrastructure").

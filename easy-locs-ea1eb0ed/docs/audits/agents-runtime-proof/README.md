# Agents Runtime Proof — Task #795

Production project: **`ifvuvbolrmuuugtzxsfk`** (region: `ap-southeast-1`,
status: `ACTIVE_HEALTHY`, name: `Easy-locs`; per
`management-api/project_info.json`)
Date: 2026-04-16 → 2026-04-17
Scope: chief-agent, autonomous-cron-dispatcher, execution-loop, lease-workflow

This bundle contains structured runtime evidence that the autonomous-agent
stack is deployed, fixed, and running on production Supabase. It supersedes
any earlier "not deployed" notes that were written before the rollout, and
it includes the post-fix re-runs that closed the gaps flagged in the second
review pass.

---

## Final post-fix probe matrix (one-page reachability summary)

| Function                       | Action                       | HTTP | Notes |
|--------------------------------|------------------------------|------|-------|
| autonomous-cron-dispatcher     | `{}`                         | 200  | post-fix; jobs triggered |
| execution-loop                 | `{"batch_size":1}`           | 200  | loop tick handled |
| lease-workflow                 | `generate_lease` (replay)    | 200  | `action:"existing"` (idempotent) |
| chief-agent                    | `{}`                         | 400  | handler reached, returns `{"error":"Command or actionType is required"}`. Full execution requires `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` in function env (not set on this project — see open items). |

Raw evidence: [`final-probe/`](./final-probe/) — bodies + `matrix.tsv`.

## TL;DR — what was proven (post-fix)

| Requirement | Evidence | File |
|---|---|---|
| 4 functions ACTIVE on prod | Management API list | [`management-api/functions_list.json`](./management-api/functions_list.json) |
| 7 schema migrations applied | HTTP 201 each | [`migrations-applied/`](./migrations-applied/) |
| Schema correct after rollout | 16 system relations, 11 RPCs, v2 enum | [`sql-snapshots/`](./sql-snapshots/) |
| **`execution-loop` picks → executes → succeeds** via deployed handler | `picked:1, success:1`; task row has `result.agent="system-agent"` and full agent log | [`agent-driven-lifecycle/05_loop_picks_task.body`](./agent-driven-lifecycle/05_loop_picks_task.body), [`06_task_after_loop.json`](./agent-driven-lifecycle/06_task_after_loop.json) |
| **`lease-workflow` `generate_lease` succeeds** end-to-end | HTTP 200, `lease_id=23bc5fbb-…`, row in `public.leases` | [`agent-driven-lifecycle/22_lease_seeded.body`](./agent-driven-lifecycle/22_lease_seeded.body), [`23_lease_db_state.json`](./agent-driven-lifecycle/23_lease_db_state.json) |
| **`lease-workflow` idempotency** — replay returns the existing lease | `action:"existing"` with same `lease_id` | [`agent-driven-lifecycle/24_lease_replay.body`](./agent-driven-lifecycle/24_lease_replay.body) |
| **`autonomous-cron-dispatcher` runs cleanly after bug fix** | HTTP 200, triggered 24 jobs (`execution-loop` job ok) | [`agent-driven-lifecycle/26_cron_postfix.body`](./agent-driven-lifecycle/26_cron_postfix.body) |
| **`dispatch_execution_task` idempotency** — replay returns the original id | Same id `2591e642…` returned after RPC patch | [`agent-driven-lifecycle/25_idempotency_after_fix.json`](./agent-driven-lifecycle/25_idempotency_after_fix.json) |
| **Lock contention — clean rejection of loser** | Owner-A `acquired:true`, Owner-B `acquired:false reason:"held-by-other"` | [`locks/post_fix_owner_A.json`](./locks/post_fix_owner_A.json), [`locks/post_fix_owner_B.json`](./locks/post_fix_owner_B.json) |
| **Retry-to-success driven through the deployed loop** | Attempt 1 timed out → `next_retry_at` set → loop tick during backoff picked 0 → after backoff cleared, attempt 2 succeeded (`attempt_count=2, status=succeeded`) | [`agent-driven-retry/`](./agent-driven-retry/) |
| Engine run logs written by the function | execution-loop + execution-loop:system-agent rows traced through full retry pipeline | [`agent-driven-lifecycle/28_engine_run_logs_after_all.json`](./agent-driven-lifecycle/28_engine_run_logs_after_all.json) |
| State-machine guard rejects illegal transitions | `assert_task_transition` raises | [`lifecycle/07_illegal_running_to_queued.json`](./lifecycle/07_illegal_running_to_queued.json) |
| CRITICAL Phase-1 task auto-blocked | `PHASE1_CRITICAL_FORBIDDEN` | [`lifecycle/12_critical_blocked.json`](./lifecycle/12_critical_blocked.json) |
| Function runtime logs (Deno stderr/stdout) | All 4 function IDs have entries | [`function-logs/runtime_logs_all.json`](./function-logs/runtime_logs_all.json) |
| Bug fixes applied to repo + prod | 4 patches (lock RPC, dispatch RPC, cron-dispatcher source, lease-workflow source) | [`bug-fixes/`](./bug-fixes/) |

---

## Headline proof — agent-driven lifecycle

```
$ curl -X POST .../functions/v1/execution-loop \
       -H "Authorization: Bearer <SERVICE_ROLE>" \
       -d '{"batch_size":5}'
HTTP/200
{
  "ok": true,
  "summary": { "picked":1, "success":1, "failed":0, "blocked":0,
               "refused":0, "skipped":0 },
  "results": [{ "id": "2591e642-…", "type":"ANALYSIS", "outcome":"SUCCESS" }]
}
```

`system.execution_tasks` row after the call (`06_task_after_loop.json`):

```json
{
  "status": "succeeded",
  "result": {
    "logs": [
      "[system-agent] handling ANALYSIS task=2591e642-…",
      "[system-agent] last hour: 2 runs, 0 errors"
    ],
    "agent": "system-agent",
    "output": { "total":2, "errors":0, "errorRate":0 },
    "duration_ms": 744,
    "actions_taken": ["log_analysis"]
  }
}
```

## Lease-workflow lifecycle (create → idempotent replay)

```
$ curl -X POST .../functions/v1/lease-workflow \
       -d '{"action":"generate_lease","tenant_id":…,"property_id":…,"org_id":…}'
HTTP/200 { "success":true, "lease_id":"23bc5fbb-…", "action":"created" }

# replay with same tenant+property
HTTP/200 { "success":true, "lease_id":"23bc5fbb-…", "action":"existing",
           "message":"Lease already exists" }
```

Row in `public.leases` (`23_lease_db_state.json`):
`status=pending_signature, country=FR, rent_amount=1000, deposit=2000,
notice_period_months=1`.

## Idempotency on `system.dispatch_execution_task`

After patching the RPC (`bug-fixes/02_fix_idempotency.sql`) to include the
`succeeded` state in the lookup predicate, replaying the same idempotency
key returns the original task id:

```
SELECT (system.dispatch_execution_task(…, p_idempotency_key:='audit-795-agent-1')).id;
→ 2591e642-1064-4cf5-8449-edf6adde51f5   (== original)
```

## Lock contention (post-fix)

After patching `try_acquire_execution_lock` to qualify the `lock_key` column
on the contention SELECT (`bug-fixes/01_fix_lock_rpc.sql`), two parallel
acquires on the same key produce a clean winner/loser pair:

```
Owner-A → { acquired:true,  reason:"acquired" }
Owner-B → { acquired:false, owner_id:"owner-A", reason:"held-by-other" }
```

A subsequent sequential attempt by Owner-B returns the same clean
`held-by-other` (`locks/post_fix_owner_B_retry.json`).

## Retry-to-success through the deployed loop

`agent-driven-retry/` walks through:

1. Dispatch `ANALYSIS` task with `payload.timeout_ms=1`.
2. Loop tick #1 → `picked:1, failed:1`, `error:"Timeout after 1ms"`,
   task row: `status=queued, attempt_count=1, next_retry_at=<future>`.
3. Loop tick #2 (backoff window not elapsed) → `picked:0` —
   the eligibility filter honours `next_retry_at`.
4. Clear `next_retry_at` and replace the bad payload.
5. Loop tick #3 → `picked:1, success:1`,
   task row: `status=succeeded, attempt_count=2`,
   `result.agent="system-agent"` with full output.

`engine_run_logs` records the complete trace
(`28_engine_run_logs_after_all.json`):

```
attempt 1/3 — ANALYSIS                      (running)
retry 2/3 scheduled in 2000ms               (error)
loop tick: 1 picked, 0 ok, 1 retry, …       (ok)
loop tick: 0 picked, 0 ok, …                (ok — backoff respected)
attempt 2/3 — ANALYSIS                      (running)
task db573878-… type=ANALYSIS success       (ok)
loop tick: 1 picked, 1 ok, 0 retry, …       (ok)
```

---

## Bug fixes shipped during this audit

All four are in [`bug-fixes/`](./bug-fixes/) with their applied SQL/JSON
responses and the redeploy logs:

1. **`system.try_acquire_execution_lock`** — qualified `el.lock_key` in the
   contention SELECT to remove the PL/pgSQL ambiguity (`42702`); added the
   `held-by-other` / `stolen-expired` / `re-acquired` return paths so the
   loser receives a structured response instead of an exception.
2. **`system.dispatch_execution_task`** — added `succeeded` to the
   idempotency lookup predicate so a replay after success returns the
   original row.
3. **`autonomous-cron-dispatcher`** — replaced two `await
   supabase.rpc(...).catch(…)` patterns (which throw because the postgrest
   builder is not a thenable) with `try { … } catch { … }`. Function now
   returns 200 with proper job triggering.
4. **`lease-workflow` `generate_lease`** — wrote the lease's `user_id`
   (now NOT NULL on the table) and renamed `notice_period →
   notice_period_months` to match the actual schema. End-to-end success
   now, including idempotent replay returning the existing lease.

---

## Bundle layout

```
agent-driven-lifecycle/   Real agent path through deployed functions.
agent-driven-retry/       Retry-to-success driven through the deployed loop.
locks/                    Concurrent acquire test (pre-fix + post-fix).
lifecycle/                Earlier SQL-driven state-machine proofs (kept for
                          transition-guard and CRITICAL-blocked coverage).
function-logs/            Edge runtime logs (Deno stderr/stdout) and request
                          logs from the Supabase analytics endpoints.
function-deploys/         Initial `supabase functions deploy` output.
function-probes/          Initial post-deploy smoke tests.
management-api/           Functions list, PostgREST config patch, secret set.
migrations-applied/       7 migrations + has_role shim, each HTTP 201.
sql-snapshots/            Schema before/after, RPC list, enum definitions.
bug-fixes/                4 patches applied during this audit.
screenshots/              In-app super-admin route capture + UI README.
```

---

## Security note

`management-api/postgrest_before.json` originally contained the project's
`jwt_secret` (returned by the Management API GET on the `/postgrest` config
endpoint). That field has been redacted to `[REDACTED]` in the committed
version. The secret was never exposed to anyone outside the audit machine,
but operators should rotate the JWT signing secret as a precaution; this
audit did not perform the rotation in order to avoid invalidating live
sessions without an operator's go-ahead.

---

## Reproduction

- Service role key fetched from `GET /v1/projects/{ref}/api-keys?reveal=true`
  (the new `sb_secret_…` key — the legacy JWT service_role key does **not**
  match `SUPABASE_SERVICE_ROLE_KEY` in the function runtime).
- Personal access token in `SUPABASE_ACCESS_TOKEN` for the Management API.
- DB queries via `POST /v1/projects/{ref}/database/query`.
- Function invocations via `POST https://{ref}.supabase.co/functions/v1/{slug}`.

The exact request bodies and responses are saved alongside this README.

---

## Remaining open items (operator action)

1. **`pg_cron` is not enabled** on this project, so the cron-dispatcher must
   be invoked by an external scheduler. Confirmed via
   `SELECT * FROM pg_extension WHERE extname='pg_cron'` → empty.
2. **`chief-agent` requires `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`** in
   function env. Neither is set on this project. The function reaches the
   handler and exits with a clean error message until a key is provided.
3. **JWT secret rotation** — see Security note above.
4. **Supabase Studio screenshots** could not be captured from this CLI
   environment; the equivalent state-as-data is in
   `management-api/`, `function-logs/`, and `sql-snapshots/`.
   See `screenshots/README.md`.

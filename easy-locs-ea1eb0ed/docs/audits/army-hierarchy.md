# Army Hierarchy — Audit & Test Plan (Task #998)

## What was built
A hierarchical agent army with strict governance, plumbed end-to-end on
Supabase + the existing Command Center.

### Hierarchy
```
Supreme Commander (human)
        │
        ▼
Chief Orchestrator
        │
        ├── General Product
        ├── General Growth
        ├── General Ops
        ├── General Finance
        ├── General QA / Security
        └── General Data
              │
              ▼
          Captains (per sub-domain)
              │
              ▼
          Workers (TTL-bound, disposable)
```

### Pipeline
`command_orders` →
`orchestrator-dispatch` (Chief) →
`execution_tasks(type=general_intake)` →
`general-route` (General) →
`execution_tasks(type=captain_plan)` →
`captain-plan` (Captain) →
`execution_tasks(type=worker_execute)` →
`worker-execute` (Worker) →
`worker-report` (rolls up to the order).

### Schema (all in `army.*`)
- `system_flags` — kill switch + budget + quotas (one JSONB row per flag).
- `agent_roles` + `agent_policies` — declarative hierarchy + permissions.
- `agent_instances` — live registry, **TTL mandatory**.
- `command_orders`, `execution_tasks`, `task_approvals`.
- `agent_messages`, `incident_log`, `agent_metrics`.
- `queue_messages` — pgmq-compatible FIFO fallback.
- Views: `v_general_state`, `v_army_dashboard` (cockpit feeds).

### Edge functions
| Function | Edge auth | Role | Purpose |
| --- | --- | --- | --- |
| `army-tick` | authenticated | - | Cron-driven dispatcher: walks every stage of the pipeline once |
| `orchestrator-dispatch` | authenticated | Chief | Order → tasks |
| `general-route` | authenticated | General | Pick tasks → captain |
| `captain-plan` | authenticated | Captain | Build worker plan |
| `worker-execute` | authenticated | Worker | Execute a single mission |
| `worker-report` | authenticated | Worker | Roll up to order |
| `incident-escalate` | authenticated | any | Promote to general / Supreme |
| `agent-spawn` | **Supreme** | privileged | **Sole** agent creation path (calls `spawnAgent()`) |
| `agent-heal` | **Supreme** | privileged | Recycle a crashed agent (calls `spawnAgent()`) |
| `agent-kill` | **Supreme** | Supreme | Terminate agent + cancel its in-flight tasks |

Every function calls `requireAuthenticated()` or `requireSupreme()` at
the boundary, then `assertNotKilled()` and `hasPermission()` before any
write. `agent-spawn` and `agent-heal` are the only callers allowed to
create agent instances — both go through the shared `spawnAgent()`
primitive. The autonomous `army-tick` is invoked once per minute by
`pg_cron` (when `pg_net` + `pg_cron` are present), so a single order
issued from the cockpit travels the entire chain without any further
manual call.

### Reproduction (8 conditions, RPC `army.can_spawn`)
1. Kill switch off.
2. Role exists.
3. Domain authorized (role.domain matches or is null).
4. Type authorized (only `worker` / `captain` ranks can be spawned).
5. Quota total not exceeded.
6. Quota per-domain not exceeded.
7. Daily budget not exceeded.
8. Backlog ≥ 1 in target domain (no idle spawning) + dedup key check.

### Interdictions
Encoded as `allowed=false` rows in `agent_policies`:
`publish.critical`, `payment.execute`, `data.delete_global`,
`schema.migrate`, `cross_domain.access`. Workers also have a hardcoded
forbidden-types set in `worker-execute`.

### Critical-risk gating
A `before insert` trigger on `execution_tasks` flips any `risk=critical`
task to `awaiting_approval` and inserts a `task_approvals(pending)` row
**+** a warn incident. The cockpit Approve / Reject buttons call
`army.approve_task` / `army.reject_task` RPCs.

### Kill switch
`army.kill_army(reason)`:
- flips `system_flags.army_kill_switch.active` to true,
- drains every queue (`queue_messages`),
- terminates every active agent,
- cancels every in-flight task,
- writes a critical incident.

`army.revive_army()` lifts the flag.

### Cockpit
`/dashboard/army` → `src/pages/ArmyCockpit.tsx`. Reads the `army.*`
schema directly via the Supabase JS client and subscribes to the
realtime channel so the UI updates instantly. Buttons:
- Issue order (with domain + risk).
- Approve / Reject for `awaiting_approval` tasks.
- Retry for failed/cancelled tasks.
- Kill for individual agents.
- KILL ARMY (double-confirm) and Revive Army.

## Test scenarios (manual + Vitest/Playwright)

### S1 — Simple order
1. Insert `command_orders(title='ping', domain='product', risk='normal')`.
2. POST `orchestrator-dispatch {order_id}` → expect 1 task `general_intake`.
3. POST `general-route {domain:'product'}` → first task `completed`, child
   `captain_plan` queued.
4. POST `captain-plan {task_id:<captain_plan>}` → child `worker_execute` queued.
5. POST `worker-execute {task_id:<worker>}` → status `completed`, metric row.
6. POST `worker-report {order_id}` → order `completed`.

### S2 — Critical order blocked on approval
1. Insert order with `risk='critical'`.
2. Run pipeline through `captain-plan`. The worker task lands in
   `awaiting_approval` (DB trigger), `task_approvals(pending)` exists.
3. `worker-execute` on that task returns `{ok:false, reason:'awaiting_approval'}`.
4. Cockpit Approve → status flips to `queued`, worker can run.

### S3 — Spawn quota violation
1. Set `system_flags.army_quota.per_general = 1`.
2. Spawn 1 worker for `growth` (succeeds). Spawn another for `growth`
   (must reject with `quota_domain_exceeded` and write a `policy_violation`
   incident).

### S4 — KILL ARMY mid-flight
1. Issue 5 normal orders, dispatch.
2. Call `army.kill_army('drill')`. Expect:
   - all `execution_tasks` in `queued/planning/running` → `cancelled`,
   - all live `agent_instances` → `terminated`,
   - `queue_messages` empty,
   - `system_flags.army_kill_switch.active = true`,
   - critical incident logged.
3. Any subsequent edge call must throw `army_kill_switch_active`.

### S5 — Incident escalation
1. POST `incident-escalate {task_id, severity:'critical', message:'breach'}`.
2. Expect a critical incident row + `agent_messages` to the corresponding
   general AND to `supreme_commander`.

## Operational notes
- **No Replit dependency**: pipeline lives entirely in Supabase + edge
  functions. Cron sweeps via `pg_cron` (best-effort — skipped if extension
  absent). Scheduling generals/captains can also be wired to Vercel cron.
- **RLS**: writes are Supreme-only via `army.current_is_supreme()`; the
  edge functions use the service role key and bypass RLS for the pipeline.
- **Realtime**: `command_orders`, `execution_tasks`, `agent_instances`,
  `task_approvals`, `incident_log`, `system_flags` are all added to
  `supabase_realtime`.

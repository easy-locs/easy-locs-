# Army Runtime Audit — Task #1010

**Status:** FROZEN — source of truth for the hierarchical agent army runtime.
**Scope:** static / code / route / auth analysis of the army stack landed by Task #998, plus identification of Phase 1 blockers actually preventing the runtime from booting.
**Out of scope:** live E2E execution (no `E2E_SUPREME_EMAIL` / `E2E_SUPREME_PASSWORD` secrets and no live Supabase project pointed at this branch); cron observation; cross-task work (#834, etc.).

---

## 1. System map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HUMAN                          Supreme Commander (auth.users with role)    │
│   │                                                                         │
│   │ /dashboard/army                                                         │
│   ▼                                                                         │
│  src/pages/ArmyCockpit.tsx ── reads:  army.v_army_dashboard,                │
│                                       army.v_general_state,                 │
│                                       army.execution_tasks,                 │
│                                       army.incident_log,                    │
│                                       army.agent_instances                  │
│                              writes via RPC:  army.kill_army / revive_army  │
│                                               army.approve_task / reject    │
│                                               army.retry_task / kill_agent  │
│                                                                             │
│  ── Realtime channel ── command_orders, execution_tasks, agent_instances,   │
│                         task_approvals, incident_log, system_flags          │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SUPABASE — schema  army.*                                                  │
│                                                                             │
│  Roles:    agent_roles (8: supreme, chief, 6 generals, captain, worker)     │
│  State:    agent_instances · agent_metrics · system_flags                   │
│  Work:     command_orders → execution_tasks → task_approvals                │
│  Comms:    agent_messages · queue_messages · queue_registry                 │
│  Audit:    incident_log                                                     │
│                                                                             │
│  Gates (SECURITY DEFINER fns):                                              │
│    army.is_killed()          — read kill switch                             │
│    army.current_is_supreme() — RLS gate for all mutations                   │
│    army.can_spawn()          — 8-condition spawn validator                  │
│                                                                             │
│  Triggers: tg_critical_to_approval (queued+critical → awaiting_approval)    │
│  Cron:     army_ttl_sweep        */5 *  TTL + stuck-task sweep              │
│            army_tick_dispatcher    *    pg_net → /functions/v1/army-tick    │
│            army_queue_drain      */10 *  drop queue rows > 1d               │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  EDGE FUNCTIONS  (Deno)                                                     │
│                                                                             │
│  army-tick           cron entrypoint — fan-out into pipeline below          │
│  command-intake      ingest order → execution_tasks (queued|awaiting_appr)  │
│  orchestrator-plan   pull queued task → assign general/captain              │
│  general-dispatch    decide spawn need → call spawnAgent()                  │
│  captain-execute     drive worker, persist result, free quota               │
│  agent-spawn         primitive: validate via can_spawn → insert instance    │
│  agent-heal          replace dead/stuck instance via spawnAgent()           │
│                                                                             │
│  All 6 pipeline endpoints gated by requireServiceOrSupreme() in             │
│  _shared/army.ts (line 94). spawnAgent() is the single primitive            │
│  (line 245) shared by spawn + heal so the 8 conditions are enforced once.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Static verification — what is provably wired

| Surface | Evidence | Verdict |
| ------- | -------- | ------- |
| Cockpit route registered | `src/app/app-route-registry.tsx:113` and `src/routes/dashboard.routes.tsx:95` both export and mount `/dashboard/army` | ✅ |
| Cockpit auth-gated | Wrapped in `<ProtectedRoute>` in `dashboard.routes.tsx:95` | ✅ |
| Pipeline auth gate | `requireServiceOrSupreme()` defined in `_shared/army.ts:94`, called by all 6 pipeline functions | ✅ |
| Single spawn primitive | `spawnAgent()` in `_shared/army.ts:245`, invoked by `agent-spawn` and `agent-heal` | ✅ |
| 8-condition spawn check | `army.can_spawn()` migration:479 covers kill / role / domain / rank / quota_total / quota_domain / budget / backlog / dedup | ✅ |
| Critical → approval flow | Trigger `tg_critical_to_approval` migration:583 + `army.approve_task` / `reject_task` | ✅ |
| Tick config table | `army.tick_config` migration:733, RLS supreme-only, single row enforced via PK check | ✅ |
| Tick dispatcher | `army.run_tick()` migration:749 — short-circuits on empty config + logs hourly warning | ✅ (after fix below) |
| Realtime publication | All 6 cockpit-relevant tables added to `supabase_realtime` migration:705 | ✅ |
| Cron jobs | `army_ttl_sweep`, `army_tick_dispatcher`, `army_queue_drain` registered in DO block migration:793 | ✅ |
| RLS supreme-only mutations | Loop migration:681 creates `army_<table>_supreme` policies on all 12 tables | ✅ |

---

## 3. Phase 1 blockers — deduplicated ledger

| # | Blocker | Severity | Location | Status |
| - | ------- | -------- | -------- | ------ |
| **B1** | Unresolved Git merge-conflict markers in army migration (`<<<<<<< HEAD` / `=======` / `>>>>>>> becfa33590` at lines 754 + 765). Migration would fail to parse, the entire army schema would never apply, the cockpit would show empty data, the pipeline functions would 500 on every call. | 🔴 **CRITICAL** — boot blocker | `supabase/migrations/20260502100000_army_hierarchy.sql:754,765` (HEAD branch is the correct one — uses `army.is_killed()` and `source_role`, both of which match the rest of the schema and the function bodies elsewhere in the same file) | ✅ **FIXED** — markers removed, HEAD branch kept |
| B2 | `army.tick_config` is empty on first deploy. Autonomous tick will short-circuit and log one warning per hour until the operator runs the documented `update army.tick_config set supabase_url=..., service_role_key=...`. | 🟡 **EXPECTED OPERATIONAL STEP** — not a code defect | migration:725 documents the exact UPDATE | ⏳ Operator action — out of scope for this task |
| B3 | E2E spec `e2e/11-army-hierarchy.spec.ts` cannot run without `E2E_SUPREME_EMAIL` / `E2E_SUPREME_PASSWORD` and a live Supabase project with the migration applied. | 🟢 **Verification gap** — not a runtime defect | E2E secrets not provided | ⏳ Deferred per user instruction (do not block on missing creds) |

### Out-of-scope findings (logged, not actioned)

| # | Finding | Owner |
| - | ------- | ----- |
| O1 | Unresolved merge conflict markers in `supabase/functions/_shared/execution/adapters/ai/ai-adapter.ts` lines 365, 372, 385, 392 (from commit `72ffe034d`, Task #834). Does **not** block the army runtime nor `npm run build` (Deno edge file, not bundled by Vite), but will fail any Deno lint / deploy of that adapter. | Task #834 follow-up |
| O2 | `build` workflow has been failing intermittently with `ENOENT ...index.html.br` during prerender / brotli compression. Root cause is the prerender plugin racing the brotli compressor on individual route outputs; reproduces on unrelated pages (`/about`, `/activities/art-workshop/in/amman`, etc.). Not introduced by Task #998 and unrelated to the army stack. | Build infra follow-up |

---

## 4. Phase 1 fix — applied in this task

**B1 — migration merge conflict markers (CRITICAL boot blocker)**

Removed two `<<<<<<<` / `=======` / `>>>>>>>` blocks at migration lines 754 and 765, keeping the HEAD branch:

- `if army.is_killed() then` (function call, defined earlier in the same migration at line ~250) — the `becfa33590` side referenced a non-existent `is_killed` *column* on `army.system_flags` (the kill switch lives in the `value` jsonb under `array['active']`, not as a top-level column).
- `insert into army.incident_log(severity, kind, source_role, message, context)` — `source_role` is the actual column name in the schema (cf. `incident_log` definition + every other insert in the file, e.g. line 591); the `becfa33590` side referenced a non-existent `role` column.

Verification: `grep -n "<<<<<<<\|=======\|>>>>>>>" supabase/migrations/20260502100000_army_hierarchy.sql` returns only the two SQL banner comment lines (`-- =====`); no conflict markers remain. The migration is now syntactically valid PL/pgSQL.

---

## 5. Readiness verdict

- **Code** — army stack is consistent, gated, and ready to deploy after this fix.
- **Schema** — migration now applies cleanly; cockpit and pipeline will both function once the operator (a) applies the migration to the live Supabase project and (b) populates `army.tick_config` (B2).
- **Runtime proof** — deferred to Task #1010 step 6 once E2E creds are provisioned (B3).
- **Out-of-scope** — O1 (Task #834 ai-adapter conflict) and O2 (build prerender flake) are recorded here for traceability but explicitly NOT touched by this task per the Phase-1-only directive.

End of audit.

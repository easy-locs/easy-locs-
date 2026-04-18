# Supreme Admin Dashboard — Big Tech 2026++ Control Plane

**Status:** Phase 0 deliverable — architecture plan, returned for review before Phase 1 build.
**Owner:** Task #1031.
**Canonical entry:** `/admin/control`.

---

## 1. Goal in one sentence

Turn the existing `/admin/control` shell into the single Supreme Admin Dashboard — a stable, minimal, **realtime-first** control plane that wires the entire platform (telemetry, agents, tasks, approvals, watchdog, runtime proof, wiring map) under one super-admin identity, and consolidates the fragmented `AdminSuperDashboardPage` / `AdminMasterControlPage` / `AdminControlRoomPage` / `CommandCenterPage` / `CommandControlDashboard` surfaces behind it.

## 2. What exists today (audit)

The platform already has the building blocks. The plan **wraps and consolidates** — it does not rewrite.

### 2.1 Admin shells (fragmented — to be consolidated)
| Surface | Current role | Disposition |
|---|---|---|
| `/admin/control` (`AdminControlLayout`) | New unified shell — left rail with 8 sections | **Canonical**. Sections renamed/reordered to match P0. |
| `/admin/super-dashboard` (`AdminSuperDashboardPage`) | KPI grid + autonomous-agent panels | **Redirect** → `/admin/control`. |
| `/admin/master-control` (`AdminMasterControlPage`) | 50+ button menu of admin pages | **Already redirects** to `/admin/control/master`; kept as the deep-link index inside the shell. |
| `/admin/control-room` (`AdminControlRoomPage`) | Engine telemetry, source fixes, governance, memory | **Already redirects** to `/admin/control/engines`; surfaced inside Engines/Watchdog. |
| `/admin/command-center` (`CommandCenterPage`) | Chief-agent slash-command UI | **Already redirects** to `/admin/control/command`. |
| `/admin/command-control` (`CommandControlDashboard`) | 10-tab approvals/agents/health/costs/audit | Decomposed: tabs become sections (Approvals, Agents, Watchdog, Costs, Audit). |
| `AdminAgentsPage`, `AdminAgentRunsPage` | Already mount under `/admin/control/agents` and `/admin/control/runs` | Keep. |
| `AdminApprovalsPage`, `AdminWatchdogPage`, `AdminPlatformHealthPage`, `AdminWiringHealthPage`, `AdminSystemHealthPage`, `AdminEnginesDashboardPage`, `AdminMergeConflictRecoveryPage`, `AdminAutonomyDashboardPage`, `AdminIntegrationHealthPage`, `ExecutionProofPage`, `GovernancePanel` | Used as data sources / embedded sub-views | Reuse data layer, lift relevant components into Supreme sections. |

### 2.2 Runtime backbone (reused as-is)
- `core/protocols/agent-protocol.ts` — agent tiers, TTL, retry, quarantine.
- `engines/core/wiring-verifier.ts`, `engines/core/learning-loop.ts`, `engines/core/runtime-qa-scenarios.ts` — watchdog signals.
- `lib/concurrency/resource-mutex.ts` — cross-domain locks (must be respected, never bypassed).
- `lib/shared/platform-bus.ts` — in-process event bus already emits `agent:*`, `ui-engine:*`, etc.
- `services/db.ts` + Supabase Realtime — primary data plane.
- `services/command-center-client.ts`, `lib/admin/agents-repo.ts`, `repositories/domain/dashboard.repo.ts` — typed access to agents, runs, approvals, execution_tasks, snapshots.
- Tables/views: `system.agents`, `system.v_agents_overview`, `system.v_agent_health`, `system.execution_tasks`, `system.v_ai_runs`, `approval_requests`, `monitoring_findings`, `system_health_snapshots`, `engine_supervisor`, `worker_health_snapshots`, `engine_run_logs`, `cost_tracking`, `command_audit_log`.
- Edge functions: `chief-agent`, `run-engine-cron`, integration-health-monitor.

## 3. Module map (the 7 P0 modules)

Left rail order is **fixed** by the task:

| # | Module | Route | Source components | Primary data |
|---|---|---|---|---|
| 1 | **Command Center** | `/admin/control` (default) and `/admin/control/overview` | New `CommandCenter` (8-card grid) reusing `overview/KpiCards`, `ActiveAlertsList`, `EventStream`, `AgentHealthHeatmap`, `GlobalKillSwitch`. | Realtime spine (§5). |
| 2 | **Tasks** | `/admin/control/tasks` | New `TaskConsole`. Embeds existing `ExecutionTaskPanel`. | `system.execution_tasks`, `system.v_ai_runs`, `chief-agent` edge fn for NL → task, embeddings table for dedup. |
| 3 | **Agents** | `/admin/control/agents` | Existing `AdminAgentsPage` + `AgentDetailDrawer` + new `AgentHierarchyTree`. | `system.v_agents_overview`, `system.v_agent_health`, `agent-protocol` runtime stats. |
| 4 | **Approvals** | `/admin/control/approvals` | Existing `AdminApprovalsPage` (already in shell). | `approval_requests`, `command_audit_log`. |
| 5 | **Watchdog** | `/admin/control/watchdog` | Existing `AdminWatchdogPage` + watchdog signals from `wiring-verifier`, `learning-loop`, `merge-conflict-recovery`. | `monitoring_findings`, `engine_run_logs`, watchdog incidents. |
| 6 | **Runtime Proof** | `/admin/control/proof` | Lift badge grid from `ExecutionProofPage` + cards from `AdminPlatformHealthPage`, `AdminSystemHealthPage`, `AdminWiringHealthPage`, `AdminIntegrationHealthPage`. | `system_health_snapshots`, integration health, cron health, build/E2E status. |
| 7 | **Wiring Map** | `/admin/control/wiring` | Lift table from `AdminWiringHealthPage` + architecture-lab data. | Static manifest (routes/hooks/services/edge-fns/tables/cron) + last-known health from snapshots. |

P1 deep-links kept reachable from inside the shell: `master` (legacy index), `engines`, `autonomy`, `runs`, `command` (slash UI), `audit`, `costs`.

## 4. Page structure

```
AdminControlLayout (existing)
├── ControlSidebar          ← rail items reordered to P0 order above
├── ControlTopBar           ← env, super-admin badge, ⌘K, status pill
├── ControlCommandPalette   ← ⌘K (P1.13)
└── <Outlet />              ← active section, lazy-loaded
    ├── command-center/CommandCenter.tsx       (P0.4)
    ├── tasks/TaskConsole.tsx                   (P0.5)
    ├── agents/AgentsSection.tsx + Hierarchy   (P0.6)
    ├── approvals/ApprovalsSection.tsx         (P0.7)
    ├── watchdog/WatchdogSection.tsx           (P1.9)
    ├── proof/RuntimeProofSection.tsx          (P0.8)
    └── wiring/WiringMapSection.tsx            (P1.10)
```

`AdminShellChunkBoundary` (already wrapping the layout) keeps a single ErrorBoundary + Suspense across all sections so a broken section never blanks the shell.

## 5. Realtime data spine

One channel, one store, all modules subscribe.

```
src/lib/admin/control-plane/
├── realtime-client.ts      # Supabase channel("admin-control") + WS reconnect
├── event-schema.ts         # ControlEvent discriminated union
├── store.ts                # Zustand: tasks, agents, incidents, approvals, health, costs, deploy
└── polling-fallback.ts     # 10s tick when realtime is degraded
```

### 5.1 Event schema (typed `ControlEvent`)
```
task.created | task.state_changed | task.completed | task.blocked
agent.status_changed | agent.spawned | agent.terminated | agent.quarantined
incident.opened | incident.resolved | incident.escalated
approval.created | approval.decided
health.snapshot | health.degraded | health.recovered
cost.tick (per-minute aggregate)
deploy.started | deploy.completed | deploy.failed
```

### 5.2 Topology
- **Primary:** Supabase Realtime channels `system.execution_tasks`, `system.agents_health`, `approval_requests`, `monitoring_findings`, `system_health_snapshots` → consolidated by `realtime-client.ts` into the shared store.
- **Secondary:** `platformBus` (in-process) bridges client-side events (`agent:*`, `ui-engine:*`) into the same store so the UI never needs two subscription paths.
- **Fallback:** `useVisibilityAwareInterval` polls the same repos at 10s when the channel drops; the store flips an `isLive: boolean` flag the top bar surfaces as a yellow pill.

### 5.3 Subscription rules
- One subscription per table; modules read selectors from the store. No module opens its own channel.
- Server-trusted timestamps only; client timestamps are display-only.
- Backpressure: store keeps max 500 of each event type; older events flushed to a circular buffer for the audit log export.

## 6. Governance & approvals flow

Every destructive action funnels through one path:

```
UI button → enqueueApproval(action, payload, diff)
          → approval_requests row (status=pending)
          → super-admin sees in Approvals module (live)
          → decide_task_approval RPC (existing)
          → command_audit_log append (actor, ts, payload, diff, outcome)
          → action executes via existing dispatcher (taskDispatcher / agent-protocol)
          → realtime emits approval.decided + task.* events
```

Destructive actions covered: agent kill / retry / escalate / quarantine, threshold changes, deploys, force-unblock, kill-switch toggles, cost-budget changes, code-patch approvals.

Hard rules:
- **No bypass.** UI never calls a mutating RPC directly for a destructive action; it always goes through the approvals queue, even if the super-admin authored the request.
- **Append-only.** `command_audit_log` is INSERT-only from the client; updates only via service role for outcome stamping.
- **Mutex respected.** Any mutation that touches a domain table acquires the existing `resource-mutex` advisory lock; if locked, the approval row is marked `blocked_on_lock` and retried — never bypassed.

## 7. Consolidation & redirect strategy

Routes already redirecting (kept):
- `/admin/agents` → `/admin/control/agents`
- `/admin/command-center` → `/admin/control/command`
- `/admin/approvals` → `/admin/control/approvals`
- `/admin/autonomy` → `/admin/control/autonomy`
- `/admin/control-room`, `/admin/engine-control-room` → `/admin/control/engines`
- `/admin/master-control` → `/admin/control/master`
- `/admin/agents/:slug/runs` → `/admin/control/runs?agent=:slug`

Added in Phase 1:
- `/admin/super-dashboard` → `/admin/control` (replace, preserve query). The component file stays in the registry (lazy-only) until P2 cleanup; nothing imports it after redirect lands.
- `/admin/command-control` → `/admin/control` (the 10-tab dashboard's tabs are absorbed by the corresponding sections; legacy `?tab=` is rewritten where 1:1).
- `/admin/watchdog` → `/admin/control/watchdog`
- `/admin/wiring-health` → `/admin/control/wiring`
- `/admin/execution-proof` → `/admin/control/proof`

Kept as deep-link targets (reachable from inside the shell, **not** redirected) — they are operational sub-pages, not parallel shells: `/admin/platform-health`, `/admin/system-health`, `/admin/integration-health`, `/admin/engines`, `/admin/merge-conflict-recovery`, `/admin/architecture-lab`. Each surfaces inside the matching Supreme module via the Detail Drawer.

`SuperAdminGate` is enforced on **every** `/admin/control/*` route — no soft-fail, no public fallback.

## 8. Priority order & deliverables

### Phase 0 (this document) — ✅ ready for review
Architecture plan returned. No code change yet beyond this file.

### Phase 1 — P0 (must ship green before any P1)
| Step | Deliverable | Key files |
|---|---|---|
| P1.1 | Reorder rail to the 7-module order; add `tasks`, `watchdog`, `proof`, `wiring` to `sections.ts`; add the new redirects in `admin.routes.tsx` | `pages/admin/control/sections.ts`, `routes/admin.routes.tsx` |
| P1.2 | Realtime spine scaffolding (client, schema, store, fallback) — no behavior change yet | `src/lib/admin/control-plane/*` |
| P1.3 | Command Center landing — 8 cards wired to spine; explicit empty/error states | `pages/admin/control/command-center/*` |
| P1.4 | Task Console — list + NL create + dedup + classify + lifecycle timeline | `pages/admin/control/tasks/*`, edge fn `chief-agent` (extend), embeddings RPC |
| P1.5 | Agent Hierarchy — tree on top of existing `AdminAgentsPage`; per-node controls route through Approvals | `components/admin/agents/AgentHierarchyTree.tsx` |
| P1.6 | Approvals queue — already mounted; ensure every Phase-1 destructive action enqueues here, audit-logged | `pages/admin/control/sections/ApprovalsSection.tsx` |
| P1.7 | Runtime Proof — badge grid (build, E2E, auth, dashboard, route, edge-fn, integration, cron, SLO/error budget) with last-check / last-failure expand | `pages/admin/control/proof/*` |

### Phase 2 — P1 (only after Phase 1 is green)
- P2.9 Watchdog module (incidents, anomaly, force-unblock, quarantine — all governed)
- P2.10 Wiring Map (searchable, reverse-deps, lift from `AdminWiringHealthPage`)
- P2.11 Costs & tokens drill-down
- P2.12 Governance / Audit log (filter, diff inspector, signed export)
- P2.13 Command palette ⌘K (already scaffolded as `ControlCommandPalette` — wire actions)

## 9. Hard guarantees baked in

- **Zero-conflict execution** — every cross-domain mutation goes through `lib/concurrency/resource-mutex`. The dashboard surfaces lock state but never bypasses.
- **No silent failures** — every fetch returns `{ status: 'ok' | 'empty' | 'error', error? }` to the store. UI renders explicit empty / error states. The 42 silent catches previously fixed are not regressed.
- **No parallel admin shells** — only `AdminControlLayout` paints chrome. Legacy components either become sections or remain deep-link-only sub-pages.
- **Realtime first** — polling is fallback only; the top bar shows a yellow `degraded` pill when active.
- **Super-admin only** — `SuperAdminGate` non-negotiable, no soft-fall-through to public view.
- **Bundle discipline** — every Phase 2 module is `lazy()` + route-split; the React vendor bundle is not allowed to grow.

## 10. Out of scope (re-asserted)
Cosmetic theming, mobile layout, multi-tenant admin roles, rewriting sub-pages, new agent runtimes, new cost ingestion. We surface and govern existing infrastructure.

---

**Decision needed before Phase 1:** confirm the rail order and the redirect list above, then Phase 1 work begins (P1.1 → P1.7 in order, each P0 step independently green before the next ships).

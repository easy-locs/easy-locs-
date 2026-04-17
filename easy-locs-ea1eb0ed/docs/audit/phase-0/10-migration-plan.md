# 10 — Migration Plan (Phase 1 → Phase 7)

Phased plan derived from the Phase 0 baseline. Each phase has explicit
scope, dependencies, risks + mitigations, rollback strategy, and done
criteria. Phases are ordered for safety: Foundations → Data → Events →
Services → Frontend → Cleanup → Hardening.

Cross-references to other deliverables are inline (`→ 04`, `→ 07`, …).

---

## Phase 1 — Foundations

**Scope.** Lock the platform contract so further refactors are safe.

- Adopt a global `QueryClient` `staleTime: 30_000` (→ 09 row 1).
- Introduce `Idempotency-Key` mandatory header at every edge-function
  boundary; library wrapper in `src/lib/edge-client.ts`.
- Convert the three worst pollers to existing realtime channels
  (→ 09 rows 2-4).
- Wrap the 11 ad-hoc `supabase.auth.*` callsites behind a single
  `useIdentitySession()` (→ 09 row 6).
- Wrap the 4 storage callsites behind `media.storage.adapter`
  (→ 09 row 7).
- Add ESLint rule (already present at `src/lib/eslint-plugin-easylocs/`)
  to enforce "no `supabase.from/rpc/storage` outside adapters" — promote
  from warn to error.
- Stand up `pnpm audit:phase0` script (→ 09 row 15).

**Dependencies.** None.

**Risks + mitigations.** ESLint rule may surface noise — keep tests
exempt; ship as warning for one week before erroring.

**Rollback.** Revert PR; no DB change.

**Done.**
- Direct-DB violation count (report 02) ≤ 30 (was 72).
- Polling top-3 callsites (report 07) replaced.
- All edge-function invocations carry `Idempotency-Key`.

Maps to: 02, 07, 09.

---

## Phase 2 — Data canonicalisation (no destructive changes)

**Scope.** Define and ship the canonical aggregates without dropping any
v1/v2 table yet. New tables are additive; old tables are kept read-only
under a feature flag.

- `identity.profile` aggregate: one canonical row per human, with
  views/triggers projecting from the 20 profile tables (→ 04 row 3).
- `wallet.account` + `wallet.ledger` canonical pair, with backfill
  triggers from the 6 legacy ledger surfaces (→ 04 rows 1-2).
- `booking` canonical aggregate with `vertical` discriminator,
  back-projected from the 11 booking tables (→ 04 row 4).
- `commerce.order` canonical aggregate (→ 04 row 5).
- `notifications.delivery` canonical event (→ 04 row 7).
- `messages.message` canonical entity (→ 04 row 8).

For each: shadow writes (writers double-write to new + legacy), then
shadow reads (readers prefer new), then legacy retire (Phase 6).

**Dependencies.** Phase 1 (idempotency contract).

**Risks + mitigations.** Double-write doubles cost short-term — gate
behind a feature flag and budget alarm. Read drift between new and
legacy is mitigated by drift-detector cron (`drift-detector` edge fn,
new).

**Rollback.** Disable shadow-write flag; readers fall back to legacy.

**Done.**
- 6 canonical aggregates exist with documented schema + RLS.
- Drift detector reports < 0.1 % divergence over 7 days.

Maps to: 04, 05, 06.

---

## Phase 3 — Event mesh

**Scope.** Introduce one append-only `domain_events` table + outbox
pattern. Every state-changing edge function emits exactly one event.

- New table `domain_events(id, ts, domain, type, aggregate_id, payload,
  idempotency_key, schema_version)`.
- Outbox publisher cron drains `domain_events` to a real bus (Supabase
  Realtime broadcast for in-app, plus an SQS fan-out for AWS lambdas).
- Replace the 9 router functions' inter-service calls with event emits
  on the canonical bus (→ 06 ownership health table).
- Standardise event names: `<domain>.<aggregate>.<verb>`
  (e.g. `wallet.account.credited`).

**Dependencies.** Phase 2 (canonical aggregates, otherwise events refer
to ambiguous tables).

**Risks + mitigations.** Event payload schema drift — enforce via Zod
schemas under `src/contracts/events/`.

**Rollback.** Disable outbox publisher; events still recorded but not
fanned out.

**Done.**
- All 14 domains (report 06) emit at least one canonical event.
- Outbox lag < 1 s p95.
- Inter-edge-function direct invokes reduced by ≥ 70 %.

Maps to: 05, 06.

---

## Phase 4 — Service architecture / edge compaction

**Scope.** Compress the 239 edge functions to ≤ 60 (already a roadmap
task). Each surviving function is a domain HTTP boundary. Inter-domain
calls go via Phase 3 events.

- Group: `wallet-router|wallet-ops|wallet-pin|wallet-transfer` →
  single `wallet-svc` function.
- Group: `commerce-router|commission-split|submit-review|create-*-payment`
  → `commerce-svc`.
- Same for `ai-*`, `voice-*`, `webauthn-*`, `notifications-*`,
  `media-*`, `dispatch-*`.
- State machines (→ 05) become first-class libs in `supabase/functions/_shared/sm/`.

**Dependencies.** Phases 2 + 3.

**Risks + mitigations.** Bigger-blast-radius functions — add per-route
JWT verify + rate limit (already a roadmap task).

**Rollback.** Keep legacy functions deployed for 2 weeks; route 1 % of
traffic to new before full cutover.

**Done.**
- Edge function count ≤ 60.
- Cold-start p95 < 300 ms.
- All state-changing flows backed by a state machine (→ 05).

Maps to: 03, 05, 06.

---

## Phase 5 — Frontend re-platform

**Scope.** Make the SPA consume only the canonical aggregates + events.

- All 374 polling callsites (→ 07) replaced or downgraded.
- All 72 violations (→ 02) zeroed; ESLint rule promoted to error.
- Identity, wallet, booking, order, messaging, notification adapters
  fully wired to canonical aggregates only.
- 500 page files audited for orphan routes (→ 03).
- Lazy-load every pillar route module (currently 182 lazy vs 500 pages).

**Dependencies.** Phase 4 (services stable).

**Risks + mitigations.** Visual regressions — keep the existing
storybook (`storybook-static/`) and Chromatic (`chromatic.config.json`)
gates.

**Rollback.** Per-domain feature flag.

**Done.**
- Direct-DB violation count = 0.
- Bundle size ≤ baseline (`bundle-size-baseline.json`).
- e2e (`e2e/`, `playwright.config.ts`) green.

Maps to: 02, 03, 07.

---

## Phase 6 — Legacy retirement

**Scope.** Drop all `_v2` duplicates and any table proven unused by the
drift detector after 30 days. Drop edge functions proven dead (→ 03).

- Soft-delete then hard-delete (after 30 d) the duplicate profile,
  wallet, booking, order, messages, notifications tables identified in
  → 04.
- Remove the ~100 candidate-dead edge functions (→ 03) after grep proof
  + 14-day quarantine.
- Audit and split the 33-INSERT `notifications` table into a partition
  scheme + retention policy (→ 04 row 7).

**Dependencies.** Phase 5 (frontend no longer reads legacy).

**Risks + mitigations.** Forgotten reader — keep DB-level read
auditing on for 14 days before drop.

**Rollback.** Restore from PITR backup; hard-delete is irreversible.

**Done.**
- Tables count from ~791 → ≤ 350.
- Edge functions ≤ 60 (consistent with Phase 4).

Maps to: 03, 04.

---

## Phase 7 — Hardening

**Scope.** Continuous safety nets.

- RLS audit (→ 08): rewrite policies with covering indexes; remove full
  scans.
- Canary + shadow read for every new aggregate.
- Chaos cron: kill 1 % of edge function invocations and verify retry.
- Cost dashboard: per-domain Supabase invocation count + Postgres write
  IOPS.
- Documentation: per-domain runbook in `docs/runbooks/<domain>.md`.

**Dependencies.** Phases 1-6.

**Risks + mitigations.** RLS rewrites are sensitive — run under
`assert_role` in shadow first.

**Rollback.** Per-policy revert.

**Done.**
- p95 query time < 50 ms on top-10 most-read tables.
- Zero direct-DB violations for 30 days.
- All 14 domains have a runbook + SLO.

Maps to: 08.

---

## Cross-phase mapping to deliverables

| Deliverable | Primary phase(s) |
|-------------|------------------|
| 01 inventory | baseline for all |
| 02 violations | Phase 1, 5 |
| 03 dead code  | Phase 6 |
| 04 conflicts  | Phase 2, 6 |
| 05 SM gaps    | Phase 3, 4 |
| 06 ownership  | Phase 2, 3, 4 |
| 07 polling    | Phase 1, 5 |
| 08 cost leaks | Phase 1, 7 |
| 09 quick wins | Phase 1 |

## Critical-path dependencies

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7
   │                                              ▲
   └──────────────────── (quick wins) ────────────┘
```

Phase 1 quick wins ship in parallel with Phase 2 design work.

## Out of scope of the plan

- Multi-region active-active.
- Replacement of Supabase as the primary OLTP.
- Migrating the SPA to a different framework.

These are explicitly deferred until after Phase 7 stabilises.

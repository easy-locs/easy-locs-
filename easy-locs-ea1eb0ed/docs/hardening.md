# Hardening — Duplicate Guards, Orchestration Stability, CI Enforcement

> Task #1004. This document is the source of truth for how we keep the
> platform green automatically. When you add a new write path, a new
> orchestrated flow, or a new CI gate, update this file.

## 1. Idempotency contract

**Goal:** any side effect (notification send, payment ledger write,
referral event, AI agent trigger) must be safe to replay. The same
logical request, retried any number of times within the TTL, must
produce **exactly one** side effect.

### Key shape

```
namespace + key   (unique)
payload_hash      (sha256 of the payload, advisory)
status            pending | succeeded | failed
result_json       cached return value
expires_at        TTL — defaults to 24h
```

Backed by `public.idempotency_keys` (migration
`20260503000000_hardening_idempotency_keys.sql`). Atomic claims go
through the SECURITY DEFINER RPCs `claim_idempotency_key` and
`finalize_idempotency_key`; no client touches the table directly.

### Helpers

| Runtime | Path | Use |
|---|---|---|
| Browser / Node | `src/lib/idempotency/idempotency.ts` | `withIdempotency({ namespace, key, payload }, fn)` |
| Edge Functions (Deno) | `supabase/functions/_shared/idempotency.ts` | `withIdempotency(supabase, namespace, key, payload, fn)` |

Both helpers fall **open** on persistence failure — a dropped dedup
write is preferable to losing the underlying notification or webhook.
Process-local memoization absorbs short-window replays even when the
RPC is unavailable.

### Wired-in paths (highest-risk writes)

- **Notifications** — `notification-dispatcher` edge function uses
  `dedupe_key + user_id + event_type` as the idempotency key.
- **Payment webhooks** — `crypto-webhook` claims
  `coinbase_commerce:<chargeId>:<event_type>` before crediting wallets
  or marking orders paid.
- **Referral events** — `expire-pending-referrals` claims
  `referral-expire:<yyyy-mm-dd>` so a re-triggered cron run is a no-op.
- **AI agent triggers** — `agent-spawn` reuses any incoming
  `dedup_key` as the idempotency key.

### Adding a new guarded operation

1. Pick a stable `namespace` (the surface area, e.g. `"payments"`).
2. Build a deterministic `key` from the request identity — never
   include timestamps or random IDs.
3. Wrap the side effect in `withIdempotency(...)`. Return the wrapper's
   `result`; check `replayed` if you need to differentiate metrics.
4. Add a unit test that calls the handler twice and asserts the side
   effect ran once.

## 2. Orchestration stability

### Single-flight primitive

`src/lib/orchestration/single-flight.ts` provides:

- One execution per key — concurrent callers share a promise.
- Heartbeat-backed timeout — a stuck worker is reaped after
  `timeoutMs * 2` of silence and the next caller can retry.
- Explicit state machine: `idle → running → succeeded | failed | timeout → idle`.
  Invalid transitions throw immediately.
- Listener API for emitting structured observability events (Sentry /
  PostHog) without coupling the primitive to any vendor.

Pair it with `withIdempotency` when a flow spans multiple processes:
single-flight handles the in-process collision, idempotency handles
the cross-process / cross-region replay.

### Existing flows

| Flow | Guard |
|---|---|
| Agent runner | `flow-state-manager` (`src/lib/state-machines/`) + `SingleFlight` per agent id |
| Edge function dispatcher | `claimIdempotencyKey` + `finalizeIdempotencyKey` (success or failure) — replays return prior result, in-flight returns 202, failures release the claim for retry |
| Client write paths | `withIdempotency` (auto-pairs RPC claim/finalize with `globalSingleFlight` so concurrent same-key callers in one process share one execution) |
| Merge-conflict recovery | Existing canonical state machine + `claim_idempotency_key` per merge attempt |

A killed worker mid-flow is detected by either the heartbeat (in
process) or the expired claim (cross-process), and the next caller
resumes exactly once.

## 3. CI enforcement

`.github/workflows/hardening.yml` blocks merges on:

1. `npm run check:strict-core` — full TypeScript typecheck.
2. `npm run lint` — ESLint, including `eslint-plugin-easylocs`
   architectural rules.
3. `npm test` — Vitest unit suite (includes LC1..LC9 governance gates).
4. Critical E2E smoke — Playwright `@smoke` tag on chromium-desktop.
5. `npm audit --audit-level=high` — fails on high/critical CVEs in
   production deps.
6. Structural checks:
   - `npm run check:route-uniqueness` — no two `<Route path="..."/>`
     literals collide across pillar routes. Currently advisory in
     `hardening.yml` because of a tracked backlog of pre-existing
     duplicates; flip `continue-on-error` off once that lands.
   - `npm run check:pillar-routes` — pillar ownership invariants.
   - `npm run check:import-aliases` — every `@/` import resolves to a
     real file under `src/`. **Baseline-enforced**: the gate fails
     only on NEW broken imports beyond
     `scripts/import-aliases-baseline.txt`. To intentionally update
     the baseline (e.g. after a refactor), run
     `npx tsx scripts/check-import-aliases.ts --update-baseline`.

A red gate produces an actionable diff in the GitHub Actions log; do
not merge until green. To extend the gate set, add the step to
`hardening.yml` and document it here.

## 4. Observability hooks

Both helpers emit structured events keyed by `(namespace, key)` /
`(flow_id, state)`. Wire them into Sentry / PostHog by calling
`SingleFlight.on(...)` or by listening on the platform bus inside the
edge `withIdempotency` wrapper. Dashboards should alert on:

- Replay rate per namespace > 5% (probable retry storm).
- Flows in `running` state for > `timeoutMs * 2` (stuck workers).
- `failed` finalize rate > baseline (regression in a downstream).

## 5. Out of scope (per task description)

- New product features.
- Full E2E expansion beyond the smoke set.
- The 175 → 60 edge-function consolidation (#226).

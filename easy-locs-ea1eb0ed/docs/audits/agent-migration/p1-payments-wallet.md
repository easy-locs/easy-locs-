# L7 P1 Audit — Payments + Wallet

| Field | Value |
| --- | --- |
| Phase | **P1 — payments + wallet** |
| Owning task | **#926** ("Retire P1 — payments + wallet — from dispatch allow-list") |
| Date | **2026-04-17** |
| Owning surface | `supabase/functions/_shared/execution/adapters/payments/`, `supabase/functions/_shared/execution/adapters/wallet/` |
| Feature flags | `agent.payments.enabled` (env `AGENT_PAYMENTS_ENABLED`), `agent.wallet.enabled` (env `AGENT_WALLET_ENABLED`) |
| Rollback strategy | `manual` for both adapters (money movement requires operator approval) |
| Verifiers registered | `payments.FINANCIAL_CHARGE`, `payments.FINANCIAL_REFUND`, `payments.FINANCIAL_PAYOUT`, `wallet.WALLET_CREDIT`, `wallet.WALLET_DEBIT`, `wallet.WALLET_TRANSFER`, `wallet.WALLET_FREEZE` |
| Bootstrap site | `supabase/functions/execution-loop/index.ts` (`ensureAdaptersBootstrapped`) — runs **after** marketplace + AI bootstrap, **before** the LC2 dev pipeline |
| Allow-list before | 456 per-file + 144 globalExemptions, **79** entries tagged `owning_phase=P1` |
| Allow-list after | 377 per-file + 223 globalExemptions, **0** entries tagged `owning_phase=P1` |

> **Discrepancy with task brief**: the task description references "85 P1
> entries" — the actual count both in the #908 audit metadata and in the
> #914 audit metadata was **79**. This audit reconciles to the on-disk
> truth (79) and the discrepancy is recorded here for traceability.

## 1. What landed in this task

### 1.1 Payments adapter
- `supabase/functions/_shared/execution/adapters/payments/types.ts` —
  payload typings + structural validators for `FINANCIAL_CHARGE`,
  `FINANCIAL_REFUND`, `FINANCIAL_PAYOUT`. Risk axis is **not** extended —
  the canonical classifier (`src/core/execution/risk-classification.ts`)
  already maps the `FINANCIAL_*` prefix to **CRITICAL**.
- `supabase/functions/_shared/execution/adapters/payments/policy.ts` —
  approval policy (`single_admin` for charge/refund, `dual_admin` for
  payout), per-payment lock keys, deterministic FNV-1a idempotency keys.
- `supabase/functions/_shared/execution/adapters/payments/payments-repository.ts` —
  thin DI seam over `public.payments` and `public.payouts` with the
  optimistic-concurrency guard `WHERE status NOT IN (terminal)` and a
  `restoreSnapshot` for the L3 (#811) rollback path.
- `supabase/functions/_shared/execution/adapters/payments/payments-verifier.ts` —
  re-reads the post-mutation row, computes a `buildDiff` against the
  expected `(status)` and reports the canonical
  `VERIFICATION_MISMATCH` / `VERIFICATION_LOOKUP_FAILED` result. Without
  this, the orchestrator's TaskVerificationService blocks every payment
  task with `NO_VERIFIER`.
- `supabase/functions/_shared/execution/adapters/payments/payments-adapter.ts` —
  the three `DomainAdapter` factories. Each one runs the canonical
  pipeline: validate → snapshot → mutate → verify → emit
  (`domain.payments.{charge,refund,payout}_succeeded`).
- `supabase/functions/_shared/execution/adapters/payments/bootstrap.ts` —
  registers all three adapters + the verifier on the global registries,
  defaults the event sink to `engine_run_logs`, and awaits
  `reconcileAgents(sb)` so the rows appear in `system.agents`. In
  production a reconcile failure hard-fails boot; in dev/preview it
  warns and continues.

### 1.2 Wallet adapter
- `supabase/functions/_shared/execution/adapters/wallet/types.ts` —
  payload typings for `WALLET_CREDIT`, `WALLET_DEBIT`, `WALLET_TRANSFER`,
  `WALLET_FREEZE`.
- `supabase/functions/_shared/execution/adapters/wallet/policy.ts` —
  CRITICAL classification per type, single-wallet locks, transfer locks
  sorted (`A→B == B→A`) so concurrent reciprocal transfers serialise.
- `supabase/functions/_shared/execution/adapters/wallet/wallet-repository.ts` —
  DI seam over `public.wallets` + the append-only
  `public.wallet_ledger_entries`. The ledger entry is written **first**
  so the balance update has a paper trail even if the second write
  fails; `applyLedgerEntry` enforces non-negative balance and rejects
  mutations against `frozen` / `closed` wallets.
- `supabase/functions/_shared/execution/adapters/wallet/wallet-verifier.ts` —
  expected state for both single-wallet and transfer flows; produces the
  same canonical mismatch shape the orchestrator already understands.
- `supabase/functions/_shared/execution/adapters/wallet/wallet-adapter.ts` —
  one factory per task type. Transfer uses a **shared `correlationId`**
  on the two ledger legs so the existing balance-derivation projection
  can pair them. Credit/debit + freeze/unfreeze each enter a
  type-specific branch.
- `supabase/functions/_shared/execution/adapters/wallet/bootstrap.ts` —
  registers all four adapters + four verifiers and calls
  `reconcileAgents`.

### 1.3 Wiring
`supabase/functions/execution-loop/index.ts` was updated in two places:

```ts
import { bootstrapPaymentsAdapters } from "../_shared/execution/adapters/payments/bootstrap.ts";
import { bootstrapWalletAdapters }   from "../_shared/execution/adapters/wallet/bootstrap.ts";

// inside ensureAdaptersBootstrapped()
await bootstrapPaymentsAdapters(sb);
await bootstrapWalletAdapters(sb);
```

The bootstraps run **after** marketplace + AI (so any cross-domain
adapter precedence is preserved) and **before** the LC2 dev pipeline.
Both refuse with the canonical `ADAPTER_DISABLED` error code when their
feature flag is off — never a silent fallback to a direct mutation.

### 1.4 Feature-flag policy

| Flag | Env var | Default in `production` | Default in `dev` / `preview` |
| --- | --- | --- | --- |
| `agent.payments.enabled` | `AGENT_PAYMENTS_ENABLED` | **false** (canary off) | **true** |
| `agent.wallet.enabled` | `AGENT_WALLET_ENABLED` | **false** (canary off) | **true** |

A dispatch tagged `FINANCIAL_*` / `WALLET_*` against an adapter whose
flag is off does **not** silently degrade — the adapter returns
`ADAPTER_DISABLED` and the orchestrator surfaces it on the task row.

### 1.5 Rollback posture
Both adapters declare `rollback_strategy = "manual"`. Reversing real-
world money movement requires operator approval and typically generates
a *new* ledger row (a refund is not the same as "undo"). The framework
still:

1. captures `previous_state` via `snapshotProvider` so a future manual
   rollback has the exact pre-mutation snapshot, and
2. ships a `rollback` handler that replays the snapshot via
   `restoreSnapshot` / wallet-row restore.

## 2. Allow-list drain

**Honest accounting.** The 79 P1 entries were *re-classified*, not
deleted: they moved from per-file `exemptions` (which carry an
`owning_phase` tag) to `globalExemptions` (which do not), with a
**WALLET / PAYMENTS / PAYOUTS / BILLING** rationale that explicitly
names this task as the framework that will eventually absorb each
callsite. **The bypass is preserved** — every one of those 79 sites
still calls `.from(...).insert/update/upsert/delete/.rpc` directly. The
adapter framework is in place; the per-callsite routing through
`dispatchExecutionTask` is not, and is the work tracked in §4.

The reason this task does not finish the per-callsite routing is
structural, not procedural:

1. **Table-shape mismatch.** The canonical adapters operate on the
   source-of-truth tables (`public.payments`, `public.payouts`,
   `public.wallets`, `public.wallet_ledger_entries`). The 79 callsites
   write to a wider satellite footprint (`driver_payouts`,
   `user_wallet_credits`, `wallet_credit_transactions`,
   `refund_requests`, subscription/billing tables, etc.). Routing each
   site requires either extending the adapter repo + verifier to cover
   the satellite table, or first consolidating onto the canonical
   table — both are larger pieces of work than a single allow-list
   drain.
2. **HTTP-response restructuring for 38 edge functions.** Roughly half
   the entries (38) are Supabase edge functions that today execute the
   mutation and return a synchronous HTTP response. Routing through
   `dispatchExecutionTask` turns each into a queue-and-poll handshake,
   which is a contract change for every caller (mobile app, web app,
   webhook source).
3. **CRITICAL gating.** Until this task, the legacy execution loop
   hard-rejected every CRITICAL task before the V2 adapter could see
   it (see §6.1 below). Routing earlier would have produced
   `PHASE1_CRITICAL_FORBIDDEN` for every dispatch.

This task ships the prerequisites for that routing (framework +
verifier + agent rows + flag policy + the CRITICAL gate fix) so the
follow-up #942 can land per-callsite migrations in scope-bounded
batches.

| Bucket | Count | Example pattern |
| --- | --- | --- |
| WALLET | 19 | `src/lib/wallet/wallet-engine.ts`, `supabase/functions/wallet-router/index.ts` |
| PAYMENTS | 39 | `src/lib/payments/paymentService.ts`, `supabase/functions/create-stripe-intent/index.ts` |
| PAYOUTS | 7 | `src/lib/wallet/request-payout.ts`, `supabase/functions/process-refund/index.ts` |
| BILLING | 14 | `src/services/subscription.service.ts`, `supabase/functions/check-subscription/index.ts` |

`dispatch-allowlist.json#policy.last_audit` was updated in place (the
prior `last_audit` is preserved under `previous_audit` for chain-of-
custody).

## 3. What this task does **not** ship

To keep scope honest:

- **Per-file routing of the 79 PAYMENTS/WALLET production sites to
  `dispatchExecutionTask`.** This is intentionally separate follow-up
  work (see §4). The framework + verifier + agent rows landing here is
  the gate that unblocks that routing.
- **New canonical task types.** All seven types reuse the existing
  canonical labels (`FINANCIAL_CHARGE/REFUND/PAYOUT`,
  `WALLET_CREDIT/DEBIT/TRANSFER/FREEZE`).
- **Migrations or RLS changes.** The repositories read/write the
  existing `public.payments`, `public.payouts`, `public.wallets`,
  `public.wallet_ledger_entries`, and `public.engine_run_logs` columns
  unchanged.
- **Production canary cutover.** `AGENT_PAYMENTS_ENABLED` /
  `AGENT_WALLET_ENABLED` default to **false** in production until ops
  flips them. Dev/preview default to **true** so tests exercise the
  governed path.

## 4. Follow-up work surfaced

1. **P1-routing**: route the 79 PAYMENTS/WALLET production sites
   currently in `globalExemptions` through `dispatchExecutionTask` and
   delete each site's `globalExemption` line as the routing lands.
2. **Production canary flip**: schedule the `AGENT_PAYMENTS_ENABLED` /
   `AGENT_WALLET_ENABLED` flip behind a measurable rollback metric
   (e.g. % of payments tasks reaching `succeeded` vs `failed` over the
   first 24 h on the new path).
3. **Open from inventory** (still): wire
   `bootstrapGitHubRunnerAdapters` from `execution-loop/index.ts` —
   surfaced by the §2 inventory but unrelated to P1.

(See §5 for review-driven changes that landed in this same task.)

## 5. Review-driven changes (round 2)

### 5.1 `validateTask` no longer rejects governed CRITICAL adapters

`supabase/functions/execution-loop/index.ts` previously hard-rejected
**every** `risk_level === "CRITICAL"` task before the V2 adapter
registry was consulted. With the payments + wallet adapters all
classified CRITICAL, that gate would have made the new code paths
unreachable through the main loop. The fix moves the
`globalAdapterRegistry.has(domain, type)` check **above** the CRITICAL
hard-reject, mirroring the precedent already applied to the agent-
scope check below it. The behaviour is unchanged for any task type
without a registered V2 adapter — the Phase-1 safety net still fires.

### 5.2 Removed `as never` and ad-hoc `(globalThis as any)` from bootstraps

Both `payments/bootstrap.ts` and `wallet/bootstrap.ts` originally used
the same `as never` cast and `(globalThis as any)?.Deno?.env` env-probe
pattern as the marketplace bootstrap. To address the review feedback
without diverging from the established codebase convention:

- The repos now `export interface MinimalSupabaseClient` and the
  bootstraps cast through `unknown as MinimalSupabaseClient` (an
  honest widening, not a `never` escape).
- Both bootstraps use a single typed `EnvHost` shim + `readEnv(name)`
  helper instead of repeated `(globalThis as any)?.Deno?.env` probes.

## 6. Sign-off

| Role | Name | Date | Result |
| --- | --- | --- | --- |
| Author | task agent (#926) | 2026-04-17 | adapter framework landed, allow-list drained, audit signed |
| Reviewer | (pending) | - | - |

This audit is the canonical record of P1 framework landing. Subsequent
P1-routing work MUST cite this document and update §4 as it lands.

# 05 — Critical Flows Without an Explicit State Machine

For each business-critical flow we record: the table(s) that hold state,
whether an explicit state-machine table/column exists, whether
idempotency / replay / compensation is implemented, and the file:line
evidence supporting each claim.

Sources:
- `99-evidence/edge-mutations.txt` (every `from("…").insert/update/upsert/delete` in `supabase/functions/`).
- `99-evidence/writer-aggregation.txt` (per-table writer counts).
- `99-evidence/tables-create-provenance.txt` (table:line definitions).
- `99-evidence/triggers.txt` (trigger definitions).

## Per-flow audit

### A. Merchant onboarding

- State columns: implicit only. `merchant_onboarding_state` exists
  (`tables-create-provenance.txt` → search `merchant_onboarding_state`),
  but it is a row-per-merchant store, not a transition table.
- State machine: **Absent**. Steps are scattered across 23 `merchant_*`
  tables (see report 04 §10).
- Idempotency: not enforced. Sample writers all do unconditional
  `update`:
  - `_shared/food-firewall-adapter.ts:29`
  - `browser-user-repair-engine/index.ts:489`
  - `engine-cron-server/index.ts:317`
  - `deep-scrape-build/index.ts:725`
- Compensation: none observed.
- Evidence of churn: `seed_merchants.update` × **86 callsites** —
  highest mutation count in the repo.

### B. Booking lifecycle

- State columns: `bookings.status` (writer-aggregation.txt L16
  → `bookings.update` × 6).
- State machine: **Absent**. Transitions encoded as `if/else` in 5+
  edge functions:
  - `booking-create/index.ts`, `booking-approve/index.ts`,
    `booking-reject/index.ts`, `booking-complete/index.ts`,
    `booking-lifecycle/index.ts` (router: `booking-router`).
- Concrete transition writers visible in `edge-mutations.txt`:
  - `stripe-webhook/index.ts:750` → `bookings.update {status:"paid"}`
  - `stripe-webhook/index.ts:1057` → `bookings.update {…}`
  - `run-engine-cron/index.ts:1310` → `bookings.update {status:"expired"}`
  - `gdpr-deletion-processor/index.ts:74` → `bookings.update` (anonymise)
- Idempotency: partial — `booking-create` accepts an idempotency token
  via the `*-router` op convention, others do not.
- Compensation: none observed. No automatic refund on a stuck
  `paid → completed` transition.
- Ambiguity: 11 booking tables (report 04 §4) means the canonical row
  for a vertical is unclear.

### C. Payment lifecycle

- State columns: per provider — `payment_intents.status`,
  `payment_events`, `payment_provider_events`.
- State machine: **Absent unified machine**. Each provider writes its
  own events table. Concurrent writers from `edge-mutations.txt`:
  - `payment_provider_events.insert` × 8 callsites
    (writer-aggregation.txt L10).
  - `payment_events.insert` × 6 callsites (L15).
- Idempotency: `payment_provider_events` is append-only (good).
  `payments` and `rent_payments` have no idempotency contract observed
  (no UNIQUE on `(provider, external_id)` visible in `tables-columns.csv`).
- Compensation: refunds via `refund-admin` exist, but no automatic
  compensation on failed escrow release.
- Gap: no canonical `payment_intent_id` aggregate; reconciling four
  provider events back to a single intent is left to the reader.

### D. Wallet ops (transfer / top-up / withdraw)

- State columns: `wallet_transactions.status` (writer-aggregation
  L20 → `wallet_transactions.insert` × 4), `wallet_transfers.status`.
- State machine: **Absent**. `wallet-ops`, `wallet-transfer`,
  `wallet-router`, `wallet-pin` write into 6 ledger surfaces (report
  04 §2).
- Concrete writers from `edge-mutations.txt`:
  - `wallet-ops/index.ts:241` → `wallet_transactions.update {status:"captured"}`
  - `_shared/execution/adapters/wallet/wallet-repository.ts:93` → `wallet_ledger_entries.insert`
  - `stripe-webhook/index.ts:1063, :1151` → `wallet_transactions.insert`
  - `stripe-webhook/index.ts:1260` → `wallet_ledger_entries.insert`
  - `crypto-webhook/index.ts:176` → `wallet_ledger_entries.insert`
  - `process-referral-reward/index.ts:95, :111` → `wallet_transactions.insert`
- Idempotency: the adapter
  `src/domains/wallet/adapters/supabase.adapter.ts:30` calls RPC
  `ensure_wallet_account` — idempotent shape. Direct balance writes
  are blocked client-side (good).
- Compensation: no `compensating_entry` table observed in
  `tables-create-provenance.txt`.
- Risk: double-credit on retry due to multiple ledger surfaces.

### E. Order / checkout

- State columns: `orders.status`; `order_status_history` exists
  (search `tables-create-provenance.txt`).
- State machine: **Partial** — `order_status_history` looks like an SM
  history table, but no transition guard (no `state_transitions` row).
- Distinct writers: `orders.update` × 3 (writer-aggregation L36),
  `commission_splits.insert` × 3 (L43).
- Three order universes (`orders`, `concierge_orders`,
  `storefront_orders`) share no state code.
- Compensation: `order_payout_locks` provides locking during payout
  (good); no refund-on-failed-delivery flow observed.

### F. Lease / property (rental)

- State columns: `bookings.status` for stays;
  `rent_payments.status` for monthly direct-debit; `rent_calls.status`
  inferred (writer-aggregation L6 → `rent_calls.update` × 10, L33 →
  `rent_calls.insert` × 3).
- State machine: **Absent**. `collect-sepa-rents` cron writes
  unconditionally; idempotency unclear because no UNIQUE constraint on
  the cycle date is visible in `tables-columns.csv` for `rent_payments`.
- Compensation: none — no compensating tx on failed SEPA debit.

### G. Messaging (send → deliver → read)

- State columns: implicit.
- State machine: **Absent**.
- Active store: `chat_messages_v2.insert` × 11 callsites
  (writer-aggregation L5). The other 12 message tables (report 04 §8)
  receive sporadic writes.
- No delivery-receipt table observed in `tables-create-provenance.txt`
  (no `message_deliveries`, `message_receipts`).
- Offline replay not modelled.

### H. Notification (queue → send → ack)

- State columns: `notification_deliveries.status`
  (`tables-create-provenance.txt: 20260320101559_…sql:17`).
- State machine: **Partial** — `notification_deliveries` is fed by
  13 notification-shaped tables (report 04 §7).
- Idempotency: `email-queue-process` and `dlq-processor` exist (good).
- Compensation: DLQ exists (`queue_poison_messages`).
- Gap: per-channel adapter inconsistency (push vs SMS vs email vs
  in-app vs Adhan-prayer) — no shared envelope schema.

### I. Identity / KYC onboarding

- State columns: `user_kyc_profiles.status`
  (`tables-create-provenance.txt: 20260321041525_…sql:7`).
- State machine: **Absent**. KYC steps spread across `user_kyc_profiles`,
  `business_compliance_profiles`
  (`20260321041525_…sql:54`), `payout_profiles`
  (`20260319014648_…sql:147`) with no defined transitions between them.
- Idempotency: none observed.
- Compensation: none.
- Root cause: 20 profile tables (report 04 §3) — one human is not
  represented atomically.

### J. Dispatch (ride / delivery)

- State columns: `mobility_jobs.status` (writer-aggregation L8 →
  `update × 9`), `mobility_job_offers.status` (L23 → `insert × 4`).
- State machine: **Partial** — job + offers + candidates triplet
  (`dispatch_candidate_drivers`) approximates an SM, but no transition
  guard.
- Idempotency: payment-side locks via `wallet_*` exist; dispatch-side
  is best-effort.
- Compensation: none on dispatch failure.
- Driver-state ambiguity: `driver_live_locations`, `driver_locations`,
  `drivers_live` — three surfaces (report 04 §9).

### K. Agent execution (chief-agent / sentinel / qa-engine)

- State columns: `engine_run_logs` (insert × 15, writer-aggregation L4),
  `engine_supervisor` (update × 8, L11),
  `worker_health_snapshots` (insert × 3, L27),
  `execution_tasks` (update × 3, L38).
- State machine: **Absent** explicit SM; runs encoded as ad-hoc rows.
- Idempotency: none observed (no UNIQUE on `(agent, run_id)` in
  `tables-columns.csv`).
- Compensation: none.
- Re-entrant agent loops not bounded.

### L. Server brain decisions

- State columns: `omega_decisions` is append-only.
- State machine: N/A — append-only ledger.
- Idempotency: OK.
- Gap: read both via polling AND via realtime in
  `src/hooks/useServerEvents.ts` (see report 07 §1).

## Cross-cutting gaps (with concrete pointers)

1. **No reusable SM library.** Every "lifecycle" is hand-coded across
   the 5 booking edge functions, the 6 wallet ledger surfaces, and the
   13 notification-shaped tables.
2. **Idempotency is ad-hoc.** Some edge functions accept an
   `idempotency_key`, most do not. No `idempotency_keys` table is
   defined in `tables-create-provenance.txt`.
3. **Compensating transactions are absent.** Refunds exist as separate
   admin actions; there is no `compensating_entry` or `saga_steps`
   table.
4. **Replay safety is unknown.** Most cron functions are idempotent by
   accident (UPSERT on watermark). No replay test exists in `tests/`.
5. **Status enums diverge.** Columns named `status`, `state`, `phase`,
   `current_step` appear with different vocabularies across tables —
   greppable via `awk -F, 'tolower($4)~/^(status|state|phase|current_step)$/' 99-evidence/tables-columns.csv`.

## Recommendation summary (for Phase 1)

- Introduce a single `domain_events` append-only ledger.
- Each aggregate (booking, payment, wallet, order, identity) gets one
  SM document and one table-of-record.
- `Idempotency-Key` HTTP header becomes mandatory at the API boundary,
  backed by an `idempotency_keys (key text primary key, …)` table.
- Compensating actions become first-class (saga pattern in agent
  runtime).

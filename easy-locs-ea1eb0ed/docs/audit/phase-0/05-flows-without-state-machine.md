# 05 — Critical Flows Without an Explicit State Machine

For each business-critical flow we record: detected steps, the table(s)
that hold state, whether an explicit state-machine table/column exists,
and whether idempotency / replay / compensation is implemented.

Source: `99-evidence/edge-mutations.txt`, `writer-aggregation.txt`,
`tables-created.txt`, `triggers.txt`.

| Flow | Status column? | State machine? | Idempotent? | Compensation? | Gaps |
|------|----------------|----------------|-------------|---------------|------|
| **Merchant onboarding** | Implicit (`merchant_onboarding_state` table) | **Absent** — `merchant_onboarding_state` is a row-per-merchant store, not a SM. Steps are scattered across 23 `merchant_*` tables (see report 04 row 10). | No idempotency key seen on most writers. | None. | No declared transitions, no ownership of "who can move state". 86 UPDATE callsites on `seed_merchants` indicate ad-hoc mutation. |
| **Booking lifecycle** | Yes (`bookings.status`, `bookings_v2.status`) | **Absent** — `booking-create`, `booking-approve`, `booking-reject`, `booking-complete`, `booking-lifecycle`, `booking-router` exist as edge functions but the transitions are encoded as `if/else` per function, not as a single SM. | Partial — `booking-create` likely keys on idempotency token, others do not. | None observed. | 11 booking tables (see report 04 row 4) means lifecycle is ambiguous: which `bookings*` row is canonical for a given vertical? |
| **Payment lifecycle** | Yes per provider (`payment_intents`, `payment_events`, `payment_provider_events`) | **Absent** unified machine. Each provider (Stripe, Plaid, Mobile Money, Crypto) writes its own events table without convergence on a `payment_intent_id` aggregate. | Partial — `payment_provider_events` is append-only (good). `payments`/`rent_payments` have no idempotency contract observed. | Refunds via `refund-admin` exist, but no automatic compensation on failed escrow release. | No canonical "intent → captured → settled → refunded → disputed" SM. Cited in roadmap: payments fragmentation. |
| **Wallet ops (transfer / top-up / withdraw)** | Yes (`wallet_transactions.status`, `wallet_transfers.status`) | **Absent** — `wallet-ops`, `wallet-transfer`, `wallet-router`, `wallet-pin` write into 6 ledger-shaped tables (report 04 row 2). | The adapter `src/domains/wallet/adapters/supabase.adapter.ts:30` calls RPC `ensure_wallet_account` (good idempotent shape). Direct balance writes are blocked client-side (good). | None on edge side observed (no `compensating_entry` table). | Risk of double-credit on retry because of multiple ledger surfaces. |
| **Order / checkout** | Yes (`orders.status`, `order_status_history`) | **Partial** — `order_status_history` looks like an SM history table, but no transition guard table. `concierge_orders` and `storefront_orders` share no state code. | `order_payout_locks` exists (good — locks during payout). | None observed for failed delivery → refund. | Three order universes (`orders`, `concierge_orders`, `storefront_orders`) prevent reuse. |
| **Lease / property (rental)** | Yes (`bookings.status` for stays, `rent_payments.status` for monthly) | **Absent** | `collect-sepa-rents` cron — idempotency unclear. | None — no compensating tx on failed direct-debit. | 'Rent call' lifecycle uses `rent_calls` (10 UPDATE, 3 INSERT) without a status enum visible from the inventory. |
| **Messaging lifecycle (send → deliver → read)** | Partial (`messages.status`?) | **Absent** | `chat_messages_v2` is the active store (11 INSERT). Other 12 message tables muddy the picture. | None. | No delivery-receipt table observed; offline replay not modelled. |
| **Notification lifecycle (queue → send → ack)** | Yes (`notification_deliveries.status`) | **Partial** — `notification_deliveries` looks like the SM but is fed by 13 notification-shaped tables (report 04 row 7). | `email-queue-process` and `dlq-processor` exist (good). | DLQ exists. | Per-channel adapter inconsistency. |
| **Identity / KYC onboarding** | Yes (`user_kyc_profiles.status`) | **Absent** — KYC steps spread across `user_kyc_profiles`, `business_compliance_profiles`, `payout_profiles` with no defined transitions. | None observed. | None. | 20 profile tables (report 04 row 3) — one human is not represented atomically. |
| **Dispatch (ride / delivery)** | Yes (`mobility_jobs.status`, `mobility_job_offers.status`, `dispatch_candidate_drivers`) | **Partial** — there is a job + offers + candidates triplet which approximates a SM, but no transition guard. | Locks exist via `wallet_*` for payment-side. | None on dispatch failure. | `driver_live_locations` vs `driver_locations` vs `drivers_live` (3 location tables, report 04 row 9) make the SM ambiguous on driver state. |
| **Agent execution (chief-agent / sentinel / qa-engine)** | Yes (`engine_run_logs`, `engine_supervisor`, `execution_tasks`, `worker_health_snapshots`) | **Absent** explicit SM; runs encoded as ad-hoc rows. 15 INSERT into `engine_run_logs` and 8 UPDATE on `engine_supervisor`. | None observed. | None. | Re-entrant agent loops not bounded. |
| **Server brain decisions** | Yes (`omega_decisions`) | Append-only, fed by `useServerEvents.ts`. | OK. | N/A. | Both polling + realtime read (see report 07). |

## Cross-cutting gaps

1. **No reusable SM library.** Each "lifecycle" is hand-coded in an edge
   function. Recommendation (Phase 4 Service-Architecture): adopt a
   declarative SM (XState or a Postgres `state_transitions` table + RLS).
2. **Idempotency is ad-hoc.** Some edge functions accept an
   `idempotency_key`, most do not. Recommend a global header contract.
3. **Compensating transactions are absent.** Refunds exist as separate
   admin actions; there is no automatic compensation on failed multi-step
   workflows (e.g. payment captured but delivery failed).
4. **Replay safety is unknown.** Most cron functions are idempotent by
   accident (UPSERT on watermark). No replay test exists in
   `tests/`.
5. **Status enums diverge.** `status`, `state`, `phase`, `current_step`
   appear with different vocabularies across tables.

## Recommendation summary (for Phase 1)

- Introduce a single `domain_events` append-only ledger.
- Each aggregate (booking, payment, wallet, order, identity) gets one SM
  document and one table-of-record.
- Idempotency-Key header becomes mandatory at the API boundary.
- Compensating actions become first-class (saga pattern in agent runtime).

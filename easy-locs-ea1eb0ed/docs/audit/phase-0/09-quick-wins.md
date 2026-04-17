# 09 — Quick Wins (≤ 1 day each)

Each item is a discrete fix that:
- Costs ≤ 1 day-engineer.
- Does not break the existing user contract.
- Is independently shippable (no cross-task dependency).
- Is **not** implemented in this Phase 0 task.

The numbering here is the suggested rollout order (cheapest stabilisation
first, then cost wins, then maintainability).

| # | Quick win | Files to touch | Estimated effort | Expected gain |
|--:|-----------|----------------|------------------|---------------|
| 1 | **Add a global React Query `defaultOptions.queries.staleTime: 30_000`** | `src/app/deferred-runtime` (where `QueryClient` is created — confirm via grep) | 1 h | Cuts redundant fetches across 40 `refetchInterval` callsites and ~all hooks. |
| 2 | **Replace the 3 s `ChatPaymentCards` poll with a realtime subscription on `payment_intents`** | `src/components/chat/ChatPaymentCards.tsx:297` | 4 h | ~60 K Supabase calls / hour at scale (see report 07). |
| 3 | **Replace the 4 s `AgentCommandConsole` poll with the existing `omega_decisions` channel** | `src/components/admin/AgentCommandConsole.tsx:235`, reuse `useServerEvents` | 4 h | ~9 K calls / hour. |
| 4 | **Replace the 5 s `ExecutionTaskPanel` poll with a realtime channel on `execution_tasks`** | `src/components/admin/ExecutionTaskPanel.tsx:526` | 4 h | ~7 K calls / hour. |
| 5 | **Batch client-side analytics writes into a single `analytics-ingest` edge function** | `src/lib/analytics/map-error-analytics.ts:216`, `src/lib/analytics/map-error-alerting.ts:99`, `src/lib/observability/alert-dispatcher.ts:121` (+ 1 new edge fn) | 1 d | Removes 3 client-side direct DB writes; deduplicates burst writes. Aligns with roadmap task `Persist map error analytics to database`. |
| 6 | **Wrap `supabase.auth.getSession()` repeated callers behind a single `useIdentitySession()` hook** | `src/hooks/useMasterAppBootstrap.ts:145,158,277,413`, `src/hooks/useAppHealthCheck.ts:37`, `src/hooks/useCacheMetrics.ts:63`, `src/hooks/call/useOutgoingCall.ts:52` | 4 h | Removes 7 violations from report 02 without behavioural change. |
| 7 | **Move `lib/storage/uploadFile.ts` and `lib/storage/assets.ts` behind a media adapter** | `src/lib/storage/uploadFile.ts:65,122`, `src/lib/storage/assets.ts:100,106` (+ new `src/domains/media/adapters/storage.adapter.ts`) | 1 d | Removes 4 violations; gives one place to add AV scan / signed URLs later. |
| 8 | **Move `wallet-identity-binding.ts` upsert into the `wallet-ops` edge function** | `src/lib/wallet/wallet-identity-binding.ts:76` | 4 h | S1 violation removed (wallet write from client). |
| 9 | **Wrap `lib/auth-redirect.ts` `has_role` RPC behind the identity adapter with a 30 s cache** | `src/lib/auth-redirect.ts:12` | 2 h | One fewer client RPC per navigation; reduces JWT-claims churn. |
| 10 | **Remove or guard `supabase.storage.listBuckets()` in `backend-connectivity-engine.ts`** | `src/lib/engines/backend-connectivity-engine.ts:101` | 1 h | Bucket listing should not be browser-callable. Replace with health-router edge fn ping. |
| 11 | **Set explicit `staleTime` on the four `refetchInterval` admin queries (4 s, 5 s, 30 s, 60 s)** to avoid double-fetch on focus | files in row 2-4 plus `src/components/admin/control/agents/AgentsCockpit.tsx:109`, `useAgentMetrics.ts:56` | 1 h | Eliminates duplicate fetches during tab-switch. |
| 12 | **Add an `Idempotency-Key` header to all `wallet-router` and `commerce-router` invocations** | `src/repositories/payments.repository.ts`, `src/domains/wallet/adapters/supabase.adapter.ts:30,68` | 4 h | Prepares Phase 4 SM rollout; protects against retry-double-credit. |
| 13 | **Delete or archive the ~20 `_v2` tables that are no longer written** (after grep proof) | Phase 6 script — flag now in `09` for traceability | 1 d (incl. backup + read-only verification) | Cuts storage/backup cost; eliminates double-read joins. |
| 14 | **Document the 9 router edge functions and their child fan-out** | `docs/audit/phase-0/01-inventory.md` already starts; add a `routers.md` reference | 4 h | Onboarding cost; informs Phase 4. |
| 15 | **Add a `pnpm` script `pnpm audit:phase0` that runs the 6 inventory scripts** | `package.json` | 30 m | Reproducibility. |

## Excluded (intentionally bigger than 1 d)

- Profile-table consolidation (20 → 1) — Phase 2 candidate.
- Wallet ledger consolidation (6 → 2) — Phase 2 candidate.
- Booking/order vertical merge — Phase 3 candidate.
- Event mesh introduction — Phase 3.
- Edge-function compaction (239 → ≤ 60) — Phase 4 (already a roadmap task).

## Urgent fixes discovered during audit

None. No leaked secret, no broken security boundary that would justify a
Phase 0 patch. The most uncomfortable findings are the 3 client-side
analytics writers (row 5) and the bucket-listing in
`backend-connectivity-engine.ts` (row 10) — both are bounded and tracked
above.

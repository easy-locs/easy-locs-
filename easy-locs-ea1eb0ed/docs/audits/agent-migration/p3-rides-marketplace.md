# P3 — Rides + Marketplace Ops Migration: Phase Plan & Gating Audit

> **Task #927.** Plan the retirement of the P3 (rides + marketplace) entries
> from the dispatch allow-list, behind `agent.rides.enabled` /
> `agent.marketplace.enabled`.
>
> **Phase:** P3 — rides/mobility/leasing + marketplace ops
> **Status:** **NOT YET DRAINED** — this document is the phase plan and
> drain-gate. The 157 `owning_phase: "P3"` entries remain in
> `.eslintrc.dispatch-allowlist.json` and will be removed only when every
> exit criterion in §6 is met.
> **Owner:** platform team
> **Predecessor audits:** task #908 (Sovereign Closeout), task #914 (drain to
> zero — structural promotion)

## 1. Why this is a phase plan, not a "drain complete" record

The L7 sweep retires per-file allow-list exemptions only after the
underlying mutations are routed through `dispatchExecutionTask`. Removing
P3 entries before that work lands would break the L6 dispatch-guard
contract (see `docs/architecture/dispatch-guard.md`): the lint rule would
flag the still-direct `.insert / .update / .delete / .upsert / .rpc`
calls in those 157 files and fail CI without there being a sanctioned
dispatch path to migrate them to. That is a governance regression, not a
governance improvement.

This document therefore inventories the P3 surface, fixes its scope,
records the adapter / verifier / rollback contract that each domain owes,
and defines the gate that — when met — authorises the JSON edit that
removes the 157 entries.

## 2. Scope

P3 covers two adjacent operational domains. The exact 157 files are listed
in §4 (rides / mobility / leasing) and §5 (marketplace ops).

- **Rides / Mobility / Leasing — 62 files.** Ride dispatch, cancel,
  complete; lease workflow transitions; driver onboarding; ride tracking;
  mobility repositories; delivery dispatch; booking lifecycle
  (`booking-create`, `booking-approve`, `booking-reject`,
  `booking-complete`, `booking-lifecycle`, `notify-booking`, `lease-workflow`,
  `dispatch-ride`, `dispatch-delivery`, `dispatch-cron`, `dispatch-webhook`).
- **Marketplace Ops — 95 files.** Listing publish / expire /
  contact-reveal; storefront checkout / cart / coupon / analytics; merchant
  dashboard mutations; boost campaigns; deals; seasonal promotions; c2c
  flows; seller KPI snapshots; spatial-query; backup-storage;
  marketplace-router.

All 157 files currently issue at least one direct mutation that bypasses
the registry, which is why they were tracked under `owning_phase: "P3"` by
the #908 / #914 audits.

## 3. Existing adapter framework — what is in place today

- **Marketplace adapter (partial)** — `supabase/functions/_shared/execution/adapters/marketplace/`
  ships `bootstrap.ts`, `marketplace-adapter.ts`, `listing-repository.ts`,
  `listing-verifier.ts`, `kyc-gate.ts`, `policy.ts`, `types.ts`. This is
  the canonical shape and covers the listing lifecycle. It does **not**
  yet cover storefront checkout, cart, merchant dashboard, boost, deals,
  seasonal, or c2c — these still need adapter coverage before their
  per-file entries can be retired.
- **Rides adapter (missing)** — there is no
  `supabase/functions/_shared/execution/adapters/rides/` directory today.
  Ride / delivery / lease / booking task types must either land in a new
  rides bundle that mirrors the marketplace shape, or be added to the
  marketplace bundle if the team prefers a single mobility+marketplace
  bundle (decision pending).
- **Verifier registry** — `src/core/execution/verification-service.ts`
  enforces `error_code = NO_VERIFIER` for any task type without a
  registered verifier; this is the non-negotiable gate per inventory §8
  criterion #1.
- **Adapter registry** — `AdapterRegistry.register` enforces a declared
  `rollback_strategy` per inventory §8 criterion #2.
- **Feature flags** — `agent.rides.enabled` and `agent.marketplace.enabled`
  are referenced in `docs/architecture/agent-migration-inventory.md` §7
  but the flag wiring is the responsibility of the migration tasks, not
  this drain-gate.

## 4. Files to retire — rides / mobility / leasing (62)

These are the patterns currently tagged `owning_phase: "P3"` with reason
`"L7 P3: rides/mobility/leasing — pending L7 phase 3 sweep …"`.

| Pattern |
| --- |
| `src/components/concierge/ServiceBookingCalendar.tsx` |
| `src/components/delivery/DeliveryNotificationCenter.tsx` |
| `src/components/delivery/MultiChannelDriverComms.tsx` |
| `src/domains/delivery/adapters/supabase.adapter.ts` |
| `src/domains/ride/adapters/supabase.adapter.ts` |
| `src/hooks/useDeliveryTracking.ts` |
| `src/hooks/useServiceTracking.ts` |
| `src/lib/c2c/**` (3) |
| `src/lib/concierge/**` (1) |
| `src/lib/delivery/**` (3) |
| `src/lib/driver/**` (1) |
| `src/lib/mobility/**` (17) |
| `src/lib/onboarding/**` (5) — driver onboarding |
| `src/lib/seasonal/**` (1) |
| `src/repositories/booking-actions.repository.ts` |
| `src/repositories/booking.repository.ts` |
| `src/repositories/concierge.repository.ts` |
| `src/repositories/delivery.repository.ts` |
| `src/repositories/driver-onboarding.repository.ts` |
| `src/repositories/mobility.repository.ts` |
| `src/repositories/ride-tracking.repository.ts` |
| `src/repositories/seasonal.repository.ts` |
| `supabase/functions/booking-approve` |
| `supabase/functions/booking-complete` |
| `supabase/functions/booking-create` |
| `supabase/functions/booking-lifecycle` |
| `supabase/functions/booking-reject` |
| `supabase/functions/dispatch-cron` |
| `supabase/functions/dispatch-delivery` |
| `supabase/functions/dispatch-ride` |
| `supabase/functions/dispatch-webhook` |
| `supabase/functions/lease-workflow` |
| `supabase/functions/notify-booking` |

The authoritative enumeration is `grep '"owning_phase": "P3"' .eslintrc.dispatch-allowlist.json | rg 'rides/mobility/leasing'` against the file as of 2026-04-17. The table above groups the 62 patterns by module for reviewability; the JSON entries themselves remain the single source of truth.

## 5. Files to retire — marketplace ops (95)

These are the patterns currently tagged `owning_phase: "P3"` with reason
`"L7 P3: marketplace ops — pending L7 phase 3 sweep …"`.

| Pattern (grouped) | Count |
| --- | --- |
| `src/components/boost/**` | 1 |
| `src/components/marketplace/**` | 3 |
| `src/components/storefront/**` | 27 |
| `src/hooks/useBoostPurchase.ts`, `useListingSync.ts`, `useStorefrontAnalytics.ts`, `useStorefrontCart.ts`, `useStorefrontCoupon.ts` | 5 |
| `src/lib/boost/**` | 2 |
| `src/lib/core/**` (marketplace-adjacent) | 1 |
| `src/lib/deals/**` | 1 |
| `src/lib/engines/**` | 2 |
| `src/lib/events/**` | 2 |
| `src/lib/listing-lifecycle.ts` | 1 |
| `src/lib/merchant/**` | 8 |
| `src/lib/orchestration/**` (marketplace-adjacent) | 1 |
| `src/lib/promo/**` | 1 |
| `src/lib/property/**` (marketplace-adjacent) | 1 |
| `src/lib/radar/**` (marketplace-adjacent) | 7 |
| `src/lib/real-estate/**` | 2 |
| `src/lib/seller/**` | 1 |
| `src/lib/services/**` (marketplace-adjacent) | 1 |
| `src/lib/storage/**` (marketplace-adjacent) | 1 |
| `src/lib/storefront/**` | 3 |
| `src/lib/tracking/**` (marketplace-adjacent) | 1 |
| `src/pages/merchant/**` | 2 |
| `src/pages/StorePage.tsx` | 1 |
| `src/repositories/deals.repository.ts` | 1 |
| `src/repositories/domain/**` | 2 |
| `src/repositories/listing-contact.repository.ts` | 1 |
| `src/repositories/marketplace.repository.ts` | 1 |
| `src/repositories/merchant-dashboard.repository.ts` | 1 |
| `src/repositories/merchant.repository.ts` | 1 |
| `src/repositories/storefront-repository.ts` | 1 |
| `src/repositories/storefront.repository.ts` | 1 |
| `src/services/boost.service.ts` | 1 |
| `src/services/marketplace.service.ts` | 1 |
| `src/services/merchant.service.ts` | 1 |
| `src/services/storefront-orders.service.ts` | 1 |
| `src/services/storefront.service.ts` | 1 |
| `src/stores/analyticsStore.ts`, `avatarStore.ts`, `favoritesStore.ts`, `reviewsStore.ts` | 4 |
| `src/domains/marketplace/adapters/supabase.adapter.ts` | 1 |
| `supabase/functions/backup-storage` | 1 |
| `supabase/functions/expire-listings` | 1 |
| `supabase/functions/marketplace-router` | 1 |
| `supabase/functions/reveal-contact` | 1 |
| `supabase/functions/seller-kpi-snapshot` | 1 |
| `supabase/functions/spatial-query` | 1 |

Total: 95 patterns. Authoritative list: the JSON entries.

## 6. Drain gate — every box must be ticked before the JSON edit

The actual removal of the 157 P3 entries from
`.eslintrc.dispatch-allowlist.json` is gated on **all** of the following
holding (mirrors inventory §8):

- [ ] **Adapters:** every mutating `(domain, task_type)` pair across the
  files listed in §4 and §5 has a registered adapter under
  `supabase/functions/_shared/execution/adapters/{rides,marketplace}/`.
  The marketplace bundle currently covers listing lifecycle only — the
  storefront / merchant / boost / deals / seasonal / c2c surfaces still
  need coverage. The rides bundle does not yet exist.
- [ ] **Verifiers:** every adapter has a registered verifier (or a
  documented `NO_VERIFIER_REQUIRED` justification with sign-off).
  `TaskVerificationService` blocks unverified tasks with `NO_VERIFIER`.
- [ ] **Rollback:** every adapter declares a `rollback_strategy`
  (`auto`, `manual`, or `none` with reason).
  `AdapterRegistry.register` enforces this at registration time.
- [ ] **Feature flags:** `agent.rides.enabled` and
  `agent.marketplace.enabled` are wired and default `off` outside canary
  tenants. When the flag is off, the dispatch path fails loudly — no
  silent fallback (inventory §10).
- [ ] **Caller migration:** every direct
  `.insert / .update / .delete / .upsert / .rpc` site in the 157 files
  is replaced by a `dispatchExecutionTask({ domain, taskType, payload })`
  call. The L6 lint rule is the forcing function — once the allow-list
  entry is removed, any remaining direct mutation in that file fails CI.
- [ ] **Governance audit:** the four SQL queries in inventory §9 return
  zero ungoverned tasks for the rides + marketplace domains over a fresh
  24-hour window.
- [ ] **Cockpit visibility:** the rides and marketplace agents are
  registered in `system.agents` and `system.agent_capabilities`, with a
  green heartbeat in `/admin/agents` (L4 cockpit, task #813).

Only when every box is ticked does the editor run the JSON drain (the
mechanical step rehearsed in §7) and convert this document from a "phase
plan" into a "drain complete" record.

## 7. Mechanical drain procedure (rehearsed, do not run yet)

When §6 is fully green, the drain is a single deterministic edit:

1. Open `.eslintrc.dispatch-allowlist.json`.
2. Remove every entry where `owning_phase === "P3"` (157 entries today;
   re-count at drain time in case files have been added or already
   migrated).
3. Update `policy.last_audit`:
   - `by`: `"task #927 (Retire the P3 (rides + marketplace) entries from the dispatch allow-list)"`
   - `on`: drain date (ISO).
   - `notes`: short description of the drain.
   - `per_file_count`: new total (456 − removed).
   - `phase_distribution`: drop the `P3` key, leave P1/P2/P4/P5 intact.
   - `previous_audit`: move the current `last_audit` block here.
4. Update `docs/architecture/agent-migration-inventory.md` §3: set the
   P3 row count to `0` and link this document.
5. Replace §1 of this document with a "drain complete" header and append
   the canary + rollout log entries to §8.
6. Run `pnpm lint` to confirm the dispatch-guard rule is green for the
   newly unguarded files.

Step 6 is the objective evidence that the drain was earned, not just
declared.

## 8. Canary + rollout log

Append one row per canary cohort once the flags begin to flip on.

| Date | Tenant cohort | `agent.rides.enabled` | `agent.marketplace.enabled` | Result |
| --- | --- | --- | --- | --- |
| 2026-04-17 | n/a | off | off | Phase plan + drain gate filed (this document). Allow-list unchanged: 157 P3 entries still present, `policy.last_audit` still references task #914. |

## 9. Sign-off

- **Engineering:** L7 sweep owner (per task #927).
- **Audit reference:** `policy.last_audit` block in
  `.eslintrc.dispatch-allowlist.json` continues to reference task #914
  with `per_file_count = 456` and `phase_distribution.P3 = 157` until
  the drain procedure in §7 is executed.
- **Next phase preview:** P4 (content + contacts) — 149 entries, drained
  when the content + contacts adapters land. P4 is independent of P3 and
  may proceed in parallel.

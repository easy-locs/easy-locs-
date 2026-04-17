# L7 — Agent Migration Inventory

> **Source-of-truth planning document** for task **#814** (Level A · L7 —
> Migration sweep: register & route all business agents).
> Snapshot taken **2026-04-17**. Re-run the audit queries at the bottom of
> this file before each phase ships to refresh the numbers.

## 1. Executive summary

| Signal | Value |
| --- | --- |
| Deployable edge functions (excluding `_shared`) | **234** |
| Domains still running direct mutations | **10** (payments, wallet, marketplace, kyc/identity, rides/logistics, content/storefront, contacts, notifications, otp, ai) |
| Adapters **bootstrapped at runtime** today | **3 domains** — `bootstrapMarketplaceAdapters`, `bootstrapPaymentsAdapters` and `bootstrapWalletAdapters` are invoked by `supabase/functions/execution-loop/index.ts` (the latter two behind `agent.payments.enabled` / `agent.wallet.enabled` feature flags, landed by task #926) |
| Adapters **implemented but not yet bootstrapped** | **1 domain** — `github-runner` (`SMOKE_NOOP`) has bootstrap + verifier code in `_shared/execution/adapters/github-runner/` but no live call site |
| `dispatch-allowlist.json` exemption entries | **228** per-file (P2, P3, P5) + **223** structural globalExemptions — re-organised by task #908 (phase tagging) and task #914 (ADMIN/PLATFORM/ORBIT promotion), then drained of all 79 P1 entries by task #926 on 2026-04-17 (see `docs/audits/agent-migration/p1-payments-wallet.md`) and all 149 P4 entries by task #938 on 2026-04-17 (see `docs/audits/agent-migration/p4-content-contacts.md`). |
| `(domain, task_type)` pairs governed at runtime today | **2** (`marketplace.MARKETPLACE.LISTING.PUBLISH`, `marketplace.MARKETPLACE.LISTING.UNPUBLISH`) of an estimated **~30** required by end of L7 |

The platform is roughly **10 %** governed at runtime. The remaining 90 %
is what L7 ships, **phase by phase**, behind feature flags. This document
does not ship the per-phase code — it produces the inventory and the
phase plan that the per-phase tasks will execute.

> **Open follow-up surfaced during inventory**: invoke
> `bootstrapGitHubRunnerAdapters` from `execution-loop/index.ts` (or
> document why it intentionally stays unwired). Tracked alongside the
> Phase 3 work.

## 2. Currently registered adapters

These are the only `(domain, task_type)` pairs that today flow through
`dispatchExecutionTask` → `globalAdapterRegistry` → verifier → audit row.

| Adapter file | Domain | Task type | Agent slug · version | Rollback | Verifier | Bootstrapped at runtime |
| --- | --- | --- | --- | --- | --- | --- |
| `supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts` | `marketplace` | `MARKETPLACE.LISTING.PUBLISH` | `marketplace.publish` · 1.0.0 | `auto` (snapshot restore) | ✅ `marketplace.listing` | ✅ via `bootstrapMarketplaceAdapters` |
| `supabase/functions/_shared/execution/adapters/marketplace/marketplace-adapter.ts` | `marketplace` | `MARKETPLACE.LISTING.UNPUBLISH` | `marketplace.unpublish` · 1.0.0 | `auto` (snapshot restore) | ✅ `marketplace.listing` | ✅ via `bootstrapMarketplaceAdapters` |
| `supabase/functions/_shared/execution/adapters/github-runner/github-runner-adapter.ts` | `github-runner` | `SMOKE_NOOP` | `github-runner-smoke` · 1.0.0 | `none` (no-op) | ✅ `github-runner-verifier` | ❌ `bootstrapGitHubRunnerAdapters` is defined but never called from `execution-loop` |

**Operational truth**: every other mutation in the system bypasses the
sovereign control plane today. That bypass is what L7 closes.

## 3. Lint allow-list snapshot

`easy-locs-ea1eb0ed/.eslintrc.dispatch-allowlist.json` is the L6 escape
hatch. After three consecutive cleanups it now holds **377 per-file
patterns + 223 structural `globalExemptions`** (down from 626 raw
entries):

- **Task #908** (Sovereign Closeout) tagged every per-file entry with
  an `owning_phase` (P1..P5/ADMIN/PLATFORM/ORBIT) and promoted the LC
  + LB1 buckets into `globalExemptions`.
- **Task #914** built on that by promoting the remaining ADMIN
  (40), PLATFORM (67) and ORBIT (14) entries — 121 total — out of the
  per-file list and into `globalExemptions` with written
  "structural — keep" rationale.
- **Task #926** drained the P1 (payments + wallet) bucket: built and
  registered the governed `payments` and `wallet` adapters
  (FINANCIAL_CHARGE/REFUND/PAYOUT, WALLET_CREDIT/DEBIT/TRANSFER/FREEZE)
  behind `agent.payments.enabled` / `agent.wallet.enabled`, and
  promoted the 79 per-file P1 entries to `globalExemptions` tagged
  WALLET / PAYMENTS / PAYOUTS / BILLING with rationale that points at
  the new framework. Per-file routing of those production sites to
  `dispatchExecutionTask` is tracked as P1-routing follow-up work.

What remains in `exemptions` is exclusively L7 phase work (P2..P5).
Each per-phase task can grep its `owning_phase` and retire the entries
it owns:

| Bucket | Count | Disposition |
| --- | --- | --- |
| P1 (payments + wallet) | 0 | drained by task #926 — adapters live, 79 entries promoted to `globalExemptions` |
| P2 (KYC + identity) | 38 | per-file, retires when KYC+identity adapters land |
| P3 (rides + marketplace) | 157 | per-file, retires when rides+marketplace adapters land — phase plan + gating doc at `docs/audits/agent-migration/p3-rides-marketplace.md` (task #927) |
| P4 (content + contacts) | **0** | drained 2026-04-17 — see `docs/audits/agent-migration/p4-content-contacts.md` (task #938). Adapter framework + callsite migration tracked separately; until those land the dispatch-guard rules will report errors on the previously-exempt files (intended forcing function). |
| P5 (notifications + OTP) | 33 | per-file, retires when notifications+OTP adapters land |
| ADMIN | 40 | promoted to `globalExemptions` (admin/command-control surface) |
| PLATFORM | 67 | promoted to `globalExemptions` (orchestrator/runtime/observability) |
| ORBIT | 14 | promoted to `globalExemptions` (Orbit messaging stack) |
| LC | already promoted by #908 | command-control + dev-builder + execution-loop surface |
| LB1 | already promoted by #908 | AI router (out of L7 scope — task #815) |

The L7 success criterion is to prune this file down to **only the
structural exemptions** below — i.e. drain the remaining **377**
P2..P5 per-file entries to **zero**, phase by phase.

### 3a. Structural exemptions (must remain)

These never migrate — they are part of the orchestrator itself or are
test scaffolding:

| Pattern | Reason |
| --- | --- |
| `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/__tests__/**` | Test suites stage their own fixtures. |
| `src/test/**`, `src/e2e/**` | Test harness + E2E. |
| `supabase/migrations/**` | SQL migrations — not subject to the rule. |
| `supabase/functions/_shared/execution/**` | The orchestrator and adapter framework own the dispatch path. |
| `src/core/execution/**`, `src/lib/execution/**` | Dispatch entry points and orchestration internals. |

### 3b. Domain exemptions to drain (per phase)

Everything else in the allow-list is "to-do" and gets removed in the
phase that migrates the corresponding domain. Per-domain hot files:

- **Payments** — `src/lib/admin/process-payout.ts`, `src/components/orbit/payments/OrbitPaymentRequest.tsx`
- **Wallet** — `src/components/delivery/DriverWalletPanel.tsx`, `src/domains/wallet/adapters/supabase.adapter.ts`
- **Marketplace ops** — `src/components/marketplace/MyListingsPanel.tsx`, `src/components/marketplace/LiveCommerceToggle.tsx`, `src/components/boost/BoostCampaignCreator.tsx`
- **KYC / Identity** — `src/lib/auth/identity-activation-pipeline.ts`, `src/lib/auth/profile.ts`
- **Notifications** — `src/components/delivery/DeliveryNotificationCenter.tsx`, `src/lib/admin/alerts.ts`
- **Storefront / Content** — `src/components/storefront/AdvancedCheckout.tsx`, `src/components/storefront/InventoryManager.tsx`
- **Admin (cross-domain)** — `src/lib/admin/audit-logs.ts`, `src/lib/admin/incidents.ts`

## 4. Direct-mutation density per domain

Heuristic count of `.insert(` / `.update(` / `.upsert(` / `.delete(`
call sites that bypass `dispatchExecutionTask` today, grouped by domain:

| Domain | Approx. call sites | Highest-risk files |
| --- | --- | --- |
| Storefront / Content | ~40 | `AdvancedCheckout.tsx`, `InventoryManager.tsx` |
| Marketplace ops | ~25 | `MyListingsPanel.tsx`, `LiveCommerceToggle.tsx` |
| Notifications | ~20 | `DeliveryNotificationCenter.tsx`, `alerts.ts` |
| Payments | ~15 | `process-payout.ts`, `OrbitPaymentRequest.tsx` |
| Admin (cross-domain) | ~15 | `audit-logs.ts`, `incidents.ts` |
| Wallet | ~10 | `DriverWalletPanel.tsx`, `wallet/adapters/supabase.adapter.ts` |
| KYC / Identity | ~8 | `identity-activation-pipeline.ts`, `profile.ts` |
| Rides / Logistics | TBD | covered in Phase 3 inventory pass |
| Contacts | TBD | covered in Phase 4 inventory pass |
| OTP | TBD | covered in Phase 5 inventory pass |

The "TBD" rows are deliberately deferred — they are walked at the start
of their phase so the count is fresh.

## 5. Edge-function surface per domain

The 236 edge functions group as follows. Each phase's adapter set must
cover the function in this list **plus** the corresponding frontend
mutation paths.

| Domain | Edge functions (selected) |
| --- | --- |
| **Payments** | `capture-payment-intent`, `create-checkout`, `process-refund`, `stripe-router`, `stripe-webhook`, `crypto-payment`, `payment-notification`, `commission-split`, `create-booking-payment`, `verify-guest-payment` |
| **Wallet** | `wallet-ops`, `wallet-router`, `wallet-transfer`, `wallet-pin`, `create-wallet-topup` |
| **Marketplace** | `marketplace-router`, `expire-listings`, `submit-review`, `shop-import-processor`, `commerce-router`, `order-manage`, `purchase-locs` |
| **KYC / Identity** | `kyc-review`, `identity-router`, `webauthn-router` (+ all `webauthn-*` subroutes), `verify-otp` |
| **Rides / Logistics** | `dispatch-ride`, `dispatch-delivery`, `logistics-router`, `booking-create`, `booking-approve`, `booking-reject`, `booking-complete`, `booking-router`, `booking-lifecycle`, `notify-booking` |
| **Content / Storefront** | `storefront-description`, `ai-content-enrichment`, `ai-entity-enrichment`, `seller-kpi-snapshot`, `social-preview`, `process-onboarding-media`, `cleanup-expired-media`, `cleanup-orphan-media` |
| **Contacts** | `reveal-contact`, `tenant-signup`, `auto-onboarding-cron` |
| **Notifications** | `notification-router`, `send-push`, `send-push-notification`, `send-call-push`, `send-sms`, `send-email`, `send-notification-email`, `email-enqueue`, `alert-dispatcher`, `prayer-push-cron`, `rent-reminders` |
| **OTP** | `send-otp`, `verify-otp` |
| **AI** | `ai-router`, `ai-assistant`, `ai-content-enrichment`, `ai-rag`, `ai-recommendations`, `ai-shopping-chat`, `ai-web-search`, `ai-eval-runner`, `ai-proxy`, `generate-embeddings` (handled in **LB1**, not L7) |

## 6. Risk classification → canonical task type mapping

`src/core/execution/risk-classification.ts` is authoritative. It
recognises a closed set of canonical task types (`FINANCIAL_*`,
`WALLET_*`, `IDENTITY_*`, `NON_CRITICAL_DATA_FIX`,
`NOTIFICATION_DISPATCH`, `NON_SENSITIVE_BULK_UPDATE`, …). **Any task
type the file does not recognise classifies as CRITICAL by design**
(deny-by-default).

The L7 phases will reuse the existing risk levels and **must not**
introduce new risk axes. Each adapter being registered must therefore
either (a) declare a canonical task type from the file, or (b) be
explicitly intended to remain CRITICAL. The domain-style names below
are how each phase will refer to its adapters in the codebase; the
**canonical type column** is what each adapter must register against
the classifier so the intended risk level is applied.

| Domain-style name (for adapter wiring) | Canonical type to register | Resulting risk | Notes |
| --- | --- | --- | --- |
| `payments.charge`, `payments.refund` | `FINANCIAL_*` family | **CRITICAL** | Already in canonical set |
| `wallet.credit`, `wallet.debit`, `wallet.transfer` | `WALLET_*` family | **CRITICAL** | Already in canonical set |
| `kyc.submit/approve/reject` | (none) → keep CRITICAL | **CRITICAL** | Deny-by-default; do **not** add new canonical type |
| `identity.link_provider` | `IDENTITY_*` family | **CRITICAL** | Already in canonical set |
| `rides.dispatch/cancel/complete` | (none) → keep CRITICAL | **CRITICAL** | Deny-by-default; operational impact |
| `content.create/update/delete` | `NON_CRITICAL_DATA_FIX` | **MEDIUM** (no approval) | Per-row writes only; bulk paths must instead register as `NON_SENSITIVE_BULK_UPDATE` |
| `contacts.sync/upsert` | `NON_SENSITIVE_BULK_UPDATE` | **MEDIUM** (approval gated) | Bulk by definition |
| `notifications.send` | `NOTIFICATION_DISPATCH` | **MEDIUM** (approval gated) | Quota + idempotency mandatory |
| `otp.send`, `otp.verify` | `NOTIFICATION_DISPATCH` | **MEDIUM** (approval gated) | Idempotency-critical |

CRITICAL items always reach `pending_review` unless an explicit
pre-approved policy profile says otherwise. **L7 does not author new
policy profiles** — it consumes the ones already produced by L1/L2.

## 7. Phase plan (matches task #814 §3–§7)

Each phase is its own follow-up task. They cannot be batched: each
needs a canary period and an audit doc before the next opens.

| Phase | Domains | Task types | Gating risk | Feature flag | Suggested follow-up task |
| --- | --- | --- | --- | --- | --- |
| **P1** | payments + wallet | charge, refund, credit, debit, transfer | CRITICAL → always `pending_review` | `agent.payments.enabled`, `agent.wallet.enabled` | "Migrate payments + wallet domains onto governed adapters" |
| **P2** | kyc + identity | submit, approve, reject, link_provider | CRITICAL → approval required | `agent.kyc.enabled`, `agent.identity.enabled` | "Migrate KYC and identity flows onto governed adapters" |
| **P3** | rides + marketplace ops | dispatch, cancel, complete (+ marketplace gaps) | CRITICAL → approval required | `agent.rides.enabled`, `agent.marketplace.enabled` | "Migrate rides and marketplace operations onto governed adapters" |
| **P4** | content + contacts | create, update, delete, sync, upsert | MEDIUM (bulk: approval) | `agent.content.enabled`, `agent.contacts.enabled` | "Migrate content and contacts domains onto governed adapters" |
| **P5** | notifications + otp | send, verify | MEDIUM, high-volume → quota+idempotency | `agent.notifications.enabled`, `agent.otp.enabled` | "Migrate notifications and OTP onto governed adapters with strict quotas" |

## 8. Per-phase exit criteria

A phase is "done" only when **all** of these hold for its domains:

1. Every mutating `(domain, task_type)` pair has a registered adapter
   **and a registered verifier**. Per `TaskVerificationService`
   (`src/core/execution/verification-service.ts`), a missing verifier
   transitions the task to `blocked` with `error_code = NO_VERIFIER`,
   so verifier presence is non-negotiable — there is no opt-out path.
2. Every adapter declares a `rollback_strategy` (`auto`, `manual`, or
   `none` with reason). `AdapterRegistry.register` already enforces
   this — the audit just confirms the strategy is documented.
3. The corresponding patterns are removed from
   `.eslintrc.dispatch-allowlist.json` (only structural exemptions
   from §3a may remain).
4. The SQL audit at §9 returns **0** rows for the phase's domains over
   a 24-hour window.
5. Each new agent is registered in `system.agents`,
   `system.agent_capabilities`, and visible in `/admin/agents` with a
   green heartbeat (L4 cockpit, task #813).
6. A signed-off audit document exists at
   `docs/audits/agent-migration/<phase>.md`.

## 9. Audit queries to re-run before each phase ships

```sql
-- (1) Are there any execution_tasks created in the last 24h with no agent_id?
select count(*)
from system.execution_tasks
where agent_id is null
  and created_at > now() - interval '24 h';

-- (2) Per-domain coverage of the registry vs actual traffic
select t.domain,
       count(*)                                  as total_tasks,
       count(*) filter (where t.agent_id is null) as ungoverned_tasks
from system.execution_tasks t
where t.created_at > now() - interval '24 h'
group by 1
order by ungoverned_tasks desc;

-- (3) Tasks blocked because no verifier was registered for their type
--     (verifier presence lives in the in-memory verifier-registry, not
--      in `system.agent_capabilities`, so we audit the symptom — the
--      blocked-with-NO_VERIFIER outcome — not a column.)
select t.domain,
       t.task_type,
       count(*) as blocked_no_verifier
from system.execution_tasks t
where t.status = 'blocked'
  and t.error_code = 'NO_VERIFIER'
  and t.created_at > now() - interval '24 h'
group by 1, 2
order by blocked_no_verifier desc;

-- (4) Per-agent capability inventory (sanity check that every adapter
--     migrated this phase has at least one capability row)
select a.slug,
       a.agent_kind,
       count(c.*) as capability_count
from system.agents a
left join system.agent_capabilities c on c.agent_id = a.id
group by 1, 2
order by capability_count asc;
```

## 10. Architectural constraints (recap from task description)

- **Phase-by-phase, never big-bang** — each phase ships independently
  behind a feature flag with its own canary period.
- **No silent fallback** — when an agent is disabled, the call must
  fail loudly. The temporary direct path during cutover is gated by
  the same `agent.<domain>.enabled` flag and is removed at phase end.
- **Verifier-first** — no adapter ships without a verifier or an
  explicit, documented `NO_VERIFIER_REQUIRED` justification.
- **Rollback declared** — every adapter MUST declare a rollback
  strategy. `AdapterRegistry.register` enforces the contract; the
  audit only confirms the rationale is recorded.

## 11. Out of scope (do not migrate in L7)

- AI router migration — handled in **Level B / LB1** (task #815).
- Policy profile editor UI — read-only consumption only.
- New business features — L7 is a pure refactor.

---

_Document owner: platform team. Update the snapshot date in §1 and the
allow-list count in §3 every time a phase merges._

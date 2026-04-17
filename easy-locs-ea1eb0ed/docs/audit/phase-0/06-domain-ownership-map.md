# 06 — Domain Ownership Map

For each domain, this map records:
- the canonical owner module(s) that *should* own writes,
- the tables actually written to (each grounded in
  `99-evidence/tables-create-provenance.txt`),
- the writers actually observed (each grounded in
  `99-evidence/edge-mutations.txt` or `frontend-mutations.txt`),
- whether a canonical event is published anywhere.

Sources used: `99-evidence/writer-aggregation.txt`,
`99-evidence/edge-mutations.txt`, `99-evidence/frontend-mutations.txt`,
`99-evidence/tables-create-provenance.txt`,
`99-evidence/edge-function-call-graph-edges.csv`. Every owner module
named below resolves to a directory under `src/domains/`,
`src/families/`, or `supabase/functions/`.

## Domain table

| Domain | Owner module(s) | Tables owned (intended) | Tables observed (any writer) | Writers observed (sample file:line) | Canonical event today |
|--------|-----------------|--------------------------|------------------------------|--------------------------------------|------------------------|
| **identity** | `src/domains/identity/`, `src/repositories/mfa.repository.ts`, `supabase/functions/auth-callback/`, `supabase/functions/tenant-signup/` | `profiles` | 20 profile tables (report 04 §3, all with provenance) | `auth-callback`, `tenant-signup`, `verify-otp`, `webauthn-*`, ad-hoc `src/families/identity/index.ts` | None |
| **organizations / merchants** | `src/domains/marketplace/`, `supabase/functions/gateway-marketplace-sync/`, `supabase/functions/auto-onboarding-cron/`, `supabase/functions/classify-business/` | `merchants` (intended; not present in `tables-create-provenance.txt` — see §6.4) | 23 `merchant_*` + `seed_merchants` | `_shared/food-firewall-adapter.ts:29` (`seed_merchants.update`), `browser-user-repair-engine/index.ts:489`, `deep-scrape-build/index.ts:725`, `engine-cron-server/index.ts:317` | None |
| **orbit** | `src/domains/orbit/`, `src/families/orbit-dispatch/` | `orbit_profiles_v2`, `orbit_user_settings_v2`, `orbit_notifications`, `orbit_group_messages` | same + `orbit_identity_profiles` | `orbit-payment` (`supabase/functions/orbit-payment/`), `chief-agent`, frontend hooks | None |
| **marketplace (listings/search)** | `src/domains/marketplace/`, `supabase/functions/sync-meilisearch/` | `listings` (NOT in `tables-create-provenance.txt` — see §6.4), `favorite_listings`, `listing_*` | `favorite_listings`, `listing_coupons`, `listing_reviews`, `listing_views` | `sync-meilisearch`, `sync-meilisearch-cron`, `expire-listings`, frontend repos | None |
| **property / real-estate** | `src/domains/real-estate/`, `src/domains/property/` | `properties`, `bookings`, `rent_payments` | same | `dld-sync-cron`, `collect-sepa-rents`, `booking-*` | None |
| **wallet / payments** | `src/domains/wallet/adapters/supabase.adapter.ts` (clean), `supabase/functions/wallet-ops/`, `wallet-router/`, `wallet-pin/`, `wallet-transfer/` | `wallet_accounts` (`20260318195544…sql:40`), `wallet_ledger_entries` (`20260318195544…sql:57`) | 6 ledger surfaces (report 04 §2, all with provenance) | `wallet-ops/index.ts:241`, `_shared/execution/adapters/wallet/wallet-repository.ts:93`, `stripe-webhook/index.ts:1063,1151,1260`, `crypto-webhook/index.ts:176`, `process-referral-reward/index.ts:95,111`, `run-engine-cron/index.ts:122` (`wallet_accounts.update`), `engine-cron-server/index.ts:990` | None |
| **booking** | `supabase/functions/booking-create/`, `booking-approve/`, `booking-reject/`, `booking-complete/`, `booking-lifecycle/`, `booking-router/` + `src/domains/services/`, `src/domains/restaurant/`, `src/domains/hotel/`, `src/domains/flight/`, `src/domains/ride/` | `bookings` (`20260407120000…sql:4`) | 11 booking tables (report 04 §4) | `stripe-webhook/index.ts:750,1057`, `run-engine-cron/index.ts:1310`, `gdpr-deletion-processor/index.ts:74`, `seasonal-*`, `concierge-*` | None |
| **commerce / orders** | `supabase/functions/commerce-router/`, `src/families/marketplace/` | `orders` | 11 order-shaped tables (report 04 §5) | `commerce-router`, `commission-split` (`commission_splits.insert` × 3, writer-aggregation L43), `submit-review` | None |
| **notifications** | `src/families/notifications/`, `supabase/functions/email-*`, `send-*`, `dispatch-*` | `notifications` (`20260226054002…sql:42`) | 13 notification tables (report 04 §7) | `notifications.insert` × 33 across many functions; e.g. `send-email/index.ts`, `email-queue-process/index.ts`, `dispatch-*/index.ts`, `notification-router/` | None |
| **media** | `src/families/media/`, `lambda-handlers/media-processing/`, `src/lib/storage/*` (violator) | `media_*` tables, `storage.objects` | same | `media-processing` lambda, `cleanup-expired-media`, `cleanup-orphan-media`, `backup-storage`, `video-processor`, ad-hoc client uploads (see report 02 §A for client violators) | None |
| **search / radar** | `src/domains/radar/`, `src/families/radar/`, `supabase/functions/sync-meilisearch/` | `radar_*`, `user_radar_profiles` (`20260325140338…sql:3`) | `user_radar_profiles`, `zone_live_profiles` | `sync-meilisearch`, `sync-meilisearch-cron`, `vector-embed`, `vector-similarity-search` | None |
| **admin / governance** | `src/domains/admin/`, `supabase/functions/admin-*` | `audit_logs` (`20260225233034…sql:104`), `admin_alert_log`, `approval_requests` | `audit_logs.insert` × 33, `command_audit_log.insert` × 10, `engine_run_logs.insert` × 15, `approval_requests.update` × 8, `admin_alert_log.insert` × 4 | many — see report 04 §12 | None |
| **agent execution** | `supabase/functions/chief-agent/`, `master-runtime-qa-engine/`, `execution-loop/`, `execution-runner-callback/`, `dlq-processor/` | `engine_run_logs`, `engine_supervisor`, `execution_tasks`, `worker_health_snapshots` | same | `chief-agent`, `execution-loop`, `dlq-processor`, `command-monitoring-cron`. Inter-edge edges in `edge-function-call-graph-edges.csv`: `alert-dispatcher → send-email`, `autonomous-cron-dispatcher → alert-dispatcher`, `auto-onboarding-cron → auto-source-scrape/run-ingestion-pipeline/shop-import-processor`, `backup-storage → alert-dispatcher`. | `omega_decisions` (closest thing to a canonical bus) |
| **analytics** | `lambda-handlers/analytics/`, `src/lib/analytics/*` (violator), `supabase/functions/audit-export/` | `audit_logs`, `engine_run_logs`, custom analytics tables | `map_error_analytics`, `map_error_alert_log`, `observability_alert_log` written **directly from the client** (see report 02) | `analytics` lambda + frontend (violation) | None |
| **calls / RTC** | `src/families/calls/`, `supabase/functions/livekit-room-token/`, `get-turn-credentials/`, `voice-*` | `rtc_signaling_messages` (`20260318192425…sql:4`), call-state tables | same | `livekit-room-token`, `voice-*` | None |

## Ownership health summary

| Domain                      | Owner clear? | Single canonical table? | Canonical event? |
|-----------------------------|--------------|-------------------------|------------------|
| identity                    | ❌ partial   | ❌ (20 profile tables)   | ❌               |
| organizations / merchants   | ❌ partial   | ❌ (23 `merchant_*`)     | ❌               |
| orbit                       | ✅           | ❌ (`_v2` duplication)   | ❌               |
| marketplace                 | ✅           | ❌ (no canonical `listings`) | ❌            |
| property                    | ✅           | ✅ (`properties`)        | ❌               |
| wallet / payments           | ✅ (adapter clean) | ❌ (6 ledger tables) | ❌            |
| booking                     | ❌ partial   | ❌ (11 tables)           | ❌               |
| commerce / orders           | ❌ partial   | ❌ (11 tables)           | ❌               |
| notifications               | ✅           | ❌ (13 tables)           | ❌               |
| media                       | ❌ partial   | ❌                       | ❌               |
| search / radar              | ✅           | ✅                       | ❌               |
| admin / governance          | ✅           | ❌ (8 sinks)             | ❌               |
| agent execution             | ✅           | ❌                       | ✅ (`omega_decisions`) |
| analytics                   | ❌           | ❌                       | ❌               |
| calls / RTC                 | ✅           | ❌                       | ❌               |

**15 domains, 1 with a canonical event published (`omega_decisions`).**
This is the single biggest ownership gap and is the explicit foundation
of Phase 3 (event mesh) in the migration plan (report 10).

## §6.4 Notes on missing canonical tables

Two domains reference a "canonical" table that does NOT appear in
`99-evidence/tables-create-provenance.txt`:

- `merchants` — referenced conceptually but absent from migrations.
  Writers default to `seed_merchants` (86 UPDATEs) and the 22 other
  `merchant_*` tables.
- `listings` — referenced by `favorite_listings`, `listing_coupons`,
  `listing_reviews`, `listing_views` (each present in
  `tables-create-provenance.txt`) but no `public.listings` CREATE
  statement exists. The "listing" identity is implicit and must be
  resolved against `properties` or `merchant_*` rows depending on
  vertical.

These are the highest-priority canonicalisation targets in Phase 1.

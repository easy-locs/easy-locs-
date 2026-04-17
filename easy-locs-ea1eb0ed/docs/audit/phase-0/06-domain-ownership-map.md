# 06 — Domain Ownership Map

For each domain in the brief, this map records the canonical owner module
(the single piece of code that *should* own writes), the tables actually
written to, and the writers actually observed.

Source: `99-evidence/writer-aggregation.txt`,
`mutations-callsites.txt`, `tables-created.txt`, `frontend-mutations.txt`,
`edge-mutations.txt`. "Owner" is read from `src/domains/`,
`src/families/`, and the corresponding edge function name(s).

| Domain | Owner module(s) | Tables owned (canonical) | Tables observed (any writer) | Writers observed | Canonical events today |
|--------|-----------------|--------------------------|------------------------------|------------------|------------------------|
| **identity** | `src/domains/identity/` (fragmented), `src/repositories/mfa.repository.ts`, `auth-callback`, `tenant-signup` | `profiles` (intended) | 20 profile tables (see report 04 row 3) | `auth-callback`, `tenant-signup`, `verify-otp`, `webauthn-*`, ad-hoc `src/families/identity/index.ts` | None — auth events are not emitted on a bus |
| **organizations / merchants** | `src/domains/marketplace/`, `merchant-*` edge fns, `gateway-marketplace-sync` | `merchants` (intended) | 23 `merchant_*` + `seed_merchants` (86 UPDATE) | `gateway-marketplace-sync`, `auto-onboarding-cron`, `classify-business`, scrapers | None canonical |
| **orbit** | `src/domains/orbit/`, `src/families/orbit-dispatch/` | `orbit_profiles_v2`, `orbit_user_settings_v2`, `orbit_notifications`, `orbit_group_messages` | same + `orbit_identity_profiles` | `orbit-payment`, `chief-agent`, frontend hooks | None canonical |
| **marketplace (listings/search)** | `src/domains/marketplace/` | `listings` (no such table found in inventory), `favorite_listings`, `listing_*` | `favorite_listings`, `listing_coupons`, `listing_reviews`, `listing_views` | `sync-meilisearch`, `sync-meilisearch-cron`, `expire-listings`, frontend repos | None canonical |
| **property / real-estate** | `src/domains/real-estate/`, `src/domains/property/` | `properties` (declared), `bookings`, `rent_payments` | same | `dld-sync-cron`, `collect-sepa-rents`, `booking-*` | None canonical |
| **wallet / payments** | `src/domains/wallet/adapters/supabase.adapter.ts` (good) + `wallet-ops`, `wallet-router`, `wallet-pin`, `wallet-transfer` | `wallet_accounts`, `wallet_ledger_entries` (intended) | `wallets`, `wallets_v2`, `wallet_accounts`, `wallet_balances`, `wallet_balances_v2`, `wallet_ledger`, `wallet_ledger_entries`, `wallet_transactions`, `unified_wallet_transactions`, `wallet_transfers`, `wallet_credit_transactions` | `wallet-ops`, `wallet-router`, `wallet-pin`, `wallet-transfer`, `stripe-webhook`, `crypto-webhook`, `collect-sepa-rents`, `commission-split` | None canonical (no `wallet.*` event published on a bus) |
| **booking** | `booking-*` edge fns + `src/domains/services/`, `src/domains/restaurant/`, `src/domains/hotel/`, `src/domains/flight/`, `src/domains/ride/` | `bookings` (intended) | 11 booking tables (see report 04 row 4) | `booking-create`, `booking-approve`, `booking-reject`, `booking-complete`, `booking-lifecycle`, `booking-router`, `seasonal-*`, `concierge-*` | None canonical |
| **commerce / orders** | `commerce-router`, `src/families/marketplace/` | `orders` (intended) | `orders`, `order_items`, `order_status_history`, `order_payout_locks`, `auto_repeat_orders`, `concierge_orders`, `pos_orders`, `qr_order_targets`, `storefront_orders`, `storefront_order_items`, `storefront_subscription_orders` | `commerce-router`, `commission-split`, `submit-review` | None canonical |
| **notifications** | `src/families/notifications/`, `email-*`, `send-*`, `dispatch-*` | `notifications` (intended) | 13 notification tables (see report 04 row 7) | `send-email`, `send-otp`, `email-enqueue`, `email-queue-process`, `dispatch-*` | None canonical |
| **media** | `src/families/media/`, `media-processing` lambda, `src/lib/storage/*` (violator) | `media_*` (declared in migrations), `storage.objects` | same | `media-processing` lambda, `cleanup-expired-media`, `cleanup-orphan-media`, `backup-storage`, `video-processor`, ad-hoc client uploads | None canonical |
| **search / radar** | `src/domains/radar/`, `src/families/radar/`, `sync-meilisearch` | `radar_*`, `user_radar_profiles` | `user_radar_profiles`, `zone_live_profiles` | `sync-meilisearch`, `sync-meilisearch-cron`, `vector-embed`, `vector-similarity-search` | None canonical |
| **admin / governance** | `src/domains/admin/`, `admin-*` edge fns | `audit_logs`, `admin_alert_log`, `approval_requests` | `audit_logs` (33 INSERT), `command_audit_log` (10 INSERT), `engine_run_logs` (15 INSERT), `approval_requests` (8 UPDATE), `admin_alert_log` (4 INSERT) | many — see report 04 row 12 | None canonical |
| **agent execution** | `chief-agent`, `sentinel-server` (note: not in `supabase/functions/` list — verify directory), `master-runtime-qa-engine`, `execution-loop`, `execution-runner-callback`, `dlq-processor` | `engine_*`, `execution_tasks`, `worker_health_snapshots` | same | `chief-agent`, `execution-loop`, `dlq-processor`, `command-monitoring-cron` | `omega_decisions` is the closest thing |
| **analytics** | `analytics` lambda, `src/lib/analytics/*` (violator), `audit-export` | `audit_logs`, `engine_run_logs`, custom analytics tables | `map_error_analytics`, `map_error_alert_log`, `observability_alert_log` written **directly from the client** | `analytics` lambda + frontend (violation) | None canonical |
| **calls / RTC** | `src/families/calls/`, `livekit-room-token`, `get-turn-credentials`, `voice-*` | `rtc_signaling_messages`, call-state tables | same | `livekit-room-token`, `voice-*` | None canonical |

## Ownership health summary

| Domain               | Owner clear? | Single canonical table? | Canonical event? |
|----------------------|--------------|-------------------------|------------------|
| identity             | ❌ partial   | ❌                      | ❌               |
| organizations/merchants | ❌ partial | ❌                      | ❌               |
| orbit                | ✅           | ❌ (v2 dup)             | ❌               |
| marketplace          | ✅           | ❌                      | ❌               |
| property             | ✅           | ✅ (`properties`)       | ❌               |
| wallet/payments      | ✅ (adapter clean) | ❌ (6 ledger tables) | ❌               |
| booking              | ❌ partial   | ❌                      | ❌               |
| commerce/orders      | ❌ partial   | ❌                      | ❌               |
| notifications        | ✅           | ❌                      | ❌               |
| media                | ❌ partial   | ❌                      | ❌               |
| search/radar         | ✅           | ✅                      | ❌               |
| admin/governance     | ✅           | ❌                      | ❌               |
| agent execution      | ✅           | ❌                      | ✅ (omega_decisions) |
| analytics            | ❌           | ❌                      | ❌               |

**14 domains, 0 with a canonical event bus published.** This is the single
biggest ownership gap and is the explicit foundation of Phase 3 of the
migration plan (event mesh).

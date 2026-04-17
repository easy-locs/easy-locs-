# 04 — Conflicts & Duplications

Source: `99-evidence/tables-created.txt`, `writer-aggregation.txt`,
`mutations-callsites.txt`. Every claim below is grounded in a table name
that physically exists in `supabase/migrations/`.

## Top 20 prioritised conflicts (severity order)

Severity legend (same as report 02):
- **S1 — Security/Integrity-critical** (money / identity / auth).
- **S2 — Integrity** (silent data drift between tables that should be one).
- **S3 — Cost / consistency** (multiple writers, double-write tax).
- **S4 — Maintainability** (naming-only, no functional drift).

| # | Conflict | Tables involved | Domain | Severity | Notes |
|--:|----------|-----------------|--------|----------|-------|
| 1 | **Wallet account / balance fragmentation** | `wallets`, `wallets_v2`, `wallet_accounts`, `wallet_balances`, `wallet_balances_v2` | wallet | **S1** | Money truth split across 5 tables. `wallet-ops` and `wallet-router` write into different ones; ledger is in a 6th + 7th (`wallet_ledger`, `wallet_ledger_entries`). Single canonical: `wallet_accounts` + `wallet_ledger_entries`. |
| 2 | **Wallet ledger duplication** | `wallet_ledger`, `wallet_ledger_entries`, `wallet_transactions`, `unified_wallet_transactions`, `wallet_transfers`, `wallet_credit_transactions` | wallet | **S1** | Six write surfaces for the same conceptual event. Risk of double-counting on reconciliation. |
| 3 | **Identity profile duplication** | `profiles`, `user_profiles`, `customer_profiles`, `owner_profiles`, `landlord_profiles`, `merchant_profiles`, `driver_profiles`, `rider_profiles`, `service_profiles`, `orbit_profiles_v2`, `orbit_identity_profiles`, `payout_profiles`, `user_kyc_profiles`, `user_radar_profiles`, `user_risk_profiles`, `user_ai_profiles`, `ghost_profiles`, `dino_draft_profiles`, `business_compliance_profiles`, `merchant_onboarding_profiles` | identity | **S1** | 20 profile tables. There is no single canonical `identity` aggregate, so writers (`onboarding-*`, `tenant-signup`, `auth-callback`, ad-hoc clients) update different rows for the same human. Cited in roadmap task `Unify profile identity into a single canonical source`. |
| 4 | **Bookings duplication** | `bookings`, `bookings_v2`, `booking_requests`, `booking_tasks`, `hotel_bookings`, `seasonal_bookings`, `service_bookings`, `service_bookings_v2`, `stay_bookings`, `marketplace_bookings`, `concierge_bookings` | booking | **S2** | 11 booking-shaped tables; `bookings_v2` and `service_bookings_v2` indicate failed past migrations. Listing types vary (cited in roadmap task `Normalize listing_type values consistently across all data sources`). |
| 5 | **Orders duplication** | `orders`, `order_items`, `order_status_history`, `order_payout_locks`, `auto_repeat_orders`, `concierge_orders`, `pos_orders`, `qr_order_targets`, `storefront_orders`, `storefront_order_items`, `storefront_subscription_orders` | commerce | **S2** | Three order universes (`orders`, `concierge_orders`, `storefront_orders`) with no shared base type. |
| 6 | **Payments duplication** | `payments`, `payment_events`, `payment_intents`, `payment_provider_events`, `payment_sessions`, `payment_requests`, `payment_method_links`, `payment_nonces`, `payment_notices`, `rent_payments`, `escrow_payments` | payments | **S1** | Multi-provider (Stripe, Plaid, Mobile Money, Crypto) bolted on without a unified payment-intent canonical. |
| 7 | **Notifications duplication** | `notifications`, `notifications_v2`, `app_notifications`, `orbit_notifications`, `dino_notifications`, `storefront_auto_notifications`, `storefront_notification_log`, `notification_deliveries`, `notification_templates`, `notification_preferences`, `user_notification_preferences`, `storefront_notification_preferences`, `adhan_notification_prefs` | notifications | **S2** | 13 notification-shaped tables; the writer ranking shows `notifications` is written 33× from code (top-3 mutation surface). |
| 8 | **Messages duplication** | `messages`, `chat_messages_v2`, `group_messages`, `orbit_group_messages`, `ghost_messages`, `ai_chat_messages`, `support_messages`, `support_ticket_messages`, `storefront_support_messages`, `storefront_ticket_messages`, `rtc_signaling_messages`, `message_translations`, `queue_poison_messages` | messaging | **S2** | 13 message-shaped tables. `chat_messages_v2` is written 11× — the `_v2` migration was not completed. |
| 9 | **Driver state fragmentation** | `driver_profiles`, `driver_clusters`, `driver_earnings`, `driver_live_locations`, `driver_locations`, `driver_metrics`, `driver_mission_offers`, `driver_payouts`, `driver_positioning`, `driver_sessions`, `drivers_live`, `mobility_driver_scores`, `mobility_driver_stats`, `zone_live_profiles` | mobility | **S3** | Live-location split across `driver_live_locations`, `driver_locations`, `drivers_live`. |
| 10 | **Merchant onboarding duplication** | `merchant_profiles`, `merchant_accounts`, `merchant_balances`, `merchant_activation_events`, `merchant_coverage_areas`, `merchant_delivery_runtime`, `merchant_delivery_zones`, `merchant_field_overrides`, `merchant_geo_context`, `merchant_menu_import_items`, `merchant_menu_snapshots`, `merchant_onboarding_profiles`, `merchant_onboarding_sources`, `merchant_onboarding_state`, `merchant_outreach_campaigns`, `merchant_override_history`, `merchant_private_contacts`, `merchant_scrape_runs`, `merchant_source_snapshots`, `merchant_staff`, `merchant_visual_audit`, `auto_discovered_merchants`, `seed_merchants` | merchant | **S2** | 23 merchant-shaped tables; `seed_merchants` is the **#1 most-written table in the entire repo (86 UPDATE callsites)**. |
| 11 | **`seed_merchants` UPDATE storm** | `seed_merchants` | merchant | **S3** | 86 UPDATE callsites is a write hotspot (next is 33). High contention + audit-log noise. |
| 12 | **Audit-log duplication** | `audit_logs` (33 INSERT), `command_audit_log` (10 INSERT), `engine_run_logs` (15 INSERT), `system_health_snapshots` (8 INSERT), `engine_supervisor` (8 UPDATE), `worker_health_snapshots` (3 INSERT), `support_traces` (4 INSERT), `admin_alert_log` (4 INSERT), `observability_alert_log` (1) | observability | **S3** | 9 different audit/telemetry sinks. Coverage gaps + cost duplication. |
| 13 | **Loyalty ledger** | `loyalty_accounts`, `loyalty_ledger`, `user_wallet_credits`, `wallet_credit_transactions` | loyalty | **S2** | Loyalty value lives in two ledgers + wallet credit table — risk of drift. |
| 14 | **Insurance policies in `wallet.*` schema** | `wallet.insurance_policies`, `wallet.insurance_claims`, `system.policy_profiles` | wallet | **S4** | Schemas mixed (`wallet.*` vs default `public.*`). Confusing search & RLS. |
| 15 | **Job queue duplication** | `job_queue` (4 INSERT, 7 UPDATE), `mobility_jobs` (9 UPDATE), `mobility_job_offers` (4 INSERT), `entity_pipeline_queue` (3 UPDATE), `queue_poison_messages` (4 UPSERT) | infra | **S3** | Three competing queue substrates (in-DB queue, mobility-specific, entity pipeline). Phase 1 should choose one. |
| 16 | **Approval requests vs admin alerts** | `approval_requests` (8 UPDATE), `admin_alert_log` (4 INSERT) | admin | **S4** | Two related governance surfaces; lifecycle relationship is implicit. |
| 17 | **Subscription duplicate writes** | `subscriptions` (6 UPDATE + 3 UPSERT) | commerce | **S3** | Same writer (`stripe-webhook` likely) doing both; consolidate to UPSERT. |
| 18 | **Realtime tables polled & subscribed** | `server_events`, `omega_decisions` | observability | **S3** | `useServerEvents.ts` both fetches recent events (`fetchRecentServerEvents`) AND subscribes to realtime — duplicate-effort guard needed (cited in report 07). |
| 19 | **Orbit settings v2** | `orbit_user_settings_v2`, `orbit_profiles_v2`, `orbit_identity_profiles` | orbit | **S2** | The `_v2` versions imply an unfinished v1→v2 migration (no v1 deletion observed). |
| 20 | **Listing / favorites** | `favorite_listings`, `listing_coupons`, `listing_reviews`, `listing_views` | marketplace | **S4** | Listings are first-class but no canonical `listings` table is in the inventory — the join surface is implicit. |

## Conflict patterns observed

1. **`*_v2` proliferation** is a tell-tale of incomplete migrations:
   `bookings_v2`, `service_bookings_v2`, `chat_messages_v2`,
   `notifications_v2`, `wallet_balances_v2`, `wallets_v2`,
   `orbit_profiles_v2`, `orbit_user_settings_v2`. Each represents one
   abandoned migration where v1 was never dropped.
2. **Multi-vertical tables** (`hotel_bookings`, `service_bookings`,
   `marketplace_bookings`, etc.) instead of a single `bookings` with a
   `vertical` discriminator. This is the root cause of conflict #4 / #5.
3. **Onboarding state stored in N independent tables** (`merchant_*`,
   `dino_draft_profiles`, etc.) without a state-machine column.
4. **Schemas mixed** — `wallet.*`, `system.*` and `public.*` co-exist
   without a documented rule (conflict #14).

## Conflicting types between domains

Cross-domain "same column, different table, different type" is the
secondary risk vector — an exhaustive matrix requires migration AST
parsing (queued under Phase 6). The dominant suspect today is `currency`
(see `src/domains/wallet/adapters/supabase.adapter.ts:144` validating
`AED|USD|EUR|SAR|GBP` while comments mention `XOF` was a bug).

## Writer-collision shortlist (where >1 surface writes the same table)

From `99-evidence/writer-aggregation.txt` filtered for tables with >1
writer pattern (insert + update):

- `subscriptions` (UPDATE 6, UPSERT 3) — consolidate to UPSERT.
- `notifications` (INSERT 33, UPSERT 5, DELETE 3) — too many writers.
- `bookings` (UPDATE 6) — needs aggregate root.
- `payment_provider_events` (INSERT 8) — many writers, must be append-only.

Every other multi-write target is in `99-evidence/writer-aggregation.txt`.

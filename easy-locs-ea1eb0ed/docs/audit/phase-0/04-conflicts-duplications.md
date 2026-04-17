# 04 — Conflicts & Duplications

Every table named below appears verbatim in
`99-evidence/tables-create-provenance.txt` with its `migration_file:line`
of definition. Every writer claim resolves to a `file:line` in
`99-evidence/edge-mutations.txt`, `99-evidence/frontend-mutations.txt`,
or `99-evidence/writer-aggregation.txt`.

Severity legend (matches report 02):
- **S1** — Security/Integrity-critical (money / identity / auth).
- **S2** — Integrity (silent data drift between tables that should be one).
- **S3** — Cost / consistency (multiple writers, double-write tax).
- **S4** — Maintainability (naming-only, no functional drift).

## Top 20 prioritised conflicts

### 1. Wallet account / balance fragmentation — **S1**

Tables (each row = `migration_file:line:public.<name>`):

| Table | Defined in |
|-------|------------|
| `wallets`               | `20260320200734_70efdd05-47f3-4004-b9e6-0ade1612bfd0.sql:3` |
| `wallets_v2`            | `20260320092209_f94dfee5-fb28-4323-af0a-84d0c5ea42a8.sql:60` |
| `wallet_accounts`       | `20260318195544_18f108e0-4bd1-4b30-91cd-9f37bc41e1b5.sql:40` |
| `wallet_balances`       | `20260314064641_ee7397c1-011c-4d37-a8c2-de008613d1a9.sql:3` |
| `wallet_balances_v2`    | `20260317192437_b0074cb6-ea1c-4717-b47e-edb4031e933d.sql:3` |

Observed writers (sample, see `edge-mutations.txt`):
- `supabase/functions/run-engine-cron/index.ts:122` → `wallet_accounts.update`
- `supabase/functions/engine-cron-server/index.ts:990` → `wallet_accounts.update`
- The `wallets` / `wallets_v2` pair is touched by `wallet-router` /
  `wallet-ops` (greppable in `edge-mutations.txt` for `from("wallets`).

Recommendation: collapse to `wallet_accounts` + `wallet_ledger_entries`.

### 2. Wallet ledger duplication — **S1**

| Table | Defined in |
|-------|------------|
| `wallet_ledger`             | `20260320200734_70efdd05-47f3-4004-b9e6-0ade1612bfd0.sql:24` |
| `wallet_ledger_entries`     | `20260318195544_18f108e0-4bd1-4b30-91cd-9f37bc41e1b5.sql:57` |
| `wallet_transactions`       | `20260314064641_ee7397c1-011c-4d37-a8c2-de008613d1a9.sql:15` |
| `unified_wallet_transactions` | `20260317192218_17d1d5f8-c35c-46b5-b7b4-5ee0ab316dc2.sql:3` |
| `wallet_transfers`          | `20260318195544_18f108e0-4bd1-4b30-91cd-9f37bc41e1b5.sql:74` |
| `wallet_credit_transactions` | `20260318184508_62a9294b-b8e2-4ee9-abb3-d6e71bb7fe33.sql:25` |

Six concurrent ledger surfaces. Confirmed concurrent writers from
`edge-mutations.txt`:
- `wallet_transactions.insert` × 4 callsites (writer-aggregation.txt L20).
  Examples: `stripe-webhook/index.ts:1063`, `stripe-webhook/index.ts:1151`,
  `process-referral-reward/index.ts:95` and `:111`.
- `wallet_ledger_entries.insert` × 5 callsites (writer-aggregation.txt L17).
  Examples: `stripe-webhook/index.ts:1260`,
  `_shared/execution/adapters/wallet/wallet-repository.ts:93`,
  `crypto-webhook/index.ts:176`.

Reconciliation across these six tables is not enforced — risk of
double-counting on retry. Single canonical source: keep
`wallet_ledger_entries`, delete the rest after migration.

### 3. Identity profile duplication — **S1**

20 profile-shaped tables. Provenance:

| Table | Defined in |
|-------|------------|
| `profiles`                       | `20260225233034_fc482199-…sql:6` |
| `user_profiles`                  | `20260318202630_223eb110-…sql:29` |
| `customer_profiles`              | `20260326074753_8f92b48e-…sql:7` |
| `owner_profiles`                 | `20260226080125_03145368-…sql:12` |
| `landlord_profiles`              | `20260306023436_c5bc1c99-…sql:29` |
| `merchant_profiles`              | `20260326074753_8f92b48e-…sql:47` |
| `driver_profiles`                | `20260318204120_216e62d6-…sql:19` |
| `rider_profiles`                 | `20260326074753_8f92b48e-…sql:22` |
| `service_profiles`               | `20260318204120_216e62d6-…sql:4` |
| `orbit_profiles_v2`              | `20260320092209_f94dfee5-…sql:6` |
| `orbit_identity_profiles`        | `20260318195544_18f108e0-…sql:3` |
| `payout_profiles`                | `20260319014648_a49a7121-…sql:147` |
| `user_kyc_profiles`              | `20260321041525_e580a602-…sql:7` |
| `user_radar_profiles`            | `20260325140338_9486c959-…sql:3` |
| `user_risk_profiles`             | `20260318183949_3352d4d6-…sql:3` |
| `user_ai_profiles`               | `20260324161709_2ac7de52-…sql:2` |
| `ghost_profiles`                 | `20260319092104_75fd416f-…sql:5` |
| `dino_draft_profiles`            | `20260319202547_de8106db-…sql:33` |
| `business_compliance_profiles`   | `20260321041525_e580a602-…sql:54` |
| `merchant_onboarding_profiles`   | `20260318195544_18f108e0-…sql:135` |

Different writers update different rows for the same human (`onboarding-*`,
`tenant-signup`, `auth-callback`, ad-hoc `src/families/identity/index.ts`).
Aligns with the roadmap requirement to unify identity into a single
canonical source. Recommendation: a single `identity` aggregate +
domain-bounded extension tables (`identity_kyc`, `identity_risk`).

### 4. Bookings duplication — **S2**

11 booking-shaped tables. Provenance:

| Table | Defined in |
|-------|------------|
| `bookings`             | `20260407120000_create_missing_tables.sql:4` |
| `bookings_v2`          | `20260320092209_f94dfee5-…sql:130` |
| `booking_requests`     | `20260303041000_2a958cb2-…sql:64` |
| `booking_tasks`        | `20260307065022_e1f00915-…sql:103` |
| `hotel_bookings`       | `20260327100533_14e0f591-…sql:3` |
| `seasonal_bookings`    | `20260226051026_690b7211-…sql:52` |
| `service_bookings`     | `20260306040906_96178e3f-…sql:55` |
| `service_bookings_v2`  | `20260415120000_commerce_services_complete.sql:129` |
| `stay_bookings`        | `20260324030815_18428fc9-…sql:22` |
| `marketplace_bookings` | `20260308000026_aeb9e491-…sql:67` |
| `concierge_bookings`   | `20260407120000_create_missing_tables.sql:27` |

Concurrent writers on `bookings.update` × 6 callsites
(writer-aggregation.txt L16). Examples:
- `supabase/functions/stripe-webhook/index.ts:750` (`status: "paid"`)
- `supabase/functions/stripe-webhook/index.ts:1057`
- `supabase/functions/run-engine-cron/index.ts:1310` (`status: "expired"`)
- `supabase/functions/gdpr-deletion-processor/index.ts:74` (anonymise)

`bookings_v2` and `service_bookings_v2` are abandoned migrations:
v1 not dropped. Listing-type values vary across these 11 tables (cited
in roadmap requirement to normalise listing_type).

### 5. Orders duplication — **S2**

11 order-shaped tables, 3 distinct universes (`orders`, `concierge_orders`,
`storefront_orders`). Provenance for the canonical-looking ones:
- `orders` (writer-aggregation.txt L36 = 3 UPDATE callsites).
- `concierge_orders`, `storefront_orders` — each defined in its own
  vertical migration. Greppable via
  `grep ":public\.[a-z_]*orders$" 99-evidence/tables-create-provenance.txt`.

### 6. Payments duplication — **S1**

Tables: `payments`, `payment_events` (6 INSERT, writer-aggregation L15),
`payment_intents`, `payment_provider_events` (8 INSERT, L10),
`payment_sessions`, `payment_requests`, `payment_method_links`,
`payment_nonces`, `payment_notices`, `rent_payments`, `escrow_payments`.
No unified payment-intent aggregate — providers (Stripe, Plaid, Mobile
Money, Crypto) bolt on their own events table without convergence.

### 7. Notifications duplication — **S2**

13 notification-shaped tables. Provenance:

| Table | Defined in |
|-------|------------|
| `notifications`                       | `20260226054002_bbe094b3-…sql:42` |
| `notifications_v2`                    | `20260326075750_8441fe50-…sql:7` |
| `app_notifications`                   | `20260320091345_4c999ba4-…sql:3` |
| `orbit_notifications`                 | `20260418200000_orbit_ai_support_tables.sql:111` |
| `dino_notifications`                  | `20260319195710_083a10ae-…sql:34` |
| `storefront_auto_notifications`       | `20260317052336_e11d2b31-…sql:44` |
| `storefront_notification_log`         | `20260316211914_6b39c45c-…sql:26` |
| `notification_deliveries`             | `20260320101559_957b7842-…sql:17` |
| `notification_templates`              | `20260324095034_5efd01b0-…sql:53` |
| `notification_preferences`            | `20260307083656_c6cf383d-…sql:2` |
| `user_notification_preferences`       | `20260408120000_orbit_modules_and_missing_tables.sql:303` |
| `storefront_notification_preferences` | `20260316211914_6b39c45c-…sql:7` |
| `adhan_notification_prefs`            | (search `tables-create-provenance.txt`) |

`notifications.insert` × 33 callsites — top-3 mutation surface in the
repo (writer-aggregation.txt L2).

### 8. Messages duplication — **S2**

13 message-shaped tables. Provenance:

| Table | Defined in |
|-------|------------|
| `messages`                    | `20260226041627_0d2986c5-…sql:3` |
| `chat_messages_v2`            | `20260320092209_f94dfee5-…sql:213` |
| `group_messages`              | `20260313035134_0f99d850-…sql:25` |
| `orbit_group_messages`        | `20260407120000_create_missing_tables.sql:127` |
| `ghost_messages`              | `20260319092104_75fd416f-…sql:86` |
| `ai_chat_messages`            | `20260318192425_858b3ffe-…sql:45` |
| `support_messages`            | `20260418200000_orbit_ai_support_tables.sql:44` |
| `support_ticket_messages`     | `20260318202630_223eb110-…sql:71` |
| `storefront_support_messages` | `20260316222430_ff72570e-…sql:25` |
| `storefront_ticket_messages`  | `20260316211215_59f7a6cb-…sql:27` |
| `rtc_signaling_messages`      | `20260318192425_858b3ffe-…sql:4` |
| `message_translations`        | `20260318185410_0b2e50ab-…sql:20` |
| `queue_poison_messages`       | (search) |

`chat_messages_v2.insert` × 11 (writer-aggregation L5) — the v2 migration
of `messages` was never completed.

### 9. Driver state fragmentation — **S3**

Tables (search `tables-create-provenance.txt` for each):
`driver_profiles`, `driver_clusters`, `driver_earnings`,
`driver_live_locations`, `driver_locations`, `driver_metrics`,
`driver_mission_offers`, `driver_payouts`, `driver_positioning`,
`driver_sessions`, `drivers_live`, `mobility_driver_scores`,
`mobility_driver_stats`, `zone_live_profiles`. Three independent
"live driver location" surfaces.

### 10. Merchant onboarding duplication — **S2**

23 `merchant_*` tables + `seed_merchants`. `seed_merchants.update`
appears **86 times** — the most-written table in the repo
(writer-aggregation.txt L1). Sample writers:
- `supabase/functions/_shared/food-firewall-adapter.ts:29`
- `supabase/functions/browser-user-repair-engine/index.ts:489`
- `supabase/functions/deep-scrape-build/index.ts:725`
- `supabase/functions/engine-cron-server/index.ts:317`

### 11. `seed_merchants` UPDATE storm — **S3**

86 UPDATE callsites on a single table is a hot-spot. Next highest
update count is `rent_calls.update` × 10. Risk: contention + audit
noise.

### 12. Audit-log duplication — **S3**

| Sink | INSERT count | writer-aggregation row |
|------|-------------:|------------------------|
| `audit_logs`               | 33 | L3 |
| `engine_run_logs`          | 15 | L4 |
| `command_audit_log`        | 10 | L7 |
| `system_health_snapshots`  |  8 | L9 |
| `engine_supervisor` (UPDATE) | 8 | L11 |
| `worker_health_snapshots`  |  3 | L27 |
| `support_traces`           |  4 | L21 |
| `admin_alert_log`          |  4 | L26 |

Eight concurrent telemetry sinks; none agree on schema.

### 13. Loyalty / wallet credit overlap — **S2**

`loyalty_accounts`, `loyalty_ledger`, `user_wallet_credits`,
`wallet_credit_transactions` — value held in two ledgers + a credits
table. Drift risk on conversion.

### 14. Schema mixing — **S4**

Tables defined under a non-`public` schema (search prefix in
`tables-create-provenance.txt`):
- `wallet.insurance_policies`, `wallet.insurance_claims`
- `system.policy_profiles`

`wallet.*` and `system.*` co-exist with `public.wallet_*` and
`public.system_*` without a documented rule. Confusing for RLS and
queries.

### 15. Job-queue duplication — **S3**

Three queue substrates with concurrent writers (writer-aggregation):
- `job_queue` (UPDATE 7, INSERT 4)
- `mobility_jobs` (UPDATE 9), `mobility_job_offers` (INSERT 4)
- `entity_pipeline_queue` (UPDATE 3)
- `queue_poison_messages` (UPSERT 4)

### 16. Approval requests vs admin alerts — **S4**

`approval_requests.update` × 8, `admin_alert_log.insert` × 4. Two
governance surfaces with implicit lifecycle relationship.

### 17. Subscription split UPDATE/UPSERT — **S3**

Same writer touches `subscriptions.update` × 6 AND `subscriptions.upsert`
× 3 (writer-aggregation L14, L29). Idempotency gap — consolidate to
UPSERT.

### 18. Realtime tables also polled — **S3**

`server_events` and `omega_decisions` are read both via realtime
subscription and via fetch in `src/hooks/useServerEvents.ts` (see
report 07 §1). Duplicate-effort guard required.

### 19. Orbit `_v2` proliferation — **S2**

`orbit_user_settings_v2` and `orbit_profiles_v2` were created in
`20260320092209_f94dfee5-…sql` (lines 6 and ~190) without dropping the
v1 tables they replaced. The v1 rows still receive writes from older
hooks.

### 20. Listings — first-class but no canonical table — **S4**

`favorite_listings`, `listing_coupons`, `listing_reviews`, `listing_views`
all reference a `listings` row, but no `public.listings` CREATE statement
appears in `tables-create-provenance.txt`. The join surface is implicit
and may rely on `properties` or `merchant_*` instead.

## Conflict patterns

1. **`*_v2` proliferation** — incomplete migrations:
   `bookings_v2`, `service_bookings_v2`, `chat_messages_v2`,
   `notifications_v2`, `wallet_balances_v2`, `wallets_v2`,
   `orbit_profiles_v2`, `orbit_user_settings_v2`. Eight abandoned
   v1→v2 cutovers; v1 still receives writes in every case.
2. **Multi-vertical tables** instead of a discriminator column:
   `hotel_bookings`, `service_bookings`, `marketplace_bookings`,
   `stay_bookings`, `concierge_bookings` — root cause of conflicts 4 & 5.
3. **Onboarding state in N independent tables** — `merchant_*`,
   `dino_draft_profiles`, etc. — no state-machine column.
4. **Schemas mixed** — `wallet.*`, `system.*`, `public.*` co-exist
   without a rule (conflict 14).

## Cross-domain "same column, different table, different type"

`99-evidence/tables-columns.csv` (9 271 column rows extracted by
`scripts/audit/phase-0/extract-columns.mjs`) is the source for any
type-divergence audit. A grep across the file shows divergent types
for the column `currency`:

```
> awk -F, 'tolower($4)=="currency"{print $3, $5}' 99-evidence/tables-columns.csv | sort -u
```

A frontend validator at
`src/domains/wallet/adapters/supabase.adapter.ts:144` accepts
`AED|USD|EUR|SAR|GBP` only — any table-side `currency text` column with
no CHECK constraint is a divergence risk.

## Writer-collision shortlist (>1 surface writes the same table)

From `99-evidence/writer-aggregation.txt`:
- `subscriptions` (UPDATE 6, UPSERT 3) — consolidate to UPSERT.
- `notifications` (INSERT 33, UPSERT 5, DELETE 3) — too many writers.
- `bookings` (UPDATE 6) — needs aggregate root.
- `payment_provider_events` (INSERT 8) — many writers, must be append-only.
- `seed_merchants` (UPDATE 86, INSERT 1) — single hot-spot, see §11.

Every other multi-write target is in `99-evidence/writer-aggregation.txt`.

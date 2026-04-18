# Database Audit — Read-Only

**Date:** 2026-04-18
**Scope:** Supabase project `ifvuvbolrmuuugtzxsfk` (PostgreSQL 17.6) ↔ repository `easy-locs-ea1eb0ed/`
**Mode:** Strictly read-only. No DDL, DML, or migration execution was performed. No source files were modified other than this report.
**Access path used:** Supabase Management API `POST /v1/projects/{ref}/database/query` with `SUPABASE_ACCESS_TOKEN`. Direct `psql` to `db.<ref>.supabase.co:5432` was unreachable from this environment (IPv6 network unreachable); the Management API is read-only by policy and was sufficient for full schema introspection. No write endpoints were called.

---

## 1. Executive Summary

The live Supabase database contains **619 tables, 700 RLS policies, 50 functions, 15 enums, 11 foreign keys, 615 indexes, 0 views, 0 materialized views** in the user-owned schemas. The repository contains **709 migration files** in `easy-locs-ea1eb0ed/supabase/migrations/`.

The audit surfaces **substantial drift** between the codebase and the live schema. Headline findings:

| Severity | Count | Category |
|---|---|---|
| Critical | 5 | Migration tracking absent; domain schemas declared but missing; ~149 code-referenced tables not in DB; ~70 code-referenced RPCs not in DB; future-dated migrations |
| High | 6 | Migration timestamp collisions; non-canonical migration filenames; near-zero foreign-key integrity; 43 tables without primary keys; 32 unused DB functions; 4 code-referenced tables exist only in non-public schema |
| Medium | 4 | Very few unique constraints (5); single application enum (`app_role`); no views/materialized views despite contract docs implying them; large DB-only table set (345) suggesting dead tables or hidden dependencies |
| Low | 3 | Repo migrations span Feb 25 → May 3 2026 (38 future-dated); naming inconsistencies; many auto-generated UUID-suffixed filenames |

### Top 10 Issues (by risk × blast radius)

1. **[CRITICAL] No `supabase_migrations.schema_migrations` table exists.** Migration history cannot be reconciled against the 709 files on disk; *every* migration is in an unknown applied/unapplied state from the perspective of Supabase tooling.
2. **[CRITICAL] Domain schemas declared in `supabase/config.toml` are missing from the database.** `config.toml` exposes `identity, wallet, orbit, marketplace, commerce, property, onboarding, support, notification, analytics` over PostgREST; only `system` exists. PostgREST will return 404 / search-path errors for any client using `domainDb.schema('identity')…` etc.
3. **[CRITICAL] ~149 tables are referenced by application/edge-function code but do not exist in any DB schema.** Examples: `agents`, `agent_heartbeats`, `agent_metrics`, `goals`, `goal_iterations`, `execution_tasks` (only exists in `system` schema, not `public`), `c2c_listings`, `c2c_offers`, `c2c_reviews`, `listings`, `favorites`, `payouts`, `payment_links`, `signature_envelopes`, `food_items`, `wallet_transactions_v2`, `dead_letter_queue`, `job_queue`, `entity_embeddings`, `referral_codes`, etc. Any code path hitting these will throw `relation does not exist` at runtime.
4. **[CRITICAL] ~70 RPC functions are called from code but missing from the database.** Examples: `atomic_wallet_transfer_fx`, `wallet_authorize`, `wallet_settle`, `wallet_reverse`, `transfer_locs`, `claim_pending_jobs`, `dispatch_lc3_replan`, `request_drift_replan`, `record_agent_heartbeat`, `register_agent`, `set_agent_status`, `kill_agent`, `kill_army`, `revive_army`, `watchdog_tick`, `try_claim_dispatch_lock`, `match_embeddings`, `semantic_search`, `hybrid_search_listings`, `point_in_zones`, `update_listing_freshness_scores`, `decline_envelope_party`, `sign_envelope_party`, `create_storefront_order_atomic`. Every `supabase.rpc('…')` to one of these will fail.
5. **[CRITICAL] 38 migration files are timestamped *after* today (2026-04-18), the latest being `20260503210000_…`.** Pre-staged or rebased migrations of this volume create a high risk of accidental application out of order or against the wrong environment.
6. **[HIGH] 21 distinct migration timestamps are shared by 2–4 files each (52 files in total share a timestamp with another file).** Supabase orders migrations by `version` (the leading 14-digit numeric); collisions create non-deterministic apply order across machines.
7. **[HIGH] Only 11 foreign keys exist across all user-owned schemas (619 + 2 tables).** Referential integrity is effectively absent. Cascading deletes, orphan-row cleanup, and join planning are all at risk.
8. **[HIGH] 43 public tables have no primary key** (e.g. `core_countries`, `core_locales`, `marketplace_*_core`, `wallet_balances_v2`, `user_loyalty`, `user_presence`, `payment_nonces`, plus several `vw_*` named tables). Without PKs, replication, `UPSERT`, and `REPLICA IDENTITY` (Realtime/CDC) all degrade.
9. **[HIGH] 4 code-referenced tables exist only in a non-`public` schema** with no compatibility view in `public`. Without `.schema('…')` calls in code, `.from('<name>')` will not resolve. Notably `execution_tasks` lives in `system`, but several files do `db.from('execution_tasks')`.
10. **[HIGH] 32 in-DB functions are not referenced anywhere in the codebase.** Likely dead code from prior iterations; if any are `SECURITY DEFINER`, they widen the attack surface unnecessarily.

---

## 2. Methodology

### 2.1 Read-only introspection executed

All queries were `SELECT` against `information_schema`, `pg_catalog`, and `pg_policies`. No DDL/DML, no `REFRESH`, no `VACUUM`, no migration application.

Counts retrieved from the live database:

| Object | Count |
|---|---|
| Schemas (incl. system) | 13 |
| User-defined schemas | `public`, `system` (only) |
| Tables (`public`) | 619 |
| Tables (`system`) | 2 |
| Columns (user schemas) | 8,203 |
| Enums (all) | 15 (1 in `public`: `app_role`; rest in `auth`/`realtime`) |
| Functions (user) | 50 (41 in `public`, 9 elsewhere) |
| RLS policies | 700 (across 619 `public` tables) |
| Tables with RLS disabled | 0 |
| Tables with no policy | 0 |
| Tables with no primary key | 43 |
| Foreign keys | 11 |
| Unique constraints (`public`) | 5 |
| Indexes (user schemas) | 615 |
| Triggers (user schemas) | 14 |
| Views | 0 |
| Materialized views | 0 |
| Extensions installed | `pg_graphql 1.5.11`, `pg_stat_statements 1.11`, `pgcrypto 1.3`, `plpgsql 1.0`, `supabase_vault 0.3.1`, `uuid-ossp 1.1` |

### 2.2 Code-side inventory

- Scanned `easy-locs-ea1eb0ed/src/**` and `easy-locs-ea1eb0ed/supabase/functions/**` with regex extraction of:
  - `.from('<table>')` literals → **432** distinct table names referenced.
  - `.rpc('<fn>')` literals → **93** distinct RPCs referenced.
- Migration files enumerated under `easy-locs-ea1eb0ed/supabase/migrations/` → **709** files.
  - Earliest: `20260225233034_fc482199-…`.
  - Latest: `20260503210000_atomic_dispatch_with_deps.sql`.
  - Files past today (2026-04-18): **38**.
  - Distinct timestamps with collisions: **21** (52 colliding files).
  - Files not matching `^[0-9]{14}_`: **2** (`20260415_c2c_tables.sql`, `20260416_c2c_moderation_rls_fix.sql` — 8-digit timestamps).
  - Heaviest single day: 2026-03-20 (44 files).

### 2.3 Limitations of this audit (disclosed)

- The Management API SQL endpoint imposes per-request size/time limits; very large set comparisons were paginated as needed.
- Code-side regex extraction can produce false positives when a string literal that happens to match `'word'` is passed to a method named `from`/`rpc` in unrelated code (e.g. test fixtures, type-doc snippets, skill examples). Obvious noise (`x`, `y`, `table`, `vault`, `do_thing`, `lookup_thing`, `mutate_x`, `whatever`, `exec_sql`) was filtered for the headline counts but may persist in raw lists.
- Dynamic table/RPC names (`.from(varName)`) are not detected; the true reference set is a superset of what is reported.
- Compatibility views in `public` that proxy to domain schemas are not present in this DB (views = 0), so the “domain schema fallback via view” pattern referenced in `config.toml` comments is not actually wired.
- The Supabase migration tracking table was not found at any expected location (`supabase_migrations.schema_migrations`, `_supabase.schema_migrations`); no other migration-history surface was discoverable. This is itself a finding (see CR-1).

---

## 3. Detailed Findings

### 3.1 Migration drift (`supabase/migrations` vs DB)

#### CR-1 [Critical] No migration history table in the live DB
- **Evidence:** `SELECT … FROM supabase_migrations.schema_migrations` → `42P01: relation does not exist`. Searching `information_schema.tables WHERE table_name ILIKE '%migration%'` returns only application-level tables (`migration_conflicts_core`, `migration_entity_map_core`, `migration_jobs_core`, `auth.schema_migrations`, `realtime.schema_migrations`, `storage.migrations`).
- **Risk:** Critical — data integrity & deploy safety. Without a tracking table, `supabase db push` cannot reason about applied state; future runs may attempt to re-apply DDL, or fail mid-way. Rollbacks become guesswork.
- **Likely cause:** Repo was historically applied via Lovable / direct SQL / a different CLI version, or the schema was reset without re-baselining. Either way, the repo is the only source of truth for schema intent.

#### CR-5 [Critical] 38 future-dated migrations
- **Evidence:** Files with timestamps after `20260418999999`, latest `20260503210000`.
- **Risk:** Critical — accidental application could push unreviewed schema. Some appear to be pre-staged (e.g., `lc4_dev_replan_rpc.sql`, `goal_engine_phase3.sql`) and may belong to in-flight feature branches that were merged onto `main` early.

#### HI-1 [High] Migration timestamp collisions
- **Evidence:** 21 timestamps shared by ≥2 files (e.g., `20260417600000` shared by 4 files; `20260430000000` shared by 4; `20260416700000`, `20260416800000`, `20260416900000`, `20260417500000`, `20260419000000` each shared by 3).
- **Risk:** High — non-deterministic apply order; two machines applying from a fresh DB can end up with different schemas. Partial application can leave the DB in an inconsistent state that is invisible to the `version` index.

#### HI-2 [High] Non-canonical migration filenames
- **Evidence:** `20260415_c2c_tables.sql` and `20260416_c2c_moderation_rls_fix.sql` use 8-digit timestamps; the rest use 14-digit. Many filenames also embed a UUID rather than a descriptive name (Lovable export pattern), making review harder.
- **Risk:** High — Supabase CLI parses the leading numeric as the version; an 8-digit value sorts *before* any 14-digit value from the same calendar day, yielding a different effective order than a developer might assume.

#### LO-1 [Low] No baselining / squashing
- **Evidence:** 709 migrations from a 9-week window. No `_baseline.sql` or squash file is present.
- **Risk:** Low — operational drag on cold-start environments and CI; not a runtime risk.

### 3.2 Schema/code mismatches

#### CR-2 [Critical] Domain schemas declared but absent in DB
- **Evidence:** `supabase/config.toml` lines 7–13:
  ```
  schemas = ["public","identity","wallet","orbit","marketplace","commerce","property","onboarding","support","notification","system","analytics"]
  ```
  Live DB schemas (excluding system-managed): `public`, `system`. Missing: `identity, wallet, orbit, marketplace, commerce, property, onboarding, support, notification, analytics` (10 schemas).
- **Risk:** Critical — security & runtime. PostgREST exposes schema entries it cannot resolve, and any client using `supabase.schema('wallet').from(…)` will receive `PGRST205` / 404. The comment in `config.toml` says *“Public compat views ensure that existing .from('table') calls still work during the transition period”* — but `pg_matviews` and `information_schema.views` both return 0 entries. The transition was never completed (or was rolled back without updating config).

#### CR-3 [Critical] ~149 code-referenced tables missing from DB
- **Evidence:** Set difference `code_tables \ db_all_tables`. Full list at `/tmp/audit/truly_missing_filtered.json`. Representative samples grouped by domain:
  - **Agents/orchestration:** `agents`, `agent_heartbeats`, `agent_instances`, `agent_messages`, `agent_metrics`, `agent_policies`, `agent_actions`, `agent_circuit_breakers`, `command_audit_log`, `command_orders`, `dispatch*`, `watchdog_loop_health`, `worker_health_snapshots`, `repair_proofs`.
  - **Goal engine:** `goals`, `goal_iterations`, `engine_memory`, `learning_memory`, `omega_decisions`, `monitoring_findings`.
  - **C2C / marketplace:** `c2c_listings`, `c2c_offers`, `c2c_reports`, `c2c_reviews`, `c2c_moderation_queue`, `listings`, `favorites`, `property_listings`.
  - **Wallet/payments:** `payouts`, `payment_links`, `payment_transactions`, `wallet_transactions_v2`, `wallet_device_bindings`, `transaction_risk_log`, `bnpl_plans`, `fx_rates`, `transactions`.
  - **Plaid / e-sign / orbit / food / shops:** `plaid_items`, `plaid_webhook_events`, `signature_envelopes`, `lease_signatures`, `orbit_messages`, `orbit_calls`, `orbit_call_logs`, `orbit_e2ee_sessions`, `orbit_conversations`, `orbit_profiles`, `food_items`, `menu_modifier_groups`, `menu_modifier_options`, `merchant_media`, `shops`, `service_catalog`, `service_bookings_v2`.
  - **Infra/queues:** `dead_letter_queue`, `job_queue`, `cron_execution_log`, `queue_domain_pause`, `queue_poison_messages`, `saga_events`, `kill_switches_server`, `kill_switch_audit_log`, `feature_flags_server`, `system_flags`, `system_health_snapshots`, `system_uptime_log`, `incident_log`, `db_observability_metrics`, `edge_function_metrics`, `firecrawl_usage_log`, `gateway_*` (4), `dld_*` (3).
  - **Search / AI / embeddings:** `entity_embeddings`, `search_analytics`, `search_sync_log`, `search_sync_queue`, `ai_eval_runs`, `ai_golden_sets`, `ai_quotas`, `ai_recommendations_cache`, `ai_conversation_memory`, `ai_interactions`, `content_enrichments`, `article_content_cache`.
  - **Map error analytics (recently planned):** `map_error_analytics`, `map_error_alert_log`, `merge_conflict_alert_thresholds`, `observability_alert_log`.
  - **Misc:** `appointments`, `approval_requests`, `chat_messages`, `client_ratings`, `referral_codes`, `referral_redemptions`, `loyalty_history`, `notification_log`, `support_messages`, `support_sessions`, `support_traces`, `prayer_push_schedules`, `prayer_times_cache`, `qr_sessions`, `short_links`, `sms_log`, `team_members`, `units`, `units`, `user_blocks`, `providers`, `read_model_dashboard_cards`, `rollback_points`, `scheduled_calls`, `security_csp_reports`, `security_events`, `sentinel_telemetry`, `server_cache`, `server_events`, `service_availability`, `storage_backup_manifests`, `email_delivery_events`, `email_suppressions`, `eta_predictions`, `degradation_audit_log`, `domain_degradation_modes`, `cookie_consent_log`, `cost_tracking`, `boundary_validation_quarantine`, `anomaly_detection_windows`, `autonomy_system_status`, `config_snapshots`, `identity_activations`, `integration_health_log`, `organization_members`, `product_returns`, `demand_zones`.
- **Risk:** Critical — runtime breakage on any code path that touches these. Many appear in edge functions (`supabase/functions/*`), so failures will cascade to API consumers.
- **False-positive caveat:** Some entries (`avatars` is a Supabase Storage bucket, not a table; `vault` is the secrets module; `table`, `x`, `y` are doc artefacts) were filtered. A handful more may be ORM type aliases or test fixtures — see `/tmp/audit/truly_missing_filtered.json` for the raw set requiring per-line triage.

#### CR-4 [Critical] ~70 RPCs called from code but absent in DB
- **Evidence:** Set difference `code_rpcs \ db_functions` (after stripping obvious doc placeholders). Full list at `/tmp/audit/rpcs_missing_filtered.json`. Notable groups:
  - **Wallet / money movement:** `atomic_wallet_transfer_fx`, `wallet_authorize`, `wallet_settle`, `wallet_reverse`, `transfer_locs`.
  - **Idempotency / locking:** `claim_idempotency_key` (this one **does** exist), `finalize_idempotency_key`, `find_idempotent_result`, `try_claim_dispatch_lock`, `claim_pending_jobs`.
  - **Agent runtime:** `register_agent`, `set_agent_status`, `record_agent_heartbeat`, `update_agent_heartbeat`, `peek_agent_quota`, `kill_agent`, `kill_army`, `revive_army`, `can_spawn`, `watchdog_tick`, `record_circuit_breaker_failure/success`.
  - **Task engine:** `add_task_dependency`, `validate_task_dependencies`, `decide_task_approval`, `approve_task`, `reject_task`, `retry_task`, `admin_force_fail_task`, `admin_release_task_lock`, `admin_preview_stuck_tasks`, `list_task_approvals`, `request_dev_replan`, `request_drift_replan`, `dispatch_lc3_replan`.
  - **Search / geo:** `match_embeddings`, `semantic_search`, `hybrid_search_listings`, `spatial_nearby`, `point_in_zones`, `auto_assign_zone`, `update_listing_freshness_scores`, `resolve_short_link`.
  - **Storefront / e-sign:** `create_storefront_order_atomic`, `decline_envelope_party`, `sign_envelope_party`.
  - **Misc infra:** `emit_server_event`, `record_db_observability`, `record_anomaly_window`, `capture_slow_queries`, `cleanup_*` (3), `purge_integration_health_logs`, `set_domain_degradation`, `toggle_kill_switch_server`, `update_autonomy_status`, `upsert_dashboard_card`, `write_incident`, `insert_into_dlq`, `find_orphan_media`.
- **Risk:** Critical — every `supabase.rpc('<name>')` call surfaces a `42883` (function does not exist) or a PostgREST 404. For wallet/idempotency RPCs in particular, callers may silently fall back, allowing double-charges or lost messages.

#### HI-3 [High] Code-referenced tables only resolvable in non-`public` schema
- **Evidence:** 4 names exist solely in `system` (or another non-public schema) yet code uses unqualified `.from(name)`: includes `execution_tasks` (system) and a small set documented in `/tmp/audit/code_in_other_schema.json`.
- **Risk:** High — same failure mode as CR-3 unless caller threads `.schema('system')`. Search-path entry order doesn’t help PostgREST; it requires explicit schema selection.

#### HI-6 [High] 32 DB functions appear unused
- **Evidence:** Set difference `db_functions \ code_rpcs` after noise filter. List in `/tmp/audit/diff.json:db_functions_unused_in_code`.
- **Risk:** High (security) — any unused `SECURITY DEFINER` function widens privilege surface. Also operational — confuses on-call engineers.
- **Mitigation note:** Some are likely trigger functions, called by the 14 triggers, not via RPC. A `prokind`/`proconfig` cross-check is suggested before any drop.

### 3.3 Constraints and integrity

#### HI-4 [High] Near-zero foreign-key coverage
- **Evidence:** 11 FKs total across `public` + `system`. With 619 + 2 = 621 user tables and ~8,200 columns, the realistic expectation (10–30% of columns being FKs in a well-modelled schema) is **hundreds** of FKs. Existing FKs cluster around `conversations_v2`, `deals`, `orbit_groups`, `orgs`, and self-referential `system.execution_tasks`.
- **Risk:** High — orphaned rows, silently-broken joins, no cascading cleanup. RLS policies that rely on `EXISTS` joins through implicit relationships still work, but data correctness is unenforced.

#### HI-5 [High] 43 tables without primary keys
- **Evidence:** `pg_class` join with `pg_index WHERE indisprimary IS NULL`. Examples include `core_countries`, `core_locales`, `core_timezones_catalog`, `marketplace_*_core` (8 tables), `wallet_balances_v2`, `user_loyalty`, `user_presence`, `payment_nonces`, `device_attestations`, `entity_ai_scores`, `internal_config`, `current_ranking_state`, `address_search_cache`, `product_search_index`, `mobility_driver_stats`, `rider_runtime_state`, `trip_live_state`, `merchant_geo_context`, `merchant_delivery_runtime`, `delivery_vehicle_capabilities`, `geo_live_zone_overlays`, `canonical_place_viewports`, `user_subscriptions`, `user_risk_profiles`, `user_trust_graph`, `user_wallet_credits`, `user_ai_profiles`, `orbit_user_settings_v2`, several `vw_*`-named tables (likely intended as views).
- **Risk:** High — Realtime/CDC requires `REPLICA IDENTITY` (defaults to PK); `UPSERT` becomes ambiguous; pgsql replication can be blocked.

#### ME-1 [Medium] Only 5 unique constraints in `public`
- **Evidence:** `information_schema.table_constraints WHERE constraint_type = 'UNIQUE' AND table_schema = 'public'`.
- **Risk:** Medium — uniqueness is enforced via UNIQUE indexes elsewhere (615 indexes total, some likely UNIQUE), but the constraint surface is thin. Verify by counting `pg_index WHERE indisunique`.

#### ME-2 [Medium] Single application enum
- **Evidence:** Only `public.app_role` (`{admin,user,manager,owner,agent,viewer}`). The other 14 enums belong to `auth`/`realtime`. Code likely encodes status fields as `text` everywhere.
- **Risk:** Medium — type-safety gap; status mismatches across services are not detected at write time.

#### ME-3 [Medium] No views or materialized views
- **Evidence:** `pg_matviews` empty; `information_schema.views` (excluding system schemas) empty.
- **Risk:** Medium — `config.toml` and several edge functions imply public compatibility views. If they ever existed, they were dropped without updating callers.

#### ME-4 [Medium] 345 DB tables not referenced by code
- **Evidence:** Set difference `db_public_tables \ code_tables`. Could be (a) dead tables, (b) tables only accessed by SQL inside functions (still legitimate), or (c) accessed by dynamic code that the static scan missed.
- **Risk:** Medium — dead-data risk and storage cost; some may also hold privileged data with stale RLS policies. Each candidate needs human triage; do not drop blindly.

### 3.4 RLS

#### Positive observations
- All 619 `public` tables have RLS **enabled** (no exceptions detected).
- Every `public` table has at least one policy attached (`tables_no_policies` = 0). This avoids the silent "RLS-on but no policy → deny-all" footgun.

#### LO-2 [Low] Policy density / SELECT-only coverage to be verified
- **Evidence:** 700 policies for 619 tables ≈ 1.13 / table. Healthy coverage usually requires per-action policies (SELECT/INSERT/UPDATE/DELETE). The dataset is in `/tmp/audit/policies.json` for follow-up.
- **Risk:** Low — but worth a focused secondary review to confirm no table is `SELECT`-only or `ALL`-policy without nuance.

### 3.5 Triggers, indexes, functions

- **Triggers:** 14 total in user schemas — small, but each tied to one of the few in-DB functions. Worth confirming that orphaned trigger functions (if any) match active triggers.
- **Indexes:** 615 across user schemas. Healthy ratio (~1 / table). Not analysed for redundancy in this audit; recommend `pg_stat_user_indexes` review next pass (read-only, safe).
- **Functions:** 50 user-defined; 41 in `public`, 9 elsewhere. See `/tmp/audit/public_functions_meta.json` for `SECURITY DEFINER` flags.

---

## 4. Risk Tally

| Severity | Count | IDs |
|---|---|---|
| Critical | 5 | CR-1, CR-2, CR-3, CR-4, CR-5 |
| High | 6 | HI-1, HI-2, HI-3, HI-4, HI-5, HI-6 |
| Medium | 4 | ME-1, ME-2, ME-3, ME-4 |
| Low | 3 | LO-1, LO-2, LO-3 (raw migration filename hygiene) |

---

## 5. Proposed Safe Migration Plan (NOT EXECUTED)

> **All steps below are recommendations only. No DDL is applied by this task. Each step lists pre-checks and rollback notes; destructive steps are flagged and require explicit operator approval before any future execution.**

### Phase 0 — Stabilise (no schema changes)

1. **Snapshot the current state** (operator action, outside this task):
   - Take a Supabase point-in-time backup tag.
   - `supabase db dump --schema-only -f schema.snapshot.sql` from a workstation with direct network access (IPv6 path was blocked here).
   - `pg_dump -Fc --schema=supabase_migrations` (will be empty — confirms CR-1).

2. **Inventory baseline**: commit `/tmp/audit/*.json` (or a curated subset) into `docs/audits/data/2026-04-18/` so future audits can diff against this run. *Out of scope of this task — included for completeness.*

### Phase 1 — Reconcile migration tracking (CR-1, HI-1, HI-2)

Goal: end with a `supabase_migrations.schema_migrations` table that lists every applied migration so future `supabase db push` runs are deterministic.

1. **Create the tracking table** (idempotent):
   ```sql
   CREATE SCHEMA IF NOT EXISTS supabase_migrations;
   CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
     version  text PRIMARY KEY,
     name     text,
     statements text[],
     inserted_at timestamptz NOT NULL DEFAULT now()
   );
   ```
   - Pre-check: `to_regclass('supabase_migrations.schema_migrations') IS NULL`.
   - Rollback: `DROP TABLE supabase_migrations.schema_migrations; DROP SCHEMA supabase_migrations;` (only if just created).

2. **Backfill** the table from the 709 file versions on disk (insert `version, name` rows only — no statements, since they are already applied):
   - Build a `COPY` payload from the file list; `INSERT … ON CONFLICT DO NOTHING`.
   - Verification: `SELECT count(*) FROM supabase_migrations.schema_migrations;` matches the de-duplicated file count.
   - Rollback: `DELETE FROM supabase_migrations.schema_migrations WHERE inserted_at >= '<batch-time>';`

3. **Resolve timestamp collisions (HI-1)** by renaming files (repo-only change, no DB effect):
   - Bump the second-most-recent collision by +1 second per duplicate.
   - Verification: `ls supabase/migrations | sed 's/_.*//' | sort | uniq -d` returns empty.
   - This is a *file rename only*; the backfilled `schema_migrations` rows must be updated in lockstep.

4. **Normalise non-canonical filenames (HI-2)** by renaming `20260415_…` and `20260416_…` to their 14-digit equivalents (`20260415000000_…`, `20260416000000_…`) and updating the matching `schema_migrations` rows.

5. **Quarantine future-dated migrations (CR-5)**:
   - Move the 38 files dated > 2026-04-18 out of `supabase/migrations/` into `supabase/migrations/_pending_review/` (still tracked in git, *not* discoverable by Supabase CLI).
   - Re-introduce them deliberately, one at a time, after review.
   - Rollback: move files back; no DB impact (they were never applied).

### Phase 2 — Decide on domain-schema strategy (CR-2)

Two options; pick one before creating any objects.

- **Option A (recommended): drop the empty schemas from `config.toml`.**
  - Edit `supabase/config.toml` `[api].schemas` to keep only `public, system`.
  - Rebuild any TS clients that reference `domainDb.schema('wallet')…` to use `public` (or remove the `domainDb` abstraction).
  - Lowest risk; matches reality.
- **Option B: actually create the domain schemas + compatibility views.**
  - For each schema, `CREATE SCHEMA IF NOT EXISTS <name> AUTHORIZATION postgres;`
  - Move the relevant tables (or create compat views in `public` that proxy to domain tables).
  - This is a multi-week project — out of scope of a single migration.

### Phase 3 — Resolve missing tables/RPCs (CR-3, CR-4, HI-3)

For each entry in `/tmp/audit/truly_missing_filtered.json` and `/tmp/audit/rpcs_missing_filtered.json`:

1. **Triage** (read-only): is the call path live, dead, or behind a feature flag?
2. **For live paths**, author a forward migration that creates the table/function with the expected shape. Ship via PR; apply via Phase 1’s now-tracked workflow.
3. **For dead paths**, delete the calling code. (Code change, not DB change.)
4. **For HI-3** (`execution_tasks` etc.), either:
   - Add `.schema('system')` at every call site, or
   - Create a `public.execution_tasks` view that selects from `system.execution_tasks` (read-only) and a corresponding `INSTEAD OF` trigger pair if writes are needed.

No data backfill is required for any newly-created table that has no current rows.

### Phase 4 — Strengthen integrity (HI-4, HI-5, ME-1, ME-2)

1. **Add primary keys** to the 43 PK-less tables. Pre-check duplicate-row counts per candidate column; if duplicates exist, plan a cleanup pass first.
   - Migration sketch: `ALTER TABLE <t> ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(); UPDATE … ; ALTER TABLE <t> ADD CONSTRAINT <t>_pkey PRIMARY KEY (id);`.
   - **Destructive flag:** `UPDATE` on `vw_*`-named tables may be a sign that they should be views, not tables — *manual approval required before adding PKs to them*.

2. **Add foreign keys** in batches by domain (wallet, deals, orbit, c2c, …). Pre-check orphan counts (`SELECT count(*) FROM child WHERE NOT EXISTS (SELECT 1 FROM parent WHERE …)`). For each non-zero count, decide between cleanup and `NOT VALID` constraints.

3. **Enums**: convert high-value status columns (`*_status`, `*_state`, `*_role`) to enum types per domain. Use `ALTER TABLE … ALTER COLUMN … TYPE … USING …`; never modify enums in-place except via `ALTER TYPE … ADD VALUE`.

### Phase 5 — Clean up dead surface (HI-6, ME-4)

- Quarantine the 32 unused functions: rename to `__deprecated__<name>` for one release cycle, monitor `pg_stat_user_functions` for calls, then drop. **Destructive on drop — manual approval required.**
- Likewise for the 345 DB-only tables: only after a sustained zero-row, zero-IO period (≥30 days) and a written sign-off, drop them. Until then, document in `docs/audits/dead-objects.md`.

### Phase 6 — Reconciliation gate

- Add a CI job that runs (read-only) the same diffs this report performed and fails if `code_only_tables`, `rpcs_missing_in_db`, or `timestamp_collisions` exceed agreed thresholds.

### Rollback posture

- Phases 1–2 are repo-side or additive DDL with explicit rollback statements.
- Phase 3 is purely additive; rollback = drop the newly created object.
- Phase 4 is mostly non-destructive (`ADD CONSTRAINT … NOT VALID` is reversible; `ADD PRIMARY KEY` is reversible via `DROP CONSTRAINT`).
- Phase 5 contains the only truly destructive steps; each requires explicit operator approval and a Supabase PITR window.

---

## 6. Appendices

### A. Raw datasets retained (in this environment, `/tmp/audit/`)

| File | Description |
|---|---|
| `schemas.json` | All schemas |
| `tables.json` | All user-schema tables (644 rows incl. `auth/storage` excluded ones — see filter list) |
| `columns.json` | 8,203 columns |
| `enums.json` | 15 enums |
| `functions.json` | 53 user functions (incl. `system`/`pgbouncer`) |
| `policies.json` | 700 RLS policies |
| `foreign_keys.json` | 11 FKs |
| `triggers.json` | 14 triggers |
| `indexes.json` | 615 indexes |
| `views.json` | empty |
| `rls_status.json` | RLS flags per table |
| `tables_no_pk.json` | 43 entries |
| `unique_constraints.json` | 5 entries |
| `public_functions_meta.json` | 41 public functions w/ `prosecdef` |
| `code_tables.txt` | 432 names |
| `code_rpcs.txt` | 93 names |
| `diff.json` | Computed diffs |
| `truly_missing_filtered.json` | 149 names |
| `rpcs_missing_filtered.json` | 70 names |
| `code_in_other_schema.json` | 4 entries |
| `tables_no_policies.json` | empty (good) |

These are intentionally left under `/tmp/audit/` rather than committed to the repo, per the task’s “only file written is the audit report” constraint.

### B. Read-only queries used (representative)

```sql
-- schemas, tables, columns, enums
SELECT schema_name FROM information_schema.schemata …;
SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE … ;
SELECT … FROM information_schema.columns WHERE … ;
SELECT n.nspname, t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder)
FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace … ;

-- functions, policies, triggers, indexes, views, rls
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE … ;
SELECT * FROM pg_policies WHERE … ;
SELECT * FROM information_schema.triggers WHERE … ;
SELECT * FROM pg_indexes WHERE … ;
SELECT * FROM information_schema.views WHERE … ;
SELECT n.nspname, c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND … ;

-- integrity
SELECT … FROM information_schema.table_constraints WHERE constraint_type IN ('FOREIGN KEY','UNIQUE') … ;
SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisprimary);
```

### C. What was *not* done (out of scope, on purpose)

- Per-policy correctness review (USING/WITH CHECK clauses) — sample only.
- Index redundancy / unused index analysis.
- Storage bucket policy review.
- Auth schema review.
- Data-volume / row-count sampling.
- Performance assessment.
- Any remediation, rename, or DDL.

---

*End of audit report.*

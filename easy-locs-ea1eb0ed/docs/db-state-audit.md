# Database State Audit & Safe Recovery Plan

**Date:** 2026-04-18
**Project:** easy-locs (Supabase ref `ifvuvbolrmuuugtzxsfk`, region `ap-southeast-1`, Postgres 17.6.1)
**Auditor:** Phase 1 follow-up to Task #1045
**Status of project:** `ACTIVE_HEALTHY`

---

## 0. TL;DR

- The live database is **NOT empty**. It contains **619 tables** (all RLS-enabled), 41 functions, 690 RLS policies, 601 indexes, on a 32 MB DB with 1 auth user.
- The 709 migration files in `supabase/migrations/` were applied **out-of-band** (Studio SQL editor / direct API) **without a tracking table**. Supabase migration tracking (`supabase_migrations.schema_migrations`) **does not exist**.
- The 10 declared "domain schemas" (`identity`, `wallet`, `orbit`, `marketplace`, `commerce`, `property`, `onboarding`, `support`, `notification`, `analytics`) **do not exist** in the live DB. All those domain tables currently live flat in `public` (e.g. `orbit_profiles_v2`, `wallet_accounts`, `marketplace_listings`).
- Risk of any "force apply 709 migrations" pass is **catastrophic** (would attempt to re-create existing tables, destroy/replace policies, and conflict on data). **Do not do this.**
- A safe path exists: **install tracking → baseline-stamp existing migrations as already-applied → only execute the small set of unapplied "domain split" migrations behind a review gate**, with full pre-apply backup.

---

## 1. Connectivity inventory

| Channel | Status | Notes |
|---|---|---|
| `DATABASE_URL` env var | ✅ reachable | Points to a **Replit-managed Helium DB**, not Supabase. Empty (only `public`). Not the app DB. Do not target. |
| Direct Postgres `db.<ref>.supabase.co:5432` | ❌ unreachable | IPv6-only from this workspace; network unreachable. |
| Pooler `aws-0-*.pooler.supabase.com:6543` | ❌ rejected | "Tenant or user not found" with current creds. Region (ap-southeast-1) likely needs different pooler host or pooler is disabled on this project. |
| Supabase REST `/rest/v1` | ✅ reachable | HTTP 200 to existing tables with anon key. |
| Supabase **Management API** `/v1/projects/{ref}/database/query` with `SUPABASE_ACCESS_TOKEN` | ✅ working | Used as the audit/apply channel for this report. |

**Implication:** Until pooler creds or `IPv4 add-on` is enabled, **all migration apply/rollback in this workspace must go through the Management API SQL endpoint**. The Supabase CLI cannot connect from here.

---

## 2. Live database snapshot (verified)

```
Schemas present:   auth, extensions, graphql, graphql_public, public,
                   realtime, storage, system, vault
Schemas missing:   identity, wallet, orbit, marketplace, commerce,
                   property, onboarding, support, notification, analytics
                   (10/12 of the schemas declared in supabase/config.toml)

public.tables:     619 (all RLS-enabled)
public.views:      0
public.functions:  41
public.policies:   690
public.indexes:    601
public.triggers:   2
system.tables:     2 (execution_locks, execution_tasks)

Extensions:        pg_graphql, pg_stat_statements, pgcrypto,
                   plpgsql, supabase_vault, uuid-ossp
DB size:           32 MB  (auth.users = 1 → essentially a clean dev tenant)

Migration tracking table (supabase_migrations.schema_migrations): MISSING
```

All critical app tables exist: `profiles`, `user_roles`, `orders`, `payments`, `wallets`, `marketplace_listings`, `orbit_profiles_v2`, `audit_logs`, `notifications`. Top tables by size are `browser_telemetry_events` (1.7 MB), `audit_logs` (600 kB), `radar_signals` (176 kB) — i.e. mostly empty / lightly populated.

---

## 3. Migration corpus snapshot

```
Files in supabase/migrations/: 709
Date range:                    20260225233034 → 20260503210000
CREATE SCHEMA IF NOT EXISTS for declared domain schemas:
   identity (8 files), marketplace (9), analytics (9), orbit (4),
   property (4), wallet (3), commerce (3), support (3),
   onboarding (2), notification (1)
```

All 10 missing domain schemas are introduced by `CREATE SCHEMA IF NOT EXISTS` in some migration files (idempotent), and each followed by `CREATE TABLE …` / `CREATE VIEW …` in those schemas. None of these have been applied to the live DB.

---

## 4. Mismatch report

### 4.1 Hard mismatches (live DB ≠ migration corpus)

| # | Mismatch | Detected by | Severity |
|---|---|---|---|
| M1 | No `supabase_migrations.schema_migrations` table exists | live audit | **HIGH** — every future migration is unsafe without it |
| M2 | 10 domain schemas declared in `config.toml [api].schemas` and in migration files do not exist in live DB | live audit + grep | **HIGH** — PostgREST will 404 on `domainDb.schema('orbit').from(...)` calls |
| M3 | Domain tables (e.g. `orbit.profiles_v2`, `wallet.accounts`) exist only in `public` (e.g. `public.orbit_profiles_v2`, `public.wallet_accounts`) | live audit + code grep | **MEDIUM** — code currently routes through `public` flat tables; domain split + compat views never materialised |
| M4 | 709 migration files have never been "stamped" → unknown which were actually run | live audit | **HIGH** — without baseline stamp we cannot tell new from old |

### 4.2 Soft mismatches (need per-file diff)

We cannot enumerate every "missing column/constraint" without running each migration file in dry-run mode (transaction + ROLLBACK) against a copy of the DB. That work is the *next* step of the recovery plan (§5, step 4) — performed against a **shadow database**, never against prod.

### 4.3 Non-mismatches (verified safe)

- All 619 tables have RLS enabled (no naked tables).
- Extension set matches the typical Supabase baseline (no missing required extensions detected).
- The `system` schema with `execution_locks` / `execution_tasks` is the operational queue used by the cron dispatcher and is present.

---

## 5. Safe recovery plan (step-by-step, ZERO destructive ops without confirmation)

> **Golden rules**
> - Every step that writes is gated by a manual confirmation.
> - No step drops a schema, table, column, policy, function, or row.
> - Every write step is preceded by a verifiable, restorable backup.
> - Every step is idempotent or has an explicit rollback.

### Step 0 — Prerequisites (no DB writes)

- [ ] **Confirm the audit channel.** All steps below assume `SUPABASE_ACCESS_TOKEN` + Management API SQL endpoint. If the user prefers CLI/psql, enable the IPv4 add-on or supply pooler creds first.
- [ ] **Confirm the target.** This plan targets `ifvuvbolrmuuugtzxsfk` (Easy-locs, ap-southeast-1). Do not run against any other ref.
- [ ] **Decide on a maintenance window.** Recommend ≥30 minutes with the app in read-only or behind a maintenance page (no writes during baseline stamp).

### Step 1 — Take a full backup (REQUIRED, no DB writes)

Two layers; both are required:

1. **Logical dump (size-bounded; current DB is 32 MB so a full `pg_dump` is trivial).**
   - From a host that *can* reach the DB (CI runner with IPv4, local dev box, or Supabase support):
     ```
     PGPASSWORD="<SUPABASE_DB_PASSWORD>" \
     pg_dump --format=custom --no-owner --no-privileges \
             --host=db.<SUPABASE_PROJECT_REF>.supabase.co --port=5432 \
             --username=postgres --dbname=postgres \
             --file=easy-locs-$(date +%F).dump
     ```
   - Store the dump file **off the project** (S3, Drive, secure storage) and verify with `pg_restore --list`.

2. **Supabase Point-in-Time Recovery (PITR) confirmation.**
   - In the Supabase dashboard → Database → Backups, confirm a daily backup ≤24 h old exists, and (if PITR is enabled on the plan) record the WAL retention window.
   - If PITR is not enabled, **enable it before proceeding** (or accept rolling 24 h granularity as the rollback floor).

3. **Sentinel snapshot of structural metadata** (always available via Management API; safe & read-only):
   ```
   docs/db-snapshots/<UTC-timestamp>/
     schemas.json     -- list of schemas
     tables.json      -- {schema, table, rls, n_columns}
     columns.json     -- {schema, table, column, type, nullable, default}
     indexes.json     -- {schema, table, indexname, indexdef}
     policies.json    -- {schema, table, polname, cmd, qual, with_check}
     functions.json   -- {schema, name, signature, language}
     extensions.json  -- {extname, version, schema}
   ```
   This is generated by a read-only script (added in Step 2 deliverable). It is the diff baseline for every later step.

### Step 2 — Establish migration tracking (smallest possible additive change, but **still requires confirmation**)

- [ ] **User confirmation required.** This step writes to the DB.
- The Supabase tracking schema/table is purely additive and side-effect-free. SQL to apply (idempotent):
  ```sql
  CREATE SCHEMA IF NOT EXISTS supabase_migrations;
  CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version     text PRIMARY KEY,
    statements  text[],
    name        text,
    inserted_at timestamptz NOT NULL DEFAULT now()
  );
  COMMENT ON TABLE supabase_migrations.schema_migrations IS
    'Created 2026-04-18 by db-state-audit recovery plan (Phase 1 follow-up).';
  ```
- **Rollback:** `DROP TABLE supabase_migrations.schema_migrations; DROP SCHEMA supabase_migrations;` (no data loss; nothing else depends on it).

### Step 3 — Build the baseline-stamp ledger (no DB writes; fully reviewable)

For each of the 709 files in `supabase/migrations/`, classify as one of:

- `APPLIED` — the file's effect is already present in the live DB (e.g. its `CREATE TABLE x` matches an existing table).
- `PENDING` — the file's effect is missing (e.g. it `CREATE SCHEMA orbit` and that schema does not exist).
- `PARTIAL` — some statements applied, some not (must be split or hand-rewritten).
- `OBSOLETE` — superseded by a later file in the corpus (drop from execution plan).

Output: `docs/db-snapshots/<ts>/migration-ledger.csv` with columns
`version, file, classification, evidence, decision`.

This step is **read-only** and produces the artifact reviewers will sign off on. No DB writes.

### Step 4 — Dry-run unapplied migrations against a shadow DB (no prod writes)

- [ ] **User confirmation required to provision a shadow DB** (Supabase branch DB, restored from the dump in Step 1, or a local container).
- For every `PENDING` / `PARTIAL` migration in ledger order, execute inside a single transaction with `ROLLBACK` at the end. Capture:
  - SQL statements that would run
  - errors / conflicts (e.g. column already exists, FK to missing parent)
  - estimated row impact (`EXPLAIN` for any DML)
- Output: `docs/db-snapshots/<ts>/dry-run-report.md` per migration, with green/yellow/red status.

### Step 5 — Apply baseline stamps to prod (only `APPLIED` rows; still no schema change)

- [ ] **User confirmation required.** This step writes to the DB.
- For every `APPLIED` row from the ledger:
  ```sql
  INSERT INTO supabase_migrations.schema_migrations (version, name)
  VALUES ('20260225233034', 'fc482199-…')
  ON CONFLICT (version) DO NOTHING;
  ```
- Wrapped in one transaction; pure metadata writes; no schema/data touched.
- **Rollback:** `DELETE FROM supabase_migrations.schema_migrations WHERE inserted_at >= '<run start>';`

### Step 6 — Apply `PENDING` migrations one-by-one with per-file confirmation

- [ ] **User confirmation required for each migration**, or a single batch confirmation with the dry-run report attached.
- Apply order: strict timestamp ascending.
- Each apply runs:
  1. `BEGIN;`
  2. the migration body
  3. `INSERT INTO supabase_migrations.schema_migrations …`
  4. `COMMIT;` (or `ROLLBACK;` on any error)
- After each apply: re-run the structural snapshot script (Step 1.3) and diff against the previous snapshot. The diff is the change-record for that migration.
- **Rollback:** for each migration, the dry-run output (Step 4) includes the inverse statements (e.g. `DROP SCHEMA orbit CASCADE` paired with `CREATE SCHEMA orbit`). For non-trivial migrations the rollback is "restore from PITR / dump".

### Step 7 — Schema-drift CI guard (additive, no risk)

Add a CI check that, on every PR:
1. Lists schemas from prod via Management API.
2. Compares against `[api].schemas` in `config.toml` and against `CREATE SCHEMA …` statements in the migration corpus.
3. Fails the build if drift is detected.

This prevents the situation that produced this audit from recurring.

### Step 8 — Tear-down of incidental clutter

- Delete generated `*.timestamp-*.mjs` files from `vite.config.ts` neighbours after build (already managed by Vite, just noting).
- No DB action.

---

## 6. What I will NOT do without explicit confirmation

- Will not run `CREATE SCHEMA …` against prod.
- Will not apply any migration file against prod.
- Will not insert any rows (including baseline stamps) into `supabase_migrations.schema_migrations`.
- Will not drop, alter, or rename any object in prod.
- Will not change RLS policies, grants, or roles.

The only writes I have done so far are zero. This document is a read-only deliverable.

---

## 7. Open questions for the user (need answers before Step 2 onward)

1. **Backup channel:** Do you have shell access from a host with IPv4 to run `pg_dump`, or do you want me to drive a logical dump through the Management API in chunks? (PITR alone is acceptable but slower to restore from.)
2. **Shadow DB:** Are we OK to spin up a Supabase **Branch** for shadow dry-runs (recommended), or should we use a local container restored from the dump?
3. **Domain-split intent:** Is the intent still to migrate `public.orbit_*`, `public.wallet_*`, etc. into their `orbit`, `wallet` … schemas with compat views? If yes, this is a multi-week effort that should be its own task, not bundled with baseline stamping. If no, we should remove the unused schemas from `config.toml` to stop misleading future readers.
4. **Apply cadence:** Per-migration confirmation (slow, safest) vs. one batch confirmation backed by the dry-run report (faster, still safe)?

---

## 8. Artifacts produced by this audit

| File | Purpose |
|---|---|
| `docs/db-state-audit.md` | This report. |
| (next, on confirmation) `scripts/db-snapshot.mjs` | Read-only snapshotter that emits `docs/db-snapshots/<ts>/*.json`. |
| (next, on confirmation) `scripts/db-classify-migrations.mjs` | Reads `supabase/migrations/*.sql` + a fresh snapshot, emits `migration-ledger.csv`. |
| (next, on confirmation) `scripts/db-dry-run.mjs` | Runs a `PENDING` migration in a transaction with ROLLBACK, captures the diff. |
| (next, on confirmation) `.github/workflows/db-drift-check.yml` | CI guard for schema drift. |

None of those scripts exist yet — they are the deliverables of the **next** task, gated on confirmation of the questions in §7.

# Database Recovery Plan — Live DB as Source of Truth

**Date:** 2026-04-18
**Project:** easy-locs (Supabase ref `ifvuvbolrmuuugtzxsfk`, ap-southeast-1, Postgres 17.6.1, ACTIVE_HEALTHY)
**Status of this document:** PLAN ONLY — zero execution, zero DB writes.
**Companion:** `docs/db-state-audit.md` (Phase-1 follow-up audit, read-only findings).

---

## 0. Operating principles (hard constraints)

These are the **non-negotiable** rules for every step in this plan. They are stated up front so that any future agent or operator can be held to them.

1. **The live database is the canonical source of truth.** The 709 files in `supabase/migrations/` are treated as *historical documentation*, not as the schema definition. Where the corpus disagrees with the live DB, **the live DB wins**.
2. **Zero execution in this document.** Nothing here applies anything. Producing the artifacts below is itself the next task; even those artifacts are read-only until a separate, gated, confirmed apply task runs them.
3. **No migration execution.** No `supabase db push`, no `psql -f migration.sql`, no Studio SQL editor "run".
4. **No schema changes.** No `CREATE`, `ALTER`, `DROP` against any object.
5. **No writes to the database.** Including no inserts into a future `supabase_migrations.schema_migrations` table. Tracking-table creation is itself a future, gated, confirmed step.
6. **No "apply pending migrations".** The notion of a "pending migration list" is replaced by the new model: *historical files are archived; future change is expressed as forward migrations against the new baseline.*
7. **Every future step requires explicit user confirmation** before it runs, and every step has a documented rollback or a documented "irreversible — restore from PITR" marker.

---

## 1. Mental model: "freeze + fork"

```
                       ┌─────────────────────────────┐
                       │  LIVE DB  (canonical truth) │
                       │  619 tables, 690 policies   │
                       │  41 fns, 6 ext, 32 MB       │
                       └──────────────┬──────────────┘
                                      │ (read-only introspection)
                                      ▼
                ┌─────────────────────────────────────────┐
                │  BASELINE artifact (generated, frozen)  │
                │  supabase/migrations/                   │
                │    20260418000000_baseline.sql          │
                │    20260418000000_baseline.policies.sql │
                │    20260418000000_baseline.functions.sql│
                │    20260418000000_baseline.grants.sql   │
                │  supabase/migrations/_archive/          │
                │    <709 historical files moved here>    │
                └──────────────┬──────────────────────────┘
                               │ (forward changes only)
                               ▼
                  ┌─────────────────────────────┐
                  │  Future migrations          │
                  │  20260419HHMMSS_<change>.sql│
                  │  20260420HHMMSS_<change>.sql│
                  └─────────────────────────────┘
```

Two ideas:

- **Freeze:** declare a single baseline that exactly mirrors the live DB. The 709 historical files are *archived in place*, untouched, never re-run. They remain in git for audit.
- **Fork:** from the baseline forward, schema change is done in small, reviewed, dated migrations against the baseline. The very first such migration (after baseline) only creates the tracking table.

This avoids the catastrophic "force-apply 709 files" path entirely.

---

## 2. Step-by-step recovery plan

Every step is gated. The "Gate" line states what the operator must confirm in writing before the step runs.

### Step R0 — Read-only audit refresh (no changes)
- **Gate:** none (read-only).
- Actions: re-run `docs/db-state-audit.md` snapshot, write `docs/db-snapshots/<UTC-ts>/{schemas,tables,columns,indexes,policies,functions,extensions,triggers,sequences,types,grants}.json`. Compare against the previous snapshot; abort the recovery sequence if the live DB has materially changed since the audit (drift indicator).
- **Rollback:** N/A (read-only).
- **Output:** dated snapshot directory; drift report.

### Step R1 — Backup baseline (REQUIRED prerequisite, no DB writes)
- **Gate:** user confirms backup channel and storage destination.
- Actions: see §4 (Backup + PITR strategy). Produces:
  - `easy-locs-<UTC-date>.dump` (custom-format `pg_dump`, off-project storage),
  - `easy-locs-<UTC-date>.schema.sql` (`pg_dump --schema-only`),
  - `easy-locs-<UTC-date>.checksum.txt` (SHA-256 of both),
  - `pg_restore --list` verification log,
  - PITR confirmation screenshot / API response capturing the WAL retention window and the most-recent automated backup timestamp.
- **Rollback:** N/A — this step only reads from prod and writes to off-project storage. Failure mode is "backup unverifiable" → STOP entire plan.
- **Output:** backup manifest in a private store; checksum manifest committed to repo (no secrets, hashes only).

### Step R2 — Generate baseline migration FROM the live DB (no DB writes)
- **Gate:** user confirms backup is verified (Step R1 complete).
- Actions: see §3 (Baseline migration generation strategy). Produces a single, dated, ordered set of SQL files under `supabase/migrations/20260418000000_baseline.*.sql` that, applied to an empty Postgres 17 cluster, **reproduce the live DB's schema, policies, functions, grants, and extensions** (data is never in baseline; data lives in backups + replication).
- **Rollback:** delete the generated files (no DB impact).
- **Output:** baseline files (committed to repo, **but not applied**); a generated `docs/db-snapshots/<ts>/baseline-vs-live.diff.md` proving zero diff.

### Step R3 — Archive historical migrations in repo (no DB writes)
- **Gate:** user confirms baseline-vs-live diff is empty.
- Actions:
  - Move the 709 files from `supabase/migrations/*.sql` into `supabase/migrations/_archive/<original-filename>`.
  - Add `supabase/migrations/_archive/README.md` describing why they are frozen, the date of freeze, and the rule "never re-run; never edit; new changes go in `supabase/migrations/` against the baseline".
  - Add a CI check (`scripts/ci-no-archive-mutation.mjs`) that fails any PR that modifies a file under `_archive/`.
- **Rollback:** `git revert` the move commit (purely a repo change).
- **Output:** clean migrations directory with one baseline + zero historical clutter; immutable archive; CI guard.

### Step R4 — Provision a shadow database (no prod writes)
- **Gate:** user confirms which shadow channel to use.
- Options (pick one; **none** of them touches prod):
  - (preferred) **Supabase Branch DB** — restored from the Step R1 dump.
  - **Local Postgres 17** container — restored from the Step R1 dump.
  - **Throwaway Supabase project** in the same org/region — restored from the dump.
- Actions: restore the dump, run `psql -f` of the new baseline files against the **empty** shadow, then diff shadow vs prod to prove behavioural equivalence.
- **Rollback:** delete the shadow (it is by definition disposable).
- **Output:** "shadow vs prod equivalence" report.

### Step R5 — (Future, optional) Establish migration tracking on prod
- **Gate:** user confirms; this is the **first** write to prod in the entire sequence.
- Actions: create the empty `supabase_migrations.schema_migrations` table; insert exactly one row stamping the baseline as already applied (because it *is* — the live DB IS the baseline).
- **Rollback:** `DROP TABLE supabase_migrations.schema_migrations; DROP SCHEMA supabase_migrations;` — no data loss.
- **Output:** prod has a tracking table; future migrations have a home.

> Steps R5 and beyond are out of scope for this document. They are only listed so the rollback story is complete and the boundary between "this plan" and "future apply tasks" is unambiguous.

---

## 3. Baseline migration generation strategy

### 3.1 What the baseline must capture (definition of complete)

From the live DB, the generator must reproduce, in this order:

1. **Extensions** (with version, schema): `pg_graphql, pg_stat_statements, pgcrypto, plpgsql, supabase_vault, uuid-ossp`.
2. **Schemas** that are non-Supabase-managed (today: `public`, `system`).
3. **Custom enum types** and **domain types** in those schemas.
4. **Sequences** (with current ownership, but NOT current `last_value` — that is data).
5. **Tables** (column definitions, defaults, NOT NULL, generated columns, identity columns, table comments, column comments).
6. **Primary keys, unique constraints, check constraints** (named explicitly so future diffs are deterministic).
7. **Foreign keys** (deferred to a separate file, applied last, so circular FKs work).
8. **Indexes** (verbatim `pg_get_indexdef`).
9. **Triggers + trigger functions**.
10. **Functions / procedures** (verbatim `pg_get_functiondef`, including `SECURITY DEFINER`, `SET search_path`, owner).
11. **Views / materialized views** (none in `public` today, but include the step).
12. **RLS** — `ENABLE ROW LEVEL SECURITY` on every table that has it on prod (currently: 619/619).
13. **Policies** — verbatim `pg_get_policydef`-equivalent reconstruction (we currently have 690 of them).
14. **Grants** — `GRANT ... ON ... TO {anon, authenticated, service_role}`.
15. **Comments** — `COMMENT ON ...` for tables, columns, functions, policies that have them on prod.

**Explicitly excluded** from baseline: all `auth.*`, `storage.*`, `realtime.*`, `vault.*`, `extensions.*`, `pg_*`, `information_schema.*`, `supabase_*` schemas. These are managed by Supabase and recreated automatically per-project. Including them would break shadow restores.

**Explicitly excluded**: data. The baseline is schema-only. Data is owned by the dump in Step R1.

### 3.2 How to generate (channel choice)

Two equivalent paths; the operator picks whichever is reachable in the moment:

- **(A) `pg_dump --schema-only --no-owner --no-privileges`** from a host with IPv4/IPv6 reachability to `db.<ref>.supabase.co`. This is the gold-standard generator. Output is then split into the file-set of §3.3 with a small post-processor (`scripts/db-baseline-split.mjs`).
- **(B) Management-API-driven introspection** using the same SQL endpoint we used for the audit. The script (`scripts/db-baseline-from-api.mjs`) issues a fixed catalogue of read-only queries (`pg_get_tabledef` does not exist, so we synthesise using `information_schema` + `pg_get_indexdef` + `pg_get_functiondef` + `pg_policies` + `pg_constraint`). Same output file-set.

Both paths produce **identical-by-construction** SQL that can be diffed; if they diverge, that itself is a bug in the generator and must be fixed before R3.

### 3.3 Output file layout (committed to repo)

```
supabase/migrations/
  20260418000000_baseline_00_extensions.sql
  20260418000000_baseline_01_schemas.sql
  20260418000000_baseline_02_types.sql
  20260418000000_baseline_03_sequences.sql
  20260418000000_baseline_04_tables.sql
  20260418000000_baseline_05_constraints_pk_uq_chk.sql
  20260418000000_baseline_06_indexes.sql
  20260418000000_baseline_07_functions.sql
  20260418000000_baseline_08_triggers.sql
  20260418000000_baseline_09_views.sql
  20260418000000_baseline_10_rls_enable.sql
  20260418000000_baseline_11_policies.sql
  20260418000000_baseline_12_grants.sql
  20260418000000_baseline_13_constraints_fk.sql
  20260418000000_baseline_14_comments.sql
  _archive/                  ← Step R3 moves the 709 historical files here
```

All files share one timestamp (`20260418000000`) so the supabase CLI treats them as a single logical migration when tracking is later turned on.

### 3.4 Acceptance test (mandatory before R3)

Generated baseline is accepted iff:
1. `psql -f` of the file-set against an empty Postgres 17 cluster succeeds with **zero errors and zero warnings**.
2. The introspection snapshot (Step R0 schema/tables/columns/indexes/policies/functions/extensions JSONs) of the shadow after baseline apply is **byte-identical** to the prod snapshot, modulo:
   - object oids (always different),
   - sequence `last_value` (always different and intentionally excluded),
   - Supabase-managed schemas (excluded by construction).
3. A spot-check: 10 randomly chosen RLS policies have identical `qual` and `with_check` between prod and shadow.

Failure of any item ⇒ baseline is rejected, generator is fixed, regenerate. Never proceed to R3 with a known-bad baseline.

### 3.5 Why this is safe

- Live DB is touched read-only; no `pg_dump` flag used here writes back.
- Repo files are pure SQL text; reviewers can read every line.
- Diff against prod is mechanical and auditable.
- Archive of the 709 files preserves history forever — nothing is deleted.

---

## 4. Backup + PITR strategy (must be in place before any future write)

### 4.1 Three-layer backup

| Layer | What it captures | Frequency | Retention | Restore time | Owner |
|---|---|---|---|---|---|
| **L1 — Logical dump** (`pg_dump --format=custom`) | Full schema + data, restorable to any Postgres 17 | On-demand before each gated write step (R5+); also nightly via CI | 90 days off-project (S3/Drive) + 1 yr cold storage | minutes (32 MB DB) | DB owner |
| **L2 — Supabase automated daily backup** | Same as L1 but managed by Supabase | Daily | Plan-defined (Pro: 7 d, Team: 14 d, Enterprise: 28 d) | minutes | Supabase |
| **L3 — PITR (Point-in-Time Recovery)** | WAL stream, restore to any second within the retention window | Continuous | Plan-defined (Pro PITR add-on: 7 d, configurable up to 28 d) | tens of minutes | Supabase |

**Mandatory:** before any step that writes to prod (R5 onward), **all three layers must be green** within the previous 24 hours, and the L1 dump must be **verifiably restorable** (proven by a `pg_restore --list` and a sample restore to the shadow DB).

### 4.2 PITR enablement check (read-only verification before each write step)

```
GET https://api.supabase.com/v1/projects/{ref}/database/backups
  Authorization: Bearer $SUPABASE_ACCESS_TOKEN
```

Acceptance: response shows `pitr_enabled: true` and a fresh (≤24 h) physical backup. If either is missing:
- **STOP**, do not proceed.
- Surface to the user with a one-click "enable PITR" link in the dashboard.

### 4.3 Backup secrets handling

- Backup files contain a full copy of the data. They are treated as the most sensitive artifact in the project.
- They live **outside the git repo**, in encrypted storage with access logged.
- Only checksums (SHA-256) are committed to the repo.
- Backup files are rotated and deleted on schedule per §4.1.

---

## 5. Public → domain schemas normalization plan (DESIGN ONLY)

> This is the long-form plan for moving `public.orbit_*`, `public.wallet_*`, `public.marketplace_*`, etc. into their declared domain schemas (`orbit`, `wallet`, `marketplace`, `commerce`, `property`, `onboarding`, `support`, `notification`, `analytics`, `identity`). It is presented here so the risk map (§6) has something concrete to bind to. **Nothing in §5 executes.**

### 5.1 Inventory of in-scope tables (from §1 audit)

| Domain | Prefix(es) in `public` today | Approx. table count | Has compat-view need? |
|---|---|---|---|
| `orbit` | `orbit_*` | ~12 | Yes — heavy app reads |
| `wallet` | `wallet_*`, `wallets`, `wallets_v2` | ~17 | Yes — financial reads |
| `marketplace` | `marketplace_*` | ~28 | Yes — listings reads |
| `commerce` | `orders`, `order_*`, `payments`, `payment_*`, `pos_orders`, `coupons`, `pricing_*` | ~35 | Yes |
| `property` | `properties`, `property_*`, `tenants`, `tenant_*`, `leases`, `landlord_*`, `owner_*` | ~25 | Yes |
| `onboarding` | `onboarding_*`, `merchant_onboarding_*` | ~14 | Medium |
| `support` | `support_*`, `incident_*`, `audit_*` | ~12 | Low |
| `notification` | `notifications`, `notification_*` | ~6 | Yes |
| `analytics` | `*_events`, `*_kpi_*`, `*_snapshots`, `vw_*` | ~30 | Yes |
| `identity` | `profiles`, `user_*`, `org_*`, `core_profiles`, `core_identity_*` | ~30 | **HIGHEST** — used everywhere |

(Numbers are approximate from prefix grep over the 619-table list in the audit; exact mapping is part of the next task's deliverable, not this one.)

### 5.2 Normalisation pattern (per table)

For each table `public.X` that should move to `<domain>.Y` (Y often equals X minus the prefix):

```
-- 1. Create destination schema (idempotent)
CREATE SCHEMA IF NOT EXISTS <domain>;

-- 2. Move the table (preserves data, oids, indexes, constraints, policies)
ALTER TABLE public.X SET SCHEMA <domain>;
ALTER TABLE <domain>.X RENAME TO Y;

-- 3. Re-create a compat view in public so existing code keeps working
CREATE VIEW public.X AS SELECT * FROM <domain>.Y;

-- 4. Re-grant on the view to anon/authenticated/service_role to match
--    the old table grants (PostgREST cares).

-- 5. Re-create RLS / SECURITY INVOKER on the view as needed.
```

**Critical:** RLS does **not** apply through views by default. To preserve security, every compat view must be `SECURITY INVOKER` and the underlying table's RLS policies must remain authoritative. Skipping this is the single biggest foot-gun of the whole normalisation; it must be lint-checked in CI before any apply.

### 5.3 Phasing

The plan is split into **independent waves** so each can be reverted without unwinding the others:

| Wave | Domains | Rationale |
|---|---|---|
| W1 | `analytics`, `notification` | Lowest read coupling; safest first; proves the pattern. |
| W2 | `support`, `onboarding` | Medium coupling; admin-only readers tolerate brief drift. |
| W3 | `marketplace`, `commerce`, `property` | High read volume but well-bounded. Big test surface. |
| W4 | `wallet` | Financial; must run inside an explicit maintenance window with extra audits. |
| W5 | `orbit`, `identity` | Most-coupled; touches auth and presence. Last on purpose. |

Each wave is itself a 5-step gated sequence (snapshot → dry-run on shadow → diff → review → apply on prod inside maintenance window with PITR fresh).

### 5.4 What does NOT change in normalisation

- Column names, types, defaults, constraints — preserved.
- RLS policies — preserved (move with the table).
- Foreign keys — preserved.
- Data — preserved (no copy, `SET SCHEMA` is metadata-only).
- Application code paths via `public.X` — preserved through compat views in §5.2 step 3, until a separate, much later, deprecation task removes the views and updates code to read from `<domain>.Y` directly.

---

## 6. Risk map for schema restructuring

For each risk: probability, blast radius, detection, mitigation, rollback.

### R-1: PostgREST exposes wrong objects after schema move
- **Probability:** Medium.
- **Blast radius:** Whole API surface of moved tables — clients see 404 or wrong columns.
- **Detection:** Pre-apply lint of `config.toml [api].schemas` + post-apply smoke test hitting `/rest/v1/<domain>.<table>` and the legacy `/rest/v1/<table>` view.
- **Mitigation:** Compat views in `public` (§5.2 step 3) preserve legacy paths. Ensure `<domain>` is in `[api].schemas` *before* the move, not after.
- **Rollback:** `ALTER VIEW public.X RENAME ... ; ALTER TABLE <domain>.Y SET SCHEMA public; ALTER TABLE public.Y RENAME TO X;` (metadata-only). Or PITR for the worst case.

### R-2: RLS effectively disabled by `SECURITY DEFINER` view
- **Probability:** High if not lint-checked.
- **Blast radius:** Catastrophic — silently exposes private rows.
- **Detection:** CI check that every compat view in `public` is `SECURITY INVOKER` and that the underlying table has `rowsecurity=true`. Manual audit + a test using the anon key against each compat view confirming row-count parity (or zero) with a known authenticated user.
- **Mitigation:** Default-deny in the generator; explicit `WITH (security_invoker = true)`.
- **Rollback:** drop offending view immediately; restore table to `public` schema.

### R-3: Foreign keys break across schemas
- **Probability:** Low (cross-schema FKs are valid in Postgres) but easy to miss in policies/views.
- **Blast radius:** Inserts/updates fail with FK violation.
- **Detection:** Shadow-DB apply + full integration test suite + `pg_constraint` diff before/after.
- **Mitigation:** Move tables in dependency order (parents first). Generator emits dependency graph and the apply order obeys it.
- **Rollback:** reverse-order `SET SCHEMA` back to `public`.

### R-4: Indexes / triggers silently dropped during rename
- **Probability:** Low (`SET SCHEMA` preserves them) but possible if a script uses `CREATE TABLE … AS` instead.
- **Blast radius:** Performance collapse, missing audit rows.
- **Detection:** Snapshot diff (Step R0) before/after must show identical index and trigger sets, only with new schema names.
- **Mitigation:** Forbid `CREATE TABLE AS` in the generator; only `SET SCHEMA` + `RENAME`.
- **Rollback:** restore from PITR (indexes are easier to recreate than data).

### R-5: Sequences detached from owning column
- **Probability:** Low.
- **Blast radius:** Next insert fails or starts duplicating IDs.
- **Detection:** `pg_get_serial_sequence` for every identity column post-apply, expected to return a non-null result.
- **Mitigation:** Move sequences with their tables (`ALTER SEQUENCE … SET SCHEMA …`) in the same transaction as the table move.
- **Rollback:** `ALTER SEQUENCE … OWNED BY <domain>.Y.id` re-bind.

### R-6: Edge functions / RPCs reference `public.X` by `SET search_path` and stop resolving
- **Probability:** Medium.
- **Blast radius:** Edge functions error on every call.
- **Detection:** grep over `supabase/functions/**/*.ts` for `.from('X')` and `SET search_path` strings.
- **Mitigation:** Compat views (§5.2 step 3) keep the old name resolvable in `public`. Functions continue to work without code change.
- **Rollback:** revert the schema move.

### R-7: Realtime subscriptions silently drop
- **Probability:** Medium — Supabase Realtime is keyed by `<schema>.<table>`.
- **Blast radius:** Live UI features go stale (chat, presence, orders).
- **Detection:** Post-apply smoke test that subscribes to the legacy `public.X` channel and confirms a test insert produces an event.
- **Mitigation:** Add the new `<domain>.Y` to the realtime publication **before** moving, and keep the old `public.X` view in the publication if Realtime supports view-based publications (it does not, on most versions — so the smoke test is the gate).
- **Rollback:** revert the schema move; resubscribe.

### R-8: Storage bucket / vault grants broken
- **Probability:** Low (storage and vault live in their own schemas, untouched).
- **Blast radius:** None expected. Listed for completeness.
- **Detection:** Smoke test against `storage.objects` and a `vault.secrets` read.
- **Rollback:** N/A.

### R-9: Long-running migrations lock prod tables
- **Probability:** Low for `SET SCHEMA` (metadata-only, fast), High if anyone substitutes `INSERT INTO new SELECT * FROM old` (do not allow).
- **Blast radius:** App downtime.
- **Detection:** Each wave runs inside a maintenance window with a `statement_timeout` set on the apply session.
- **Mitigation:** Generator forbids data-copy patterns; only metadata moves.
- **Rollback:** `pg_terminate_backend` on the migration session, then PITR if needed.

### R-10: CI / repo drift (someone edits a file in `_archive/` or hand-writes a forward migration that conflicts with baseline)
- **Probability:** Medium over time.
- **Blast radius:** Future apply attempts fail or, worse, half-apply.
- **Detection:** CI guards added in Step R3 (`scripts/ci-no-archive-mutation.mjs`) and a new `scripts/ci-baseline-integrity.mjs` that fails any PR whose forward migration redefines an object the baseline already created.
- **Mitigation:** Same CI guards; PR template checklist.
- **Rollback:** revert the offending PR.

### R-11: Backup invalid / unreadable when needed
- **Probability:** Low if §4 is followed; Catastrophic if not.
- **Blast radius:** No recovery path if a write step fails.
- **Detection:** Every backup is verified by `pg_restore --list` and a sample restore to the shadow. Hash committed to repo.
- **Mitigation:** Three layers (§4.1). PITR as last resort.
- **Rollback:** N/A — this *is* the rollback.

---

## 7. Rollback strategy (for every future step, in one place)

| Step | Rollback procedure | Restore time |
|---|---|---|
| R0 — read-only audit refresh | None needed. | N/A |
| R1 — backup | Backup itself is the rollback for everything below. | minutes |
| R2 — generate baseline files | `git revert` the commit. | seconds |
| R3 — archive 709 files | `git revert` the commit. | seconds |
| R4 — provision shadow | Delete the shadow project / container. | minutes |
| R5 — create tracking table on prod | `DROP TABLE supabase_migrations.schema_migrations; DROP SCHEMA supabase_migrations;` | seconds |
| Future apply (per wave §5.3) | (a) Pre-apply: run is in a transaction; failure → automatic `ROLLBACK`. (b) Post-apply: reverse-order `ALTER … SET SCHEMA public` + drop compat views. (c) Worst-case: PITR restore to the timestamp captured immediately before the apply session started. | seconds → tens of minutes |

The "apply session timestamp" is captured by the apply runner and printed at the start of each session so that a PITR restore target is always known precisely.

---

## 8. Artifacts produced by this plan (deliverables for the *next* gated task)

None of these files exist yet. Each will be created by the next task, **only after** user confirmation on §9.

| Path | Purpose | Read or write? |
|---|---|---|
| `scripts/db-snapshot.mjs` | Read-only snapshotter (Step R0). | Read |
| `scripts/db-backup.mjs` | Backup orchestrator + verifier (Step R1). | Read prod, write off-project |
| `scripts/db-baseline-from-pgdump.mjs` | Path A baseline generator (Step R2). | Read |
| `scripts/db-baseline-from-api.mjs` | Path B baseline generator (Step R2). | Read |
| `scripts/db-baseline-split.mjs` | Splits dump into the §3.3 file-set. | Local file IO |
| `scripts/db-baseline-shadow-verify.mjs` | Restores baseline to shadow + diffs (Step R4 acceptance). | Shadow only |
| `scripts/ci-no-archive-mutation.mjs` | CI guard (Step R3). | Repo only |
| `scripts/ci-baseline-integrity.mjs` | CI guard (Step R10 mitigation). | Repo only |
| `supabase/migrations/20260418000000_baseline_*.sql` | The baseline file-set (Step R2 output). | Repo only |
| `supabase/migrations/_archive/` | Frozen historical files (Step R3 output). | Repo only |
| `docs/db-snapshots/<ts>/*.json` | Periodic structural snapshots. | Repo only |
| `docs/db-snapshots/<ts>/baseline-vs-live.diff.md` | Acceptance test output for Step R2. | Repo only |

---

## 9. Open questions that gate the next task

These must be answered before any of §8 is built.

1. **Backup channel.** Do we have a host with IPv4 reachability to `db.<ref>.supabase.co` for `pg_dump`, or do we proceed with the Management-API-only path (slower but works from this workspace)?
2. **PITR plan.** Is PITR currently enabled on the project? If not, will the user enable it (paid add-on) before R5?
3. **Shadow channel.** OK to use a Supabase **Branch** for shadow restores (recommended), or prefer a local Postgres 17 container?
4. **Domain-split intent.** Confirm that the long-term plan is the public→domain split per §5. If the user instead wants to **keep everything in `public`**, then §5 is dropped from the plan and `config.toml [api].schemas` is reduced to `["public", "system"]` in a separate, small task (no DB writes, just config + a CI assertion).
5. **Apply cadence (future).** Per-wave confirmation (slow, safest) vs. per-domain confirmation (faster) vs. single batch (fastest, riskiest)?

---

## 10. What this document explicitly does NOT do

- Does not run `pg_dump`.
- Does not introspect the live DB (the audit in `docs/db-state-audit.md` already did that, and §0 forbids new writes; the "Step R0 refresh" is itself part of the *next* task, not this document).
- Does not create, alter, or drop any DB object.
- Does not move any file in the repo (`_archive/` is a planned destination, not yet created).
- Does not enable PITR or change project settings.
- Does not propose follow-up tasks beyond what is already filed (#1047 is the umbrella execution task and remains the right home for this work).

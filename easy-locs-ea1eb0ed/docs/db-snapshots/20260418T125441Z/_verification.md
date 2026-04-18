# R0 Snapshot — Verification Report

**Snapshot ID:** `20260418T125441Z`
**Source:** Supabase project `ifvuvbolrmuuugtzxsfk` (ap-southeast-1, Postgres 17.6)
**Channel used:** Supabase Management API SQL endpoint (`SELECT`-only)
**Writes performed:** **0** (read-only)
**Status:** ✅ snapshot complete · ❌ backup gate **NOT MET** (see Q2 blocker)

---

## 1. Snapshot artifacts produced

Directory: `easy-locs-ea1eb0ed/docs/db-snapshots/20260418T125441Z/`

| File | Rows | Size |
|---|---:|---:|
| `_summary.json` | — | 685 B |
| `meta.json` | 1 | 287 B |
| `schemas.json` | 13 | 518 B |
| `extensions.json` | 6 | 547 B |
| `tables.json` | 621 | 70 KB |
| `columns.json` | 8,203 | 3.2 MB |
| `constraints.json` | 614 | 100 KB |
| `indexes.json` | 615 | 136 KB |
| `policies.json` | 694 | 160 KB |
| `functions.json` | 52 | 14 KB |
| `triggers.json` | 4 | 1 KB |
| `sequences.json` | 0 | 3 B |
| `views.json` | 0 | 3 B |
| `enums.json` | 3 | 412 B |
| `grants.json` | 17,356 | 2.5 MB |
| `counts.json` | 1 | 148 B |

Total ~6.3 MB of structural metadata. No data rows captured. No secrets captured.

---

## 2. Verification checks

### 2.1 Internal consistency

| Check | Expected | Observed | Pass? |
|---|---|---|---|
| `counts.tables` matches `tables.json` rows | equal | 621 = 621 | ✅ |
| `counts.indexes` matches `indexes.json` rows | equal | 615 = 615 | ✅ |
| `counts.policies` matches `policies.json` rows | equal | 694 = 694 | ✅ |
| `counts.triggers` matches `triggers.json` rows | equal | 4 = 4 | ✅ |
| `counts.extensions` matches `extensions.json` rows | equal | 6 = 6 | ✅ |
| Every `tables.json` row has rls_enabled = true | 100% | 621/621 | ✅ |
| All app schemas (`public`, `system`) present | yes | yes | ✅ |
| No domain schemas (`identity`, `wallet`, …) present in DB | confirms audit | confirmed | ✅ |

### 2.2 Drift since previous audit (2026-04-18 ~12:30Z)

| Metric | Audit (12:30Z) | R0 snapshot (12:54Z) | Delta |
|---|---:|---:|---:|
| `public.*` BASE TABLES | 619 | 619 | 0 |
| `public.*` + `system.*` BASE TABLES | 621 | 621 | 0 |
| Functions in `public` + `system` | 41 (`public` only) | 52 (incl. `system`) | +11 (audit query was `public`-only) |
| Indexes in app schemas | 601 | 615 | +14 (system + new from drift) |
| Policies in app schemas | 690 | 694 | +4 |
| RLS-enabled tables | 619 / 619 | 621 / 621 | +2 |

**Interpretation:** the small deltas are explained by (a) the audit only counted `public`, while R0 counts `public` + `system`, and (b) Supabase platform may install background objects on the project. **No table dropped, no index dropped, no policy dropped.** Drift is additive only and within expected bounds. ✅

### 2.3 Channel integrity

| Check | Result |
|---|---|
| All 15 SQL queries executed via Management API | ✅ HTTP 200, valid JSON |
| Zero `INSERT`/`UPDATE`/`DELETE`/`CREATE`/`ALTER`/`DROP` statements issued | ✅ verified by reading `scripts/db-snapshot.mjs` |
| No credentials written to disk | ✅ env vars only, never echoed |
| Snapshot files contain no secrets | ✅ pure structural metadata |

### 2.4 Backup-readiness probe (read-only)

Endpoint: `GET https://api.supabase.com/v1/projects/ifvuvbolrmuuugtzxsfk/database/backups`

```json
{
  "region": "ap-southeast-1",
  "pitr_enabled": false,
  "walg_enabled": true,
  "backups": [],
  "physical_backup_data": {}
}
```

| Layer | Required by recovery plan §4 | Observed | Pass? |
|---|---|---|---|
| L1 — Logical dump (`pg_dump`) | Verified, off-project | not yet produced | ❌ |
| L2 — Supabase automated daily backup | ≤24 h, present | `backups: []` (none) | ❌ |
| L3 — PITR | enabled, fresh WAL | `pitr_enabled: false` | ❌ |

**All three backup layers are MISSING.** This is the gating finding for Q2.

---

## 3. Answers to the §9 open questions

### Q1 — Backup channel
**Answer (verified):** This workspace **cannot** run `pg_dump` against `db.ifvuvbolrmuuugtzxsfk.supabase.co`. Direct connection is IPv6-only and the network path is unreachable; the pooler rejects credentials with "Tenant or user not found". The Management API SQL endpoint works and was used for R0, but it is not a substitute for `pg_dump` (no per-row COPY, no consistent snapshot guarantee across statements).
**Required action by user:** run `pg_dump` from a host that *does* have IPv4/IPv6 reachability to Supabase (a developer laptop, a CI runner with IPv4, or Supabase's own dashboard SQL export). Until then, the recovery plan **cannot advance past R0**.

### Q2 — PITR plan ⛔ **HARD BLOCKER**
**Answer (verified via Management API):** PITR is **disabled**, **zero** automated backups currently exist on the project (`backups: []`). WAL-G is on at the cluster level, but no recovery target is reachable today.
**Blocker statement (verbatim, for issue tracking):**

> **DB-RECOVERY-BLOCKER-Q2 (2026-04-18):** Supabase project `ifvuvbolrmuuugtzxsfk` has `pitr_enabled = false` and zero entries in the automated `backups` array. No Recovery-Point-Objective (RPO) and no Recovery-Time-Objective (RTO) can be guaranteed. Per the approved recovery plan §0 rule 7 and §4.1, **no production write step (R5 onward) may be authorized** until: (a) a verified L1 logical dump exists off-project with checksum manifest, AND (b) Supabase automated daily backups are populated (≥1 entry ≤24 h old), AND (c) PITR is enabled with a documented WAL retention window. Enabling PITR requires a paid Supabase plan add-on; until that is purchased and applied, R5 stays gated.

### Q3 — Shadow channel
**Answer (verified):** Branching is unavailable on this project (`/v1/projects/<ref>/branches` returned `[]`). Shadow restores must therefore use either (a) a local Postgres 17 container restored from the Q1 dump (recommended), or (b) a separate throwaway Supabase project in the same org/region. Both options remain on the table; no decision needed until Q1 produces a dump.

### Q4 — Domain-split intent
**Open — pure product decision.** R0 cannot answer this. Recommend deferring until after R1–R3 (the baseline freeze does not depend on the answer; the normalization work in §5 of the plan does).

### Q5 — Apply cadence (future)
**Open — operator preference.** Recommend per-wave confirmation (per §5.3 of the plan) since R5+ remains gated for the foreseeable future by Q2.

---

## 4. What R0 explicitly did NOT do

- Did not write to the production database.
- Did not enable, configure, or change PITR or any backup setting.
- Did not produce any `pg_dump` (this workspace cannot reach the DB on TCP; that step must run elsewhere).
- Did not create the `supabase_migrations` tracking schema.
- Did not move the 709 historical migration files.
- Did not generate the baseline migration file-set (that is R2, after Q1+Q2 are resolved).

---

## 5. Authorized next step

**R1 — Backup baseline.** Per recovery plan §2 R1, this requires:

1. User picks the host that will run `pg_dump` (Q1 answer).
2. User authorizes the Q2 backup-strategy enablement work as a separate task (purchase PITR add-on if applicable, confirm Supabase daily backups populate).
3. Once both are in place, run `pg_dump --format=custom --no-owner --no-privileges`, store off-project, verify with `pg_restore --list`, commit only the SHA-256 manifest to the repo.

Until step 2 is done, **no production-write step is authorized.** R0 is the floor we hold at.

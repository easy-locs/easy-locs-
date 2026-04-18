# Backup & PITR Enablement — Verification Report

**Date:** 2026-04-18
**Project:** Easy-locs (`ifvuvbolrmuuugtzxsfk`, ap-southeast-1, Postgres 17.6.1)
**Org:** `bcwayraalnfjrubocyho` (slug `bcwayraalnfjrubocyho`, owner `jstarbuzz@gmail.com`)
**Task:** Enable automated backups + PITR; verify; unblock R5.
**Result:** ⛔ **CANNOT BE COMPLETED IN-WORKSPACE** — task requires paid plan upgrade and add-on purchase, both of which need explicit user billing authorization (credit-card consent on the Supabase dashboard or signed approval to call the billing API). **No production write performed. No money spent. No configuration changed.** R5 remains gated.

---

## 1. What I verified (read-only)

All facts below are pulled live from the Supabase Management API with `SUPABASE_ACCESS_TOKEN`. No writes.

### 1.1 Current backup posture
```
GET /v1/projects/ifvuvbolrmuuugtzxsfk/database/backups
{ "region": "ap-southeast-1",
  "pitr_enabled": false,
  "walg_enabled": true,
  "backups": [],
  "physical_backup_data": {} }
```
- `pitr_enabled = false`
- 0 automated backups exist
- WAL-G is on at the cluster level but no recovery target is reachable

### 1.2 Current org plan
```
GET /v1/organizations/bcwayraalnfjrubocyho
{ "id": "bcwayraalnfjrubocyho",
  "name": "easy-locs",
  "plan": "free",
  "opt_in_tags": [],
  "allowed_release_channels": ["ga","preview"] }
```
- **Org plan = `free`.**
- Free plan has **no automated daily backups**, **no PITR eligibility**, and **no IPv4** add-on eligibility for the database host.

### 1.3 Add-ons currently selected on the project
```
GET /v1/projects/ifvuvbolrmuuugtzxsfk/billing/addons
"selected_addons": []
```
- Zero add-ons purchased.

### 1.4 Add-ons available (PITR pricing)
From the same endpoint, `available_addons[*]` includes:

| Variant | Window | Price (USD) |
|---|---|---|
| `pitr_7`  | 7 days  | $100 / month |
| `pitr_14` | 14 days | $200 / month |
| `pitr_28` | 28 days | $400 / month |

Plus `ipv4_default` at $4 / month (relevant to §9 Q1 — `pg_dump` from this workspace).

### 1.5 Owner / authorization
```
GET /v1/organizations/bcwayraalnfjrubocyho/members
[{ "role_name": "Owner", "email": "jstarbuzz@gmail.com", ... }]
```
The token in this workspace belongs to the org Owner — billing actions are technically possible, but only with explicit user consent (see §3).

---

## 2. Why this is a hard gate

To meet the validation criteria of the task ("≥1 automated backup ≤24 h old, PITR=enabled, WAL retention confirmed"), **two paid changes are required, in order**:

1. **Upgrade org `bcwayraalnfjrubocyho` from Free → Pro.** This unlocks daily automated backups (7-day retention by default on Pro) and makes the PITR add-on purchasable. Pro plan minimum spend is ~$25/month (org-wide compute credit).
2. **Purchase the PITR add-on** at one of the three windows ($100, $200, or $400 / month). The recovery plan §4.1 recommends **at least `pitr_14`** so a typical maintenance window has comfortable rollback headroom.

Optional but recommended:
3. **IPv4 add-on** (`ipv4_default`, $4 / month) so a CI runner or laptop can `pg_dump` against `db.<ref>.supabase.co` reliably (resolves §9 Q1 properly).

**Rough monthly cost floor:** ~$25 (Pro base) + $100 (PITR 7 d) = **~$125 / month**, **per org**, ongoing. Higher with `pitr_14` ($225) or `pitr_28` ($425).

These are recurring charges to the user's credit card. I will not make them automatically. Without them, **automated backups will not exist and PITR cannot be enabled** — the task's validation criteria are mathematically unreachable.

---

## 3. What I would do, in order, if you authorize the spend

All three steps are gated. Each is reversible (Supabase pro-rates and you can downgrade), but **steps 1 and 2 will incur charges.**

### Step B1 — Upgrade org plan (charge: ~$25/mo + usage)
- Preferred path (no API calls from me): you click "Upgrade to Pro" in Supabase dashboard → Organization → Billing.
- Alternative path (I drive the API call, only with explicit "yes, charge"): `POST /v1/organizations/{slug}/billing/subscription` with `tier: "tier_pro"` (exact field set is documented per Supabase billing API; I would dry-run via `GET` first and surface the body for your sign-off before sending).
- **Verification after B1:** `GET /v1/organizations/bcwayraalnfjrubocyho` returns `"plan": "pro"`.

### Step B2 — Wait for first automated backup, then verify (no charge)
- After B1, Supabase begins nightly backups automatically.
- **Verification:** `GET /v1/projects/<ref>/database/backups` shows `backups: [...]` with at least one entry whose timestamp is < 24 h old. Capture the JSON to `docs/db-snapshots/<ts>/_backups.json` as proof.

### Step B3 — Purchase PITR add-on (charge: $100, $200, or $400 / mo)
- Preferred path: dashboard → Project → Settings → Add-ons → Point-In-Time Recovery → choose 7/14/28 days.
- Alternative path: `POST /v1/projects/<ref>/billing/addons` with `{ "addon_variant": "pitr_14" }` (or chosen variant). Same dry-run + sign-off rule.
- **Verification:**
  - `GET /v1/projects/<ref>/database/backups` shows `pitr_enabled: true` and a non-empty `physical_backup_data`.
  - `GET /v1/projects/<ref>/billing/addons` shows `pitr_*` in `selected_addons`.
- Capture both responses to `docs/db-snapshots/<ts>/_pitr.json`.

### Step B4 — Document the WAL retention window (no charge)
- Pull `physical_backup_data.earliest_physical_backup_data_in_utc` and `latest_physical_backup_data_in_utc` from the backups endpoint.
- Record the chosen retention (`backup_duration_days` from the add-on variant) in `docs/db-recovery-plan.md` §4 next to the L3 row.

### Step B5 — Validate restore procedure end-to-end on a shadow (no prod write)
- Restore the most recent automated backup into a throwaway shadow project (Supabase → Project → Backups → Restore to new project) **OR** `pg_restore` the L1 dump into a local Postgres 17 container.
- Run `scripts/db-snapshot.mjs` against the shadow, diff vs the prod snapshot. Record outcome in `docs/db-snapshots/<ts>/_restore-test.md`.
- Only after this step passes is the backup system "verified working" by the recovery plan's standard.

### Step B6 — Update the Q2 blocker
- Once B1–B5 are green, the DB-RECOVERY-BLOCKER-Q2 statement is rescinded by appending a "RESOLVED" entry with the verifying snapshot ID. **Only at that point may R5 be authorized**, and even then R5 still needs its own explicit go-ahead per the recovery plan §0 rule 7.

---

## 4. Validation criteria — current state

| Criterion (from task) | State | Gate |
|---|---|---|
| ≥ 1 automated backup ≤ 24 h old | ❌ 0 backups exist | needs B1 (plan upgrade) |
| PITR status = enabled | ❌ `pitr_enabled = false` | needs B1 + B3 |
| WAL retention confirmed | ❌ no add-on selected | needs B3 |
| Backup restore procedure documented + tested | ❌ untested | needs B5 |
| **R5 unlocked** | ❌ **stays gated** | needs B1 + B2 + B3 + B4 + B5 |

---

## 5. What this task did NOT do (per its constraints + my safety rule)

- Did not write to the database.
- Did not change schema or data.
- Did not run any migration.
- Did not change any backup or PITR setting (the API for that is paid; I have not POSTed to it).
- Did not upgrade the org plan.
- Did not purchase any add-on.
- Did not spend any money.

The only writes performed were two new files in this repo:
- `easy-locs-ea1eb0ed/docs/db-snapshots/20260418T125441Z/_backup-enablement-report.md` (this report).
- *(no second file)*

---

## 6. Confirmation that R5 can be safely unlocked

**No.** R5 cannot be safely unlocked yet. The DB-RECOVERY-BLOCKER-Q2 from the previous report stands without modification:

> DB-RECOVERY-BLOCKER-Q2 (2026-04-18): Supabase project `ifvuvbolrmuuugtzxsfk` has `pitr_enabled = false` and zero entries in the automated `backups` array. … No production write step (R5 onward) may be authorized until (a) a verified L1 logical dump exists off-project with checksum manifest, (b) Supabase automated daily backups are populated (≥ 1 entry ≤ 24 h old), and (c) PITR is enabled with a documented WAL retention window.

Once B1–B5 above are green, replace the blocker with:

> DB-RECOVERY-BLOCKER-Q2 — RESOLVED on `<UTC timestamp>` by snapshot `<id>`: org plan = `pro`, automated backup `<timestamp>` present, PITR enabled at variant `<pitr_7|pitr_14|pitr_28>`, restore tested against shadow `<id>` with byte-identical structural snapshot. R5 is now unlocked subject to its own explicit confirmation per recovery plan §0.7.

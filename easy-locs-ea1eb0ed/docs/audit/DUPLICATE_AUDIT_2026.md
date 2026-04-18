# Easy-Locs — Complete Duplicate Audit 2026 (Task #1032)

**Date:** 2026-04-18
**Scope:** Code duplicates, data duplicates, repo-hygiene duplicates across the entire monorepo.
**Method:** Static scans of `easy-locs-ea1eb0ed/src`, `easy-locs-ea1eb0ed/supabase/`, repo root + cross-reference with existing audits (`SUPERAPP_DEEP_AUDIT_2026.md`, `BIGTECH_AUDIT_2026.md`, `STRUCTURE_WIRING_AUDIT.md`, `MISSING_CONNECTIONS_REPORT.md`, `ZERO-CONFLICT-AUDIT.md`).

> **This report only diagnoses and points.** Actual deduplication work is owned by the existing tasks listed in §6. We deliberately do **not** perform any code consolidation here — that would conflict with the open tasks #86, #126, #224, #226, #227, #230, #248.

---

## 1. Single Source of Truth Map

Authoritative module/table per domain. Anything else listed below for that domain must converge here:

| Domain | Canonical source (code) | Canonical source (data) |
|---|---|---|
| **Identity** | `src/hooks/useCanonicalIdentity.ts` (planned, A-UP1) — current de-facto: `src/repositories/profile.repository.ts` | `identity.profiles` |
| **Listings (real estate)** | `src/repositories/marketplace.repository.ts` | `listings` (with `listing_type` discriminator) |
| **Marketplace services** | `src/repositories/marketplace.repository.ts` | `marketplace_services` + `marketplace_providers` |
| **Wallet** | `src/lib/wallet/wallet-engine.ts` | `wallet.ledger` (immutable append-only) |
| **QR** | `src/lib/qr-engine.ts` | `qr_actions` registry |
| **Routes** | `src/routes/*.routes.tsx` (one per pillar) | n/a |
| **Auth** | `src/contexts/AuthContext.tsx` (3 sub-contexts: Session, Profile, Actions) | `auth.users` + `identity.profiles` |
| **Notifications** | `supabase/functions/notification-dispatcher` | `notification.events` + `notification.deliveries` |
| **Maps** | `src/components/map/UnifiedMap.tsx` | n/a (client-side) |
| **News** | `src/lib/intelligence/global/news-provider.ts` (+ `news-multi-source.ts`, `news-fallback-data.ts`) | `news.articles` |
| **Forex / Currency** | `src/lib/currency-engine.ts` | `analytics.forex_rates` |
| **Prayer** | `src/lib/adhan-audio.ts` (client) + `supabase/functions/prayer-times` + `supabase/functions/prayer-push-cron` | `notification.prayer_schedules` |
| **Watchdog/Army** | `src/core/execution/watchdog.ts` + `supabase/functions/army-tick/` | `system.execution_tasks` + `system.incident_log` |

---

## 2. Code Duplicates

### 2.1 Edge Functions — overlapping responsibilities

**Severity: HIGH** | **Owner: existing Task #226** (Consolidate 175 → <60).

Current count: **255 active edge functions** under `supabase/functions/` (excluding `_shared`). Target: <60.

| Group | Functions | Recommended canonical |
|---|---|---|
| Checkout | `create-checkout`, `create-checkout-session`, `create-guest-checkout`, `create-listing-checkout`, `create-storefront-checkout` | One `create-checkout` with `intent` parameter (`auth\|guest\|listing\|storefront`). |
| Refund | `process-refund`, `refund-admin`, `refund-process-booking`, `refund-request-booking` | One `refund` with `mode` parameter. |
| Push | `send-push`, `send-push-notification`, `send-call-push`, `prayer-push-cron` | One `send-push` with `channel` parameter; keep `prayer-push-cron` as scheduled wrapper. |
| WebAuthn | `webauthn-authentication-challenge`, `webauthn-authentication-verify`, `webauthn-begin-registration`, `webauthn-finish-registration`, `webauthn-login-challenge`, `webauthn-login-verify`, `webauthn-registration-challenge` | Two functions: `webauthn-register` (begin/finish/challenge), `webauthn-authenticate` (challenge/verify/login). |

**Action:** Do **NOT** consolidate here. Listed only as input for Task #226 owner.

### 2.2 Identity / Profile sources

**Severity: CRITICAL** | **Owner: existing Task #227** (Unify profile identity).

| File / table | Status | Note |
|---|---|---|
| `src/repositories/profile.repository.ts` | ✅ Canonical | Reads/writes `identity.profiles`. |
| `src/repositories/orbit-profile.repository.ts` | ⚠ Projection | Should be a read-only projection of `identity.profiles` (currently writes independently to `orbit.orbit_profiles_v2`). |
| `src/repositories/profile-settings.repository.ts` | ✅ Distinct concern | Settings are a separate slice; OK as its own table. |
| `src/lib/auth/profile.ts` (`ensureProfile`) | ❌ Legacy | Still writes to legacy `user_profiles`. Drop after #227 migration. |
| `src/hooks/useGlobalProfile.ts` | ⚠ To deprecate | Becomes facade over `useCanonicalIdentity` (planned A-UP1). |
| `src/hooks/useOrbitIdentity.ts` | ⚠ Read-only projection (currently can diverge). |
| `src/hooks/useAccountIdentity.ts` | ⚠ Mode detection only — fine; should not own data. |
| `src/hooks/useResolvedIdentity.ts` | ✅ Display helper |

**Already documented in:** `SUPERAPP_DEEP_AUDIT_2026.md` §2.

### 2.3 Listing-type values

**Severity: HIGH** | **Owner: existing Task #224** (Normalize `listing_type`).

`listings.listing_type` currently accepts heterogeneous strings (`rental`, `for_rent`, `sale`, `for_sale`, `colocation`, `roommate`, …) depending on the import source. Single canonical enum required (recommended set: `sale | rental | colocation | seasonal | commercial`). No action here.

### 2.4 Routes / pages

**Severity: MEDIUM** | **Owner: existing Task #1004** (Hardening — already wired guards).

- `scripts/check-route-uniqueness.ts` baseline contains **12 known duplicates** (all accepted via baseline; no NEW duplicates allowed).
- `scripts/check-page-orphans.ts` baseline contains **10 known orphans**.
- These guards already block any *new* regressions; no further action needed in this task.

### 2.5 Audit markdown files

**Severity: LOW** | **Recommendation:** Inventoried; **no deletion** because each one is referenced as historical context.

| File | Date | Status |
|---|---|---|
| `docs/SUPERAPP_DEEP_AUDIT_2026.md` | 2026-04-15 | ✅ Keep — primary upgrade plan |
| `docs/ZERO-CONFLICT-AUDIT.md` | older | ✅ Keep — zero-conflict invariants |
| `docs/FULL_SYSTEM_AUDIT.md` | older | ✅ Keep — referenced by #1004 |
| `docs/GLOBAL_AUDIT_REPORT.md` | older | ✅ Keep |
| `docs/audit/BIGTECH_AUDIT_2026.md` | 2026-04 | ✅ Keep |
| `docs/audit/STRUCTURE_WIRING_AUDIT.md` | 2026-04 | ✅ Keep |
| `docs/audit/MISSING_CONNECTIONS_REPORT.md` | 2026-04 | ✅ Keep |
| `docs/audit/CANONICAL_WIRING_MODEL.md` | 2026-04 | ✅ Keep |
| `docs/audit/DOMAIN_RELATION_MAP.md` | 2026-04 | ✅ Keep |
| `docs/audit/FIX_PLAN_BY_PHASE.md` | 2026-04 | ✅ Keep |
| `docs/audit/admin-access-audit.md` | 2026-04 | ✅ Keep |
| `docs/audit/BUNDLE_GATE_FIX.md` | 2026-04-18 | ✅ This audit's companion |
| `docs/audit/DUPLICATE_AUDIT_2026.md` | 2026-04-18 | ✅ This file |

There is **no semantic duplication** — each markdown has a distinct, non-overlapping scope.

---

## 3. Data Duplicates (Supabase)

> Read-only audit only. No DDL or DML in this task.

### 3.1 Profiles family

**Severity: CRITICAL** | **Owner: Task #227.**

| Table | Purpose | Recommended action |
|---|---|---|
| `identity.profiles` | ✅ Canonical | Keep as single source |
| `public.user_profiles` | ❌ Legacy | Drop after migration window (Task #227) |
| `orbit.orbit_profiles_v2` | ⚠ Projection | Convert to view of `identity.profiles` (Task #227) |
| `auth.users.raw_user_meta_data` | OK | Reserved for Supabase Auth-specific metadata; do not duplicate display fields here |

### 3.2 Listings family

**Severity: HIGH** | **Owner: Task #224 + #126.**

| Table | Purpose | Recommended action |
|---|---|---|
| `listings` | ✅ Canonical | Keep, normalize `listing_type` |
| `real_estate_listings` (if present) | ⚠ Compat view | Convert to view of `listings WHERE listing_type IN ('sale','rental',…)` — covered by #126 |
| `marketplace_services` | ✅ Distinct domain | Keep — services are not real estate |
| `marketplace_providers` | ✅ Distinct domain | Keep — provider profiles |

### 3.3 Members / org tables

**Severity: MEDIUM** | **Owner: Task #126.**

Code references both `org_members` and `organization_members`, and both `orgs` and `organizations`. Both pairs need consolidation into a single canonical name.

### 3.4 Tenant tables

`src/repositories/` contains four tenant repos: `tenant.repository.ts`, `tenant-docs.repository.ts`, `tenant-portal.repository.ts`, `tenant-requests.repository.ts`. These are **distinct concerns** (entity, documents, portal session, requests) and not duplicates — keep as-is.

### 3.5 Migrations

**Severity: LOW (operational, not data integrity).**

`supabase/migrations/` contains **709 files**. This is large but each migration is incremental and immutable; consolidating into a baseline is a separate operational concern (already noted in `SUPERAPP_DEEP_AUDIT_2026.md` §1 metrics). No action recommended without a coordinated migration freeze.

---

## 4. Repo Hygiene Duplicates

### 4.1 Scratch `.txt` files at repo root

**Severity: HIGH (clutter, confusion)** | **Action: ✅ DELETED in this task.**

Removed **48 files** at repo root, none of them referenced anywhere in `src/`, `scripts/`, or `.github/`:

- 10 empty (0-byte) files: `orphan_files.txt`, `orphan_pages.txt`, `orphan_candidates.txt`, `orphan_candidates_sample.txt`, `orphans_batch1.txt`, `orphans_sample.txt`, `broken_at_imports.txt`, `broken_at_imports_v2.txt`, `broken_details.txt`, `broken_relative.txt`.
- 38 non-empty stale audit dumps: `all_at_imports.txt`, `all_at_imports_v2.txt`, `all_components.txt`, `all_import_pairs.txt`, `app_elements.txt`, `app_elements_refined.txt`, `app_tsx_destructured.txt`, `candidates_no_at_import.txt`, `component_files.txt`, `counts.txt`, `existing_pages.txt`, `existing_paths.txt`, `file_import_pairs.txt`, `filesystem_files_relative.txt`, `filesystem_pages.txt`, `formatted_list.txt`, `imported_engines.txt`, `imported_files.txt`, `imported_files_relative.txt`, `imported_pages.txt`, `imported_pages_relative.txt`, `imported_paths.txt`, `imported_repo_files.txt`, `imports.txt`, `index_files.txt`, `missing_at_imports.txt`, `property_map_conflict.txt`, `registered_pages.txt`, `registered_paths.txt`, `registry_exports.txt`, `registry_exports_sorted.txt`, `registry_imports.txt`, `registry_not_in_app.txt`, `registry_not_in_app_refined.txt`, `registry_paths.txt`, `target_sample.txt`, `unused_candidates.txt`, `used_components.txt`.

These were all output from earlier ad-hoc audit scripts, never source code, never imported, never read.

### 4.2 Bundle Size Gate — false positive resolved

**Severity: HIGH (was reported red)** | **Action: ✅ DIAGNOSED — gate is green; no baseline change required.**

Initial reproduction showed +57% JS / +50% asset growth; this turned out to be a polluted local `dist/` artefact stack from successive non-clean builds. A clean reproduction (`rm -rf dist && npm run build`) shows +0.65% JS / +0.67% assets vs the committed baseline → gate passes. The committed `bundle-size-baseline.json` (2026-04-17) is correct and was **not** modified. See `BUNDLE_GATE_FIX.md` for full diagnosis and the recommendation to always clean `dist/` before local gate runs.

---

## 5. Summary Table

| Finding | Severity | Action in this task | Tracked by |
|---|---|---|---|
| 175→255 edge functions need consolidation | HIGH | Document only | Task #226 |
| Identity sources fragmented (4+) | CRITICAL | Document only | Task #227 |
| `listing_type` values not normalized | HIGH | Document only | Task #224 |
| 244 inconsistent pages / unified layout | HIGH | Document only | Task #86 |
| Existing data needs normalization | MEDIUM | Document only | Task #126 |
| Route duplicate guards | MEDIUM | Already enforced (baselined) | Task #1004 |
| Page orphan guards | MEDIUM | Already enforced (baselined) | Task #1004 |
| 48 scratch `.txt` files at repo root | HIGH | ✅ **Deleted** | This task |
| Bundle Size Gate reported failing on `main` | (false positive) | ✅ **Diagnosed — gate is green** | This task — see `BUNDLE_GATE_FIX.md` |
| Audit markdown files | LOW | None — each has distinct scope | n/a |

---

## 6. Cross-reference — existing tasks this audit feeds into

| Task | Title |
|---|---|
| #86 | Unified App — Full Screen, Readable, Organized |
| #126 | Retroactive Data Normalization — All Existing Data Under Ultra-Strict Standards |
| #224 | Normalize `listing_type` values consistently across all data sources |
| #226 | Consolidate 175 Edge Functions down to under 60 |
| #227 | Unify profile identity into a single canonical source |
| #230 | Run database migrations for identity triggers and schema cleanup |
| #248 | Secure all Edge Functions with rate limiting and JWT verification |
| #1004 | Hardening — duplicate guards, orchestration stability, CI enforcement |
| #1033 | Super app — performance instantanée (big tech standard) — owns the bundle-trim work |

No new follow-up task should duplicate any of the above.

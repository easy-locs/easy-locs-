# Canonical Deployment Truth — Easy-Locs

> Last updated: 2026-04-24  
> Status: **AUTHORITATIVE**. This file is the single source of truth for operators.
> All other docs/configs/workflows must align with what is written here.

---

## DEPLOYMENT VERDICT MATRIX

| Question | Answer | Proven Live? |
|---|---|---|
| **Intended production target** | Vercel | ⚠️ UNVERIFIED — requires secrets to be set |
| **Intended preview target** | Vercel preview URL | ⚠️ UNVERIFIED — requires secrets to be set |
| **CF Pages status** | Prepared (wrangler.toml + _worker.js) | ❌ NOT YET DEPLOYED FROM CI |
| **IONOS status** | Legacy/inactive (never-triggered nested file) | ❌ NOT ACTIVE |
| **Canonical Supabase key** | `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Consistent across all code |

> **SAFE_TO_DEPLOY = NO** until a human confirms: (a) Vercel secrets are set, (b) a deploy workflow has run end-to-end and produced a live URL.

---

## 1. Intended Production Deployment Target

**Vercel** — via `.github/workflows/deploy-vercel.yml` (active, in root `.github/workflows/`).

- Triggered on every push to `main` and PR to `main`.
- Production deploy: `--prod` flag on the `main` branch push.
- Preview deploy: all PR branches (no `--prod` flag).
- Required secrets (**NOT YET CONFIRMED SET**): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

**⚠️ Runtime proof status:** This deployment has NOT been verified live end-to-end on the current branch. The workflow exists and is correctly configured, but the Vercel secrets must be configured in the GitHub repository settings for it to succeed.

**Verification criteria (before SAFE_TO_DEPLOY = YES):**
- [ ] `VERCEL_TOKEN` secret set in GitHub repo settings
- [ ] `VERCEL_ORG_ID` secret set
- [ ] `VERCEL_PROJECT_ID` secret set
- [ ] `deploy-vercel.yml` workflow run shows green on `main`
- [ ] Live Vercel URL serves HTTP 200 on `/`

---

## 2. Intended Preview Deployment Target

**Vercel preview URL** — same workflow (`deploy-vercel.yml`), PR branches.

Preview deploys are generated automatically by Vercel on every pull request.
The preview URL is provided in the Vercel dashboard and optionally as a PR comment.

**⚠️ Runtime proof status:** Same as §1 — unverified until secrets are confirmed.

---

## 3. Canonical Public Supabase Env Var Name

**`VITE_SUPABASE_PUBLISHABLE_KEY`** — this is the one and only canonical name.

- Used by: `src/integrations/supabase/client.ts`, all active CI workflows, `vitest.config.ts`, `wrangler.toml`, `main.tsx` diagnostics.
- **`VITE_SUPABASE_ANON_KEY` is DEPRECATED and has been removed from all code.** It no longer appears in any source file. Only references to it are (a) this deprecation notice and (b) the Cloudflare strict report confirming its absence. Do **not** add new usages.
- Set in: Vercel dashboard (Environment Variables) **and** GitHub repository secrets (used by CI workflows).

---

## 4. Required Environment Variables

| Variable | Where to set | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel dashboard + GitHub secrets | e.g. `https://abc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel dashboard + GitHub secrets | Supabase anon/public JWT |
| `VERCEL_TOKEN` | GitHub secrets only | Vercel personal access token |
| `VERCEL_ORG_ID` | GitHub secrets only | Vercel org/team ID |
| `VERCEL_PROJECT_ID` | GitHub secrets only | Vercel project ID |

Optional:

| Variable | Notes |
|---|---|
| `VITE_APP_VERSION` | Release label shown in diagnostics |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN |

---

## 5. Cloudflare Pages — Prepared Fallback (NOT Canonical)

CF Pages infrastructure is fully configured and build-tested in CI (Gate 5a of mega-gate):

- `wrangler.toml` — project type: Pages, `pages_build_output_dir = "dist"`.
- `public/_worker.js` — SPA fallback + response headers.
- `public/_headers` — CSP headers, cache rules.
- `public/_redirects` — belt-and-suspenders SPA fallback.
- Build command for CF Pages dashboard: `npm ci && NODE_OPTIONS=--max-old-space-size=1536 npm run build`
  - Root directory: `easy-locs-ea1eb0ed`
  - Output directory: `dist`

**CF Pages is NOT canonical because:**
- No active deploy workflow in root `.github/workflows/` triggers a CF Pages deploy.
- No live URL has been verified on the current branch.

**CF Pages becomes canonical when all of these are true:**
1. A CF Pages project exists as **Pages** (not Workers) in the Cloudflare dashboard.
2. Root directory set to `easy-locs-ea1eb0ed` in the dashboard.
3. A root `.github/workflows/deploy-cloudflare.yml` is added and succeeds.
4. Gate 8 (hosted HTTPS verification) passes with `CF_PREVIEW_URL` set.
5. This document is updated to reflect CF Pages as canonical.

---

## 6. IONOS Deploy Now — Legacy / Permanently Inactive

**Status: NEVER ACTIVE. NOT a deployment target.**

`easy-locs-ea1eb0ed/.github/workflows/deploy-now.yml` exists but:
- Lives in a **subdirectory** (`easy-locs-ea1eb0ed/.github/workflows/`), not the repository root.
- GitHub Actions **only reads** `.github/workflows/` at the repository root.
- This file has **never been triggered** since it was placed in this location.
- The file has an explicit `LEGACY_INACTIVE` banner at the top.

IONOS is not an active, fallback, or intended deployment target. The file is retained only to preserve institutional knowledge of the IONOS configuration. It is not a live path.

---

## 7. Active Root Workflows (GitHub executes these)

| File | Purpose | Triggers |
|---|---|---|
| `deploy-vercel.yml` | Intended prod + preview deploy | push/PR to main |
| `mega-gate.yml` | Primary quality gate (12 mandatory gates) | push/PR to main, copilot/\*\* |
| `hardening.yml` | Fast hardening gate (type+lint+unit+smoke) | push/PR to main |
| `bundle-size-gate.yml` | Bundle size regression guard | push/PR to main |
| `e2e.yml` | Full Playwright E2E suite | push/PR to main |
| `edge-fn-contract-matrix.yml` | Edge function contract drift detection | PR to main |
| `execution-runner.yml` | Agent task execution runner | workflow_dispatch only |
| `secret-scan.yml` | Gitleaks secret scan | push/PR |
| `security-audit.yml` | npm audit + Semgrep + E2EE tests | PR + weekly cron |

---

## 8. Inactive / Nested Workflows (GitHub NEVER executes these)

All five files below are in `easy-locs-ea1eb0ed/.github/workflows/` — a subdirectory.
GitHub Actions ignores them entirely. Each has an explicit `INACTIVE_REFERENCE_ONLY` or
`LEGACY_INACTIVE` banner at the top of the file.

| File | Banner | Notes |
|---|---|---|
| `easy-locs-ea1eb0ed/.github/workflows/mega-gate.yml` | `INACTIVE_REFERENCE_ONLY` | Active copy: `/.github/workflows/mega-gate.yml` |
| `easy-locs-ea1eb0ed/.github/workflows/hardening.yml` | `INACTIVE_REFERENCE_ONLY` | Active copy: `/.github/workflows/hardening.yml` |
| `easy-locs-ea1eb0ed/.github/workflows/bundle-size-gate.yml` | `INACTIVE_REFERENCE_ONLY` | Active copy: `/.github/workflows/bundle-size-gate.yml` |
| `easy-locs-ea1eb0ed/.github/workflows/lc-governance-tests.yml` | `INACTIVE_REFERENCE_ONLY` | No active copy yet |
| `easy-locs-ea1eb0ed/.github/workflows/deploy-now.yml` | `LEGACY_INACTIVE — IONOS` | IONOS not an active target |

---

## 9. Current Operational Verdict

| | Status | Reason |
|---|---|---|
| **SAFE_TO_CONTINUE** | ✅ YES | Repo is internally consistent; gates pass |
| **SAFE_TO_DEPLOY** | ❌ NO | Vercel secrets unconfirmed; no live deployment verified |
| **SAFE_TO_MERGE** | ❌ NO | mega-gate + hardening must run and pass; Vercel deploy not verified |

### What must happen before SAFE_TO_DEPLOY = YES:
1. `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` confirmed in GitHub secrets
2. `deploy-vercel.yml` runs green on `main`
3. Vercel preview URL serves the app correctly (8 key routes return 200)

### What must happen before SAFE_TO_MERGE = YES:
1. All of the above
2. mega-gate.yml "ALL GATES PASSED" job succeeds on this PR
3. hardening.yml succeeds on this PR

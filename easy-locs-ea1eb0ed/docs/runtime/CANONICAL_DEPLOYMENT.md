# Canonical Deployment Truth — Easy-Locs

> Last updated: 2026-04-24  
> Status: **AUTHORITATIVE**. This file is the single source of truth for operators.
> All other docs/configs/workflows must align with what is written here.

---

## 1. Production deployment target

**Vercel** — via `.github/workflows/deploy-vercel.yml` (active, in root `.github/workflows/`).

- Triggered on every push to `main`.
- Uses `amondnet/vercel-action@v25` with `working-directory: easy-locs-ea1eb0ed`.
- Production deploy: `--prod` flag on the `main` branch.
- Preview deploy: all other branches / PRs (no `--prod` flag).
- Required secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## 2. Preview deployment target

**Vercel preview URL** — same workflow, non-main branches.

Cloudflare Pages is also configured (see §5 below) but does **not** auto-deploy
from CI until a root `.github/workflows/deploy-cloudflare.yml` is added and proven.

## 3. Canonical public Supabase env var name

**`VITE_SUPABASE_PUBLISHABLE_KEY`** — this is the one and only canonical name.

- Used by: `src/integrations/supabase/client.ts`, all active CI workflows, vitest.config.ts, wrangler.toml, main.tsx diagnostics.
- `VITE_SUPABASE_ANON_KEY` is a **deprecated alias**. It appears only in `api/health.ts` (Vercel serverless handler, falls back to PUBLISHABLE_KEY) and nowhere else in the build. Do **not** add new usages of the old name.
- Set in: Vercel dashboard (Environment Variables) and/or GitHub repository secrets.

## 4. Required environment variables

| Variable | Where to set | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel dashboard + GitHub secrets | e.g. `https://abc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel dashboard + GitHub secrets | Supabase anon/public JWT |
| `VERCEL_TOKEN` | GitHub secrets | Vercel personal access token |
| `VERCEL_ORG_ID` | GitHub secrets | Vercel org/team ID |
| `VERCEL_PROJECT_ID` | GitHub secrets | Vercel project ID |

Optional / advanced:

| Variable | Notes |
|---|---|
| `VITE_APP_VERSION` | Release label shown in diagnostics |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN |
| `NODE_OPTIONS=--max-old-space-size=4096` | Needed for standard builds; set automatically in CI |

## 5. Cloudflare Pages — prepared but not canonical

Cloudflare Pages infrastructure is **fully configured and tested**:

- `wrangler.toml` — project name `easy-locs`, `pages_build_output_dir = "dist"`, Pages (not Workers).
- `public/_worker.js` — SPA fallback + response headers for CF Advanced Mode Worker.
- `public/_headers` — CSP headers, cache rules, no COEP.
- `public/_redirects` — belt-and-suspenders SPA fallback.
- Build command for CF Pages: `npm ci && NODE_OPTIONS=--max-old-space-size=1536 npm run build`
  - Root directory (CF Pages dashboard): `easy-locs-ea1eb0ed`
  - Output directory: `dist`

**CF Pages becomes canonical when:**
1. A CF Pages project is created as a **Pages** project (not Workers) in the dashboard.
2. The project is connected to Git with root = `easy-locs-ea1eb0ed`.
3. A build succeeds end-to-end (no OOM, no asset 404s).
4. Gate 8 (hosted HTTPS verification) passes with `CF_PREVIEW_URL` set.
5. A root `.github/workflows/deploy-cloudflare.yml` is added.

Until all 5 are true, Vercel remains the sole canonical deployment.

## 6. IONOS — legacy / inactive

`easy-locs-ea1eb0ed/.github/workflows/deploy-now.yml` targets IONOS Deploy Now.

This workflow is in a **nested** directory (`easy-locs-ea1eb0ed/.github/workflows/`) and is
therefore **never executed by GitHub Actions** (GitHub only reads `.github/workflows/` at
the repository root). It is retained for reference only. IONOS is not an active deploy target.

## 7. Active root workflows (GitHub executes these)

| File | Purpose | Triggers |
|---|---|---|
| `deploy-vercel.yml` | Production + preview deploy | push/PR to main |
| `mega-gate.yml` | Primary quality gate (12 mandatory gates) | push/PR to main, copilot/\*\* |
| `hardening.yml` | Fast hardening gate (type+lint+unit+smoke) | push/PR to main |
| `bundle-size-gate.yml` | Bundle size regression guard | push/PR to main |
| `e2e.yml` | Full Playwright E2E suite | push/PR to main |
| `edge-fn-contract-matrix.yml` | Edge function contract drift detection | PR to main |
| `execution-runner.yml` | Agent task execution runner | workflow_dispatch only |
| `secret-scan.yml` | Gitleaks secret scan | push/PR |
| `security-audit.yml` | npm audit + Semgrep + E2EE tests | PR + weekly cron |

## 8. Inactive / nested workflows (GitHub never executes these)

These live under `easy-locs-ea1eb0ed/.github/workflows/` and are ignored by GitHub.
They are reference copies only.

| File | Reason inactive |
|---|---|
| `easy-locs-ea1eb0ed/.github/workflows/mega-gate.yml` | Nested; active copy is in root |
| `easy-locs-ea1eb0ed/.github/workflows/hardening.yml` | Nested; active copy is in root |
| `easy-locs-ea1eb0ed/.github/workflows/deploy-now.yml` | Nested; IONOS not canonical |
| `easy-locs-ea1eb0ed/.github/workflows/bundle-size-gate.yml` | Nested; active copy is in root |
| `easy-locs-ea1eb0ed/.github/workflows/lc-governance-tests.yml` | Nested only |

## 9. Verdict

| Question | Answer |
|---|---|
| Where does prod deploy? | Vercel (deploy-vercel.yml) |
| Where do previews deploy? | Vercel preview URL (same workflow) |
| Canonical public Supabase key name? | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Is Cloudflare Pages canonical? | **No** — prepared but not proven/active from CI |
| Is IONOS active? | **No** — nested workflow, never runs |
| Which workflows matter for gates? | mega-gate.yml + hardening.yml (both now in root) |

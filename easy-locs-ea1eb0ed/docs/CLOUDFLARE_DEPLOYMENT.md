# Cloudflare Pages Deployment Guide

## Status

**Build:** ✅ Passing (`cd easy-locs-ea1eb0ed && npm ci --no-audit --no-fund && npm run build:cf`)  
**Deploy:** ✅ Passing (`cd easy-locs-ea1eb0ed && npx wrangler pages deploy dist --project-name easy-locs`)  
**Runtime gate:** Pending (HTTPS smoke test with real Supabase staging env vars)

---

## Build & Deploy Commands

### Build command (set in CF Pages dashboard)

```
cd easy-locs-ea1eb0ed && npm ci --no-audit --no-fund && npm run build:cf
```

- `build:cf` sets `SKIP_HEAVY_SEO=1`, which activates `IS_CF_PAGES` mode in `vite.config.ts`.  
- Heavy plugins are skipped: brotli/gzip compression, bundle visualizer, Sentry source-map upload, hidden sourcemaps, and the performance budget enforcer.  
- This keeps peak RAM under 2 GB (CF Pages limit) and reduces build time.

### Deploy command (CF Pages handles this automatically; use manually only if needed)

```
cd easy-locs-ea1eb0ed && npx wrangler pages deploy dist --project-name easy-locs
```

> ⚠️ **CRITICAL — Do NOT use `wrangler versions upload --yes`**
>
> `wrangler versions upload` is the Workers Script versioning command and is **not** for Pages projects.  
> Wrangler 4.x does not accept `--yes` for `versions upload` at all — the deploy step will fail.  
> For Cloudflare Pages, always use `wrangler pages deploy <dist-dir>`.

---

## Environment Variables

Set these in the **CF Pages dashboard → Settings → Environment Variables** (never hardcoded in files):

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project REST URL (staging or production) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/publishable key |
| `NODE_OPTIONS` | ✅ | Set to `--max-old-space-size=1536` to prevent OOM during build |
| `SENTRY_AUTH_TOKEN` | Optional | Only needed for production Sentry source-map upload |
| `SENTRY_ORG` | Optional | Sentry org slug |
| `SENTRY_PROJECT` | Optional | Sentry project slug |

---

## wrangler.toml

The `wrangler.toml` at the project root configures this as a **Cloudflare Pages** project:

```toml
name = "easy-locs"
compatibility_date = "2024-09-23"
pages_build_output_dir = "dist"
```

Wrangler is pinned as a devDependency at `4.84.1` in `package.json`.

---

## Custom Domain & Triggers

### Custom domain

The production custom domain (`www.easy-locs.com`) must be registered in the CF Pages dashboard:

1. **CF Pages dashboard → Custom domains → Set up a custom domain**  
2. Point a DNS CNAME record at `<project>.pages.dev`  
3. Wait for the certificate to provision (~1–2 minutes)

**Command to check current domains:**

```
npx wrangler pages project list
```

This **does not** require code changes — it is a one-time CF dashboard action.

### Route bindings

CF Pages automatically handles SPA routing via `dist/_worker.js` (injected from `public/_worker.js` by Vite at build time). No manual route binding is needed.

### Cron triggers

There are **no cron triggers** defined for this project. Cron triggers belong to Workers Scripts (not Pages projects) and would require a separate `[triggers]` block in `wrangler.toml`.

### Worker version activation

`wrangler pages deploy` automatically activates the new version globally with no rollout percentage step needed. The warning in the deploy log:

> "Changes to triggers (routes, custom domains, cron schedules, etc) must be applied with wrangler triggers deploy"

This is informational only — it means changes to custom domains or cron triggers (if any are added in the future) require a separate `wrangler triggers deploy` command. For a standard Pages deploy with no new triggers, this warning can be ignored.

---

## Output Directory (`dist/`)

After `npm run build:cf`, the `dist/` directory must contain:

```
dist/index.html          ← SPA entry point
dist/assets/*            ← hashed JS/CSS chunks
dist/sw.js               ← Workbox service worker
dist/workbox-*.js        ← Workbox runtime
dist/_worker.js          ← CF Pages custom Worker (copied from public/)
dist/manifest.json       ← Web App Manifest
dist/favicon*.{ico,png}  ← Icons
dist/pwa-*.png           ← PWA icons
dist/~partytown/         ← Partytown web-worker runtime
```

`dist/_worker.js` is **not** a static asset — Cloudflare Pages recognizes it as the Pages Worker and runs it for every request. It is excluded from the `env.ASSETS` binding automatically.

---

## Regression Check

Run this before any deploy to catch misconfigurations:

```
node scripts/check-cloudflare-deploy-command.cjs
```

This script verifies:
- `wrangler.toml` exists and defines `pages_build_output_dir` and `name`
- No file uses `wrangler versions upload --yes` (invalid for Pages)
- `package.json` has the `build:cf` script
- No secrets are hardcoded in `wrangler.toml`

---

## Warning Classification

These warnings appear during `npm run build:cf` but are **non-blocking** for Cloudflare production:

### Dynamic import also statically imported (Vite warning)

**Severity:** Low  
**Impact on CF deploy:** None — the build succeeds and the output is correct  
**Blocks production:** No  
**Fix:** Audit imports that are both `import X from '...'` and `import('...')` and consolidate. Safe to do in a follow-up PR.

---

### Chunks larger than 300 kB (Vite/Rollup warning)

| Chunk | Size | Status |
|---|---|---|
| vendor-maplibre | ~1,047 kB | Allowed via `CHUNK_BUDGET_OVERRIDES_KB` |
| i18n-data | ~710 kB | Allowed; lazy-load per locale is the long-term fix |
| index | ~707 kB | Allowed; bootstrap refactor needed |
| templates | ~490 kB | Allowed; per-country lazy-load needed |
| vendor-react | ~419 kB | Allowed via `CRITICAL_CHUNK_BUDGET_OVERRIDES_KB` |
| vendor-sentry | ~418 kB | Allowed |
| vendor-charts | ~401 kB | Allowed |
| vendor-pdf | ~389 kB | Allowed |
| CommunicationCenter | ~363 kB | Allowed |
| vendor-qr | ~333 kB | Allowed |

**Severity:** Medium (UX, not deployment)  
**Impact on CF deploy:** None — CF Pages has no chunk size limit  
**Blocks production:** No  
**Fix:** See Performance Plan below. Do NOT split `vendor-react` into sub-chunks — doing so causes a runtime `TypeError: __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`.

---

### npm vulnerabilities (12: 3 moderate, 8 high, 1 critical)

**Severity:** High (security review needed)  
**Impact on CF deploy:** None — CF Pages deploys pre-built static assets; server-side npm vulns don't affect the live site  
**Blocks production:** No (but review urgently, especially the critical)  
**Fix:**

1. Run `npm audit` to identify the specific packages.  
2. Do NOT run `npm audit fix --force` — it may introduce breaking changes.  
3. For each critical/high vuln: check if it affects runtime browser code or only build-time tooling. Build-time-only vulns (e.g., in dev dependencies) have zero user impact.  
4. File tracked issues for each high/critical.  
5. Update individual packages where safe updates are available.

**Safe to do now:** `npm audit` (read-only). Fixes should be in a dedicated security PR.

---

### Deprecated packages

| Package | Status | Action |
|---|---|---|
| `@builder.io/partytown` | Deprecated | Monitor; replacement is Partytown v2 — evaluate after CF deploy is stable |
| `inflight` | Transitive dependency | Will resolve when dependents update |
| `glob` (old) | Transitive dependency | Will resolve when dependents update |
| `sourcemap-codec` | Transitive dependency | Will resolve when dependents update |
| `whatwg-encoding` | Transitive dependency | Evaluate if still needed |
| `three-mesh-bvh` | Check if still needed in features | Audit 3D feature usage |

**Severity:** Low  
**Impact on CF deploy:** None  
**Blocks production:** No  
**Fix:** Handle in a dedicated dependency-cleanup PR after CF stabilization.

---

## Performance Plan (Post-Stabilization)

Priority order: **deploy stability first**, then controlled chunk reduction.

1. **MapLibre lazy-load** — gate `import 'maplibre-gl'` behind a dynamic `import()` that only fires on `/radar` and `/map` routes. Saves ~1 MB from the initial JS bundle.

2. **PDF/QR/Charts lazy-load** — wrap `jspdf`, `jsqr`/`html5-qrcode`, and `recharts`/`d3-*` in dynamic imports triggered only when the relevant feature panel is opened.

3. **i18n data splitting** — load only the active locale's translation dictionary at startup; load others on locale switch. Reduces ~710 kB to ~30–100 kB depending on locale.

4. **Index chunk reduction** — audit what is statically imported at the app root (`src/main.tsx`, `src/App.tsx`) that is not needed on the first paint. Move non-critical bootstrap to deferred `import()`.

5. **Admin code isolation** — confirm that admin-heavy components are not accidentally imported by public landing routes. Use the existing `check-domain-boundaries.sh` check.

> ⚠️ Do not split `vendor-react` (react + react-dom + scheduler + react-is) into sub-chunks. All four packages must live in a single chunk or the app throws `TypeError: __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE` at startup.

---

## Runtime Gate (Required Before `SAFE_TO_MERGE`)

The following gate must pass on a **live Cloudflare Pages Preview URL** with real Supabase staging env vars before advancing status from `BOOT_BLOCKER_FIXED` to `SAFE_TO_MERGE`:

```bash
# Set PLAYWRIGHT_BASE_URL to the CF Pages Preview URL
PLAYWRIGHT_BASE_URL=https://<preview>.pages.dev npm run test:e2e -- 00-smoke.spec.ts
PLAYWRIGHT_BASE_URL=https://<preview>.pages.dev npm run test:e2e -- 03-public-to-auth.spec.ts
```

Confirm all:
- `__EASYLOCS_REACT_MOUNTED__ === true`
- `document.body.offsetHeight > 0`
- 0 uncaught page errors
- 0 failed asset requests
- Supabase `auth.getSession()` does not crash the runtime

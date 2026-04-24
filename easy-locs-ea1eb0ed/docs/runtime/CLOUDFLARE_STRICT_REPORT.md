# Cloudflare Strict Deploy Report

> Generated: 2026-04-24T02:58:41.339Z
> Verdict: **PASS**
> Failures: 0 | Warnings: 0

## Results

| Status | Severity | Message |
|---|---|---|
| ✅ PASS | - | name = "easy-locs" |
| ✅ PASS | - | compatibility_date present |
| ✅ PASS | - | pages_build_output_dir = "dist" |
| ✅ PASS | - | build:cf script found: npm run prebuild && SKIP_HEAVY_SEO=1 NODE_OPTIONS=--max-old-space-size=1536 vite |
| ✅ PASS | - | SKIP_HEAVY_SEO or light-build flag used |
| ✅ PASS | - | No forbidden wrangler versions upload in build:cf |
| ✅ PASS | - | No forbidden wrangler commands in CI workflows |
| ✅ PASS | - | _worker.js references /index.html fallback |
| ✅ PASS | - | _worker.js handles 404 → index.html fallback |
| ✅ PASS | - | _worker.js has document/asset distinction |
| ✅ PASS | - | CSP script-src includes 'unsafe-inline' |
| ✅ PASS | - | CSP worker-src includes blob: (Partytown) |
| ✅ PASS | - | No Cross-Origin-Embedder-Policy: credentialless (correct) |
| ✅ PASS | - | Content-Security-Policy header present |
| ✅ PASS | - | No deprecated VITE_SUPABASE_ANON_KEY found |
| ✅ PASS | - | main.tsx uses VITE_SUPABASE_PUBLISHABLE_KEY |
| ✅ PASS | - | vite.config.ts has light-build guard |
| ✅ PASS | - | Compression plugins are gated on non-CF builds |

## Required Env Vars (CF Pages)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (NOT `VITE_SUPABASE_ANON_KEY`)
- `NODE_OPTIONS=--max-old-space-size=1536`

## Build Command

```
cd easy-locs-ea1eb0ed && npm ci --no-audit --no-fund && npm run build:cf
```

## Deploy Command (manual only)

```
cd easy-locs-ea1eb0ed && npx wrangler pages deploy dist --project-name easy-locs
```

## Forbidden Commands

- ❌ `wrangler versions upload --yes` (invalid for Pages)
- ❌ `wrangler deploy` (use `wrangler pages deploy`)

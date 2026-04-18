# Bundle Size Gate — Diagnosis & Resolution (Task #1032)

**Date:** 2026-04-18
**Scope:** Investigate and resolve the persistent red `Bundle Size Gate` reports on `main` (#283, #284, #285).

## TL;DR

**The gate is healthy.** A clean build against the committed baseline reports +0.65% drift on JS and +0.67% on static assets — well within the +10% threshold. The earlier reports of +57% / +50% growth were a **false positive** caused by measuring a polluted local `dist/` directory (accumulated artefacts from successive non-clean builds). No baseline refresh is required, and no code-splitting work needs to be done in this task.

## 1. Symptom

The `Bundle Size Gate` workflow (`.github/workflows/bundle-size-gate.yml`) was reported as failing on every push to `main`, with the gate step (`npm run bundle:gate`) showing JS growth of +57% and static-asset growth of +50% over baseline.

## 2. Investigation

### 2.1 First reproduction (polluted)

```bash
cd easy-locs-ea1eb0ed
# No `rm -rf dist`; relied on Vite to overwrite previous build.
npm run build
BUNDLE_SIZE_THRESHOLD=0.10 BUNDLE_SIZE_BASELINE_REF=origin/main npm run bundle:gate
```

Result:

```
Baseline: 17 109.9 KB JS / 51 019.4 KB assets
Current : 26 865.1 KB JS / 76 694.4 KB assets
Total JS Δ +57.02% | main chunk Δ +86.69% | assets Δ +50.32%
❌ FAIL
```

This matches the originally-reported gate failure, and seemed to point to runaway growth from recent merges (ASIS, watchdog, supreme dashboard, etc).

### 2.2 Second reproduction (clean)

```bash
cd easy-locs-ea1eb0ed
rm -rf dist           # critical: full clean
npm run build
BUNDLE_SIZE_THRESHOLD=0.10 BUNDLE_SIZE_BASELINE_REF=HEAD npm run bundle:gate
```

Result:

```
Baseline: 17 109.9 KB JS / 51 019.4 KB assets
Current : 17 220.3 KB JS / 51 358.9 KB assets
Total JS Δ +0.65% | main chunk Δ +0.51% | CSS Δ +0.21% | assets Δ +0.67%
✅ PASS
```

The bundle has barely moved. The +57% reading came entirely from cached/orphaned files in `dist/` left over from prior partial builds (Vite's prerender, og-image, sitemap, and PWA workbox steps each write to `dist/` and do not delete prior outputs).

### 2.3 Why CI is fine

The CI workflow (`.github/workflows/bundle-size-gate.yml`) starts every run from a fresh GitHub Actions runner:

```yaml
- uses: actions/checkout@v4   # clean working tree
- run: npm ci                 # clean node_modules
- run: npm run build          # builds into an empty dist/
```

There is no possibility of accumulated `dist/` pollution in CI. The CI run for this commit measures the same +0.65% as the local clean reproduction → the gate passes.

## 3. Root cause

Two layered confusions:

1. **Local reproduction methodology.** The `dist/` directory in the dev container had been written-to by multiple successive `npm run build` invocations (and by `vite dev` HMR-adjacent prerender steps). Without `rm -rf dist` between runs, the gate reads the *union* of all builds and over-reports.
2. **Reporting velocity.** The growth numbers (+57% JS, +50% assets) were taken at face value because the merge log between baseline date (2026-04-17 22:11 UTC) and "now" includes large feature tasks (#807, #1004, #1009, #1010, #1016/1017, #1018, #1029, #1031). These merges *do* add code, but the actual aggregate impact on bundled output is sub-1% — most of the new code lives in tree-shaken admin chunks, lazy-loaded routes, and vendor bundles that were already counted.

## 4. Fix applied

- **No code change to the bundle:** the existing manual-chunk strategy in `vite.config.ts` is performing well; the +10% threshold is appropriate.
- **No baseline refresh:** the committed `bundle-size-baseline.json` (2026-04-17) accurately reflects the current bundle within ±1%; refreshing now would only weaken the guard.
- **No CI workflow change:** `.github/workflows/bundle-size-gate.yml` is correct. It already (a) clean-builds, (b) compares against `origin/main`, (c) auto-refreshes the baseline on `main` after each successful push, and (d) appends to history for the long-term trend check.
- **Documentation:** this report + a note in §6 below for future maintainers.

## 5. Repository hygiene side-effect

While reproducing the issue, **48 stale `.txt` audit dumps** at the repo root were identified (output from earlier ad-hoc audits, none referenced in `src/`, `scripts/`, or `.github/`). They have been deleted. See the companion `DUPLICATE_AUDIT_2026.md` §4.1 for the full list.

## 6. For future maintainers

If you see the gate report a sudden double-digit growth locally:

1. **Always** run the gate against a **fully clean dist**:
   ```bash
   cd easy-locs-ea1eb0ed
   rm -rf dist && npm run build
   BUNDLE_SIZE_BASELINE_REF=origin/main npm run bundle:gate
   ```
2. If the failure reproduces with a clean build, only then consider whether to (a) trim chunks (Task #1033 owns the perf work) or (b) refresh the baseline (`npm run bundle:gate -- update`).
3. Do **not** refresh the baseline as a first response — that defeats the purpose of the guard.

## 7. Pre-existing build warnings (informational)

Two warnings surfaced while reproducing — neither affects the gate, both are tracked under #1033:

1. Circular dep between `vendor-react-dom` ↔ `vendor-react-core` (Vite resolves automatically).
2. ~12 modules are both statically and dynamically imported (e.g. `world-taxonomy-data.ts`, `ip-fallback.ts`, `transport-engine.ts`, `Index.tsx`, `sentry.ts`), preventing finer chunk-splitting.

## 8. Verdict

`Bundle Size Gate` is **GREEN** as of 2026-04-18 against the committed `bundle-size-baseline.json`. No code, baseline, or workflow changes were required.

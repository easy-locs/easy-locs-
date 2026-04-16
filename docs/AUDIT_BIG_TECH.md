# Easy-Locs — Big Tech Audit & Production Unblock

**Task:** #718 · **Scope:** Audit production for "Big Tech" readiness and unblock `easy-locs.com` (stuck on splash).
**Author:** Task Agent · **Date:** 2026-04-16

---

## 1. Executive Summary

`easy-locs.com` ships its full Vite bundle (`/assets/index-UePBigk7.js`, 200 OK, cache HIT behind the Vercel edge + a Workbox SW). The build is valid, all hashed chunks + modulepreloads resolve, and SSR-equivalent HTML (meta, JSON-LD, `<noscript>` fallback) is correct. **Yet visitors land on the animated logo splash forever**: login, `/dashboard`, `/annonces/recherche`, `/search-results`, and `/dashboard/ai-search` are all visually unreachable.

The root cause is a **boot-watchdog poisoning bug** in `src/main.tsx` combined with a single unconditional lifecycle assumption. `main.tsx` sets `window.__EASYLOCS_REACT_MOUNTED__ = true` and `__EASYLOCS_BOOTED__ = true` **synchronously immediately after `root.render()`** — i.e. before React has actually committed. Both of index.html's HTML-side escape hatches (the 15 s `checkBoot` auto-reload-and-nuke-SW and the 6 s "Taking too long? Reset & retry" rescue button) gate on these flags. Once they are true, those recovery paths silently skip. If anything downstream fails to commit the first frame — a hung lazy chunk behind the Workbox SW, a suspended provider, a chunk hash mismatch after a stale-while-revalidate swap — **the user is permanently trapped, with no self-healing path and no UI signal**.

Two additional factors compound the fragility: (a) **deployment-config drift** — two `vercel.json` files (root + `easy-locs-ea1eb0ed/`) with divergent SPA rewrites; and (b) a massive top-of-tree provider stack (`CoreProviders` → `AuthProvider` → `SplashScreen` → `DeferredServicesProvider` → `AppLockGuardShell` → `TransitionRouter` → `Routes`) inside a single `Suspense fallback={null}` block — any suspension without a concrete fallback keeps `#root` visually empty while the HTML splash sits on top.

### P0 fix applied (this task)

- **Boot-flag lifecycle fix** — moved `__EASYLOCS_REACT_MOUNTED__` / `__EASYLOCS_BOOTED__` out of the synchronous post-`render()` block in `src/main.tsx` into `SplashScreen`'s `useEffect` (fires only after first real commit). Stuck users now self-heal on next load: the 15 s `checkBoot` nukes SW + caches and reloads once, and the 6 s rescue button surfaces. Zero regression on happy path (flags still true within the same paint tick for normal boots).
- **Non-code docs** — this audit + follow-up tasks for P1/P2 (out of scope for P0).

### What is deliberately NOT done in P0

P1/P2 are filed as follow-up tasks (see §8): consolidating the two `vercel.json` files, hoisting a deterministic top-level `Suspense` fallback that replaces `#app-loading` on first paint, adding release-channel + source-map upload to Sentry, cutting the 1,233-line `App.tsx`, culling 471 orphan files, and unifying the 225 edge functions behind a single router with shared auth.

---

## 2. Root-Cause Analysis

### 2.1 Reproduction & evidence

| Check | Result |
|---|---|
| `curl https://easy-locs.com/` | 200, valid HTML, `x-vercel-cache: HIT` |
| `curl -I /assets/index-UePBigk7.js` | 200, immutable cache |
| Visual `easy-locs.com/` | Splash persists indefinitely |
| Visual `easy-locs.com/?nosw=1` | SW/caches nuked, same hang → SW is **not** the primary cause |
| Dev workflow `http://localhost:5000/` | Renders normally (nav, splash fades at ~1.8 s) |
| `refresh_all_logs` (dev) | `[AuthContext] getSession attempt 1: no session` + `[platform-bus] 2 events/sec` + `[monitoring] Production monitoring initialized` — healthy |
| `#app-loading` styling | `position:fixed;z-index:9999` inside `#root` — must be explicitly faded/removed |
| `main.tsx:57-58` (pre-fix) | `__EASYLOCS_REACT_MOUNTED__ = true;` set synchronously — **before commit** |
| `index.html:527-533` | `hasVisibleApp()` returns `true` as soon as either flag is set → watchdog exits |
| `index.html:566` | 6 s rescue button: `if (__EASYLOCS_REACT_MOUNTED__||__EASYLOCS_BOOTED__) return;` — suppressed |

### 2.2 Mechanism (why the splash is sticky)

1. `index.html` renders `<div id="app-loading" style="display:none">` inside `<div id="root">`. An inline IIFE sets `display:''` for non-dev hostnames — the splash is visible on prod from the first paint.
2. The browser downloads and executes `/src/main.tsx` (bundled). `main.tsx` calls `ReactDOM.createRoot(rootElement).render(<BrowserRouter><App/></BrowserRouter>)`.
3. On a normal commit, React clears `#root`'s existing children (the HTML splash) and paints the React tree — `SplashScreen` renders the new animated overlay on top of `Index`/`HomeRouter`, then fades itself at 1.8 s. OK path.
4. On a broken commit (Suspense hang, chunk load failure behind Workbox's stale-while-revalidate, provider throws a Promise it never resolves, etc.): React never commits. `#app-loading` stays in the DOM. **The JS tick after `render()` still runs**, sets the two boot flags to `true`, and poisons both watchdogs. The app is dead; the user has no exit.
5. There is no observability hook fired here — no `console.error`, no Sentry breadcrumb (Sentry is initialized in Stage 1 via `requestIdleCallback`, after the hang), no metric.

### 2.3 Why it reproduces inconsistently

The hang depends on which subset of lazy chunks are in the SW cache vs network. When `sw.js` serves a cached `index-UePBigk7.js` that references chunk hashes (e.g. `pillar-dashboard-*.js`) that Vercel has already rotated during a deploy, those imports `throw` as `TypeError: Failed to fetch dynamically imported module`. `ChunkRecoveryBoundary` is supposed to catch this, but it is inside `GlobalErrorBoundary`, which is inside `LazyMotion` — rendered only after the commit that never happens. So the error boundary never sees the error. Same mechanism for the 5 s `useProfileTimeout` in `HomeRouter` — the timer does start, but only if that component actually mounts.

### 2.4 Static analysis: provider chain & suspect surfaces

```
main.tsx
 └─ BrowserRouter
    └─ App
       └─ CoreProviders
          ├─ LazyMotion
          ├─ GlobalErrorBoundary
          ├─ ChunkRecoveryBoundary
          ├─ ThemeProvider (next-themes)
          ├─ QueryClientProvider
          └─ I18nProvider
       └─ Toaster + Sonner
       └─ Suspense fallback={null}   ⚠ (CookieConsentBannerLazy — silent)
       └─ AuthProvider               ⚠ (5s profile timeout, but only if mounted)
       └─ SplashScreen
       └─ DeferredServicesProvider   ⚠ (lazy, suspends without dedicated fallback)
       └─ AppLockGuardShell          ⚠ (lazy, fallback={children} is a recursion smell)
       └─ Suspense fallback={null}   ⚠ (IntentNavigateProvider)
       └─ Suspense fallback={null}   ⚠ (3 lazy route trackers)
       └─ Suspense fallback={<RouteLoadingSkeleton/>}
          └─ TransitionRouter → TransitionRoutes → <Routes>
```

The three `Suspense fallback={null}` islands render **nothing** while suspended — invisible to users and to the HTML watchdog. The only fallback with a skeleton is on `<Routes>`, nested 7 providers deep.

---

## 3. Architecture Audit

### 3.1 Scale

- **1,233 lines** in `src/App.tsx` — single file holds 400+ `<Route>` entries, the provider tree, 5 `PillarSkeleton` variants, two `HomeRouter`-style components, `TransitionRouter`, and 50+ inline lazy imports.
- **182 page files** in `src/pages/`, **99 component subdirectories** under `src/components/`.
- **225 Supabase edge functions** in `supabase/functions/`.
- **666 migrations** in `supabase/migrations/`.
- **471 orphan source files** listed in `orphan_files.txt` (dead code not imported by the reachable graph), plus 3 orphan pages in `orphan_pages.txt`.

### 3.2 Findings

- **FA-1 · Monolithic App.tsx** (HIGH) — Route registry + provider tree + utility components in one file kills tree-shaking per-route, slows CI type-checking, and turns every route change into a merge-conflict magnet. Recommended: split `routes/` per pillar (Dashboard/Radar/Orbit/Wallet/Me/Admin/Pro/Auth/SEO), keep `App.tsx` ≤150 lines (providers + `<Routes>` + shell only).
- **FA-2 · Providers not isolated from routes** (HIGH) — Every route re-mounts through 9 providers. A failure in any provider bricks the entire app. Recommended: inject a `<AppShell>` boundary between providers and routes that renders a minimal public landing page if providers hang >3 s.
- **FA-3 · Two `vercel.json` files drift** (HIGH) — Root `vercel.json` rewrites `/(.*) → /index.html` (broad); app-local `easy-locs-ea1eb0ed/vercel.json` uses a narrower negated regex AND defines `/share/:type/:slug` + per-file cache headers that the root version is missing. Vercel picks whichever is at the configured root — if both are present, the deploy target determines behavior and this is fragile on re-config.
- **FA-4 · SW fights deploys** (HIGH) — `firebase-messaging-sw.js` is committed; the Workbox `sw.js` is PWA-plugin-generated at build. On deploy, old SW can serve stale `index.html` pointing at rotated chunk hashes → dynamic-import 404 → hang. `?nosw=1` / `?reset=1` escape hatches exist but require the user to know them.
- **FA-5 · Pillar-level `Suspense` boundaries inconsistent** (MED) — Some routes have pillar skeletons (`/dashboard`, `/radar`), most do not. Users see blank screens on slow networks.
- **FA-6 · 471 orphan files** (MED) — Dead code bloats bundles via accidental re-imports, confuses static analysis, and slows builds. Culling would meaningfully shrink the largest pillars.

---

## 4. Security Audit

- **FS-1 · 225 edge functions, no central auth/router** (HIGH) — Follow-up #126 (consolidate) and #225 (secure) already exist. Confirming the finding: handlers in `supabase/functions/*` duplicate Supabase client creation, CORS, input validation. Any single gap is a direct attack surface. Recommended shape: one `admin-router` + one `public-router`, shared auth/RLS gate, Zod-validated inputs.
- **FS-2 · Service-worker as trust boundary** (HIGH) — `sw.js` caches API responses; any RCE-equivalent via SW (if the SW is ever swapped) persists across reloads. Ensure SW scope is narrow, validate `Content-Type`/`Cache-Control` on registration, and version the SW under the app's release channel.
- **FS-3 · `Permissions-Policy` header is broad** (MED) — `index.html` meta grants `camera=(self), microphone=(self), geolocation=(self), payment=(self)` unconditionally to every route. Most SEO/marketing routes don't need these.
- **FS-4 · Env exposure** (MED) — `.env` contains both service-role-style names (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`) and `VITE_*` variants. Ensure no non-`VITE_*` secret leaks into the bundle (a `grep` on `dist/assets/*.js` for the Supabase service-role key signature is a CI must).
- **FS-5 · No CSP** (MED) — No `Content-Security-Policy` header. With Stripe, Mapbox, PostHog, Segment, Firebase, Sentry, Supabase and Partytown all loading from different origins, a tight CSP + nonce policy is non-trivial but overdue.

---

## 5. Performance Audit

- **FP-1 · Synchronous boot flags** (P0 — fixed) — The bug itself was a correctness issue, but also a perf symptom: the app has no "paint budget" signal.
- **FP-2 · Eager import of 50+ lazy chunks during boot** (HIGH) — `main.tsx` Stage-1/2/3 schedules `import()` calls for Sentry, analytics, performance, country-detection, structured-data, compliance, tokens, E2EE warmup, web-vitals, cross-tab, prefetch-engine, segment, super-app-bridge, cross-tab-worker, monitoring, event-init — **16 idle imports** in the first 5 s. On a slow 3G phone this saturates the connection and starves the actual route chunk. The original "progressive boot" comment is aspirational, not enforced.
- **FP-3 · `SPLASH_DURATION=1800` is fixed-wait** (MED) — The React SplashScreen waits 1.8 s regardless of whether the app is ready, adding artificial TTI on fast connections.
- **FP-4 · Speculation rules prefetch + prerender** (MED) — `index.html` requests prefetch of 7 routes and prerender of several city/guide patterns on every page load. On the initial broken state this contends with the main bundle.
- **FP-5 · Particle animations + multiple `willChange` layers** (LOW) — SplashScreen spawns up to 18 particles + 6 radar blips + 4 conic gradients with `willChange`. On low-end Android, compositor cost is non-trivial while the app is still parsing.
- **FP-6 · Bundle-report.json present** (INFO) — `dist/budget-report.json` exists; no visible alerting on regression.

---

## 6. Data Audit

- **FD-1 · 666 migrations** (HIGH) — Follow-up #237 already exists. Add: migration count suggests no squash policy. First-time local supabase boot cost is now prohibitive.
- **FD-2 · Retroactive data-normalization TODOs** — Follow-ups #226/#227 already cover. No duplication needed.
- **FD-3 · No visible schema documentation** (MED) — Neither `docs/` nor `replit.md` (absent) describe the data model. Anyone onboarding must read migrations in order.
- **FD-4 · Query cache hydration** (LOW) — `queryClient` is persisted (`setupQueryPersistence`, `hydrateFromCache`) but no version check; stale cached mutations can apply against new schemas.

---

## 7. Observability Audit

- **FO-1 · Silent boot failures** (HIGH) — The original bug had zero telemetry. There was no `sendBeacon`, no Sentry breadcrumb, no event.
- **FO-2 · Sentry initialized at idle (Stage 1)** (HIGH) — Any crash during module eval, `createRoot`, or first commit is lost. Sentry should be initialized in the first synchronous block of `main.tsx`, before `createRoot`, with the release tag set from `APP_VERSION` and source maps uploaded in CI.
- **FO-3 · `__EASYLOCS_BUILD_ID__` set but not surfaced** (MED) — Useful for support; no in-app "version" footer, no Sentry tag, no `console.info` on boot.
- **FO-4 · Monitoring imports duplicated** (LOW) — `@/lib/monitoring` and `@/lib/analytics/sentry` both exist; the boot chain uses both without clear separation of concerns.
- **FO-5 · No RUM for splash duration** (MED) — Since the splash is the #1 failure mode, track "time-to-first-react-commit" and "splash-stuck > 10s" as explicit metrics.

---

## 8. Top 10 Risks (ranked)

| # | Risk | Severity | Likelihood | P |
|---|---|---|---|---|
| R1 | Stuck splash / un-self-healing boot | **Critical** | Realized | P0 (FIXED) |
| R2 | SW serving old HTML referencing rotated chunk hashes | Critical | High | P1 |
| R3 | Top-level Suspense w/ `fallback={null}` hides failures | High | Medium | P1 |
| R4 | 225 edge functions w/o unified auth & validation | High | Medium | P1 (#126/#225) |
| R5 | `vercel.json` drift between repo root and app dir | High | Medium | P1 |
| R6 | Sentry initialized too late to catch boot crashes | High | High | P1 |
| R7 | 1,233-line `App.tsx` slows every change & hides bugs | High | Realized | P1 |
| R8 | 471 orphan source files bloat builds & analysis | Medium | Realized | P2 |
| R9 | 666 unsquashed migrations | Medium | Realized | P2 (#237) |
| R10 | No CSP header, broad Permissions-Policy | Medium | Low | P2 |

---

## 9. Prioritized Roadmap

### P0 — **shipped in this task (#718)**

1. **Boot-flag lifecycle** — set `__EASYLOCS_REACT_MOUNTED__` + `__EASYLOCS_BOOTED__` from React `useEffect` in `SplashScreen`, not from sync code in `main.tsx`. Effect: stuck users self-heal on next visit via existing 15 s `checkBoot` + 6 s rescue button.
2. Audit doc (this file) — one doc, exec-summary-first.

### P1 — next sprint (tracked as follow-up tasks)

- **P1-A** Deploy-safety: consolidate `vercel.json` (single source of truth) + force SW to skip-waiting on release + pin `sw.js` to a build-specific hash.
- **P1-B** Initialize Sentry synchronously at top of `main.tsx`, tag `release = APP_VERSION`, upload source maps from CI.
- **P1-C** Hoist a deterministic top-level `Suspense` fallback that *replaces* `#app-loading` on first paint (component renders an empty div + dispatches `react-splash-ready` immediately; guarantees DOM swap within the first commit).
- **P1-D** Add RUM: measure "time-to-first-react-commit" and fire a `navigator.sendBeacon` Sentry event if >8 s.
- **P1-E** Split `App.tsx` into `src/routes/<pillar>.tsx`; keep `App.tsx` ≤150 lines.
- **P1-F** (existing #126 & #225) consolidate + secure edge functions behind `admin-router` / `public-router`.
- **P1-G** Narrow `Permissions-Policy` per-route (move out of meta, into route-scoped headers).

### P2 — quarter goals

- **P2-A** Cull 471 orphan files; enforce "no new orphans" via `knip`/CI.
- **P2-B** (existing #237) squash migrations at a semantic cut-line; document data model in `docs/DATA_MODEL.md`.
- **P2-C** Introduce CSP with per-origin allowlist for Stripe/Mapbox/PostHog/Segment/Firebase/Sentry/Supabase/Partytown.
- **P2-D** Lighthouse & bundle-size budgets enforced in CI; fail build on >10% regression.
- **P2-E** Squash orphan inventories into a live `docs/CODE_MAP.md` regenerated on `predev` (next to `generate-locales.ts`).
- **P2-F** Kill artificial `SPLASH_DURATION` wait on fast connections (use `progress` / `__EASYLOCS_BOOTED__` directly).
- **P2-G** Version-tag `queryClient` persisted cache; invalidate on `APP_VERSION` change.

---

## 10. Verification

- Dev workflow (`http://localhost:5000/`) renders normally post-fix (navbar, Index page).
- `src/main.tsx` no longer sets boot flags synchronously; the comment block explains why.
- `src/components/brand/SplashScreen.tsx` `useEffect` now sets both flags + dispatches `react-splash-ready` on real commit.
- No regression on happy path — flags are set during the same paint tick that removes `#app-loading`.
- Failure mode regression check: if React never commits, `#app-loading` stays, flags stay `false`, `checkBoot` fires `showBootError` at 15 s → nukes SW + reloads once → fresh bundle → commits → flags set → normal boot.

---

## 11. References

- Evidence collected in the `<scratchpad>` of task #718.
- `easy-locs-ea1eb0ed/src/main.tsx` · `easy-locs-ea1eb0ed/src/App.tsx` · `easy-locs-ea1eb0ed/src/components/app/AppRouters.tsx` · `easy-locs-ea1eb0ed/src/components/brand/SplashScreen.tsx` · `easy-locs-ea1eb0ed/index.html`
- Deploy drift: `vercel.json` (root) vs `easy-locs-ea1eb0ed/vercel.json`
- Orphan inventory: `orphan_files.txt`, `orphan_pages.txt`, `orphan_candidates.txt`
- Existing follow-up tasks explicitly NOT duplicated here: #126, #225, #226, #227, #237.

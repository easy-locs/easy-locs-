# Boot Chain Audit (Task #913)

## Summary
The dev boot was producing a blank gray screen because
`validateIntegrationsBoot()` ran at the **top of `src/main.tsx`**, *before*
the `try/catch` that wraps `ReactDOM.createRoot(...).render(...)`. When any
integration with `enforceInDev: true` was missing its env vars (AWS region,
PostHog key/host), that helper threw, module evaluation aborted, no React
tree mounted, and the HTML splash was hidden in dev — so users saw nothing.

This audit walks every helper invoked between the initial HTML download and
the first React commit, classifies it as *critical* (must succeed for the UI
to render) or *non-critical* (boot must continue without it), and records
the protection that now keeps a single failure from blanking the screen.

## Defense in depth

| Layer | Where | What it catches |
|---|---|---|
| 1. Per-helper `try/catch` | `src/main.tsx`, `src/App.tsx` | A throw inside any single boot helper (Sentry init, OTel, trace context, integration validation, `bootstrapAppRuntime`) |
| 2. Render `try/catch` | `src/main.tsx` | A throw inside `ReactDOM.createRoot(...).render(...)` or `validateIntegrationsBoot()` — renders the inline **Boot Error** UI with reload button |
| 3. React error boundary | `src/components/system/GlobalErrorBoundary.tsx` (inside `CoreProviders`) | A throw inside any provider, route, or component during/after the first render — renders the same brand-styled error screen |
| 4. Chunk recovery boundary | `src/components/system/ChunkRecoveryBoundary.tsx` | Stale lazy-chunk imports (post-deploy) |
| 5. HTML splash + watchdog | `index.html` | If React never commits within 15 s, swap the splash for a "Reset & retry" UI; emergency `?nosw=1` / `?reset=1` escape hatch |

The HTML splash is now visible in dev as well as prod, so a stalled boot is
visibly stuck instead of looking like a blank page.

## Helper-by-helper findings

### `initSentryBoot()` — `src/lib/analytics/sentry.ts`
- **Tier:** non-critical (observability).
- **Risk:** Sentry SDK constructor can throw on malformed DSN.
- **Protection:** wrapped in per-helper `try/catch` in `main.tsx`. Sentry
  itself no-ops when `VITE_SENTRY_DSN` is absent and the registry now treats
  Sentry as `enforceInDev: false`.

### `validateIntegrationsBoot()` — `src/lib/integrations/registry.ts`
- **Tier:** mixed. Throws only for integrations marked `enforceInDev: true`.
- **Re-tiering:** **only `supabase`** is now `enforceInDev: true`. Mapbox,
  AWS, Sentry, PostHog are demoted to warn-only — they each degrade
  gracefully at runtime (Mapbox falls back to MapLibre, AWS only affects
  signed uploads, Sentry/PostHog already no-op without keys).
- **Protection:** moved **inside** the render `try/catch`, so a missing
  Supabase key now lands on the inline Boot Error UI with the message
  visible to the user instead of aborting module evaluation.
- **Surface:** `MissingIntegrationsBanner` (dev-only) lists every
  integration with missing keys as a fixed footer chip with a link to the
  diagnostics page. The banner only mounts on internal admin routes
  (paths under `/admin`) so it never overlays public/visitor-facing pages
  in the Replit preview. The boot-time console warning is emitted once
  from `main.tsx` via `warnMissingIntegrationsOnce()` regardless of route,
  so engineers still see the signal in logs even when the banner is hidden.

### `startTrace()` / `installFetchTracePropagation()` — `src/lib/observability/trace-context.ts`
- **Tier:** non-critical.
- **Risk:** Patches `window.fetch`. A throw would prevent every later
  network call.
- **Protection:** wrapped in per-helper `try/catch`.

### `initBrowserOtel()` — `src/lib/observability/otel-bootstrap.ts`
- **Tier:** non-critical, no-op without `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`.
- **Protection:** already returns a Promise; now also wrapped in `try/catch`
  for the synchronous portion.

### `bootstrapAppRuntime()` — `src/app/app-bootstrap.ts`
- **Tier:** semi-critical. Sets up React Query persistence, prefetch, web
  vitals, cross-tab sync. Most work is `safeIdleCallback`-deferred and
  `.catch(() => {})`-guarded already.
- **Risk:** synchronous setup (`setupQueryPersistence`, `setActionQueryClient`,
  `hydrateFromCache().catch(...)`) runs at module top-level via the call site
  in `App.tsx`.
- **Protection:** call site in `App.tsx` is wrapped in a `try/catch` so a
  throw degrades to a console warning rather than blanking the screen.

### `CoreProviders` tree — `src/app/deferred-runtime.tsx`
- `LazyMotion`, `ThemeProvider`, `QueryClientProvider`, `I18nProvider` —
  all production-grade providers.
- **Protection:** entire tree is wrapped by `GlobalErrorBoundary` which
  renders the brand-styled error screen with a reload button on any throw.

### `DeferredServicesProvider` / `DeferredBootGuards` / `AppLockGuardShell`
- All gated behind `Suspense` with a passthrough fallback (`<>{children}</>`)
  so a slow or failing chunk does **not** delay the rest of the shell.
- Each lazy import has its own `Suspense` boundary; a chunk-load failure is
  caught by `ChunkRecoveryBoundary` and triggers a one-shot reload.

### `SplashScreen` — `src/components/brand/SplashScreen.tsx`
- Sets `__EASYLOCS_REACT_MOUNTED__` / `__EASYLOCS_BOOTED__` in `useEffect`,
  not synchronously, so the HTML watchdog still functions if React fails
  to commit (regression protection from task #718 preserved).
- Auto-disables itself in dev (`showSplash = false`) — the HTML splash is
  the single source of truth for the loading state in dev.

### `index.html` boot watchdog
- 15 s timeout to detect stalled boot.
- 6 s rescue button on the splash itself.
- `?nosw=1` / `?reset=1` query string nukes service workers + caches and
  reloads.

## Smoke verification

| Scenario | Expected | Verified |
|---|---|---|
| All env vars present | Renders normally, no banner | Yes |
| `VITE_AWS_REGION` + PostHog keys removed | Renders normally; dev banner lists "AWS, PostHog" | Yes |
| `VITE_SUPABASE_URL` removed | Inline Boot Error UI in `#root` with the validator message and a Reload button — never blank | Yes |

## Follow-ups (not in scope of #913)

- Add a `pnpm validate:integrations` CLI script that re-runs
  `validateIntegrationsBoot()` with strict mode for CI.
- Move `__POSTHOG_KEY__` / `__POSTHOG_HOST__` injection in `index.html` to a
  templated build step so the Partytown snippet only loads when keys exist.
- Consider lifting `bootstrapAppRuntime()` from a top-level call in
  `App.tsx` into a `useEffect` so it never runs during module evaluation.

# Landing page (`/`) first-paint investigation

> Triggered by the bug-surfacing campaign weak-flow finding:
> guest first paint of `/` measured at **8.1 s** under Playwright on the local
> dev server (`vite dev`, no production optimisations).

## TL;DR

The route `/` triggers **eager load of 15 modules** via `<link
rel="modulepreload">` in the production `index.html`. Combined size:

| Compression | Bytes      | Approx. on 4G (4 Mbps) |
|---:|---:|---:|
| raw      | 4 298 221 | ~8.6 s                  |
| gzip     | 1 161 593 | ~2.3 s                  |
| brotli   |   940 441 | ~1.9 s                  |

Even on broadband the parse + execute cost of ~4 MB of JS dominates the
landing TTI. The single biggest non-vendor contributor is the **i18n
translation bundle (`i18n-data`, 763 KB raw / 137 KB br)** which is
preloaded for every visitor, in every language, before any UI is shown.
The next biggest avoidable cost is **`vendor-charts` (404 KB raw /
95 KB br)** — the landing page does not render charts.

## Eager-loaded modules on `/`

Source: `easy-locs-ea1eb0ed/dist/index.html` `<link rel="modulepreload">`
directives + the entry `<script type="module" src="/assets/index-…js">`.

| Module                       | raw KB | gzip KB | brotli KB |
|---|---:|---:|---:|
| `index-BX2Oeze-.js` (entry)  | 1 040  | 247     | 187       |
| `i18n-data`                  |   763  | 191     | 137       |
| `vendor-sentry`              |   408  | 135     | 115       |
| `vendor-charts`              |   395  | 114     |  95       |
| `vendor-react-core`          |   245  |  63     |  53       |
| `vendor-react-dom`           |   198  |  63     |  55       |
| `vendor-supabase`            |   167  |  44     |  37       |
| `vendor-analytics`           |   170  |  57     |  49       |
| `discovery`                  |   177  |  43     |  36       |
| `taxonomy`                   |   157  |  34     |  28       |
| `vendor-radix`               |   154  |  40     |  33       |
| `vendor-motion`              |   137  |  45     |  41       |
| `map-engine`                 |   102  |  34     |  29       |
| `vendor-tanstack`            |    54  |  16     |  14       |
| `vendor-utils`               |    31  |  10     |   9       |
| **Total**                    | **4 198** | **1 134** | **918** |

(Plus `index-L-SWlOsp.css` ≈ 360 KB, third-party scripts: PostHog
loader, Google Fonts, PartyTown, service worker registration.)

## Main contributors and why they are eager

1. **`i18n-data` (137 KB br)** — preloaded as `modulepreload`, presumably
   so every translation key resolves synchronously on first render. The
   public landing only uses one language at a time and a small subset of
   keys. **High-impact, low-effort fix.**
2. **`vendor-charts` (95 KB br)** — chart library bundled into the
   eager set even though the landing page renders no charts. Likely
   pulled in by a default re-export from a shared component barrel.
3. **`vendor-sentry` (115 KB br)** — full Sentry browser SDK preloaded
   at import time. Sentry supports a lazy "loader script" pattern that
   defers everything except the error queue.
4. **`vendor-analytics` (49 KB br)** — duplicated by the inline PostHog
   bootstrap snippet in `index.html`; one of the two should win.
5. **`map-engine` + `discovery` + `taxonomy` (93 KB br combined)** —
   if the landing has no map above the fold, these can be dynamically
   imported on the search/discovery route only.
6. **`index-…js` entry (187 KB br, 1 MB raw)** — the entry chunk is
   doing too much synchronous work. Worth splitting into:
   - boot (theme, error boundary, router)
   - landing page module (lazy)
   - app shell (lazy after auth check)

## Smallest high-impact improvements (ranked)

| # | Change                                                                                                | Estimated saving (br) | Effort |
|---:|---|---:|---|
| 1 | Lazy-load the `i18n-data` chunk on demand (only ship the active locale eagerly)                       | ~110 KB               | S      |
| 2 | Remove `vendor-charts` from the landing route (dynamic import on dashboard/admin only)                | ~95 KB                | S      |
| 3 | Switch Sentry to its loader-script pattern (defers full SDK)                                          | ~90 KB                | S      |
| 4 | Move `map-engine`, `discovery`, `taxonomy` out of `modulepreload` for `/`                             | ~93 KB                | S      |
| 5 | Drop the duplicate inline PostHog snippet (keep the bundled `vendor-analytics` SDK, or vice-versa)    | ~49 KB                | XS     |
| 6 | Split the 1 MB `index-…js` entry: boot vs. landing vs. authed-shell                                   | 100–250 KB            | M      |

Cumulative target: shave **≈ 400 KB brotli** (≈ 45 % of current eager
JS), which on a typical 4G connection translates to **~0.8 s less TTI**
and significantly less main-thread parse/execute time on low-end
mobile.

## Verification plan

- Run a Lighthouse mobile audit before and after each change against
  the production build. Track First Contentful Paint, Time To
  Interactive, and Total Blocking Time.
- Re-run the guest probe (`scripts/qa/guest-probe.mjs`) — currently
  the durationMs for `/` is **8 132 ms**; we should be able to drive
  this under 3 000 ms after items 1–4.
- The existing `easy-locs-ea1eb0ed/dist/budget-report.json` already
  enforces per-vendor size budgets — extend it to include a budget for
  the **eager preload set** (target: ≤ 700 KB brotli) so regressions
  are caught at build time.

## Implementation status

| # | Status         | Notes                                                                                              |
|---:|---------------|----------------------------------------------------------------------------------------------------|
| 3 | **Implemented** | New `src/lib/analytics/sentry-boot-shim.ts` wraps `initSentryBoot` / `captureBootCrash` / `reportTimeToFirstRender` / `getSentryHealth` with a queue. `main.tsx` and `lib/integrations/health.ts` now import from the shim, so `@sentry/react` is reached only via the dynamic `import("@/lib/analytics/sentry")` inside `flushSentryBoot()` (called in the existing Stage 1 `requestIdleCallback`). Errors thrown before flush are queued via `window.error` / `unhandledrejection` listeners and drained once the SDK is loaded. Expected eager-bundle savings: ≈ 115 KB brotli (the entire `vendor-sentry-*` chunk leaves the entry's static graph). |
| 1, 2, 4, 5, 6 | Pending | See ranked table above. None implemented in this pass.                                  |

## Caveats

- The 8.1 s figure was measured against `vite dev`, which serves
  unbundled modules — production performance will be better, but the
  *relative* cost ranking above is bundle-size-driven and therefore
  applies to production too.
- A clean re-measurement against the staging build is required before
  promoting any of these to a fix-task. (Tracked in follow-up #1072.)

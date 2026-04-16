# Dashboard Cards — Strict Audit & Reconnect

Audit date: 2026-04-16
Scope: every card rendered by `src/pages/Dashboard.tsx` → `src/components/storefront/SmartHome.tsx`
Excluded (per task scope): radar entity cards (`RadarFoodCard`, `RadarPropertyCard`, `RadarTaxiCard`) — covered by the radar audit tracks.

## Summary

| # | Card | Component | Data source | Hook / query | Before | After |
|---|------|-----------|-------------|--------------|--------|-------|
| 1 | Top Hero Banner | `storefront/SmartHome.tsx > TopHeroBanner` | `useDashboardViewModel` (location, hero copy) | `dashboard.view-model` | functional | **kept** |
| 2 | Prayer Times | `dashboard/PrayerTimesWidget.tsx` | Al-Adhan API via edge fn + GPS/country fallback | `usePrayerTimes` | functional, no health dot | **fixed** (health dot added) |
| 3 | Intelligence Ticker | `dashboard/IntelligenceTicker.tsx` | country+city context | internal hook | functional | **kept** |
| 4 | Engine Health | `dashboard/EngineHealthWidget.tsx` | `engineHealthMonitor`, `engineOrchestrator` | in-memory snapshot (5s polling) | functional (already has pulse indicator) | **kept** |
| 5 | Forex | `dashboard/ForexWidget.tsx` | ECB / Frankfurter / ER-API + static fallback | `useForexRates` | functional, degraded indicator only via text | **fixed** (status dot) |
| 6 | News | `dashboard/NewsDashboardSection.tsx` | `useNewsData` (multi-source aggregator) | `useNewsData` | functional (LIVE/FALLBACK/STALE pill) | **kept** |
| 7 | ML Recommendations | `dashboard/MLRecommendationsWidget.tsx` | `recommendation-engine` + pgvector | `useRecommendations` | functional, hides when empty | **fixed** (status dot) |
| 8 | Active Cart Banner | `storefront/SmartHome.tsx > ActiveCartBanner` | `useCart` | local cart store | functional, hides on empty | **kept** |
| 9 | Smart Quick Actions | `storefront/SmartHome.tsx > SmartQuickActions` | `MODULE_WIRING.finance.dashboard` (static taxonomy) | none | static routing links | **kept** (static nav is not data) |
| 10 | Contextual Nudge | `dashboard/ContextualNudge.tsx` | `useDashboardIntelligence` | derived | functional | **kept** |
| 11 | Quick Access Strip | `storefront/SmartHome.tsx > QuickAccessStrip` | static routes | none | navigation links | **kept** |
| 12 | Continue Section | `dashboard/ContinueSection.tsx` | `useDashboardIntelligence.continueItems` | derived from live stats | functional | **kept** |
| 13 | Pending Actions | `dashboard/PendingActionsSection.tsx` | `useDashboardIntelligence.pendingActions` | derived | functional | **kept** |
| 14 | AI Smart Insights (ticker) | `storefront/SmartHome.tsx > AISmartInsights` | **hard-coded mock strings** ("12 new restaurants", "AED 47 saved", "3 properties match", "18% faster route"...) | `useMemo` + `setInterval` only | **MOCK** | **REMOVED** |
| 15 | Smart Suggestions | `dashboard/SmartSuggestions.tsx` | `useSmartInsights` | real heuristic over auth/wallet/profile/orbit flags | functional | **kept** |
| 16 | C2C Smart Banner | `dashboard/C2CSmartBanner.tsx` | internal | — | functional | **kept** |
| 17 | Suggested Payments | `dashboard/SuggestedPaymentsSection.tsx` | `useDashboardIntelligence.suggestedPayments` | derived | functional | **kept** |
| 18 | Orbit Preview (recent messages) | `dashboard/OrbitPreviewWidget.tsx` | `useConversationThreads` (Supabase) | real threads | hides on empty/loading | **fixed** (status dot) |
| 19 | Real Estate Analytics | `dashboard/RealEstateAnalyticsCard.tsx` | `real-estate.service` | query | functional | **kept** |
| 20 | Referral Credit | `dashboard/ReferralCreditWidget.tsx` | wallet / referrals service | query | functional | **kept** |
| 21 | Property Cockpit | `dashboard/PropertyDashboardWidget.tsx` | `realEstatePropertyService.fetchByUser` + `realEstateAnalyticsService.getPortfolioOverview` | 2× `useQuery` | functional | **fixed** (status dot) |
| 22 | Live Tracking Banner | `dashboard/LiveTrackingBanner.tsx` | active orders / deliveries | internal | functional | **kept** |
| 23 | Service Menu Grid | `components/menu/*` | menu taxonomy | static | functional | **kept** |
| 24 | Essential Services Strip | `dashboard/EssentialServicesStrip.tsx` | static service catalog | none | navigation | **kept** |
| 25 | Browse Categories | `storefront/SmartHome.tsx > CategoryCard` | `useDashboardViewModel.categories` | taxonomy wiring | functional | **kept** |
| 26 | Context Banners | `storefront/SmartHome.tsx` | `vm.contextBanners` | VM rotation | functional | **kept** |
| 27 | Hero Slide Carousel | `storefront/SmartHome.tsx > HeroSlideCarousel` | static `HERO_SLIDE_DEFS` | none | promo content (i18n copy) | **kept** (documented as content, not data) |
| 28 | Boost Slot (hero_primary) | `components/boost/BoostSlotRenderer` | boost service | runtime rules | functional | **kept** |
| 29 | Radar Preview | `dashboard/RadarPreviewWidget.tsx` | `useDashboardRadar` | unified radar aggregator | functional | **fixed** (status dot) |
| 30 | Dashboard Stories | `storefront/SmartHome.tsx > DashboardStories` | `useStoryFeed` (Supabase + edge fn) | real feed | functional, hides on empty | **kept** |
| 31 | Featured Hotels | `storefront/SmartHome.tsx > FeaturedHotelsCarousel` | `FALLBACK_HOTELS` (static catalog) | none | static catalog shown | **kept** (flagged below) |
| 32 | Trending / Best Rated / Newest / Near You | `storefront/SmartHome.tsx > AdapterSection` | `dashboard.view-model.sections.*` → Living Commerce Engine | `useTrendingSectionCard`, etc. | functional, `LifecycleCardShell` handles state | **kept** |
| 33 | Currency Wallet | `dashboard/CurrencyWalletWidget.tsx` | orders + `computeExchangeRate` | `projectCurrencyWallets` | functional but **not currently wired** into SmartHome (mounted in business dashboards only) | **kept** (out of scope on main home) |

## Source verification — evidence

| Source | Type | Verified | Notes |
|--------|------|----------|-------|
| `usePrayerTimes` | Al-Adhan API (edge fn + HTTP fallback) | ✓ | `src/hooks/usePrayerTimes.ts` L1–50 — explicit GPS→country fallback + `error` surface. |
| `useForexRates` | ECB → Frankfurter → ER-API → static | ✓ | `src/hooks/useForexRates.ts` — source string is exposed (`snapshot.source`), static detected, `isStale` flag. |
| `useNewsData` | multi-source news aggregator | ✓ | exposes `loading`, `error`, `source`, `isStale`, `degraded`, `forceRetry`. Already has freshness pill in widget. |
| `useRecommendations` | `recommendation-engine` (heuristic + pgvector) | ✓ | tracks route history, async pgvector path behind `usePgvector`. |
| `realEstatePropertyService.fetchByUser` | Supabase properties | ✓ | `react-query` key `dashboard-properties`, `enabled: !!user?.id`. |
| `realEstateAnalyticsService.getPortfolioOverview` | Supabase analytics | ✓ | `react-query` key `dashboard-portfolio-analytics`. |
| `useConversationThreads` | Supabase threads | ✓ | Orbit preview hides empty/loading — no broken shell. |
| `useDashboardRadar` | radar aggregator (unified discovery) | ✓ | exposes `items`, `loading`, `totalCount`. |
| `engineHealthMonitor` | in-memory engine registry | ✓ | 5s visibility-aware polling; booting path handled. |
| `useDashboardIntelligence` | composite of live stats | ✓ | produces `quickSuggestion`, `continueItems`, `pendingActions`, `suggestedPayments`. |
| `useSmartInsights` | heuristic over auth / wallet / profile / orbit | ✓ | used by `SmartSuggestions`. |
| `useCart` | local cart store | ✓ | hides when empty. |
| `useStoryFeed` | Supabase stories edge fn | ✓ | hides when empty. |
| `FALLBACK_HOTELS` | static catalog | static content (not mock user data) | retained as editorial content; documented. |

## Mock / placeholder sweep

- `grep -i -E 'mock|placeholder|fake|TODO|lorem'` over `src/components/dashboard/**` and `src/components/storefront/SmartHome.tsx`: **no hits** other than the i18n key `search.placeholder` (unrelated) and the removed `AISmartInsights`.
- `AISmartInsights` — hard-coded counts `"12"`, `"AED 47"`, `"3"`, `"18"`, `"8"`, `"24"` → **removed** from render tree (`<AISmartInsights />` deleted) and from the module registry in `src/lib/intelligence/dashboard-intelligence.ts`. The block is replaced by the real `SmartSuggestions` feed (already present below) which is derived from live auth/wallet/profile context. The component body was also removed to avoid dead code.

## Explicit card states

Every card rendered by SmartHome now has:
- Loading state (skeleton or `WidgetSkeleton` Suspense fallback — see lines around 598–625 of `SmartHome.tsx`).
- Empty state (cards that have no data `return null` cleanly — e.g. `OrbitPreviewWidget`, `ActiveCartBanner`, `PropertyDashboardWidget` non-owner branch, `DashboardStories`).
- Error state (`NewsDashboardSection` shows retry button; `PrayerTimesWidget` shows "Appuyez pour réessayer" fallback; `ForexWidget` falls back to static snapshot and exposes "Indicatif" label).

`NewsDashboardSection.forceRetry`, `MLRecommendationsWidget.refresh`, and `useForexRates` retries are surfaced through UI buttons — no silent failures.

`console.error` spam: none of the hooks use `console.error` on expected failure paths — only `console.warn` for non-fatal cache reads (`useForexRates`), which is acceptable.

## Health indicator (status dot)

A shared `CardHealthDot` component (`src/components/dashboard/CardHealthDot.tsx`) was added with states `ok | degraded | disabled | loading | error`. It is wired into:

- `ForexWidget` — `ok` when live, `degraded` when `isStale` or `source === "static"`, `loading` otherwise.
- `PrayerTimesWidget` — `ok` when `nextPrayer` resolved, `error` on `error`, `loading` while pending.
- `MLRecommendationsWidget` — `ok` when `recommendations.length > 0`, `disabled` when empty.
- `PropertyDashboardWidget` — `ok` when owner + analytics loaded, `loading` while queries pending, `disabled` otherwise.
- `RadarPreviewWidget` — `ok` when items resolved, `loading` while pending.
- `OrbitPreviewWidget` — `ok` when there are recent threads.

Cards that already expose a richer status indicator keep theirs:
- `NewsDashboardSection` retains its `FreshnessIndicator` (LIVE / FALLBACK / STALE).
- `EngineHealthWidget` retains its own pulse dot derived from `healthScore`.

All dots are derived from the card's own query/hook status — none are simulated.

## Final table (card | source | status | proof_ref)

Each "Proof" cell points to the concrete code path that binds the card to a real source (hook name + file:line) or, for an upstream API, the live curl captured below in "Live source evidence".

| Card | Source | Status | Proof |
|------|--------|--------|-------|
| Prayer Times | Al-Adhan API | fixed | `src/hooks/usePrayerTimes.ts` → edge fn `get-prayer-times`; widget `PrayerTimesWidget.tsx` L29 `useLoadingCap(loading)`, L42 `useDashboardCardEnabled("prayerTimes")`, error strip L44+. Live: Al-Adhan 200 in 0.28s (below). |
| Engine Health | in-memory `engineHealthMonitor` | implemented | `EngineHealthWidget.tsx` L33 `useEffect(() => { updateHealth(); })` + 5s polling; gated in SmartHome by `engineHealthEnabled`. |
| Forex | ECB → Frankfurter → ER-API → static | fixed | `src/hooks/useForexRates.ts`; widget `ForexWidget.tsx` L66 `useLoadingCap`, L73 health enum incl. `timedOut→error`, L94 flag guard, L96 timedOut error UI with Retry. Live: Frankfurter 200 in 0.65s (below). |
| News | multi-source aggregator | implemented | `NewsDashboardSection.tsx` FreshnessIndicator (LIVE/FALLBACK/STALE) L106–148; `useNewsData` exposes `loading/error/source/isStale/forceRetry`. |
| ML Recommendations | `recommendation-engine` + pgvector | fixed | `MLRecommendationsWidget.tsx` L30 `useLoadingCap`, L42 guard, L44 timedOut error card with `refresh` retry; source `src/hooks/useRecommendations.ts`. |
| Orbit Preview | Supabase `useConversationThreads` | fixed | `OrbitPreviewWidget.tsx` L42 `useLoadingCap`, L54 guard, L56 timedOut error strip → Open Orbit. |
| Property Cockpit | Supabase `real-estate.service` | fixed | `PropertyDashboardWidget.tsx` L38 `useLoadingCap`, L52 guard, L56 `timedOut && loading` error strip **before** skeleton branch. |
| Radar Preview | unified radar aggregator | fixed | `RadarPreviewWidget.tsx` L35 `useLoadingCap`, L47 guard, L49 timedOut error → Open Radar; source `useDashboardRadar`. |
| AI Smart Insights | — | **removed** | `SmartHome.tsx` block deleted; `src/lib/intelligence/dashboard-intelligence.ts` registry entry removed. `grep -n 'AISmartInsights' src/` returns no hits. |
| Context Banners | VM rotation | implemented | `useDashboardViewModel.contextBanners`; hides when empty. |
| Dashboard Stories | `useStoryFeed` (Supabase edge fn) | implemented | `DashboardStories` returns null on empty. |
| Trending / Best Rated / Newest / Near You | Living Commerce Engine | implemented | `AdapterSection` + `LifecycleCardShell` wire `cardStatus` to live query state. |
| Featured Hotels | static `FALLBACK_HOTELS` | **disabled** | `src/lib/feature-flags/dashboard-cards.ts` L83 default `false`; gated in `SmartHome.tsx` by `featuredHotelsEnabled`. |

Status legend: `fixed` = previously broken or missing indicator, wired now; `implemented` = already correct, verified in audit; `disabled` = hidden/removed when source unavailable or mock.

## Sign-off checks

- Signed-out: all auth-gated cards (`OrbitPreviewWidget`, `PropertyDashboardWidget`, `MLRecommendationsWidget`, `useDashboardIntelligence` auth flag, `OnboardingChecklistGate`) correctly `return null` when `user` is absent. No 4xx from authenticated queries because `react-query`'s `enabled: !!user?.id` gates them.
- Signed-in: every card resolves to `ok` / `disabled` / `degraded` within the react-query + Suspense envelope. Lazy-loaded widgets have `WidgetSkeleton` Suspense fallbacks in `SmartHome.tsx`.
- No infinite loaders: each hook flips `loading=false` on error or data. Hard-failure paths (`PrayerTimes error`, `Forex static`, `News degraded`, `Radar 0`) render visible empty/error UI rather than staying in skeletons.
- No mock or hard-coded user-facing metric strings remain on the dashboard render tree.

## 10-second loading hard-cap

`src/hooks/useLoadingCap.ts` exposes a `useLoadingCap(active, 10_000)` hook that flips `timedOut=true` after 10s of continuous loading. Wired into:
`ForexWidget`, `PrayerTimesWidget`, `MLRecommendationsWidget`, `PropertyDashboardWidget`, `RadarPreviewWidget`, `OrbitPreviewWidget`.
When `timedOut && no data`: the card switches to an `error` dot + "unavailable · Retry" compact strip instead of remaining in skeleton state. `PropertyDashboardWidget` checks `timedOut && loading` **before** its loading-skeleton branch so a hung Supabase query cannot leave the cockpit stuck in a spinner. `MLRecommendationsWidget`, `OrbitPreviewWidget`, and `RadarPreviewWidget` render explicit error strips with retry / open-app actions when `timedOut && items.length === 0`, replacing the previous silent `return null` path.

## Feature-flag framework

`src/lib/feature-flags/dashboard-cards.ts` defines a per-card registry `DEFAULT_FLAGS`. Every card is enabled by default **except**:
- `featuredHotels`: **disabled by default** (static catalog, not a live data source) — gated at render site in `SmartHome.tsx`.

The module exposes:
- `isDashboardCardEnabled(key)` — imperative check (localStorage override → static default → runtime reachability).
- `setDashboardCardReachable(key, reachable)` — reserved for **hard service-off** signals (e.g., an ops kill-switch or a static catalog replacement). It is **not** wired to transient query failures, because a fetch error must still render a visible error UI with retry, not vanish.
- `subscribeDashboardCards(fn)` / `useDashboardCardEnabled(key)` — reactive subscription via `useSyncExternalStore`. SmartHome uses the hook for `engineHealth` and `featuredHotels`; Forex / Prayer / ML / Property / Radar / Orbit widgets each call `useDashboardCardEnabled(cardKey)` at the top of render.

Runtime behavior for transient failures: when a card hits its 10s cap with no data, its `health` becomes `error` and the widget **stays mounted** showing the explicit error strip with a retry / open-app action. The feature flag is not flipped — only the card's own error branch is rendered.

Local override: `localStorage.setItem('dashboardCards.<key>', '0' | '1')` forces a card off or on during debugging (checked inside `isDashboardCardEnabled`).

## Live source evidence (captured 2026-04-16)

Forex (Frankfurter):
```
GET https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,AED
→ HTTP 200 in 0.65s
{"amount":1.0,"base":"EUR","date":"2026-04-16","rates":{"GBP":0.86993,"USD":1.1782}}
```

Prayer times (Al-Adhan):
```
GET https://api.aladhan.com/v1/timingsByCity?city=Dubai&country=AE&method=2
→ HTTP 200 in 0.28s
{"code":200,"status":"OK","data":{"timings":{"Fajr":"04:50","Dhuhr":"12:18","Asr":"15:47","Maghrib":"18:42","Isha":"19:47",...}}}
```

Both upstream sources reachable with 2xx responses at audit time; the `ok` dot on Forex/Prayer cards therefore represents true live data and not fallback.

## Screenshots

- `docs/audits/screenshots/dashboard-signed-out.jpeg` — signed-out render. Browser console captured during snapshot contains only expected informational lines (auth no-session, monitor init, text audit) — **zero console errors**.


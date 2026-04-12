# Phase 2 — Real Provider Architecture (Plan Only — Awaiting Final Approval)

> **Status**: Planning document only. No implementation performed.
> **Prerequisite**: Phase 0 (Foundation) locked. Phase 1 (Ticker + Country Info) locked.
> **Date**: 2026-04-12
> **Scope**: Replace stub providers with real external data providers for weather and forex. Add timezone resolution. Add resilience layer (timeout, cache, circuit breaker, fallback, deduplication). Preserve all Phase 0/1 safety guarantees.

---

## 1. Objective

Replace the Phase 1 mock providers (`weather-provider-stub.ts`, `forex-provider-stub.ts`) with real external API providers that deliver live weather and forex data to the triple-gated intelligence ticker. Add timezone-aware scheduling. All connections remain flag-gated, kill-switch protected, timeout-bounded, and cache-backed. Provider architecture is canonical and provider-independent — swapping providers requires no structural refactor.

---

## 2. Provider-Agnostic Architecture

### 2.1 Canonical Provider Contract

Every provider — current or future — implements the same `IntelligenceProvider` interface defined in Phase 1's `provider-adapter.ts`:

```typescript
interface IntelligenceProvider {
  meta: ProviderMeta;                                            // id, name, tier, categories, countries, refreshIntervalMs
  fetch(country: string, city?: string): CanonicalGlobalFeedItem[]; // MUST return canonical objects only
  health(): ProviderHealth;                                       // healthy, latencyMs, lastCheckAt, consecutiveFailures
}
```

**Binding contract:**
- `fetch()` MUST return `CanonicalGlobalFeedItem[]` — never raw API types
- Raw API response types are `private` to the provider file — never exported
- Canonicalization happens inside the provider's `fetch()` method
- Provider files never import from each other — no cross-provider coupling
- The registry (`provider-adapter.ts`) is the only integration point

### 2.2 Swap Path for Premium Providers

To replace Open-Meteo with a premium weather provider (e.g., OpenWeatherMap, Tomorrow.io):

```
1. Create new file: weather-provider-premium.ts implementing IntelligenceProvider
2. In provider-boot.ts: change registration from openmeteo to premium
3. No other file changes required
```

No structural refactor. The ticker engine, ranking engine, hook, and component are all provider-agnostic. They only consume `CanonicalGlobalFeedItem[]`.

### 2.3 Initial Providers

| Category | Initial Provider | Cost | API Key | Coverage | Swap Candidates |
|----------|-----------------|------|---------|----------|-----------------|
| Weather | Open-Meteo | Free | None | Global (lat/lng) | OpenWeatherMap, Tomorrow.io, WeatherAPI |
| Forex | Frankfurter | Free | None | ECB 30+ currencies | ExchangeRate-API, Fixer.io, CurrencyLayer |
| Timezone | JavaScript `Intl` API | Free | None | All IANA zones | (no external swap needed) |

---

## 3. Request-Storm Prevention

### 3.1 In-Flight Request Deduplication

```typescript
const inFlightRequests = new Map<string, Promise<CanonicalGlobalFeedItem[]>>();

function fetchWithDedup(key: string, fetchFn: () => Promise<...>): Promise<...> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing;                // reuse in-flight promise
  const promise = fetchFn().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
}
```

**Dedup key format:** `${providerId}_${country}_${city ?? "national"}`

Guarantees: If 5 React rerenders trigger 5 ticker refreshes in the same tick, only 1 HTTP request is made. All 5 callers receive the same promise.

### 3.2 No Fetch When Gated

```
                       ┌────────────────────────┐
                       │ isGated() check         │
                       │ (3 flags + kill switch) │
                       └──────┬─────────────────┘
                              │
                      gated?  │
                 ┌────YES─────┼─────NO────┐
                 │            │            │
         return empty    check cache  fetch provider
         (zero HTTP)     (no HTTP)    (bounded HTTP)
```

Provider `fetch()` is NEVER called when:
- Any of the 3 gates is OFF
- Ticker component is unmounted
- Hook is in cleanup phase

### 3.3 Bounded Retry/Backoff

| Parameter | Value |
|-----------|-------|
| Max retries per fetch | 2 (total 3 attempts: initial + 2 retries) |
| Backoff strategy | Exponential: 1s → 2s → stop |
| Retry on | Network error, HTTP 5xx only |
| Never retry on | HTTP 4xx, timeout, abort, circuit-open |
| Jitter | ±200ms random per retry to avoid thundering herd |

### 3.4 Per-Session / Per-Country Request Limits

| Limit | Value | Enforcement |
|-------|-------|-------------|
| **Per-provider per-session** | 200 requests max per browser session | Counter in module scope, resets on page reload |
| **Per-country per-5-minutes** | 10 requests max per country per 5-minute window | Sliding window counter |
| **Per-provider per-minute** | 6 requests max (enforced by cache TTL) | Weather TTL=15min, Forex TTL=5min → at most 12+60=72/hour combined |
| **Global per-minute** | 20 requests max across all providers | Hard cap, returns cache/stub on breach |

When any limit is hit: silently serve cache → stub → empty. No error surfaced.

### 3.5 Rerender Protection

The hook (`useIntelligenceTicker`) already has these protections:
- `useCallback` with stable deps prevents unnecessary refresh recreations
- `useEffect` cleanup clears all intervals on unmount
- Refresh interval is 300s (5 min) — not per-render
- Rotation interval (8s) re-checks gates but does NOT trigger HTTP fetches

**New in Phase 2:** The `bootProviders()` call is idempotent — calling it multiple times is safe (provider registry checks for existing registration).

---

## 4. Canonical Output Contracts

### 4.1 Weather Output Contract

Every weather provider MUST produce items conforming to:

```typescript
// Output shape — MANDATORY for all weather providers
{
  id: string;                        // unique, format: `weather_{type}_{country}_{city}_{timestamp}`
  sourceId: string;                  // provider's meta.id
  sourceName: string;                // provider's meta.name
  sourceTrust: number;               // 0.0–1.0, set by provider
  sourceTier: "tier_1" | "tier_2";   // weather sources are tier_1 or tier_2

  category: "weather";               // MUST be "weather"
  subcategory: "current" | "forecast" | "severe"; // exactly one of these
  title: string;                     // e.g., "Weather in Dubai"
  summary: string;                   // e.g., "Partly cloudy, 34°C, humidity 45%"
  body: string | null;               // optional extended text

  language: "en";                    // Phase 2 uses English only
  originalLanguage: "en";

  country: string;                   // 2-letter ISO, matches requested country
  region: string | null;
  city: string | null;               // matches requested city if provided

  priority: GlobalFeedPriority;      // "P0" for severe, "P3" for current, "P4" for forecast
  relevanceScore: number;            // 0.0–1.0
  freshnessScore: number;            // 0.0–1.0, based on data age
  personalRelevance: number;         // 0.0–1.0, defaults to 0.5 for weather

  publishedAt: string;               // ISO 8601
  fetchedAt: string;                 // ISO 8601, time of canonicalization
  expiresAt: string;                 // ISO 8601, current: +1h, forecast: +12h, severe: +30min

  tags: string[];                    // e.g., ["weather", "current"]
  mediaUrl: string | null;           // always null in Phase 2
  deepLinkUrl: string | null;        // always null in Phase 2
  contentHash: string;               // unique hash for dedup, format: `weather_{subcategory}_{country}_{city}_{hourSlot}`
}
```

### 4.2 Forex Output Contract

Every forex provider MUST produce items conforming to:

```typescript
{
  id: string;                        // format: `forex_{baseCurrency}_{timestamp}`
  sourceId: string;
  sourceName: string;
  sourceTrust: number;               // 0.85+ for institutional feeds
  sourceTier: "tier_1" | "tier_2";   // ECB data = tier_1

  category: "forex";                 // MUST be "forex"
  subcategory: "rates";              // always "rates" in Phase 2
  title: string;                     // e.g., "AED Exchange Rates"
  summary: string;                   // e.g., "USD/AED: 3.6725 (+0.01%) | EUR/AED: 4.02 (−0.15%)"
  body: string | null;

  language: "en";
  originalLanguage: "en";

  country: string;                   // matches requested country
  region: null;
  city: null;                        // forex is country-level, never city-level

  priority: "P3";                    // forex is contextual priority
  relevanceScore: number;            // 0.5–0.8 range
  freshnessScore: number;            // 0.0–1.0, based on data age
  personalRelevance: number;         // 0.4–0.6 range

  publishedAt: string;
  fetchedAt: string;
  expiresAt: string;                 // +30min from fetch time

  tags: string[];                    // e.g., ["forex", "finance", "aed"]
  mediaUrl: null;
  deepLinkUrl: null;
  contentHash: string;               // format: `forex_{baseCurrency}_{30minSlot}`
}
```

### 4.3 Ticker Item Contract

The `TickerItem` output from `ticker-engine.ts` (unchanged from Phase 1):

```typescript
interface TickerItem {
  id: string;             // from CanonicalGlobalFeedItem.id
  text: string;           // from summary || title
  category: string;       // from category
  priority: string;       // from priority
  country: string;        // from country
  city: string | null;    // from city
  compositeScore: number; // from ranking engine
  expiresAt: string;      // from expiresAt
}
```

### 4.4 Fallback-State Contract

When the system degrades, each level of the fallback chain produces:

| Fallback Level | Output Shape | Source Marker | User Impact |
|----------------|-------------|---------------|-------------|
| **Real provider success** | `CanonicalGlobalFeedItem[]` with real data | `sourceTier: "tier_1"` or `"tier_2"` | Live data shown |
| **Cache hit (fresh)** | Same canonical items, from cache | Original `sourceTier` preserved | Indistinguishable from live |
| **Cache hit (stale)** | Same canonical items, may have expired `expiresAt` | Ranking engine filters expired items automatically | Fewer items or none |
| **Stub provider** | Mock canonical items from Phase 1 stubs | `sourceTier: "tier_2"`, `sourceName` contains "(Stub)" | Sample data shown |
| **Empty (all fail)** | `[]` | N/A | Ticker collapses — `return null` in component |

---

## 5. Strict Shadow Isolation

### 5.1 Shadow Mode Invariants

| Invariant | Enforcement |
|-----------|-------------|
| **Zero user-visible effect** | Shadow validation runs after ticker composition. It does NOT replace, modify, or reorder any ticker items. |
| **No ranking change** | Shadow data is validated but never passed to `rankFeedItems()`. Ranking engine only sees production data. |
| **No UI mutation** | Shadow results are not stored in React state. They exist only in the validation function's local scope. |
| **No cross-module side effects** | Shadow validation does not emit events, modify caches, update counters, or write to any shared state. |
| **Discardable results** | Validation output is a plain object `{ valid, errors, warnings }`. It is logged to `console.debug` (dev only) and immediately garbage-collected. |
| **No production logging** | Shadow logs use `console.debug` only, which is stripped in production builds by Vite's minifier. |

### 5.2 Shadow Mode Data Flow

```
composeTicker() produces ticker items (from real or stub providers)
     │
     ├── ticker items → hook → component → USER SEES THIS
     │
     └── IF enable_intelligence_shadow_validation = true:
              │
              shadow fetch (real providers, independent call)
              │
              canonicalize to CanonicalGlobalFeedItem[]
              │
              validate each item (schema, ranges, expiry, hash, category, country)
              │
              produce ShadowValidationReport { valid, errors, warnings }
              │
              console.debug(report)  ← dev only
              │
              DISCARD — no state mutation, no return value consumed
```

### 5.3 Shadow Mode Gating

Controlled by: `enable_intelligence_shadow_validation` (default `false`).

Shadow mode is doubly gated: it only runs when BOTH the master gate (`enable_global_intelligence`) AND the shadow flag are true. If the master gate is off, shadow does nothing.

### 5.4 Shadow Validation Checks

| # | Check | Pass Criteria |
|---|-------|---------------|
| 1 | Schema completeness | All required fields present and non-null |
| 2 | Score ranges | `relevanceScore`, `freshnessScore`, `sourceTrust`, `personalRelevance` all in [0.0, 1.0] |
| 3 | Expiry validity | `expiresAt` is a valid ISO 8601 date in the future |
| 4 | Content hash uniqueness | No duplicate `contentHash` within the same batch |
| 5 | Category match | `category` matches provider's declared `meta.categories` |
| 6 | Country match | `country` matches the requested country code |
| 7 | Priority validity | `priority` is one of "P0", "P1", "P2", "P3", "P4" |
| 8 | ID format | `id` is non-empty string |
| 9 | Timestamp order | `publishedAt <= fetchedAt <= expiresAt` |

---

## 6. Controlled Rollout Model

### 6.1 Rollout Phases

```
Phase 2a: Implementation (all flags OFF, code deployed, zero runtime effect)
Phase 2b: Shadow validation (enable_intelligence_shadow_validation ON, dev environment only)
Phase 2c: Internal dev testing (all 3 gates ON, development environment only)
Phase 2d: Country rollout (enable by country using targeted flags, staging then production)
Phase 2e: Full rollout (all gates ON for production, all countries)
```

### 6.2 Exact Rollout Gates by Country/Environment

| Gate | Development | Staging | Production |
|------|-------------|---------|------------|
| `enable_global_intelligence` | OFF by default, toggle ON for dev testing | OFF, ON for staging test | OFF, ON per wave |
| `enable_intelligence_ticker` | OFF by default, toggle ON for dev testing | OFF, ON for staging test | OFF, ON per wave |
| `intelligence_enabled` kill switch | OFF (DISABLED_BY_DEFAULT), toggle ON for dev testing | OFF, ON for staging test | OFF, ON per wave |
| `enable_intelligence_shadow_validation` | OFF, ON for shadow phase only | OFF | OFF |

### 6.3 Country-by-Country Rollout Waves

Using the existing `evaluateTargetedFlag` system in `feature-flag-registry.ts`:

| Wave | Countries | Rationale | Coordinates Available |
|------|-----------|-----------|----------------------|
| Wave 1 | AE (UAE) | Primary market, well-tested profile | Dubai: 25.2048, 55.2708 |
| Wave 2 | FR, GB, DE | European markets, GDPR-compliant providers | Paris: 48.8566, 2.3522 |
| Wave 3 | SA, EG, MA | Arabic-language markets | Riyadh: 24.7136, 46.6753 |
| Wave 4 | US, IN, BR, NG, JP | Global expansion | NYC: 40.7128, -74.0060 |

### 6.4 Rollback Procedure

| Severity | Action | Scope | Recovery Time |
|----------|--------|-------|---------------|
| Critical (all providers down) | Toggle `intelligence_enabled` → OFF | All countries, all environments | Immediate |
| Provider-specific | Circuit breaker auto-opens | Affected provider only | Automatic (60s cooldown) |
| Country-specific | Remove country from targeted flag | Single country | Immediate |
| Ticker-only | Toggle `enable_intelligence_ticker` → OFF | All countries, ticker surface only | Immediate |

---

## 7. Exact Files to Create/Modify

### 7.1 New Files (5)

| # | File Path | Purpose | Exports |
|---|-----------|---------|---------|
| 1 | `src/lib/intelligence/global/provider-resilience.ts` | Shared resilience infrastructure | `fetchWithTimeout`, `createCircuitBreaker`, `createProviderCache`, `fetchWithDedup`, `createRateLimiter` |
| 2 | `src/lib/intelligence/global/weather-provider-openmeteo.ts` | Real weather: Open-Meteo → canonical | `openMeteoProvider: IntelligenceProvider` |
| 3 | `src/lib/intelligence/global/forex-provider-frankfurter.ts` | Real forex: Frankfurter → canonical | `frankfurterProvider: IntelligenceProvider` |
| 4 | `src/lib/intelligence/global/timezone-resolver.ts` | Timezone resolution via Intl API | `resolveLocalTime`, `getTimezoneOffset`, `isMarketHours` |
| 5 | `src/lib/intelligence/global/provider-boot.ts` | Idempotent provider registration with fallback chain | `bootProviders` |

### 7.2 Modified Files (3)

| # | File Path | Exact Change |
|---|-----------|-------------|
| 1 | `src/lib/growth/feature-flag-registry.ts` | Add `"enable_intelligence_shadow_validation"` to `PlatformFlag` union, `FLAG_DEFAULTS` (value: `false`), and `FLAG_DESCRIPTIONS` |
| 2 | `src/hooks/useIntelligenceTicker.ts` | Replace inline `ensureProviders()` function and its `providersRegistered` flag with a single `bootProviders()` call from `provider-boot.ts` |
| 3 | `src/lib/intelligence/global/shadow-validation.ts` | Add `runShadowValidation(items: CanonicalGlobalFeedItem[]): ShadowValidationReport` function and `ShadowValidationReport` type |

### 7.3 Unchanged Files

All other Phase 0/1 files require ZERO changes:

| File | Reason Unchanged |
|------|-----------------|
| `canonical-types.ts` | No new types needed — output contracts use existing `CanonicalGlobalFeedItem` |
| `state-machines.ts` | No new machines |
| `ticker-engine.ts` | Consumes providers via existing adapter interface — provider-agnostic |
| `feed-ranking-engine.ts` | Pure logic, provider-agnostic |
| `provider-adapter.ts` | Interface already supports real providers — no modification needed |
| `IntelligenceTicker.tsx` | Renders from hook, provider-agnostic |
| `SmartHome.tsx` | Triple gate already in place |
| `kill-switches.ts` | Already has `intelligence_enabled` in DISABLED_BY_DEFAULT |
| `control-plane/feature-flags.ts` | Already has intelligence flags |
| `control-plane/types.ts` | Already has `intelligence` domain |

---

## 8. Exact Runtime Boundaries

### 8.1 Execution Boundary

```
        GATE BOUNDARY (no code executes beyond here if gated)
        ┌─────────────────────────────────────────────┐
        │                                             │
        │  SmartHome triple-gate conditional           │
        │  └── useIntelligenceTicker hook              │
        │       └── isGated() check (3 flags)          │
        │            └── composeTicker() (3 flags)     │
        │                 └── fetchFromAllProviders()   │
        │                      └── per-provider fetch   │
        │                           └── HTTP boundary   │
        │                                             │
        └─────────────────────────────────────────────┘

        HTTP BOUNDARY (no network call escapes these rules)
        ┌─────────────────────────────────────────────┐
        │  fetchWithTimeout (5s AbortController)       │
        │  └── fetchWithDedup (in-flight dedup)        │
        │       └── rateLimiter.check()                │
        │            └── circuitBreaker.check()        │
        │                 └── fetch() to external API  │
        └─────────────────────────────────────────────┘
```

### 8.2 Module Boundary

No Phase 2 file may import from:
- `src/domains/` (except `shared/canonical-types.ts` for type imports only)
- `src/components/`
- `src/pages/`
- `src/stores/`
- `src/services/db.ts`
- Any Orbit, Wallet, Radar, Me, or Dashboard module

Phase 2 files may only import from:
- `src/domains/shared/canonical-types.ts` (types)
- `src/lib/growth/feature-flag-registry.ts` (flag checks)
- `src/lib/control-plane/kill-switches.ts` (kill switch checks)
- Other `src/lib/intelligence/global/` files (internal)

---

## 9. Exact Cache Keys and TTL Rules

### 9.1 Cache Key Format

| Provider | Key Pattern | Example |
|----------|-------------|---------|
| Weather (current) | `weather_current_${country}_${city\|\|"national"}` | `weather_current_AE_dubai` |
| Weather (forecast) | `weather_forecast_${country}_${city\|\|"national"}` | `weather_forecast_FR_paris` |
| Forex | `forex_rates_${baseCurrency}` | `forex_rates_AED` |

### 9.2 TTL Rules

| Cache Entry | TTL | Stale Grace Period | Max Stale Age |
|-------------|-----|-------------------|---------------|
| Weather current | 15 minutes | +15 minutes (serve stale on failure) | 60 minutes (hard evict) |
| Weather forecast | 60 minutes | +60 minutes | 180 minutes |
| Forex rates | 5 minutes (market hours) / 30 minutes (off-hours) | +10 minutes | 120 minutes |

### 9.3 Cache Implementation

```typescript
interface CacheEntry<T> {
  data: T;
  cachedAt: number;        // Date.now() at cache time
  ttlMs: number;           // configured TTL
  maxStaleMs: number;      // hard eviction threshold
}

function isFresh(entry): boolean    // cachedAt + ttlMs > now
function isStale(entry): boolean    // !isFresh AND cachedAt + maxStaleMs > now
function isExpired(entry): boolean  // cachedAt + maxStaleMs <= now (evict)
```

### 9.4 Cache Size Limit

| Limit | Value |
|-------|-------|
| Max entries per provider | 50 |
| Eviction strategy | LRU — when limit reached, evict least-recently-used entry |
| Total memory cap | ~500 entries across all providers (bounded by design) |

---

## 10. Exact Circuit-Breaker Thresholds and Reset Behavior

### 10.1 State Machine

```
                 ┌──────────────┐
         ┌──────►│   CLOSED     │◄─────────────────┐
         │       │ (normal ops) │                   │
         │       └──────┬───────┘                   │
         │              │                           │
         │    failure count reaches                 │
         │    FAILURE_THRESHOLD (5)                 │
         │              │                           │
         │              ▼                           │
         │       ┌──────────────┐          success  │
         │       │    OPEN      │────────────────────┘
         │       │ (skip calls) │          (via HALF_OPEN)
         │       └──────┬───────┘
         │              │
         │    after COOLDOWN_MS
         │    (60,000ms = 60s)
         │              │
         │              ▼
         │       ┌──────────────┐
         │       │  HALF_OPEN   │
         │       │ (1 test req) │
         │       └──────┬───────┘
         │              │
         │       success │ failure
         │       ┌───────┴──────┐
         │       │              │
         └───────┘        back to OPEN
                          (reset cooldown timer)
```

### 10.2 Exact Thresholds

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `FAILURE_THRESHOLD` | 5 consecutive failures | Allows transient errors without tripping |
| `COOLDOWN_MS` | 60,000 (60 seconds) | Long enough to let provider recover |
| `HALF_OPEN_MAX_REQUESTS` | 1 | Single test request before reopening |
| `SUCCESS_RESET` | Reset failure count to 0 on any success | Quick recovery when provider returns |
| `MAX_OPEN_DURATION_MS` | 300,000 (5 minutes) | Force retry after 5 min even if still failing |

### 10.3 Per-Provider Isolation

Each provider gets its own circuit breaker instance. Weather breaker state does NOT affect forex breaker state. Breaker state is module-scoped (not shared globally).

---

## 11. Safety Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| **No uncontrolled runtime wiring** | No `platformBus.emit()` or `.on()` in any new file |
| **No accidental UI exposure** | Triple gate preserved. All flags OFF by default. |
| **No direct DB coupling** | No `db()` calls, no supabase imports. All data from external APIs + in-memory cache. |
| **Every connection flag-gated** | Real provider calls only execute inside `composeTicker()` which is triple-gated |
| **Kill-switch protected** | `intelligence_enabled` kill switch stops all provider calls immediately |
| **No raw schema leakage** | Canonicalization boundary inside each provider file. Raw API types are private. |
| **Timeout-bounded** | 5s max per provider call via AbortController |
| **Failure-isolated** | Per-provider circuit breaker, independent fallback chains |
| **Request-storm prevented** | In-flight dedup, rate limiters, session caps, cache-first |
| **Shadow-mode isolated** | Zero UI mutation, zero state change, zero cross-module effects |
| **Reversible** | Stub providers remain registered as fallbacks, always available |
| **Provider-agnostic** | Swapping providers requires only new file + boot change |

---

## 12. Prohibitions

Phase 2 MUST NOT:
- Connect to Orbit, Wallet, Radar, Me, or Search
- Emit any platform bus events
- Write to database or create migrations
- Enable any flag by default
- Create any new UI components or routes
- Modify the ticker component or SmartHome beyond the hook change listed in 7.2
- Store API responses in persistent storage
- Expose any API keys or credentials (none needed — both APIs are keyless)
- Expand scope beyond weather, forex, and timezone
- Allow shadow validation results to affect ranking, rendering, or state

---

## 13. Dependency Note

Phase 2 has ZERO external package dependencies. Both Open-Meteo and Frankfurter are standard REST APIs consumed via the browser's native `fetch()`. No new npm packages are installed.

---

## 14. Final Proof Checklist (Post-Implementation)

Before Phase 2 can be locked, ALL of the following must pass:

| # | Proof | Method |
|---|-------|--------|
| 1 | **platformBus.emit/on = 0** in all new/modified files | `grep` across all new file paths |
| 2 | **db/supabase imports = 0** in all new/modified files | `grep` across all new file paths |
| 3 | **All flags OFF by default** | Show exact lines from `feature-flag-registry.ts` including new shadow flag |
| 4 | **Kill switch still disabled by default** | Show exact lines from `kill-switches.ts` |
| 5 | **Triple gate preserved** in SmartHome + hook + engine | Show exact code snippets (unchanged from Phase 1) |
| 6 | **No new routes/pages/UI** | `grep` for route registrations in new files |
| 7 | **TypeScript typecheck PASS** | `npx tsc --noEmit` with zero errors |
| 8 | **ESLint PASS** | `npx eslint` on all new/modified files with zero errors |
| 9 | **Runtime invisibility** | Screenshot showing no ticker with defaults OFF |
| 10 | **Timeout enforcement** | Show `fetchWithTimeout` implementation with AbortController + 5s default |
| 11 | **Circuit breaker thresholds** | Show FAILURE_THRESHOLD=5, COOLDOWN_MS=60000, HALF_OPEN_MAX=1 |
| 12 | **Cache with exact TTL** | Show cache implementation with weather=15min, forex=5min, maxStale values |
| 13 | **Cache key format** | Show exact key patterns matching Section 9.1 |
| 14 | **Fallback chain** | Show real → cache → stub → empty chain in provider-boot.ts |
| 15 | **Canonicalization boundary** | Show that raw API types are file-private, only canonical types exported |
| 16 | **In-flight dedup** | Show dedup Map with promise reuse |
| 17 | **Rate limiter** | Show per-session and per-country-per-5min counters |
| 18 | **Shadow isolation** | Show shadow validation produces no state mutation, no UI effect |
| 19 | **Provider-agnostic contract** | Show that ticker-engine, ranking-engine, hook, and component have zero provider-specific imports |
| 20 | **Reverse-dependency = 0** | No existing file imports new Phase 2 modules (except modified files listed in 7.2) |
| 21 | **Module boundary** | Show no imports from src/domains/, src/components/, src/pages/, src/stores/, src/services/db.ts in new files |
| 22 | **Retry bounds** | Show max 2 retries, exponential backoff 1s→2s, no retry on 4xx/timeout |

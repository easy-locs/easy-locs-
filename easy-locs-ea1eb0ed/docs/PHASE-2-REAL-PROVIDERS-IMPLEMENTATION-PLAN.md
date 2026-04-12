# Phase 2 — Real Provider Architecture (Plan Only — Awaiting Approval)

> **Status**: Planning document only. No implementation performed.
> **Prerequisite**: Phase 0 (Foundation) locked. Phase 1 (Ticker + Country Info) locked.
> **Date**: 2026-04-12
> **Scope**: Replace stub providers with real external data providers for weather and forex. Add timezone resolution. Add resilience layer (timeout, cache, circuit breaker, fallback). Preserve all Phase 0/1 safety guarantees.

---

## 1. Objective

Replace the Phase 1 mock providers (`weather-provider-stub.ts`, `forex-provider-stub.ts`) with real external API providers that deliver live weather and forex data to the triple-gated intelligence ticker. Add timezone-aware scheduling. All connections remain flag-gated, kill-switch protected, timeout-bounded, and cache-backed.

---

## 2. Provider Selection

### 2.1 Weather — Open-Meteo

| Property | Value |
|----------|-------|
| **API** | [Open-Meteo](https://open-meteo.com/) |
| **Cost** | Free, no API key required |
| **Coverage** | Global (latitude/longitude based) |
| **Rate limit** | 10,000 requests/day (free tier) |
| **Data** | Current conditions, hourly/daily forecast, severe weather alerts |
| **Latency** | ~200-500ms typical |
| **Why chosen** | No API key management, no secrets to store, no billing integration, global coverage, reliable uptime |

### 2.2 Forex — Frankfurter

| Property | Value |
|----------|-------|
| **API** | [Frankfurter](https://www.frankfurter.app/) |
| **Cost** | Free, no API key required |
| **Coverage** | ECB reference rates — 30+ currencies |
| **Rate limit** | Reasonable (no hard published limit, ~1 req/s suggested) |
| **Data** | Latest rates, historical rates, currency list |
| **Latency** | ~100-300ms typical |
| **Why chosen** | No API key, institutional ECB data (Tier 1 source per architecture), reliable, JSON-native |

### 2.3 Timezone — JavaScript Intl API

| Property | Value |
|----------|-------|
| **Source** | Built-in `Intl.DateTimeFormat` + country profile `timezones` field |
| **Cost** | Zero — no external API |
| **Coverage** | All IANA timezones |
| **Why chosen** | No network dependency, instant, already available in runtime |

---

## 3. Architecture

### 3.1 Provider Layer Stack

```
SmartHome.tsx (triple gate)
  └── useIntelligenceTicker hook (triple gate + refresh)
        └── ticker-engine.ts (triple gate)
              └── provider-adapter.ts (registry)
                    ├── weather-provider-openmeteo.ts  ← NEW (real)
                    │     ├── HTTP fetch with timeout
                    │     ├── Canonicalization to CanonicalGlobalFeedItem
                    │     ├── Cache layer (15 min TTL)
                    │     └── Circuit breaker (5 failures → open → 60s cooldown)
                    ├── forex-provider-frankfurter.ts   ← NEW (real)
                    │     ├── HTTP fetch with timeout
                    │     ├── Canonicalization
                    │     ├── Cache layer (5 min TTL)
                    │     └── Circuit breaker
                    ├── weather-provider-stub.ts        ← EXISTING (fallback)
                    └── forex-provider-stub.ts          ← EXISTING (fallback)
```

### 3.2 Resilience Infrastructure (New File)

A shared `provider-resilience.ts` module providing:

| Component | Specification |
|-----------|---------------|
| **HTTP client** | `fetchWithTimeout(url, timeoutMs)` — wraps `fetch()` with `AbortController`. Default timeout: 5000ms. |
| **Circuit breaker** | Per-provider. Opens after 5 consecutive failures. Cooldown: 60 seconds. Half-open: allows 1 test request after cooldown. |
| **Cache** | In-memory `Map<string, { data, expiresAt }>`. Per-provider, keyed by `${providerId}_${country}_${city}`. Configurable TTL. |
| **Fallback chain** | Real provider → Cache (even stale) → Stub provider → Empty array. Each step logged. |
| **Anti-storm** | If a single provider returns >100 items in one fetch, truncate and log warning. |

### 3.3 Triple-Gate Preservation

Every execution path continues to check all 3 gates:

| Gate | Check Point | Default |
|------|-------------|---------|
| `enable_global_intelligence` | SmartHome render, hook refresh, hook rotation, engine composeTicker, country registry | `false` |
| `enable_intelligence_ticker` | SmartHome render, hook refresh, hook rotation, engine composeTicker | `false` |
| `intelligence_enabled` (kill switch) | SmartHome render, hook refresh, hook rotation, engine composeTicker | `false` (DISABLED_BY_DEFAULT) |

No gate is removed. No gate is weakened. Real providers only execute inside the existing gated paths.

### 3.4 Kill-Switch Behavior

If `intelligence_enabled` kill switch is toggled OFF at runtime:
1. SmartHome conditional returns `false` → component unmounts
2. Hook rotation tick detects `isGated() === true` → clears state, sets invisible
3. Engine `composeTicker()` returns `{ gated: true, items: [] }`
4. No further API calls are made until kill switch is restored

### 3.5 Canonicalization Rule

Per architecture Section 8.3: "No provider schema leakage." Every real provider:
- Receives raw JSON from external API
- Transforms it into `CanonicalGlobalFeedItem` inside the provider file
- No raw API types are exported
- No raw API responses are stored
- The rest of the system only sees canonical objects

---

## 4. Timeout / Fallback / Cache / Failure Isolation

### 4.1 Timeout

| Provider | Timeout | Behavior on Timeout |
|----------|---------|---------------------|
| Open-Meteo (weather) | 5000ms | Use cache → stub → empty |
| Frankfurter (forex) | 5000ms | Use cache → stub → empty |

### 4.2 Cache

| Provider | TTL | Cache Key Pattern | Stale-While-Revalidate |
|----------|-----|-------------------|------------------------|
| Weather | 15 minutes | `weather_${country}_${city}` | Yes — serve stale cache if fetch fails |
| Forex | 5 minutes | `forex_${baseCurrency}` | Yes — serve stale cache if fetch fails |

### 4.3 Circuit Breaker States

```
CLOSED (normal)
  │ failure count < 5
  ▼
OPEN (provider skipped)
  │ after 60s cooldown
  ▼
HALF_OPEN (one test request)
  │ success → CLOSED
  │ failure → OPEN (reset cooldown)
```

### 4.4 Fallback Chain

```
1. Real provider fetch (timeout-bounded)
   ├── Success → cache result, return canonical items
   └── Failure (timeout, error, circuit open)
         │
2. Cache lookup (even if expired)
   ├── Cache hit → return stale items (mark source as "cached")
   └── Cache miss
         │
3. Stub provider
   ├── Available → return mock data (mark source as "stub")
   └── Should never fail
         │
4. Empty array (safe fallback — ticker collapses)
```

### 4.5 Failure Isolation

| Principle | Details |
|-----------|---------|
| **Provider independence** | Weather failure does NOT block forex. Each provider fetches independently. |
| **No cascading** | Circuit breaker is per-provider. One broken source doesn't affect others. |
| **Silent degradation** | User sees fewer ticker items, never an error. Ticker collapses gracefully if all providers fail. |
| **No UI errors** | Component wrapped in existing error boundary. Provider failures are swallowed and logged. |

---

## 5. Shadow-Mode Validation Path

### 5.1 Shadow Mode Concept

Before going live, real providers can operate in shadow mode:

```
Shadow mode ON:
  1. Real provider fetches data
  2. Data is canonicalized
  3. Data is validated against schema (via shadow-validation.ts)
  4. Validation results are logged
  5. Data is DISCARDED — not surfaced to ticker
  6. Stub provider data is used for actual ticker display
```

### 5.2 Shadow Mode Gating

Controlled by a new sub-flag: `enable_intelligence_shadow_validation` (default: `false`).

When enabled:
- Real providers run alongside stubs
- Output is compared for shape/field completeness
- Discrepancies are logged with structured output
- No user-visible impact

### 5.3 Shadow Validation Checks

| Check | Description |
|-------|-------------|
| **Schema completeness** | All required fields of `CanonicalGlobalFeedItem` are present and non-null |
| **Score ranges** | `relevanceScore`, `freshnessScore`, `sourceTrust` all in [0.0, 1.0] |
| **Expiry validity** | `expiresAt` is in the future at fetch time |
| **Content hash uniqueness** | `contentHash` is unique across items in the same batch |
| **Category match** | `category` matches the provider's declared categories |
| **Country match** | `country` matches the requested country |

---

## 6. Controlled Rollout Model

### 6.1 Rollout Phases

```
Phase 2a: Implementation (all flags OFF, code deployed)
Phase 2b: Shadow validation (enable_intelligence_shadow_validation ON)
Phase 2c: Internal testing (all 3 gates ON for development environment only)
Phase 2d: Country rollout (enable by country using targeted flags)
Phase 2e: Full rollout (all gates ON for production)
```

### 6.2 Country-by-Country Rollout

Using the existing `evaluateTargetedFlag` system in `feature-flag-registry.ts`:

| Rollout Wave | Countries | Rationale |
|-------------|-----------|-----------|
| Wave 1 | AE (UAE) | Primary market, well-tested country profile |
| Wave 2 | FR, GB, DE | European markets, GDPR-compliant providers |
| Wave 3 | SA, EG, MA | Arabic-language markets |
| Wave 4 | US, IN, BR, NG, JP | Global expansion |

### 6.3 Rollback Procedure

1. Toggle `intelligence_enabled` kill switch → OFF (immediate, all countries)
2. Or toggle `enable_intelligence_ticker` → OFF (immediate, ticker only)
3. Or remove country from targeted flag rules (country-specific)
4. Circuit breakers auto-activate if providers degrade
5. Cache serves stale data during provider issues

---

## 7. Exact Files to Create/Modify

### 7.1 New Files (5)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/intelligence/global/provider-resilience.ts` | Shared resilience: fetchWithTimeout, circuit breaker, cache, fallback chain |
| 2 | `src/lib/intelligence/global/weather-provider-openmeteo.ts` | Real weather provider: Open-Meteo API → canonical feed items |
| 3 | `src/lib/intelligence/global/forex-provider-frankfurter.ts` | Real forex provider: Frankfurter API → canonical feed items |
| 4 | `src/lib/intelligence/global/timezone-resolver.ts` | Timezone resolution using Intl API + country profile data |
| 5 | `src/lib/intelligence/global/provider-boot.ts` | Provider registration logic: registers real providers with fallback to stubs |

### 7.2 Modified Files (3)

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/growth/feature-flag-registry.ts` | Add `enable_intelligence_shadow_validation` flag (default `false`) |
| 2 | `src/hooks/useIntelligenceTicker.ts` | Replace inline provider registration with `bootProviders()` call |
| 3 | `src/lib/intelligence/global/shadow-validation.ts` | Add shadow-mode comparison function for real vs stub output |

### 7.3 Unchanged Files (0 modifications)

The following Phase 0/1 files require ZERO changes:
- `canonical-types.ts` — no new types needed
- `state-machines.ts` — no new machines
- `ticker-engine.ts` — consumes providers via existing adapter interface
- `feed-ranking-engine.ts` — pure logic, provider-agnostic
- `provider-adapter.ts` — interface already supports real providers
- `IntelligenceTicker.tsx` — renders from hook, provider-agnostic
- `SmartHome.tsx` — triple gate already in place
- `kill-switches.ts` — already has `intelligence_enabled`
- `control-plane/feature-flags.ts` — already has intelligence flags
- `control-plane/types.ts` — already has `intelligence` domain

---

## 8. Safety Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| **No uncontrolled runtime wiring** | No `platformBus.emit()` or `.on()` in any new file |
| **No accidental UI exposure** | Triple gate preserved. All flags OFF by default. |
| **No direct DB coupling** | No `db()` calls, no supabase imports. All data from external APIs + in-memory cache. |
| **Every connection flag-gated** | Real provider calls only execute inside `composeTicker()` which is triple-gated |
| **Kill-switch protected** | `intelligence_enabled` kill switch stops all provider calls immediately |
| **No raw schema leakage** | Canonicalization boundary inside each provider file |
| **Timeout-bounded** | 5s max per provider call |
| **Failure-isolated** | Per-provider circuit breaker, independent fallback chains |
| **Reversible** | Stub providers remain registered as fallbacks, always available |

---

## 9. Final Proof Checklist (Post-Implementation)

Before Phase 2 can be locked, all of the following must pass:

| # | Proof | Method |
|---|-------|--------|
| 1 | **platformBus.emit/on = 0** in all new files | `grep` across all new file paths |
| 2 | **db/supabase imports = 0** in all new files | `grep` across all new file paths |
| 3 | **All flags OFF by default** | Show exact lines from `feature-flag-registry.ts` |
| 4 | **Kill switch still disabled by default** | Show exact lines from `kill-switches.ts` |
| 5 | **Triple gate preserved** in SmartHome + hook + engine | Show exact code snippets |
| 6 | **No new routes/pages/UI** | `grep` for route registrations |
| 7 | **TypeScript typecheck PASS** | `npx tsc --noEmit` |
| 8 | **ESLint PASS** | `npx eslint` on all new files |
| 9 | **Runtime invisibility** | Screenshot showing no ticker with defaults OFF |
| 10 | **Timeout enforcement** | Show `fetchWithTimeout` implementation with AbortController |
| 11 | **Circuit breaker** | Show breaker state machine (CLOSED → OPEN → HALF_OPEN) |
| 12 | **Cache with TTL** | Show cache implementation with expiry |
| 13 | **Fallback chain** | Show real → cache → stub → empty chain |
| 14 | **Canonicalization boundary** | Show that raw API types are private, only canonical types exported |
| 15 | **Reverse-dependency = 0** | No existing file imports new Phase 2 modules (except modified files listed in 7.2) |

---

## 10. Prohibitions

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

---

## 11. Dependency Note

Phase 2 has ZERO external package dependencies. Both Open-Meteo and Frankfurter are standard REST APIs consumed via the browser's native `fetch()`. No new npm packages are installed.

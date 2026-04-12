# Phase 0 (Foundation) — Safe Implementation Plan (Controlled, No Breakage)

> **Status**: Planning document only. No implementation performed.
> **Prerequisite**: [GLOBAL-INTELLIGENCE-AND-LOCAL-SOCIAL-ARCHITECTURE.md](./GLOBAL-INTELLIGENCE-AND-LOCAL-SOCIAL-ARCHITECTURE.md) — approved.
> **Date**: 2026-04-12
> **Scope**: Pre-implementation foundation phase — types, flags, skeletons, shadow validation only. Invisible to users, zero risk.
> **Phase relationship**: This is **Phase 0 (Foundation)** — a pre-phase that precedes the architecture document's Phase 1 (Section 25.2: "Simple ticker + basic country info"). The architecture document's Phase 1–6 sequence remains unchanged. This foundation phase builds the structural prerequisites that all subsequent phases depend on.

---

## Part 1 — Implementation Strategy

### 1.1 Minimal Viable Activation Scope

Phase 0 builds **structural foundations only** — type definitions, internal service skeletons, feature flag wiring, and shadow-mode validation. Nothing is visible to users. Nothing touches existing flows.

| What Phase 0 builds | What Phase 0 does NOT build |
|---------------------|----------------------------|
| Canonical type definitions for both systems | UI components or cards |
| Feature flag registration (all flags `false` by default) | Dashboard modules or ticker items |
| Internal service skeletons (empty, gated) | Orbit thread types or conversations |
| Shadow-mode data flow validation | Push notifications or alerts |
| Unit-level model validation | Real provider integrations |
| State machine definitions for listing/match lifecycles | Wallet interactions |
| Internal logging/observability hooks | Search result contributions |

### 1.2 Strict Isolation from Existing Domains

| Isolation Rule | Enforcement |
|----------------|-------------|
| **File location** | All new code lives under `src/lib/intelligence/global/` (System A) and `src/lib/commerce/local-social/` (System B). No files are created or modified outside these paths except: `src/domains/shared/canonical-types.ts` (type additions), `src/lib/growth/feature-flag-registry.ts` (flag registration), and `src/domains/shared/state-machines.ts` (machine additions). |
| **No import contamination** | No existing file may import from the new paths. New code may import from existing shared infrastructure (`canonical-types.ts`, `platform-bus.ts`, `db.ts`) but only as read-only consumers. |
| **No event emission** | No events are emitted on `global_intelligence.*` or `local_social_commerce.*` namespaces in Phase 0. Event type definitions are created but not wired to the platform bus. |
| **No route exposure** | No new pages, routes, or UI surfaces are created. |
| **No schema activation** | Database table definitions are documented but not created. All Phase 0 data lives in-memory or uses existing tables read-only. |

### 1.3 Progressive Rollout Approach

```
Phase 0 (this plan):  Foundation — types, flags, skeletons, shadow validation (NO user impact)
Architecture Phase 1: Simple ticker + basic country info (weather, forex)
Architecture Phase 2: AI notification layer (contextual notifications)
Architecture Phase 3: Religious opt-in modules (prayer times, Ramadan, mosques)
Architecture Phase 4: Local social commerce basics (listings, browsing, Orbit chat)
Architecture Phase 5: Zero-search predictive matching (intent, automatic matching)
Architecture Phase 6: Advanced trust + moderation + local graph intelligence
```

Phase 0 is a prerequisite for Architecture Phase 1. The numbering in Section 25.2 of the approved architecture document is canonical and unchanged.

### 1.4 No Global Activation

Every component built in Phase 0 is gated behind feature flags that default to `false`. No code path executes unless explicitly enabled through the control plane. The existing `ShadowModeEngine` (`src/engines/release/shadow-mode-engine.ts`) monitors for unintended activation.

---

## Part 2 — First Modules to Build

### 2.1 Module Inventory (Ordered by Build Sequence)

| # | Module | System | Location | Dependencies | Risk Level |
|---|--------|--------|----------|-------------|------------|
| 1 | Canonical type extensions | Shared | `src/domains/shared/canonical-types.ts` | None | Zero — type-only additions, no runtime effect |
| 2 | State machine definitions | Shared | `src/domains/shared/state-machines.ts` | Canonical types (#1) | Zero — new `Machine<S,E>` instances, no wiring |
| 3 | Feature flag registration | Shared | `src/lib/growth/feature-flag-registry.ts` | None | Zero — adds flags defaulting to `false` |
| 4 | Event type definitions | Shared | New: `src/lib/intelligence/global/events.ts`, `src/lib/commerce/local-social/events.ts` | Canonical types (#1) | Zero — type exports only, no bus registration |
| 5 | Country profile registry (structure) | System A | New: `src/lib/intelligence/global/country-profiles.ts` | Canonical types (#1) | Zero — static data structure, no provider calls |
| 6 | Feed ingestion skeleton | System A | New: `src/lib/intelligence/global/feed-ingestion.ts` | Types (#1), Flags (#3) | Zero — stub functions returning empty arrays, fully gated |
| 7 | Listing service skeleton | System B | New: `src/lib/commerce/local-social/listing-service.ts` | Types (#1), State machines (#2), Flags (#3) | Zero — stub functions, no DB writes, fully gated |
| 8 | Matching service skeleton | System B | New: `src/lib/commerce/local-social/matching-service.ts` | Types (#1), Flags (#3) | Zero — stub functions, no execution, fully gated |
| 9 | Shadow validation harness | Shared | New: `src/lib/intelligence/global/shadow-validator.ts` | All above | Zero — internal-only validation, no side effects |

### 2.2 What Each Module Contains

**Module 1 — Canonical Type Extensions**

Add to `src/domains/shared/canonical-types.ts` under a new section:

```
// ══════════════════════════════════════════════════
// GLOBAL INTELLIGENCE & LOCAL SOCIAL COMMERCE
// ══════════════════════════════════════════════════

- CanonicalGlobalFeedItem (interface)
- CanonicalLocalListing (interface)
- CanonicalLocalIntent (interface)
- CanonicalLocalMatch (interface)
- CanonicalModerationState (interface)
- CountryProfile (interface)
- CityProfile (interface)
- GlobalFeedCategory (type union)
- LocalListingStatus (type union)
- LocalListingCondition (type union)
- LocalListingPriceType (type union)
- ModerationStatus (type union)
- MatchConfidence (type union)
```

These are pure type definitions. They produce zero runtime code. They follow the existing canonical-types pattern established by `CanonicalOrbitProfile`, `CanonicalWalletState`, etc.

**Module 2 — State Machine Definitions**

Add to `src/domains/shared/state-machines.ts`:

```
- LISTING_MACHINE: Machine<LocalListingStatus, ListingEvent>
  States: draft → pending_review → active → reserved → completed/expired/removed
  Side-states: flagged, quarantined (from moderation)

- MATCH_MACHINE: Machine<MatchStatus, MatchEvent>
  States: candidate → presented → acknowledged → contacted → completed/expired/declined

- MODERATION_MACHINE: Machine<ModerationStatus, ModerationEvent>
  States: pending_review → approved/flagged/quarantined/removed
```

These follow the existing `PAYMENT_MACHINE`, `ORDER_MACHINE`, `DRIVER_MACHINE` pattern with `safeTransition()` and `TERMINAL_STATES`.

**Module 3 — Feature Flag Registration**

Extend `PlatformFlag` union and `FLAG_DEFAULTS` in `src/lib/growth/feature-flag-registry.ts`:

```
New flags (all defaulting to false):
- enable_global_intelligence     → Master gate for System A
- enable_local_social_commerce   → Master gate for System B
- enable_intelligence_ingestion  → Feed ingestion pipeline
- enable_intelligence_ranking    → Feed ranking/scoring
- enable_intelligence_ticker     → Ticker surface contribution (Phase 4+)
- enable_commerce_listings       → Listing creation/management
- enable_commerce_matching       → Match engine execution
- enable_commerce_suggestions    → Suggestion delivery (Phase 4+)
- enable_religious_utilities     → Religious module (requires user opt-in AND flag)
```

**Modules 4–9** are skeleton services: exported functions that check their feature flag, return early if disabled, and produce no side effects. They exist solely to establish the module structure, import graph, and shadow validation targets.

---

## Part 3 — Feature Flag System

### 3.1 Flag Architecture

Phase 0 uses **two** existing flag/control layers, each serving a different purpose:

| Layer | Component | How Used | Fail Behavior |
|-------|-----------|----------|---------------|
| **Growth Registry (primary gate)** | `src/lib/growth/feature-flag-registry.ts` | `PlatformFlag` union extended with 9 new flags. All default `false` in `FLAG_DEFAULTS`. DB-backed with in-memory cache + 60s TTL. | **Fail-closed**: `loadPlatformFlags()` reads from DB; if DB read fails, `FLAG_DEFAULTS` apply (all `false`). Unknown flags are not in the union and cannot be queried. |
| **Control Plane Feature Flags** | `src/lib/control-plane/feature-flags.ts` | 9 new entries added to `DEFAULT_FLAGS` array with `enabled: false`, `rollout_percentage: 0`, `environments: []`. Provides rollout percentage and environment gating. | **CRITICAL**: `isEnabled()` returns `true` for unknown flags. All new flags MUST be registered in `DEFAULT_FLAGS` to be fail-closed. |
| **Control Plane Kill Switches** | `src/lib/control-plane/kill-switches.ts` | 2 new domain kill switches added: `{ feature: "intelligence_enabled", domain: "intelligence" }` and `{ feature: "local_commerce_enabled", domain: "local_commerce" }`. Provides `emergencyShutdown(domain, reason)` per domain. | **Fail-closed for registered switches**: `isFeatureEnabled()` returns `true` for unknown features, so new switches MUST be registered in `DEFAULT_SWITCHES`. |
| **React Hook** | `src/hooks/usePlatformFlags.ts` | Already provides `toggle()` for admin UI. No changes needed (Phase 0 has no UI). | N/A |
| **Admin UI** | `src/pages/admin/ControlPlanePage.tsx` | Renders control-plane flags via `getAllFlags()`. New control-plane flag entries will appear here. Growth registry flags are visible via `AdminGrowthEnginePage.tsx`. | N/A |

**CRITICAL SAFETY NOTE**: Both `control-plane/feature-flags.ts` `isEnabled()` and `control-plane/kill-switches.ts` `isFeatureEnabled()` return `true` for **unknown** flags (fail-open). This means every new flag MUST be explicitly registered in both the growth registry (`FLAG_DEFAULTS`) AND the control-plane (`DEFAULT_FLAGS` + `DEFAULT_SWITCHES`) before any gated code is written. Unregistered flags would silently pass, defeating the safety gate.

### 3.2 Flag Hierarchy

```
enable_global_intelligence (master)
  ├── enable_intelligence_ingestion
  ├── enable_intelligence_ranking
  ├── enable_intelligence_ticker (Architecture Phase 1+, not activated in Phase 0)
  └── enable_religious_utilities

enable_local_social_commerce (master)
  ├── enable_commerce_listings
  ├── enable_commerce_matching
  └── enable_commerce_suggestions (Architecture Phase 4+, not activated in Phase 0)
```

**Rule**: A child flag only takes effect if its parent master flag is also enabled. This provides two-layer safety: master switch + per-module switch.

### 3.3 Gating Pattern

Every Phase 0 function follows a **dual-gate** pattern — checking both the growth registry flag (primary, DB-backed) AND the control-plane kill switch (emergency override):

```typescript
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { isFeatureEnabled } from "@/lib/control-plane/kill-switches";

export function processIntelligenceFeed(): CanonicalGlobalFeedItem[] {
  if (!isFeatureEnabled("intelligence_enabled")) return [];
  if (!isPlatformFlagEnabled("enable_global_intelligence")) return [];
  if (!isPlatformFlagEnabled("enable_intelligence_ingestion")) return [];
  // ... gated logic ...
  return [];
}
```

The kill switch provides instant emergency shutdown (`emergencyShutdown("intelligence", reason)`). The growth registry flag provides granular per-module control with DB persistence. Both must pass for any code to execute.

**IMPORTANT**: The `isPlatformFlagEnabled` function must be exported from `feature-flag-registry.ts` (wrapper around `loadPlatformFlags()` + cache lookup against `FLAG_DEFAULTS`). It returns `false` for any flag not in the `PlatformFlag` union — fail-closed by design. Do NOT use `isEnabled()` from `control-plane/feature-flags.ts` as the primary gate (it is fail-open for unknown flags).

### 3.4 No User-Facing Activation

| Guarantee | Enforcement |
|-----------|-------------|
| All 9 new flags default to `false` | `FLAG_DEFAULTS` record in feature-flag-registry.ts |
| No flag is set to `true` in any committed code | Code review gate |
| Flags can only be toggled via admin control plane | DB-backed, requires admin access |
| No UI surface reads these flags | No React components reference the new flags in Phase 0 |

---

## Part 4 — Non-Visible Mode

### 4.1 Shadow Mode Definition

All Phase 0 systems run in **shadow mode**: they execute internally (when manually enabled via admin flag toggle) but produce no user-visible output.

| Aspect | Shadow Behavior |
|--------|-----------------|
| **UI** | No components rendered. No cards, widgets, tickers, or surfaces. |
| **Notifications** | No push notifications, no in-app notifications, no Orbit messages. |
| **Events** | No events emitted on the platform bus. Event types are defined but not registered. |
| **Data writes** | No database writes. All processing is in-memory with results logged internally. |
| **User impact** | Zero. No user can observe any difference in the app. |
| **Performance** | Zero. No code path executes unless admin-enabled. Dead code elimination applies. |

### 4.2 Shadow Validation Output

When manually enabled by an admin (for internal testing only), shadow mode produces:

```typescript
interface ShadowValidationReport {
  system: "global_intelligence" | "local_social_commerce";
  timestamp: string;
  flagsActive: string[];
  typesValidated: number;
  stateMachinesValidated: number;
  skeletonServicesReachable: number;
  errors: ShadowValidationError[];
  warnings: string[];
  passed: boolean;
}
```

This report is logged to the console and/or internal observability. It is never displayed to users.

### 4.3 Shadow Mode Exit Criteria

Shadow mode remains active until:
1. All type definitions pass validation
2. All state machines produce valid transitions
3. All skeleton services respond correctly when gated
4. Zero errors in shadow validation report
5. Phase 2 is explicitly approved

---

## Part 5 — Data Flow Validation

### 5.1 Data Flow (Phase 0 — Stub Only)

```
                    ┌─────────────────────────────────────────────┐
                    │           SHADOW MODE (no user impact)      │
                    │                                             │
  [Mock Data] ──►   │  Feed Ingestion Stub                       │
                    │    ├── Validates CanonicalGlobalFeedItem    │
                    │    ├── Logs validation result               │
                    │    └── Returns empty array (no output)      │
                    │                                             │
  [Mock Data] ──►   │  Listing Service Stub                      │
                    │    ├── Validates CanonicalLocalListing      │
                    │    ├── Tests state machine transitions      │
                    │    ├── Logs validation result               │
                    │    └── Returns empty array (no output)      │
                    │                                             │
  [Mock Data] ──►   │  Matching Service Stub                     │
                    │    ├── Validates CanonicalLocalMatch        │
                    │    ├── Tests scoring algorithm shape        │
                    │    ├── Logs validation result               │
                    │    └── Returns empty array (no output)      │
                    │                                             │
                    │  Shadow Validator                           │
                    │    ├── Runs all stubs with mock data        │
                    │    ├── Validates type correctness           │
                    │    ├── Validates state machine integrity    │
                    │    └── Produces ShadowValidationReport      │
                    │                                             │
                    └─────────────────────────────────────────────┘
                              │
                              ▼
                    [Console Log / Internal Observability]
                    (never reaches user surfaces)
```

### 5.2 Correctness Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Type shape correctness | TypeScript compiler — all interfaces compile with strict mode | Zero type errors |
| Required field validation | Runtime check in shadow validator — mock objects tested against required fields list | All required fields present and typed correctly |
| State machine validity | `safeTransition()` called with every valid transition pair | All transitions produce expected states; no invalid transitions accepted |
| State machine completeness | Every state is reachable from initial state; terminal states have no outgoing transitions | No orphan states, no missing terminals |
| Flag gating | Call every skeleton service with flags disabled; verify empty/no-op return | Zero side effects when flags are off |
| Import graph | Verify no existing file imports from new module paths | No contamination of existing code paths |

### 5.3 Anomaly Detection

| Anomaly | Detection Method |
|---------|-----------------|
| Unintended activation | `ShadowModeEngine` (existing) monitors `data-feature-flag` DOM attributes. New flags should never appear in DOM in Phase 0. |
| Import contamination | Build-time check: grep for imports from `intelligence/global/` or `commerce/local-social/` in files outside those directories (excluding `canonical-types.ts` and `state-machines.ts`). |
| Event leakage | Verify zero events on `global_intelligence.*` or `local_social_commerce.*` namespaces during normal app operation. Shadow validator confirms no bus registration. |
| Performance regression | Compare app startup time and memory usage before/after Phase 0 code is added. Phase 0 code is dead (flag-gated) so delta should be zero. |

---

## Part 6 — Integration Limits

### 6.1 Explicit Connection Prohibitions

| Integration | Phase 0 Status | Enforcement |
|------------|----------------|-------------|
| **Dashboard** | PROHIBITED — no cards, no modules, no ticker contributions | No import of Dashboard rendering APIs. No `rankDashboardModules` integration. Flag `enable_intelligence_ticker` defaults to `false`. |
| **Orbit** | PROHIBITED — no messages, no thread types, no chat channels | No `local_exchange_chat` thread type registration. No `OrbitWiring` modifications. No `notification-engine.ts` insertions. |
| **Wallet** | PROHIBITED — no currency reads, no escrow concepts, no ledger interaction | No imports from Wallet domain. No `WalletWiring` references. |
| **Radar** | PROHIBITED — no map pins, no POI contributions, no layer additions | No `RadarWiring` modifications. No map layer registrations. |
| **Me** | PROHIBITED — no preference panels, no settings sections | No Me page modifications. No preference storage writes. |
| **Search** | PROHIBITED — no search result contributions, no index modifications | No `executeSearchIntelligence` integration. No search index writes. |
| **Notifications** | PROHIBITED — no push, no in-app, no system notifications | No `createNotification()` calls. No notification category registration. |
| **Platform Bus** | PROHIBITED — no event emission, no listener registration | Event types are defined but NOT registered via `platformBus.on()` or `platformBus.emit()`. |
| **Database** | PROHIBITED — no new tables, no schema changes, no writes | All Phase 0 operates in-memory with mock data. `db()` from `src/services/db.ts` is not called for new tables. |

### 6.2 Allowed Integrations (Read-Only)

| Integration | What's Allowed | Why |
|------------|----------------|-----|
| `canonical-types.ts` | Add new type definitions | Types are the foundation — they must live in the canonical SSOT |
| `state-machines.ts` | Add new machine definitions | Machines follow established pattern and have no runtime effect until used |
| `feature-flag-registry.ts` | Add new flag entries | Flags must be registered in the existing system for admin visibility |
| TypeScript compiler | Type-check new interfaces | Validation — no runtime effect |

---

## Part 7 — Testing Strategy

### 7.1 Unit Validation of Canonical Models

| Test | What It Validates | Expected Result |
|------|------------------|-----------------|
| `CanonicalGlobalFeedItem` shape test | All required fields present, correct types | TypeScript compilation succeeds |
| `CanonicalLocalListing` shape test | All required fields, `status` union includes all values | TypeScript compilation succeeds |
| `CanonicalLocalIntent` shape test | Required fields, confidence range | TypeScript compilation succeeds |
| `CanonicalLocalMatch` shape test | Required fields, score ranges, entity links | TypeScript compilation succeeds |
| `CountryProfile` shape test | `timezones: string[]`, required modules, compliance flags | TypeScript compilation succeeds |
| Factory function tests | `createMockFeedItem()`, `createMockListing()` produce valid instances | Runtime validation passes, all required fields populated |

### 7.2 Data Consistency Checks

| Check | Method |
|-------|--------|
| Listing status ↔ state machine alignment | Verify `LocalListingStatus` type union matches `LISTING_MACHINE` states exactly |
| Match status ↔ state machine alignment | Verify match status type matches `MATCH_MACHINE` states exactly |
| Moderation status ↔ state machine alignment | Verify `ModerationStatus` matches `MODERATION_MACHINE` states exactly |
| Event type ↔ canonical model alignment | Verify event payloads reference canonical types, not ad-hoc shapes |
| Flag names ↔ gating code alignment | Verify every `isEnabled()` call references a registered `PlatformFlag` |

### 7.3 Engine Execution Validation

| Test | Scenario | Expected |
|------|----------|----------|
| Ingestion stub — flags off | Call `processIntelligenceFeed()` with all flags `false` | Returns `[]`, zero side effects |
| Ingestion stub — flags on | Call with flags `true` + mock data | Returns `[]` (stub), logs validation result |
| Listing stub — flags off | Call `createListing()` with all flags `false` | Returns `null`, zero side effects |
| Listing stub — flags on | Call with flags `true` + mock data | Returns mock listing (in-memory), no DB write |
| Matching stub — flags off | Call `computeMatches()` with all flags `false` | Returns `[]`, zero side effects |
| State machine — valid transitions | Test every valid state transition in `LISTING_MACHINE` | `safeTransition()` returns new state |
| State machine — invalid transitions | Test invalid transitions (e.g., `expired → active`) | `safeTransition()` returns `null` or throws |

### 7.4 Simulation Scenarios

| Scenario | Purpose | Method |
|----------|---------|--------|
| Cold start | Verify app starts normally with Phase 0 code present but all flags off | Start app, check no errors, check no new UI, check no new events |
| Flag toggle | Verify enabling/disabling flags has expected effect | Toggle via admin control plane, observe shadow validation output |
| Full shadow cycle | Run complete shadow validation pipeline | Enable master flags, run shadow validator, check report |
| Import isolation | Verify no cross-contamination | Build-time grep for unauthorized imports |
| Performance baseline | Verify zero performance impact | Measure startup time, bundle size, memory — compare before/after |

---

## Part 8 — Rollback Plan

### 8.1 Instant Disable

| Method | How | Recovery Time |
|--------|-----|---------------|
| **Growth registry flags** | Set `enable_global_intelligence` and `enable_local_social_commerce` to `false` in `system_feature_flags` DB table (or via admin toggle in `AdminGrowthEnginePage.tsx`). In-memory cache expires in 60 seconds. | < 60 seconds (cache TTL) |
| **Kill switch — Intelligence** | Call `emergencyShutdown("intelligence", "Phase 0 issue detected")` from `src/lib/control-plane/kill-switches.ts`. This disables the registered kill switch `intelligence_enabled`, blocking all System A code paths instantly (in-memory, no DB delay). | Immediate (< 1 second) |
| **Kill switch — Commerce** | Call `emergencyShutdown("local_commerce", "Phase 0 issue detected")`. Disables `local_commerce_enabled` kill switch, blocking all System B code paths. | Immediate (< 1 second) |
| **Code revert** | Revert to the pre-Phase-0 checkpoint via Replit's checkpoint system | < 5 minutes — full codebase rollback |

**Kill switch prerequisites**: Two new entries must be added to `DEFAULT_SWITCHES` in `kill-switches.ts`:
```
{ feature: "intelligence_enabled", domain: "intelligence" }
{ feature: "local_commerce_enabled", domain: "local_commerce" }
```
The `ControlDomain` type in `control-plane/types.ts` must also be extended with `"intelligence" | "local_commerce"` to satisfy TypeScript.

### 8.2 Issue Isolation

| Issue Type | Isolation Method |
|-----------|-----------------|
| Type error in canonical-types.ts | TypeScript compiler catches at build time. Fix the type, rebuild. No runtime impact since types are erased. |
| Import contamination (existing file imports new module) | Build-time grep detection. Remove the import. No runtime impact since flags are off. |
| Performance regression | Flags default to `false`, so code paths should be tree-shaken. If bundle size increases unexpectedly, lazy-load new modules. |
| State machine conflict | New machines are independent instances. They share no state with existing `PAYMENT_MACHINE`, `ORDER_MACHINE`, `DRIVER_MACHINE`. Remove the new machine definition. |
| Unexpected event emission | Should be impossible (no bus registration in Phase 0). If detected, the kill switch disables everything. Remove the offending code. |

### 8.3 Safe Revert Sequence

```
Step 1: Disable kill switches via emergencyShutdown("intelligence"/"local_commerce") — instant
Step 2: Verify app behavior returns to normal
Step 3: If issue persists, disable growth registry flags — takes effect within 60s
Step 4: If issue persists, check for import contamination
Step 5: If issue persists, revert to pre-Phase-0 checkpoint
Step 6: Post-mortem — identify what failed and why
```

---

## Part 9 — Success Criteria

### 9.1 Phase 0 Completion Checklist

| # | Criterion | Measurement | Required |
|---|-----------|-------------|----------|
| 1 | All canonical types compile with zero errors | `tsc --noEmit` passes | Yes |
| 2 | All state machines are valid (reachable states, valid terminals) | Shadow validator report `stateMachinesValidated > 0`, `errors: []` | Yes |
| 3 | All 9 feature flags registered and default to `false` | Admin control plane shows all flags as `disabled` | Yes |
| 4 | All skeleton services return no-op when flags are off | Unit tests pass for flag-off scenarios | Yes |
| 5 | Zero import contamination | Build-time grep shows no unauthorized imports | Yes |
| 6 | Zero event emission on new namespaces | Platform bus event log shows zero `global_intelligence.*` or `local_social_commerce.*` events during normal operation | Yes |
| 7 | Zero UI changes | Screenshot comparison shows no visual difference | Yes |
| 8 | Zero performance regression | Startup time and bundle size within 2% of baseline | Yes |
| 9 | Shadow validation report passes when flags manually enabled | `ShadowValidationReport.passed === true` | Yes |
| 10 | Zero errors in application logs related to new modules | Log grep for "intelligence" or "local_social" shows no errors | Yes |

### 9.2 When Phase 0 Is Complete

Phase 0 is complete when ALL 10 criteria above are met AND the shadow validation report has been reviewed and approved. Only then may Architecture Phase 1 planning begin.

---

## Part 10 — What Comes Next

### 10.1 Architecture Phase 1 Preview (Not Designed Yet)

Architecture Phase 1 (per Section 25.2: "Simple ticker + basic country info") will unlock:

| Capability | Description |
|-----------|-------------|
| **Database schema** | Create tables for feed items, listings, intents, matches, moderation state. All behind feature flags. |
| **Provider integration** | Connect to first external data provider (likely weather or forex — lowest risk). Real data flows through the ingestion pipeline into the database. |
| **Ingestion pipeline** | Replace stubs with real canonicalization adapters. Feed items are stored, scored, and ranked internally. |
| **Trust scoring** | Source trust evaluation engine begins scoring providers. Listing quality scoring begins for mock listings. |
| **Internal observability** | Engine health dashboard (admin-only) showing ingestion rates, freshness scores, trust scores. |

### 10.2 What Architecture Phase 1 Will NOT Unlock

| Still Prohibited in Architecture Phase 1 |
|------------------------------|
| Dashboard exposure (no user-visible cards) |
| Ticker contributions |
| Push notifications or in-app notifications |
| Orbit thread types or conversations |
| Wallet interactions |
| Search result contributions |
| User-facing UI of any kind |

### 10.3 Architecture Phase 1 Prerequisites

1. Phase 0 is complete and all 10 success criteria are met
2. Phase 0 has been running without issues for a defined stabilization period
3. Architecture Phase 1 plan is written, reviewed, and approved (same process as this document)
4. Database schema design is reviewed before table creation

---

## Final Rule

This phase:
- **Builds foundations** — types, state machines, flags, skeletons
- **Remains invisible** — no user can observe any difference
- **Guarantees zero risk** — all code is dead until manually flag-enabled by admin

---

**NO IMPLEMENTATION HAS BEEN PERFORMED.**
**This is a planning document only.**
**Implementation requires separate, tracked tasks with explicit approval.**

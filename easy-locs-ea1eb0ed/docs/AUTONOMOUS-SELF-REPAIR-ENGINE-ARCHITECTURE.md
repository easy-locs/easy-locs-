# Autonomous Self-Repair Engine System — Full Architecture

**Version:** 1.0
**Date:** April 12, 2026
**Status:** Architecture Plan (Pre-Implementation)

---

## Table of Contents

1. [Global Objective](#section-1--global-objective)
2. [Engine Architecture (15+ Engines)](#section-2--engine-architecture)
3. [Domain Coverage](#section-3--domain-coverage)
4. [Repair Level Matrix](#section-4--repair-level-matrix)
5. [Safety Model](#section-5--safety-model)
6. [Self-Repair Pipeline](#section-6--self-repair-pipeline)
7. [Rollback & Containment](#section-7--rollback--containment)
8. [Proof System](#section-8--proof-system)
9. [Observability](#section-9--observability)
10. [World-Class Standard](#section-10--world-class-standard)
11. [Implementation Roadmap](#section-11--implementation-roadmap)
12. [Core Financial Safety](#section-12--core-financial-safety)
13. [Autonomy Graduation Model](#section-13--autonomy-graduation-model)
14. [No Hidden Live Expansion](#section-14--no-hidden-live-expansion)
15. [Final Output Compilation](#section-15--final-output-compilation)

---

## Section 1 — Global Objective

### 1.1 Mission

The Autonomous Self-Repair Engine System operates 24/7 across all domains of the super app, continuously detecting, diagnosing, repairing, and verifying issues with minimal human intervention. The system reduces mean-time-to-detect (MTTD) and mean-time-to-repair (MTTR) while maintaining strict safety guarantees that prevent autonomous actions from causing more harm than the issues they address.

### 1.2 How It Works

The system operates as a continuous loop across all 10+ application verticals:

1. **Detect** — Engines run on tick intervals (15s–120s), scanning their domain for anomalies, drift, failures, and degradation.
2. **Classify** — Detected issues are categorized by type (network, auth, state, render, data), severity (info, warning, error, critical), and domain (wallet, orbit, radar, etc.).
3. **Prioritize** — Issues are scored by impact (affected users, financial risk, security exposure) and urgency (time-sensitivity, cascading risk).
4. **Repair** — Based on the repair level (L1–L4), the system either logs, auto-fixes, proposes a supervised fix, or escalates to human approval.
5. **Verify** — Every repair is validated end-to-end, regression-checked, and either accepted or rolled back.
6. **Learn** — Repair outcomes feed back into confidence scoring and the autonomy graduation model.

### 1.3 Runtime Backbone

The existing `BaseEngine` class (`src/engines/core/base-engine.ts`) serves as the runtime foundation. Every repair engine extends `BaseEngine`, inheriting:

- **Tick-based execution** with configurable intervals (`intervalMs`)
- **Feature-flag gating** via `isEngineEnabled()` from `engine-feature-flags.ts`
- **Lifecycle management** (start/stop, timer cleanup)
- **Metrics collection** via `engineObserver.recordTick()` and `engineObserver.recordError()`
- **Event emission** via `platformBus` for cross-engine communication
- **Action levels** (`observe`, `detect`, `propose`, `act`) indicating the engine's current operational mode

The `EngineOrchestrator` (`src/engines/core/engine-orchestrator.ts`) manages engine registration, startup sequencing, and provides a unified reporting surface via `getAllStats()` and `getReport()`. The tiered loading system in `engine-registry.ts` (Tier 1: Core, Tier 2: Specialized, Tier 3: Quality) ensures critical engines start first.

### 1.4 Reducing Manual Intervention Over Time

The system achieves progressive autonomy through:

- **Confidence scoring**: Each engine tracks its success rate, false-positive rate, and regression count. As confidence rises, engines graduate to higher autonomy levels.
- **Proof accumulation**: Every repair produces a structured proof record. A history of successful proofs unlocks higher repair levels.
- **Feedback loops**: Human overrides and corrections are fed back into classification models, reducing future false positives.
- **Domain-specific learning**: Repair rules are tuned per vertical, so a fix proven safe in one domain can be evaluated for applicability in others.

---

## Section 2 — Engine Architecture

### 2.1 Engine Stack Overview

The autonomous repair system comprises 15 logical engine categories. Each category maps to one or more existing engine implementations that extend `BaseEngine`.

### 2.2 Engine Definitions

#### Engine 1: Health Monitoring Engine

| Property | Value |
|---|---|
| **ID** | `repair-health-monitor` |
| **Detection Scope** | Overall system health: memory pressure, CPU/thread blocking, DOM size, active subscriptions, error rates |
| **Tick Interval** | 15,000ms |
| **Action Level** | `detect` → `propose` |
| **Existing Engines** | `RuntimeHealthEngine` (governance), `PerfAnalyzer` (performance), `sentinel-health` (sentinel) |
| **Integration** | Aggregates health signals from `RuntimeHealthEngine` subscription tracking, `PerfAnalyzer` FPS/heap metrics, and `sentinel-health` cross-domain status. Emits `repair:health:degraded` on `platformBus` when composite health score drops below threshold. |

#### Engine 2: Runtime Error Detection Engine

| Property | Value |
|---|---|
| **ID** | `repair-error-detection` |
| **Detection Scope** | Uncaught exceptions, unhandled rejections, React render errors, 5xx API responses |
| **Tick Interval** | 30,000ms |
| **Action Level** | `detect` → `act` (for auto-fixable categories only) |
| **Existing Engines** | `ErrorClassifier` (self-healing), `SilentRecoveryService` (self-healing), `ErrorHeatmapEngine` (observability) |
| **Integration** | Uses `ErrorClassifier.categorize()` to classify errors into `network`, `auth`, `state`, `render`, `data`, `unknown`. Auto-fixable categories (network retries, stale state invalidation) proceed to L2 repair. Non-fixable errors are logged with full context for L3/L4 review. `ErrorHeatmapEngine` maps errors to routes for hotspot detection. |

#### Engine 3: Dead-Click / Dead-Action Detection Engine

| Property | Value |
|---|---|
| **ID** | `repair-dead-action` |
| **Detection Scope** | Buttons with no handlers, broken links, orphan forms, invisible CTAs, rage clicks |
| **Tick Interval** | 60,000ms |
| **Action Level** | `detect` → `propose` |
| **Existing Engines** | `DeadFlowEngine` (quality), `ActionWiringEngine` (governance), `UXFrictionEngine` (uiux) |
| **Integration** | `DeadFlowEngine` scans DOM for structural dead ends (no-action buttons, `href="#"` links). `ActionWiringEngine` validates that registered actions map to handlers. `UXFrictionEngine` detects rage-click patterns indicating broken interactions. Findings are correlated to produce a unified "dead action" report. |

#### Engine 4: Loading-State Verification Engine

| Property | Value |
|---|---|
| **ID** | `repair-loading-state` |
| **Detection Scope** | Stuck loading spinners, skeleton screens that never resolve, infinite loading states |
| **Tick Interval** | 20,000ms |
| **Action Level** | `detect` → `act` (safe retry/invalidation) |
| **Existing Engines** | `SilentRecoveryService` (self-healing), `FlowClosureEngine` (governance) |
| **Integration** | `SilentRecoveryService` detects content areas smaller than viewport with `[data-loading]` indicators. `FlowClosureEngine` monitors flows for stall detection. Repairs include query invalidation, component remount signals, and fallback content activation. All repairs are idempotent. |

#### Engine 5: Broken-Route / Navigation Engine

| Property | Value |
|---|---|
| **ID** | `repair-navigation` |
| **Detection Scope** | 404 routes, redirect loops, broken deep links, navigation failures |
| **Tick Interval** | 30,000ms |
| **Action Level** | `detect` → `propose` |
| **Existing Engines** | `RoutingQualityEngine` (quality/radar), `FlowClosureEngine` (governance) |
| **Integration** | Monitors `window.location` changes and router events. Detects repeated navigations to error pages, redirect chains > 3 hops, and routes that produce empty content. Proposes fallback navigation or route correction. |

#### Engine 6: Data Consistency Engine

| Property | Value |
|---|---|
| **ID** | `repair-data-consistency` |
| **Detection Scope** | Stale cache entries, optimistic update failures, query cache inconsistencies, duplicate records |
| **Tick Interval** | 45,000ms |
| **Action Level** | `detect` → `act` (cache invalidation), `propose` (data corrections) |
| **Existing Engines** | `ReconciliationEngine` (wallet), `SyncRepairEngine` (realtime), `MessageReconcileEngine` (realtime), `DuplicateShadowEngine` (data-quality) |
| **Integration** | Cross-references query cache state with realtime subscription data. Detects divergence between optimistic UI state and server-confirmed state. Safe repairs: invalidate stale queries, trigger re-fetch. Unsafe repairs (data mutation): escalate to L3/L4. |

#### Engine 7: Single-Source-of-Truth Validation Engine

| Property | Value |
|---|---|
| **ID** | `repair-ssot` |
| **Detection Scope** | Violations of canonical type contracts, duplicate state sources, type drift between client and server |
| **Tick Interval** | 60,000ms |
| **Action Level** | `detect` → `propose` |
| **Existing Engines** | `SSOTAuditor` (architecture), `DomainBoundaryEnforcer` (architecture), `sentinel-invariants` (sentinel), `source-of-truth-registry` (sentinel) |
| **Integration** | Validates that runtime data structures conform to canonical types defined in `canonical-types.ts`. Detects when multiple stores hold conflicting versions of the same entity. Reports violations to sentinel's `InvariantEngine` for tracking. |

#### Engine 8: API Failure / Retry Control Engine

| Property | Value |
|---|---|
| **ID** | `repair-api-retry` |
| **Detection Scope** | Failed API calls, retry storms, circuit breaker states, timeout cascades |
| **Tick Interval** | 15,000ms |
| **Action Level** | `detect` → `act` (idempotent retries), `propose` (non-idempotent) |
| **Existing Engines** | `NetworkLatencyEngine` (performance), `RetryReplayEngine` (realtime), `AutoFixEngine` (self-healing) |
| **Integration** | Monitors `performance.getEntriesByType("resource")` for 5xx responses and timeouts. Implements exponential backoff for idempotent GET requests (L2). Non-idempotent mutations (POST, PUT, DELETE) require L3 approval before retry. Tracks retry counts to prevent retry storms (max 3 retries per endpoint per 60s window). |

#### Engine 9: Realtime Sync Integrity Engine

| Property | Value |
|---|---|
| **ID** | `repair-realtime-sync` |
| **Detection Scope** | WebSocket disconnections, subscription staleness, presence drift, message delivery failures |
| **Tick Interval** | 15,000ms |
| **Action Level** | `detect` → `act` (reconnection), `propose` (data reconciliation) |
| **Existing Engines** | `PresenceHealthEngine` (realtime), `SyncRepairEngine` (realtime), `UnreadIntegrityEngine` (realtime), `ReconnectEngine` (calls) |
| **Integration** | Uses `RuntimeHealthEngine.subscriptionRegistry` to track subscription health. Detects stale subscriptions (no heartbeat > 60s) and triggers reconnection. Reconciles unread counts and presence states after reconnection. Emits `repair:realtime:reconnected` events for downstream engines. |

#### Engine 10: State-Machine Integrity Engine

| Property | Value |
|---|---|
| **ID** | `repair-state-machine` |
| **Detection Scope** | Invalid state transitions, stuck state machines, orphaned processes, flow violations |
| **Tick Interval** | 30,000ms |
| **Action Level** | `detect` → `propose` |
| **Existing Engines** | `FlowIntegrityEngine` (business), `FlowClosureEngine` (governance), `sentinel-workflow` (sentinel) |
| **Integration** | Monitors business-critical state machines (order lifecycle, payment flow, booking process). Detects states that have exceeded their maximum duration (e.g., "pending" > 5 minutes). Proposes transitions to terminal states (cancel, timeout) or escalates to human review. Never autonomously advances financial state machines past L2. |

#### Engine 11: UI Regression Detection Engine

| Property | Value |
|---|---|
| **ID** | `repair-ui-regression` |
| **Detection Scope** | DOM structure changes, broken images, empty containers, layout shifts, accessibility violations |
| **Tick Interval** | 60,000ms |
| **Action Level** | `detect` → `propose` |
| **Existing Engines** | `DesignRegressionEngine` (uiux), `LayoutConsistencyEngine` (uiux), `LayoutIntegrityEngine` (governance), `AccessibilityEngine` (uiux) |
| **Integration** | Tracks DOM element counts per route and flags "major DOM changes" (> 30% deviation from baseline). Detects broken images via `naturalWidth === 0`, empty content containers, and accessibility violations. Proposes fallback rendering or image placeholder activation. |

#### Engine 12: Performance Degradation Engine

| Property | Value |
|---|---|
| **ID** | `repair-performance` |
| **Detection Scope** | FPS drops, long tasks (>50ms), memory leaks, slow page loads, API latency spikes |
| **Tick Interval** | 30,000ms |
| **Action Level** | `detect` → `act` (memory cleanup, cache eviction) |
| **Existing Engines** | `PerfAnalyzer` (performance), `CachePolicyEngine` (performance), `NetworkLatencyEngine` (performance), `ObservabilityEngine` (quality) |
| **Integration** | Combines FPS tracking, JS heap monitoring, long-task counting, and network latency measurement. Safe auto-repairs (L2): evict inactive query cache entries, remove unobserved stale queries, clear expired localStorage entries. Unsafe actions (component lazy-loading changes, render tree optimization): L3. |

#### Engine 13: Fallback / Resilience Engine

| Property | Value |
|---|---|
| **ID** | `repair-fallback` |
| **Detection Scope** | Feature degradation, service unavailability, graceful degradation needs |
| **Tick Interval** | 30,000ms |
| **Action Level** | `detect` → `act` (activate fallbacks) |
| **Existing Engines** | `AutoFixEngine` (self-healing), `AutoRemediationEngine` (governance), `RollbackEngine` (self-healing) |
| **Integration** | When upstream services fail or features degrade, activates pre-configured fallback behaviors: offline mode, cached data display, simplified UI. Integrates with `kill-switches.ts` to disable broken features and with `feature-flags.ts` to activate fallback variants. |

#### Engine 14: Controlled Auto-Fix Engine

| Property | Value |
|---|---|
| **ID** | `repair-auto-fix` |
| **Detection Scope** | Known-safe, pre-approved repair patterns: stale cache refresh, offline recovery, query invalidation |
| **Tick Interval** | 45,000ms |
| **Action Level** | `act` |
| **Existing Engines** | `AutoFixEngine` (self-healing), `AutoRemediationEngine` (governance), `SafeRemediationEngine` (data-quality) |
| **Integration** | Executes only repairs from the approved repair pattern registry. Each pattern has a cooldown period (e.g., `stale-query-refetch`: 120s, `offline-recovery`: 60s, `memory-pressure`: 300s). All repairs are idempotent and reversible. Produces proof records for every action. |

#### Engine 15: Proof & Regression Engine

| Property | Value |
|---|---|
| **ID** | `repair-proof` |
| **Detection Scope** | Post-repair validation, regression detection, proof record generation |
| **Tick Interval** | 30,000ms |
| **Action Level** | `observe` → `detect` (regression found) |
| **Existing Engines** | `RootCauseEngine` (support), `IncidentClusteringEngine` (support), `TraceCorrelationEngine` (observability), `sentinel-audit` (sentinel) |
| **Integration** | After every repair action, runs validation checks: (1) original issue resolved, (2) no new errors introduced, (3) affected metrics stable. Generates structured proof records stored in the proof system. If regression detected, triggers immediate rollback via `RollbackEngine`. |

### 2.3 Engine Inventory Table

| # | Engine ID | Category | Interval | Action Level Range | Existing Mapping |
|---|---|---|---|---|---|
| 1 | `repair-health-monitor` | Health | 15s | detect→propose | RuntimeHealthEngine, PerfAnalyzer, sentinel-health |
| 2 | `repair-error-detection` | Error | 30s | detect→act | ErrorClassifier, SilentRecoveryService, ErrorHeatmapEngine |
| 3 | `repair-dead-action` | UX | 60s | detect→propose | DeadFlowEngine, ActionWiringEngine, UXFrictionEngine |
| 4 | `repair-loading-state` | UX | 20s | detect→act | SilentRecoveryService, FlowClosureEngine |
| 5 | `repair-navigation` | Navigation | 30s | detect→propose | RoutingQualityEngine, FlowClosureEngine |
| 6 | `repair-data-consistency` | Data | 45s | detect→act/propose | ReconciliationEngine, SyncRepairEngine, DuplicateShadowEngine |
| 7 | `repair-ssot` | Architecture | 60s | detect→propose | SSOTAuditor, DomainBoundaryEnforcer, sentinel-invariants |
| 8 | `repair-api-retry` | Network | 15s | detect→act/propose | NetworkLatencyEngine, RetryReplayEngine, AutoFixEngine |
| 9 | `repair-realtime-sync` | Realtime | 15s | detect→act/propose | PresenceHealthEngine, SyncRepairEngine, ReconnectEngine |
| 10 | `repair-state-machine` | Business | 30s | detect→propose | FlowIntegrityEngine, FlowClosureEngine, sentinel-workflow |
| 11 | `repair-ui-regression` | UI | 60s | detect→propose | DesignRegressionEngine, LayoutConsistencyEngine, AccessibilityEngine |
| 12 | `repair-performance` | Performance | 30s | detect→act | PerfAnalyzer, CachePolicyEngine, NetworkLatencyEngine |
| 13 | `repair-fallback` | Resilience | 30s | detect→act | AutoFixEngine, AutoRemediationEngine, RollbackEngine |
| 14 | `repair-auto-fix` | Self-Healing | 45s | act | AutoFixEngine, AutoRemediationEngine, SafeRemediationEngine |
| 15 | `repair-proof` | Validation | 30s | observe→detect | RootCauseEngine, TraceCorrelationEngine, sentinel-audit |

---

## Section 3 — Domain Coverage

### 3.1 Domain-Engine Activation Matrix

| Domain | Active Repair Engines | Critical Invariants |
|---|---|---|
| **Orbit** | 1,2,3,4,5,6,8,9,11,12,13,14,15 | Message delivery guarantee, conversation consistency, presence accuracy, media flow integrity |
| **Wallet** | 1,2,6,8,10,12,13,15 | Balance accuracy, ledger integrity, transaction atomicity, fraud detection, payout safety |
| **Radar** | 1,2,5,6,8,11,12,13,15 | Location accuracy, route integrity, ETA accuracy, provider matching correctness |
| **Dashboard** | 1,2,3,4,5,11,12,13,15 | Card rendering, data freshness, layout stability, widget integrity |
| **Marketplace** | 1,2,3,4,5,6,7,8,10,11,12,13,14,15 | Listing integrity, search accuracy, taxonomy compliance, media validation |
| **Property** | 1,2,3,4,5,6,7,8,10,11,12,13,14,15 | Listing data accuracy, pricing consistency, availability sync, booking flow integrity |
| **Travel (Hotel/Flight)** | 1,2,5,6,8,10,11,12,13,15 | Booking state integrity, pricing accuracy, availability freshness, itinerary consistency |
| **Notifications** | 1,2,4,8,9,12,13,15 | Delivery reliability, deduplication, preference compliance, realtime push integrity |
| **Calls (Video/Voice)** | 1,2,9,12,13,15 | Call stability, reconnection reliability, media quality, resource management |
| **Auth/Sessions/Onboarding** | 1,2,5,8,10,12,13,15 | Session validity, token freshness, onboarding flow completion, security policy compliance |

### 3.2 Domain-Specific Repair Rules

#### Orbit (Messaging & Communication)

- **Message delivery failure**: If message delivery stalls > 10s, retry via realtime channel (L2). If retry fails 3x, mark as failed and notify user (L2). Never silently drop messages.
- **Conversation consistency drift**: If unread count diverges from server state, reconcile via `UnreadIntegrityEngine` (L2). Log discrepancy in proof system.
- **Presence staleness**: If presence heartbeat missed > 60s, mark user as "away" (L2). Reconnection triggers presence re-sync.
- **Media upload failure**: Retry with exponential backoff, max 3 attempts (L2). On final failure, preserve local copy and show upload-failed indicator.
- **Existing engines**: `OrbitQualityEngine`, `MessageDeliveryEngine`, `ConversationConsistencyEngine`, `GroupIntegrityEngine`, `OptimisticUIEngine`, `orbit-integrity-engine` (sentinel).

#### Wallet (Financial)

- **Balance display drift**: If displayed balance differs from last confirmed server balance, refresh display from cache (L2). Never autonomously correct actual balances (L4).
- **Transaction stuck > 1 hour**: Flag for human review (L3). Log full transaction timeline in proof system.
- **Payment failure pattern**: If same payment method fails > 3x in 5 minutes, temporarily disable retry for that method (L2). Notify user of alternative methods.
- **Fraud signal**: Immediately flag and freeze affected operation (L3/L4). Never autonomously resolve fraud cases.
- **FX rate staleness**: If displayed FX rate > 5 minutes old, refresh from server (L2). Never autonomously apply rate corrections to pending transactions (L4).
- **Existing engines**: `ReconciliationEngine`, `LedgerIntegrityEngine`, `FraudWatchEngine`, `PayoutSafetyEngine`, `FXConsistencyEngine`, `WalletQualityEngine`, `wallet-integrity-engine` (sentinel).

#### Radar (Maps & Navigation)

- **Location accuracy drift**: If GPS coordinates show impossible movement (> 200 km/h), flag as data quality issue (L2). Do not auto-correct user location.
- **Route calculation failure**: Retry with alternative provider if primary fails (L2). Fall back to cached route if available.
- **ETA accuracy degradation**: If ETA predictions drift > 30% from actual, flag for model recalibration (L3).
- **Provider matching failure**: If provider-rider matching fails, expand search radius incrementally (L2). Log match attempt history.
- **Existing engines**: `RoutingQualityEngine`, `LocationIntegrityEngine`, `GeocodeRepairEngine`, `ProviderMatchingEngine`, `ETAAccuracyEngine`, `radar-sync-engine` (sentinel).

#### Dashboard

- **Card rendering failure**: If dashboard card throws render error, replace with error boundary fallback (L2). Log component stack trace.
- **Data freshness violation**: If card data > 5 minutes stale, trigger background refresh (L2). Show staleness indicator to user.
- **Layout instability**: If layout shifts detected (CLS > 0.1), stabilize by applying fixed dimensions to shifting elements (L2).
- **Widget state corruption**: Reset widget to default state if state validation fails (L2). Preserve user preferences separately.
- **Existing engines**: `dashboard-card-engine` (sentinel), `LayoutIntegrityEngine`, `BannerStrategyEngine`.

#### Marketplace

- **Listing data corruption**: If listing fails schema validation, quarantine listing from search results (L2). Flag for data team review (L3).
- **Search ranking anomaly**: If search results quality score drops below threshold, fall back to default ranking (L2). Log ranking model state.
- **Taxonomy violation**: If listing category violates taxonomy rules, auto-reclassify if confidence > 95% (L2). Otherwise, flag for review (L3).
- **Media validation failure**: If listing media fails relevance check, hide invalid media (L2). Notify merchant for replacement.
- **Existing engines**: `MenuNormalizer`, `ServiceNormalizer`, `TaxonomyEnforcer`, `MediaRelevanceEngine`, `search-ranking-engine` (sentinel).

#### Property (Real Estate)

- **Pricing inconsistency**: If property price differs between listing and detail views, refresh from server (L2). Never auto-correct prices (L3).
- **Availability sync failure**: If availability calendar diverges from source, trigger full sync (L2). Flag for review if conflict detected (L3).
- **Listing quality degradation**: If listing quality score drops (missing fields, bad photos), flag for seller notification (L2).
- **Existing engines**: `PropertyNormalizer`, `real-estate-engine` (sentinel), `PropertyEngine` (quality).

#### Travel (Hotel / Flight)

- **Booking flow interruption**: If booking flow stalls > 5 minutes, preserve state and offer recovery option (L2). Never auto-complete bookings (L4).
- **Price change during flow**: If price changes during checkout, halt flow and notify user (L2). Never auto-accept price changes.
- **Availability mismatch**: If selected inventory becomes unavailable during flow, notify user immediately (L2). Suggest alternatives.
- **Existing engines**: `HotelNormalizer`, `hotel-engine` (sentinel), `flight-engine` (sentinel).

#### Notifications

- **Delivery failure**: If push notification delivery fails, retry via alternative channel (in-app, email) (L2).
- **Deduplication failure**: If duplicate notification detected, suppress subsequent copies (L2). Log dedup event.
- **Preference violation**: If notification sent against user preferences, suppress and log violation (L2). Flag preference sync issue.
- **Existing engines**: Notification-related event handlers on `platformBus`.

#### Calls (Video / Voice)

- **Call quality degradation**: If packet loss > 5% or jitter > 50ms, trigger adaptive quality adjustment (L2).
- **Disconnection**: Auto-reconnect with exponential backoff, max 5 attempts (L2). Preserve call state for resumption.
- **Resource pressure**: If > 3 concurrent calls detected, warn user and defer non-essential processing (L2).
- **Existing engines**: `CallHealthEngine`, `ReconnectEngine`, `NetworkAdaptationEngine`, `MediaQualityEngine`.

#### Auth / Sessions / Onboarding

- **Token expiration**: Auto-refresh token if refresh token is valid (L2). If refresh fails, redirect to login (L2).
- **Session anomaly**: If session risk score exceeds threshold (multiple locations, unusual device), flag for re-authentication (L3). Never auto-terminate sessions.
- **Onboarding flow stuck**: If onboarding step stalls > 5 minutes, offer skip option or retry (L2). Preserve progress.
- **Existing engines**: `ZeroTrustEngine`, `SessionRiskEngine`, `DeviceTrustEngine`, `PolicyHardener`.

---

## Section 4 — Repair Level Matrix

### 4.1 Level Definitions

| Level | Name | Description | Automation | Human Involvement |
|---|---|---|---|---|
| **L1** | Detect Only | Issue is detected, classified, and logged. No mutations. | Full | None (monitoring only) |
| **L2** | Automatic Safe Correction | Idempotent, reversible fix applied automatically. | Full | None (post-hoc review available) |
| **L3** | Supervised Correction | Fix proposed with proof record. Human reviews and approves before application. | Proposal automated | Approval required |
| **L4** | Blocked / Human Approval | Fix cannot be automated. Requires human intervention, manual investigation, or executive decision. | Detection only | Full manual resolution |

### 4.2 Issue-to-Level Matrix

| Issue Type | Level | Rationale |
|---|---|---|
| Stale cache entry | L2 | Idempotent invalidation, no data loss |
| Failed GET API retry | L2 | Read-only, idempotent |
| Offline recovery sync | L2 | Re-fetch of existing data |
| Memory pressure GC | L2 | Removes unobserved queries, reversible |
| Stuck loading spinner | L2 | Query invalidation, component remount |
| WebSocket reconnection | L2 | Re-establish existing channel |
| Token auto-refresh | L2 | Standard auth flow, idempotent |
| Broken image fallback | L2 | Visual-only, no data impact |
| Notification deduplication | L2 | Suppression of duplicates |
| Call quality adaptation | L2 | Media parameter tuning |
| Dead button detection | L1 | Detection only, structural change needed |
| Navigation failure | L1→L2 | Log first, then redirect to safe page |
| UI regression detection | L1 | Visual change tracking |
| DOM structure anomaly | L1 | Monitoring only |
| Listing reclassification | L2→L3 | Auto if confidence > 95%, else human |
| Payment retry (idempotent) | L3 | Financial operation, needs proof |
| Transaction stuck > 1hr | L3 | Requires investigation context |
| Price change in flow | L2 | Notify user, halt flow |
| Fraud signal flagging | L3→L4 | Flag immediately, resolve manually |
| State machine advancement | L3 | Business logic, needs verification |
| Data schema migration | L4 | Irreversible, broad impact |
| Balance adjustment | L4 | Financial mutation, never autonomous |
| Settlement finalization | L4 | Legal/financial finality |
| Fraud case resolution | L4 | Legal/compliance requirement |
| Ledger truth correction | L4 | Financial source-of-truth |
| Booking auto-completion | L4 | Financial commitment on behalf of user |
| Session termination | L3 | Security action, needs evidence |
| Kill-switch activation | L3 | Broad impact, needs approval |
| Cross-domain repair | L3→L4 | Requires multi-domain coordination |
| Engine autonomy promotion | L4 | Governance decision |

---

## Section 5 — Safety Model

### 5.1 Eight Safety Constraints

#### Constraint 1: Strict Domain Isolation

**Rule**: No engine may read, write, or affect state outside its registered domain without explicit cross-domain authorization.

**Enforcement**:
- Each engine declares its `domain` scope at registration time.
- `platformBus` event emission follows two namespace conventions: (a) engine-specific events use `engine:{category}:{event}` (via `BaseEngine.emit()`), (b) pipeline-level events use `repair:pipeline:{stage}` (a system-level namespace exempt from domain isolation since they are observability events, not domain mutations).
- `DomainBoundaryEnforcer` (architecture) actively monitors for cross-domain violations.
- `VerticalIsolationEngine` (governance) validates that no engine accesses stores, hooks, or services from other verticals.
- Violation triggers: immediate engine stop, governance violation record, alert to incident engine.

#### Constraint 2: No Uncontrolled Mutation

**Rule**: No engine may mutate application state, user data, or server data without producing a pre-mutation snapshot, a mutation description, and a post-mutation validation plan.

**Enforcement**:
- All `act`-level operations must go through the repair pipeline (Section 6), which enforces snapshot→mutate→validate.
- The `repair-proof` engine validates every mutation's proof record.
- Mutations without proof records trigger an immediate rollback via `RollbackEngine`.
- `AutoRemediationEngine` enforces that only pre-approved remediation rules can execute mutations.

#### Constraint 3: No Direct Database Writes

**Rule**: No client-side repair engine may directly write to Supabase or any persistent storage. All data mutations must go through established API endpoints or Edge Functions.

**Enforcement**:
- Repair engines operate on client-side state only (query cache, local storage, component state).
- Any "repair" that requires server-side data change produces an L3/L4 escalation with a proof record.
- `PlatformBusEnforcer` monitors for direct database client usage outside approved service layers.
- The Supabase client is wrapped with audit logging that flags non-service-layer calls.

#### Constraint 4: No Breaking Canonical Types

**Rule**: No engine may produce, store, or transmit data that violates the canonical type definitions in `canonical-types.ts`.

**Enforcement**:
- `SSOTAuditor` continuously validates runtime data against canonical schemas.
- `sentinel-invariants` (`InvariantEngine`) enforces type invariants across all domains.
- `source-of-truth-registry` tracks which module is the authoritative source for each data type.
- Type violations are treated as L3 incidents, requiring human review before any corrective action.

#### Constraint 5: No Violating State Machines

**Rule**: No engine may force a state-machine transition that violates the defined transition graph. Only valid transitions from the current state are permitted.

**Enforcement**:
- `FlowIntegrityEngine` and `FlowClosureEngine` maintain state-machine definitions for all critical flows.
- `sentinel-workflow` validates workflow state transitions.
- Attempted invalid transitions are blocked, logged as violations, and the engine is flagged for review.
- Financial state machines (payment, settlement, payout) have additional guards: transitions require both state-validity check AND financial-safety check.

#### Constraint 6: No Circular Repair Loops

**Rule**: If a repair action triggers the same issue that caused it, the loop must be detected and broken within 3 iterations.

**Enforcement**:
- Each repair action is tagged with a `repairChainId` (a trace identifier linking cause→repair→validation).
- The `repair-proof` engine tracks `repairChainId` history and detects when the same `issueSignature` appears > 3 times in a chain.
- On loop detection: (a) halt the repair chain, (b) quarantine the affected engine, (c) escalate to L4, (d) emit `repair:loop:detected` on `platformBus`.
- Cooldown periods on `AutoFixEngine` (per fix type) provide a first line of defense.

#### Constraint 7: No Repair Storms

**Rule**: The total number of repair actions across all engines must not exceed a configurable threshold per time window (default: 50 repairs per 60 seconds).

**Enforcement**:
- A global repair counter is maintained by the `EngineOrchestrator` (to be extended).
- When the threshold is exceeded: (a) all engines drop to L1 (detect-only) mode, (b) `repair:storm:detected` event is emitted, (c) a 5-minute cooldown is enforced before resuming L2+ operations.
- `sentinel-health` monitors the repair rate as a system health metric.
- Per-engine rate limits also apply (via cooldown maps in existing engines like `AutoFixEngine`).

#### Constraint 8: No Hidden Side Effects

**Rule**: Every repair action must declare its full scope of impact before execution. No action may have effects beyond its declared scope.

**Enforcement**:
- Repair actions are defined as structured objects with `scope` (which stores/caches/UI elements are affected), `expectedOutcome`, and `rollbackPlan`.
- The `repair-proof` engine's post-repair validation checks for unexpected state changes beyond the declared scope.
- `AntiConflictEngine` monitors for conflicting repairs (two engines attempting to fix the same issue simultaneously).
- `sentinel-conflict` (`SentinelConflictEngine`) detects and resolves engine conflicts at the sentinel level.

#### Constraint 9: No Autonomous Code Rewriting

**Rule**: No engine may rewrite, modify, generate, or structurally refactor source files at runtime. Repair actions are strictly bounded to approved remediation patterns (cache invalidation, reconnection, state reset, fallback activation). No engine may emit, inject, or execute dynamically generated code.

**Enforcement**:
- The approved repair pattern registry (`repair-safety.ts`) enumerates every permitted remediation action. Actions outside this registry are rejected.
- `repair-proof` engine validates that every `RepairAction.mutations[].operation` is one of the allowed operations: `invalidate`, `refresh`, `reset`, `reconnect`, `fallback`, `suppress`.
- No engine has filesystem access, `eval()`, `Function()`, dynamic `import()` of non-registered modules, or `document.write()`.
- Any attempt to modify source files, inject scripts, or perform structural refactoring triggers an immediate engine freeze + L4 escalation.
- Code suggestion engines (AI tier) may only propose suggestions to the proof system — never execute them autonomously.

#### Constraint 10: Sensitive-Data Minimization

**Rule**: All proof records, logs, traces, diagnostics, and repair evidence must redact or avoid sensitive user data. Repair evidence must be privacy-safe by design.

**Enforcement**:
- `structuredLogger` PII scrubbing (already implemented: emails, credit card numbers, JWTs) applies to all repair system output.
- Proof records must never store: message content (Orbit), financial account numbers (Wallet), call media/transcripts (Calls), precise GPS coordinates (Radar), passwords/tokens (Auth), phone numbers, or full names.
- Proof records store only: anonymized identifiers (hashed user IDs), aggregate metrics (count, rate, duration), structural metadata (component names, query keys, route paths), and system state (cache size, error codes, subscription status).
- Domain-specific redaction rules:
  - **Orbit**: Message body replaced with `[redacted]`; only message ID, timestamp, delivery status retained.
  - **Wallet**: Transaction amounts replaced with magnitude bucket (`<10`, `10-100`, `100-1000`, `>1000`); account IDs hashed.
  - **Calls**: No media content, no participant names; only call duration, codec, quality metrics.
  - **Radar**: GPS coordinates rounded to city-level precision (2 decimal places) in proof records.
  - **Auth**: No tokens, no passwords, no session secrets; only event type (login/logout/refresh) and outcome (success/failure).
- `sentinel-audit` periodically scans proof records for PII leakage and flags violations.

#### Constraint 11: Domain Activation Sheet Requirement

**Rule**: Before activating any repair engine in any domain, a Domain Activation Sheet must be produced and approved. No domain may receive repair engine coverage without an explicit activation sheet.

**Enforcement**:
- The Domain Activation Sheet must define:
  1. **Active engines**: Which of the 15 repair engines are enabled for this domain.
  2. **Allowed L2 operations**: Exhaustive list of auto-fix actions permitted (e.g., "cache invalidation", "reconnection").
  3. **Required L3 operations**: Actions that require human approval (e.g., "payment retry", "state machine advance").
  4. **Forbidden operations**: Actions that must never be attempted, even at L4 (domain-specific exclusions).
  5. **Kill switches**: Which kill switches gate this domain's repair engines.
  6. **Rollback triggers**: Conditions that trigger automatic rollback for this domain.
  7. **Freeze triggers**: Conditions that freeze all repair activity for this domain.
- Activation sheets are stored as structured data in the engine manifest.
- `EngineOrchestrator.register()` rejects engines for domains without an approved activation sheet.
- Activation sheets are versioned and immutable once approved; updates require a new version.

### 5.2 Safety Constraint Enforcement Summary

| Constraint | Primary Enforcer | Secondary Enforcer | Violation Response |
|---|---|---|---|
| Domain Isolation | DomainBoundaryEnforcer | VerticalIsolationEngine | Engine stop + violation record |
| No Uncontrolled Mutation | repair-proof engine | RollbackEngine | Rollback + incident |
| No Direct DB Writes | PlatformBusEnforcer | Supabase audit wrapper | Block + L4 escalation |
| No Breaking Types | SSOTAuditor | sentinel-invariants | L3 incident |
| No State Machine Violation | FlowIntegrityEngine | sentinel-workflow | Block + violation |
| No Circular Loops | repair-proof engine | AutoFixEngine cooldowns | Quarantine + L4 |
| No Repair Storms | EngineOrchestrator | sentinel-health | Global L1 mode + cooldown |
| No Hidden Side Effects | repair-proof engine | AntiConflictEngine | Rollback + review |
| No Code Rewriting | Repair pattern registry | repair-proof engine | Freeze + L4 escalation |
| Sensitive-Data Minimization | structuredLogger PII scrub | sentinel-audit PII scan | Flag + redact |
| Domain Activation Sheet | Engine manifest | EngineOrchestrator | Registration rejected |

---

## Section 6 — Self-Repair Pipeline

### 6.1 Pipeline Stages

The self-repair pipeline is a 7-stage process that every repair action must traverse. No stage may be skipped.

```
DETECT → CLASSIFY → LOCALIZE → REPAIR → VALIDATE → REGRESS → ACCEPT/ROLLBACK
```

### 6.2 Stage 1: Detect

**Input**: Engine tick execution
**Output**: `DetectionEvent`

```typescript
interface DetectionEvent {
  id: string;                    // Unique detection ID (UUID v4)
  engineId: string;              // Which engine detected it
  domain: string;                // Which domain is affected
  timestamp: number;             // Detection time (epoch ms)
  signal: string;                // What was detected (e.g., "stale_cache", "5xx_response")
  severity: "info" | "warning" | "error" | "critical";
  confidence: number;            // 0.0–1.0, how confident the engine is
  rawData: Record<string, unknown>; // Supporting evidence
}
```

**Decision Point**: If `confidence < 0.5`, the event is logged but no further pipeline stages execute. If `severity === "info"`, pipeline stops after classification (L1 behavior).

**Timeout Gate**: Detection must complete within the engine's tick interval. If detection takes > 80% of the interval, a `detection:slow` warning is emitted.

### 6.3 Stage 2: Classify

**Input**: `DetectionEvent`
**Output**: `ClassifiedIssue`

```typescript
interface ClassifiedIssue {
  detectionId: string;           // Links back to DetectionEvent
  issueType: string;             // Canonical issue type (e.g., "stale_cache", "api_failure")
  issueSignature: string;        // Deduplicated fingerprint for loop detection
  category: ErrorCategory;       // "network" | "auth" | "state" | "render" | "data" | "unknown"
  repairLevel: RepairLevel;      // L1 | L2 | L3 | L4
  isAutoFixable: boolean;        // Based on category and issue type
  affectedComponents: string[];  // Which UI components / stores are affected
  financialMutationImpact: boolean;  // Does this mutate financial state (balances, ledger, settlements)?
  financialDisplayImpact: boolean;   // Does this touch financial display/read-only data?
  securityImpact: boolean;           // Does this touch auth/access?
  estimatedUserImpact: number;   // Estimated number of affected users (0 = internal only)
}

type RepairLevel = "L1" | "L2" | "L3" | "L4";
```

**Decision Point**: If `repairLevel === "L1"`, pipeline stops after classification (detection logged, no repair). If `financialMutationImpact === true` (the issue involves mutation of financial state — balances, ledger entries, settlements, payouts), minimum level is L3 (enforced by Safety Constraint; see Section 12). If `financialDisplayImpact === true` but `financialMutationImpact === false` (the issue involves only read-only/display operations on financial data — cache refresh, UI state reset, display balance re-fetch), L2 is permitted per Section 12.4.

**Reporting**: Classification results are emitted as `repair:classified` events on `platformBus` and recorded by `engineObserver`.

### 6.4 Stage 3: Localize Root Cause

**Input**: `ClassifiedIssue`
**Output**: `RootCauseAnalysis`

```typescript
interface RootCauseAnalysis {
  classifiedIssueId: string;
  rootCause: string;             // Description of the root cause
  rootCauseType: "known" | "probable" | "unknown";
  affectedLayer: "network" | "api" | "cache" | "state" | "render" | "external";
  repairTargets: RepairTarget[]; // Specific targets for repair
  correlatedEvents: string[];    // Related DetectionEvent IDs from other engines
}

interface RepairTarget {
  type: "query_cache" | "local_storage" | "component_state" | "subscription" | "route" | "dom_element";
  identifier: string;            // Query key, storage key, component ID, etc.
  currentValue: unknown;         // Snapshot of current state
  expectedValue?: unknown;       // What it should be (if known)
}
```

**Decision Point**: If `rootCauseType === "unknown"`, the repair level is automatically elevated to L3 minimum (unknown root causes cannot be safely auto-repaired).

**Timeout Gate**: Root cause analysis must complete within 5 seconds. If exceeded, the analysis is marked as "timeout" and the issue is escalated to L3.

### 6.5 Stage 4: Choose Safe Repair Strategy & Apply Bounded Fix

**Input**: `RootCauseAnalysis`
**Output**: `RepairAction`

```typescript
interface RepairAction {
  id: string;                    // Unique repair action ID
  repairChainId: string;         // Links related repairs for loop detection
  rootCauseAnalysisId: string;
  strategy: string;              // Name of the repair strategy applied
  level: RepairLevel;
  scope: RepairScope;
  preMutationSnapshot: Record<string, unknown>;  // State before repair
  mutations: RepairMutation[];
  rollbackPlan: RollbackPlan;
  appliedAt: number;
  appliedBy: string;             // Engine ID that applied the repair
}

interface RepairScope {
  domains: string[];             // Which domains are affected
  stores: string[];              // Which state stores are modified
  cacheKeys: string[];           // Which cache entries are invalidated
  uiComponents: string[];       // Which components are re-rendered
}

interface RepairMutation {
  target: string;                // What is being modified
  operation: "invalidate" | "refresh" | "reset" | "reconnect" | "fallback" | "suppress";
  before: unknown;
  after: unknown;
}

interface RollbackPlan {
  canRollback: boolean;
  rollbackSteps: string[];       // Steps to reverse the repair
  rollbackTimeout: number;       // Max time (ms) before rollback expires
}
```

**Decision Points**:
- If `level === "L3"` or `level === "L4"`, execution pauses here. The `RepairAction` is queued for human review.
- If `scope.domains.length > 1`, the repair is cross-domain and requires L3 minimum.
- If `rollbackPlan.canRollback === false`, the repair requires L4 approval.

**Timeout Gate**: Repair execution must complete within 10 seconds. If exceeded, the repair is aborted and the pre-mutation snapshot is restored.

### 6.6 Stage 5: Validate End-to-End

**Input**: `RepairAction` (post-application)
**Output**: `ValidationResult`

```typescript
interface ValidationResult {
  repairActionId: string;
  checks: ValidationCheck[];
  overallResult: "pass" | "fail" | "partial";
  validatedAt: number;
  duration: number;
}

interface ValidationCheck {
  name: string;                  // What was checked
  result: "pass" | "fail";
  expected: unknown;
  actual: unknown;
  message?: string;
}
```

**Validation Checks**:
1. **Issue Resolution**: The original detection signal is no longer present.
2. **No New Errors**: `ErrorClassifier` reports no new errors since repair.
3. **State Consistency**: Affected stores match expected post-repair state.
4. **UI Stability**: No new DOM anomalies in affected components.
5. **Performance**: No performance degradation (FPS, memory, latency) post-repair.

**Decision Point**: If `overallResult === "fail"`, proceed directly to rollback (Stage 7, reject path). If `overallResult === "partial"`, proceed to regression checks with elevated scrutiny.

**Timeout Gate**: Validation must complete within 15 seconds. If exceeded, the repair is treated as "unvalidated" and held for review.

### 6.7 Stage 6: Run Regression Checks

**Input**: `ValidationResult`
**Output**: `RegressionReport`

```typescript
interface RegressionReport {
  repairActionId: string;
  regressions: RegressionItem[];
  hasRegressions: boolean;
  checkedAt: number;
}

interface RegressionItem {
  type: string;                  // What regressed
  domain: string;                // Which domain is affected
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  relatedRepairId: string;       // The repair that may have caused it
}
```

**Regression Checks**:
1. **Error rate comparison**: Compare error rate in the 30s before repair vs. 30s after.
2. **Cross-domain impact**: Check if unrelated domains show new issues since repair.
3. **Metric stability**: Verify key metrics (latency, success rate, memory) haven't degraded.
4. **Circular repair detection**: Check if the repair's `issueSignature` has appeared before in this `repairChainId`.

**Decision Point**: If `hasRegressions === true` and any regression is `severity >= "high"`, trigger rollback. If only "low"/"medium" regressions, log and proceed to acceptance with a reduced confidence score.

### 6.8 Stage 7: Accept or Rollback

**Accept Path**: If validation passes and no critical regressions, the repair is accepted.

```typescript
interface RepairAcceptance {
  repairActionId: string;
  status: "accepted";
  confidenceScore: number;       // 0.0–1.0, based on validation + regression results
  proof: ProofRecord;            // Full proof record (see Section 8)
  acceptedAt: number;
}
```

**Rollback Path**: If validation fails or critical regressions detected, the repair is rolled back.

```typescript
interface RepairRollback {
  repairActionId: string;
  status: "rolled_back";
  reason: string;
  rollbackSteps: string[];       // What was reversed
  restoredState: Record<string, unknown>;  // State after rollback
  rolledBackAt: number;
}
```

**Post-Rollback**: After rollback, the issue is escalated to the next repair level (L2→L3, L3→L4). The failed repair is recorded in the proof system as a negative signal for future confidence scoring.

### 6.9 Pipeline Observability

Every stage emits structured events to `platformBus`:

| Stage | Event | Payload |
|---|---|---|
| Detect | `repair:pipeline:detected` | `DetectionEvent` |
| Classify | `repair:pipeline:classified` | `ClassifiedIssue` |
| Localize | `repair:pipeline:localized` | `RootCauseAnalysis` |
| Repair | `repair:pipeline:repaired` | `RepairAction` |
| Validate | `repair:pipeline:validated` | `ValidationResult` |
| Regress | `repair:pipeline:regressed` | `RegressionReport` |
| Accept | `repair:pipeline:accepted` | `RepairAcceptance` |
| Rollback | `repair:pipeline:rolledback` | `RepairRollback` |

All events are captured by `engineObserver`, `structured-logger`, and `TraceCorrelationEngine` for full traceability.

---

## Section 7 — Rollback & Containment

### 7.1 Automatic Rollback Rules

Rollback is triggered automatically when any of these conditions are met:

| Condition | Trigger | Rollback Scope |
|---|---|---|
| Validation failure | `ValidationResult.overallResult === "fail"` | Single repair action |
| Critical regression | `RegressionItem.severity === "critical"` | Single repair action + related chain |
| Repair timeout | Repair execution exceeds 10s | Single repair action |
| Circular loop detected | Same `issueSignature` appears > 3x in chain | Entire repair chain |
| Repair storm | > 50 repairs in 60s window | All active repairs (global L1 mode) |
| Engine error rate | Engine error count > 10 in 5 minutes | Stop engine, rollback last action |

### 7.2 Quarantine Mode

When a module, engine, or domain becomes unstable, it enters quarantine:

**Quarantine Triggers**:
- Engine produces > 5 consecutive failed repairs
- Domain health status drops to "unhealthy" (error rate > 20% per `domain-health.ts`)
- Multiple engines in the same domain trigger rollbacks simultaneously
- `RollbackEngine` detects error burst (> 20 error events in 60s)

**Quarantine Behavior**:
1. All repair engines for the quarantined domain drop to L1 (detect-only).
2. The domain is flagged in `domain-health.ts` with status "quarantined".
3. An incident is created via `incident-engine.ts` with appropriate priority.
4. `platformBus` emits `domain:quarantined` event.
5. Quarantine persists until: (a) error rate drops below 5% for 5 minutes, (b) a human explicitly lifts quarantine, or (c) 30-minute auto-recovery check passes.

**Quarantine Escalation**:
- If quarantine persists > 15 minutes, priority is escalated.
- If quarantine persists > 30 minutes, `kill-switches.ts` `emergencyShutdown(domain)` is recommended (L3 approval required).

### 7.3 Kill-Switch Integration

The existing `kill-switches.ts` provides the emergency brake for the repair system:

**Integration Points**:
- Every repair engine checks the relevant kill switch before executing any `act`-level operation.
- Kill switches are organized by domain: `orbit_calls_enabled`, `wallet_payments_enabled`, etc.
- `emergencyShutdown(domain, reason)` disables all features for a domain, logs via `structuredLogger`, and emits `SYSTEM_KILL_SWITCH_TOGGLED` on `platformBus`.
- Kill switches can be toggled by: (a) human operators (always), (b) the repair system at L3+ (with proof record), (c) never at L2 (kill switches are too broad for automatic activation).

**Kill-Switch Decision Matrix**:

| Scenario | Kill-Switch Action | Required Level |
|---|---|---|
| Single feature degradation | Disable specific feature flag | L2 (via feature-flags) |
| Domain-wide instability | Domain kill switch | L3 (requires proof + approval) |
| Cross-domain cascade | Emergency shutdown | L4 (human only) |
| Security breach detected | Immediate domain lockdown | L3 (auto with proof) |
| Financial system instability | Wallet/payment lockdown | L4 (human only) |

### 7.4 Feature-Flag Integration

The existing `feature-flags.ts` provides granular control:

- **Engine-level flags**: `engine-feature-flags.ts` (`isEngineEnabled()`) controls whether each engine runs.
- **Feature-level flags**: `feature-flags.ts` (`isEnabled()`) controls rollout percentage, environment targeting, and user-specific enablement.
- **Repair actions** can toggle feature flags as part of their repair strategy (e.g., disable a broken feature for a subset of users).
- Flag changes made by the repair system are logged in the proof system and can be rolled back.

### 7.5 Repair-Attempt Limits

| Scope | Limit | Window | Consequence |
|---|---|---|---|
| Per issue (same signature) | 3 attempts | 5 minutes | Escalate to next level |
| Per engine | 10 repairs | 5 minutes | Engine quarantine |
| Per domain | 20 repairs | 5 minutes | Domain quarantine |
| Global | 50 repairs | 60 seconds | All engines to L1 + 5-min cooldown |

### 7.6 Freeze Rules for Repeated Failures

**Freeze**: A stronger version of quarantine where the engine is stopped entirely (not just dropped to L1).

| Condition | Freeze Duration | Unfreezing |
|---|---|---|
| 3 consecutive rollbacks | 15 minutes | Automatic after cooldown |
| 5 consecutive rollbacks | 1 hour | Automatic after cooldown |
| 10 consecutive rollbacks | Indefinite | Human intervention required |
| Circular loop (3+ iterations) | Indefinite | Human investigation required |
| Safety constraint violation | Indefinite | Post-mortem + fix required |

---

## Section 8 — Proof System

### 8.1 Proof Record Schema

Every repair action, whether accepted or rolled back, produces a structured proof record:

```typescript
interface ProofRecord {
  // Identity
  id: string;                           // Unique proof ID (UUID v4)
  repairActionId: string;               // Links to RepairAction
  repairChainId: string;                // Links related repairs

  // What was broken
  detection: {
    engineId: string;
    domain: string;
    signal: string;
    severity: string;
    confidence: number;
    detectedAt: number;
    rawEvidence: Record<string, unknown>;
  };

  // Why it was broken
  rootCause: {
    type: "known" | "probable" | "unknown";
    description: string;
    affectedLayer: string;
    correlatedEvents: string[];
  };

  // What was classified
  classification: {
    issueType: string;
    issueSignature: string;
    category: string;
    repairLevel: string;
    financialImpact: boolean;
    securityImpact: boolean;
  };

  // What changed
  repair: {
    strategy: string;
    level: string;
    scope: {
      domains: string[];
      stores: string[];
      cacheKeys: string[];
      uiComponents: string[];
    };
    mutations: Array<{
      target: string;
      operation: string;
      before: unknown;
      after: unknown;
    }>;
    appliedAt: number;
    appliedBy: string;
    duration: number;
  };

  // What validation passed
  validation: {
    checks: Array<{
      name: string;
      result: "pass" | "fail";
      expected: unknown;
      actual: unknown;
    }>;
    overallResult: "pass" | "fail" | "partial";
    validatedAt: number;
  };

  // What regression checks passed
  regression: {
    regressions: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    hasRegressions: boolean;
    checkedAt: number;
  };

  // Final outcome
  outcome: {
    status: "accepted" | "rolled_back" | "escalated" | "expired" | "detected_only";
    confidenceScore: number;
    rollbackReason?: string;
    escalationTarget?: string;
    resolvedAt: number;
  };

  // Metadata
  metadata: {
    engineVersion: string;
    pipelineVersion: string;
    environment: string;
    sessionId: string;
    userId?: string;
    traceId: string;
  };
}
```

### 8.2 Storage

**Primary Storage**: Proof records are stored in-memory in a bounded circular buffer (max 1,000 records) for immediate queryability during the session.

**Persistent Storage**: Proof records are persisted to:
1. **Local Storage**: Last 100 records for cross-session continuity (key: `el-repair-proofs`).
2. **Structured Logger**: Every proof record is logged via `structuredLogger.log("repair", "info", ...)` for Sentry forwarding.
3. **Supabase (future)**: When the system graduates to Phase 3+, proof records are written to a dedicated `repair_proofs` table via Edge Function (never direct DB write from client).

### 8.3 Retention

| Storage Layer | Retention | Capacity |
|---|---|---|
| In-memory buffer | Current session | 1,000 records |
| Local Storage | 7 days (auto-pruned by age) | 100 records |
| Structured Logger / Sentry | Per Sentry retention policy | Unlimited |
| Supabase (future) | 90 days (auto-archived) | Unlimited |

### 8.4 Queryability

Proof records support the following queries:

- **By engine**: All proofs generated by a specific engine.
- **By domain**: All proofs affecting a specific domain.
- **By outcome**: Filter by accepted/rolled_back/escalated.
- **By time range**: Proofs within a time window.
- **By repair chain**: All proofs in a repair chain (for loop analysis).
- **By confidence score**: Proofs below a confidence threshold (for review).
- **By issue signature**: All proofs for the same recurring issue (for pattern analysis).

### 8.5 Proof Integrity

- Every proof record includes a `traceId` that links to the `TraceCorrelationEngine` trace.
- Proof records are immutable once created. Updates create new linked records.
- The `sentinel-audit` engine periodically validates proof record integrity and completeness.

---

## Section 9 — Observability

### 9.1 Structured Logging Integration

All repair system logs flow through `structured-logger.ts`:

- **Domain**: `"repair"` prefix for all repair system logs.
- **PII Scrubbing**: Automatic redaction of emails, credit card numbers, and JWTs (already implemented in structured-logger).
- **Log Levels**:
  - `debug`: Tick execution details, detection signals below threshold.
  - `info`: Successful repairs, pipeline stage completions.
  - `warn`: Partial validations, low-severity regressions, quarantine entries.
  - `error`: Failed repairs, rollbacks, safety constraint violations.
  - `critical`: Repair storms, circular loops, financial safety violations.

### 9.2 Metrics

| Metric | Description | Source |
|---|---|---|
| `repair.detection.count` | Number of issues detected per engine per tick | `engineObserver.recordTick()` |
| `repair.detection.confidence.avg` | Average detection confidence score | Repair pipeline Stage 1 |
| `repair.classification.distribution` | Count by issue type and category | Repair pipeline Stage 2 |
| `repair.repair.count` | Number of repairs attempted | Repair pipeline Stage 4 |
| `repair.repair.success_rate` | Percentage of repairs accepted (not rolled back) | Proof system |
| `repair.repair.false_positive_rate` | Detections that turned out to be non-issues | Proof system |
| `repair.rollback.count` | Number of rollbacks triggered | Repair pipeline Stage 7 |
| `repair.mttd` | Mean Time to Detect (detection timestamp - issue onset) | Proof system |
| `repair.mttr` | Mean Time to Repair (resolution timestamp - detection timestamp) | Proof system |
| `repair.confidence.per_engine` | Per-engine confidence score (rolling average) | Proof system |
| `repair.storm.count` | Number of repair storm events | Safety Constraint 7 |
| `repair.loop.count` | Number of circular loop events | Safety Constraint 6 |
| `repair.quarantine.active` | Number of domains/engines currently quarantined | Quarantine system |
| `repair.level.distribution` | Count of repairs by level (L1/L2/L3/L4) | Classification |
| `repair.graduation.stage` | Current graduation stage per engine | Graduation model |

### 9.3 Traces

Integration with `TraceCorrelationEngine` (`src/engines/observability/trace-correlation-engine.ts`):

- Every repair pipeline execution gets a unique `traceId`.
- All `platformBus` events emitted during a repair carry this `traceId`.
- Traces link: detection event → classification → root cause → repair → validation → regression → outcome.
- "High-cardinality" trace detection (existing feature) identifies repairs that generate excessive events.

### 9.4 Engine Run Logs

The `EngineObserver` (`src/engines/core/engine-observer.ts`) already captures:

- **Per-engine metrics**: tick count, error count, total findings, total actions, average duration.
- **Logs**: 500-entry rolling buffer with timestamp, engine ID, category, level, message.
- **Error history**: 100-entry rolling buffer with timestamp, engine ID, and error details.
- **Reports**: `getReport()` provides a complete snapshot of all engine metrics and recent logs.

### 9.5 Failure Counters

| Counter | Scope | Threshold | Action |
|---|---|---|---|
| Engine tick failures | Per engine | 10 in 5 min | Engine freeze |
| Repair failures | Per engine | 5 consecutive | Engine quarantine |
| Rollback count | Per domain | 5 in 15 min | Domain quarantine |
| Safety violations | Global | 1 (any) | Immediate escalation |
| Storm events | Global | 1 | Global L1 + cooldown |

### 9.6 Dashboard Requirements

The repair system dashboard must display:

1. **System Health Overview**: Composite health score, active engines, quarantined domains, current graduation stage.
2. **Real-Time Pipeline View**: Active repairs in progress, current stage, time-in-stage.
3. **Repair History**: Chronological list of recent repairs with outcome (accepted/rolled_back), filterable by domain, engine, level.
4. **Confidence Trends**: Per-engine confidence score over time (line chart).
5. **Metrics Panel**: MTTD, MTTR, success rate, false-positive rate, rollback rate.
6. **Domain Health Matrix**: Heat map of domain health status with active engine count.
7. **Safety Alerts**: Active quarantines, recent safety violations, repair storm history.
8. **Proof Inspector**: Drill-down into individual proof records with full pipeline trace.
9. **Graduation Progress**: Per-engine graduation stage with criteria completion percentage.
10. **Kill-Switch Status**: Current state of all kill switches and feature flags.

Data for dashboards is sourced from `engineObserver.getReport()`, the proof system query interface, and `domain-health.ts` `getPlatformHealthStatus()`.

---

## Section 10 — World-Class Standard

### 10.1 Modularity (BaseEngine Inheritance)

Every repair engine extends `BaseEngine`, ensuring:

- **Uniform interface**: All engines implement `tick(): Promise<EngineTickResult>` with a consistent return shape (`level`, `findings`, `actions`, `duration`).
- **Plug-and-play registration**: New engines are added via `engineOrchestrator.register(engine)` with zero changes to existing engines.
- **Category organization**: Engines are grouped by category (`self-healing`, `governance`, `quality`, `performance`, `wallet`, `calls`, etc.), enabling category-level queries and controls.
- **Independent lifecycle**: Each engine starts/stops independently, can be toggled via feature flags, and reports its own metrics.

### 10.2 Scalability (Engine Registration / Deregistration)

- **Tiered loading**: The existing 3-tier system (Core → Specialized → Quality) ensures critical engines load first, with non-essential engines loaded asynchronously.
- **Dynamic registration**: Engines can be registered/deregistered at runtime via `engineOrchestrator.register()` / engine `stop()`.
- **Resource-aware scheduling**: Engine tick intervals are staggered (initial random delay of 2–5 seconds per engine in `BaseEngine.start()`) to prevent thundering-herd problems.
- **Memory-bounded**: All engines implement internal buffer limits (typically 200–500 entries) to prevent unbounded growth.
- **Lazy evaluation**: Engines that detect zero findings in consecutive ticks can be promoted to a "low-frequency" mode (extended tick interval) to reduce overhead.

### 10.3 Conflict Freedom (sentinel-conflict-engine)

- **Sentinel Conflict Engine** (`src/core/sentinel/conflict/sentinel-conflict-engine.ts`) detects when multiple engines attempt to repair the same issue simultaneously.
- **Resolution strategy**: First-writer-wins — the first engine to register a repair action for a given `issueSignature` owns it. Other engines' actions for the same signature are suppressed.
- **Cross-engine coordination**: The `AntiConflictEngine` (governance) aggregates violations and detects "architectural debt" patterns.
- **Distributed lock simulation**: For critical repairs, a lightweight lock mechanism (repair action registration in the proof system) prevents concurrent execution.

### 10.4 Provider Agnosticism

- The repair system does not depend on specific cloud providers, APM vendors, or logging services.
- All external integrations go through abstraction layers:
  - Logging: `structured-logger.ts` (wraps console + Sentry).
  - Events: `platform-bus.ts` (wraps EventEmitter pattern).
  - Storage: Supabase client (abstracted via service layer).
  - Metrics: `engine-observer.ts` (in-memory, exportable).
- Swapping Sentry for DataDog, or Supabase for Firebase, requires changes only in the abstraction layer.

### 10.5 Global Production Suitability

- **Performance overhead**: All engines run in the main browser thread with async execution. Tick intervals are chosen to keep CPU overhead < 1% of total browser compute.
- **Network overhead**: No additional network requests are made by the repair system for detection (uses existing performance APIs, DOM queries, and in-memory state). Network requests are only made for L3+ escalations.
- **Error resilience**: Every engine tick is wrapped in try/catch (in `BaseEngine.executeTick()`). Engine failures do not crash the application.
- **Graceful degradation**: If the repair system itself fails, the application continues to function normally. The repair system is purely additive.
- **Internationalization**: The repair system operates on data structures, not user-facing strings. No i18n impact.
- **Multi-tenant**: Domain isolation ensures repairs in one vertical do not affect others, supporting multi-tenant deployments.

---

## Section 11 — Implementation Roadmap

### Phase 1: Harden Existing Engines + Safety Model (Weeks 1–4)

**Objective**: Solidify the foundation before adding new repair capabilities.

**Tasks**:
1. Audit all existing engines for safety constraint compliance (8 constraints).
2. Add repair-attempt limits and cooldown enforcement to `EngineOrchestrator`.
3. Implement global repair counter (Constraint 7: no repair storms).
4. Implement `repairChainId` tracking for circular loop detection (Constraint 6).
5. Add quarantine mode to `domain-health.ts`.
6. Harden `engine-feature-flags.ts` to support default-OFF for new engines.
7. Integrate `kill-switches.ts` checks into `BaseEngine.executeTick()`.
8. Validate that all existing engines declare `domain` scope.

**Dependencies**: None (foundation work).
**Stabilization criteria**: All 8 safety constraints enforceable; existing engines pass audit; no regressions in current functionality.

### Phase 2: Repair Pipeline + Proof System (Weeks 5–10)

**Objective**: Implement the full 7-stage repair pipeline and proof system.

**Tasks**:
1. Define all pipeline data structures (DetectionEvent, ClassifiedIssue, RootCauseAnalysis, RepairAction, ValidationResult, RegressionReport, ProofRecord).
2. Implement pipeline orchestrator that enforces stage ordering and timeout gates.
3. Implement proof record storage (in-memory buffer + localStorage persistence).
4. Implement proof record query interface.
5. Add pipeline event emission to `platformBus`.
6. Connect existing `ErrorClassifier`, `RootCauseEngine`, and `RollbackEngine` to pipeline stages.
7. Implement post-repair validation checks.
8. Implement regression detection.

**Dependencies**: Phase 1 complete (safety model enforced).
**Stabilization criteria**: Pipeline processes at least 100 detection events end-to-end without crashes; proof records are queryable; rollback triggers correctly on validation failure.

### Phase 3: Domain-Specific Repair Rules (Weeks 11–16)

**Objective**: Configure repair rules for each of the 10+ domains.

**Tasks**:
1. Define repair rule registry (per-domain, per-issue-type rules).
2. Implement domain-specific repair rules for Orbit (messaging integrity).
3. Implement domain-specific repair rules for Wallet (financial safety, L3/L4 locks).
4. Implement domain-specific repair rules for Radar (location/navigation).
5. Implement domain-specific repair rules for Dashboard, Marketplace, Property.
6. Implement domain-specific repair rules for Travel, Notifications, Calls, Auth.
7. Connect domain repair rules to the Sentinel domain-specific engines.
8. Validate domain isolation (no cross-domain side effects).

**Dependencies**: Phase 2 complete (pipeline operational).
**Stabilization criteria**: Each domain has >= 5 repair rules defined; domain isolation validated; financial safety constraints verified for Wallet.

### Phase 4: Observability Dashboards + Confidence Tuning (Weeks 17–22)

**Objective**: Make the repair system fully observable and begin confidence calibration.

**Tasks**:
1. Implement repair system dashboard (10 panels defined in Section 9.6).
2. Implement per-engine confidence scoring based on proof record history.
3. Implement MTTD and MTTR tracking.
4. Implement false-positive rate calculation.
5. Integrate with `TraceCorrelationEngine` for full pipeline tracing.
6. Add repair system metrics to `ObservabilityEngine`.
7. Tune detection thresholds based on initial data (reduce false positives).
8. Implement alerting for safety violations and quarantine events.

**Dependencies**: Phase 3 complete (repair rules generating proof data).
**Stabilization criteria**: Dashboard displays accurate real-time data; confidence scores converge; false-positive rate < 10%.

### Phase 5: Full Autonomy Graduation (Weeks 23–30)

**Objective**: Graduate engines through the autonomy model based on proven safety.

**Tasks**:
1. Implement the 5-stage graduation model (Section 13).
2. Define measurable graduation criteria per engine.
3. Graduate well-performing L1 engines to L2 (safe auto-fix).
4. Monitor L2 engines for 2 weeks with zero-regression requirement.
5. Evaluate L2 engines for L3 graduation (supervised repair).
6. Implement human approval workflow for L3 repairs.
7. Begin limited-domain L4 autonomy for engines with sustained safety records.
8. Document graduation decisions in proof system with sign-off records.

**Dependencies**: Phase 4 complete (confidence data available).
**Stabilization criteria**: At least 5 engines at Stage 2+; zero safety violations during graduation; financial engines remain at L3/L4.

### Phase Dependency Graph

```
Phase 1 (Foundation)
    ↓
Phase 2 (Pipeline + Proof)
    ↓
Phase 3 (Domain Rules)
    ↓
Phase 4 (Observability)
    ↓
Phase 5 (Graduation)
```

### What Must Be Stabilized First
1. Safety constraints (Phase 1) — non-negotiable foundation.
2. Rollback mechanism — must work before any repair is attempted.
3. Proof system — must be in place before any repair is accepted.
4. Kill-switch integration — emergency brake must be functional.

### What Can Be Automated First
1. Cache invalidation (stale queries, expired localStorage).
2. WebSocket reconnection.
3. Offline recovery sync.
4. Broken image fallback.
5. Token auto-refresh.

### What Must Remain Supervised Longer
1. All financial operations (wallet, payments, settlements).
2. Cross-domain repairs.
3. State machine transitions for business flows.
4. Kill-switch activations.
5. Data schema changes.

---

## Section 12 — Core Financial Safety

### 12.1 Fundamental Principle

**No autonomous engine may perform final mutation of wallet balances, ledger truth, payment settlement, or fraud resolution.** Financial integrity always overrides automation speed.

### 12.2 Permanently L4 Operations (Human Approval Required)

These operations can never graduate below L4 regardless of engine confidence or track record:

| Operation | Reason | Existing Engine Reference |
|---|---|---|
| **Balance adjustments** | Direct mutation of user funds | `reconciliation-engine.ts` |
| **Settlement finalization** | Legal/financial finality, irreversible | `payout-safety-engine.ts` |
| **Fraud case resolution** | Legal/compliance requirement, liability | `fraud-watch-engine.ts` |
| **Ledger truth correction** | Source-of-truth for financial audit | `ledger-integrity-engine.ts` |
| **Payout release** | Irreversible transfer of funds | `payout-safety-engine.ts` |
| **Refund processing** | Financial commitment on behalf of business | `reconciliation-engine.ts` |
| **Currency conversion execution** | FX rate risk, irreversible | `fx-consistency-engine.ts` |

### 12.3 L3-Eligible Operations (With Proof History)

These operations may graduate from L4 to L3 (supervised with proof) after demonstrating safety:

| Operation | Graduation Criteria | Existing Engine Reference |
|---|---|---|
| **Transaction retry (idempotent)** | 50+ successful proofs, idempotency key verified, zero duplicate transactions | `ledger-integrity-engine.ts` |
| **Payment method disabling** | 30+ correct fraud signals, zero false positives in last 100 detections | `fraud-watch-engine.ts` |
| **Stuck transaction flagging** | 100+ correct detections, zero false escalations | `wallet-quality-engine.ts` |
| **Payout queue monitoring** | 50+ correct stuck-payout detections | `payout-safety-engine.ts` |

### 12.4 L2-Eligible Peripheral Financial Operations

These operations touch financial data peripherally but do not mutate financial truth:

| Operation | Level | Justification |
|---|---|---|
| **Stale cache refresh of display balances** | L2 | Read-only refresh; does not change actual balance |
| **Retry of idempotent read queries** (balance fetch, transaction history) | L2 | GET requests, no mutation |
| **FX rate display refresh** | L2 | Cosmetic; does not affect actual conversion rates |
| **Payment UI state reset** (loading spinner, button state) | L2 | UI-only; no financial impact |
| **Transaction history pagination refresh** | L2 | Read-only data re-fetch |

### 12.5 Financial Safety Enforcement

**Implementation in Repair Pipeline**:
1. Stage 2 (Classify): If `financialMutationImpact === true`, minimum `repairLevel` is set to `L3`. If only `financialDisplayImpact === true` (read-only/display operations), `L2` is permitted per Section 12.4.
2. Stage 4 (Repair): Financial repairs require additional validation: (a) idempotency check, (b) amount verification, (c) audit trail creation.
3. Stage 7 (Accept/Rollback): Financial repairs require explicit human sign-off for acceptance. Automatic acceptance is disabled for financial repairs.

**Cross-Reference with Existing Engines**:
- `ReconciliationEngine`: Monitors balance display consistency. Currently L1 (detect). Can graduate to L2 for display-only refresh.
- `LedgerIntegrityEngine`: Monitors transaction integrity. Permanently L1 (detect) for mutations; L2 for read-only reconciliation queries.
- `FraudWatchEngine`: Monitors transfer patterns. L1 (detect) for flagging. L3 for automated response (e.g., temporary hold). L4 for resolution.
- `PayoutSafetyEngine`: Monitors payout queue health. L1 (detect) for stuck payouts. L4 for any payout-affecting action.
- `FXConsistencyEngine`: Monitors currency display consistency. L2 for display refresh. L4 for rate application.

### 12.6 Financial Audit Trail

Every financial-domain detection and repair produces an enhanced proof record with:
- Transaction IDs affected
- Balance before/after (display values only; actual values from server)
- Currency and amounts involved
- Idempotency keys used
- Time-stamped audit trail
- Regulatory compliance tags (GDPR, PCI-DSS considerations)

---

## Section 13 — Autonomy Graduation Model

### 13.1 Core Principle

**No engine begins at full-production autonomy.** Every engine starts at Stage 1 (detect-only) and must earn higher autonomy through demonstrated safety, accuracy, and reliability.

### 13.2 Five Graduation Stages

#### Stage 1: Detect-Only

**Description**: Engine runs, detects issues, logs everything. Zero mutations to application state.

**Behavior**:
- `EngineTickResult.level` restricted to `"observe"` or `"detect"`.
- All findings are logged to `engineObserver` and `structured-logger`.
- Proof records are created for detections but with `outcome.status = "detected_only"`.
- No repair pipeline stages beyond Classify are executed.

**Graduation Criteria to Stage 2**:

| Criterion | Threshold |
|---|---|
| Minimum successful detection cycles | 500 ticks |
| Zero false-positive rate | < 5% (verified by human review of sample) |
| Minimum time at Stage 1 | 7 days |
| Detection consistency | < 10% variance in finding count between cycles |
| Required sign-off | Engineering team lead |

#### Stage 2: Safe Bounded Auto-Fix

**Description**: Engine performs only idempotent, reversible, non-financial fixes automatically.

**Behavior**:
- `EngineTickResult.level` can reach `"act"` for approved repair patterns only.
- Only repairs from the approved repair pattern registry are allowed.
- All repairs produce full proof records with pre/post snapshots.
- Rollback is automatic on any validation failure.
- Financial-domain engines cannot reach Stage 2 for mutation operations.

**Graduation Criteria to Stage 3**:

| Criterion | Threshold |
|---|---|
| Minimum proof-verified repairs | 100 successful repairs |
| Repair success rate | > 98% (accepted / total attempted) |
| Zero false-positive rate | < 2% |
| Zero regressions introduced | 0 critical/high regressions |
| Minimum time at Stage 2 | 14 days |
| Rollback rate | < 5% |
| Required sign-off | Engineering team lead + domain owner |

#### Stage 3: Supervised Repair with Proof

**Description**: Engine proposes repairs with full proof records. Human reviews and approves before application.

**Behavior**:
- `EngineTickResult.level` can reach `"propose"` for complex repairs.
- Repair actions are queued for human review with full proof context.
- Human approves, modifies, or rejects the proposed repair.
- Approved repairs execute through the full pipeline with validation.
- Rejection feedback is incorporated into classification models.

**Graduation Criteria to Stage 4**:

| Criterion | Threshold |
|---|---|
| Minimum supervised repairs | 200 proposals |
| Human approval rate | > 90% (proposals approved without modification) |
| Zero false-positive rate | < 1% |
| Zero regressions from approved repairs | 0 critical/high regressions |
| Minimum time at Stage 3 | 30 days |
| Confidence score average | > 0.9 |
| Required sign-off | Engineering lead + product owner + security review |

#### Stage 4: Limited-Domain Autonomy

**Description**: Engine operates autonomously within a single non-critical domain after repeated proof of safety.

**Behavior**:
- Engine runs fully autonomously for its registered domain.
- All repairs proceed through the full pipeline without human approval.
- Enhanced monitoring: any anomaly triggers automatic downgrade to Stage 3.
- Cross-domain operations still require Stage 3 (human approval).
- Financial domains cannot reach Stage 4 for mutation operations.

**Graduation Criteria to Stage 5**:

| Criterion | Threshold |
|---|---|
| Minimum autonomous repairs in domain | 500 successful repairs |
| Sustained zero-regression track record | 0 regressions for 60 consecutive days |
| Confidence score average | > 0.95 |
| Domain health impact | Measurable improvement in domain health metrics |
| Zero safety constraint violations | 0 violations |
| Minimum time at Stage 4 | 60 days |
| Required sign-off | VP Engineering + domain owner + security team |

#### Stage 5: Broader Autonomy

**Description**: Engine operates autonomously across multiple non-critical domains after sustained zero-regression track record.

**Behavior**:
- Engine can perform cross-domain repairs within its competency.
- Enhanced proof requirements for cross-domain actions.
- Any regression triggers immediate downgrade to Stage 4 for affected domain.
- Financial domains remain excluded from autonomous mutation.
- Continuous monitoring with anomaly-triggered circuit breakers.

**Entry Criteria**:

| Criterion | Threshold |
|---|---|
| Minimum time at Stage 4 in primary domain | 60 days |
| Minimum time at Stage 4 in target domain | 30 days |
| Cross-domain regression track record | 0 regressions across both domains |
| Confidence score in both domains | > 0.95 |
| Required sign-off | VP Engineering + all domain owners + security + legal (for regulated domains) |

### 13.3 Demotion Rules

Engines can be demoted at any time based on:

| Trigger | Demotion |
|---|---|
| 1 critical regression | Immediate demotion to Stage 1 |
| 3 high regressions in 7 days | Demotion by 1 stage |
| Safety constraint violation | Immediate demotion to Stage 1 + freeze |
| False-positive rate exceeds threshold | Demotion by 1 stage |
| Rollback rate exceeds 10% in 24 hours | Demotion by 1 stage |
| Domain health degrades during engine operation | Demotion by 1 stage |

### 13.4 Graduation Record

Every graduation event produces a record:

```typescript
interface GraduationRecord {
  engineId: string;
  fromStage: number;
  toStage: number;
  direction: "promotion" | "demotion";
  criteria: Record<string, { required: string; actual: string; met: boolean }>;
  approvedBy: string[];
  effectiveAt: number;
  reason: string;
  proofReferences: string[];    // IDs of proof records supporting the decision
}
```

---

## Section 14 — No Hidden Live Expansion

### 14.1 Core Principle

**Every new repair capability must be flag-gated, kill-switch protected, observable, and explicitly listed before activation.** No silent domain expansion is permitted.

### 14.2 Engine Activation Checklist

Before any new repair engine or repair capability goes live, all of the following must be completed:

| # | Requirement | Enforcement | Verification |
|---|---|---|---|
| 1 | **Engine Registry Entry** | Engine must be registered in `engine-registry.ts` with correct tier, category, and metadata | Automated: `EngineOrchestrator.register()` rejects unregistered engines |
| 2 | **Dedicated Feature Flag (default OFF)** | Engine must have a feature flag in `engine-feature-flags.ts` defaulting to `false` | Automated: `isEngineEnabled()` returns `false` for unknown engines (to be updated from current fail-open to fail-closed) |
| 3 | **Dedicated Kill Switch** | Engine must have a kill switch in `kill-switches.ts` that can immediately disable it | Manual: reviewed during activation checklist |
| 4 | **Observability Instrumentation** | Engine must emit structured logs via `engineObserver.log()` and `structured-logger` for every tick, finding, and action | Automated: `BaseEngine.executeTick()` records all ticks |
| 5 | **Explicit Domain Opt-In** | Engine must declare which domains it operates in; domains must explicitly opt-in to new engines | Manual: domain-engine activation matrix (Section 3.1) |
| 6 | **Repair Level Declaration** | Engine must declare its maximum repair level (L1/L2/L3/L4) | Code review: verified during PR review |
| 7 | **Safety Constraint Compliance** | Engine must pass all 8 safety constraint checks (Section 5) | Automated: sentinel-audit validation |
| 8 | **Proof System Integration** | Engine must produce proof records for all actions at L2+ | Automated: pipeline enforces proof creation |
| 9 | **Rollback Plan** | Engine must define a rollback plan for every repair action | Code review: verified during PR review |
| 10 | **Graduation Stage Assignment** | Engine must start at Stage 1 (detect-only) | Automated: graduation model enforces initial stage |

### 14.3 Activation Protocol

```
1. Engineer creates engine extending BaseEngine
2. Engine registered in engine-registry.ts (Tier 3 initially)
3. Feature flag created in engine-feature-flags.ts (default: OFF)
4. Kill switch created in kill-switches.ts
5. Engine added to domain-engine matrix with explicit domain opt-in
6. Code review verifies: safety constraints, repair level, rollback plan
7. Engine deployed with flag OFF
8. Flag enabled for development environment only
9. Stage 1 validation: 500 ticks, <5% false positive, 7 days
10. Flag enabled for staging environment
11. Staging validation: same criteria as Step 9
12. Flag enabled for production (1% rollout)
13. Gradual rollout: 1% → 10% → 50% → 100%
14. Each rollout stage: minimum 24 hours, zero regressions
15. Full production at Stage 1 (detect-only)
16. Graduation begins per Section 13 criteria
```

### 14.4 Audit Trail Requirements

Every engine activation produces an audit record:

```typescript
interface EngineActivationAudit {
  engineId: string;
  activatedAt: number;
  activatedBy: string;
  checklist: Record<string, { completed: boolean; verifiedBy: string; verifiedAt: number }>;
  featureFlagId: string;
  killSwitchId: string;
  domains: string[];
  maxRepairLevel: string;
  initialStage: number;
  rolloutPercentage: number;
  approvals: string[];
}
```

### 14.5 Silent Expansion Prevention

**Technical Enforcement**:
1. **Engine manifest**: A static manifest file lists all authorized engines. `EngineOrchestrator.register()` rejects engines not in the manifest.
2. **Domain manifest**: Each domain has a static list of authorized engine IDs. Engines cannot operate in domains they're not authorized for.
3. **Runtime auditing**: `sentinel-audit` periodically compares running engines against the manifest and flags discrepancies.
4. **Feature flag fail-closed**: Update `engine-feature-flags.ts` so `isEngineEnabled()` returns `false` (not `true`) for unknown engine IDs. This prevents new engines from running without explicit opt-in.
5. **Deployment gate**: CI/CD pipeline validates that every engine in the codebase has a corresponding manifest entry, feature flag, and kill switch.

### 14.6 Existing Integration Points

- **`engine-feature-flags.ts`**: Currently uses `isEngineEnabled()` which returns `true` for unknown engines (fail-open). Must be updated to fail-closed for new engines while maintaining backward compatibility for existing engines.
- **`kill-switches.ts`**: Supports per-feature and per-domain switches. The `emergencyShutdown()` function can disable all engines for a domain.
- **`structured-logger.ts`**: Already instruments all engine operations via `engineObserver.log()` integration.
- **`engine-registry.ts`**: Already organizes engines by tier. Can be extended with a manifest validation step.

---

## Section 15 — Final Output Compilation

### 15.1 Architecture Overview

The Autonomous Self-Repair Engine System is a comprehensive, safety-first architecture that transforms the existing 100+ engine ecosystem into a unified, production-grade repair system. It builds on the foundational `BaseEngine` / `EngineOrchestrator` framework and integrates with `Sentinel` (invariants, health, healing), `Omega` (decision, prediction, improvement), the control plane (kill-switches, feature-flags, incidents, domain-health), and the observability stack (structured-logger, sentry, trace-correlation).

The system operates a continuous detect→classify→localize→repair→validate→regress→accept/rollback pipeline across 10+ application domains, with strict safety guarantees preventing uncontrolled mutations, circular loops, repair storms, and hidden side effects.

### 15.2 Engine Inventory Table

| # | Engine | Category | Interval | Max Level | Existing Mapping |
|---|---|---|---|---|---|
| 1 | Health Monitor | Health | 15s | L2 | RuntimeHealthEngine, PerfAnalyzer, sentinel-health |
| 2 | Error Detection | Error | 30s | L2 | ErrorClassifier, SilentRecoveryService, ErrorHeatmapEngine |
| 3 | Dead-Action Detection | UX | 60s | L1 | DeadFlowEngine, ActionWiringEngine, UXFrictionEngine |
| 4 | Loading-State Verification | UX | 20s | L2 | SilentRecoveryService, FlowClosureEngine |
| 5 | Navigation Repair | Navigation | 30s | L2 | RoutingQualityEngine, FlowClosureEngine |
| 6 | Data Consistency | Data | 45s | L2/L3 | ReconciliationEngine, SyncRepairEngine, DuplicateShadowEngine |
| 7 | SSOT Validation | Architecture | 60s | L1 | SSOTAuditor, DomainBoundaryEnforcer, sentinel-invariants |
| 8 | API Retry Control | Network | 15s | L2/L3 | NetworkLatencyEngine, RetryReplayEngine, AutoFixEngine |
| 9 | Realtime Sync | Realtime | 15s | L2/L3 | PresenceHealthEngine, SyncRepairEngine, ReconnectEngine |
| 10 | State Machine Integrity | Business | 30s | L3 | FlowIntegrityEngine, FlowClosureEngine, sentinel-workflow |
| 11 | UI Regression | UI | 60s | L1 | DesignRegressionEngine, LayoutConsistencyEngine |
| 12 | Performance | Performance | 30s | L2 | PerfAnalyzer, CachePolicyEngine, NetworkLatencyEngine |
| 13 | Fallback/Resilience | Resilience | 30s | L2 | AutoFixEngine, AutoRemediationEngine, RollbackEngine |
| 14 | Controlled Auto-Fix | Self-Healing | 45s | L2 | AutoFixEngine, AutoRemediationEngine, SafeRemediationEngine |
| 15 | Proof & Regression | Validation | 30s | L1 | RootCauseEngine, TraceCorrelationEngine, sentinel-audit |

### 15.3 Safety Model Summary

Eight constraints with enforcement mechanisms:
1. **Domain Isolation** — DomainBoundaryEnforcer + VerticalIsolationEngine
2. **No Uncontrolled Mutation** — Proof system + RollbackEngine
3. **No Direct DB Writes** — PlatformBusEnforcer + audit wrapper
4. **No Breaking Types** — SSOTAuditor + sentinel-invariants
5. **No State Machine Violations** — FlowIntegrityEngine + sentinel-workflow
6. **No Circular Loops** — repairChainId tracking + 3-iteration limit
7. **No Repair Storms** — Global rate limiter (50/60s) + automatic L1 fallback
8. **No Hidden Side Effects** — Scope declaration + post-repair validation

### 15.4 Core Financial Safety Guarantees

- **Permanently L4**: Balance adjustments, settlement finalization, fraud resolution, ledger corrections, payout release, refund processing, currency conversion execution.
- **L3 with proof**: Idempotent transaction retry, payment method disabling, stuck transaction flagging, payout queue monitoring.
- **L2 peripheral**: Display balance cache refresh, read-only query retry, FX rate display refresh, payment UI state reset.
- **Enforced at**: Pipeline Stage 2 (classification), Stage 4 (repair), Stage 7 (acceptance).

### 15.5 Autonomy Graduation Criteria Table

| Stage | Name | Key Criteria | Min Time | Required Sign-off |
|---|---|---|---|---|
| 1 | Detect-Only | 500 ticks, <5% FP, consistency | 7 days | Eng lead |
| 2 | Safe Bounded Fix | 100 repairs, >98% success, <2% FP, 0 regressions | 14 days | Eng lead + domain owner |
| 3 | Supervised Repair | 200 proposals, >90% approval, <1% FP, 0 regressions | 30 days | Eng lead + product + security |
| 4 | Limited-Domain | 500 repairs, 0 regressions for 60d, >0.95 confidence | 60 days | VP Eng + domain + security |
| 5 | Broader Autonomy | Cross-domain track record, >0.95 confidence in all domains | 60 days per domain | VP Eng + all owners + legal |

### 15.6 Activation Checklist

| # | Item | Default | Verification |
|---|---|---|---|
| 1 | Engine in registry | Required | Automated (register rejection) |
| 2 | Feature flag (OFF) | OFF | Automated (fail-closed) |
| 3 | Kill switch | Required | Manual review |
| 4 | Observability | Required | Automated (BaseEngine) |
| 5 | Domain opt-in | Required | Manual (matrix) |
| 6 | Repair level declared | Required | Code review |
| 7 | Safety compliance | Required | Automated (sentinel-audit) |
| 8 | Proof integration | Required | Automated (pipeline) |
| 9 | Rollback plan | Required | Code review |
| 10 | Stage 1 start | Required | Automated (graduation) |

### 15.7 Repair-Level Matrix Summary

- **L1 (Detect Only)**: Dead buttons, UI regression, SSOT violations, DOM anomalies
- **L2 (Auto Safe Fix)**: Cache invalidation, reconnection, offline recovery, memory GC, token refresh, image fallback
- **L3 (Supervised)**: Payment retry, stuck transactions, fraud flagging, state machine transitions, kill-switch activation
- **L4 (Human Only)**: Balance adjustment, settlement, fraud resolution, ledger correction, schema migration, booking completion

### 15.8 Rollout Roadmap

| Phase | Duration | Focus | Key Deliverable |
|---|---|---|---|
| 1 | Weeks 1–4 | Foundation | Safety model enforced, existing engines audited |
| 2 | Weeks 5–10 | Pipeline | 7-stage repair pipeline + proof system operational |
| 3 | Weeks 11–16 | Domain Rules | 10+ domains configured with specific repair rules |
| 4 | Weeks 17–22 | Observability | Dashboard, confidence scoring, MTTD/MTTR tracking |
| 5 | Weeks 23–30 | Graduation | Engines graduating through autonomy stages |

### 15.9 Proof Model Schema Summary

Every repair produces an immutable proof record containing:
- **Detection**: What was found, by which engine, with what confidence
- **Root Cause**: Why it happened, at which layer, correlated events
- **Classification**: Issue type, signature, level, financial/security impact
- **Repair**: Strategy, scope, mutations (before/after), rollback plan
- **Validation**: Check results (pass/fail), overall outcome
- **Regression**: Post-repair regression analysis
- **Outcome**: Final status (accepted/rolled_back/escalated), confidence score
- **Metadata**: Versions, environment, session, trace ID

### 15.10 Implementation Phase Timeline

```
Week  1 ─────── 4: Phase 1 — Safety Foundation
                    ├── Safety constraints enforced
                    ├── Existing engines audited
                    └── Kill-switch + feature-flag integration

Week  5 ────── 10: Phase 2 — Repair Pipeline
                    ├── 7-stage pipeline operational
                    ├── Proof system storage + queries
                    └── Pipeline observability

Week 11 ────── 16: Phase 3 — Domain Rules
                    ├── 10+ domain repair rule sets
                    ├── Financial safety verified
                    └── Domain isolation validated

Week 17 ────── 22: Phase 4 — Observability
                    ├── 10-panel dashboard
                    ├── Confidence scoring active
                    └── MTTD/MTTR tracking

Week 23 ────── 30: Phase 5 — Graduation
                    ├── Stage 1 → Stage 2 promotions
                    ├── Supervised repair workflows
                    └── Limited autonomy trials
```

---

*End of Architecture Document*

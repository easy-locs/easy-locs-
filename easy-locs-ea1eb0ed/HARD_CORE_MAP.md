# HARD CORE ARCHITECTURE MAP

## 5-Block Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    HARD CORE RUNTIME                             │
│  Engine Orchestrator • Boot System • Platform Bus • Base Engine  │
│  Engine Observer • Feature Flags • Engine Registry               │
├──────────────────────────────────────────────────────────────────┤
│                    HARD CORE BUSINESS                            │
│  Backend Workers (run-engine-cron):                              │
│    Trust • Fraud • Quality • Taxonomy • Publish Gate • Pipeline  │
│  Pipeline Functions:                                             │
│    pipeline-worker • auto-onboarding-cron • engine-cron-server   │
│  Browser Engines:                                                │
│    Orbit (message, media, conversation, group, optimistic)       │
│    Wallet (ledger, reconciliation, fraud-watch, payout, FX)      │
│    Radar (location, geocode, provider, routing, ETA)             │
│    Data (menu, service, property, hotel, taxonomy, currency)     │
├──────────────────────────────────────────────────────────────────┤
│                    HARD CORE QUALITY                             │
│  UI Engine (detectors + safePatches + auto-run on 10 pages)      │
│  Quality Tier 3 (22 engines): taxonomy, canonical, profile,     │
│    address, module-link, routing, UI-polish, data-cleaning,      │
│    SEO, dead-code, dead-flow, wallet, orbit, radar, me-biz,     │
│    property, country-rules, automation, observability, test,     │
│    feature-flags, quality-score-global                           │
├──────────────────────────────────────────────────────────────────┤
│                    HARD CORE UI                                  │
│  Self-Healing (error-classifier, auto-fix, rollback, recovery)   │
│  Performance (perf, render, query, cache, network)               │
│  Realtime (presence, sync, unread, message-reconcile, retry)     │
│  Security (zero-trust, session-risk, device-trust, policy,       │
│            anomaly-detector)                                      │
│  Calls (call-health, network-adapt, reconnect, media-quality)    │
├──────────────────────────────────────────────────────────────────┤
│                    HARD CORE PRO CONSOLE                         │
│  Tier 2 DEV-only (36 engines):                                   │
│    Architecture (constraint, SSOT, domain-boundary, platformbus) │
│    Code Quality (auditor, duplication, refactor, module-cleanup)  │
│    UX (friction, layout, interaction, design-regression, a11y)   │
│    Business (flow-integrity, conversion, funnel, dropoff,        │
│              commission, revenue-intel, growth-intel)             │
│    Support (ticket-pattern, incident-cluster, root-cause,        │
│             resolution-optimizer)                                │
│    Observability (trace, biz-events, error-heatmap, release)     │
│    Release (gate, shadow, canary, rollback-trigger)              │
│    AI (analysis, code-suggestion, runtime-anomaly, policy-guard) │
└──────────────────────────────────────────────────────────────────┘
```

## Block Details

### HARD CORE RUNTIME
The execution infrastructure. All engines inherit from `BaseEngine` and are managed by `engineOrchestrator`. The `engine-registry.ts` handles 3-tier boot (T1 immediate, T2 DEV-only after 8s, T3 quality after 12s). `platformBus` handles cross-engine communication. `engine-observer` collects metrics.

Key files:
- `src/engines/core/base-engine.ts`
- `src/engines/core/engine-orchestrator.ts`
- `src/engines/core/engine-observer.ts`
- `src/engines/core/engine-feature-flags.ts`
- `src/engines/engine-registry.ts`
- `src/lib/shared/platform-bus.ts`

### HARD CORE BUSINESS
The engines that process real business data. Backend workers run 24/7 via Supabase Edge Functions. Browser engines handle session-level business logic (message delivery, wallet monitoring, radar, data normalization).

Backend (55+ handlers in run-engine-cron):
- Trust: `trust-ranking-recompute` (5min)
- Fraud: `fraud-anomaly-scan` (2min)
- Quality: `quality-deep-scan`, `shop-quality` (5min)
- Taxonomy: `taxonomy-enforcer` (10min)
- Gates: `publish-gate`, `publish-gate-food/hotel/grocery/service`
- Lifecycle: `auto-publish`, `auto-unpublish`, `visibility-optimizer`
- Finance: `wallet-sync`, `finance-reconciliation`
- Operations: `order-lifecycle`, `delivery-monitor`, `driver-availability`
- Pipeline: `pipeline-worker`, `auto-onboarding-cron`
- Hotel: intake → rooms → rates → calendar → visual → quality → publish
- Food: intake → normalize → menu → visual → gate → publish → audit

Browser (46 T1 engines):
- Orbit: 5 engines (message, media, conversation, group, optimistic)
- Wallet: 5 engines (ledger, reconciliation, fraud-watch, payout, FX)
- Radar: 5 engines (location, geocode, provider, routing, ETA)
- Data: 6 engines (menu, service, property, hotel, taxonomy, currency)
- Self-Healing: 4 engines
- Performance: 5 engines
- Realtime: 5 engines
- Security: 5 engines
- Calls: 4 engines

### HARD CORE QUALITY
The UI Engine and Quality Tier 3. UI Engine runs on 10 user-facing pages with DOM observation and auto-patching. Quality engines audit the codebase for standards compliance.

UI Engine pages: Dashboard, HyperRadar, CommunicationCenter, WalletHub, MeCommandCenter, Onboarding, ShopPage, PublicListing, MerchantDashboard, PropertyDetailHub

Key files:
- `src/hooks/useUiEngine.ts`
- `src/lib/ui-engine/runUiEngine.ts`
- `src/lib/ui-engine/detectors.ts`
- `src/lib/ui-engine/safePatches.ts`

### HARD CORE UI
Session-level UI protection. Self-healing recovers from crashes, performance engines optimize rendering, realtime engines maintain message consistency, security engines protect the session.

### HARD CORE PRO CONSOLE
Dev-only engines (36, loaded only when `import.meta.env.DEV`). Architecture enforcement, code quality auditing, UX analysis, business flow checking. Not loaded in production builds.

## Engine Counts

| Block | Browser Engines | Backend Workers | Total |
|-------|----------------|-----------------|-------|
| Runtime | 0 | 0 | Infrastructure |
| Business | 25 | 55+ | 80+ |
| Quality | 22 + UI Engine | 0 | 23 |
| UI | 23 | 0 | 23 |
| Pro Console | 36 (DEV only) | 0 | 36 |
| **Total** | **106** | **55+** | **160+** |

## Pipeline Engines (src/lib/engines/)

51 functional engines remain in `src/lib/engines/` (6 orphans deleted). These are imported by:
- `master-data-pipeline.ts` — main consumer
- Various admin pages, hooks, and library files
- Radar components, order system, support system

These are NOT orphans — they follow a functional pattern (exported functions, not classes) and are consumed by the pipeline and utility code.

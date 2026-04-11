# BROWSER TO BACKEND MIGRATION MAP

## Summary
**8 new backend workers added** this phase | **71 total ENGINE_ACTIONS** | **162 DB calls** | **67 WRITE operations**

## New Backend Workers (Migrated from Browser-Side Concepts)

| Engine Name | Was Browser-Side? | What It Does (Backend) | Frequency | Group |
|------------|-------------------|----------------------|-----------|-------|
| source-of-truth-drift | YES (Sentinel invariant checks) | Detects visibility/trust/gate inconsistencies in merchant data | 300s | integrity |
| incident-classify | YES (Omega incident-response) | Classifies engine errors by category (auth/timeout/data) and severity | 180s | meta |
| pricing-integrity | YES (Sentinel validation) | Detects invalid/suspicious pricing in menu items | 600s | integrity |
| availability-integrity | YES (Sentinel health checks) | Ensures merchants have valid availability state | 600s | integrity |
| regression-metrics | YES (Omega prediction) | Compares hour-over-hour success rates, alerts on regression | 3600s | meta |
| orphan-entity-cleanup | YES (God maintenance) | Removes orphan media and menu items with null merchant_id | 3600s | maintenance |
| stale-flow-detection | YES (Sentinel workflow checks) | Expires pending bookings older than 7 days | 1800s | lifecycle |
| proof-log-aggregation | YES (Omega memory/knowledge-graph) | Hourly aggregation of engine run logs for reporting | 3600s | meta |

## Previously Migrated Backend Workers (Task 3)

| Engine Name | Previously Browser-Side | Backend Function |
|------------|------------------------|-----------------|
| trust-ranking-recompute | trust scoring in Sentinel/God | Computes trust from 15+ factors, WRITES to seed_merchants |
| fraud-anomaly-scan | FraudWatchEngine, AnomalyDetector | Detects duplicates, flags + hides, WRITES to seed_merchants |
| taxonomy-enforcer | TaxonomyEnforcer | Fixes wrong verticals, updates categories |
| quality-deep-scan | quality engines | Enhanced quality scoring with media/description/pricing |
| maintenance-sweep | God maintenance-engine | Stale sessions, expired tokens, orphan cleanup |
| health-monitor | Sentinel health-engine | Checks all engines, recovers stale, writes health snapshots |

## Still Browser-Side (Correctly)

| Module | Why It Stays Browser-Side |
|--------|--------------------------|
| UI Engine (runUiEngine) | Needs live DOM access for detection + patching |
| useUiEngine hook | Page-local, runs on each page visit |
| RadarOptimizationEngine | Search display hints, client-only |
| SearchPurity | Vertical isolation guard, client-only |
| MediaFlowEngine | Upload progress monitoring, client-only |
| Telemetry bus | Client-side event aggregation |
| DOM MutationObserver | Requires browser DOM API |

## Architecture After Migration

```
PERMANENT BACKEND (24/7, survives tab close):
├── run-engine-cron (71 ENGINE_ACTIONS, 1550 lines)
│   ├── core: trust-ranking, fraud-scan, quality, taxonomy, health-monitor
│   ├── integrity: source-of-truth-drift, pricing-integrity, availability-integrity
│   ├── lifecycle: auto-publish, auto-unpublish, stale-flow, order-lifecycle, booking-lifecycle
│   ├── maintenance: maintenance-sweep, orphan-entity-cleanup
│   ├── meta: incident-classify, regression-metrics, proof-log-aggregation
│   ├── data: shop-quality, coherence-sweep, data-completeness, data-trust-scan
│   ├── gate: publish-gate, publish-gate-food/hotel/grocery/service
│   ├── finance: wallet-sync, finance-reconciliation, fx-refresh
│   └── food/hotel/service: intake, normalize, build, publish, quality-gate, visual-clean
├── worker-health-monitor (standalone Edge Function)
└── 110+ other Edge Functions (payments, bookings, auth, etc.)

BROWSER-SIDE (page-local, legitimate):
├── UI Engine (detection + patching on 10 pages)
├── Sentinel (heartbeat monitoring, degraded to observer)
├── God System (governance scoring, degraded to observer)
└── Omega (intelligence scoring, degraded to observer)
```

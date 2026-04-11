# REDUNDANT LAYER REMOVAL PLAN

## Redundancies Identified and Resolved

### 1. God System cron-orchestrator vs run-engine-cron
- **Before**: God System had its own `cron-orchestrator.ts` running `setInterval` jobs in the browser
- **After**: `run-engine-cron` Edge Function IS the cron orchestrator. God's cron is now redundant.
- **Action**: God's cron-orchestrator is now a passive observer. All scheduling happens server-side.

### 2. Browser-side trust/fraud computation vs backend workers
- **Before**: FraudWatchEngine, AnomalyDetector, TaxonomyEnforcer computed in browser
- **After**: These are downgraded to `RUNTIME_CLASS: "browser-monitor"` with `BACKEND_WORKER` pointer
- **Result**: Browser reads results from DB, backend does the computation

### 3. Sentinel invariant engine vs source-of-truth-drift
- **Before**: Sentinel ran invariant checks in browser, couldn't write to DB
- **After**: `source-of-truth-drift` backend worker does the same checks and logs drifts to `engine_run_logs`
- **Result**: Invariant checking is now permanent and logged

### 4. Sentinel health engine vs health-monitor
- **Before**: Sentinel tracked engine heartbeats in browser memory (lost on tab close)
- **After**: `health-monitor` ENGINE_ACTION checks heartbeats, recovers stale engines, writes `worker_health_snapshots`
- **Result**: Health monitoring is now permanent

### 5. God maintenance-engine vs maintenance-sweep + orphan-entity-cleanup
- **Before**: God cleaned up stale data in browser
- **After**: Two backend workers handle cleanup permanently
- **Result**: Maintenance runs 24/7

### 6. Omega incident-response vs incident-classify
- **Before**: Omega classified incidents in browser memory
- **After**: `incident-classify` backend worker classifies errors and writes severity metadata to `engine_run_logs`
- **Result**: Incident classification is permanent and queryable

### 7. Omega prediction vs regression-metrics
- **Before**: Omega predicted failures using in-memory data
- **After**: `regression-metrics` backend worker compares hour-over-hour success rates
- **Result**: Regression detection is permanent

## What Remains (Not Redundant)

| Browser Module | Why Not Redundant |
|---------------|-------------------|
| UI Engine | Needs live DOM access |
| Sentinel conflict detection | Page-local state conflicts |
| Sentinel telemetry | Client-side event aggregation |
| God observability | Client-side performance monitoring |
| Omega adaptive-ux | Client-side UX adaptation |
| Omega decision-engine | Client-side decision hints |
| Omega memory-engine | Session-local memory |

## Architecture Simplification

**Before (3 overlapping brain layers)**:
```
Sentinel Core (14 modules) ←→ God System (12 modules) ←→ Omega Intelligence (10 modules)
All browser-only, all die on tab close, many computing the same things
```

**After (clean separation)**:
```
Permanent Backend Core (71 workers, 24/7)
  ↕ (reads/writes database)
UI Hard Core (CSS/components, permanent source fixes)
  ↕ (renders on each page load)
Browser Monitors (19 modules, observers only)
  ↕ (reads from database, reports to telemetry bus)
```

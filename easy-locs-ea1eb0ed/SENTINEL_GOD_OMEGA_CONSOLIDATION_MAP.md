# SENTINEL / GOD / OMEGA CONSOLIDATION MAP

## Classification of Every Sub-Module

### SENTINEL CORE (src/core/sentinel/)

| Module | Classification | Reason |
|--------|---------------|--------|
| sentinel-conflict-engine | KEEP BROWSER MONITOR | Page-local conflict detection |
| sentinel-validation-engine | MERGED INTO BACKEND | → source-of-truth-drift + pricing-integrity |
| sentinel-health-engine | MERGED INTO BACKEND | → health-monitor ENGINE_ACTION |
| sentinel-healing-engine | MERGED INTO BACKEND | → health-monitor auto-recovery |
| sentinel-workflow-engine | MERGED INTO BACKEND | → stale-flow-detection |
| sentinel-cron-orchestrator | MERGED INTO BACKEND | → run-engine-cron IS the orchestrator |
| sentinel-audit-engine | KEEP BROWSER MONITOR | Page-local audit scoring |
| sentinel-quality-gate | MERGED INTO BACKEND | → publish-gate family |
| sentinel-telemetry-engine | KEEP BROWSER MONITOR | Client-side event bus |
| sentinel-incident-engine | MERGED INTO BACKEND | → incident-classify |
| sentinel-scoring-engine | KEEP BROWSER MONITOR | Page-local scoring |
| sentinel-report-engine | KEEP BROWSER MONITOR | Dev-only reporting |
| sentinel-invariant-engine | MERGED INTO BACKEND | → source-of-truth-drift |
| sentinel-taxonomy-registry | MERGED INTO BACKEND | → taxonomy-enforcer |

**Result: 7 modules merged into backend workers, 6 kept as browser monitors**

### GOD SYSTEM (src/lib/god/)

| Module | Classification | Reason |
|--------|---------------|--------|
| anti-conflict-engine | KEEP BROWSER MONITOR | Complements sentinel-conflict |
| continuous-audit-engine | MERGED INTO BACKEND | → quality-deep-scan + source-of-truth-drift |
| maintenance-engine | MERGED INTO BACKEND | → maintenance-sweep + orphan-entity-cleanup |
| cron-orchestrator | REDUNDANT | run-engine-cron replaces this completely |
| quality-gate-engine | MERGED INTO BACKEND | → publish-gate family |
| observability-engine | KEEP BROWSER MONITOR | Client-side performance monitoring |
| hyper-optimization-engine | KEEP BROWSER MONITOR | Client-side perf budgets |
| black-chamber | KEEP BROWSER MONITOR | Dev-only security audit |
| past-control | KEEP BROWSER MONITOR | Dev-only state snapshots |
| god-audit | MERGED INTO BACKEND | → quality-deep-scan |
| taxonomy-god-engine | MERGED INTO BACKEND | → taxonomy-enforcer |
| state-machines | KEEP BROWSER MONITOR | Client-side state tracking |

**Result: 5 modules merged into backend workers, 1 redundant, 6 kept as browser monitors**

### OMEGA INTELLIGENCE (src/core/omega/)

| Module | Classification | Reason |
|--------|---------------|--------|
| knowledge-graph-engine | MERGED INTO BACKEND | → proof-log-aggregation (structure analysis) |
| memory-engine | KEEP BROWSER MONITOR | Session-local memory |
| decision-engine | KEEP BROWSER MONITOR | Client-side decision hints |
| priority-engine | KEEP BROWSER MONITOR | Client-side priority scoring |
| prediction-engine | MERGED INTO BACKEND | → regression-metrics |
| business-opportunity-engine | KEEP BROWSER MONITOR | Dev-only opportunity scanning |
| adaptive-ux-engine | KEEP BROWSER MONITOR | Client-side UX adaptation |
| self-improvement-engine | KEEP BROWSER MONITOR | Dev-only code analysis |
| incident-response-engine | MERGED INTO BACKEND | → incident-classify |
| code-evolution-engine | KEEP BROWSER MONITOR | Dev-only code evolution |

**Result: 3 modules merged into backend workers, 7 kept as browser monitors**

## Summary

| Layer | Total Modules | Merged to Backend | Kept Browser | Redundant |
|-------|--------------|-------------------|--------------|-----------|
| Sentinel | 14 | 7 | 6 | 0 |
| God | 12 | 5 | 6 | 1 |
| Omega | 10 | 3 | 7 | 0 |
| **Total** | **36** | **15** | **19** | **1** |

## What Changed

**Before**: 36 browser-only modules doing global data analysis, scoring, and enforcement — all die when tab closes.

**After**: 15 of those modules now have permanent backend equivalents in run-engine-cron. The browser instances are degraded to read-only monitors that observe and report, but no longer do the critical data mutations. The backend workers handle all global data operations 24/7.

The 19 remaining browser modules are legitimate: they need DOM access, session-local state, or are dev-only tools.

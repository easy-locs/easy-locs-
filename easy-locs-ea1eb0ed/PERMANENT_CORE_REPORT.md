# PERMANENT CORE REPORT

## Summary

The Easy-Locs permanent backend core consists of **113 Supabase Edge Functions** with **6 new critical core workers** added to the existing `run-engine-cron` orchestrator. The `engine_supervisor` table serves as both worker health tracker and cron registry. A new `worker-health-monitor` Edge Function provides 1-minute health checks with automatic stuck-engine recovery.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Supabase pg_cron / External Trigger            │
│  └── calls run-engine-cron Edge Function        │
│      └── reads engine_supervisor (schedule)     │
│      └── runs ENGINE_ACTIONS[engine_name]       │
│      └── logs to engine_run_logs                │
│      └── updates engine_supervisor (health)     │
│                                                 │
│  worker-health-monitor (every 60s)              │
│  └── scans engine_supervisor for stale/stuck    │
│  └── auto-recovers stuck engines                │
│  └── snapshots to worker_health_snapshots       │
└─────────────────────────────────────────────────┘
```

---

## Group A — Backend Workers (Permanent, Server-Side)

These run inside `run-engine-cron` or as standalone Edge Functions. They operate on real DB data, write results, and run 24/7 regardless of browser state.

### Core Workers (NEW)

| Worker | Schedule | What It Does | Writes |
|--------|----------|-------------|--------|
| `trust-ranking-recompute` | 5 min | Computes trust scores from verification, reviews, completeness, age; derives ranking | `seed_merchants.trust_score`, `ranking_score` |
| `fraud-anomaly-scan` | 2 min | Detects duplicate listings (name+city), suspicious pricing (all-same, extreme), flags/blocks | `seed_merchants.fraud_flag`, `fraud_flagged_at`, `visibility_mode` |
| `quality-deep-scan` | 5 min | Enhanced quality scoring: media, description, pricing, completeness, opening hours | `seed_merchants.visibility_score`, `quality_deep_score`, `quality_scanned_at` |
| `taxonomy-enforcer` | 10 min | Fixes null/invalid verticals and categories using NLP text matching on name+description | `seed_merchants.vertical`, `category`, `taxonomy_enforced_at` |
| `maintenance-sweep` | 1 hour | Unified cleanup: expired QR sessions, old notifications, expired coupons, exhausted boosts, old logs | Multiple tables |
| `health-monitor` | 1 min | Checks all engines for staleness/errors, auto-recovers stuck, snapshots health metrics | `worker_health_snapshots`, `engine_supervisor` |

### Existing Workers (Already in run-engine-cron)

| Worker | Schedule | Category |
|--------|----------|----------|
| `shop-quality` | 5 min | Quality scoring |
| `publish-gate` | 5 min | Publish validation |
| `publish-gate-food` | 5 min | Food vertical gate |
| `publish-gate-hotel` | 5 min | Hotel vertical gate |
| `publish-gate-grocery` | 5 min | Grocery vertical gate |
| `publish-gate-service` | 5 min | Service vertical gate |
| `auto-publish` | 5 min | Auto-promote gated merchants |
| `auto-unpublish` | 5 min | Auto-demote low-quality |
| `visibility-optimizer` | 5 min | Promote high-score to full |
| `self-healing-scan` | 5 min | Heal broken storefronts |
| `wallet-sync` | 5 min | Reconcile wallet balances |
| `notification-cleanup` | 5 min | Clean old notifications |
| `qr-session-cleanup` | 5 min | Expire stale QR sessions |
| `coupon-expiration` | 5 min | Expire old coupons |
| `boost-analytics` | 5 min | Complete exhausted boosts |
| `sla-breach-check` | 5 min | Escalate SLA breaches |
| `entity-integrity` | 5 min | Find nameless merchants |
| `entity-recovery` | 5 min | Recover wrongly hidden |
| `coherence-sweep` | 5 min | Coherence detection |
| `data-completeness` | 5 min | Data completeness audit |
| `data-trust-scan` | 5 min | Trust score detection |
| `finance-reconciliation` | 5 min | Accounting entry check |
| `compliance-aml` | 5 min | AML event check |
| `vertical-classifier` | 5 min | Classify untyped merchants |
| `inventory-check` | 5 min | Demote empty-menu merchants |

### Standalone Edge Functions

| Function | Purpose |
|----------|---------|
| `engine-cron-server` (1677 lines) | Full engine server with Brain Firewall |
| `pipeline-worker` (882 lines) | 13-stage entity pipeline |
| `auto-onboarding-cron` | 5-step onboarding orchestration |
| `rent-lifecycle-cron` (329 lines) | Rent payment lifecycle |
| `health-check` | System health status |
| `worker-health-monitor` (NEW) | Engine health monitoring |

### Hotel Pipeline (in run-engine-cron)

| Worker | What |
|--------|------|
| `hotel-intake` | Seed to hotel conversion |
| `hotel-room-normalizer` | Room type normalization |
| `hotel-rate-builder` | Rate plan generation |
| `hotel-calendar-sync` | 90-day calendar population |
| `hotel-visual-clean` | Placeholder image cleanup |
| `hotel-quality-gate` | Quality scoring + visibility |
| `hotel-publish` | Firewall-gated publish |

### Deliveroo Food Pipeline (in run-engine-cron)

| Worker | What |
|--------|------|
| `deliveroo-food-intake-engine` | Source scraping |
| `food-normalizer-engine` | Category/city normalization |
| `food-menu-builder-engine` | Menu structure |
| `food-visual-clean-engine` | Placeholder cleanup |
| `food-visibility-gate-engine` | Quality gate |
| `food-publish-engine` | Publishing |
| `food-rescrape-monitor-engine` | Stale detection |
| `food-audit-engine` | Pipeline audit |

---

## Group B — Browser-Side Engines (UI Monitors)

These run in the browser only when a user has the app open. They scan the DOM and monitor the current session. They do NOT write to the database and are marked with `RUNTIME_CLASS = "browser-monitor"`.

### Tier 1 (46 engines, always loaded)

| Engine | Category | Purpose |
|--------|----------|---------|
| `ErrorClassifier` | self-healing | Classify runtime errors |
| `AutoFixEngine` | self-healing | Auto-fix known patterns |
| `RollbackEngine` | self-healing | State rollback |
| `SilentRecoveryService` | self-healing | Silent crash recovery |
| `PerfAnalyzer` | performance | Performance metrics |
| `RenderOptimizer` | performance | Render optimization |
| `QueryOptimizer` | performance | Query pattern analysis |
| `CachePolicyEngine` | performance | Cache strategy |
| `NetworkLatencyEngine` | performance | Network monitoring |
| `PresenceHealthEngine` | realtime | Presence monitoring |
| `SyncRepairEngine` | realtime | Sync repair |
| `UnreadIntegrityEngine` | realtime | Unread count integrity |
| `MessageReconcileEngine` | realtime | Message consistency |
| `RetryReplayEngine` | realtime | Retry failed messages |
| `LedgerIntegrityEngine` | wallet | Ledger display check |
| `ReconciliationEngine` | wallet | Balance display monitor (BACKEND: `wallet-sync`) |
| `FraudWatchEngine` | wallet | Session fraud detection (BACKEND: `fraud-anomaly-scan`) |
| `PayoutSafetyEngine` | wallet | Payout validation |
| `FXConsistencyEngine` | wallet | FX display check |
| `ZeroTrustEngine` | security | Auth checks |
| `SessionRiskEngine` | security | Session risk |
| `DeviceTrustEngine` | security | Device fingerprint |
| `PolicyHardener` | security | Policy enforcement |
| `AnomalyDetector` | security | Click/API burst detection (BACKEND: `fraud-anomaly-scan`) |
| `MessageDeliveryEngine` | orbit | Message delivery |
| `MediaFlowEngine` | orbit | Media upload monitoring |
| `ConversationConsistencyEngine` | orbit | Thread consistency |
| `GroupIntegrityEngine` | orbit | Group integrity |
| `OptimisticUIEngine` | orbit | Optimistic UI |
| `CallHealthEngine` | calls | Call quality |
| `NetworkAdaptationEngine` | calls | Network adaptation |
| `ReconnectEngine` | calls | Reconnection |
| `MediaQualityEngine` | calls | Media quality |
| `LocationIntegrityEngine` | radar | Location data |
| `GeocodeRepairEngine` | radar | Geocode repair |
| `ProviderMatchingEngine` | radar | Provider matching |
| `RoutingQualityEngine` | radar | Route quality |
| `ETAAccuracyEngine` | radar | ETA accuracy |
| `MenuNormalizer` | data | Menu display |
| `ServiceNormalizer` | data | Service display |
| `PropertyNormalizer` | data | Property display |
| `HotelNormalizer` | data | Hotel display |
| `TaxonomyEnforcer` | data | DOM taxonomy check (BACKEND: `taxonomy-enforcer`) |
| `CurrencyPolicyEngine` | data | Currency display |

### Tier 2 (36 engines, DEV-only)

Architecture, code-quality, UX, business, support, observability, release, AI engines — all browser-side code analysis and UI monitoring. Not loaded in production.

### Tier 3 (22 engines, always loaded after 12s)

Quality audit engines (taxonomy, canonical mapping, profile quality, etc.) — all scan the DOM for quality issues.

---

## Group C — Hybrid (Browser reads backend results)

The following browser engines have explicit `BACKEND_WORKER` references and serve as UI-level supplements to permanent backend workers:

| Browser Engine | Backend Worker | Relationship |
|----------------|---------------|-------------|
| `TaxonomyEnforcer` | `taxonomy-enforcer` | Browser scans DOM; backend fixes DB |
| `FraudWatchEngine` | `fraud-anomaly-scan` | Browser monitors session transfers; backend scans all merchants |
| `AnomalyDetector` | `fraud-anomaly-scan` | Browser detects click/API storms; backend detects data fraud |
| `ReconciliationEngine` | `wallet-sync` | Browser watches displayed balance; backend reconciles ledger |

---

## Infrastructure Tables

| Table | Purpose |
|-------|---------|
| `engine_supervisor` | Worker registry, scheduling, health tracking, kill switches |
| `engine_run_logs` | Detailed execution logs per engine run |
| `worker_health_snapshots` | Periodic health snapshots (stale/error/healthy counts) |

---

## Classification Summary

| Group | Count | Where | Persistent |
|-------|-------|-------|-----------|
| A (Backend) | 71 handlers in run-engine-cron + 10 standalone functions | Supabase Edge Functions | Yes, 24/7 |
| B (Browser) | 104 engines (46 T1 + 36 T2 + 22 T3) | Client JavaScript | No, session-only |
| C (Hybrid) | 4 engines | Browser reads + backend writes | Partial |

---

## What Changed

1. **6 new permanent core workers** added to `run-engine-cron`: trust-ranking-recompute, fraud-anomaly-scan, quality-deep-scan, taxonomy-enforcer, maintenance-sweep, health-monitor
2. **New `worker-health-monitor` Edge Function** — 1-minute health checks with auto-recovery
3. **New `worker_health_snapshots` table** — periodic health metrics
4. **Enhanced `engine_supervisor`** — new columns for frequency, timeout, kill switch, worker groups, descriptions
5. **Enhanced `engine_run_logs`** — new columns for rows_read, side_effect_count, trigger_source
6. **New columns on `seed_merchants`** — trust_score, ranking_score, fraud_flag, quality_deep_score, taxonomy_enforced_at
7. **Browser engines downgraded** — 4 engines explicitly marked as `RUNTIME_CLASS = "browser-monitor"` with `BACKEND_WORKER` references
8. **Existing read-only handlers upgraded** — data-trust-scan, coherence-sweep, compliance-aml now supplemented by WRITE handlers

---

## Closing Notes

The permanent core now runs server-side through Supabase Edge Functions. Critical data operations (trust, fraud, quality, taxonomy, maintenance) execute on schedule regardless of browser state. Browser engines remain valuable for UI-level monitoring but no longer carry the responsibility of being the only line of defense. The `engine_supervisor` table is the single source of truth for all engine scheduling, health, and configuration.

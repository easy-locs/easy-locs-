# Engine Execution Rules

## Overview
Every retained engine in the permanent backend core follows 8 rule categories: trigger, execution, validation, blocking, retry, priority, stop, and proof.

---

## Global Rules (apply to all engines)

### Trigger Rules
- All backend engines are triggered by `run-engine-cron` Edge Function
- Frequency controlled by `engine_supervisor.frequency_seconds`
- Engines only run when `enabled = true` AND `kill_switch = false`
- Manual trigger available via `?forceEngines=engine-name` parameter

### Execution Rules
- Each engine runs within `engine_supervisor.timeout_ms` (default 30000ms)
- Engines acquire a lock by setting `status = "running"` before execution
- Concurrent execution prevented: engines with `status = "running"` are skipped
- All DB access uses the Supabase service role client

### Validation Rules
- Engine result must return `{ ok: boolean, rowsAffected: number, summary: string }`
- Failed engines have `consecutive_failures` incremented
- Successful engines reset `consecutive_failures` to 0

### Blocking Rules
- Engines with `kill_switch = true` never execute
- Engines with `enabled = false` are skipped
- Engines with `status = "running"` for > `timeout_ms` are unlocked by `worker-health-monitor`

### Retry Rules
- No automatic retry within a single cron cycle
- Failed engines retry on next scheduled cycle
- `consecutive_failures` tracked; no auto-disable (operator decision)

### Priority Rules
- Engines execute in `engine_supervisor` row order (alphabetical by `engine_name`)
- No priority queue — all engines run in same cycle
- `worker_group` used for organizational grouping, not execution priority

### Stop Rules
- Set `kill_switch = true` to immediately stop an engine
- Set `enabled = false` to disable until re-enabled
- `worker-health-monitor` unlocks stuck engines (running > 2× timeout)

### Proof Rules
- Every execution logged to `engine_run_logs` with: `engine_name`, `started_at`, `duration_ms`, `status`, `effect_summary`, `db_rows_affected`, `error_message`, `rows_read`, `side_effect_count`, `trigger_source`
- `engine_supervisor` updated: `last_run_at`, `last_success_at` or `last_error_at`, `last_duration_ms`, `total_runs`, `success_rate`
- `worker_health_snapshots` captures system-wide health every 60 seconds

---

## Per-Engine Rules

### Group A: Data Quality & Trust (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `shop-quality` | Scheduled 300s | Blocks publish if score < threshold | Scans all draft/active merchants |
| `data-completeness` | Scheduled 300s | None | Computes completeness % per merchant |
| `data-trust-scan` | Scheduled 300s | None | Validates data trustworthiness signals |
| `trust-ranking-recompute` | Scheduled 300s | None | Recomputes `trust_score` + `ranking_score` on `seed_merchants` |
| `quality-deep-scan` | Scheduled 300s | None | Enhanced quality scoring with media/description/pricing validation |

### Group B: Fraud & Compliance (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `fraud-anomaly-scan` | Scheduled 300s | Sets `fraud_flag = true`, blocks publish | Detects duplicate listings, fake reviews, suspicious pricing |
| `compliance-aml` | Scheduled 300s | None | AML event scanning |
| `entity-integrity` | Scheduled 300s | None | Validates entity referential integrity |
| `entity-recovery` | Scheduled 300s | None | Recovers broken entity references |

### Group C: Content Normalization (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `vertical-classifier` | Scheduled 300s | None | Assigns vertical type to merchants |
| `food-menu-normalizer` | Scheduled 300s | None | Normalizes food menu structures |
| `hotel-inventory-normalizer` | Scheduled 300s | None | Normalizes hotel room inventory |
| `grocery-normalizer` | Scheduled 300s | None | Normalizes grocery product catalogs |
| `service-catalog-normalizer` | Scheduled 300s | None | Normalizes service provider catalogs |
| `taxonomy-enforcer` | Scheduled 300s | None | Fixes wrong verticals, missing categories, orphan paths |
| `coherence-sweep` | Scheduled 300s | None | Cross-table coherence validation |

### Group D: Publish Gates (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `publish-gate` | Scheduled 300s | **BLOCKS** publish if quality < threshold | Generic publish gate |
| `publish-gate-food` | Scheduled 300s | **BLOCKS** food publish | Requires menu, media, pricing |
| `publish-gate-hotel` | Scheduled 300s | **BLOCKS** hotel publish | Requires rooms, rates, calendar |
| `publish-gate-grocery` | Scheduled 300s | **BLOCKS** grocery publish | Requires catalog, pricing |
| `publish-gate-service` | Scheduled 300s | **BLOCKS** service publish | Requires catalog, availability |
| `auto-publish` | Scheduled 300s | None | Auto-publishes when all gates pass |
| `auto-unpublish` | Scheduled 300s | None | Auto-unpublishes degraded listings |

### Group E: Food Pipeline (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `deliveroo-food-intake-engine` | Scheduled 300s | None | External data ingestion |
| `food-normalizer-engine` | Scheduled 300s | None | Menu item normalization |
| `food-menu-builder-engine` | Scheduled 300s | None | Menu structure assembly |
| `food-visual-clean-engine` | Scheduled 300s | None | Image validation/cleanup |
| `food-visibility-gate-engine` | Scheduled 300s | None | Visibility requirements check |
| `food-publish-engine` | Scheduled 300s | None | Final food publish |
| `food-rescrape-monitor-engine` | Scheduled 300s | None | Monitors for stale external data |
| `food-audit-engine` | Scheduled 300s | None | Post-publish audit |

### Group F: Hotel Pipeline (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `hotel-intake` | Scheduled 300s | None | Hotel data ingestion |
| `hotel-room-normalizer` | Scheduled 300s | None | Room type normalization |
| `hotel-rate-builder` | Scheduled 300s | None | Rate/pricing assembly |
| `hotel-calendar-sync` | Scheduled 300s | None | Availability calendar sync |
| `hotel-visual-clean` | Scheduled 300s | None | Hotel image validation |
| `hotel-quality-gate` | Scheduled 300s | None | Hotel quality requirements |
| `hotel-publish` | Scheduled 300s | None | Final hotel publish |

### Group G: Operations (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `order-lifecycle` | Scheduled 300s | None | Order state machine management |
| `delivery-monitor` | Scheduled 300s | None | Active delivery tracking |
| `driver-availability` | Scheduled 300s | None | Driver pool management |
| `ride-lifecycle` | Scheduled 300s | None | Ride state machine management |
| `sla-breach-check` | Scheduled 300s | None | SLA violation detection |
| `inventory-check` | Scheduled 300s | None | Stock level monitoring |

### Group H: Financial (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `wallet-sync` | Scheduled 300s | None | Wallet balance reconciliation |
| `finance-reconciliation` | Scheduled 300s | None | Financial ledger reconciliation |
| `fx-refresh` | Scheduled 300s | None | Currency exchange rate updates |
| `loyalty-scan` | Scheduled 300s | None | Loyalty program point calculation |

### Group I: Maintenance (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `notification-cleanup` | Scheduled 300s | None | Removes expired notifications |
| `call-log-cleanup` | Scheduled 300s | None | Cleans old call records |
| `qr-session-cleanup` | Scheduled 300s | None | Removes expired QR sessions |
| `abandoned-cart` | Scheduled 300s | None | Processes abandoned shopping carts |
| `coupon-expiration` | Scheduled 300s | None | Expires old coupons |
| `self-healing-scan` | Scheduled 300s | None | Detects and fixes data inconsistencies |
| `maintenance-sweep` | Scheduled 300s | None | Unified cleanup: stale sessions, expired tokens, orphan media |

### Group J: Engagement (Schedule: 300s)

| Engine | Trigger | Blocking | Special Rules |
|--------|---------|----------|---------------|
| `boost-analytics` | Scheduled 300s | None | Promoted listing analytics |
| `approval-queue` | Scheduled 300s | None | Pending approval processing |
| `automation-workflows` | Scheduled 300s | None | Automated workflow execution |
| `visibility-optimizer` | Scheduled 300s | None | Search ranking optimization |
| `audit-trail` | Scheduled 300s | None | Audit log management |
| `staff-sync` | Scheduled 300s | None | Staff member synchronization |
| `franchise-dedup` | Scheduled 300s | None | Franchise duplicate detection |

---

## Health Monitoring

### worker-health-monitor (Edge Function)
- **Schedule**: Every 60 seconds
- **Actions**: Detects stale workers (no heartbeat > 2× frequency), unlocks stuck engines, computes aggregate health metrics
- **Output**: `worker_health_snapshots` row with healthy/stale/error/disabled counts, avg success rate, runs per hour
- **Alerting**: Logs stale and error engines in snapshot for Control Room display

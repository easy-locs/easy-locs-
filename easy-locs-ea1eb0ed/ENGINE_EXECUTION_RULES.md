# ENGINE EXECUTION RULES

## How Engines Are Triggered, Executed, and Validated

### Trigger Rules

| Trigger Type | Mechanism | Example |
|-------------|-----------|---------|
| **Cron (scheduled)** | `run-engine-cron` Edge Function invoked via HTTP POST with `Authorization: Bearer <CRON_SECRET>` | Health monitor every 60s, trust recompute every 300s |
| **On-demand** | Same Edge Function with `?action=<engine_name>` query param | Manual trigger from admin UI |
| **Webhook** | Supabase webhook → Edge Function | Payment confirmation → wallet-sync |
| **Cascade** | Engine A completes → triggers Engine B in same cron cycle | quality-deep-scan → publish-gate |

### Execution Flow

```
1. ACQUIRE LOCK
   - Check engine_supervisor.status != "running"
   - Set status = "running", last_run_at = now()

2. EXECUTE
   - Read input data from database tables
   - Perform computation (scoring, classification, detection)
   - Write results back to database

3. LOG PROOF
   - Insert into engine_run_logs:
     { engine_name, started_at, duration_ms, status, effect_summary, db_rows_affected, error_message, metadata_json }

4. UPDATE SUPERVISOR
   - Set status = "ok" or "error"
   - Increment total_runs, update success_rate
   - Update total_rows_affected, last_duration_ms, last_success_at or last_error_at/message

5. RELEASE LOCK
   - Status returns to "ok" or "error" (never stays "running")
```

### Validation Rules

| Rule | Description |
|------|-------------|
| **Frequency gate** | Each engine has `frequency_seconds` — will not re-execute if last_run_at is within that window |
| **Kill switch** | `engine_supervisor.kill_switch = true` → engine is skipped entirely |
| **Enabled gate** | `engine_supervisor.enabled = false` → engine is skipped |
| **Timeout** | Each engine has `timeout_ms` — execution is aborted if exceeded |
| **Consecutive failure limit** | If `consecutive_failures >= 5`, engine moves to error state (health-monitor may attempt recovery) |

### Blocking Rules

| Blocker | Effect |
|---------|--------|
| `kill_switch = true` | Engine is hard-blocked, requires manual reset |
| `enabled = false` | Engine is soft-blocked, can be re-enabled without reset |
| `status = "running"` | Engine is locked, prevents duplicate execution |
| `consecutive_failures >= 5` | Engine is error-blocked, health-monitor may recover |

### Retry Rules

| Scenario | Retry Behavior |
|----------|---------------|
| Engine returns error | Status set to "error", consecutive_failures incremented, retried on next cron cycle |
| Engine times out | Same as error — status = "error", timeout logged |
| Health monitor detects stale | If status = "running" for > 2x frequency_seconds, health-monitor resets status to "ok" (unlocks) |
| Kill switch hit | NO automatic retry — manual intervention required |

### Priority Rules

| Engine Tier | Priority | Frequency |
|------------|----------|-----------|
| **critical** | Runs first in cron cycle | 60-600s |
| **standard** | Runs after critical tier | 180-3600s |
| **dev** | Only runs in development builds | On-demand |

### Stop Rules

| Condition | Engine Stops |
|-----------|-------------|
| Kill switch activated | Immediately, no further execution |
| Disabled by admin | On next cron cycle check |
| Consecutive failures >= 5 | After 5th failure, enters error state |
| Service key revoked | All engines stop (auth failure) |

### Proof Rules

Every engine execution produces proof in `engine_run_logs`:

| Field | Description |
|-------|-------------|
| `engine_name` | Which engine ran |
| `started_at` | When it started |
| `duration_ms` | How long it took |
| `status` | "ok", "warning", or "error" |
| `effect_summary` | Human-readable description of what happened |
| `db_rows_affected` | Number of database rows modified |
| `error_message` | Error details if status != "ok" |
| `metadata_json` | Additional structured data (counts, IDs, etc.) |

### Worker Groups

| Group | Purpose | Example Engines |
|-------|---------|----------------|
| **core** | Trust, fraud, quality, taxonomy | trust-ranking-recompute, fraud-anomaly-scan |
| **integrity** | Data consistency checks | source-of-truth-drift, pricing-integrity |
| **lifecycle** | Business flow automation | auto-publish, order-lifecycle, stale-flow-detection |
| **gate** | Quality gates before publish | publish-gate, publish-gate-food |
| **data** | Data quality and classification | shop-quality, coherence-sweep |
| **finance** | Financial integrity | wallet-sync, fx-refresh |
| **maintenance** | System hygiene | maintenance-sweep, orphan-entity-cleanup |
| **meta** | Self-monitoring | incident-classify, regression-metrics |
| **food/hotel/service** | Vertical-specific pipelines | food-menu-normalizer, hotel-intake |

# Final Counts Report

## System Inventory

### Edge Functions
- **Total**: 113 Edge Functions in `supabase/functions/`
- **Key functions**: `run-engine-cron` (1550 lines, 71 ENGINE_ACTIONS), `worker-health-monitor` (health snapshots)

### Backend Engine Actions (run-engine-cron)
- **Total ENGINE_ACTIONS**: 71
- **Group A — Data Quality & Trust**: 5 (shop-quality, data-completeness, data-trust-scan, trust-ranking-recompute, quality-deep-scan)
- **Group B — Fraud & Compliance**: 4 (fraud-anomaly-scan, compliance-aml, entity-integrity, entity-recovery)
- **Group C — Content Normalization**: 7 (vertical-classifier, food-menu-normalizer, hotel-inventory-normalizer, grocery-normalizer, service-catalog-normalizer, taxonomy-enforcer, coherence-sweep)
- **Group D — Publish Gates**: 7 (publish-gate, publish-gate-food, publish-gate-hotel, publish-gate-grocery, publish-gate-service, auto-publish, auto-unpublish)
- **Group E — Food Pipeline**: 8 (deliveroo-food-intake-engine, food-normalizer-engine, food-menu-builder-engine, food-visual-clean-engine, food-visibility-gate-engine, food-publish-engine, food-rescrape-monitor-engine, food-audit-engine)
- **Group F — Hotel Pipeline**: 7 (hotel-intake, hotel-room-normalizer, hotel-rate-builder, hotel-calendar-sync, hotel-visual-clean, hotel-quality-gate, hotel-publish)
- **Group G — Operations**: 6 (order-lifecycle, delivery-monitor, driver-availability, ride-lifecycle, sla-breach-check, inventory-check)
- **Group H — Financial**: 4 (wallet-sync, finance-reconciliation, fx-refresh, loyalty-scan)
- **Group I — Maintenance**: 7 (notification-cleanup, call-log-cleanup, qr-session-cleanup, abandoned-cart, coupon-expiration, self-healing-scan, maintenance-sweep)
- **Group J — Engagement**: 7 (boost-analytics, approval-queue, automation-workflows, visibility-optimizer, audit-trail, staff-sync, franchise-dedup)

### Browser Engines (src/engines/)
- **Total directories**: 20
- **Core engines**: engine-observer, engine-orchestrator, self-pilot, module-intelligence, network-optimizer, engine-feature-flags, base-engine
- **Downgraded to monitor-only**: 4 (TaxonomyEnforcer, FraudWatchEngine, AnomalyDetector, ReconciliationEngine)
- **Tier 2 (DEV-only)**: 36 engines, loaded after 8s delay

### Library Engines (src/lib/engines/)
- **Total files**: 51
- **Deleted orphans**: 6 (behavior-pattern, data-quality, lease-generator, rent-payment, rent-receipt, taxonomy-health)
- **Original count**: 57
- **All 51 actively imported**: Verified via import analysis

### UI Engine Coverage
- **Pages wired**: 10 user-facing + 1 admin monitor
- **5 Pillars**: Dashboard, Radar, Orbit, Wallet, Me — all covered
- **Telemetry**: platformBus "ui-engine:report" channel

### Database Tables (engine infrastructure)
- **engine_supervisor**: Worker registry with 71 rows, columns: engine_name, engine_tier, runtime_class, status, enabled, kill_switch, dry_run, frequency_seconds, timeout_ms, worker_group, total_runs, success_rate, consecutive_failures, max_retries, heartbeat, description, last_run_at, last_success_at, last_error_at, last_error_message, last_duration_ms, total_rows_affected
- **engine_run_logs**: Execution history with rows_read, side_effect_count, trigger_source columns
- **worker_health_snapshots**: 1-minute health snapshots with healthy/stale/error/disabled counts
- **seed_merchants** (new columns): trust_score, ranking_score, fraud_flag, fraud_flagged_at, quality_deep_score, quality_scanned_at, taxonomy_enforced_at

### Pages
- **Total page files**: 427
- **Admin pages**: 50+
- **Control Room**: `/admin/control-room` (new)

### Architecture Blocks (from HARD_CORE_MAP.md)
1. **God System**: Admin intelligence, system-wide orchestration
2. **Sentinel Core**: Scheduling, cron orchestration, engine lifecycle
3. **Verification Master Block**: Publish gates, quality gates, compliance checks
4. **Omega Intelligence Core**: AI decision engine, fraud detection, anomaly analysis
5. **Business Core + Trust Engine + Live Monitor + Pro Back Office**: Operational engines

### TypeScript Health
- **TypeScript errors**: 0
- **ARCH-GUARD**: CLEAN 9/0/0
- **Build status**: SUCCESS

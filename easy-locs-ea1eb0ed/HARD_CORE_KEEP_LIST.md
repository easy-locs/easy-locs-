# HARD CORE KEEP LIST

## The Real Architecture (Simplified)

### Layer 1: PERMANENT BACKEND CORE (24/7)

| Worker Group | Workers | Impact |
|-------------|---------|--------|
| **core** | trust-ranking-recompute, fraud-anomaly-scan, quality-deep-scan, taxonomy-enforcer, health-monitor | Trust scores, fraud detection, quality scoring, taxonomy enforcement, system health |
| **integrity** | source-of-truth-drift, pricing-integrity, availability-integrity | Data consistency checks, pricing validation, availability state |
| **lifecycle** | auto-publish, auto-unpublish, order-lifecycle, booking-lifecycle, ride-lifecycle, stale-flow-detection | Business flow automation |
| **gate** | publish-gate, publish-gate-food, publish-gate-hotel, publish-gate-grocery, publish-gate-service | Quality gates before visibility |
| **data** | shop-quality, coherence-sweep, data-completeness, data-trust-scan, vertical-classifier | Data quality and classification |
| **finance** | wallet-sync, finance-reconciliation, fx-refresh | Financial integrity |
| **maintenance** | maintenance-sweep, orphan-entity-cleanup, notification-cleanup, call-log-cleanup, qr-session-cleanup | System hygiene |
| **meta** | incident-classify, regression-metrics, proof-log-aggregation | Self-monitoring |
| **food** | food-menu-normalizer, food-normalizer-engine, food-menu-builder-engine, food-publish-engine, food-visual-clean-engine, food-visibility-gate-engine, food-audit-engine, food-rescrape-monitor-engine | Food vertical pipeline |
| **hotel** | hotel-intake, hotel-inventory-normalizer, hotel-room-normalizer, hotel-rate-builder, hotel-quality-gate, hotel-calendar-sync, hotel-publish, hotel-visual-clean | Hotel vertical pipeline |
| **service/grocery** | service-catalog-normalizer, grocery-normalizer | Service/grocery normalization |

**Total: 71 ENGINE_ACTIONS | 162 DB calls | 67 WRITE operations**

### Layer 2: UI HARD CORE (Source Code)

| Component | What It Does | Files |
|-----------|-------------|-------|
| Layout Protection Engine | 24 design system rules preventing text/card/layout breakage | index.css (DS-1 through DS-24) |
| Button hardening | Min touch target, no forced nowrap, icon button padding | button.tsx, index.css |
| Card hardening | Internal flex layout, line-clamp titles/descriptions, overflow control | CardShell.tsx, index.css |
| State components | EmptyState, ErrorState, LoadingState — premium animated | empty-state.tsx, error-state.tsx, LoadingState.tsx |
| RTL/i18n safety | RTL layout flips, CJK word breaking, Arabic font stack | index.css |
| Typography scale | 10-level scale from .text-micro to .text-display | index.css |

### Layer 3: BUSINESS HARD CORE (Supabase Edge Functions)

| Category | Count | Examples |
|----------|-------|---------|
| Payments | 15+ | create-checkout, create-stripe-intent, commission-split |
| Bookings | 8+ | booking-create, booking-approve, booking-complete |
| Auth | 5+ | check-connect-status, check-subscription |
| AI | 3+ | ai-assistant, ai-entity-enrichment, ai-shopping-chat |
| Cleanup | 3+ | cleanup-expired-media, cleanup-expired-messages |
| **Total Edge Functions** | **113** | |

### Layer 4: PRO CONSOLE HARD CORE

| Page | What It Shows |
|------|--------------|
| /admin/control-room (6 tabs) | Overview, Core Status, Engines, Source Fixes, Run Logs, Health |
| /admin/ui-engine | UI Engine diagnostics and scoring |

### Layer 5: MONITORING / CONTROL

| System | Location | Purpose |
|--------|----------|---------|
| engine_supervisor | Database table | All engine registrations, status, heartbeats |
| engine_run_logs | Database table | Every execution with timing, rows, effects |
| worker_health_snapshots | Database table | Health snapshots every 60s |
| Control Room UI | /admin/control-room | Visual dashboard with 6 tabs |

## What Was Removed/Simplified

| Removed | Reason |
|---------|--------|
| God cron-orchestrator browser scheduling | Redundant with run-engine-cron |
| Browser-side trust/fraud/quality computation | Now backend-only (workers read DB, compute, write DB) |
| Browser-side maintenance cleanup | Now backend-only (maintenance-sweep, orphan-entity-cleanup) |
| Browser-side invariant enforcement | Now backend-only (source-of-truth-drift) |
| Browser-side incident classification | Now backend-only (incident-classify) |
| 6 orphan engine files | Deleted (behavior-pattern, data-quality, lease-generator, rent-payment, rent-receipt, taxonomy-health) |

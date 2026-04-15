# Easy-Locs Super-App v3

## Overview
Easy-Locs is a world-class super-app built around 5 intelligently connected pillars:
**Dashboard · Radar · Orbit · Wallet · Me**

Built with React + Vite + TypeScript, backed by Supabase. Property management, marketplace, communication, digital wallet, and service discovery — unified under one roof.

## Visual Design System (Apple/Tesla Premium v4)
- **Design Philosophy**: Minimalist, Apple/Tesla-inspired — solid backgrounds over blur, clean hierarchy, 3 shadow levels max
- **CSS**: `index.css` ~1700 lines — single `:root` token block, no duplicates, clean RTL/dark/scrollbar rules
- **Dark Theme**: Deep navy backgrounds (`hsl(228 28% 7%)`) with teal accent (`hsl(168 72% 44%)`)
- **Shadows**: 3 levels only — `--shadow-sm`, `--shadow-md`, `--shadow-lg` (compat aliases: `--shadow-premium-sm`, `--shadow-card`, etc.)
- **Card System**: Clean radius (`--card-radius: 16px`), solid bg, subtle border, shadow-sm default
- **Glass Tokens**: `--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-saturate` — used sparingly on headers only
- **Navigation**: Apple-style bottom tab bar — 56px height, solid bg, single border-top, dot active indicator, 22px icons
- **Dashboard**: Clean hero with `var(--gradient-hero)`, no shimmer/decorative elements, uniform card grid
- **Radar**: Map overlay controls use solid bg + shadow-sm (no blur), clean bottom sheet, immersive weather effects (rain/snow/sun/cloud/fog/night/wind/storm overlays driven by weatherCode), Mapbox fog/light atmosphere adapts per-condition. RadarSmartSearch uses V2 unified search store.
- **Orbit**: iMessage-style conversation list, rounded-xl search, muted bg input
- **Page Shell**: Consistent padding (`pt-5 pb-3` mobile, `pt-6 pb-4` desktop), `page-fade-in` animation
- **Chart Palette**: `--chart-1` through `--chart-4` for data visualization
- **Typography**: Plus Jakarta Sans, tight tracking, font-feature-settings
- **Animations**: slide-up-fade, shimmer-sweep in Tailwind config; `--ease-silk`, `--ease-out-expo` easing tokens
- **Skeleton Loading**: `skeleton-premium` class with gradient shimmer

## Strategic Documentation
- **`docs/SUPERAPP_STRATEGY.md`** — Complete strategic analysis comparing Mondikat to WeChat & Grab, with comparative matrix, 7 strategic pillars, Forces Diagram (JTBD), and prioritized roadmap
- **`docs/SUPERAPP_ROADMAP.md`** — Phased implementation roadmap (P0→P3) with inter-pillar dependencies, technical prerequisites from existing codebase, component breakdown, KPIs, and consolidated 24-month timeline

## Canonical Schema Library (`src/lib/schema/`)
A complete canonical schema registry covering all platform domains:
- **canonical-schemas.ts**: 48 TypeScript interfaces (Identity, Organization, Listing, Transaction, Payment, Conversation, Message, etc.)
- **status-enums.ts**: 17 canonical status enums (EntityStatus, TransactionStatus, PublicationStatus, PaymentStatus, etc.)
- **relation-map.ts**: 79 canonical relations between schemas (belongs_to, has_many, has_one)
- **canonical-events.ts**: 130+ canonical event constants (colon-notation only)
- **schema-registry.ts**: 33 top-level schema registry entries with SSOT, verdicts (KEEP/MERGE/REBUILD), duplicates, conflicts
- **SCHEMA_AUDIT_REPORT.md**: Full audit report with duplicate/conflict/notation/domain reconnection status

## Event System Architecture
- **Platform Bus**: `src/lib/shared/platform-bus.ts` — Single nervous system for all domains (SOLE canonical bus), with traceId propagation on every event
- **Domain Event Bus**: `src/domains/shared/domain-event-bus.ts` — Emits EXCLUSIVELY to platformBus (no dual-fan-out)
- **Event Notation**: Canonical colon notation (`wallet:payment_completed`), legacy dot notation auto-bridged
- **Forward Bridge**: `src/lib/events/event-init.ts` — platformBus (colon) → eventBus (dot) via BRIDGE_MAP for ~60 legacy consumers. **ACTIVE — transitional, Phase 2 removes.**
- **Reverse Bridge**: `src/lib/shared/notation-bridge.ts` — eventBus (dot) → platformBus (colon) safety net. **ACTIVE — transitional.**
- **Cross-Domain Propagation**: `src/lib/orchestration/handlers/cross-domain-propagation-handlers.ts` — Marketplace→Wallet vente flow, Property→Marketplace publication, Onboarding→Dashboard
- **Notification Bridge**: `src/lib/notifications/notification-event-bridge.ts` — 25+ event→notification consumers
- **Super App Bridge**: `src/lib/super-app-bridge.ts` — Cache invalidation for all domain events

## Ultra-Solid Infrastructure Layer (`src/lib/infrastructure/`)
- **Distributed Tracing**: `distributed-tracing.ts` — End-to-end traceId propagation across bus, orchestrator, handlers. `getTraceTimeline(traceId)` returns full chronology.
- **Domain Circuit Breaker**: `domain-circuit-breaker.ts` — CLOSED/OPEN/HALF_OPEN per domain. Failed domains auto-isolated, events go to dead-letter queue.
- **Backpressure Manager**: `backpressure-manager.ts` — When listeners take >200ms, events are queued (max 500). Oldest dropped when full. Queue depth metrics per domain.
- **Flow Cycle Detector**: `flow-cycle-detector.ts` — Detects loops (>10 same events/sec) with `system:flow_loop_detected` alert. Graph-based cycle detection (A→B→C→A) at boot.
- **Boot Integrity Gate**: `boot-integrity-gate.ts` — Post-boot verification: all CORE_FLOWS have consumers, cache invalidators wired, no structural dead events. Emits `system:boot_incomplete` on failure.
- **SLA Engine Contracts**: `sla-engine-contracts.ts` — Runtime SLA verification (latency, error rate, uptime) every 60s. Engines violating SLA quarantined after 3 violations.
- **Adaptive Storm Guard**: `adaptive-storm-guard.ts` — Sliding window covering ALL event prefixes dynamically. Learns normal throughput, alerts on >3x anomalies.
- **System Health Snapshot**: `system-health-snapshot.ts` — `getSystemHealthSnapshot()` consolidates all metrics (health, flows, circuit breakers, SLA, tracing, backpressure, storm guard) into one dashboard-ready object with domain scores.
- **State Machine Enforcement**: `canonical-machines.ts` — Enhanced `transition()` with audit log + valid events on rejection. Strict mode emits `system:invalid_transition`. `validateMachineGraph()` detects orphan/unreachable states at boot.
- **Cache Layer**: `cache-layer.ts` — Three-tier cache: L1 in-memory LRU (500 entries) with per-domain TTL (profiles 5min, configs 1h, FX 15min, search 10min, media 30min) + L2 Redis via Upstash (for profiles, configs, fx-rates, listings domains) + L3 server_cache table via cache-manager edge function. `cachedFetch()` checks L1→L2(Redis)→fetch→store all tiers. `invalidateOnMutation()` clears L1 + Redis. Cache-manager edge function reads/writes Redis first, falls back to PostgreSQL server_cache table.
- **Redis Layer**: Upstash Redis integration via REST SDK (`@upstash/redis`). Server-side direct client (`supabase/functions/_shared/redis-client.ts`) using `npm:` imports for Deno edge functions — provides cache (get/set/del), lists (lpush/rpop), counters (incr/expire), presence, sessions. Frontend proxy client (`src/lib/redis/redis-client.ts`) routes all Redis operations through authenticated `redis-proxy` edge function — **no Redis credentials exposed to browser**. Env vars (server-side only): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Redis Edge Functions**: `redis-proxy` (authenticated user proxy for get/set/del/incr/expire with key prefix allowlist), `redis-enqueue` (service-role dual-write to Redis list + DB job_queue table), `presence-heartbeat` (heartbeat/offline/status/bulk_status/active_count actions).
- **Shared Redis Modules** (`supabase/functions/_shared/`): `redis-client.ts` (direct Upstash client), `redis-presence.ts` (presence CRUD with TTL), `redis-enqueue.ts` (job enqueue to Redis list with DB dual-write).
- **Presence Service** (`src/lib/redis/presence-service.ts`): Real-time user presence via `presence-heartbeat` edge function. 30s TTL, heartbeat every 15s. Online/offline status, last-seen timestamps, typing indicators (5s TTL), active-user counters.
- **Identity Cache**: `src/lib/cache/identity-cache.ts` — Now Redis-backed with 5min TTL. Local Map as L1, Redis as L2. `getCachedIdentityAsync()` for Redis read-through. Graceful fallback to in-memory only.
- **Job Queue**: `job-queue.ts` — Client-side job queue with priority (critical/high/normal/low), concurrency control (3), exponential backoff retry (1s→30s cap), abort support. Server-side `job-queue-worker` edge function now processes from Redis list (`jobqueue:pending` via LPUSH/RPOP) first, then falls back to `job_queue` DB table. Jobs written to both Redis (for speed) and DB (for audit/persistence). DLQ and poison message handling preserved. Failed jobs re-enqueued to Redis with backoff.
- **Rate Limiting**: `supabase/functions/_shared/server-rate-limiter.ts` — Now Redis-backed via INCR+EXPIRE (sliding window). Falls back to PostgreSQL `atomic_rate_limit_increment` RPC if Redis unavailable. Configurable per-endpoint limits including message sending (30/min) and login brute-force (5/min).
- **Cron Monitor**: `cron-monitor.ts` — Queries `cron_execution_log` table (admin RLS via is_admin()) for 8 known pg_cron jobs. `getCronHealthSummary()` returns healthy/degraded/critical. All existing cleanup functions wrapped with `monitored_*` variants that call `log_cron_start/finish` for full execution tracking. Auto-prune logs after 30 days.
- **Realtime Hardener**: `realtime-hardener.ts` — WebSocket reconnection with stored setupFn for proper re-subscription, exponential backoff (1s→30s), heartbeat with RTT latency sampling every 25s, zombie channel detection (3min threshold), latency metrics (avg/p95), connection state machine. Public `recordEventForChannel()` replaces private field access.
- **Connection Pooling**: Supavisor config reference in migration — transaction mode, port 6543, 30s statement timeout. `ALTER DATABASE postgres SET statement_timeout = '30s'`.

## Self-Healing Ultra Engine 2026 (`src/lib/predictive/`, `src/lib/contracts/`, `src/lib/self-healing/`)
Three predictive/proactive layers on top of the existing reactive resilience:
- **Predictive Anomaly Detector** (`anomaly-detector.ts`): Sliding-window telemetry (60s window, 5s buckets) tracks error velocity, p95 latency, heap pressure per domain. Trend slope via linear regression predicts breaches before they happen. Emits preemptive throttle signals to domain circuit breakers.
- **Boundary Contract Validators** (`boundary-validators.ts`): Schema-based validation at API, store, and bus boundaries. Auto-corrects invalid data with safe defaults. Pre-registered contracts for profile, booking, payment, message, order, wallet, cart. Bus interceptor validates event payloads before dispatch.
- **Flow State Machines** (`flow-state-manager.ts`): Enhanced state machine manager with checkpoint/rollback using existing canonical machine definitions (BOOKING, CHECKOUT, MESSAGE, AUTH). Invalid transitions trigger automatic rollback to last-good checkpoint state with zero page reload.
- **Closed-Loop Wiring** (`closed-loop-wiring.ts`): Anomaly detector → domain circuit breaker (preemptive throttling). Contract violations → incident engine + anomaly detector feedback. Flow recoveries → audit trail + anomaly detector feedback. Installed at boot in `useMasterAppBootstrap.ts` Stage 4. Metrics surfaced in `SystemHealthSnapshot` and `RuntimeCockpitReport`.

## Governance & Canonical Registries
- **9 Canonical Registries**: `src/lib/governance/canonical-registries.ts` — Domain, Event, Asset, UI Contract, Data Contract, State Machine, Permissions, Route registries with validation
- **Canonical Dedup Engine**: `src/lib/dedup/canonical-dedup-engine.ts` — 5 pluggable strategies (storefront, import, franchise, shadow, generic). Legacy engines delegate to it.
- **Entity Dedup Runner**: `src/lib/dedup/entity-dedup-runner.ts` — Full-sweep dedup engine covering 10 entity types (conversations, contacts, listings, merchants, services, media, notifications, wallet records, sessions, imports) with merge-or-reject rules and proof logging
- **Mapping Corrector**: `src/services/validation/mapping-corrector.ts` — Taxonomy/FK/metadata validation and correction with quarantine integration
- **Orphan Asset Cleaner**: `src/lib/cleanup/orphan-asset-cleaner.ts` — 4-category orphan scanner (unreferenced, abandoned, disconnected, broken CDN) with quarantine
- **E2E Flow Verifier**: `src/lib/flows/e2e-flow-verifier.ts` — 15 critical flows verified through state machines (dead button, silent drop, illegal transition detection)
- **Resilience Test Suite**: `src/lib/stress/resilience-test-suite.ts` — 7 stress tests (multi-session, reconnect, event storm, publish gate, cascading failure, rollback, dedup under load)
- **Production Lockdown Report**: `docs/PRODUCTION-LOCKDOWN-PROOF-REPORT.md` — Phase 3 final proof report with before/after comparisons
- **Vertical Boundary Guard**: `src/lib/taxonomy/vertical-boundary-guard.ts` — 16 verticals with closed taxonomies, cross-contamination guards
- **19 State Machines**: `src/lib/state-machines/canonical-machines.ts` + `src/domains/shared/state-machines.ts` — MESSAGE, CALL, UPLOAD, CONNECTION, NOTIFICATION, AUTH_SESSION, CHECKOUT, ONBOARDING, BOOKING, SUPPORT_TICKET, REPAIR, SUBSCRIPTION, PAYMENT, ORDER, DRIVER, LISTING, MATCH, MODERATION, FLIGHT
- **Canonical IDs**: `src/types/canonical-ids.ts` — `conversationId`, `entityId`, `entityType` enforced; `mapLegacyIds()` at boundaries
- **Audit Report**: `docs/GLOBAL_AUDIT_REPORT.md` — Full structural audit covering all competing sources of truth

## AWS Ecosystem Integration (S3/CloudFront, SES, Lambda/SQS)
- **AWS Client Layer**: `src/lib/aws/` — Unified AWS SDK v3 client module
  - `aws-client.ts` — Singleton S3/SES/SQS/Lambda/CloudWatch clients, credential check, health probe
  - `s3-storage.ts` — Upload/download/delete/presign/head with CloudFront URL generation
  - `ses-email.ts` — SendEmail + SendRawEmail (attachments) via SES API
  - `sqs-queue.ts` — Enqueue/receive/delete/depth for 6 named queues
  - `lambda-invoke.ts` — Invoke 4 Lambda functions (AI, media, scraping, analytics) sync/async
  - `aws-health.ts` — Aggregated health report (service status + queue depths)
  - `index.ts` — Barrel re-export
- **Edge Function AWS Shared**: `supabase/functions/_shared/`
  - `aws-ses.ts` — SES v2 email sending via AWS Sigv4 (no SDK, Deno-compatible)
  - `aws-sqs.ts` — SQS SendMessage via AWS Sigv4 (no SDK, Deno-compatible)
- **Storage Layer (S3 Primary)**: `uploadFile.ts`, `assets.ts`, `media-upload.ts` all try S3 first, fall back to Supabase Storage
  - CloudFront CDN URLs for public media, S3 presigned URLs for private documents
  - `storage_assets.metadata` now stores `s3_key` and `storage_provider` fields
- **Email Layer (SES Primary)**: `send-email` and `send-notification-email` edge functions route through SES first, SendGrid as fallback
  - Audit logs now include `provider` field ("ses" or "sendgrid")
- **Async Processing (SQS Offload)**: `job-queue-worker` offloads `ai-task`, `media-processing`, `scraping`, `analytics-aggregate` to SQS when AWS is configured
  - Falls back to existing Edge Function dispatch if SQS unavailable
  - `ai-assistant` supports `async_offload: true` for non-streaming heavy tasks via SQS
- **Health Check**: `aws-health-check` edge function reports S3/CloudFront/SES/SQS configuration and reachability
- **SQS Queues**: `easy-locs-ai-tasks`, `easy-locs-media-processing`, `easy-locs-scraping`, `easy-locs-analytics`, `easy-locs-email`, `easy-locs-dlq`
- **Lambda Functions**: `easy-locs-ai-processor`, `easy-locs-media-optimizer`, `easy-locs-scraper`, `easy-locs-analytics-aggregator`
- **IAM Policy**: `docs/AWS_IAM_POLICY.md` — Full least-privilege policy, S3 CORS, lifecycle, SQS queue specs, Lambda specs, SES domain verification steps, CloudFront config
- **Env Vars**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ACCOUNT_ID`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DOMAIN` (server-only, Supabase secrets); `VITE_AWS_REGION`, `VITE_AWS_S3_BUCKET`, `VITE_AWS_CLOUDFRONT_DOMAIN` (client, no secrets)
- **Security**: AWS credentials NEVER exposed client-side. All privileged operations proxied through Edge Functions (`s3-upload-proxy`, `sqs-enqueue-proxy`, `lambda-invoke-proxy`)
- **Fallback**: All AWS integrations gracefully fall back to existing Supabase/SendGrid if AWS credentials missing or service unreachable

## Media Pipeline & CDN
- **OptimizedImage Component**: `src/components/ui/OptimizedImage.tsx` — Unified image component with `<picture>` element (WebP + JPEG fallback), srcset for 3 sizes (200/800/1600px), LQIP blur placeholder, lazy loading, CDN cache headers
- **Media Types**: `src/lib/media/media-types.ts` — MediaAsset, MediaVariant, variant URL builders, file validation constants
- **Media Upload**: `src/lib/media/media-upload.ts` — Client-side compress (WebP) + upload to S3 (primary) or Supabase Storage (fallback) + auto-trigger media-processor edge function
- **Client Compression**: `src/families/media/transport/compress-image.ts` — OffscreenCanvas-based compression before upload (maxDim 2048, quality 82%, WebP target)
- **Edge Functions**:
  - `media-processor` — Generates 3 size variants (thumb/medium/large) via Supabase Image Transformations API, records metadata + LQIP hash in media_assets table, warms transform cache
  - `video-processor` — Records video metadata, generates thumbnail reference, stores variant info in media_assets
  - `cleanup-orphan-media` — Scheduled cleanup of storage files not referenced by any entity (listings, storefronts, properties, profiles, products). Uses `find_orphan_media` RPC
- **Migration**: `20260414700000_media_pipeline.sql` — media_assets table (bucket, path, content_type, dimensions, LQIP hash, variants JSONB, entity linkage), upsert_media_asset RPC, find_orphan_media RPC
- **Migrated Components**: RadarShopCard, RadarFoodCard, RadarPropertyCard, RadarServiceCard, RadarHotelCard, RadarResultCard, RadarEntitySheet, RadarView, ListingPhotoGallery, ExploreListingCard, RadarStoryRail, OrbitStatusSection, ServiceCard, ReviewCard, UniversalEntityCard, SellerProfileCard, PropertyGallery, TrendingSection — all now use OptimizedImage with proper width/sizes

## Onboarding Scraping Pipeline (Real Data)
- **Scraping Engine**: `src/lib/onboarding/scraping/` — Shared module for real web data extraction
  - `extractors.ts` — Pure regex extractors for photos, menus (multi-currency), phone (global patterns), address, coordinates, opening hours, emails from markdown content
  - `firecrawl-client.ts` — Firecrawl API client routed through `scrape-proxy` Edge Function (server-held API key, no client exposure)
  - `nominatim.ts` — Free Nominatim/OSM geocoding for address-to-coordinates fallback
  - `scrape-engine.ts` — High-level scrape-by-URL and scrape-by-platform-search with auto Nominatim enrichment
- **Connector Architecture**: `src/lib/onboarding/connectors/`
  - `platform-scraper.ts` — Shared scraping helper used by all 9 connectors
  - Each connector (deliveroo, talabat, careem, noon, booking, expedia, govoyage, official-web, google-business) uses Firecrawl search with site-specific domain targeting
  - Graceful fallback to stub records when scraping fails
- **Edge Function**: `supabase/functions/scrape-proxy/index.ts` — Thin proxy for Firecrawl API (search/scrape/map actions) keeping API key server-side
- **Geo Layer**: `pipeline/geo/index.ts` — Enhanced with `runGeoLayerWithNominatim()` async variant for coordinate resolution fallback
- **Persistence**: Storefront payload now writes `cover_auto_url`, `logo_auto_url`, `cover_image`, `gallery_images`, `menu_items_json`, `cover_source` for dual-layer-image system compatibility
- **Data Provenance**: Each scraped field tracked with source name and confidence score in metadata

## Architecture (Super-App v3)
- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RPC)
- **State**: React Query, custom contexts (AuthContext, I18nContext)
- **i18n**: Custom i18n system — runtime in `src/lib/i18n.tsx` (~331 lines), translation data lazy-loaded from `src/lib/i18n-data.ts` (~5300+ lines, code-split). 45 locales supported (fr, en, es, de, it, pt, nl, pl, tr, ar, ja, ko, zh, hi, th, vi, id, ms, sv, da, nb, fi, el, cs, hu, ro, hr, bg, sk, he, uk, fa, bn, sw, tl, ur, am, ha, yo, wo, ru, sl, lt, lv, et). RTL handled for ar, he, ur, fa. SUPPORTED_LOCALES source-of-truth in `i18n-advanced.ts`. All 250 countries have multi-language supportedLanguages (zero en-only). Super-app keys (home.*, radar.*, orbit.nav.*, wallet.*, dashboard.*) now fully translated for ES/DE/IT/PT/NL/TR/AR/JA (80 keys each). Merchant onboarding fully i18n'd with `mob.*` keys (90+ keys FR/EN).
- **Navigation**: 5-tab bottom nav via `src/config/navigation.ts`. Smart cross-pillar navigation via `src/lib/navigation/` (intent engine + pillar rules + overlay-first pattern + return-to-origin)

## In-App GPS Navigation
- **Store**: `src/stores/useInAppNavigation.ts` — Zustand store with `openNavigation({ lat, lng, label, mode })` / `close()` API
- **Component**: `src/components/navigation/InAppNavigationView.tsx` — Full-screen Mapbox navigation view with route polyline, distance, ETA, transport mode selector (driving/walking/cycling), recenter button, and "Open in Maps" external fallback
- **Mounted**: Lazy-loaded at App root level (`App.tsx`) for global accessibility
- **LocationViewerOverlay**: `src/components/communication-hub/chat/LocationViewerOverlay.tsx` — Now uses Mapbox map instead of OpenStreetMap iframe, with "Directions" button that opens InAppNavigationView
- **All external map redirections replaced**: ListingMapSection, LocationCard, BubbleLocationBlock, RadarEntitySheet, PersonalRadarPanel, HyperRadarPage, smart-bridge — all now open InAppNavigationView instead of Google/Apple Maps. "Open in Maps" kept as secondary fallback where appropriate.

## Geographic Explorer Module
- **Route**: `/geo-explorer`, `/geo-explorer/:countryCode`, `/geo-explorer/:countryCode/:cityId`
- **Page**: `src/pages/geo/GeoExplorerPage.tsx` — 3-level hierarchical drill-down (Country → City → District)
- **Data sources**: `country-profile-registry.ts` (12 countries, 20+ cities), hardcoded district data, weather via `openMeteoProvider`, forex via `frankfurterProvider`
- **Navigation**: Registered in menu-registry as `v_geo_explorer`, in EXPLORE_CATEGORIES, and in Radar tab matching
- **Features**: Breadcrumb navigation, animated transitions, real-time weather/forex widgets, cultural/compliance flags, district services with emoji icons, transport info, C2C active badges, not-found fallback for invalid deep links

## Autonomous 24/7 Non-Stop Engine Systems
10 interconnected server-side systems for fully autonomous operation — zero browser dependency.

### Tables (migration: `20260414300000_autonomous_engine_systems.sql`)
- `push_tokens` — FCM device tokens per user
- `dead_letter_queue` — Failed operations with exponential backoff retry
- `admin_alert_channels` — Admin notification preferences (email/SMS/Telegram/webhook)
- `admin_alert_log` — Alert history with throttling
- `system_uptime_log` — Watchdog ping results
- `rate_limits` — Server-side API rate limiting (per endpoint + IP)
- `job_queue` — Unified job queue (email, push, sync, pipeline, payment-webhook)
- `server_cache` — Server-side state cache with TTL
- `storage_backup_manifests` — Storage bucket backup manifests
- `config_snapshots` — Nightly configuration table snapshots (30-day rotation)
- `autonomy_system_status` — Dashboard status for all 14 systems

### Server Brain Tables (migration: `20260414500000_server_brain_infrastructure.sql`)
- `server_events` — Central server-side event bus replacing browser PlatformBus for system decisions. Realtime-enabled for browser read-only subscription.
- `omega_decisions` — Persistent Omega intelligence decision log (verdict, global_score, sub_scores, next_actions). Realtime-enabled.
- `agent_heartbeats` — Liveness tracking for server agents (omega-server-loop, sentinel-server-guards)
- `agent_circuit_breakers` — Per-engine circuit breaker state (closed/open/half_open). Auto-quarantine after 3 consecutive failures.
- `emit_server_event()` — PL/pgSQL function to publish events into the server bus with pg_notify
- `update_agent_heartbeat()` — Upsert heartbeat for server agents
- `record_circuit_breaker_failure()` / `record_circuit_breaker_success()` — Circuit breaker state management

### Edge Functions
- `autonomous-cron-dispatcher` — Server-side pg_cron replacement, dispatches all scheduled jobs (including omega-server-loop, sentinel-server-guards, command-center-api)
- `omega-server-loop` — Server-side Omega intelligence cycle (KG scan, priority scoring, incident detection, prediction). Runs every 5 min via pg_cron. Writes to `server_events` + `omega_decisions`.
- `sentinel-server-guards` — 5 critical Sentinel engines (Health, Conflict, Healing, Validation, Invariants) with per-engine circuit breakers. Quarantines failing engines independently.
- `command-center-api` — RESTful API for engine governance: GET status, POST approve-repair, POST quarantine, POST release, GET history, GET agents, GET events
- `send-push-notification` — FCM push notifications to registered devices
- `dlq-processor` — Dead letter queue retry processor (exponential backoff)
- `alert-dispatcher` — External alerting (email, Telegram, webhook, SMS) with 15-min throttle
- `watchdog-ping` — Full system health check + agent watchdog (v3). Monitors server brain heartbeats, auto-restarts stale agents, emits CRITICAL alert after 3 failed restarts.
- `job-queue-worker` — Priority-based job processor with DLQ integration
- `cache-manager` — Server-side cache CRUD with domain-based refresh
- `backup-storage` — Nightly storage manifest + config snapshot backup

### Server Brain Architecture
- **Omega Intelligence Loop**: Runs server-side every 5 min. Scores all 10 omega engines, analyzes incidents, generates verdicts (PASS/DEGRADED/BLOCKED/MONITOR_CLOSELY). Browser receives decisions via Supabase Realtime.
- **Sentinel Guards**: 5 independent guards with circuit breakers. Each guard can be quarantined without affecting others. Health, Conflict, Healing, Validation, Invariants.
- **Command Center API**: Full lifecycle governance accessible via API. Approve repairs, quarantine/release agents, view history and status.
- **Agent Watchdog**: Runs every minute via watchdog-ping. Checks heartbeats (10-min threshold), auto-restarts stale agents (up to 3 attempts), CRITICAL alert on dead agents.
- **Client Read-Only**: `useMasterAppBootstrap` subscribes to `server_events` and `omega_decisions` via Supabase Realtime. No local Omega/Sentinel execution. `useServerEvents` hook provides typed access to server decisions.

### Dashboard
- Route: `/admin/autonomy` — Real-time status of all 14 systems with green/yellow/red indicators, manual trigger, DLQ/job queue stats, uptime history chart, autonomy score percentage

### Shared Utilities
- `_shared/server-rate-limiter.ts` — Reusable rate limiting for all Edge Functions (429 + Retry-After)

### Browser Fallback
- `useAutoEngineCron` hook now acts as browser-side fallback that triggers `autonomous-cron-dispatcher` — actual scheduling is server-side

## Engine Scaling (Auto-Scale with App Growth — 24/7 Monitoring)
**24 orchestrated engines + 11 data-quality engines + 158 hooks** — every atom monitored.
Engine metadata registry (`src/lib/engines/engine-metadata-registry.ts`) is strictly aligned 1:1 with runtime engines.
A DEV-mode invariant check at boot validates metadata ↔ registry alignment and logs warnings on drift.
Collision priority rules for shared fields (visibility_mode, pipeline_stage, category, etc.) are documented in the metadata registry header.
All engines are wired to cover the full surface area of the app:

### Layer 1 — UI & Page Coverage
- **UI Engine** (`useUiEngine`): 364/370 pages wired — DOM observer, auto-repair, scoring on every page. 6 remaining are multi-export SEO pages.
- **Search Index**: 116+ entities (fallback data + 24 navigation pages). Auto-populates at boot.
- **Card Health Validator**: 40 cards registered. Validates at boot.

### Layer 2 — Architecture & Data
- **ARCH-GUARD**: 9 checks (SSOT, events, flows, coupling, propagation, pillar isolation). Runs every 120s.
- **Data Quality**: 11 engines (Taxonomy, Media, Duplicate, Reference, Scoring, LiveSurface, Remediation, Quarantine, SearchHygiene, AuditTrail). Sweeps at boot + every 10min.
- **Taxonomy Guard**: 20 canonical verticals locked. Runtime enforcement.

### Layer 3 — Continuous Surveillance (NEW)
- **CSS/UX Conflict Detector** (`css-ux-conflict-detector.ts`): Overlay conflicts, z-index wars, viewport overflow, scroll locks, animation jank, font inconsistency. Auto-fixes overflow and scroll traps.
- **I18n Overflow Guard** (`i18n-overflow-guard.ts`): Text overflow, button overflow, raw i18n keys in UI, placeholder leaks, RTL misalignment. Scores i18n quality.
- **Hook Health Monitor** (`hook-health-monitor.ts`): Memory pressure, orphan subscriptions, DOM node explosion, event listener leaks. Tracks heap usage.
- **Flux Pipeline Auditor** (`flux-pipeline-auditor.ts`): Event storms, dead pipelines, event throughput. Monitors 18 critical pipelines in real-time.
- **Evolution Engine** (`evolution-engine.ts`): Meta-engine that runs ALL 4 surveillance engines every 60s. Computes overall score, trend (improving/stable/declining), generates recommendations. Reports to health-aggregator. Starts at boot via AppInit.

### Layer 4 — Continuous Improvement Loop
- **Continuous Improvement** (`continuous-improvement-loop.ts`): Orchestrates ARCH-GUARD + Taxonomy + Search Purity + Card Health + Provider Quality + Listing Quality + Entry Guards + CSS/UX + I18n + Hook Health + Flux Audit + Decomposition Reporter + Slow-Flow Detector + Auto-Repair every 120s.
- **Decomposition Reporter** (`decomposition-reporter.ts`): Over-coupled modules, dead events, mismatched events, broken propagation, stale caches — wired into continuous-improvement-loop + system-lock-guard.
- **Slow-Flow Detector** (`slow-flow-detector.ts`): Latency threshold monitoring across 7 domains. Tracks p95 latency. Wired into continuous-improvement-loop + system-lock-guard.
- **Auto Repair Engine**: Detects and fixes runtime inconsistencies autonomously.
- **Runtime Pipeline**: Event ingestion, module health, super-app bridge, commerce-payment bridge, radar ingestor, intelligence orchestrator — all boot-time initialized.
- **P0 Bridge Validator** (`validate-p0-bridges.ts`): Boot-time validation of critical event bridges (20s delay). Reports pass/fail to console.
- **Canonical Registries** (`canonical-registries.ts`): Type library imported by content-governance-engine for domain validation.
- **Optimistic UI** (`optimistic-ui.ts`): Zero-latency mutation helpers — imported by system-lock-guard, available system-wide.

### Boot Sequence (Staged)
- **0s**: React mount, HashRouter
- **2s**: Sentry, GlobalHealer
- **8s**: Event system, intelligence, search index, data quality sweep
- **10s**: Super-app bridge, runtime pipeline, module health
- **12s**: Evolution Engine, architecture guard, execution proof
- **15s**: First evolution cycle (CSS/UX + I18n + Hooks + Flux)
- **30s**: First continuous improvement cycle (all engines)
- **20s**: P0 Bridge Validator (validates critical event bridges)
- **Ongoing**: Evolution every 60s, improvement every 120s, ARCH-GUARD every 120s, data quality every 10min

## 5-Pillar Routing Structure (App.tsx)
App.tsx routes are organized into clean, labeled sections:
1. **AUTH** — Login, signup, onboarding
2. **DASHBOARD (Pillar 1)** — Home, SmartHome, property management (/dashboard/*)
3. **RADAR (Pillar 2)** — Discovery, browse, food, shops, travel, mobility (/radar, /browse/*, /food/*, /shop/*, /travel/*, /mobility/*, /geo-explorer/*)
   - **Snap Map Style**: Immersive full-screen map (100% viewport), minimal floating glassmorphism controls
   - **UI at Rest**: Only search bar (top) + weather capsule (top-right) + 3 floating buttons (recenter, layers, heatmap)
   - **SnapBottomSheet**: 3 snap points (peek 72px / half 50vh / full 85vh), swipe-driven with spring animations. All results/filters inside.
   - **MapWeatherEffectsOverlay**: Full-screen CSS weather effects overlay (rain drops, snowflakes, sun rays, wind particles, fog, cloud, night, storm atmospheres). Driven by `useLiveWeatherStation` weatherCode + `effectsLevel` from weatherDisplayStore. GPU-friendly with `will-change`, `pointer-events: none`, `prefers-reduced-motion` fallback. Rendered in HyperRadarPage on top of UnifiedMap.
   - **WeatherCapsule**: Compact glassmorphism capsule with contextual micro-animations (rain drops, sun glow, snow flakes, cloud mist, wind lines, night glow), live badge, feels-like temperature
   - **NightlifeZonesLayer**: Pulsing colored circles for nightlife/event zones, HOT badge animation, vibe icons (🎵💃🔥)
   - **HeatmapModeSelector**: 3 modes (Density/Rating/Trending) with premium gradient legend, compact floating panel
   - **Key Components**: `SnapBottomSheet.tsx`, `WeatherCapsule.tsx`, `NightlifeZonesLayer.tsx`, `HeatmapModeSelector.tsx`
   - **Removed Clutter**: No more view mode toggles (map/list/hybrid), no side panels, no pillar nav in radar, no story rail in radar. Single unified flow.
4. **ORBIT (Pillar 3)** — Messaging, contacts, status (/orbit/*) — WhatsApp-grade UX
   - **Layout**: MainBottomNav hidden on /orbit. CommNavBar is the sole bottom nav on mobile, sidebar on desktop. Full-screen 100dvh layout. Back button in header to return to other pillars.
   - **5 Tabs**: Status (stories, default tab), Chats, Calls, Contacts, Settings (no duplicates)
   - **Color System**: Uses standard theme tokens (--primary, --foreground, --background, --card, --border). Semantic status colors use --hud-success/danger/warning.
   - **Status/Stories Feature**: Post text/photo/video stories with 24h TTL, gradient backgrounds, story viewer with progress bars. Videos auto-play in viewer. Stories also appear in Radar page via RadarStoryRail. Media uploads via db.storage (50MB video / 10MB image limits).
   - **Thread Dedup Pipeline**: 3-layer dedup — `getCanonicalRenderKey` (pass 1), `getIdentityKey` with peerUserId for direct threads (pass 2), `deduplicateByPeerUserId` cross-type merge in thread-mapper (pass 3)
   - **In-Chat Search**: Inline search bar in ChatHeader with result navigation (up/down arrows, highlight)
   - **Starred Messages**: StarredMessagesView dialog accessible via ChatHeader kebab menu, filters messages by starred/metadata.starred
   - **Swipe-to-Reply**: Both directions (own + received messages), visual reply indicator during swipe
   - **Media Type Indicators**: Conversation cards show camera/mic/file/location icons for last message type
   - **Animated Composer**: Spring-animated send/mic button transition, reply/edit banner with motion
   - **Typing Indicator**: Custom pulse animation with 3 dots
   - **Online Presence**: Animated ping indicator on avatar (header + card)
   - **Groups Navigation**: Uses `?thread=` query param for proper thread resolution
5. **WALLET (Pillar 4)** — Payments, orders, checkout (/wallet/*, /checkout/*, /orders/*)
6. **ME (Pillar 5)** — Complete user hub V2:
   - **Command Center** (`/me`): Quick stats (active orders, loyalty points, wallet balance), profile card with role badge, conditional merchant/property/driver sections
   - **Essentials**: Orders (`/my-orders` with quick nav to Active/Receipts/Insights), Favorites (`/favorites` with rating/category tags), Addresses (`/me/address-book` with Home/Work icons), Loyalty (`/me/loyalty-history` with tier progress Bronze→Silver→Gold→Platinum), Spending Insights (`/me/spending-insights` with monthly bar chart)
   - **Client Account**: Saved Cards (`/me/saved-cards` with credit card visuals), Receipts (`/me/order-receipts` with summary stats), Disputes (`/support/tickets`)
   - **Active Orders**: (`/my-orders/active`) Live tracking with step indicators and status pulse
   - **Gestion Immo** (`/me/gestion-immo`): Mobile-first property management hub with Bailleur/Locataire role selector, per-property KPIs, quick actions
     - Per-property detail (`/me/gestion-immo/:propertyId`): 5 tabs (Overview/Bail/Appels/Quittances/Paiements), auto-generate bail & quittances, mark payments
     - Tenant view (`/me/tenant-view`): Locataire dashboard with property info, lease details, payment history, quittance downloads
   - **Conditional Sections**: Property Management, My Shop, Driver Hub (shown based on user roles)
   - **Account**: Personal info, Security, Notifications, Preferences, Orbit, Wallet settings
   - **Support**: Help, Disputes/Tickets, Legal
7. **DEVOS / BUILDER** — Internal builder system (/builder/*):
   - **DevOS Dashboard** (`/builder`): Overall health score, domain health, engine status, navigation to sub-centers
   - **Architecture Map** (`/builder/architecture`): Domain map with health scores, route map, architecture rules (10 enforced rules)
   - **Audit Center** (`/builder/audit`): Run full audits, view violations by severity, domain health scoring
   - **Repair Center** (`/builder/repair`): Safe Patch Pipeline (10-phase: detect→classify→localize→plan→validate→apply→verify→regression→proof→accept), patch history, rollback
   - **Memory Center** (`/builder/memory`): Project rules, incident log, proof registry
   - **Deploy Center** (`/builder/deploy`): Environment status (dev/staging/prod), release readiness checks, rollback controls
   - **Core Modules**: `src/devos/` — Architecture Guard, AI Orchestrator, Audit Engine, Safe Patch Pipeline, Proof Registry, Project Memory
   - **Autonomous Runtime**: `src/devos/runtime/devos-runtime.ts` — Auto-starts on app boot via `DevOSBoot` component. Runs periodic audits (every 30min), health checks (every 5min), error storm detection (every 10s). Persists all data in localStorage (`devos:*` keys). Works 24/7 without human intervention when app is deployed.
   - **Persistence**: `src/devos/runtime/devos-persistence.ts` — All incidents, proofs, audit results, and runtime logs stored in localStorage with auto-rotation (max 200 entries per category, 500 log entries)
   - **Separation**: DevOS never owns business logic — strictly reads, audits, monitors, repairs
   - **Documentation**: `docs/devos/DEVOS_ARCHITECTURE.md`, `ARCHITECTURE_GUARDRAILS.md`
8. **ADMIN** — Admin panel (/admin/*)
9. **DEEP LINKS / QR** — Public deep links, QR resolvers
10. **SEO / LEGAL** — Programmatic SEO pages, legal pages

## Typography & Design System Standards (Structural Overhaul Complete)
- **font-black ELIMINATED**: All `font-black` removed from functional UI. Only retained in decorative watermarks (`EASY-LOCS` text with `select-none rotate`) and brand logo (`EasyLocsLogo.tsx`)
- **Typography hierarchy**: Display = `text-[28px] font-bold`. Page titles = `text-[22px] font-bold`. Section titles = `text-lg font-semibold`. Section headers = `text-[13px] font-bold`. Body = `text-sm`. Card titles = `text-sm font-semibold line-clamp-2`. Stat values = `font-extrabold tabular-nums`. Labels/buttons = `font-bold`
- **Minimum font size enforced**: All `text-[9px]` → `text-[10px]`, all `text-[12px]` → `text-xs` across entire codebase (0 violations remaining)
- **tabular-nums enforced**: All monetary values, counts, stats, prices, ratings, and numeric displays use `tabular-nums` to prevent layout shift — including financial pages (wallet, driver earnings, admin dashboards, POS, customer receipts, fraud detection)
- **Spacing standard**: Section margin = `mb-5` (20px). Section header margin = `mb-2.5`. Carousel gap = `gap-2.5`. Card width in carousels = `w-[170px]`. Padding = `px-4` consistently (removed `px-3 sm:px-4` responsive jank)
- **Design system foundation** (`ui.ts`): Complete rewrite with SPACING (10 levels 2px→64px), TEXT (25+ presets), CARD (14 variants), CARD_INNER, BTN (8 types), GRID (6 layouts), FORM, SECTION, CAROUSEL, CATEGORY, STATE, EMPTY_STATE tokens
- **CSS card type system** (`index.css`): `.card-small`, `.card-medium`, `.card-large`, `.card-story`, `.card-listing`, `.card-action`, `.card-stat`, `.card-carousel` with child selectors for `.card-image`, `.card-body`, `.card-title`, `.card-desc`, `.card-meta`, `.card-price`
- **CSS grid system**: `.grid-cards-2/3/4`, `.grid-cards-auto` with responsive breakpoints
- **CSS text clamping**: `.text-clamp-1/2/3` utilities
- **CSS alignment**: `.row`, `.row-between`, `.row-tight`, `.stack`, `.stack-tight/normal/loose`
- **Global CSS enforcement** (`index.css` §28-29): Auto-applies `overflow-hidden` to all card elements (`rounded-2xl` + `bg-card`/`border-border`) via CSS attribute selectors — eliminates 237+ missing overflow-hidden violations without per-component edits. Opt-out via `overflow-visible` class or Radix/dialog contexts. Minimum font size enforcement via CSS clamp.
- **StoryPreviewCard**: Fixed heights (`h-[170px]`, `h-[195px]`, `h-[230px]`) replaced with `aspect-[3/4]` for fluid responsiveness
- **VerticalHubPage hero cards**: Fixed height `h-[140px]` replaced with `aspect-[16/10]`
- **Sub-10px fonts eliminated**: All `text-[6px]` → `text-[10px]` across 6 delivery admin components
- **px-3 sm:px-4 jank removed**: Standardized to `px-4` across 7 files (Documents, PublicServiceBooking, chat components, AccountShowcase)
- **Section mb-4 → mb-5**: 58 section-level violations fixed across SEO pages, landing pages, admin dashboard, rental management, real estate detail, documents, platform vision, communication hub
- **Files affected**: 100+ files across all 5 pillars, travel, delivery, admin, orbit, mobility, marketplace, communication, landing, SEO components

## Unified Account Identity System
- **Single source of truth**: `useAccountIdentity()` hook (`src/hooks/useAccountIdentity.ts`) provides consistent identity across ALL app sections
- **Fallback chain**: orbit.displayName → display_name → full_name → name → first_name+last_name → username → email local-part → "User"
- **Account type**: `accountType` ("personal" | "business") + `accountLabel` ("Personal" | "Business") derived from userType/activeRole
- **Integrated in**: WalletHubPage (wallet card shows name + type), ReceiveQrPanel, MeQuickSheet, MeCommandCenter, OrbitStatusSection, WalletTransferPage, WalletRequestPage
- **Canonical identity resolution**: `resolveCanonicalDisplayIdentity()` in `canonical-helpers.ts` supports display_name, name, first_name+last_name, username, email-prefix fallbacks
- **`useResolvedIdentity`**: Enhanced with first_name, last_name, username, phone tracking in memo deps
- **`ensureOrbitProfile`**: Falls back to profiles.name when auth metadata has no display name
- **Rule**: All new UI that shows current user identity MUST use `useAccountIdentity()`. For peer/entity identity, use `useResolvedIdentity()`.

## Continuous Stability Hardening (Auto-Correction Workflow)
- **Non-null assertion cleanup**: 113 `user!.id` → `user?.id` across 64 files, 30 `org!.id` → `org?.id` across 6 files, `myProvider!.id` → `myProvider?.id`, `deal!.id` → `deal?.id`, `data!.` → `data?.`, `pc!.` → `pc?.` in WebRTC call manager, `meta.ui!.` → `meta.ui.` in normalize-message, `mapRef.current!` → `mapRef.current`, `channel!.` → `channel?.` in signaling
- **Error state coverage**: 43 user-facing pages (customer/driver/merchant/support/me) now have `isError` destructured from useQuery with proper error UI fallbacks
- **Build fix**: Fixed broken `@/integrations/db/client` → `@/services/db` import in OrbitAddContactPage
- **Design system CSS (DS-13 → DS-24)**: Card content safety (img/pre/code overflow), button touch target 44px, heading word-break, table scroll, input max-width, badge truncation, RTL icon flip + space-x-reverse, state containers, skeleton pulse animation, page section rhythm, Arabic font stack, pillar container responsive
- **Card data attributes**: AppCard emits `data-card={variant}`, CardShell emits `data-card="shell"` for CSS-level card protections
- **Sentry coverage**: 304/305 ProtectedRoute entries wrapped in FeatureErrorBoundary, reactive Sentry user context (role + orgId) in AuthContext
- **SentryRouteTracker**: Longest-prefix matching in SECTION_PREFIXES array (fixed /merchant before /me collision)

## Cycle 3 Phase 2 — Supabase Migration (Service Layer Enforcement)
- **Architecture Rule**: ALL data queries MUST use `db(table)` from `src/services/db.ts` — NEVER import supabase client directly in UI layer
- **`db()` API**: `db(table)`, `db.from(table)`, `db.rpc()`, `db.storage` — thin wrapper over supabase client
- **Migration Status**: ~77 direct supabase imports removed from UI layer (pages, components, stores, hooks)
- **customer-orders.repository.ts**: New centralized repository for all customer order queries (active, archived, receipts, reorder, spending, count, byId)
- **Remaining supabase in UI** (22 files, all legitimate):
  - **Auth boundary** (7 files): Login, Signup, ForgotPassword, ResetPassword, AuthCallbackPage, VerifyEmail, SocialLoginButtons — need `supabase.auth.*`
  - **Realtime subscriptions** (15 files): Components using `supabase.channel().on().subscribe()` for live updates — `db()` doesn't wrap realtime
- **Exempted from migration**: AuthContext, v2AuthStore, i18n.tsx (auth infrastructure), useAutoEngineCron (supabase.functions.invoke), all repositories (they ARE the service layer), lib/ service files
- **Stores cleaned**: favoritesStore, reviewsStore, avatarStore, analyticsStore (unused imports removed), adminPayoutStore (migrated to db())

## Dashboard Intelligence Engine
Context-aware dashboard brain that prioritizes content based on time-of-day, day-of-week, and user state:

### Core Engine (`src/lib/dashboard/dashboard-intelligence.ts`)
- **DayPart detection**: morning/afternoon/evening/night with contextual greetings
- **DayType detection**: weekday/weekend/holiday with behavior adjustments
- **`getContinueItems()`**: Resumable routes from smart-core feature usage (lastUsed recency, score threshold)
- **`getSuggestedPayments()`**: Context-aware payment nudges (weekend leisure, morning commute, evening bills)
- **`getPendingActions()`**: Urgency-colored reminders (profile completion, wallet setup, Orbit activation, KYC)
- **`prioritizeSections()`**: Time+weekend boost scoring for section ordering
- **`getQuickSuggestion()`**: Single contextual nudge with route + icon

### Dashboard UI Components (`src/components/dashboard/`)
- **ContinueSection.tsx**: "Continue where you left off" cards with progress indicators and time-ago
- **SuggestedPaymentsSection.tsx**: Payment suggestions with urgency-colored amounts and Jade accents
- **PendingActionsSection.tsx**: Animated action cards with urgency dots (high=red, medium=jade, low=blue)
- **ContextualNudge.tsx**: Single-line suggestion banner with gradient background

### Hook (`src/hooks/useDashboardIntelligence.ts`)
- Accepts user state (userId, hasWallet, walletBalance, unreadMessages, etc.)
- Returns continueItems, suggestedPayments, pendingActions, sectionPriorities, greeting, quickSuggestion
- Memoized with useMemo for performance

### Integration in SmartHome.tsx
- ContextualNudge after SmartQuickActions
- ContinueSection after QuickAccessStrip
- PendingActionsSection before AISmartInsights
- SuggestedPaymentsSection after SmartSuggestions

## UX Optimizations (Améliore Pass)
- **Dashboard Quick Access**: ActiveCartBanner (resume cart in 1 tap), QuickAccessStrip (Reorder/Favorites/My Orders), time-aware smart actions
- **Express Checkout**: 1-tap order from CartSheet (wallet pay, auto-resolve seller, idempotent), with fallback to full checkout
- **Restaurant Page**: Haptic feedback on add-to-cart, animated quantity controls (framer-motion whileTap), obsidian/jade floating cart CTA with pulse animation
- **Service Booking**: Auto-fills name/email/phone from auth profile (PublicServiceBooking.tsx)
- **Hotel Booking**: Smart date defaults (tomorrow/day-after) so rooms show prices immediately without manual date selection
- **i18n keys**: home.qa_reorder, home.qa_favorites, home.qa_my_orders added to FR/EN

## Flight Vertical Module (API-Ready)
World-class flight booking engine — multi-provider, state-machine driven, fully integrated with all 5 pillars. Ready to receive API keys from any GDS/OTA provider.

### Domain Types (`src/domains/flight/flight-types.ts`)
- **FlightOffer**: Complete offer with segments, baggage, pricing, fare rules, seat availability
- **FlightBooking**: Full booking with provider refs, PNR, payment mode, platform fee split, retry count
- **FlightTicket**: Per-passenger ticket with PNR, ticket number, status lifecycle
- **Passenger**: Name, passport, DOB, nationality, frequent flyer, seat/meal preferences
- **FlightSegment**: Per-leg segment with airline, aircraft, times, duration, cabin class, baggage
- **FlightProviderConfig**: Per-provider config (API URL, regions, currencies, payment mode, commission, priority, timeout, retries)

### State Machine (`src/domains/flight/flight-state-machine.ts`)
12-state strict machine: `searching → priced → selected → booking_pending → payment_pending → payment_confirmed → ticketing_in_progress → ticketed` + `failed / cancelled / refund_pending / refunded`
- `transitionFlight(current, event)` — strict transition (returns null on invalid)
- `canTransitionFlight()`, `getValidEvents()`, `isTerminalState()`
- Status metadata (label, color, icon) for UI rendering
- Re-exported from `src/domains/shared/state-machines.ts`

### Multi-Provider Adapter (`src/lib/flight/flight-provider-adapter.ts`)
- **FlightProviderAdapter** interface: search, reprice, createBooking, confirmPayment, issueTickets, cancelBooking, requestRefund, verifyWebhookSignature, getBookingStatus, healthCheck
- Provider registry: `registerProvider()` / `unregisterProvider()` / `getProvider()`
- Region-based routing: `getProviderForRegion()` for geo-aware provider selection
- Payment mode resolution: `resolvePaymentMode()` — platform / provider_direct / hybrid
- Commission engine: `computePlatformFee()` — per-provider commission split
- Dev mock adapter: `mockProviderAdapter` for development without API keys

### Services (`src/lib/flight/`)
- **flightSearchService**: Multi-provider parallel search, dedup, filtering, 5min cache, platform bus events
- **flightPricingService**: Repricing with cache, expiry check, passenger total computation (adult/child/infant pricing)
- **flightBookingService**: Full booking lifecycle — create, payment request, confirm, cancel, fail, expiry detection
- **flightTicketingService**: Ticket issuance with 3-retry exponential backoff, void support
- **flightPaymentOrchestrator**: Hybrid payment model — initiates payment (Wallet or provider), handles success/failure, auto-ticketing after payment, 15min payment timeout with auto-cancel
- **flightWebhookHandler**: Ingests 10 webhook event types, dedup (1h window), signature verification, maps to booking actions + Orbit notifications
- **flightReconciliationService**: Per-booking reconciliation, bulk reconciliation, expired booking cleanup, refund processing with provider delegation

### Flight UI Pages (`src/pages/travel/Flight*.tsx`)
Full 6-page booking flow with shared state via `flightFlowStore` (module-level store, no context provider needed):
- **FlightSearchPage** (`/travel/flight-search`): Origin/destination, dates, passengers, cabin class, trip type
- **FlightResultsPage** (`/travel/flight-results`): Sortable/filterable results, airline logos, segment details
- **FlightDetailPage** (`/travel/flight-detail`): Full itinerary, baggage, fare rules, price-change alert
- **FlightPassengerPage** (`/travel/flight-passengers`): Per-passenger forms (name, passport, DOB, nationality, preferences) — protected route
- **FlightPaymentPage** (`/travel/flight-payment`): Payment method selection, booking summary, price breakdown — protected route
- **FlightConfirmationPage** (`/travel/flight-confirmation`): Booking ref, PNR, ticket numbers, e-ticket download — protected route

### Flight Flow Store (`src/lib/flight/flight-flow-store.ts`)
- Module-level singleton store (not React context) — state persists across route navigation
- `useSyncExternalStore`-based React hook (`src/hooks/useFlightFlow.ts`) for reactive UI binding
- Actions: `search()`, `selectOffer()`, `createBooking()`, `confirmPayment()`, `reset()`
- Auto-navigates between pages on successful action completion

### Nav Config
- Bottom nav hidden on `/travel/flight-passengers`, `/travel/flight-payment`, `/travel/flight-confirmation` (checkout flow)
- Search/results/detail pages keep bottom nav visible for easy escape

### Integration Points
- **Dashboard**: Flight status in quick access, booking previews
- **Radar**: Flight discovery if applicable
- **Wallet**: Payment orchestrated via `wallet:payment_success` events, hybrid mode support
- **Orbit**: Notifications for schedule changes, refund status, booking confirmations
- **Me**: Booking history, ticket management, refund tracking

### Payment Model (Hybrid)
- `platform`: Easy-Locs collects payment, settles with provider (commission retained)
- `provider_direct`: Provider handles payment directly (Easy-Locs earns commission on fee)
- `hybrid`: Platform controls UX, routing decided per-country/provider
- Commission split: `computePlatformFee()` with per-provider percentage

### Complete Payment Stack (`src/components/payments/`)
- **Card Payment**: `CardPayment.tsx` — Stripe Elements card form with PaymentIntent flow
- **Apple Pay / Google Pay**: `AppleGooglePayButton.tsx` — Stripe Payment Request Button API, auto-detects device support
- **Mobile Money**: `MobileMoneyPayment.tsx` — M-Pesa, Orange Money, Wave via Flutterwave API
- **Crypto**: `CryptoPayment.tsx` — Bitcoin, Ethereum, USDC via Coinbase Commerce
- **Subscriptions**: `SubscriptionManager.tsx` — Solo/Team/Company plans, monthly/annual, upgrade/downgrade/cancel
- **Refund Request**: `RefundRequestButton.tsx` — User-facing refund request with reason
- **Admin Refund**: `AdminRefundPanel.tsx` — Admin approve/reject panel with Stripe Refund execution
- **Payment Method Selector**: `PaymentMethodSelector.tsx` — Unified selector for all methods

### Payment Edge Functions (`supabase/functions/`)
- `create-stripe-intent` — PaymentIntent creation for card payments
- `mobile-money-payment` — Flutterwave Mobile Money charge initiation
- `mobile-money-webhook` — Flutterwave webhook handler for Mobile Money confirmations
- `crypto-payment` — Coinbase Commerce charge creation
- `crypto-webhook` — Coinbase Commerce webhook for crypto payment confirmations
- `create-subscription` — Stripe Checkout Session for subscription sign-up
- `manage-subscription` — Upgrade/downgrade/cancel/reactivate subscriptions
- `subscription-portal` — Stripe Billing Portal session creation
- `refund-admin` — Unified refund API (request/list/approve/reject) with Stripe Refund + wallet credit
- `process-refund` — Org-level refund processing for bookings
- `stripe-webhook` — Master webhook handler for all Stripe events (subscriptions, payments, checkouts)

### Payment Repository (`src/repositories/payments.repository.ts`)
All payment functions are centralized:
- `createStripeIntent`, `createBookingPayment`, `createConciergePayment`
- `initiateMobileMoneyPayment`, `checkMobileMoneyStatus`
- `createCryptoCharge`, `checkCryptoChargeStatus`
- `createSubscription`, `manageSubscription`, `openSubscriptionPortal`, `fetchCurrentSubscription`
- `requestRefund`, `fetchPendingRefunds`, `approveRefund`, `rejectRefund`

### Flow
1. Search → multi-provider parallel → deduplicate → filter → sort
2. Select → reprice check → confirm availability
3. Create booking → hold with provider → start payment timer
4. Payment → Wallet orchestration or provider direct → confirm
5. Payment confirmed → auto-issue tickets (3 retries with backoff)
6. Ticketed → complete. Refunds/cancellations handled via state machine

## Property Booking Vertical (Unified Hotel + Property)
Airbnb-style unified booking system with short-term (hotel/vacation) and long-term (rental/buy) modes.

### Domain Types (`src/domains/property/property-booking-types.ts`)
- **PropertyListing**: Full listing with photos, amenities, host, pricing, availability, rules, cancellation policy
- **PropertyBooking**: Complete booking with guest info, pricing breakdown, payment refs, status lifecycle
- **PropertySearchParams**: Unified search supporting both modes (check-in/out for short-term, move-in for long-term)
- **PriceBreakdown**: Per-night/per-month pricing, cleaning fee, service fee, taxes, security deposit
- **PropertyHost**: Host profile with superhost badge, response rate, verification status

### Property Booking Store (`src/lib/property/property-booking-store.ts`)
Module-level singleton store (same pattern as flight-flow-store):
- `search()` → mock results with mode-aware pricing
- `selectListing()` → computes pricing based on stay duration
- `createBooking()` → generates booking with ref number
- `confirmPayment()` → supports wallet/card/bank/mobile money
- Hook: `usePropertyBooking()` (`src/hooks/usePropertyBooking.ts`) — `useSyncExternalStore`-based

### Property UI Pages (`src/pages/property/`)
6-page booking flow:
- **PropertySearchPage** (`/property/search`): Short-term / Long-term mode toggle, category pills, location/dates/guests
- **PropertyResultsPage** (`/property/results`): Card grid with sort (rating/price/reviews), instant book badge, superhost badge
- **PropertyDetailPage** (`/property/detail`): Gallery, host card with Orbit chat CTA, amenities, highlights, house rules, cancellation policy, sticky reserve bar
- **PropertyBookingPage** (`/property/booking`): Guest info form, special requests, price breakdown — protected route
- **PropertyPaymentPage** (`/property/payment`): 4 payment methods (Wallet/Card/Bank/Mobile Money), booking summary — protected route
- **PropertyConfirmationPage** (`/property/confirmation`): Booking ref with copy, stay details, guest info, payment status, host contact via Orbit — protected route

### Nav Config
Bottom nav hidden on `/property/booking`, `/property/payment`, `/property/confirmation`

## Smart Cross-Pillar Navigation
Complete overlay-first navigation system ensuring seamless user flows across all 5 pillars:

### Core Architecture (`src/lib/navigation/`)
- **navigation-intent.ts**: Action classification (inline/overlay/full), route→pillar mapping, NavigationContext type (entity/payment metadata)
- **pillar-rules.ts**: Per-pillar transition rules with upgrade conditions (e.g., dashboard→orbit defaults overlay, upgrades to full for "full_chat"/"active_call")
- **return-origin.ts**: SessionStorage-based return-to-origin system (10min TTL, route validation)

### Hooks
- **useSmartNavigation**: Central hook — resolves intent, opens overlay or navigates, carries NavigationContext through overlay state
- **useReturnToOrigin**: Auto-return after deep navigation (Wallet transfer success → back to Radar/Dashboard)

### Overlay Sheets (`src/components/overlays/`)
- **WalletQuickSheet**: Balance, 4 quick actions, recent txs. Shows "Pay [entity]" banner when opened with entity context
- **OrbitQuickSheet**: Threads, compose, calls. Shows "Contact [entity]" banner when opened with entity context
- **MeQuickSheet**: Profile summary, 6 quick links, status
- **PillarOverlayHost**: Central renderer dispatching active overlay with context forwarding

### User Flows Supported
1. Discovery: Dashboard → RadarPreviewWidget → RadarExplorerDrawer → HyperRadarPage (progressive disclosure)
2. Active Search: Radar → filters → results → entity detail → overlay actions (contact/pay/navigate)
3. Contact: Radar entity → Orbit overlay with entity pre-fill → full chat if needed
4. Payment: Any pillar → Wallet overlay with entity context → transfer → auto-return to origin
5. Business: Dashboard → Me overlay → profile/settings → full Me if deeper management needed
6. Favorites: Save from Radar → visible in Dashboard/Me → quick return to Radar

### Integration Points
- SmartHome: LiveStatsPulse + OrbitPreviewWidget use smartNavigate
- HyperRadarPage: PillarNav + handleMessageItem/Entity + RadarEntitySheet use smartNavigate
- RadarEntitySheet: Message → Orbit overlay with entity context, Pay → Wallet overlay with entity context
- WalletTransferPage: returnToOrigin on success + back button

## Taxi / Rider / Delivery Premium Experience
Ultra-fluid mobility experience comparable to Uber/Careem/Deliveroo:
- **Taxi Page** (`/mobility/taxi`): Map-first with live nearby vehicles, Obsidian header, Jade accents. 5-step flow: search → preview → requesting → tracking → completed
- **TaxiSearchScreen**: Live Mapbox map with animated drivers, recent destinations for 1-click rebook, vehicle types (Standard/Premium/XL/Moto) with ETA badges, Now/Schedule toggle
- **TaxiPreviewScreen**: Route map with Mapbox Directions API polyline (Jade line on Obsidian shadow), fare card with Obsidian background, distance/ETA/wait stats, ride options, Confirm CTA
- **TaxiRequestingScreen**: Animated radar with Jade ripple rings, status messages with check animations, cancel option
- **TaxiTrackingScreen**: Real RideLiveMap with driver/pickup/dropoff markers, full driver card (photo/name/vehicle/plate/rating), Call/Chat/Share buttons (Orbit integration), 8-step timeline (searching→accepted→arriving→at_pickup→picked_up→in_progress→arriving_dropoff→completed), live speed display
- **TaxiCompletedScreen**: Fare summary, 5-star rating, tip flow (0/5/10/20/50), bottom-sheet receipt with route details
- **Delivery Page** (`/mobility/delivery`): Obsidian header, ActiveDeliveryTracker component per active job with progress bar + rider call/chat (Orbit integration), delivery statuses (finding→assigned→heading_to_pickup→at_pickup→picked_up→on_the_way→almost_there→delivered)
- **Dashboard Integration**: SuperServicesGrid shows active rides/deliveries banners with LIVE badge for quick access
- **MobilityLiveMap**: Mapbox Directions API route polyline between pickup/dropoff (Jade line), animated nearby vehicle markers, Obsidian/Jade markers
- **Design**: All Obsidian `hsl(225 25% 7%)` / Jade `hsl(168 72% 44%)` inline styles

## Ride Domain Layer (Unified Taxi + Delivery)
Production-grade domain types, pricing engine, matching engine, and real-time tracking store for the ride-hailing and delivery verticals.

### Domain Types (`src/domains/ride/ride-types.ts`)
- **VehicleType**: standard, premium, xl, moto, bike, electric, van
- **RideStatus**: 10-state lifecycle (idle → searching → driver_assigned → driver_arriving → driver_arrived → in_progress → arriving_destination → completed / cancelled / failed)
- **DeliveryStatus**: 11-state lifecycle (pending → searching_rider → rider_assigned → rider_arriving_pickup → rider_arrived_pickup → picked_up → in_transit → arriving_dropoff → delivered / cancelled / failed)
- **RideRequest / DeliveryRequest**: Full request models with pricing, driver profile, location tracking, payment method, scheduling
- **RidePricing**: baseFare + distanceFare + timeFare + surge + booking + toll + tip - discount
- **DeliveryPricing**: baseFee + distanceFee + weightFee + rushFee + surge + serviceFee + tip
- **DriverProfile**: Full driver/rider info with vehicle details, rating, trip count, verification
- **DriverLocation**: GPS point + heading + speed for real-time tracking
- **SurgeZone**: demand/supply ratio → 5 levels (none/low/medium/high/extreme) with multiplier
- **DeliveryCategory**: food, grocery, parcel, errand, gift
- **PaymentMethod**: wallet, cash, card, mobile_money

### Pricing Engine (`src/lib/ride/ride-pricing-engine.ts`)
- **Vehicle Tier Pricing**: 7 vehicle types with tier-specific base fare, per-km, per-min, min fare, booking fee
- **Delivery Category Pricing**: 5 categories (food/grocery/parcel/errand/gift) with base fee, per-km, weight multiplier
- **Surge Calculation**: demand/supply ratio → 5 thresholds (1.0x → 2.5x), 5min expiry
- **Traffic Multipliers**: low (1.0x) → moderate (1.05x) → heavy (1.15x) → gridlock (1.30x)
- **Haversine Distance**: Real Earth-distance calculation with 1.3x road factor
- **Duration Estimation**: Speed-based from traffic level (40/30/20/10 km/h)
- **Vehicle Options**: Returns all tiers with price + ETA for fare comparison UI
- **Tip & Discount**: Built into pricing breakdown

### Matching Engine (`src/lib/ride/ride-matching-engine.ts`)
- **5-Dimensional Scoring**: proximity (35%) + rating (20%) + experience (15%) + vehicle fit (20%) + acceptance (10%)
- **Proximity Score**: Distance bands (≤1km=100, ≤3km=80, ≤5km=60, ≤10km=30)
- **Vehicle Fit**: Exact match=100, valid upgrade=60, incompatible=0 (filtered out)
- **ETA Calculation**: Driver-to-pickup ETA + pickup-to-dropoff ETA with traffic awareness
- **Mock Driver Generation**: Realistic test drivers distributed around a center point
- **Max Search Radius**: 15km default, configurable per request

### Real-Time Tracking Store (`src/lib/ride/ride-tracking-store.ts`)
- Module-level singleton store (same pattern as flight-flow-store, property-booking-store)
- **requestRide()**: Computes pricing + surge → creates RideRequest → auto-simulates driver match
- **requestDelivery()**: Computes delivery pricing → creates DeliveryRequest → auto-simulates rider assignment
- **Driver Tracking Simulation**: 2s interval GPS updates, driver moves toward target (pickup/dropoff), auto-triggers arrival events
- **Status Progression**: Automatic transitions (assigned → arriving → arrived → in_progress → completed)
- **cancelRide/cancelDelivery**: Guards against cancelling in-progress rides
- **rateRide/rateDelivery**: Post-completion rating + tip support
- Hook: `useRideTracking()` (`src/hooks/useRideTracking.ts`) — `useSyncExternalStore`-based

### Barrel Export (`src/lib/ride/index.ts`)
Re-exports all types, pricing functions, matching engine, and tracking store from single entry point.

## Intelligent Dispatch System (Uber/Careem-Level)
Complete Taxi/Rider/Delivery dispatch engine with real-time matching, anti-conflict, learning:

### Smart ETA Intelligence Engine (`src/lib/mobility/smart-eta-engine.ts`)
- **Centralized ETA service** replacing all scattered ETA calculations across the codebase
- **Mapbox driving-traffic**: All vehicle directions now use `driving-traffic` profile for live traffic-aware durations, with `duration_typical` delta for traffic impact measurement
- **Multi-factor ETA**: Combines (a) Mapbox driving-traffic duration, (b) weather multipliers via `fetchWeatherCodeAtPoint` from Open-Meteo weather provider (rain +15%, storm +30%, fog +10%), (c) rush hour patterns by day/hour, (d) nearby driver density
- **Confidence range**: Returns `etaMinutes`, `etaRangeMin`, `etaRangeMax`, `confidenceScore` (0-1), `badge` (e.g. "Pluie +3 min · Trafic dense")
- **Multi-leg delivery ETA** (`computeDeliveryETA`): 3 legs — driver→merchant (driving-traffic), merchant prep time (from DB `prep_time_minutes` with category fallbacks: food=15min, grocery=5min, parcel=2min), merchant→client. Total = max(Leg1, Leg2) + Leg3. Detects "preparing while en-route"
- **Weather→Surge connection**: `getWeatherSurgeMultiplier()` feeds degraded weather into surge pricing (rain=1.10x, storm=1.20x, fog=1.05x)
- **Sync variant**: `computeSmartETASync()` for non-async contexts (matching engine, inline ETA)

### Live ETA Refresh Hooks
- **`useSmartLiveEta`** (`src/hooks/useSmartLiveEta.ts`): Ride-centric 30s recalculation with 1s countdown and stale detection (>60s)
- **`useDeliveryLiveEta`** (`src/hooks/useDeliveryLiveEta.ts`): Delivery-specific 3-leg live ETA using `computeDeliveryETA`. Shows leg breakdown (driver→merchant, prep, merchant→client), "En préparation" state when prep dominates leg1, range + badge. Falls back to single-leg ETA post-pickup

### ETA Accuracy Tracker (`src/lib/mobility/eta-accuracy-tracker.ts`)
- Records every ETA prediction to `eta_predictions` table (booking, dispatch, live_update). Dispatch-stage predictions recorded in `smart-dispatch-controller.ts` with real job IDs; preview/booking predictions use nullable `job_id`
- `recordActualArrival()`: Computes accuracy score when ride completes — integrated into `handleRideComplete` in smart-dispatch-controller
- `getAccuracyReport()`: Rolling accuracy stats by traffic level, weather, hour
- `getCalibratedMultipliers()`: Self-calibrating weather/rush-hour multipliers based on historical accuracy

### Core Engine Files (`src/lib/mobility/`)
- **smart-dispatch-controller.ts**: Central brain — orchestrates scoring → pricing → zone → wave dispatch → offer tracking → escalation. <1s matching with progressive radius expansion (3→5→8→12→20km), 4-wave dispatch (precision→expanded→wide→emergency), integrated cron for expiry/escalation
- **unified-driver-scorer.ts**: 8-dimensional scoring (distance/acceptance/response/reliability/zone/activity/vehicle_fit/GPS quality) + 3 new intelligence signals: finishing-soon detection (riders about to complete → pre-assigned), time-of-day weighting, dynamic activity scoring (recency + experience)
- **unified-pricing-engine.ts**: Dynamic pricing with 6 multipliers: demand/supply surge, traffic (incl. gridlock), weather (incl. fog), service level, time-of-day (rush hour/late night), long-distance discount. Fare estimate with low/high confidence bands
- **pricing-ai-engine.ts**: AI pricing engine with gridlock traffic and fog weather support
- **dispatch-conflict-resolver.ts**: Atomic assignment with in-memory locking, offer.job_id cross-validation, affected-row verification, busy-rider detection, rollback on failure
- **delivery-batch-engine.ts**: Groups nearby deliveries (same pickup zone + dropoff cluster), nearest-neighbor route optimization, savings estimation. Max 4 jobs/batch, 2.5km pickup / 3km dropoff radius
- **smart-zone-manager.ts**: Real-time heat mapping (cold→warm→hot→surge), demand prediction with time multipliers (rush hour 1.8x), rider repositioning suggestions to hot zones, zone incentive bonuses, 30s cache TTL
- **dispatch-learning-engine.ts**: Continuous learning — records every outcome (dispatched/completed/failed), hourly metrics snapshots, auto-detects slow matching (>2s) / low success (<60%) / high failure (>30%), driver stats auto-update (acceptance rate, response time, completion rate)
- **dispatch-orbit-bridge.ts**: Auto-creates Orbit chat thread on rider assignment, sends system status messages at each trip phase, provides thread ID for customer↔rider communication
- **dispatch-wallet-bridge.ts**: Auto-charges customer wallet on completion (wallet → card fallback), auto-pays rider (80% net earning), idempotent via reference_id, earnings ledger per ride
- **dispatch-monitor.ts**: Health monitoring (healthy/degraded/critical), tracks active jobs, pending offers, online riders, failure rate, hot/surge zones. Alerts on critical status

### Dispatch Flow
1. Customer requests ride → `smartDispatch()` called
2. Zone intelligence fetched → demand/supply/traffic/weather assessed
3. Dynamic pricing computed (6 multipliers)
4. Driver scoring: 150 candidates max, 8 dimensions + 3 intelligence signals, finishing-soon riders included
5. Delivery batching (if applicable) → nearby orders grouped
6. Wave 1 dispatch: top 3 scored riders, 12s expiry
7. If no accept → Wave 2 (5 riders, 15s) → Wave 3 (8, 20s) → Wave 4 (12, 25s)
8. If all waves fail → radius expansion (3→20km) → `failed_no_rider`
9. On accept → conflict resolver validates atomically → Orbit chat created → tracking starts
10. On complete → Wallet auto-charge → rider paid → stats updated → learning cycle triggered

### Anti-Conflict Guarantees
- 1 job = 1 rider (atomic offer acceptance with affected-row checks)
- offer.job_id cross-validation prevents cross-job tampering
- In-memory lock prevents concurrent accept races
- Busy-rider detection blocks double-assignment
- Rollback on partial failure

## Global Revenue Engine
Comprehensive monetization layer that computes commissions, fees, and margins across every module, adapted per country/market.

### Revenue Domain Types (`src/domains/revenue/revenue-types.ts`)
- **11 RevenueModules**: wallet, flight, hotel, property, taxi, delivery, marketplace, services, orbit, advertising, subscription
- **21 RevenueStreams**: commission, service_fee, transaction_fee, subscription_fee, boost_fee, booking_commission, ride_commission, delivery_commission, marketplace_commission, currency_conversion_fee, topup_fee, withdrawal_fee, price_margin, promoted_listing_fee, premium_feature_fee, insurance_fee, cancellation_fee, etc.
- **Per-Module Revenue Configs**: WalletRevenueConfig, FlightRevenueConfig, HotelRevenueConfig, TaxiRevenueConfig, DeliveryRevenueConfig, MarketplaceRevenueConfig
- **SubscriptionPlan**: 5 tiers (Free/Starter/Pro/Business/Enterprise) with per-tier limits, commission discounts, boost credits
- **BoostPackage**: Quick Boost (1d), Weekly Spotlight (7d), Monthly Premium (30d), Sponsored Listing (14d) — per-module applicability
- **CountryPricingConfig**: Per-country purchasing power, commission adjustment, fee adjustment, tax rate, payment processing rate
- **PricingDecision**: Full breakdown of revenue computation with adjustment factors and per-line breakdown

### Global Revenue Engine (`src/lib/revenue/global-revenue-engine.ts`)
Per-module revenue computation with country-adaptive pricing:
- **Wallet**: Transaction fee (1.5% + $0.25), currency conversion spread (2.5%), top-up fee (2%), withdrawal fee (1%), international transfer (3%), escrow (2%)
- **Flight**: Booking commission (6%) + price margin (3%) + service fee ($12) + ancillaries (insurance 30%, seat $5, baggage 15%) + cancellation (10%) + change ($25)
- **Hotel**: Booking commission (12%) + service fee (8% + $5) + last-minute margin (5%) + cancellation (15%)
- **Taxi**: Ride commission (20%, premium 25%) + service fee ($1.50) + surge revenue share (25%) + wait time ($0.30/min) + scheduled premium ($2) + cancellation ($3)
- **Delivery**: Delivery commission (25%) + merchant commission (15%) + service fee ($1) + small order fee ($2 under $10) + rush premium (50%) + peak surcharge (20%) + long distance ($0.50/km over 5km)
- **Marketplace**: Sale commission (10%) + service fee (3%) + payment processing (2.9%) + promoted listing ($3/day) + featured ($10) + refund handling ($1)
- **Subscriptions**: Free → $9.99/mo Starter → $29.99/mo Pro → $79.99/mo Business → $249.99/mo Enterprise (yearly discount ~17%)
- **Boosts**: $4.99 Quick Boost → $19.99 Weekly Spotlight → $49.99 Monthly Premium → $34.99 Sponsored
- **Loyalty Discounts**: Bronze (0%) → Silver (5%) → Gold (10%) → Platinum (15%) applied on top of computed revenue

### Country Pricing Strategy (`src/lib/revenue/country-pricing-strategy.ts`)
20 country configs across 4 market tiers:
- **Premium** (AE, US, GB, SA, JP): Full pricing, 100% commission rates
- **Mature** (FR, DE, KR): 90-95% commission adjustment, slight fee reduction
- **Developing** (MA, EG, TN, TR, BR, MX): 65-70% commission, 40-50% fees — purchasing power adapted
- **Emerging** (IN, SN, CM, NG, ID, PH): 50-55% commission, 25-30% fees — aggressive market penetration
- `adjustPriceForCountry()`, `computeTaxAmount()`, `getPaymentProcessingCost()`

### Revenue Analytics Engine (`src/lib/revenue/revenue-analytics-engine.ts`)
- **`computeGlobalSnapshot()`**: Total revenue, per-module breakdown, per-country breakdown, top streams, conversion rate, user LTV, ROI
- **`computeModuleBreakdown()`**: Per-module revenue by stream, growth %, projected monthly
- **`computeConversionFunnel()`**: Visitors → Sign-ups → Active → Paying → Repeat (with drop-off rates)
- **`computeUserLTV()`**: Gross/net LTV from avg order value × frequency × lifetime × commission rate
- **`computeModuleROI()`**: Dev cost + operational cost vs revenue → ROI %, payback months, profit margin
- **`projectRevenue()`**: Monthly revenue projections with compound growth
- **`identifyRevenueOpportunities()`**: Auto-detects inactive modules, declining revenue, low conversion, missing subscription/advertising

### Barrel Export (`src/lib/revenue/index.ts`)
Single entry point re-exporting all types, computation functions, country configs, and analytics.

### Updated Monetization Config (`src/lib/monetization-config.ts`)
Expanded from 8 to 21 revenue streams, 7 to 18 commission rate types, 5 to 12 display entries. Aligned with global revenue engine.

## World-Scale Architecture Plan
`WORLD_SCALE_ARCHITECTURE_PLAN.md` (1,476 lines) — Full 12-section strategic architecture plan + 3 addendums:
- **12 Sections**: Current Reality Audit, Platform Danger Map, Dependency Graph, Safe Target Architecture, Modular Engine Blueprint, Next-Gen Differentiators, Guardrails, Phased Roadmap (0-9), Risk Matrix (11 risks), First Implementation Batch, No-Go Areas, Final Strategic Recommendation
- **3 Addendums**: (A) Data Architecture — operational/analytical separation, CanonicalEvent schema, retention/privacy, consent boundaries, canonical IDs, data prerequisites for AI; (B) Country Rollout Framework — 5-category checklist, 4-stage activation, rollback with emergency exceptions; (C) Engine Ownership Matrix — all 6 engine families with read deps, write permissions, block/remediate capabilities, rollback switches
- **Recommended Path**: Path D — "Smart Foundation with Strategic Differentiation" — Phases 0-5, 14-18 weeks
- **Key Rules**: Governance engines are OBSERVATIONAL/ADVISORY only (except AutoRemediation scoped to restarts/cache). No "fallback to hardcoded" — shadow-mode comparison only. Geo Hierarchy is FOUNDATION-CRITICAL (8 downstream deps, schema must freeze before consumers wire). Country rollback: active orders complete unless legal/fraud/payment-critical emergency.

## Key Directories
```
easy-locs-ea1eb0ed/
├── src/
│   ├── pages/           # Route pages organized by domain (admin/, food/, wallet/, merchant/, driver/, etc.)
│   ├── components/      # UI components (wallet/, orbit/, radar/, dashboard/, navigation/, etc.)
│   ├── app/             # app-route-registry.tsx (centralized lazy imports for all pages)
│   ├── lib/             # Core utilities (i18n.tsx, wallet/, orbit/, engines/)
│   ├── engines/         # 80+ autonomous engines (AI, self-healing, security, performance, data, UX, business, monetization)
│   │   ├── core/        # BaseEngine, EngineOrchestrator, EngineObserver, SelfPilot
│   │   ├── ai/          # AIAnalysis, CodeSuggestion, RuntimeAnomaly, PolicyGuard, AgentIntelligence, AutomationPipeline
│   │   └── ...          # security/, performance/, self-healing/, data/, uiux/, business/, observability/, release/
│   │   NOTE: Engine loading is tiered — Tier 1 (critical: self-healing, performance, realtime, wallet, security, orbit, calls, radar, data)
│   │         loads immediately; Tier 2 (architecture, code-quality, uiux, business, support, observability, release, AI analysis)
│   │         loads lazily 8s after boot to reduce initial CPU/bundle overhead.
│   ├── config/          # Navigation config (navigation.ts), app constants
│   ├── integrations/    # Supabase client
│   ├── services/        # SSOT service layer — all DB access centralized through db() function
│   │   ├── db.ts          # Central db(table) function — ONLY way to access Supabase tables
│   │   ├── storefront.service.ts  # Storefront pages, catalog, orders, menu items
│   │   ├── customer.service.ts    # Loyalty, profiles, wallet txns, orders
│   │   ├── admin-ops.service.ts   # Activity logs, notifications, ranking, debug, test batches
│   │   ├── merchant.service.ts    # Merchant CRUD, analytics, summaries
│   │   ├── fleet.service.ts       # Fleet management, rider presence
│   │   ├── property.service.ts    # Properties, leases, tenants, documents
│   │   ├── boost.service.ts       # Boost campaigns, creatives
│   │   ├── pos.service.ts         # Point of sale operations
│   │   └── (9 more: user, wallet, order, orbit, marketplace, revenue, referral, subscription)
│   └── repositories/    # Data access layer (all using centralized db() function)
├── supabase/migrations/ # SQL migration files (573 files)
└── public/              # Static assets
```

## User Trust System (Level 0-4) — Comprehensive Security Architecture
Central transverse security layer influencing Wallet, Orbit, Dashboard, Radar, Me, payments, and onboarding.

### Trust Levels (`src/lib/trust/trust-levels.ts`)
- **Level 0 (Unverified)**: score<10, no transactions (all limits 0)
- **Level 1 (Verified)**: score≥10, basic wallet (2K daily/5K recv/8K weekly/500 per tx/2K topup)
- **Level 2 (Active)**: score≥30, QR+request (5K/15K/25K/2K/5K)
- **Level 3 (Trusted)**: score≥60, KYC required (20K/50K/80K/10K/20K)
- **Level 4 (Premium)**: score≥85, full access (100K/200K/500K/50K/100K)

### Trust Engine (`src/lib/trust/user-trust-engine.ts`)
5-signal weighted scoring (0-100):
- **Identity** (25%): phone, contacts, KYC, account age
- **Activity** (20%): sessions, orbit interactions, engagement
- **Financial** (25%): completed/failed payments, disputes
- **Behavior** (15%): moderation flags, reports, location coherence
- **Security** (15%): device stability, KYC, location

### 7-Level Security Flags (expanded)
- **normal**: full access, multiplier 1.0
- **low_risk**: score<20 or new account, multiplier 0.8
- **suspicious**: score capped 45, OTP required, multiplier 0.5, orbit restricted
- **review_required**: score capped 35, KYC+manual review, multiplier 0.3
- **high_risk**: score capped 20, KYC+manual review, multiplier 0.1
- **restricted**: score capped 10, wallet frozen, all txs blocked
- **blocked**: score=0, account suspended, wallet frozen

### Graduated Action System (`src/lib/trust/trust-actions.ts`)
- `computeGraduatedResponse()`: Per-flag action set (allow/otp/reduce_limits/kyc/freeze/block)
- `shouldRequireOtp()`: Per-action OTP enforcement based on flag
- `getEscalationPath()` / `getDeescalationPath()`: Flag progression chains
- `canUpgradeLevel()`: Level upgrade gating with flag+KYC checks

### Fraud Detection Engine (`src/lib/security/fraud-detection-engine.ts`)
Real-time + deferred fraud analysis:
- **Circular transfers**: Detects A↔B loops with volume thresholds
- **Chain transfers**: Rapid sequential sends to many recipients
- **Mule accounts**: 70%+ passthrough ratio, multi-source → multi-destination
- **Rapid account usage**: New accounts with immediate high activity
- **Geo-inconsistency**: Multiple countries in 7 days
- **Device anomaly**: Excessive device changes
- **Abnormal amounts/topups**: Statistical outlier detection
- **Relationship graph**: `analyzeAccountRelationships()` for network risk

### Device Trust (`src/lib/security/device-trust-bridge.ts`)
- Device profiles: trusted/known/new/suspect status lifecycle
- Fingerprint tracking with change detection
- Multi-device monitoring (3+ devices → suspect flag)
- WebDriver/automation detection
- `evaluateDeviceTrust()`: Returns trust signal updates for engine
- `markDeviceTrusted()` / `revokeDeviceTrust()` / `clearAllDevices()`

### Security Event Logger (`src/lib/security/security-event-logger.ts`)
Structured observability for all security events:
- 35+ event types (OTP, login, session, device, tx, fraud, KYC, trust changes)
- 4 severity levels: info/warning/alert/critical
- Buffered async persistence to `security_events` table
- `logTransactionBlocked()`, `logFraudSignal()`, `logTrustLevelChanged()`, etc.
- Query APIs: `querySecurityEvents()`, `getCriticalEvents()`

### Transaction Risk Log (`src/lib/security/transaction-risk-log.ts`)
- Every transaction gets risk entry: score, flag, result, device, country
- `recordTransactionRisk()` with async persistence
- `queryTransactionRiskLog()` for audit queries
- `markAsReviewed()` for manual review workflow

### Country-Aware Limits (`src/lib/trust/country-limits.ts`)
- 13 country configs (US/GB/FR/DE/NG/KE/IN/AE/SA/BR/JP/CA/AU) + default
- Per-country multipliers on all limit types
- Per-country KYC trigger thresholds
- `resolveEffectiveLimits()`: trustLevel × flag × country → final limits

### KYC Light (`src/lib/trust/kyc-light.ts`)
- Progressive: not_started → pending → selfie_required → document_required → under_review → completed/rejected/expired
- Auto-triggers: level upgrade ≥3, >20 payments, moderation flags, 2+ device changes

### Anti-Fraud Guard (`src/lib/security/anti-fraud-guard.ts`)
- `preTransactionCheckWithTrust()`: Flag-adjusted rate/velocity/amount limits
- 7-flag TRUST_ADJUSTED_LIMITS (blocked/restricted → 0, high_risk → 2 tx/min, etc.)
- Risk score augmentation: +10 low_risk, +20 suspicious, +30 review_required, +40 high_risk

### Wallet Limits (`src/lib/wallet-limits.ts`)
- `preflightTransactionCheck()`: Unified check (single tx + daily + weekly + topup + receive)
- `getCountryAwareLimits()`: Country × trust × flag resolved limits
- `checkWeeklyLimitByTrust()`, `checkTopUpLimit()`, `checkReceiveLimit()` — new limit dimensions
- Backward-compatible: `checkDailyLimit()` + `mapTrustLevelToLegacyTier()` still available

### Cross-Pillar Trust Hooks (`src/hooks/useTrustGuard.ts`)
- **`useTrustGuard()`**: Central hook — canSend/canReceive/canTopUp/canRequestMoney, limits, graduated response
- **`useOrbitTrustGuard()`**: Orbit-specific — canMessage/canInvite/isRestricted
- **`useRadarTrustGuard()`**: Radar-specific — isDemoted flag for discovery ranking
- **`useBusinessTrustGuard()`**: Business accounts — canAcceptPayments/canUsePOS/canReceivePayouts

### React UI
- **`useTrustScore`** hook: Live user signal computation
- **`TrustLevelBadge`**: Compact/full badge with 7-flag colors + progress bar
- **`TrustLimitsCard`**: 3×2 grid (daily send/receive, weekly, per tx, topup, level)
- Integrated in WalletSecuritySettings
- **`useWalletSecurity`** hook (`src/hooks/useWalletSecurity.ts`): Shared security state (PIN status, device binding, daily limit from DB) used by both WalletSecurityPanel and WalletSecuritySettings — eliminates duplication

### Wallet Security
- **PIN lockout**: Unified 15-minute lockout across all edge functions (wallet-pin, wallet-transfer, wallet-ops)
- **PIN flow**: Single server-side verification only — PinEntryDialog collects PIN and passes to `onVerified(pin)`, no client-side `pinRepo.verifyPin()`
- **Biometric**: Disabled (TODO) — server-side WebAuthn verification not implemented. WalletSecurityPanel shows "Coming soon", WalletSecuritySettings button disabled
- **Idempotency**: Transfer idempotency key generated at click time via `crypto.randomUUID()`, persisted for retries
- **Note validation**: wallet-transfer enforces max 500 chars for `note` field
- **Money formatting**: Canonical `formatMoney` from `@/lib/format` used everywhere (no inline `Intl.NumberFormat`)
- **Atomic wallet-ops**: SQL RPCs created (`wallet_authorize`, `wallet_settle`, `wallet_reverse`) in migration `20260414210000_wallet_ops_atomic_rpcs.sql` — edge function has TODO to switch from multi-step updates

## Phone + OTP Identity Activation System
The app uses phone number + OTP as the root identity activation method. Phone is the default auth tab on both Login and Signup pages.

**Architecture**:
- `src/lib/auth/phone-identity.ts` — Phone verification service (send OTP, verify code, sign in/up)
- `src/lib/auth/identity-activation-pipeline.ts` — Post-OTP chain with retry/backoff: account → orbit profile → wallet → contact sync offer
- `src/lib/contacts/contact-sync-service.ts` — Contact sync service for platform discovery (batch phone matching, native Contacts API)
- `src/components/auth/PhoneOTPFlow.tsx` — 3-step animated UI (phone input → 6-digit OTP → verified) with phone format validation, cooldown, provider health gating
- `src/components/auth/ContactSyncPrompt.tsx` — Post-signup contact sync prompt with privacy notice

**Flow**:
1. User enters phone number → OTP sent via `send-otp` edge function + stored hash in `phone_otp_sessions`
2. User enters 6-digit code → SHA-256 hash compared, rate-limited (5 attempts, 10min expiry)
3. On verification: `signInOrSignUpWithPhone()` resolves existing user or creates new
4. `runIdentityActivation()` pipeline: ensure user profile → ensure orbit profile (phone_verified) → ensure wallet → emit platform event
5. New users get contact sync prompt before redirect; returning users redirect immediately

## Auth Provider Health-Check System
- `src/lib/auth/provider-health.ts` — Checks availability of Phone/Google/Apple providers at startup with 5min cache TTL
- `src/hooks/useAuthProviders.ts` — React hook exposing `{ phone, google, apple, loading, error, refresh }`
- Providers are verified via dry-run OAuth (skipBrowserRedirect) and provider-not-enabled error detection
- `SocialLoginButtons` conditionally renders Google/Apple based on provider health; `PhoneOTPFlow` shows disabled state with configuration hint
- Lovable OAuth fallback has been removed to prevent split sessions (Lovable creates sessions not recognized by Supabase RLS)

## Auth Diagnostic Page (`/auth/diagnostic`)
- Protected route at `/auth/diagnostic` for real-time auth system status
- Shows: current session info, provider health status (phone/Google/Apple), and a "Run Full Test" suite
- Runtime tests: Supabase auth service, provider availability, OAuth redirect URL validation, callback route, session persistence, identity pipeline status
- Results logged to console and displayed in the UI
- Configuration guide section with step-by-step Supabase provider setup instructions

**Security**: Hash-based OTP (never stored plain), 5 sessions/30min rate limit, 5 attempt max per session, 10-minute expiry.

## Supabase Project
- **Project ID**: `ifvuvbolrmuuugtzxsfk`
- **Region**: `ap-southeast-1`
- **Tables**: 618+ including profiles, wallet_accounts, wallet_transfers, orbit_contacts_v2, orbit_identity_profiles, conversations_v2, chat_messages_v2, orbit_groups, orbit_device_keys, etc.
- **Migrations**: 573 files in `supabase/migrations/`
- **RPC Functions**: 40+ (ensure_wallet_account, atomic_wallet_transfer, has_role, etc.)
- **Storage Buckets**: 13 (avatars, chat-attachments, chat-media, property-photos, documents, vault, etc.)

## i18n Pattern
- Keys use dot notation: `wallet.txStatus`, `auth.signIn`, `orbit.messaging`
- Always add FR first, then EN in `src/lib/i18n.tsx`
- Bottom nav uses canonical i18n (`src/lib/i18n-canonical.ts`)
- Transaction types use `wallet.txType*` keys with fallback to humanized enum

## UI/UX Design Standards
- **Typography minimum**: Never use `text-[7px]` or `text-[8px]` in consumer-facing components. Labels minimum `text-[9px]`, interactive text minimum `text-[10px]`/`text-xs`.
- **Card minimum width**: Carousel cards `min-w-[170px]`, category icons `w-[72px]`; always use `shrink-0` on fixed-size items.
- **Text overflow handling**: All card titles need `line-clamp-2 break-words`, subtitles `line-clamp-1`/`line-clamp-2`, single-line elements use `truncate`. Long text in flex children always add `min-w-0`.
- **Spacing standard**: Dashboard sections `mb-4`, section headers `text-[13px] font-bold`. "See all" links must be `shrink-0` to prevent squishing.
- **Quick actions**: Minimum `h-11` with `text-[11px]` labels and `min-w-0 truncate` for overflow safety.
- **Stats grid**: Labels minimum `text-[9px]`, values minimum `text-xs`, icons minimum `h-4 w-4`.
- **Obsidian/Jade design tokens**: `--primary: 225 25% 7%` / jade accent `168 72% 44%`. Dark-mode-first "Obsidian & Jade" palette — jade teal primary accent with deep obsidian backgrounds. PWA hex: `#1AAE8E`.
- **Bottom nav**: Height is 72px (`--mobile-bottom-nav-h`). Hidden on `/login`, `/signup`, `/orbit`, `/checkout`, `/pay/`, `/order/`. Fixed CTAs on pages WITH bottom nav must use `bottom: calc(var(--mobile-bottom-nav-h, 72px) + env(safe-area-inset-bottom) + 8px)`.
- **Page shell**: Use `app-mobile-page` class alone (provides min-height, safe-area padding, bottom padding). Do NOT add `app-mobile-content` redundantly — it sets the same padding-bottom.
- **Non-standard Tailwind values**: `h-13` is NOT in the default spacing scale. Use `h-[3.25rem]` instead.

## Dashboard Taxonomy & Service Sections
The home screen (SmartHome) has 3 distinct service sections, each covering a unique set of categories with zero overlap:

1. **SuperServicesGrid** (8 cards, 4-col grid): Food, Taxi, Delivery, Hotel, Flights, Seasonal, Real Estate, Services
   - Routes: `/food`, `/mobility/taxi`, `/mobility/delivery`, `/travel/stays`, `/travel/flights`, `/seasonal-rentals`, `/property`, `/services-hub`

2. **EssentialServicesStrip** (8 POI icons, horizontal scroll): Hospital, Pharmacy, Police, Fire, Park, ATM, Fuel, Parking
   - All route to `/radar?category=utility&subcategory=X` where X matches canonical taxonomy values
   - Subcategory values: `hospital`, `pharmacy`, `police_station`, `fire_station`, `park`, `atm`, `fuel_station`, `parking`

3. **CategoryGrid** (5-col grid): Shows ONLY categories NOT in SuperServices — Grocery, Shops, Pharmacy, Beauty, Utility
   - Exclusion managed in `smart-home-engine.ts` via `SUPER_SERVICE_KEYS` set
   - Routes use canonical `/browse/:vertical` pattern

**Canonical taxonomy**: `src/lib/taxonomy/category-tree.ts` (12 primaries, 110+ subcategories incl. fine_dining, pakistani, boutique, hostel, apartment_hotel, premium, bike)
**Adapter layer**: `src/lib/taxonomy/world-class-taxonomy.ts` (backward-compat, radar category mapping, service mode + time relevance enrichment for ALL subcategories)
**Classification engine**: `src/lib/taxonomy/classification-engine.ts` — 70+ brand dictionary entries (food, stay, mobility, property, healthcare chains)

## Story Taxonomy
- **story-taxonomy.ts** auto-derives MEDIA_FAMILY and INTENT mappings from category-tree.ts (zero manual gaps)
- **story-types.ts** — StoryType includes `service`, `grocery`, `shops`; StoryEntityType includes `parking`, `pharmacy`, `hospital`, `fleet`, `vehicle`, `provider`
- `getTaxonomyCoverage()` audit function verifies zero unmapped subcategories
- Cross-domain contamination checks prevent property stories in food feeds, etc.

## Import Engine (Pre-Import Validation)
- **Scrape Decision Gate** (`src/lib/import-engine/scrape-decision-gate.ts`): Pre-import validation that runs BEFORE the pipeline
  - Blocks: no_name, gibberish_name, invalid_gps, exact_duplicate
  - Warns: no_location, gps_ocean, low_classification_confidence, vertical_mismatch, placeholder_image, no_contact, suspicious_phone, empty_catalog
  - `evaluateBatchScrapeDecisions()` processes batches with cross-record dedup
  - Integrated into orchestrator as Step 0 (skippable with `options.skipScrapeGate`)
- Pipeline: SCRAPE_GATE → DEDUP → MERGE → ENRICH → QUALITY → PUBLISH_GATE → OUTPUT

## Discovery Engines (V2)
Three specialized engines power the Radar discovery experience:

### Hyper Radar Engine (`src/lib/engines/hyper-radar-engine.ts`)
- Time-slot detection with caching, category matching via `CATEGORY_SETS`
- Weighted guidance scoring (rating × distance), multi-type guidance (suggestion/discovery/trending)
- `computeRadarStats()` for real-time discovery statistics
- `matchesLayer()` for unified category-to-layer matching

### Vibe & Density Engine (`src/lib/engines/vibe-density-engine.ts`)
- 8 vibe classifications: calm, active, nightlife, business, family, luxury, trendy, cultural
- Peak status tracking (off_peak/building/peak/winding_down)
- Result caching (60s TTL, LRU 100 entries) for instant re-renders
- Rich metadata: vibeEmoji, vibeLabel, tags, peakStatus

### Behavior Pattern Engine (`src/lib/engines/behavior-pattern-engine.ts`)
- 9 zone activity categories with seasonal awareness
- Richer flow predictions with `alternativeActions`
- Expanded complementary place connections (25 max, 60 entity limit)
- Zone rhythm with emoji + transition hints

## Wallet Currency System
- Centralized in `src/lib/wallet/wallet-config.ts`
- Precedence: stored app_country → browser locale → EUR fallback
- Country-currency mapping in `src/lib/geo/country-currency-map.ts` (shared, no React dependency)
- All wallet files use `getWalletDefaultCurrency()` / `WALLET_FALLBACK_CURRENCY`

## Design System V3 — Unified Harmony Layer

### Token Source of Truth: `src/config/ui.ts`
All components must use design tokens from this file instead of ad-hoc values:
- **SPACING**: 2xs through 2xl, maps to CSS vars
- **RADIUS**: sm (8px) to full (9999px)
- **SHADOW**: card, cardHover, elevated, jade
- **TOUCH**: min (44px iOS standard), navItem (56px), bottomNav (72px)
- **ICON_SIZE**: 2xs (12) to 2xl (32)
- **Z**: z-index scale — base(0), dropdown(10), sticky(20), overlay(30), modal(40), popover(50), toast(60), tooltip(70), topNav(80), bottomNav(90), max(100)
- **MOTION**: animation presets — fast/normal/slow durations, spring configs, enter animations
- **BREAKPOINT**: xs(340), sm(640), md(768), lg(1024), xl(1280), 2xl(1400)
- **TEXT**: 20+ semantic typography presets (pageTitle, cardTitle, subtitle, caption, badge, stat, etc.)
- **CARD_STYLES**: base, interactive, carousel, carouselWide, settings, elevated, glass
- **BTN**: primary, secondary, ghost, icon, quickAction
- **CAROUSEL**: container, containerSnap, item, itemWidth, itemWidthWide
- **SECTION**: container, header, headerTitle, headerAction
- **CATEGORY**: card, label, icon, strip, stripLabel
- **STATE**: disabled, loading, error, success, active, hover
- **EMPTY_STATE**: container, icon, title, description
- **PAGE**: container, containerWide, containerFull, header, section, sectionCompact

### Premium Design Tokens (`src/components/ui/design-system.ts`)
Exported constants for consistent use across components:
- **SPACING**: xs(0.25rem) through 3xl(4rem)
- **RADIUS**: sm(0.5rem) through full(9999px)
- **SHADOW**: subtle, medium, elevated
- **TYPOGRAPHY**: display, heading, title, body, caption, overline

### CSS Component Classes (`index.css`)

**Dark mode palette** (primary): bg `hsl(225 25% 6%)`, card `hsl(225 22% 9%)`, border `hsl(225 18% 14%)`, muted-fg `hsl(215 10% 50%)`, accent `hsl(168 72% 44%)`

**Pillar-shared classes (app-*):**
- **Page headers**: `.app-page-header`, `.app-page-header-btn` (36px, rounded-xl, muted/30 bg)
- **Typography**: `.app-page-title`, `.app-page-title-icon`, `.app-section-label`, `.app-section-link`
- **Tabs & Filters**: `.app-tab-bar` + `.app-tab[data-active]`, `.app-filter-bar` + `.app-filter-btn[data-active]`
- **Cards & Lists**: `.app-card` (flat card, border/8 opacity), `.app-list-row` + `.app-list-row-icon`, `.app-list-divider`
- **Stats & Actions**: `.app-stat-chip` (bordered stat tile), `.app-quick-action` + `.app-quick-action-icon` + `.app-quick-action-label`
- **Insights**: `.app-insight-card` (gradient border card with shimmer support)

**Design System utility classes (ds-*):**
- **Carousels**: `.ds-carousel` (proximity snap), `.ds-carousel-snap` (mandatory snap) — auto-applies shrink-0 + snap-align to children
- **Sections**: `.ds-section-header`, `.ds-section-title`, `.ds-section-action`
- **Category cards**: `.ds-category-card` (72px width, 74px min-height), `.ds-category-label` (2-line clamp)
- **Essential strip**: `.ds-strip-item`, `.ds-strip-icon`, `.ds-strip-label`
- **Quick actions**: `.ds-quick-action`, `.ds-quick-action-label` (truncated)
- **Stats**: `.ds-stat-item`, `.ds-stat-value`, `.ds-stat-label`
- **Empty states**: `.ds-empty`, `.ds-empty-icon`, `.ds-empty-title`, `.ds-empty-desc`
- **Skeletons**: `.ds-skeleton`, `.ds-skeleton-text`, `.ds-skeleton-title`, `.ds-skeleton-card`
- **Errors**: `.ds-error`, `.ds-error-title`, `.ds-error-desc`

**Glass & banner classes**: `.glass-card`, `.glass-card-strong`, `.banner-premium`, `.banner-highlight`
- `.fullscreen-view` for 100dvh immersive layouts
- `.section-divider`, `.pulse-ring`, `.nav-active-glow`

### CSS Custom Properties (`:root`)
- Z-index scale: `--z-base` through `--z-max` (0-100)
- Animation timing: `--duration-fast/normal/slow`, `--ease-default/spring/bounce`
- Mobile nav: `--mobile-bottom-nav-h: 72px`

## Super-App Engine System
The app runs 3 autonomous engines (deferred-loaded 3s after first paint):

### Module Intelligence (`src/engines/core/module-intelligence.ts`)
- Tracks which of the 5 modules (Dashboard/Radar/Orbit/Wallet/Me) is active
- Smart refresh: only invalidates data when you navigate TO a module, not continuously
- Cross-module event propagation: wallet transfers refresh dashboard + orbit automatically
- Stale data detection: marks modules dirty when cross-events fire, refreshes on next visit

### Network Optimizer (`src/engines/core/network-optimizer.ts`)
- Aggressive query caching: wallet-balance 30s, threads 30s, radar 120s, profile 5min
- Network-aware: detects 2g/slow connections → ultra-cache mode (5min stale, 0 retries)
- Request deduplication: prevents duplicate in-flight requests
- Saves battery and data on mobile

### Self-Pilot (`src/engines/core/self-pilot.ts`)
- Visibility-adaptive: 45s active / 120s hidden tab intervals (no wasted cycles)
- Auto-repairs: retries failed queries, garbage-collects stale cache
- Memory monitoring: surgical removal of inactive stale queries when heap > 80% (not full clear)
- Visibility-aware: runs check + reschedules on tab focus

## Cross-Section Bridge (`src/lib/super-app-bridge.ts`)
- Wallet→Dashboard: transfer completed → refresh live stats
- Wallet→Orbit: payment completed → refresh threads
- Marketplace→Dashboard: booking confirmed → refresh counters
- Orbit→Dashboard: message received → refresh unread count

## Module Isolation & Communication
Each pillar is designed to be SEPARATE with zero direct cross-imports between pillar domains.
All inter-pillar communication flows through:
1. **platformBus** (`src/lib/shared/platform-bus.ts`) — Event bus with dot/colon notation bridge
2. **NOTATION_BRIDGE** — Automatic dot↔colon event translation (wallet.payment.success ↔ wallet:payment_success)
3. **Architecture Guard** — Continuous monitoring (120s interval) validates pillar isolation, coupling score, SSOT, event integrity

The `event-init.ts` bridge maps platformBus events → eventBus handlers (one direction only, no amplification).
Colon-notation wallet events removed from BRIDGE_MAP to prevent double-processing via NOTATION_BRIDGE.

## Performance
- **Boot time**: ~490ms (optimized: i18n code-split, 20+ shell components lazy-loaded)
- **Provider stack**: Minimal eager providers (ThemeProvider, QueryClient, I18n, Tooltip, Auth, Call, Payment, AppLockGuard). Effect-only providers (GlobalExperience, UiQuality, BrowserTelemetry) converted to lazy `*Init` components inside Suspense — no wrapping overhead.
- **Removed dead wrappers**: SplashScreen (no-op pass-through), RealtimeProvider (empty context), AppHealthGuard (duplicate of AppHealthBanner in CanonicalShellRuntime)
- **Phase 0 (immediate)**: queryClient + orchestration + orbit cache + flow bridge
- **Phase 1 (2s)**: platform reactions + notifications + counters
- **Phase 2 (5s)**: all 13 domain cache listeners
- **Phase 3 (idle)**: E2EE warmup (requestIdleCallback, ~4s fallback)
- **Phase 4 (10s)**: flow registry + stale scanner + auto-repair + realtime health
- **Phase 5 (20s)**: full engine system boot
- **Phase 6 (30-45s)**: architecture guard + platform recovery
- **Production log stripping**: Vite esbuild.drop removes ALL console/debugger in prod builds
- **Dev-only logging**: All hot-path event bus, command bus, analytics, and handler logs guarded by `import.meta.env.DEV`
- **Monitoring init**: Deferred to `requestIdleCallback` (non-blocking)
- **Code splitting**: Pillar-level chunks (pillar-dashboard, pillar-radar, pillar-orbit, pillar-wallet, pillar-me) + 15+ vendor chunks + role-based chunks (pages-admin, pages-merchant, pages-driver, pages-pro, pages-seo, pages-customer, pages-seller, pages-builder, pages-real-estate)
- **Deferred providers**: CallProvider and UnifiedPaymentProvider lazy-loaded 1.5s after mount (not needed for first paint)
- **Tier 2 engines dev-only**: 36 analysis/code-quality engines only load in development mode
- **Bundle reduction**: index.js 545KB → 412KB (24% smaller critical path)
- **Bundle analysis**: `rollup-plugin-visualizer` generates `dist/bundle-report.html` on production builds. `npm run build:analyze` for full report. `npm run check:bundle` CI script alerts if any chunk > 200KB.
- **Route prefetching**: Intelligent hover-based prefetch (`route-prefetch.ts`) + viewport-based IntersectionObserver prefetch. Predictive pillar prefetching based on navigation patterns (e.g., dashboard→wallet transition).
- **Per-module prefetching**: Adjacent routes preloaded when entering a module
- **Web Vitals tracking**: Dual reporting — native PerformanceObserver (`web-vitals.ts`) + `web-vitals` library (`web-vitals-reporter.ts`). Metrics (LCP, FID/INP, CLS, TTFB, FCP) sent to PostHog with device type, connection type, viewport, and page path metadata. Thresholds: LCP < 2.5s, CLS < 0.1, INP < 200ms.
- **DB Performance indexes**: Migration `20260415000000_performance_indexes.sql` — B-tree indexes on user_id/created_at/status for listings, properties, transactions, orders, conversations, leases, bookings, reviews, notifications. GIN indexes for full-text search on listings, properties, messages, profiles, service providers. Composite indexes for common filter patterns.
- **Slow query monitoring**: Migration `20260415100000_slow_query_monitoring.sql` — pg_stat_statements enabled, `admin_slow_query_log` table with 500ms threshold, `capture_slow_queries()` function, `admin_slow_queries_latest` view for dashboard, 30-day auto-cleanup.
- **Lazy geo/permissions**: GeoBoot, PermissionBootstrap lazy-loaded
- **No SW/cache purge**: Removed forced purge on every boot for better repeat load perf
- **Stale files cleaned**: scripts/ directory, ORBIT_AUDIT.md, ARCHITECTURE.md removed

## GitHub
- **Repo**: `easy-locs/easy-locs-` (trailing dash)
- **Push**: Use `/tmp/gh_push.sh` (recreate via GitHub connection token if missing)

## Security
- E2EE on Orbit (Signal Protocol: X3DH + Double Ratchet)
- Supabase RLS on all tables
- Wallet identity binding (device fingerprint)
- Architecture Guard: 9-pass continuous monitoring (120s) — includes pillar isolation check
- **QR Anti-Spoofing**: QrPayResolver always resolves recipient name from database (never trusts URL `name` param). Shop QR resolves via `storefront_pages` lookup before payment.
- **Merchant QR Signatures**: Upgraded from basic XOR hash to FNV-1a + Murmur2 dual-hash with time-windowed salt (2-minute validity + backward compat for legacy `mqr_` prefixes)
- **Anti-Fraud Guard**: Rate limiting (10 tx/min, 3 orders/min), idempotency (5-minute TTL), velocity tracking (max 15 unique recipients/hour), rapid succession detection (max 3 tx in 5s), hourly volume cap (25K), risk scoring (0-100), temporary user blocking
- **Payment Security**: Pre-transaction fraud checks on all wallet transfers, QR payments, and orders. Post-transaction recording for idempotency.

## Smart Bridges (Cross-Module Communication)
- **Platform Bus**: Central nervous system — dot and colon notation events with NOTATION_BRIDGE for bi-directional mapping
- **Super App Bridge**: Consolidated cache invalidation — all query invalidation now flows through platformBus event reactions (no more direct `queryClient.invalidateQueries` bypassing events)
- **Dashboard Cascade Fix**: Dashboard events now refresh wallet + business + communication modules (was only business)
- **Payment Failed Handler**: `wallet:payment_failed` events now properly invalidate wallet balance/transaction caches
- **Order Events Harmonized**: Uses `marketplace:order_created` instead of legacy `ORDER_CREATED` uppercase

## Phase 3 System Audit (April 2026)

### Architecture
- **Service Layer**: 13 SSOT services in `src/services/` — all critical consumer + admin pages migrated from direct DB access
- **Data Flow**: Pages → Services → Supabase client. No `(supabase as any)` in migrated pages
- **Ownership Scoping**: All service mutations require userId/orgId parameter for IDOR prevention
- **Error Handling**: Full error boundary wraps entire app with retry + AI audit integration

### Stabilization Pass (April 2026)
- **Platform Bus Type Safety**: All 15 `as any` casts in storefront-reactions.ts replaced with typed payload interfaces (StorefrontOrderPayload, StorefrontCartPayload, etc.). v4-delivery-bridge.ts double-casts removed. engineConnectorHub.ts `as any` → `Record<string, unknown>`.
- **catch(e: any) Cleanup**: AuthContext, Login, Signup, CheckoutPage, Onboarding, POSPage, RiderLivePage, DocumentBuilder, BookingForm, ProviderStorefront, engineConnectorHub — all converted to `catch(e)` + `instanceof Error` pattern.
- **i18n Hardening**: SmartBottomSheet "Ouvert"/"Fermé" → t("common.open")/t("common.closed"), ClientMapCard, MessageList "Today"/"Yesterday", LocationViewerOverlay "Live Location"/"Sharing live", BookingAvailabilityCalendar "Select date"/"Unavailable"/"Selected" — all using t() keys. New canonical keys: common.results, common.select_date, common.live_location, common.location, common.sharing_live, common.open_in_maps, common.unavailable, common.selected (EN/FR/AR).
- **Quality Gates Enhanced**: 6 new architecture rules (no-catch-any, no-as-any-payloads, no-direct-supabase, error-boundary-required, no-usestate-any, suspense-fallback-required).
- **Delivery Bridge Bootstrap**: installDeliveryBridge() now wired in useMasterAppBootstrap stage-1 (was missing).
- **UI Robustness**: AIAssistant calc(100vh) → calc(100dvh), BookingForm price=0 fallback with Number() guard, useState<any> → Record<string, unknown> in ReviewsManagerPanel + ProviderStorefront.

### Startup Performance
- **Story audit deferred**: `fallback-stories.ts` audit IIFE moved to `setTimeout(5s)` gated by `import.meta.env.DEV` — zero startup cost in production
- **DNS prefetch corrected**: `index.html` preconnect/dns-prefetch now points to correct Supabase project (`ifvuvbolrmuuugtzxsfk`), removed unused `ai.gateway.lovable.dev`
- **Auth safety timeout**: `AuthContext` clears safety timeout once `getSession()` resolves — no more late-fire state clobbering
- **Guest flow**: Null sessions immediately set `profileLoaded(true)` — no safety timeout fires for guests
- **Realtime guards**: `useUnreadMessages` checks `user?.id` before creating channels — no 400 errors on guest pages

### Realtime
- **Central Factory**: `src/lib/realtime.ts` — all channels use `createRealtimeChannel`/`removeRealtimeChannel`
- **Hooks Standardized**: useReconAlerts, useWalletAccounts, AdminRealtimeControlPage use central factory
- **Cleanup**: All hooks return cleanup functions with proper channel removal

### State Management
- **Primary**: 50+ Zustand stores (orbitStore canonical, mapStore unified)
- **Infrastructure**: React contexts for auth, realtime, calls, navigation
- **Migration Status**: Orbit moving to mono-entry (orbitDispatch), geo stores fusing to unified mapStore

### Security
- **Service scoping**: fetchTicketById, updateTicket, deleteStatus, fetchById, updateStatus all require userId
- **Input sanitization**: walletService.fetchTransactionForUser sanitizes userId for PostgREST .or() filter
- **Error handling**: toggleFavorite checks errors on all 3 DB operations (select, delete, insert)

### Critical Column Naming Convention
- **wallet_accounts table**: Uses `owner_user_id` for user FK (NOT `user_id`)
- **wallet_balances_v2 view**: Uses `user_id` (normalized)
- **unified_wallet_transactions**: Uses `sender_id` / `recipient_id`
- **typed-queries.ts**: All wallet queries use correct column names

### Address Management
- **SettingsAddresses** (`/settings/addresses`): Real DB — reads/writes `user_addresses` table
- **CustomerAddressBookPage** (`/me/address-book`): Real DB — reads/writes `user_addresses` table (unified with SettingsAddresses)
- Both use `supabase.from("user_addresses")` pattern for CRUD

### Durable Workflow Engine
- **Engine**: `src/lib/workflows/workflow-engine.ts` — step-based durable orchestrator with retry (exponential backoff), rollback, timeout, state persistence (localStorage)
- **Property Workflows**: `src/lib/workflows/property-workflows.ts` — 7 workflow definitions (createProperty, publishProperty, viewing, maintenance, leaseCreation, rentPayment, documentCompliance)
- **Integration**: Property creation page (`MePropertyCreatePage.tsx`) uses workflow engine when `enable_property_workflows` flag is enabled; falls back to direct service call otherwise
- **API**: `startWorkflow(definition, context)`, `resumeWorkflow(id)`, `getWorkflowStatus(id)` — events emitted via `platformBus`

### Real Estate CRM Layer
- **Types**: `src/domains/real-estate/crm-types.ts` — Lead, Pipeline, CrmTask, ViewingRecord, ConversionMetrics with lead scoring
- **Service**: `src/services/real-estate-crm.service.ts` — leadService, crmTaskService, crmViewingService, crmAnalyticsService (full CRUD with snake_case mappers)
- **Tables**: `re_leads`, `re_crm_tasks`, `re_viewings` (Supabase)

### Property Automation Engine
- **Engine**: `src/lib/engines/property-automation-engine.ts` — 9 built-in rules (rent reminders, document expiry, lease renewal, vacancy alerts, lead scoring, viewing reminders, SLA breach, overdue payment, lease near-expiry)
- **Bootstrap**: Initialized at boot stage-3 via `useMasterAppBootstrap.ts` → `initPropertyAutomation()`
- **API**: `addAutomationRule()`, `removeAutomationRule()`, `evaluateRules(context)`, `getActiveRules()`

### Resilience Patterns
- **Library**: `src/lib/resilience/resilience-patterns.ts` — withDoubleClickGuard, withOfflineQueue, withRetryBackoff, withSessionGuard
- **Quality Gates**: Extended `src/lib/quality-gates.ts` with 8 new rules (no-unsafe-casts, resilience-guards-required, workflow-required, no-parallel-taxonomy, data-contract-stability, country-rules-required, me-wallet-separation, offline-recovery-required)
- **Health Scoring**: `computeVerticalHealth()`, `computeGlobalHealthScore()` — per-vertical health monitoring with performance/data-quality/ux/stability breakdown

### Feature Flag Targeting
- **Registry**: `src/lib/growth/feature-flag-registry.ts` — 6 new flags (enable_real_estate, enable_property_crm, enable_property_automation, enable_property_workflows, enable_resilience_layer, enable_durable_workflows)
- **Targeting**: `evaluateTargetedFlag(flag, context)` with country/vertical/role/percentage dimensions and include/exclude operators
- **Rules**: Property CRM restricted to admin/agent/property_manager roles; automation restricted to admin/property_manager

### Property Dashboard Widget
- **Component**: `src/components/dashboard/PropertyDashboardWidget.tsx` — owner mode (KPIs: properties, occupancy, tickets, leases + recent properties + maintenance alerts) + buyer mode (marketplace quick-access: Buy/Rent/Short Stay)
- **Integration**: Wired into SmartHome.tsx after OrbitPreviewWidget

### Orbit Property Conversations
- **Types**: 5 new ConversationType variants: property_lead, property_viewing, property_manager, property_landlord, property_maintenance
- **Config**: All 5 added to CONV_TYPE_CONFIG with emoji/label/color
- **Context Panel**: HudContextPanel extended to load property context for all property_* conversation types

### Radar Property Layer
- **Layer**: "property" added to LAYER_DEFS, CATEGORY_SETS, CATEGORY_TO_LAYER in HyperRadarPage + hyper-radar-engine
- **i18n**: `radar.layer_property` translated in all 10 languages (EN/FR/ES/DE/IT/PT/NL/TR/AR/JA)

### Smart Cross-Section Bridge
- **Engine**: `src/lib/smart/smart-bridge.ts` — resolves contextual actions for any entity (merchant, contact, listing, service, hotel, property)
- **UI Component**: `src/components/smart/SmartEntityActions.tsx` — renders action pills/grid/compact buttons with loading states
- **Entity builders**: `buildEntityFromMerchant()`, `buildEntityFromContact()`, `buildEntityFromListing()`
- **Actions**: message, voice_call, video_call, phone_call, whatsapp, order, book, taxi_to, deliver_from, view_shop, pay, share, save_contact, navigate
- **Integrations**: ShopPage (merchant CTA row), CommContactsSection (contact detail sheet)
- **Route contract**: Shop links → `/s/{slug}`, Pay → `/wallet/transfer`, Taxi → `/mobility/taxi`
- **Platform bus events**: `mobility:set_destination` for taxi-to-entity, `orbit:contacts_updated` for save-contact

### RadarPage Map Integration
- `filtered` from radarStore is converted to GeoEntity format via `radarPointsToGeoEntities()` 
- Map entities are wired to UnifiedMap with click-to-navigate (slug → `/s/{slug}`)
- Categories filter via discovery store → fetchCanonicalDiscovery pipeline

### Supabase Import Convention
- **ALL files** using `supabase.from()`, `supabase.auth`, `supabase.storage`, `supabase.rpc` MUST import: `import { supabase } from "@/integrations/supabase/client"`
- The `db()` wrapper from `@/services/db.ts` is preferred for table queries (`db("table_name")`)
- 45+ repository and lib files fixed in April 2026 sweep to add missing supabase imports (was causing "Can't find variable: supabase" runtime crashes)
- ~60 files still use direct supabase imports (Cycle 3 target)

### Multi-Cycle Stabilization Progress (April 2026)
**Cycle 1 — Global Audit + Critical Fixes: COMPLETE**
- Button asChild crash fix (Slot single-child)
- 20+ dead navigation links fixed across all pillars
- Error state handling added to 12+ critical pages
- Dashboard visual deduplication (removed triple "Complete profile")
- i18n missing keys added (EN + FR)
- AI streaming AbortController + cleanup
- Canonical EmptyState adoption (`src/components/ui/EmptyState.tsx`)
- **Mock Data Elimination (Task #95)**: All `generateMock*` functions removed. property-booking-store uses real Supabase queries. ride-tracking-store shows "Service en cours de déploiement" instead of fake drivers. Creator service returns empty analytics instead of random data. Flight mock provider guarded from production use.
- **Runtime Mock Guard**: `src/lib/guards/mock-data-guard.ts` — Detects and blocks mock data patterns (IDs, titles, provider refs) in production via `assertNoMockData()`, `assertNoMockTitle()`, `guardMockProvider()`
- `/dashboard/activities` redirect added to App.tsx
- Route corrections: /auth→/login, /dashboard/seasonal→/seasonal-rentals, /dashboard/pricing→/dynamic-pricing, /dashboard/channel-manager→/channels, /dashboard/rental→/rental-management, /dashboard/properties→/real-estate, /mobility/receipt→/order/receipt, /business/my-shops→/dashboard/my-shops, /dashboard/assistant→/dashboard/ai

**Cycle 2 — Full Application Rectification: COMPLETE**
- T001: Fixed 30+ remaining stale routes (/dashboard/rental→/rental-management across 12 files, /dashboard/communication→/orbit across 15+ files, dead dinoAudit/dinoControl helpers removed, /browse/retail→/browse/shops, /dashboard/activities→/activities in shared routes)
- T002: FeatureErrorBoundary added to ALL sub-routes: 3 Orbit, 10 Wallet, 23 Me sub-routes now crash-isolated
- T003: AppInit.tsx silent console.warn→logger.warn/error (monitoring.ts), Login/Signup generic "Something went wrong"→actual error.message in all 5 auth flows
- T004: OrbitPreviewWidget forced mx-4 mb-5 margins removed (parent now controls), OrbitAppShell deprecated dispatcher→notificationV2Store.startRealtime
- T005: UnifiedOrderDetailPage reorder window.location.hash→navigate() (React Router compatible)
- Test expectations updated: production-stabilization.test.ts + advanced-regression.test.ts aligned with new routes

**Cycle 3 — Sentry-driven Production Cleanup + UI Normalization**
- T001: SentryRouteTracker wired into App.tsx, FeatureErrorBoundary now reports to Sentry with featureName/componentStack/retryCount context
- T001: ALL Dashboard sub-routes (40+), checkout/order routes (20+), settings routes (9), merchant routes (33), driver routes (15), seller/business routes (3) wrapped in FeatureErrorBoundary
- T001: AuthContext setUserContext enriched with activeRole for Sentry tagging
- T002: CSS DS-10 (flex/grid child min-width:0 overflow safety), DS-11 (stat-value tabular nums), DS-12 (scroll-lock for modals)
- T003: PropertyDashboardWidget skeleton loading state (was returning null), Finances StatCard loading prop (was showing "..."), OrdersPage user!.id→user?.id, CheckoutPage 3x user!.id→user?.id
- Coverage: Every authenticated route now has FeatureErrorBoundary + Sentry capture

### Typography Minimum Standards
- **Minimum text size**: `text-[9px]` for labels, `text-[10px]` for interactive/body text, `text-xs` (12px) for standard content
- **NEVER use**: `text-[7px]` or `text-[8px]` — globally replaced in April 2026 sweep
- **Card labels**: Always `break-words` + `line-clamp-2` on constrained-width containers
- **Flex children**: Always `min-w-0` on text containers inside flex parents that use `truncate`
- **EssentialServicesStrip**: `w-[58px]` items, `text-[9px]` labels, `gap-2`
- **CategoryGrid**: `w-[76px]` cards, `text-[10px]` labels with `break-words`

## Engine Wiring Verifier (Task 39)
A `WiringVerifier` module (`src/engines/core/wiring-verifier.ts`) validates the full 13-phase engine chain in strict sequence, producing a structured `WIRING_REPORT` with PASS/FAIL/WARN per phase.

### 13 Phases Validated
- **Phase 0 (Freeze)**: Repair storm inactive, manifest sealed, no high-multiplicity bus listeners, kill switches configured
- **Phase 1 (Registry)**: Every engine registered in orchestrator with unique ID/domain/category, no orphan/phantom engines in sentinel
- **Phase 2 (Version Lock)**: No v1/v2 coexistence per domain, no versioned bus event names, domain health tracked
- **Phase 3 (Taxonomy Lock)**: Taxonomy registry populated, no conflicting aliases, no orphan taxonomy entries
- **Phase 4 (Contracts)**: All sentinel engines have complete SentinelEngineContract (11 required methods), critical engines prioritized
- **Phase 5 (Orchestrator)**: Orchestrator booted, ≥80% engines running, no circular loops, storm inactive
- **Phase 6 (Repair Pipeline)**: Pipeline enabled, all 7 stages present, proof stats healthy, repair rate below storm threshold
- **Phase 7 (Proof System)**: Proofs generated with root cause, low rollback rate, validation failures below threshold
- **Phase 8 (Observability)**: All engines have tick metrics, observer tracking, health monitor active, activation sheets present
- **Phase 9 (E2E Flows)**: Core flows (login, session, chat, message, media, call, wallet, notification) have engine/bus coverage
- **Phase 10 (Learning)**: Learning pipeline not in storm, high-performers outweigh low-performers, memory stats clean
- **Phase 11 (Optimization)**: Optimizer ran, no flagged duplicates or inactive engines
- **Phase 12 (Hardening)**: No storm, no loops, no duplicates, rollback rate ≤20%, invalid proof rate ≤30%

### Key Files
- `src/engines/core/wiring-verifier.ts` — WiringVerifier class, runWiringVerification(), getWiringReport()
- `src/pages/admin/AdminWiringReportPage.tsx` — Admin UI at `/admin/wiring-report`
- `src/engines/engine-registry.ts` — Auto-runs verification 15s after boot

## Engine System (Phase 1.5 — Active Only)
Engine system trimmed from 135+ detect-only engines to **5 active engines** that produce real corrections. All passive/monitoring engines disabled (files retained for future Phase 2 reactivation). Registered in `src/engines/engine-registry.ts`.

### Active Engines (5)
1. **AutoFixEngine** (`sh-auto-fix`, 45s) — Offline→online recovery, active stale-query refetch after idle threshold (300s), memory pressure detection
2. **SyncRepairEngine** (`rt-sync-repair`, 45s) — Detects sync gaps >5min, removes stale Supabase channels, triggers targeted reconnect (max 3 retries with cooldown)
3. **UnreadIntegrityEngine** (`rt-unread-integrity`, 60s) — Detects/corrects unrealistic unread counts (>9999→0), fixes negative badge counts
4. **ConversationConsistencyEngine** (`orbit-conversation-consistency`, 30s) — Detects duplicate DOM conversation nodes, signals re-dedup via orbit:thread_updated; escalates to orbit:force_reload (immediate full thread rebuild bypassing debounce) after 3 consecutive duplicate cycles
5. **TaxonomyRuntimeEngine** (`data-taxonomy-runtime`, 30s) — Corrects wrong category emojis in DOM, detects unknown categories/verticals using RADAR_CATEGORIES as SSOT

### Disabled Engines (130+, files retained)
- Tier 1 passive: ErrorClassifier, RollbackEngine, SilentRecoveryService, PerfAnalyzer, RenderOptimizer, QueryOptimizer, CachePolicyEngine, NetworkLatencyEngine, PresenceHealthEngine, MessageReconcileEngine, RetryReplayEngine, LedgerIntegrityEngine, ReconciliationEngine, FraudWatchEngine, PayoutSafetyEngine, FXConsistencyEngine, ZeroTrustEngine, SessionRiskEngine, DeviceTrustEngine, PolicyHardener, AnomalyDetector, MessageDeliveryEngine, MediaFlowEngine, GroupIntegrityEngine, OptimisticUIEngine, CallHealthEngine, NetworkAdaptationEngine, ReconnectEngine, MediaQualityEngine, LocationIntegrityEngine, GeocodeRepairEngine, ProviderMatchingEngine, RoutingQualityEngine, ETAAccuracyEngine, MenuNormalizer, ServiceNormalizer, PropertyNormalizer, HotelNormalizer, TaxonomyEnforcer, CurrencyPolicyEngine, all 13 governance engines, GeoHierarchyEngine
- Tier 2 (DEV-only, 36 engines): architecture, code-quality, uiux, business, support, observability, release, AI scan engines
- Tier 3 (quality, 22 engines): taxonomy, canonical-mapping, profile, address, module-link, routing, UI polish, data cleaning, SEO, dead code/flow, wallet/orbit/radar quality, property, country rules, automation, observability, test enforcement, feature flags, quality score
- AI subsystem (agent-intelligence, automation-pipeline): no longer auto-started from registry; still dynamically importable from AdminAIControlCenter

### Legacy Governance Types (retained, not actively enforced)
- **SmartCoreTracker** → `trackPageOpen`/`updatePageState` on every route change (page open reliability) + dedup guard via `createPageOpenDedupKey`
- **UniversalActionButtons** → `trackActionClick` on every CTA execution (dead click detection) + `isClickDuplicate` guard
- **media-utils** → `validateMedia` governance check on every file upload (observational, never blocks)
- **order-lifecycle** → `registerFlow`/`updateFlowState` on every order transition (flow closure tracking)
- **send-text pipeline** → `validateText` governance check on every message send (observational, never blocks)
- **AuthContext** → `reportRuntimeFailure` on DB health down, hydration timeout, sign-out errors (Phase 3 coverage gap fix)
- **walletStore** → `reportRuntimeFailure` on payment failures (Phase 3 coverage gap fix)
- **flight-payment-orchestrator** → `reportRuntimeFailure` on payment timeout, ticketing deferred, payment failure (Phase 3 coverage gap fix)
- All wiring is **observational/advisory only** — governance never blocks user actions or rendering

### Anti-Duplication System (Phase 3)
- **Dedup Service**: `src/services/governance/governance-dedup.ts`
  - `isDuplicateViolation(dedupKey)` — 5s sliding window, 2000 max cache
  - `computeDedupKey(v)` — generates key from type+source+target+severity
  - `isClickDuplicate(actionKey)` — 1s click dedup for UIs
  - `createPageOpenDedupKey(route)` — dedup guard for React double-effect remounts
  - Automatic cache cleanup via interval timer
- **Persistence-level dedup**: `persistViolation()` calls `isDuplicateViolation()` before DB write; also handles `23505` unique constraint gracefully
- **All 13 engines emit `dedupKey`** in every violation — enables DB-level unique constraint on `(dedup_key) WHERE status = 'new'`

### Violation Persistence (Phase 2 + Phase 3 Hardened)
- **DB Table**: `governance_violations` (base migration `20260412200000` + hardening migration `20260413000000`)
  - Base columns: id, type, severity, source, target, message, owner_domain, vertical, detected_at, resolved_at, auto_remediated, metadata (JSONB)
  - Phase 3 columns: engine, route, correlation_id, dedup_key, entity_type, entity_id, code, status (new/acknowledged/resolved), acknowledged_at
  - Phase 3 indexes: engine, route, correlation_id, dedup_key (unique where status='new'), code, status, created_at
  - RLS: authenticated users can SELECT/INSERT/UPDATE
- **Persistence Service**: `src/services/governance/violation-persistence.ts`
  - `persistViolation()` — dedup-aware, maps all new fields to DB columns
  - `persistViolations()` — batch with dedup filtering
  - `fetchViolations()` — supports all filter fields (severity, type, engine, route, code, status, vertical, ownerDomain)
  - `fetchViolationCount()`, `fetchViolationsByEngine()`, `fetchViolationsBySeverity()`
  - `acknowledgeViolation(id)`, `resolveViolation(id)` — status lifecycle management
- Uses `db()` helper exclusively (never imports supabase directly)

### Control Room Pro (Phase 3)
- Admin Control Room "Governance" tab with full violation management:
  - **Summary cards**: Total violations, Unresolved, Auto-Remediated, Arch Debt, Dedup Cache Size
  - **Per-engine stats**: Page Open, Action Wiring, Runtime Health, Flow Closure, Auto-Remediation
  - **Violations by Engine**: Breakdown showing critical/error/warning/info counts per engine
  - **Engine grid**: 13 engines with violation counts, clickable to filter
  - **Filterable violation list**: Filter by severity, engine, status, free-text search
  - **Expandable detail view**: Full violation metadata, engine, code, dedupKey, route, correlationId, entityType/Id
  - **Action buttons**: Acknowledge / Resolve status transitions with DB persistence
  - Merges in-memory + DB violations (deduped by ID, sorted by detectedAt)
  - Auto-refreshes every 10 seconds

### Phase 5: Runtime Excellence + Zero-Conflict Automation (COMPLETE)
- **Runtime Safety Layer** (`src/lib/runtime/runtime-safety.ts`): Centralized coordination — sweep lock, cooldown (5s), circuit breaker (3 fails → 60s open), loop detector (10/30s), singleton registry, event dedup (500ms), bounded retry, flow timeouts, convergence proof runner
- **Engine Execution Hardening**: `execution-orchestrator.ts` wired with acquireSweepLock/releaseSweepLock, shouldSkipIncrementalSweep gates both scheduled + CronOrchestrator paths, performance timing
- **Non-Blocking Guarantees**: All surface-protector + story-taxonomy + search-index-populator methods wrapped in try/catch → fallback show all (never crash user flow)
- **Event Bus Discipline**: Bounded fan-out (MAX_LISTENERS_PER_EVENT=50, MAX_GLOBAL_LISTENERS=30), correlationId on PlatformEvent, __bridged loop prevention, listener stats via getListenerStats()
- **State Machine Hardening**: `safeTransition()` with duplicate event guard (200ms), `isTerminal()`, `getValidEventsForState()` in `state-machines.ts`
- **Admin Runtime Tab**: 9 metric cards + 14 zero-conflict guarantee checkmarks + 10-row automation conflict matrix + convergence proof test runner
- **Proof Report**: `docs/PHASE5-RUNTIME-EXCELLENCE-PROOF.md`

### Global Intelligence Layer — Phase Status
- **Phase 0 (Foundation)**: LOCKED — Types, state machines, kill switches, feature flags
- **Phase 1 (Stubs)**: LOCKED — Country profile registry, stub providers, triple-gated ticker engine, `useIntelligenceTicker` hook, `IntelligenceTicker` component (runtime-invisible, defaults OFF)
- **Phase 3 (Live News & In-App Reader)**: IMPLEMENTED
  - **NewsPage** (`src/pages/NewsPage.tsx`): Connected to real Google News RSS provider (no more mock data), keyword-based category filtering (Immobilier/Finance/Économie/Local), in-app article reader via iframe, skeleton loading states, error states, auto-refresh every 5 min, manual refresh button
  - **useNewsData hook** (`src/hooks/useNewsData.ts`): Fetches from `fetchNews()` in news-provider, manages loading/error/refresh state, category keyword matching, auto-refresh interval
  - **IntelligenceTicker** (`src/components/dashboard/IntelligenceTicker.tsx`): Enhanced with pulsing red LIVE indicator, source name display, slide transitions (x-axis), proper external URL handling (window.open vs navigate)
  - **TickerItem** (`src/lib/intelligence/global/ticker-engine.ts`): Added `source` and `deepLinkUrl` fields to TickerItem interface
  - **news-provider.ts**: Exported `fetchNews` for direct consumption by NewsPage
- **Phase 2 (Real Providers)**: LOCKED — Provider-agnostic architecture with resilience layer:
  - **New files (5)**: `provider-resilience.ts` (circuit breaker, LRU cache, dedup, rate limiter, retry), `weather-provider-openmeteo.ts` (Open-Meteo free API), `forex-provider-frankfurter.ts` (Frankfurter ECB API), `timezone-resolver.ts` (Intl API), `provider-boot.ts` (idempotent registration with real→stub fallback)
  - **Modified files (3)**: `feature-flag-registry.ts` (+shadow validation flag), `useIntelligenceTicker.ts` (bootProviders + shadow validation), `shadow-validation.ts` (9-check validation suite)
  - **Resilience**: Timeout 5s, circuit breaker (5 failures/60s cooldown/1 probe), dedup (in-flight Map), rate limiter (200/session, 10/country/5min, 20/min), retry (max 2, backoff 1-2s, 5xx only)
  - **Fallback chain**: fresh cache → real fetch → stale cache → stub providers → empty
  - **All defaults OFF**: `enable_global_intelligence`, `enable_intelligence_ticker`, `enable_intelligence_shadow_validation` = false; `intelligence_enabled` in DISABLED_BY_DEFAULT set
  - **DO NOT MODIFY Phase 2 files**

### Autonomous Self-Repair Engine Architecture (Document)
- **Architecture plan document**: `docs/AUTONOMOUS-SELF-REPAIR-ENGINE-ARCHITECTURE.md`
- Covers 15 sections: global objective, 15-engine stack, domain coverage (10+ verticals), repair level matrix (L1–L4), 11 safety constraints, 7-stage repair pipeline, rollback/containment, proof system, observability, world-class standard, implementation roadmap (5 phases), core financial safety, autonomy graduation model (5 stages), no-hidden-expansion rules, final compilation
- All 15 repair engines map to existing BaseEngine implementations
- Financial safety: permanent L4 for balance/ledger/settlement/fraud; L3 for supervised financial ops; L2 only for read-only/display financial operations
- Autonomy graduation: Stage 1 (detect-only) → Stage 5 (broader autonomy) with measurable criteria per stage
- **Constraints C9-C11**: No Autonomous Code Rewriting (C9), Sensitive-Data Minimization with PII redaction (C10), Domain Activation Sheet Requirement (C11)

### Auto-Repair Phase 1 (Safety Foundation) — IMPLEMENTED
- **repair-safety.ts**: Global repair counter (50/60s storm limit), per-engine (10/5min), per-domain (20/5min), per-issue (3/5min) limits; repairChainId circular loop detection (3-iteration threshold); quarantine manager (engine + domain scope, 30min auto-recovery, freeze at 3/5/10 consecutive rollbacks); engine manifest (fail-closed); operation allowlist (`invalidate|refresh|reset|reconnect|fallback|suppress`); Domain Activation Sheet data model + registry; PII scrubbing (email, card, JWT, phone patterns)
- **engine-feature-flags.ts**: Fail-closed — `isEngineEnabled()` returns false for engines not in manifest via `isInManifest()`. Backward compatible via auto-registration through `EngineOrchestrator.register()`
- **domain-health.ts**: `quarantineDomain()`, `liftDomainQuarantine()`, `isDomainQuarantined()` — exported from control-plane index; HealthStatus type includes `"quarantined"`
- **base-engine.ts**: Added `domain` property (defaults to `category`); `executeTick()` checks engine quarantine, domain quarantine (both repair-safety and control-plane), and repair storm before running tick
- **engine-orchestrator.ts**: Manifest registration via `registerInManifest()` on engine register; `repairSafety` in safety report; `getEnginesByDomain()` helper
- **All defaults OFF**: Zero UI exposure, triple-gated, no visible change at runtime

### Auto-Repair Phase 2 (Repair Pipeline + Proof System) — IMPLEMENTED
- **proof-system.ts**: Immutable ProofRecord schema (identity, detection signals, root cause, mutation before/after, validation/regression checks, outcome, stage trace); in-memory circular buffer (1000 records); localStorage persistence (last 100); deep-clone query APIs (by engine/domain/outcome/pipeline run); PII scrubbing on all evidence fields
- **repair-actions.ts**: Rollback-capable executors for all 6 operations (invalidate/refresh/reset/reconnect/fallback/suppress); before/after state capture for proof; financial domain blocking (wallet/payment/billing/settlement/ledger/fraud); operation allowlist enforcement; action history tracking
- **repair-pipeline.ts**: 7-stage pipeline orchestrator (detect→classify→localize→repair→validate→regress→accept/rollback); stage timeout (10s), pipeline timeout (30s); rollback enforced on ALL non-accepted terminal paths (timeout, failure, exception); Phase 1 safety integration (canAttemptRepair, isCircularLoop, isRepairStormActive, isOperationAllowed); validation checks state-change verification; regression gate; quarantine on rollback
- **engine-orchestrator.ts**: Extended report with `repairPipeline` and `proofSystem` stats
- **Pipeline default OFF**: `pipelineEnabled = false`; no engine activates pipeline unless explicitly enabled
- **Financial domains permanently blocked**: wallet, payment, billing, settlement, ledger, fraud — L3/L4 blocked at pipeline entry, all operations blocked at action level

### Auto-Repair Phase 3 (Domain-Specific Repair Rules) — IMPLEMENTED
- **domain-activation-sheets.ts**: 5 lowest-risk domains activated: dashboard, taxonomy, media, notification, marketplace — each with versioned activation sheets defining activeEngines, allowedL2Operations, requiredL3Operations, forbiddenOperations, killSwitches, rollbackTriggers, freezeTriggers; registered at boot before engine registration
- **domain-repair-rules.ts**: 13 domain-specific repair rules (dashboard 3, taxonomy 2, media 3, notification 2, marketplace 3) — all L2 only; each rule has issuePattern regex, operation, target, repairLevel, maxRetries, cooldownMs; rule matcher requires activation sheet
- **repair-pipeline.ts**: Added 2 activation sheet gates (hasDomainActivationSheet + isDomainOperationAllowed with repair-level-aware enforcement); classify stage integrates matchRepairRule to drive operation/target selection from domain rules; domainRules included in pipeline report
- **repair-safety.ts**: isDomainOperationAllowed now enforces repair-level policy (L2 must be in allowedL2Operations, L3 must be in requiredL3Operations, L4+ always denied)
- **Financial domains excluded**: No activation sheets for wallet/payment/billing/settlement/ledger/fraud
- **Pipeline still OFF**: pipelineEnabled = false; activation sheets registered but pipeline inert

### Auto-Repair Phase 4 (First Live Taxonomy Rollout) — IMPLEMENTED
- **repair-bridge.ts**: platformBus subscriber for `taxonomy.conflict.detected` events; always listens but checks `enable_repair_pipeline` flag per-event; 500ms debounce per sweepId; FIFO queue for concurrent sweeps; enables/disables pipeline only for duration of single execution
- **taxonomy-integrity-engine.ts**: Emits `taxonomy.conflict.detected` on platformBus after scan for all WRONG_VERTICAL/INVALID_SUBCATEGORY/CATEGORY_VERTICAL_MISMATCH findings; sweepId generated per scan
- **feature-flag-registry.ts**: Added `enable_repair_pipeline` flag (default OFF); DB-backed, cache-first
- **repair-pipeline.ts**: Added `isPlatformFlagEnabled("enable_repair_pipeline")` gate after pipelineEnabled check
- **engine-registry.ts**: `installRepairBridge()` called after activation sheets, before engine registration; teardown wired to boot cleanup
- **Three-layer activation**: Platform flag (DB) → Pipeline enable (memory) → Activation sheet (policy) — all three must pass
- **Pipeline completely inert**: Flag default OFF, bridge listens but discards events when flag off, pipeline blocks when flag off
- **Phase 1/2/3 locked files untouched**: repair-safety.ts, engine-feature-flags.ts, domain-health.ts, types.ts, proof-system.ts, repair-actions.ts, domain-activation-sheets.ts, domain-repair-rules.ts

### Auto-Repair Phase 5A (UI/Text/i18n/Layout DOM Bridging) — IMPLEMENTED
- **Phase A of 3-phase rollout** (A: UI/Text/i18n/Layout, B: Actions/Cards, C: Flows/Production)
- **domain-activation-sheets.ts**: 4 new sheets added (ui, text, i18n, layout) — total 9 domains registered
- **domain-repair-rules.ts**: 7 new rules added (ui:overflow:fix, ui:tap_target:fix, text:truncation:fix, text:encoding:fix, i18n:untranslated:fix, layout:card:normalize, layout:overlap:fix) — all L2 only
- **repair-actions.ts**: DOM repair capability added alongside existing localStorage repairs; DOM mutation cap of 10 per pipeline run; WeakMap-based rollback snapshots; safety boundaries: only patches within `#root`, skips `data-repair-frozen` elements, blocks auth/payment/wallet/modal/dialog selectors; 7 DOM repair executors (el-ui-dom-patches, el-ui-tap-targets, el-text-integrity, el-text-encoding, el-i18n-patches, el-layout-cards, el-layout-overlaps)
- **ui-repair-bridge.ts**: New bridge listening on platformBus for `ui-engine:report`, `text.integrity.violation`, `layout.integrity.violation`, `i18n.localization.violation`; 1s debounce; batches by domain/target; resets DOM mutation count per pipeline run; max 20 pending batches
- **Governance engines wired**: TextIntegrityEngine, LayoutIntegrityEngine, LocalizationEngine now emit structured violation events on platformBus during tick()
- **platform-bus.ts**: Added 4 new event types (text.integrity.violation, layout.integrity.violation, i18n.localization.violation, repair:pipeline:completed)
- **engine-registry.ts**: `installUiRepairBridge()` called at boot alongside `installRepairBridge()`; teardown wired
- **RepairDiagPage.tsx**: Updated to show all domains, UI repair bridge status, proofs by domain breakdown

### Engine Memory System — Auto-Apprentissage Permanent (Phase 6)
- **Supabase table `engine_memory`**: Persistent storage for all validated fixes (migration `20260413300000_engine_memory.sql`). Columns: id, type, issue_signature (unique indexed), root_cause, fix_applied, fix_function, confidence, auto_apply, applied_count, success_count, failure_count, avg_fix_duration_ms, recurrence_after_fix, score, disabled. RLS enabled.
- **issue-signature.ts**: Deterministic signature generator using djb2 hash. Input: type + pattern + domain + category. Output: `sig-{type}-{domain}-{hash}`. Case-insensitive, stable across sessions.
- **engine-memory.ts**: Singleton service with Map<signature, EngineMemoryRecord> cache. Loads from Supabase at boot, falls back to localStorage if offline. CRUD: recordFix, recordFailure, recordRecurrence, getKnownFix, getAllFixes, getTopFixes, toggleFix, persistLearningUpdate. Score formula: 50% success rate + 20% fix speed + 30% recurrence eliminated.
- **apply-known-fixes.ts**: Pre-tick hook called in BaseEngine.executeTick() before main tick. Loads auto_apply=true fixes from cache, matches by domain/engineId, executes repair actions via executeRepairAction. Records failures. Anti-regression: checkAntiRegression() detects known bugs reappearing, emits critical event on platformBus, forces re-apply.
- **engine-learning.ts**: Periodic learning cycle (every 5 minutes). Adjusts confidence scores based on success rates, disables ineffective fixes (success < 30%), promotes high performers to auto-apply (success >= 85%, confidence >= 0.7, zero recurrence). Consolidates similar fix groups. Persists mutations to Supabase + localStorage.
- **repair-pipeline.ts integration**: stageDetect checks anti-regression on every issue. stageAcceptOrRollback records accepted fixes to engine memory with full metadata (type, signature, root cause, fix, confidence, duration).
- **platform-bus.ts**: Added `engine:memory:regression` event type for anti-regression alerts.
- **AdminControlRoomPage.tsx**: 8th tab "Engine Memory" with: total fixes learned, auto-applied count (24h), recurring bugs (target: 0), avg score, scoring breakdown per fix (success rate / speed / recurrence bars), fix toggle, by-type/by-domain breakdowns, learning engine stats.
- **useMasterAppBootstrap.ts**: Stage 4 loads engine_memory from Supabase + starts learning cycle at boot.

### CI Stabilization (Task #26)
- **vitest.config.ts**: `sequence.shuffle: true` with `seed: 42` for deterministic order; `clearMocks: true`
- **setup.ts**: Global Supabase auto-mock (auth, from, rpc, storage, channel, removeChannel, removeAllChannels); `beforeEach` resets platformBus, eventBus, localStorage, sessionStorage; polyfills for IntersectionObserver, ResizeObserver, requestIdleCallback, requestAnimationFrame
- **Engine test gates**: `bootEngineSystem()`, `engineOrchestrator.startAll()`, `BaseEngine.start()` return early in test mode to prevent background timers
- **call-device-controller.ts**: Fixed double-toggle bug — `toggleSpeaker()` and `switchAudioRoute()` now directly update callStore state instead of calling `toggleSpeaker()` action (which itself toggled audio route a second time)
- **Vertical taxonomy**: "hotel" renamed to "stay" across all import-engine tests
- **Test expectations aligned**: resolveDisplayName email privacy, truncatePreview identity function, buildOrbitAlias format, 6-step pipeline (scrape_gate added), non-existent pages removed (NotFound, Messages, TenantSignup)
- **84 test files, 0 failures**: All src/test/, src/e2e/, src/families/, src/lib/import-engine/__tests__/ pass deterministically

### Engine Discipline Infrastructure — Command Center & Governance (Task #35)
New module: `easy-locs-ea1eb0ed/src/core/command-center/`

**Pillar 1 — Central Engine Command Center** (`central-engine-command-center.ts`):
- 10 mandatory lifecycle states: DISCOVERED → REGISTERED → VERIFIED → APPROVED → READY → RUNNING → DEGRADED → QUARANTINED → BLOCKED → RETIRED
- No engine can reach RUNNING without: contract registration, dependency verification, explicit approval, run budget check
- Anti-loop protection (5 rapid invocations in 5s → QUARANTINE)
- Anti-storm protection (50 invocations in 10s global threshold)
- Anti-duplication protection (concurrent run detection)
- Budget runtime management (1000 runs/min window)
- Auto-quarantine based on error rate policy per engine contract
- Auto-release for non-manual-release quarantines on expiry

**Pillar 2 — Engine Contract Spec** (`engine-contract.ts`):
- `EngineContract` interface with all mandatory fields: engineId, version, domainOwner, purpose, allowedInputs/Outputs/Events, forbiddenActions, priority, executionMode, retryPolicy, rollbackPolicy, quarantinePolicy, trustLevel, learningEligible, healthCheckMethod, dependencies, maxConcurrentRuns, timeoutMs
- `validateEngineContract()` — blocks engines with invalid contracts (returns `ContractValidationResult`)
- `createDefaultContract()` — template factory with sensible defaults and mandatory forbidden action list

**Pillar 3 — Learning Governance Hard Lock** (`learning-governance.ts`):
- Full chain validation: TASK → EXECUTION → EVIDENCE → VALIDATION → CANONICALIZATION → MEMORY WRITE
- Rejects writes from: mocks, fallbacks, conflicts, errors, failed repairs, dirty taxonomy, non-canonical versions, quarantined/blocked engines
- 10 organized memory layers: VALIDATED_FACTS, VALIDATED_PATTERNS, KNOWN_FAILURES, ANTI_PATTERNS, VALIDATED_REPAIRS, BLOCKED_CONDITIONS, CANONICAL_MAPPINGS, HIGH_CONFIDENCE_OPTIMIZATIONS, QUARANTINED_LEARNINGS, DEPRECATED_LEARNINGS
- Layer assignment based on confidence score and outcome
- `buildLearningChainContext()` helper enforces all explicit flags

**Pillar 4 — Auto-Repair Reality Lock** (`auto-repair-reality-lock.ts`):
- 10-step pipeline enforcement: DETECT → CLASSIFY → LOCALIZE → PROPOSE → SIMULATE → VALIDATE → APPLY → VERIFY → ROLLBACK → MEMORIZE
- Every repair produces a `RepairProofRecord` with root cause, confidence, impact scope, before/after state, rollback record
- Forbidden patches blocked: BLIND_PATCH, SILENT_PATCH, ROOT_CAUSE_MASKING, CONFLICT_CREATING, OFF_TAXONOMY, OFF_VERSION
- Rollback capability mandatory for all repairs
- Per-step timing and audit trail

**Supporting files**:
- `engine-contracts-registry.ts`: Contracts for all 40+ surviving engines (sentinel, omega, domain, orchestrator engines)
- `command-center-bootstrap.ts`: Boot function wiring all systems; `requestEngineRunApproval()` gate
- `index.ts`: Barrel export for entire command center module

**Wiring**:
- `sentinel-core.ts`: CC boots at sentinel boot, shuts down on sentinel shutdown; boot report logged
- `engine-orchestrator.ts`: `registerNewEngine()` called on every engine registration; run success/error reporting wired

## Global Enforcement Architecture (`src/lib/enforcement/`)
Unified enforcement layer connecting all engines, pipelines, and gates to the central control plane.

### Control Plane Enforcement Hub (`src/lib/control-plane/enforcement-hub.ts`)
- Central violation receiver for ALL engines (taxonomy, asset, data, UI, flow, realtime, security, repair)
- Dedup guard: identical violations within 5s window are collapsed
- Classification logic: severity + confidence → decision (auto_correct / quarantine / fallback / block)
- Escalation: repeated violations (5+) auto-create incidents; 10+ trigger domain quarantine
- Full violation + action log with queryable API
- `getFullPlatformReport()` on control-plane index aggregates health + incidents + enforcement stats

### 8 Integrity Pipelines (`src/lib/enforcement/integrity-pipelines.ts`)
- Pipeline IDs: taxonomy, asset, data, UI, flow, realtime, security, repair
- Each runs 5-step chain: detect → classify → validate → act → log_proof
- All violations route through enforcement hub for unified decision-making
- Pipeline history tracked per-pipeline (last 50 runs) with stats (pass/fail/violations/duration)
- `runAllPipelines()` executes all 8 in sequence

### Import/Ingestion Gate (`src/lib/enforcement/ingestion-gate.ts`)
- 6-dimension scoring: source trust, field completeness, taxonomy confidence, media confidence, dedup confidence, canonical mapping confidence
- Configurable thresholds per dimension (defaults: 0.5–0.7)
- Weighted overall score determines: accept / quarantine / reject
- No unscored entity reaches production — all evaluated entities logged with proof
- Scoring helpers: `scoreSourceTrust()`, `scoreFieldCompleteness()`, `scoreTaxonomyConfidence()`, `scoreMediaConfidence()`, `scoreDedupConfidence()`, `scoreCanonicalMapping()`

### Quarantine System (`src/services/quarantine/quarantine-system.ts`)
- Covers 10 entity types: asset, data_record, page, feature, provider, import, event, listing, media, taxonomy_node
- 15 reason codes from MISSING_FIELDS to INGESTION_REJECTION
- Each quarantine item has: reason, source, timestamp, confidenceScore, repairSuggestion, reviewStatus
- Review workflow: pending → in_review → approved/rejected/escalated
- Resolution types: approved, rejected, reclassified, auto_repaired
- Stats API: total/pending/resolved/escalated, by entity type, by reason, by review status

### Observability & Proof System (`src/lib/enforcement/observability.ts`)
- 12 proof categories: integrity, repair, publish_gate, quarantine, runtime_incident, state_machine_violation, duplicate_merge, fallback_usage, domain_boundary_violation, ingestion, flow_enforcement, circuit_breaker
- Structured proof record: what, why, where, correction, fallbackUsed, rollbackUsed, recurrenceRisk
- Query API with filters: category, source, recurrenceRisk, since, limit
- Specialized queries: high risk proofs, fallback usage, rollback proofs

### Anti-Loop & Anti-Storm Guards (`src/lib/enforcement/circuit-breakers.ts`)
- Per-entity attempt tracking with configurable max attempts (default: 5)
- Exponential backoff cooldown on failure (up to 1 hour)
- Window-based repair rate limiting (100 repairs per 5min window)
- Cascade depth limiting (max depth: 3)
- Storm detection: warning (70% threshold) → active (100%) → critical (150%)
- Storm cooldown: active = 5min, critical = 10min, all repairs suspended
- Infinite loop detection via sliding window on cascade stack
- `canAttemptRepair()` gate checks all conditions before allowing repair

### Flow Enforcement — 15 Critical Flows (`src/lib/enforcement/flow-enforcement.ts`)
- State machines for: login, logout, session_restore, onboarding, search, open_detail, contact, message, call, pay, checkout, booking, upload, notification_open, deep_link
- Each flow has defined steps, allowed transitions, and terminal steps
- `startFlow()` / `transitionFlow()` API with instance tracking
- Illegal transitions blocked and reported as violations to enforcement hub
- 2-minute timeout on active flows, auto-completed as "timeout"
- Stats: active/completed/failed/timedOut counts per flow

### Enforcement Wiring (`src/lib/enforcement/enforcement-wiring.ts`)
- `wireEnforcement()` called at orchestrator boot — connects platform bus to enforcement hub
- Listens on `engine:*` prefix — maps all engine violations to enforcement hub
- Listens on `ui-engine:report` — captures UI engine violations
- Listens on `sla:*` — captures SLA warnings as security violations
- Bridges quarantine decisions to both `quarantine-system.ts` (new) and `data-quality/quarantine.ts` (legacy)
- Auto-starts flows on auth events: `auth:login_success`, `auth:logout`, `auth:session_restored`
- Auto-starts flows on search, booking, payment events
- Runs all 8 integrity pipelines every 60s (skipped during storm)
- Checks flow timeouts every 30s
- `enforcementRepairGate()` — pre-repair check combining storm/loop/circuit-breaker
- `recordEnforcementRepair()` — post-repair recording for circuit breaker tracking
- `triggerFlowEnforcement()` — convenience API to start and transition a flow in one call
- Wired into engine orchestrator `startAll()` — teardown on `stopAll()`

### Barrel Export (`src/lib/enforcement/index.ts`)
- Re-exports all enforcement modules for clean imports

### Architecture Rules
- All engines extend `BaseEngine` from `src/engines/core/base-engine.ts`
- Barrel export at `src/engines/governance/index.ts`
- `getAllGovernanceViolations()` aggregates violations from all 11 violation-producing engines
- `CanonicalListing.vertical` uses `CanonicalVertical` type (unified with CATEGORY_TREE vocabulary)
- All violations MUST include `engine`, `code`, `dedupKey`, `status` fields (Phase 3 standard)
- ALL engines must have a declared `EngineContract` in the `engine-contracts-registry.ts`
- NO engine can reach RUNNING state without passing through `centralEngineCommandCenter.registerAndApprove()`
- ALL memory writes must pass through `learningGovernance.write()` — direct writes are forbidden
- ALL repairs must use `autoRepairRealityLock` 10-step pipeline — no direct patching

## Infrastructure & CI/CD Pipeline (GitHub + Vercel)

### GitHub Actions Workflows (`.github/workflows/`)
- **ci.yml**: Main CI pipeline — TypeScript check, ESLint, Vitest, UI Quality Gate, Determinism Check, Production Build. Runs on every PR to `main` and on push to `main`. Parallel jobs with build gated on all checks passing.
- **vercel-preview.yml**: Deploys Vercel preview per PR branch. Posts preview URL as PR comment.
- **vercel-production.yml**: Deploys to Vercel production on merge to `main`.
- **branch-naming.yml**: Enforces branch naming convention (`feat/`, `fix/`, `agent/`, `chore/`, `docs/`, `refactor/`, `test/`, `ci/`, `hotfix/`, `release/`).
- **label-pr.yml**: Auto-labels PRs based on changed files (pillar:wallet, pillar:orbit, engine:core, etc.).
- **rollback.yml**: One-click production rollback via manual workflow dispatch. Creates revert commit and rollback issue.
- **deploy-now.yml**: DEPRECATED (legacy IONOS). Replaced by Vercel pipeline.

### Branch Protection (`main`)
- Require PR reviews (1 approval minimum)
- Required status checks: TypeScript Check, ESLint, Vitest Suite, UI Quality Gate, Determinism Check, Enforce Branch Naming, Production Build
- No direct pushes to `main`
- See `.github/BRANCH_PROTECTION.md` for full setup instructions

### CODEOWNERS (`.github/CODEOWNERS`)
Maps domain directories to responsible teams/reviewers for automatic PR review assignment.

### PR Template (`.github/pull_request_template.md`)
Architecture compliance checklist: no direct Supabase imports, no deprecated shells, domain boundary respect, design token usage, testing verification.

## Command & Control System (`src/lib/command-control/`)
Human-facing command layer connecting the project owner to the agent team:

### Email Intake
- **Edge Function**: `supabase/functions/command-email-intake/` — Receives emails via SendGrid Inbound Parse webhook, parses with AI (Lovable API), creates structured GitHub Issues with labels
- **Email Parser**: `src/lib/command-control/email-parser.ts` — Local keyword-based + AI-powered NLP parsing of emails into tasks (title, description, pillar, priority, type)
- **Database**: `command_emails` table tracks all received and parsed emails

### Approval Workflow
- **Edge Function**: `supabase/functions/command-approval-webhook/` — Handles PR approval notifications, one-click approve/reject via email links
- **Approval Workflow**: `src/lib/command-control/approval-workflow.ts` — Creates approval requests, sends email with PR summary + diff + risk assessment + approve/reject links
- **Flow**: Agent opens PR → owner gets email → clicks approve (merge + deploy) or reject (close PR + feedback comment)
- **Database**: `approval_requests` table with token-based auth for email links

### 24/7 Monitoring Tiers
- **Level 1 (Always-On)**: `src/lib/command-control/monitoring/level1-always-on.ts` — Architecture drift, runtime errors, duplicate detection, route validation, engine health — runs on cron, auto-creates Issues
- **Level 2 (Assisted)**: `src/lib/command-control/monitoring/level2-assisted.ts` — Patch suggestions, refactor recommendations, dependency/cost risk analysis — creates draft Issues for human review
- **Level 3 (Controlled)**: `src/lib/command-control/monitoring/level3-controlled.ts` — Branch creation, code changes, migration proposals — guardrail checks (failure rate, pending PRs, critical findings, cost limits) + human trigger required
- **Database**: `monitoring_findings` table with level, severity, status tracking

### System Health & Cost Tracking
- **Health Tracker**: `src/lib/command-control/health-tracker.ts` — Records component health snapshots (Supabase, Edge Functions, Vercel, etc.)
- **Cost Tracker**: `src/lib/command-control/cost-tracker.ts` — Tracks API token consumption per agent per day with cost aggregation
- **Rollback Tracker**: `src/lib/command-control/rollback-tracker.ts` — Every production change gets a tagged rollback point
- **Database**: `system_health_snapshots`, `cost_tracking`, `rollback_points` tables

### Audit Log
- **Audit Log**: `src/lib/command-control/audit-log.ts` — Structured logging of all agent actions, human approvals, system events — searchable via dashboard
- **Database**: `command_audit_log` table with event_type, actor_type, action, target, details, rollback_tag

### Dashboard
- **Route**: `/admin/command-control`
- **Page**: `src/pages/admin/CommandControlDashboard.tsx` — 7-tab dashboard: Overview, Agents, Approvals, Monitoring, Health, Costs, Audit Log
- **Features**: Real-time agent activity, PR pipeline status, monitoring findings by level/severity, system health indicators, cost tracking per agent, searchable audit log

### Database Schema
- Migration: `supabase/migrations/20260414300000_command_control_schema.sql`
- Tables: `command_emails`, `approval_requests`, `agent_actions`, `monitoring_findings`, `command_audit_log`, `system_health_snapshots`, `cost_tracking`, `rollback_points`

### Required Secrets (Command & Control)
- `COMMAND_EMAIL_SECRET` — Webhook secret for email intake endpoint
- `GITHUB_TOKEN` — GitHub PAT for creating Issues and merging PRs
- `GITHUB_REPO` — GitHub repo in `owner/repo` format
- `OWNER_EMAIL` — Project owner email for approval notifications
- `SENDGRID_API_KEY` — SendGrid API key for sending approval emails
- `LOVABLE_API_KEY` — AI gateway key for email parsing

### Required GitHub Secrets
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — Vercel deployment
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase config

### GitHub Environments
- **staging**: Vercel preview deployments (per-PR)
- **production**: Vercel production deployments (on merge to `main`)

## Testing Infrastructure

### E2E Tests (Playwright)
- **Location**: `easy-locs-ea1eb0ed/e2e/` — 15 real-browser test scenarios
- **Config**: `easy-locs-ea1eb0ed/playwright.config.ts`
- **Projects**: `chromium-desktop` + `chromium-mobile` (Pixel 5 viewport)
- **Flows covered**: Login, Signup, 5-pillar navigation, Orbit messaging, Checkout/Payment, Wallet top-up, Property creation, Booking, Profile, Settings, Search, Notifications, PWA install, Language switch, Dark mode
- **Commands**: `npm run test:e2e`, `npm run test:e2e:headed`, `npm run test:e2e:mobile`
- **First run**: `npm run playwright:install` to install Chromium browser

### Coverage (Vitest + v8)
- **Config**: `easy-locs-ea1eb0ed/vitest.config.ts` — coverage section with v8 provider
- **Thresholds**: branches 70%, lines 75%, functions 75%, statements 75%
- **Reports**: text, html, lcov, json-summary in `coverage/`
- **Command**: `npm run test:coverage`

### Load Tests (Artillery)
- **Location**: `easy-locs-ea1eb0ed/tests/load/`
- **API load test**: `artillery-config.yml` — targets Supabase edge functions (health-check, auth, listings, wallet, messaging)
- **Frontend load test**: `load-test.yml` — targets the Vite dev server pages
- **Phases**: Ramp-up → Sustained → Peak (simulates up to 500 concurrent users)
- **SLA**: p95 < 500ms, max error rate < 5%
- **Commands**: `npm run test:load` (API endpoints), `npm run test:load:frontend` (SPA server)

### API Contract Tests
- **Location**: `easy-locs-ea1eb0ed/tests/contracts/` — 10 edge function contract tests
- **Config**: `easy-locs-ea1eb0ed/vitest.contracts.config.ts`
- **Functions tested**: health-check, create-stripe-intent, rent-payment, wallet-transfer, send-push-notification, booking-create, send-otp, ai-assistant, public-api, stripe-webhook
- **Command**: `npm run test:contracts`

### Run All Tests
- `npm run test:all` — Unit tests + E2E + Contract tests

## Runtime Stability Hardening (Ultra-Stable 2026)

### Migration
- **`supabase/migrations/20260414600000_runtime_stability_hardening.sql`** — Tables: kill_switches_server, feature_flags_server, state_machine_checkpoints, anomaly_detection_windows, domain_degradation_modes, read_model_dashboard_cards, db_observability_metrics, queue_dedup_window, kill_switch_audit_log, server_event_log. 7 SECURITY DEFINER RPCs with REVOKE PUBLIC / GRANT service_role lockdown. 15 RLS write policies scoped to service_role.

### Runtime Modules
- **Path Discipline**: `src/lib/runtime/path-discipline.ts` — Fast/heavy path routing with domain latency budgets and timeout-based degradation
- **Queue Hardening**: `src/lib/queue/queue-hardening.ts` — Dedup windows, structured backoff, poison-message detection, domain pause/resume, queue depth metrics
- **Runtime Enforcement**: `src/lib/state-machines/runtime-enforcement.ts` — Guard conditions, DB checkpoint persistence, timeout states, transition IDs, escalation counters
- **Boundary Validation**: `src/lib/validation/boundary-validators.ts` — API response, webhook, queue consumer, event bus, cache restore, store mutation validators with strict mode
- **Server Persistence**: `src/lib/control-plane/server-persistence.ts` — Server-persisted kill switches and feature flags with audit trail, domain degradation modes
- **Read Models**: `src/lib/runtime/read-models.ts` — Canonical dashboard card system
- **Anomaly Detection**: `src/lib/runtime/anomaly-detection.ts` — Sliding window metrics, domain thresholds, preemptive actions
- **DB Observability**: `src/lib/runtime/db-observability.ts` — Infrastructure metric tracking with alerting
- **Stability Init**: `src/lib/runtime/stability-init.ts` — Wires all enforcement machines, boundary validators, read models, anomaly thresholds, and flow-state-manager enforce function

### Admin UI
- **AdminControlRoomPage RuntimeStabilitySection** — Live-updating panels for enforcement metrics, server kill switches, domain degradation modes, and anomaly detection domain metrics (5s polling)

### Server-Side Control Plane
- **Edge Function**: `supabase/functions/runtime-control-plane/index.ts` — Proxies all privileged RPC calls using service_role key. Handles checkpoint persistence, anomaly windows, dashboard card upserts, DB observability metrics, kill switch toggles, domain degradation, and queue dedup checks.
- **Client RPC Client**: `src/lib/runtime/runtime-rpc-client.ts` — Client-side batching layer that routes telemetry writes through the edge function (2s flush window, max 20 items per batch). Exports `enqueueCheckpointPersist`, `enqueueDashboardCardUpsert`, `enqueueDbObservabilityMetric`, `enqueueAnomalyWindowPersist`, `toggleKillSwitchServer`, `setDomainDegradationServer`.

### Flow State Manager Integration
- `flowStateManager.setEnforceFn()` wired from `stability-init.ts` to `enforceTransition()` — only activates for flows with explicit `machineName`; flows without it fall through to standard `transition()` logic
- All primary flow constructors (`createBookingFlow`, `createPaymentFlow`, `createMessageFlow`, `createAuthFlow`) pass canonical machine names matching the enforced machine registry

### Guard Conditions
- Kill-switch-gated guards: BOOKING (CONFIRM/PAY), CHECKOUT (SUBMIT_PAYMENT/PROCESS), AUTH (AUTHENTICATE), CALL (START_CALL), UPLOAD (START_UPLOAD)
- Content guard: MESSAGE_MACHINE SEND event rejects messages > 50KB

### Path Discipline Enforcement
- `classifyPath()` wired via platformBus listeners for domain flows: message_send, payment, booking, file_upload, auth_session, food_order, notification, dashboard_bootstrap

### Boundary Validation Enforcement
- 6 critical trust boundaries wired via platformBus: api:response, webhook:incoming, event_bus:payload, queue:consumer, cache:restore, store:mutation — with quarantine-on-fail

### Server Persistence Bridge
- `syncFromServer(db)` called at init, populates server cache AND bridges to existing in-memory kill-switch module via `toggleKillSwitch()` calls

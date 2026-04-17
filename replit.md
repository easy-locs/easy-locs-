# Easy-Locs Super-App v3

## Auto Pipeline: Replit → GitHub → Vercel (Task #802)
Every commit made in this Replit workspace is automatically pushed to GitHub
(`https://github.com/easy-locs/easy-locs-.git`), which triggers Vercel to
redeploy `easy-locs.com`.

- **Git identity**: `jstarbuzz <jstarbuzz@gmail.com>` (set globally + locally so
  GitHub/Vercel accept the commits — the old `…@users.noreply.replit.com` email
  was rejected by Vercel and broke deploys).
- **Auto-push**: a `post-commit` Git hook runs `scripts/auto-push-github.sh` in
  the background after every commit. The script (a) rewrites any unpushed
  commit whose author is the Replit noreply email to the canonical
  `jstarbuzz@gmail.com` identity (covers platform-generated checkpoint commits
  produced when a task merges) and (b) pushes the current branch to `origin`.
- **Manual fallback**: if the hook fails or you want to force a push, run
  `bash scripts/auto-push-github.sh` from the workspace root. Logs are written
  to `/tmp/auto-push-github.log`; the last result (ok/fail + commit + message)
  lands in `/tmp/auto-push-github.status` and is echoed by `post-merge.sh`.
- **Operational checks** (run anytime to confirm the pipeline is healthy):
  ```bash
  git remote -v                              # origin should be easy-locs/easy-locs-
  git log -1 --format='%an <%ae>'            # should be: jstarbuzz <jstarbuzz@gmail.com>
  cat /tmp/auto-push-github.status           # last auto-push result
  ```
- **Verification**: after a push, check Vercel — the deployment for the new
  commit should reach **Ready** within a couple of minutes and `easy-locs.com`
  (including `/admin/super-dashboard` and `/admin/master-control`) reflects the
  latest commit.

## Overview
Easy-Locs is a world-class super-app built around 5 intelligently connected pillars:
**Dashboard · Radar · Orbit · Wallet · Me**

## Internal Factory Labs (Task #473, #562)
9 internal laboratories for self-sufficient development operations:
- **Developer CLI** (`scripts/el-cli.ts`, npm script `el`) — Scaffolds domains, components, pages, Edge Functions, services with boilerplate
- **Performance Lab** (`scripts/perf-audit.ts`, admin page `/admin/performance-lab`) — Web Vitals tracking, bundle size regression, per-pillar scores
- **Data Lab** (admin page `/admin/data-lab`) — Master Data Pipeline visualization, entity lifecycle tracing, failure rates
- **Security Lab** (`scripts/security-scan.ts`, admin page `/admin/security-lab`) — Dependency vulnerability scanning, fraud detection, security events
- **Release Factory** (`scripts/changelog-generator.ts`, `scripts/version-bump.ts`, admin page `/admin/release-history`) — Auto-changelog, semantic versioning, release timeline
- **Notification Lab** (admin page `/admin/notification-lab`) — Email template preview, language switching, delivery analytics, test send
- **Experiment Lab** (admin page `/admin/experiment-lab`) — A/B testing dashboard, variant analysis, chi-squared significance, lifecycle management
- **API Factory** (`scripts/api-doc-generator.ts`, `scripts/sdk-generator.ts`, page `/developer-portal/docs`) — Auto-generated OpenAPI spec, TypeScript SDK, webhook catalog
- **Architecture Lab** (admin page `/admin/architecture-lab`) — Import boundary audit, domain ownership map, architecture grade, historical trends
- **Integrations Lab** (admin page `/admin/integration-health`) — Plaid, LiveKit, Meilisearch, News APIs connectivity monitoring with per-service status, latency, error details, and historical uptime/latency trend charts (24h/7d/30d) backed by `analytics.integration_health_log` table
- **Integration Health Monitor** (edge function `integration-health-monitor`, scheduled every 5 min via cron dispatcher) — Checks Plaid, LiveKit, Meilisearch, GNews, NewsData health; sends in-app + email notifications to all admins when any integration reports an error; hourly deduplication prevents alert spam
- **Integration Health Log Retention** (edge function `cleanup-integration-health-logs`, daily via cron dispatcher) — Purges `analytics.integration_health_log` rows older than 90 days (configurable via `retention_days` body param) to bound storage growth
- **Lab Hub** (admin page `/admin/lab-hub`) — Central hub linking all 9 labs with health indicators and Factory Score

Built with React + Vite + TypeScript, backed by Supabase. Property management, marketplace, communication, digital wallet, and service discovery — unified under one roof.

## Agent Powerup — Big Tech Autonomous Fortress (Task #665)
Infrastructure overhaul across 4 layers (Agent, Wiring, UX, E2E/Protection):

### Agent Layer
- **Platform Bus Priority System** (`src/lib/shared/platform-bus.ts`) — Priority-ordered listeners (Normalizers=10, Validators=20, Business=50, Notifiers=80, Analytics=90); preserves insertion order within same priority
- **Cross-Domain Table Locking** (`src/lib/concurrency/resource-mutex.ts`) — Async mutexes for `menu_items`, `merchant_status`, `quality_scores`; `getAdvisoryLockSQL` for Edge Functions
- **Cross-Agent Typed Protocol** (`src/core/protocols/agent-protocol.ts`) — Typed `SentinelToOmega`, `OmegaToRepairEngine`, `RepairToOmega`, `OmegaToQuarantine` with correlation IDs; auto-quarantine after 3 failed repairs
- **Continuous Wiring Verifier** (`src/engines/core/wiring-verifier.ts`) — `installContinuousWiringVerification()` runs 60s interval checks, auto-remediates on FAIL verdict, pauses during E2E
- **Quarantine Bridge** (`src/lib/data-quality/quarantine.ts`) — `syncToServiceQuarantine`/`quarantineEntityWithSync` bridge DQ findings to DB persistence for high/critical severity

### Wiring Layer
- **Legacy Event Aliases** (`src/lib/super-app-bridge.ts`) — UPPERCASE→colon-notation mapping (ORDER_CONFIRMED→order:confirmed, PAYMENT_SUCCESS→wallet:payment_success, etc.)
- **Wallet Settlement** — `booking:completed` now emits `wallet:deduct` + `payment:capture` for auto-settlement
- **Dashboard Dead Listeners Fixed** — `property:booking_completed`, `property:payment_processed`, `me:profile_updated` now wired to cache invalidation
- **Cross-pillar invalidations** — orbit:thread_created→radar-listings, wallet:payment_success→bookings+orders+marketplace

### UX Layer
- **42 Critical Silent Catches Fixed** — `.catch(() => {})` replaced with `console.warn("[domain]", e)` across WalletTransferPage, WalletRequestPage, BookingForm, CallProvider, HudChatPanel, CreateListing, RiderLivePage, PrayerTimesTab, RadarPanel, TaxiTracking, etc.
- **Null Guards** — `Array.isArray()` guards on RestaurantPage `.reduce`, optional chaining on PrayerTimesTab `entry.prayers?.[p]`
- **SafeImage & i18n** (`src/components/ui/SafeImage.tsx`) — Branded SVG fallback + `safeI18nFallback` function
- **Form Stuck Fixes** — `finally { setSubmitting(false) }` on PublicRealEstateListing; consistent patterns across forms

### E2E/Protection Layer
- **E2E Engine Pause** (`src/engines/core/e2e-engine-pause.ts`) — `window.__E2E_RUNNING__` flag pauses all engines during test runs
- **E2E Auto-Repair Wire** (`src/engines/core/e2e-auto-repair-wire.ts`) — Test failures route to Sentinel→Omega→RepairEngine via typed protocol
- **Learning Loop** (`src/engines/core/learning-loop.ts`) — Records repair outcomes, invariant registration/checking, success rate tracking
- **Runtime QA Scenarios** (`src/engines/core/runtime-qa-scenarios.ts`) — 6 registered scenarios (bus listeners, wallet/orbit/radar/dashboard events)
- **Cross-Pillar E2E Tests** (`e2e/17-*.spec.ts`, `e2e/18-*.spec.ts`, `e2e/19-*.spec.ts`) — Wallet↔Booking settlement, Orbit↔Radar cross-invalidation, Legacy event migration
- **Wiring Health Dashboard** (`/admin/wiring-health`) — Real-time wiring report, QA scenarios, repair history, invariant status, bus event distribution

## Layer 5 — Testing & Quality Gate (Task #572)
Comprehensive automated test suite covering core logic, integrations, and security:

### Vitest Unit/Integration Tests (314 tests total, all importing production modules)
- `src/test/map-error-handler.test.ts` — useMapErrorHandler hook: state management, analytics tracking (9 tests)
- `src/test/map-error-dedup.test.ts` — classifyMapError, LRU dedup cache with 10s window, route-bucketed deduplication, error buffer limits (13 tests)
- `src/test/map-retry.test.ts` — useMapRetry hook: exponential backoff (2s/4s/8s/16s), exhaustion, cooldown, reset (12 tests)
- `src/test/article-url-normalization.test.ts` — Tests `normalizeUrl` from `@/lib/onboarding/pipeline/input/input.url.normalize` (17 tests)
- `src/test/rate-limit-tiers.test.ts` — Tests `resolveUserTier`, `getTierEndpointLimit`, `rateLimitHeaders` from `@/lib/shared/rate-limit-tiers` (25 tests)
- `src/test/kyc-integration.test.ts` — KYC upload→insert→status→emit→review workflow using shared supabase mock (4 tests)
- `src/test/cache-eviction.test.ts` — Tests `fetchArticleContent` from `@/lib/utils/article-extractor`, paywall detection from edge functions (10 tests)
- `src/test/extract-article-integration.test.ts` — Full extract-article pipeline: server→client fallback, paywall detection, memory/DB cache, noise stripping, density extraction (10 tests)
- `src/test/social-share.test.ts` — sharePage combined failure handling, locale-pinned WhatsApp tests (119 tests)
- `src/lib/utils/__tests__/sanitize-html.test.ts` — XSS: data: URIs, SVG injection, MathML, stripDataUris, sanitizePlainText (60 tests)
- `src/test/map-error-fallback.test.tsx` — MapErrorFallback component, useMapCore error states (35 tests)

### Playwright E2E Tests (144 unique tests across 16 spec files, run on chromium-desktop + chromium-mobile = 288 total; CI via `e2e` job in `.github/workflows/ci.yml`)
- `e2e/01-login.spec.ts` — Login: Password tab (email #login-email, password #login-password), field binding, invalid credentials toast, HTML validation (empty email/password), submit disabled/spinner state, forgot password navigation, Phone/OTP tabs; authenticated session (Supabase token, protected routes, session persistence)
- `e2e/02-signup.spec.ts` — Signup: Phone/Email tabs, required field attributes, value binding, weak password toast, empty name/email HTML validation, submit loading state, strong password submission, Phone↔Email tab switching
- `e2e/03-navigation-pillars.spec.ts` — 5-pillar navigation error boundary checks, nav element, theme switcher
- `e2e/04-orbit-messaging.spec.ts` — Messaging: composer textarea, send/clear, sent message DOM verification, conversation list, sequential sends, contacts page, add contact form, multiline input
- `e2e/05-checkout-payment.spec.ts` — Checkout: order total/subtotal with currency or empty cart, payment dialog trigger, food checkout, address selector, rapid navigation stability
- `e2e/06-wallet-topup.spec.ts` — Wallet Hub: numeric balance with currency, quick actions, tab switching; Transfer dialog: open/fill/dismiss; Transfer page: amount input (placeholder=0), preset buttons (25/50/100/250/500), note textarea, send validation; Top-up: amount min=1/max=50000, presets (50/100/200/500/1000), payment methods; Request funds page
- `e2e/07-create-property.spec.ts` — AddProperty: label input, country selector, listing modes, financial fields, description textarea, empty form validation, submit→success toast "enregistré"/redirect to /dashboard/country; CreateListing: category/title/description fields, value binding, submit→"published" toast or /my-shop redirect
- `e2e/08-booking.spec.ts` — Discovery: property listing cards, detail navigation with heading, price with currency, image gallery, Book/Reserve button, full journey (marketplace→detail→book→booking UI); Authenticated: booking form (name/email/phone fields), price breakdown, Continue to Payment, guest info fill→advance, payment methods (wallet/card/mobile money/crypto), booking reference, confirmation page, Contact Host/Search actions
- `e2e/09-profile.spec.ts` — Profile: Me page content, user name display, navigation links, edit form pre-filled inputs, save/submit button, name editing roundtrip, save outcome toast, properties page, orders page
- `e2e/10-settings.spec.ts` — Settings: section headings, toggle aria-checked switch, re-toggle revert, rapid clicks stability, multiple switches, account/security/notification sub-pages
- `e2e/11-search.spec.ts` — Marketplace search filtering, filter controls, search→detail navigation, explore page content
- `e2e/12-notifications.spec.ts` — Notifications: page rendering, heading, content/empty state; authenticated personalized content
- `e2e/13-pwa-install.spec.ts` — PWA: viewport meta, manifest link, theme-color meta
- `e2e/14-language-switch.spec.ts` — i18n: locale storage, translated login/signup labels
- `e2e/15-dark-mode.spec.ts` — Theme: Light/Dark/System options, class toggling, Orbit accents
- `e2e/16-visual-regression.spec.ts` — Visual snapshots at 3 viewports, responsive layout checks

### Shared Production Modules
- `src/lib/shared/rate-limit-tiers.ts` — Extracted pure rate-limit tier logic (resolveUserTier, getTierEndpointLimit, getEndpointLimit, rateLimitHeaders) shared between tests and edge functions

### E2E Nightly Trend Tracking (Task #679)
Automated nightly e2e test runs with historical trend tracking and a visual dashboard.

- `.github/workflows/e2e-nightly.yml` — Nightly cron workflow (3 AM UTC daily) that runs full Playwright suite, collects trend data, commits history, and creates GitHub issues on failure
- `scripts/collect-e2e-trends.sh` — Parses Playwright JSON reporter output into trend entries (pass/fail/flaky counts, durations, per-test details); appends to rolling 90-entry history file
- `e2e-trends/history.json` — Rolling JSON log of nightly results (max 90 entries) with per-run pass rate, flaky/failed test lists, commit SHA, duration
- `e2e-trends/index.html` — Static HTML dashboard (Chart.js) showing pass/fail/flaky stacked bar chart, pass rate trend line, top flaky tests table, recent runs table
- Playwright config updated with JSON reporter (`e2e-results.json`, gitignored) for machine-readable output

### E2E Test Data Seeding (Task #663)
Deterministic test data seeding via Playwright globalSetup/globalTeardown so e2e tests don't depend on live database state.

- `e2e/seed/test-data.ts` — Canonical seed data constants (2 property listings, wallet balance, `e2e_seed_` prefix for all IDs)
- `e2e/seed/seed.ts` — Playwright `globalSetup`: creates Supabase client (service role key if available, else anon key + test user auth), upserts seed listings and wallet data, writes seeded state to `e2e/seed/.seeded-state.json`
- `e2e/seed/cleanup.ts` — Playwright `globalTeardown`: reads seeded state file, deletes seeded rows by ID, removes state file
- `e2e/seed/load-state.ts` — Runtime helper for test files to access seeded data constants and state (cached read)
- `e2e/fixtures/base.fixture.ts` — Extended with `seededListingIds`, `seedListing`, `seedListing2`, `seedWallet`, `walletSeeded` fixtures
- Tests updated: `06-wallet-topup.spec.ts`, `08-booking.spec.ts`, `11-search.spec.ts` now reference seeded data constants
- Env vars: `SUPABASE_SERVICE_ROLE_KEY` (optional, for admin-level seeding bypassing RLS); falls back to `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` auth

### Shared Test Infrastructure
- `src/test/__mocks__/supabase.ts` — Enhanced mock with `createAuthenticatedMockSupabase`, `resetAllMocks`, `mockSupabaseResponse` helpers; used consistently across all integration tests

### Fixed Stale References
- `map-error-fallback.test.tsx`: `mockSuperMapDeps` updated from `isRetrying: false` to `retryCount: 0` matching current `useMapCore` return shape

## Layer 8 — Live Integrations (Task #575)
All integrations connected to real backends with zero mock dependencies in production:

### Integration Connections
- **Plaid**: Banking API connected via `plaid-link-token` edge function. Account linking, token exchange, ACH transfers, income verification. Env vars: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
- **LiveKit**: Real-time voice/video via `livekit-room-token` edge function. JWT token generation, room management, recording. Env vars: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
- **Meilisearch**: Full-text search across shops, products, properties, services, profiles, and food menus. Env vars: `MEILISEARCH_URL`, `MEILISEARCH_API_KEY`
- **News APIs**: Multi-source aggregation (Google News RSS, GNews, NewsData.io). Env vars: `VITE_GNEWS_API_KEY`, `VITE_NEWSDATA_API_KEY`

### BNPL Full Lifecycle
States: `created → approved → active → completed | overdue | defaulted`. Functions: `createBnplPlan`, `approveBnplPlan`, `activateBnplPlan`, `payInstallment`, `markOverdueInstallments`.

### E-Signature Persistence
Envelopes stored in `signature_envelopes` with webhook-driven updates via `esign-webhook` edge function. Status tracking: `draft → pending → signed | declined | expired`.

### Health Checks
- `integration-health-cron`: Checks Plaid, LiveKit, Meilisearch, GNews, NewsData every 5 min
- `health-check`: Reports config status for all integrations (Plaid, LiveKit, Meilisearch, News, Stripe)
- `_shared/news-health.ts`: GNews and NewsData health check helpers

### Explicit Error Handling
All integration failures produce explicit error messages (no silent fallbacks). News sources log failures with provider names. Plaid account fetch errors are logged per-item. E-signature falls back to DB with warning logs.

### Shared Utilities
- **Size Estimation**: `src/lib/shared/size-estimation.ts` — `estimateObjectSize()`, `estimateStringSize()`, `estimateListItemSize()`, `formatBytes()` for reuse across virtualized lists and memory management
- **Firecrawl Cost**: Configurable via `VITE_FIRECRAWL_COST_PER_CALL` env var (default: 0.002)

### Meilisearch Indexes
`shops`, `products`, `properties`, `services`, `profiles`, `food_menus` — all synced via `sync-meilisearch-cron` with queue processing and incremental sync.

## API Intelligence Gateway — "The Statement" (Task #544)
Centralized, read-only API Intelligence Gateway that connects to all internal and external APIs.

### Architecture
- **Connector Registry** (`src/lib/api-gateway/connector-registry.ts`) — Central registry for all API connectors with health tracking, sync history, metrics, and pulse scoring
- **Base Connector** (`src/lib/api-gateway/connectors/base-connector.ts`) — Abstract base class with automatic health management, retry, and metrics collection
- **Connector Template** (`src/lib/api-gateway/connectors/connector-template.ts`) — `GenericRestConnector` and `createConnectorConfig()` for adding new sources with zero architecture changes
- **Orchestration Engine** (`src/lib/api-gateway/orchestration-engine.ts`) — Polling scheduler, webhook ingestion, sync-all/sync-now, Platform Bus event emission
- **Intelligence Bridge** (`src/lib/api-gateway/intelligence-bridge.ts`) — Cross-source correlation engine (real estate + forex = opportunity detection, weather + delivery = demand correlation)
- **Gateway Boot** (`src/lib/api-gateway/gateway-boot.ts`) — Registers all connectors and starts orchestration on app boot

### Registered Connectors
| Connector | Source | Type | Domain | Interval |
|-----------|--------|------|--------|----------|
| DLD Transactions | Dubai Land Department | REST | real_estate | 1h |
| Deliveroo | Partner API + Firecrawl fallback | REST | food_delivery | 30m |
| Talabat | Partner API + Firecrawl fallback | REST | food_delivery | 30m |
| Careem | Partner API + Firecrawl fallback | REST | food_delivery | 30m |
| Open-Meteo Weather | Open-Meteo | REST | weather | 15m |
| Google News RSS | Google News | RSS | news | 10m |
| Frankfurter Forex | ECB via Frankfurter | REST | forex | 5m |
| Al-Adhan Prayer Times | Al-Adhan API | REST | prayer | 24h |

### Dashboard
- **Route**: `/admin/statement` (protected admin page)
- **Page**: `src/pages/admin/StatementDashboardPage.tsx`
- Shows pulse score, connector status, sync history, cross-source correlations, and configuration table

## DLD API Integration (Task #530)
The market intelligence page connects to the live Dubai Land Department (DLD) REST API for real-time transaction data.

## Frontend Speed Engine (Phase 1B)

### Web Worker Pool (`src/workers/`)
- **pool-manager.ts**: Manages typed Web Workers with round-robin/least-busy assignment. Auto-spawns up to `hardwareConcurrency - 1` workers per type, auto-shrinks idle pools after 30s.
- **crypto.worker.ts**: AES-GCM encrypt/decrypt, key generation, SHA-256 hashing, PBKDF2 key derivation — all off-thread via Comlink.
- **search.worker.ts**: Client-side search index with tokenization, prefix/fuzzy matching, relevance scoring — off-thread via Comlink.
- **normalization.worker.ts**: Listing normalization, address formatting, phone normalization, currency conversion — off-thread via Comlink.
- **analytics-batch.worker.ts**: Analytics event batching with configurable batch size (20) and flush interval (10s) — off-thread via Comlink.

### Cross-Tab Sync (`src/workers/cross-tab-sync.ts`, `cross-tab-client.ts`)
- SharedWorker multiplexes state across browser tabs via BroadcastChannel
- Syncs: Orbit messages, wallet balance, notification counts
- Client auto-connects on boot, heartbeats every 15s, cleans stale tabs after 60s

### Partytown (Third-Party Script Isolation)
- Configured in `vite.config.ts` via `@builder.io/partytown` plugin
- `index.html` has Partytown config with forward rules for `dataLayer.push`, `posthog.*`
- Reverse proxy configured for PostHog, Firebase analytics domains

### Predictive Prefetch Engine (`src/lib/performance/prefetch-engine.ts`)
- Tracks last 50 navigation transitions in sessionStorage
- Computes transition probabilities per route
- Preloads routes with >30% probability during idle
- Connection-aware: skips on slow-2g/2g/saveData

### Segment CDP (`src/lib/analytics/segment.ts`)
- `@segment/analytics-next` SDK with lazy init via `initSegment()`
- Unified track/identify/page/group/reset APIs
- `segmentTrackWithContext()` auto-enriches events with viewport, path, version
- Env var: `VITE_SEGMENT_WRITE_KEY`

### Database Fortress — Layer 1 (Task #568)
Migration: `supabase/migrations/20260418000000_database_fortress_layer1.sql`
- **CHECK Constraints**: All TypeScript union types (provider_type, kyc_status, listing_type, booking_status, subscription_tier, transaction_status, support_ticket_status, conversation_status, onboarding_status, ledger_direction) now have matching PostgreSQL CHECK constraints on their canonical tables.
- **BNPL + E-Signature Tables**: `commerce.bnpl_plans`, `commerce.bnpl_installments`, `commerce.signing_envelopes`, `commerce.signing_parties` created with full RLS + public compat views.
- **Micro-Insurance Tables**: `wallet.insurance_policies`, `wallet.insurance_claims` created with full RLS + public compat views.
- **Listing Type Normalization**: All listing_type values normalized to canonical lowercase enum values across marketplace.listings.
- **Retroactive Text Normalization**: Key text fields trimmed (whitespace) and emails lowercased across identity/marketplace/support tables.
- **Referral Tables**: `public.referral_codes` + `public.referral_redemptions` created with unique constraint `uq_referral_redemptions_user_code_id(referred_user_id, referral_code_id)` preventing duplicate credit.
- **Browser Telemetry Dropped**: `browser_telemetry_events` + `browser_front_incidents` tables dropped (superseded by sentinel analytics).
- **Fleet Analytics Tables**: `analytics.fleet_metrics` + `analytics.delivery_stats` created replacing derived calculations.
- **Compat Views Verified**: All 39 public-schema backward-compatibility views verified/refreshed.

### Performance Budget Enforcer (Per-Pillar)
- Dashboard: 300KB, Radar: 350KB, Orbit: 300KB, Wallet: 250KB, Me: 200KB
- CI script: `npm run check:budget` — runs `scripts/check-budget.ts`
- Build-time enforcement via `performanceBudgetPlugin` in `vite.config.ts`

### Resource Hints (`index.html`)
- preconnect/dns-prefetch for: Supabase, CARTO (basemaps), Stripe, Firebase, PostHog, Segment, Sentry CDN domains

### React 19 Streaming
- `useTransition` + `useRef` imports available for pillar navigation
- Per-pillar skeleton components (`PillarSkeleton`) for dashboard/radar/orbit/wallet/me
- `NavigationTracker` component records navigation patterns for predictive prefetch

## Super-App Strategic Features (Task #450)

### ML Recommendation Engine
- **Engine**: `src/engines/recommendations/recommendation-engine.ts` — Vector similarity + collaborative filtering + contextual boosting replacing rule-based scoring
- **Modules**: `vector-similarity.ts` (cosine similarity, TF-IDF vectors), `collaborative-filter.ts` (user-user/item-item CF), `contextual-signals.ts` (time, weather, location, device boosting)
- **Hook**: `src/hooks/useRecommendations.ts` — Interaction tracking via `trackUserInteraction()`, auto-refresh on route change

### Social Graph (Follow/Unfollow)
- **Service**: `src/services/social-graph.service.ts` — Follow/unfollow, mutual detection, follower/following counts, Following feed (in-memory fallback, DB-ready)
- **Hooks**: `src/hooks/useSocialGraph.ts` — `useFollow`, `useFollowCounts`, `useFollowers`, `useFollowingList`, `useFollowingFeed`
- **Components**: `src/components/social/FollowButton.tsx`, `FollowingFeed.tsx`, `FollowersList.tsx`
- **Page**: `SocialHubPage.tsx` updated with follower/following counts, Feed/Network/Hub tabs

### Virtual Card Issuance
- **Service**: `src/services/virtual-cards.service.ts` — Create/freeze/unfreeze/cancel/fund virtual Visa cards, spending limits, Apple Pay/Google Pay provisioning (in-memory state, Stripe Issuing-ready)
- **Hook**: `src/hooks/useVirtualCards.ts` — Full card lifecycle management
- **Page**: `src/pages/wallet/VirtualCardsPage.tsx` — Card management UI with reveal/hide card details, funding, limit adjustment
- **Route**: `/wallet/virtual-cards` (protected)

### Embedded Finance: BNPL
- **Service**: `src/services/bnpl.service.ts` — KYC-gated eligibility, 3/4/6-month installment plans, 0% interest
- **Hook**: `src/hooks/useBnpl.ts` — Eligibility check, plan creation, installment payment
- **Components**: `src/components/checkout/BnplOption.tsx` — Checkout integration with payment schedule preview
- **Page**: `src/pages/wallet/InstallmentsPage.tsx` — Track and pay installments
- **Route**: `/wallet/installments` (protected)

### Embedded Finance: Micro-Insurance
- **Service**: `src/services/micro-insurance.service.ts` — Package protection & trip protection policies, claim filing
- **Hook**: `src/hooks/useMicroInsurance.ts` — Offer display, purchase, claim submission
- **Component**: `src/components/checkout/MicroInsuranceOption.tsx` — Checkout toggle with coverage details

### i18n Expansion (ar/es/pt/tr)
- **Translations**: `src/lib/i18n-data/translations-super-app.ts` — New keys for social graph, virtual cards, BNPL, insurance, recommendations across en/fr/ar/es/pt/tr
- **Integration**: Merged into `GLOBAL_TRANSLATIONS` via `translations.ts`

### Feature Flags (Task #450)
- `enable_social_graph`, `enable_virtual_cards`, `enable_bnpl`, `enable_micro_insurance`, `enable_ml_recommendations` — all default ON in `feature-flag-registry.ts`

## Dynamic OG Previews (Task #516)
- **Section-Specific Images**: `public/og/` contains 1200×630 JPG OG images per section: `og-default.jpg`, `og-food.jpg`, `og-property.jpg`, `og-forex.jpg`, `og-islamic.jpg`, `og-marketplace.jpg`, `og-radar.jpg` (plus existing `og-payment.jpg`, `og-profile.jpg`, `og-shop.jpg`, `og-service.jpg`, `og-contact.jpg`, `og-order.jpg`)
- **Default OG Path**: All references now use `/og/og-default.jpg` instead of `/og-default.jpg`. Root `/og-default.jpg` kept as backward-compatible copy.
- **ROUTE_META Registry**: `src/domains/seo/pipelines/seo-meta.pipeline.ts` — expanded with entries for `/wallet`, `/food`, `/dashboard/islamic`, `/dashboard/properties`, `/marketplace`, `/marketplace-services`, `/orbit`, `/radar`, `/properties` each with section-specific titles, enriched descriptions, and dedicated OG images
- **Social Preview Edge Function**: `supabase/functions/social-preview/index.ts` — new OG image constants (`OG_FOREX_IMAGE`, `OG_ISLAMIC_IMAGE`, `OG_FOOD_IMAGE`, `OG_PROPERTY_IMAGE`, `OG_MARKETPLACE_IMAGE`, `OG_RADAR_IMAGE`). `handleForex`, `handleQuran`, `handleHadith`, `handleRestaurant`, `handleAnalytics` now use section-specific images and enriched titles/descriptions. `buildBrandedFallback` uses super-app branding instead of "Content unavailable"
- **SEOHead Component**: Default title/description/image updated to super-app branding
- **manifest.json**: PWA name/description synced with new branding
- **Branding**: All generic OG previews now use "Easy-Locs — The Super App for Food, Property, Forex & Services | 190+ Countries" instead of "Food, Services, Taxi, Hotel in One App"

## Visual Design System (Apple/Tesla Premium v4)
- **Design Philosophy**: Minimalist, Apple/Tesla-inspired — solid backgrounds over blur, clean hierarchy, 3 shadow levels max
- **CSS**: `index.css` ~1600 lines — single `:root` token block, no duplicates, clean RTL/dark/scrollbar rules. Purged unused ds-*, glass-card, page-empty-state, stats-grid, action-card-grid, card-small/medium/large/listing/carousel classes
- **CSS Class Aliases**: `config/ui.ts` exports `CSS` object — single source of truth for CSS class names (uiCard, statCard, appCard, formInput, formSelect, emptyState, etc.)
- **Color Constants**: `config/colors.ts` — centralized STATUS_COLORS, MAP_KIND_COLORS, MISSION_STATUS_COLORS, MARKER_COLORS, RADAR_INTENSITY_COLORS, DRIVER_STATUS_COLORS
- **Z-Index Scale**: Unified via `config/ui.ts` Z tokens + tailwind.config.ts mapping (z-fullscreen=9999, z-max=100, z-toast=60, z-overlay=30, etc.) — no more z-[9999] inline
- **Dark Theme**: Deep navy backgrounds (`hsl(228 28% 7%)`) with teal accent (`hsl(168 72% 44%)`)
- **Shadows**: 3 levels only — `--shadow-sm`, `--shadow-md`, `--shadow-lg` (compat aliases: `--shadow-premium-sm`, `--shadow-card`, etc.)
- **Card System**: Unified — `AppCard` (variant system: base/interactive/settings/elevated/kpi, padding: none/sm/md/lg) is the canonical card. Shadcn `Card` aligned to match `AppCard` base styling (rounded-2xl, border-border/15, p-4). All cards use `data-card` attribute for consistent styling hooks
- **Glass Tokens**: `--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-saturate` — used sparingly on headers only
- **Navigation**: Apple-style bottom tab bar — 56px height, solid bg, single border-top, dot active indicator, 22px icons
- **Dashboard**: Clean hero with `var(--gradient-hero)`, no shimmer/decorative elements, uniform card grid
- **Radar**: Map overlay controls use solid bg + shadow-sm (no blur), clean bottom sheet, immersive weather effects (rain/snow/sun/cloud/fog/night/wind/storm overlays driven by weatherCode), MapLibre fog/light atmosphere adapts per-condition. RadarSmartSearch uses V2 unified search store.
- **Orbit**: iMessage-style conversation list, rounded-xl search, muted bg input
- **Page Shell**: Consistent padding (`pt-5 pb-3` mobile, `pt-6 pb-4` desktop), `page-fade-in` animation
- **Chart Palette**: `--chart-1` through `--chart-4` for data visualization
- **Typography**: Plus Jakarta Sans, tight tracking, font-feature-settings. All typography scales use `rem` units for accessibility (design-tokens.ts and responsive-system.ts). Responsive breakpoints aligned between Tailwind config and JS responsive-system (xs:475, sm:640, md:768, lg:1024, xl:1280, 2xl:1400)
- **Animations**: slide-up-fade, shimmer-sweep in Tailwind config; `--ease-silk`, `--ease-out-expo` easing tokens
- **Skeleton Loading**: `skeleton-premium` class with brand-tinted gradient shimmer (subtle `--brand-primary` highlight)
- **Brand Token System**: `src/styles/brand-tokens.css` — centralized CSS custom properties (`--brand-primary`, `--brand-primary-dark`, `--brand-gradient`, `--brand-navy-*`, `--brand-motion-*`, `--brand-glow-*`) with brand animation keyframes (`brand-radar-spin`, `brand-dot-pulse`, `brand-shimmer`, `brand-page-enter`). All brand colors reference these tokens; only exceptions are crash boundaries (inline literals for resilience) and map canvas files (CSS vars unsupported)
- **BrandSuccessFlash Wiring**: `src/lib/events/handlers/brand-success-flash.handler.ts` — Listens to platformBus success events (`wallet:payment_success`, `booking:confirmed`, `storefront:order_placed`, etc.) and triggers the branded flash overlay
- **BrandRefreshIndicator**: `src/components/brand/BrandRefreshIndicator.tsx` — Branded pull-to-refresh spinner using RadarSvg with `brand-radar-spin` animation
- **Mobile Nav Radar Icon**: Bottom nav radar tab uses actual `RadarSvg` component (animated when active) instead of generic Lucide icon

## Query Parameter Secret Rejection Policy (Task #503)
- **Policy**: All Edge Functions reject requests that pass sensitive values (API keys, tokens, secrets, passwords) as URL query parameters. Secrets must be sent via HTTP headers (e.g., `Authorization`, `X-Metrics-Key`, `X-Webhook-Secret`).
- **Guard Module**: `easy-locs-ea1eb0ed/supabase/functions/_shared/reject-query-secrets.ts` — shared middleware that detects sensitive query parameter names (exact matches + regex patterns) and returns `400 Bad Request`
- **Sensitive Params Detected**: `key`, `api_key`, `apikey`, `secret`, `token`, `access_token`, `auth`, `authorization`, `password`, `credential`, `client_secret`, `service_key`, `webhook_secret`, `signing_secret`, `private_key`, plus patterns like `*_key`, `*_token`, `*_secret`
- **Universal Enforcement**: Guard is applied at every Edge Function entry point via three layers: (1) direct `rejectQuerySecrets()` call injected into all 149 `Deno.serve` handlers, (2) `EdgeRouter.serve()` in `_shared/edge-function-consolidation.ts` covers 8 router functions, (3) shared wrappers `withRateLimit()`, `withObservability()`, `withEdgeLogging()` cover 34 wrapped functions
- **Allowlist**: Functions with legitimate query token use can pass `{ allowedParams: ["token"] }` to exempt specific param names. `command-approval-webhook` uses this to allow `?token=` and `?intent=` for email approval links
- **Fixed**: `receive-email` no longer accepts `?secret=` query parameter — webhook secret must be sent via `X-Webhook-Secret` header
- **New Functions**: Any new Edge Function must call `rejectQuerySecrets(req)` at ingress or use a shared wrapper that includes the guard

## Mobile Native Engine — Capacitor Plugins (Task #464)
- **Installed Plugins**: @capacitor/camera, @capacitor/haptics, @capacitor/push-notifications, @capacitor/keyboard, @capacitor/status-bar, @capacitor/splash-screen, @capacitor/network, capacitor-nfc
- **Native Camera** (`src/lib/platform/native-camera.ts`): Photo/video capture with quality, cropping, compression. Presets for KYC (`captureForKYC`) and listing photos (`captureForListing`). Falls back to file input on web
- **Haptics Service** (`src/lib/platform/haptics-service.ts`): Semantic methods — `success()`, `error()`, `warning()`, `selection()`, `impact(style)`, `vibrate(ms)`. Falls back to Vibration API on web. Respects `setEnabled(false)` toggle
- **Push Notifications** (`src/lib/push/registerPush.ts`): Native registration on Capacitor with FCM web fallback. Android notification channels (messages, payments, alerts, marketing). Badge count support. URL validation on notification action navigation (allowlisted hosts only)
- **Keyboard Manager** (`src/lib/platform/keyboard-manager.ts`): Auto-scrolls focused inputs into view. Exposes keyboard height for bottom sheet positioning. Manages accessory bar visibility. Falls back to VisualViewport API on web
- **Status Bar Controller** (`src/lib/platform/status-bar-controller.ts`): Immersive mode for maps/video. Theme-matching (light/dark/auto). Page-specific configuration via `setForPage()`. Native-only (no-ops on web)
- **Splash Screen** (`capacitor.config.ts`): Branded splash with 2s display, 300ms fade-out, immersive mode. Manual hide via `platformCapabilities.hideSplashScreen()`
- **Network Plugin** (`src/lib/network/connection-manager.ts`): Native connectivity monitoring with connection type detection (wifi/cellular/ethernet/none). Falls back to online/offline events + heartbeat on web. Duplicate listener prevention via `webInitialized` guard
- **NFC Service** (`src/lib/platform/nfc-service.ts`): Tap-to-pay flow, property check-in via NFC tag reading. Web NFC API fallback. Tag scan listener pattern with cleanup
- **Platform Capability Layer** (`src/lib/platform/platform-capability-layer.ts`): Updated with 5 new capability IDs (haptics, keyboard, status_bar, splash_screen, nfc). Each capability exposes `{ available, native }` via `getCapabilityResult(id)`. Async native plugin probing on boot. `probeAll()` remains synchronous for backward compatibility

## Per-User Rate Limit Tiers (Task #405)
- **Tier System**: `easy-locs-ea1eb0ed/supabase/functions/_shared/server-rate-limiter.ts` — Three tiers: `free`, `premium`, `enterprise`
- **Resolution**: `resolveUserTier()` normalizes subscription_tier strings to valid `UserTier` values, defaulting to `free`
- **Limit Calculation**: `getTierEndpointLimit()` checks per-endpoint tier overrides first, then applies global multipliers (free=1x, premium=2x, enterprise=5x), then falls back to base endpoint limits
- **Per-Endpoint Overrides**: Premium gets 30/min extract-article, 120/min ai-assistant; Enterprise gets 100/min extract-article, 300/min ai-assistant, etc.
- **Integration**: `checkUserRateLimit()` accepts optional `tier` parameter; `extract-article` function looks up user's `subscription_tier` from profiles table
- **IP Cap**: extract-article IP rate limit raised to 120/min to avoid clamping enterprise users (user-tier limits are the real enforcement)

## Cache Performance Metrics for Article Extraction (Task #377)
- **Metrics Tracking**: `easy-locs-ea1eb0ed/supabase/functions/extract-article/index.ts` — cumulative counters for cache hits, misses, evictions, expirations, and stores with computed hit rate
- **Diagnostic Endpoint**: `GET /metrics` — returns JSON snapshot of all cache metrics (hit rate, current size, uptime, counters); auth via `X-Metrics-Key` header (preferred) or JWT admin role. Client hook (`useCacheMetrics`) uses `X-Metrics-Key` header when `VITE_CACHE_METRICS_KEY` is set, otherwise falls back to JWT auth.
- **Periodic Logging**: `cache_metrics_summary` log entry emitted every 5 minutes during active requests for production monitoring
- **Enhanced Logs**: `cache_hit` and `cache_miss` log entries now include running metrics (hit rate, total misses)

## Cache Metrics Database Persistence (Task #401)
- **Table**: `cache_metrics_log` — stores periodic snapshots of article extraction cache metrics (hits, misses, evictions, expirations, stores, hit_rate, current_size, average_size, max_size, ttl_ms, uptime_ms)
- **Persistence Logic**: `maybePersistMetrics()` in `easy-locs-ea1eb0ed/supabase/functions/extract-article/index.ts` — writes a snapshot every 15 minutes using service role client; first snapshot writes on first request after cold start; timestamp only advances on successful insert (retries on failure)
- **Retention**: Daily cron job (`cleanup-cache-metrics-log`) deletes rows older than 30 days (requires `pg_cron` extension)
- **Security**: RLS enabled, access restricted to `service_role` only
- **Migration**: `easy-locs-ea1eb0ed/supabase/migrations/20260416003511_cache_metrics_log.sql`

## Cache Metrics Dashboard Widget (Task #400)
- **Widget**: `src/components/dashboard/CacheMetricsWidget.tsx` — Admin dashboard widget displaying article cache performance: hit rate with color-coded thresholds (green ≥80%, yellow ≥50%, red <50%), capacity bar, KPI cards (hit rate, size, evictions, expirations) with directional trend indicators, and detailed metrics table (hits, misses, stores, uptime, TTL)
- **Data Hook**: `src/hooks/useCacheMetrics.ts` — Fetches cache metrics from `extract-article/metrics` Edge Function endpoint with 60s auto-polling, previous-snapshot comparison for trend detection, and authenticated requests via Supabase session token
- **Integration**: Lazy-loaded into AdminDashboard health tab between MapErrorTrendsWidget and HealthDashboard

## Map Library: MapLibre GL JS (Mapbox Replacement)
- **Library**: `maplibre-gl` (open-source fork of Mapbox GL JS) — no API key required
- **Basemaps**: CARTO free tiles — dark-matter (dark mode), positron (light mode), voyager (streets/satellite)
- **Geocoding**: Nominatim (OpenStreetMap) for forward/reverse geocoding — `nominatim.openstreetmap.org`
- **Routing**: OSRM for directions — `router.project-osrm.org/route/v1/driving/`
- **Static Maps**: OpenStreetMap static map service — `staticmap.openstreetmap.de`
- **Loader**: `src/lib/mapbox/mapbox-loader.ts` — backward-compatible wrapper (`loadMapbox()` / `getMapboxgl()`) internally loads maplibre-gl
- **Config**: `src/lib/mapbox/config.ts` — `MAPBOX_ACCESS_TOKEN` is empty string; `getMapboxTokenError()` only checks WebGL support
- **Style Engine**: `src/lib/map/engine/style-engine.ts` — returns CARTO style URLs
- **Fonts**: Open Sans (via CARTO) replaces DIN Offc Pro (Mapbox proprietary)
- **CSS Classes**: `.maplibregl-popup-*` (not `.mapboxgl-popup-*`)
- **Vite Chunk**: `vendor-maplibre` chunk in vite.config.ts

## Map Error Analytics & Hardening (Task #234, #570)
- **Analytics Module**: `src/lib/analytics/map-error-analytics.ts` — centralized map error tracking with error type classification (token, webgl, network, init_failure, runtime, unknown), route-aware LRU bounded dedup cache, dual-sink output (structured logger + event bus), DB persistence via `map_error_events` and `map_error_daily_stats` tables
- **Alerting**: `src/lib/analytics/map-error-alerting.ts` — threshold evaluation for error rate spikes
- **Instrumented Components**: All map components (UnifiedMap, LiveMap, ClientMapCard, SellerMapCard, RideLiveMap, RideLiveMapCard, MobilityLiveMap, InAppNavigationView, LocationViewerOverlay) use `useMapErrorHandler` + `useMapRetry` + `useNetworkRecovery` + `MapErrorFallback` with full retry/backoff UI
- **Error Hooks**: `useMapErrorHandler(componentName)` provides `{ mapError, handleMapError, clearMapError }` with analytics tracking; `useMapRetry()` provides exponential backoff retry with cooldown; `useNetworkRecovery()` auto-retries on reconnect
- **Event Types**: `map.load_failure` events in event-bus; `maps.load_failure` / `maps.error_boundary_crash` structured log entries with Sentry breadcrumbs
- **Sentinel Metrics**: `src/core/sentinel/health/sentinel-metrics-collector.ts` collects error rate, map errors, memory, heap, latency (Navigation Timing API), bus event count, active alerts — all emitted via telemetry gauges
- **Omega Bus Bridge**: `src/core/omega/knowledge-graph/omega-bus-bridge.ts` subscribes to platform bus events and ingests into knowledge graph; stats exposed via `getOmegaBusBridgeStats()`

## Map Error Trends Dashboard Widget (Task #240)
- **Widget**: `src/components/dashboard/MapErrorTrendsWidget.tsx` — Admin dashboard widget showing map error rates by type (token, webgl, network, init_failure, runtime), error trends over 7d/30d, errors by component breakdown, and recent error list
- **Data Hook**: `src/hooks/useMapErrorAnalytics.ts` — Aggregates map error data from structured logger buffer (`getErrorsByDomain("maps")`), subscribes to real-time `map.load_failure` events via event bus, supports filtering by error type and component
- **Integration**: Lazy-loaded into AdminDashboard health tab (`src/pages/AdminDashboard.tsx`)
- **Limitation**: Data is in-memory only (structured logger buffer, max 500 entries total); no database persistence yet

## Referral Funnel Dashboard (Task #339)
- **Page**: `src/pages/ReferralFunnelDashboard.tsx` — Full funnel visualization (Shares → Clicks → Sign-ups → Conversions → Credited) with conversion rate percentages between stages, time-series mini bar charts for daily performance, summary KPI cards, and a detailed stage breakdown table
- **Data Service**: `src/services/referralFunnel.service.ts` — User-scoped queries against `activity_logs` (link_shared, link_clicked, share_converted) and `referral_redemptions` (sign-ups, credited) with configurable time range (7/14/30 days), graceful table-not-found handling (42P01)
- **Route**: `/dashboard/referral-funnel` — Protected route registered in `app-route-registry.tsx` and `App.tsx`
- **Cross-link**: Existing Referrals page (`src/pages/Referrals.tsx`) has a "View Funnel" link to the dashboard

## Next-Gen Real Estate Analytics Platform (Task #336)
- **Dashboard Card**: `src/components/dashboard/RealEstateAnalyticsCard.tsx` — Market pulse card on SmartHome dashboard between OrbitPreviewWidget and PropertyDashboardWidget, showing live avg price/sqft, transaction volume with trend arrow, hottest district, and "Deep Dive" CTA linking to full analytics page
- **Building Price History**: `src/components/analytics/BuildingPriceHistory.tsx` — Searchable building selector with transaction table (unit size, price, price/sqft, date, type) and Recharts line chart showing building price-per-sqft trend over time
- **Comparable Sales**: `src/components/analytics/ComparableSales.tsx` — Compact card list of recent similar transactions (same district + property type + bedroom count) with median price benchmarking
- **Cross-Domain Links**: Market Intelligence button on RealEstateDetailPage navigates to DubaiAnalyticsPage pre-filtered by district and building via URL params
- **Filter Interconnection**: DubaiAnalyticsPage district selection cascades into building list; building selection cascades into comparables; URL params (`?district=X&building=Y`) synchronize state
- **Fallback Data**: Enhanced deterministic demo data with realistic building names per district (10-15 buildings each via `DISTRICT_BUILDINGS` map in `fallback-dld-transactions.ts`)
- **Service Methods**: `dldAnalyticsService.getBuildingHistory()`, `.getComparableSales()`, `.getMarketSummary()`, `.getBuildingsForDistrict()`, `.getAllBuildings()` in `dld-analytics.service.ts`
- **Edge Function Endpoints**: `building-history?building=X`, `comparables?district=X&type=Y&bedrooms=Z`, `summary` added to `supabase/functions/dld-analytics/index.ts`

## Dynamic Contextual Logo System
- **`src/hooks/useDynamicLogo.ts`** — Hook that determines logo context (section via router, time of day, special events) and exposes gradient colors, micro-icon, animation intensity
- **Section Detection**: Routes mapped to 8 sections (food, taxi, hotel, commerce, services, travel, immo, orbit) via regex patterns
- **Time-of-Day Gradients**: 4 palettes — dawn (gold-teal), day (teal standard), dusk (teal-violet), night (teal-dark blue)
- **Special Events Calendar**: Client-side calendar for New Year confetti, Christmas snowflakes, Valentine hearts, Ramadan stars/crescent — rendered as SVG particles around the radar
- **Micro-Icons**: Contextual SVG icons in the radar center (fork for food, car for taxi, bed for hotel, etc.) with smooth transitions
- **SplashScreen**: Premium 2s entry animation — radar builds circle by circle, sweep rotates, text appears letter by letter with glow effect, skippable by tap, only shows once per session
- **BrandSuccessFlash**: Enhanced with contextual dynamic props (accepts gradient/micro-icon from current context), radial glow pulse, floating particles
- **AppLogo Integration**: `useDynamicLogo` wired into `AppLogo` — sidebar/header use subtle micro-icons (no event particles), landing/auth use full animations with events

## Strategic Documentation
- **`docs/SUPERAPP_STRATEGY.md`** — Complete strategic analysis comparing Mondikat to WeChat & Grab, with comparative matrix, 7 strategic pillars, Forces Diagram (JTBD), and prioritized roadmap
- **`docs/SUPERAPP_ROADMAP.md`** — Phased implementation roadmap (P0→P3) with inter-pillar dependencies, technical prerequisites from existing codebase, component breakdown, KPIs, and consolidated 24-month timeline
- **`docs/SUPERAPP_DEEP_AUDIT_2026.md`** — Deep audit (April 2026) covering 9 modules (Identity, Wallet/QR, Radar, Dashboard, Backend, News, Prayer, Forex, Onboarding) with 39 upgrade items across 4 phases (14 weeks). Identifies 175 Edge Functions (target <60), 4+ identity sources (target 1 canonical), 20+ service-layer violations, and no rate limiting. Preserves DDD architecture and 11 domain schemas.

## Onboarding Media Pipeline (Task #209)
- **Media Download Service**: Client calls `process-onboarding-media` Supabase Edge Function (server-side) which downloads images, validates dimensions (≥100px, ≤10MB), converts to WebP via OffscreenCanvas, generates 400px thumbnails, uploads to `onboarding-media` bucket. Client service (`media.download.service.ts`) is a thin wrapper around `db.functions.invoke`. Graceful failure keeps original URL but flags it.
- **Quality Scoring**: `media.image.quality_score.ts` — scores based on real image dimensions & file size (not URL patterns). Logo detection uses aspect ratio (~1:1, ≤512px) instead of index position. Cover detection uses landscape ratio (≥1.3, ≥600px width). Expanded stock patterns to 25+ providers (Pexels, Freepik, 123rf, Adobe Stock, Pixabay, etc.)
- **Photo Merge**: `field-merge.engine.ts` — photos now merged from ALL sources (priority-ordered, deduplicated) instead of winner-takes-all `firstByPriority`
- **Photo Deduplication**: Both `photo.deduplicator.ts` and `media.image.deduplicate.ts` preserve resolution-variant query params (w, h, width, height, size, resize, fit, crop, quality, q, dpr) instead of stripping all params
- **Gallery Cap**: Raised from 12 to 20 in `media.cover.select.ts`
- **Photo Validation**: `extractors.ts` `validatePhotoUrls` — removed broken `mode: "no-cors"`, uses proper server-side HEAD requests + URL structure pre-filter. Logo/icon keywords removed from `PLACEHOLDER_PATTERNS` to resolve contradiction with logo detection
- **Pipeline Integration**: `runMediaLayer` is now async, downloads+hosts images before scoring. Menu item `photo_url` and hotel room `imageUrl`/`imageUrls` also processed through download pipeline
- **NormalizedImage Contract**: Extended with `hostedUrl`, `thumbUrl`, `fileSize`, `downloadFailed`, `downloadFailReason` fields

## Onboarding i18n & Media Upload
- **StepMedia file uploads**: Merchant onboarding `StepMedia` uses Supabase Storage (`onboarding-media` bucket) for logo/cover/gallery uploads instead of URL inputs
- **Category covers**: `buildSvg()` in `category-covers.ts` improved with radial gradient, dot pattern overlay, decorative line, drop-shadow emoji, EASY-LOCS sublabel
- **Arabic translations**: Full `obAr` constant with all `ob.*` keys; Arabic `onboarding.*` + `mob.*` (111+ keys) in the `ar` section of translations
- **Wizard i18n**: `taxi.*`, `hotel.*`, `sp.*` keys added to FR/EN/AR — all three wizard files (`TaxiDriverOnboardingWizard`, `HotelOnboardingWizard`, `ServiceProviderOnboardingWizard`) refactored to use `useI18n()` throughout
- **Shared Provider Registration** (Task #321): `onboarding-providers.service.ts` — extracted common provider upsert logic (`buildProviderBase`, `upsertProviderRecord`, `ProviderUpsertPayload` type) used by all three onboarding submit functions (`submitTaxiDriverProvider`, `submitServiceProvider`, `submitHotelProvider`) in `onboarding.service.ts`
- **RTL**: Existing `isRTL()` / `getDirection()` / `RTL_LOCALES` set + `document.documentElement.dir` via locale-switch pipeline handles Arabic RTL automatically

## Commerce + Services (Task #142)
- **Product Variants**: `VariantEditor.tsx` — axis-based variant matrix generator (size/color/material) with per-variant pricing/SKU/stock
- **Product Detail Page**: `/product/:productId` — gallery, specs, variant selector, reviews, similar products, wishlist button
- **CatalogManager Enhanced**: Physical characteristics (weight/dims/brand/material/care/warranty), stock tracking, advanced fields panel
- **Wishlist**: `WishlistButton` toggle + `/me/wishlist` page (Supabase `user_wishlist_items` table)
- **Returns**: Buyer return request on delivered orders (14-day window) via `product_returns` table; `MerchantReturnsPage` for sellers
- **Order Email**: HTML confirmation email via `send-email` edge function (fire-and-forget)
- **Services Domain**: `domains/services/ports.ts` + `service.ts` — booking lifecycle (request→confirm→complete)
- **Services Pages**: `/browse/services` browse + `/browse/services/:providerId` detail with booking flow
- **Provider Dashboard**: 5 pages — dashboard, calendar, services CRUD, availability, earnings (`/provider/*`)
- **Admin Super Dashboard**: `/admin/super-dashboard` — multi-vertical KPI dashboard (food, mobility, commerce, services, property)
- **Notification Mapper**: `mapCommerceEvent` (returns/stock/price-drop) + `mapServiceEvent` (booking lifecycle) added to event mapper
- **DB Migration**: `20260415120000_commerce_services_complete.sql` — product_returns, user_wishlist_items, service_catalog, service_availability, service_bookings_v2, platform_config tables + variant stock trigger

## C2C Classifieds Vertical ("Annonces") — Big-Tech Polish
- **Category Taxonomy**: `src/lib/c2c/c2c-category-tree.ts` — 12 categories (Vehicules, Immobilier, Electronique, Mode, Maison, Loisirs, Multimedia, Famille, Animaux, Emploi, Materiel Pro, Autres), ~100 subcategories, typed attribute schemas per subcategory
- **Data Layer**: `src/repositories/domain/c2c.repo.ts` (cursor-paginated listing queries, offers, reports, reviews, price stats, full-text search) + `src/services/domain/c2c.service.ts` (business logic, offer cycle, moderation wiring)
- **Draft Store**: `src/lib/c2c/c2c-draft-store.ts` — Zustand persist store for 9-step posting wizard
- **Pages (all polished with framer-motion, toast, micro-interactions)**:
  - `/annonces` — Discovery hub (`AnnoncesHub.tsx`) — gradient category grid, trending section, recent searches (localStorage), quick filters (All/Nearby/New/Free), infinite scroll via IntersectionObserver, grid/list view toggle
  - `/annonces/publier` — 9-step posting wizard (`PublierAnnonce.tsx`) — animated step transitions (AnimatePresence), title/description quality indicators, price type hints, photo upload with toast, geolocation with feedback
  - `/annonces/:id` — Listing detail (`AnnonceDetail.tsx`) — touch-swipe gallery, breadcrumb navigation, safety tips panel (collapsible), delivery info card, price intelligence indicator, similar listings carousel, thumbnail strip, share button (native share API), animated sticky action bar
  - `/annonces/recherche` — Advanced search (`RechercheAnnonces.tsx`) — saved searches (localStorage, create/load/delete), filter count badge, clear all filters, grid/list toggle, animated filter panel
  - `/annonces/vendeur/:id` — Seller profile (`SellerProfile.tsx`) — member duration display, rating distribution chart, trust badge with background, verified badges (email/phone), animated stats cards
  - `/annonces/mes-annonces` — Dashboard (`MesAnnonces.tsx`) — stats overview (active/sold/views/favorites), counter-offer via dedicated modal sheet (C2CCounterOfferSheet), offer cards with message preview, toast confirmations on all actions
- **Components**:
  - `C2CListingCard.tsx` — image lazy-load skeleton, hover scale animation, active:scale tap feedback, timeAgo display, distance formatting, photo count badge, condition/negotiable/free badges, toast on save
  - `C2COfferSheet.tsx` — spring-animated bottom sheet, quick discount buttons (-5/-10/-15/-20%), offer expiry picker, % diff indicator
  - `C2CCounterOfferSheet.tsx` — spring-animated bottom sheet for seller counter-offers, quick % increase buttons (+5/10/15/20%), amount diff indicator
  - `C2CReportSheet.tsx` — spring-animated, confidentiality notice, styled reason picker
  - `C2CPaymentQrCard.tsx` (QR code via `qrcode.react`)
- **QR Payment**: `pay_c2c` action in `qr-engine.ts` + `PayC2CQr` interface + `qr.payC2C()` factory
- **Moderation**: `src/lib/c2c/c2c-moderation.ts` — prohibited/suspicious content detection, trust level computation (new/basic/verified/trusted/super_seller), blocklist checking, auto-moderation on publish
- **Notifications**: `mapC2CEvent()` in `notification-event-mapper.ts` — 8 event types (offer_received, accepted, countered, listing_expiry, price_drop, saved_search_match, similar_lower_price, listing_reported)
- **Radar Integration**: `c2c_listing` entity type in `radar-source-adapter.ts` + `fetchRadarC2CListings()` geo-bounds query
- **SEO**: `SEOHead` on all pages with OG tags, Product JSON-LD on detail, noindex on search/profile
- **Boost**: `classified_c2c` in `menu-registry.ts`, `is_boosted` flag on listing cards with amber Zap badge
- **i18n**: 45+ keys per language (EN/FR/AR) in `c2c` section of `i18n-canonical.ts`
- **SmartBanner**: `C2CSmartBanner.tsx` routes updated to `/annonces/*` paths

## WhatsApp Ultra Pro Module
- **Unified Module**: `src/lib/whatsapp-utils.ts` — Single source of truth for all WhatsApp functionality: phone sanitizer, wa.me link generator, multilingual message templates (EN/FR/AR), number validation, country code detection
- **WhatsApp SVG Icon**: `src/components/ui/WhatsAppIcon.tsx` — Proper WhatsApp brand SVG icon replacing all generic MessageCircle icons
- **WhatsApp Button**: `src/components/ui/WhatsAppButton.tsx` — Reusable branded button component with solid/outline/ghost variants, brand green (#25D366), min 48px tap targets
- **Floating CTA**: `src/components/ui/FloatingWhatsAppCTA.tsx` — Sticky floating WhatsApp button for public pages (PublicServiceBooking, ShopPage, StorePage) with dismiss capability
- **Share Preview**: `src/components/ui/WhatsAppSharePreview.tsx` — Compact preview card shown before sharing via WhatsApp (title, image, price, message preview)
- **Consistent Format**: All WhatsApp links use `wa.me` format (no mixed api.whatsapp.com), phone numbers sanitized through `sanitizePhone()`
- **Consolidated Engines**: `social-share.ts`, `contact-utils.ts`, `UniversalShareEngine`, `ShopShareEngine`, `BookingLinkShare`, `BookingsManager` all flow through the unified module
- **Merchant Upgrade**: MerchantOnboardingPage WhatsApp field has format validation, country code detection, and "Test" button

## Canonical Schema Library (`src/lib/schema/`)
A complete canonical schema registry covering all platform domains:
- **canonical-schemas.ts**: 48 TypeScript interfaces (Identity, Organization, Listing, Transaction, Payment, Conversation, Message, etc.)
- **status-enums.ts**: 17 canonical status enums (EntityStatus, TransactionStatus, PublicationStatus, PaymentStatus, etc.)
- **relation-map.ts**: 79 canonical relations between schemas (belongs_to, has_many, has_one)
- **canonical-events.ts**: 130+ canonical event constants (colon-notation only)
- **schema-registry.ts**: 33 top-level schema registry entries with SSOT, verdicts (KEEP/MERGE/REBUILD), duplicates, conflicts
- **SCHEMA_AUDIT_REPORT.md**: Full audit report with duplicate/conflict/notation/domain reconnection status

## Hotel Domain (Vertical)
- **Domain Service**: `src/domains/hotel/` — Hexagonal architecture with ports.ts, service.ts, events.ts
- **State Machine**: HOTEL_BOOKING_TRANSITIONS: pending→confirmed/rejected, confirmed→checked_in/cancelled, checked_in→checked_out
- **Anti-Overbooking**: hotel_room_availability table with UNIQUE(room_id, date) constraint, availability check before booking
- **Tables**: hotel_rooms, hotel_room_availability, hotel_seasonal_pricing, hotel_policies (migration: 20260415600000)
- **Dashboard Pages**: /hotel/dashboard (KPIs + pending/arrivals/departures), /hotel/calendar (monthly grid), /hotel/rooms (CRUD), /hotel/pricing (seasonal)
- **Notifications**: mapHotelEvent in notification-event-mapper.ts — booking_created, confirmed, rejected, cancelled, checked_in, checked_out
- **Client Integration**: TravelHotelDetail.tsx calls checkAvailability per room type on date change; HotelCheckout.tsx re-verifies before booking

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
- **20 State Machines**: `src/lib/state-machines/canonical-machines.ts` + `src/domains/shared/state-machines.ts` — MESSAGE, CALL, UPLOAD, CONNECTION, NOTIFICATION, AUTH_SESSION, CHECKOUT, ONBOARDING, BOOKING, RESERVATION, SUPPORT_TICKET, REPAIR, SUBSCRIPTION, PAYMENT, ORDER, DRIVER, LISTING, MATCH, MODERATION, FLIGHT
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

## Onboarding Pipeline Unification & Governance (Task #214)
- **Single Pipeline Path**: All V1 callers (`run-onboarding-with-review.ts`, `recrawl-runner.ts`, `branch-onboarding-to-storefront.ts`) migrated to `runPipelineV2`. V1 orchestrator (`onboarding-orchestrator.ts`) is now legacy/unused.
- **Geo Validation**: `governance.policy.check.ts` now validates real coordinates (non-null, non-zero, within ±90/±180 bounds, city bounds check). No more `geoGateMet = true`.
- **Quality Gates**: Policy minimum raised 40→55, visibility `search_only` threshold 50→60, `readyToPublish` requires ALL critical fields (missingFields.length === 0).
- **Step Runner**: Fixed soft-fail bug — exhausted soft-fail steps now return `"soft_failed"` status instead of `"failed"`. `StepStatus` type includes `"soft_failed"`.
- **Entity Resolution**: Levenshtein fuzzy matching (distance ≤2 for names >5 chars), group matching against ALL members (not just seed), Arabic↔Latin transliteration for common restaurant/hotel/service terms.
- **AI Description**: Uses `supabase.functions.invoke("storefront-description")` via `@/integrations/supabase/client` instead of raw fetch with `process.env`.
- **Media Scoring**: `quality.media.score.ts` accepts `verifiedImageCount` — unverified external URLs penalized (50% score cut if none verified, proportional penalty otherwise).

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

## Unified Payment Pipeline (E2E)
All verticals (restaurant, hotel, commerce, services) share one canonical payment pipeline:
- **Pipeline**: fraud check → create pending record → Stripe intent → payment UI → webhook confirmation → notification
- **Checkout Pages**: `CheckoutPage.tsx` (storefront), `HotelCheckout.tsx` (hotels), `GuestCheckoutPage.tsx` (OTP → redirect to /checkout), `FoodOrderCheckoutPage.tsx` (redirect to /checkout)
- **Payment Methods**: Card (Stripe Elements), Wallet (atomic transfer), Cash (COD), Mobile Money, Crypto
- **Webhook**: `stripe-webhook/index.ts` handles `payment_intent.succeeded` for all types: `rent_payment`, `seasonal_booking`, `marketplace_booking`, `hotel_booking`, `storefront_order`
- **Amount Validation**: Webhook verifies paid amount matches DB expected total before marking as paid
- **Idempotency**: All handlers skip if already processed (paid/refunded status check)
- **CardPayment Component**: Accepts `metadata` prop for type-specific Stripe intent metadata (hotel_booking_id, order_id, etc.)
- **Unified Receipt**: `OrderReceiptPage.tsx` handles both storefront orders and hotel bookings via URL prefix detection (hotel-{id})
- **Fraud Guard**: `anti-fraud-guard.ts` — rate limiting, velocity checks, idempotency, risk scoring, trust-adjusted limits

## Global Deployment Readiness (12 Pillars)
All 12 pillars implemented for production-ready deployment in any country:

1. **Country Configuration Engine** (`src/lib/country/global-country-config.ts`) — 30-country registry with payment methods, tax rules, legal frameworks, currencies, timezones, RTL flags, and `useCountryConfig()` hook
2. **i18n Completion** (`src/lib/i18n-data/translations.ts`, `src/lib/i18n-data/timezone-map.ts`) — 10 languages (EN/FR/AR/ES/DE/PT/TR/ZH/HI/SW), 180+ city timezone map, browser-auto-detect locale in `i18n.store.ts` (no hardcoded `fr`)
3. **Global Payment Providers** (`src/lib/payments/global-payment-providers.ts`) — 30+ payment method adapters (WeChat Pay, Alipay, UPI, PIX, MercadoPago, M-Pesa, iDEAL, etc), dynamic tax engine, VAT invoice generation
4. **Regional Legal Compliance** (`src/lib/compliance/regional-compliance.ts`) — GDPR, CCPA, LGPD, PDPA, PIPL, POPIA, KVKK, DPDPA frameworks with age verification, DPA signing, consent records, data residency labels
5. **Backend Observability** (`src/lib/observability/edge-function-logger.ts`, `supabase/functions/_shared/structured-logger.ts`, `supabase/functions/_shared/sentry-edge.ts`) — Edge function structured logging, Sentry edge integration, health checks, alert rules
6. **PostGIS & Spatial Intelligence** (`src/lib/geo/postgis-spatial.ts`) — ST_DWithin/ST_Distance/ST_Contains query builders, nearby drivers/merchants, auto-assign zones, spatial indexes, full migration SQL
7. **PWA Production Activation** (`vite.config.ts`) — VitePWA enabled with Workbox runtime caching (NetworkFirst for API, CacheFirst for images/fonts, StaleWhileRevalidate for Google Fonts), autoUpdate registration
8. **Notification System** (`src/lib/notifications/channel-preferences.ts`) — 5-channel (in_app/push/email/sms/whatsapp) × 7-category preference matrix, quiet hours, notification analytics
9. **Design System Unification** (`src/lib/design-tokens.ts`) — Single source of truth for spacing, typography, colors, elevation, radius, breakpoints, grid, animation, gradients + CSS custom properties generator
10. **CI/CD Quality Pipeline** (`.github/workflows/ci.yml`) — TypeScript type check, ESLint, production build, bundle size budget, PWA asset verification, security audit, Lighthouse CI, i18n coverage
11. **Locale Codegen** (`scripts/generate-locales.ts`, npm script `generate:locales`) — Reads `src/lib/i18n-locale-chunks/*.json` filenames and auto-detects display labels from `"locale.name"` key in each JSON file, then generates `src/lib/i18n-locales.ts` (`APP_LOCALES` array + `AppLocale` type + `LOCALE_LABELS`). Adding a new locale is a single-file change: create the JSON file with a `"locale.name"` key and run the script.
12. **SEO & Deep Linking** (`src/lib/seo/structured-data.ts`) — JSON-LD builders for Organization/Restaurant/Hotel/Product/LocalBusiness/BreadcrumbList/WebApplication, meta tags, sitemap generator, Apple/Android deep link config
12. **SEO Ultra 2026** — Elite SEO infrastructure across 14 subtasks:
    - **Build-time plugins**: `vite-plugin-prerender.ts` (static HTML for all SEO routes with @graph JSON-LD, hub-and-spoke links, FAQ, definition boxes), `vite-plugin-sitemap.ts` (8 sub-sitemaps: core, countries, cities, services, activities, marketplace, guides, best), `vite-plugin-indexnow.ts` (URL submission to IndexNow API), `vite-plugin-feeds.ts` (RSS feeds: feed.xml, feed/cities.xml, feed/services.xml), `vite-plugin-og-images.ts` (dynamic SVG OG images per city/service/country), `vite-plugin-seo-validate.ts` (build-time SEO health report with score)
    - **SEO data**: `vite-seo-data.ts` — 30+ service categories, 20+ activity types, 80+ city slugs, 30+ country slugs, provider count helper
    - **Content hub**: City guides (`/guide/:city`), best-of pages (`/best/:service/in/:city`) with topical authority content, FAQ, hub-and-spoke navigation
    - **Structured data**: @graph JSON-LD pattern with LocalBusiness, BreadcrumbList, FAQPage, ItemList, Service, HowTo, Article schemas per route
    - **Trust files**: `robots.txt` (AI bot rules), `security.txt`, `humans.txt`, `llms.txt`, IndexNow key
    - **HTTP headers**: `_headers` with X-Robots-Tag per-route, RSS cache, Permissions-Policy, CSP, HSTS
    - **Speculation Rules**: Prefetch/prerender for city, country, and service pages
    - **Image SEO**: Resource hints (dns-prefetch, preconnect for CDN), font-display:swap, fetchpriority
13. **Boot Performance** (`src/lib/performance/progressive-boot.ts`) — 3-phase boot (critical/interactive/background), connection-aware asset loading, performance grading (A-F), 3s boot budget

## Architecture (Super-App v3)
- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RPC)
- **State**: React Query, custom contexts (AuthContext, I18nContext)
- **i18n**: Custom i18n system — runtime in `src/lib/i18n.tsx`, translation data split into per-locale JSON chunks in `src/lib/i18n-locale-chunks/` (45 `.json` files, one per locale). Only active locale + en/fr fallbacks loaded on startup; other locales fetched on demand when user switches language. Loader logic in `src/lib/i18n-data.ts` (~98 lines) uses dynamic `import()` of JSON files via `m.default`. Onboarding translations in `src/lib/i18n-onboarding.json` (thin TS re-export wrapper in `.ts`). Onboarding extras in `src/lib/i18n-onboarding-extra.json`. Islamic section in `src/lib/i18n-islamic.json` + `src/lib/i18n-islamic-extra.json` (pre-transposed to locale-first format; thin TS wrappers re-export). 45 locales supported. RTL handled for ar, he, ur, fa. SUPPORTED_LOCALES source-of-truth in `i18n-advanced.ts`. Super-app keys via `src/lib/i18n-data/translations-extra.ts` merged into GLOBAL_TRANSLATIONS.
- **Navigation**: 5-tab bottom nav via `src/config/navigation.ts`. Smart cross-pillar navigation via `src/lib/navigation/` (intent engine + pillar rules + overlay-first pattern + return-to-origin)

## Map Error Handling & Fallback UI (Task #220)
- **MapErrorFallback**: `src/components/map/MapErrorFallback.tsx` — Shared fallback component shown when maps fail to load. Displays a styled "Map unavailable" message with optional location coordinates, label, and compact mode. Used by Mapbox-based components (SuperMap, LiveMap, ClientMapCard, SellerMapCard, RideLiveMap). Leaflet maps and InAppNavigationView currently use inline fallback blocks (standardization pending).
- **Token validation**: All Mapbox-based maps check `MAPBOX_ACCESS_TOKEN` before initialization and show fallback UI if missing/empty.
- **Auth error detection**: Maps listen for Mapbox `error` events with "access token", "unauthorized", or "401" messages and switch to fallback.
- **try/catch wrapping**: All `new mapboxgl.Map()` and `L.map()` calls are wrapped in try/catch to prevent black screen crashes.
- **useMapCore**: `src/hooks/map/useMapCore.ts` now returns `{ mapRef, ready, error, easeTo, fitBounds }` — `error` state enables SuperMap and other consumers to render fallback.
- **Components hardened**: SuperMap, LiveMap, ClientMapCard, SellerMapCard, RideLiveMap, MobilityLiveMap, InAppNavigationView, ChatLocationPicker (static image fallback), LiveTrackingMap, ServiceTrackingMap, PropertyMapView, RealEstateMapView, GeoExplorerPage (ExplorerMap).

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

### Edge Function Consolidation (Task #569)
~200 standalone Edge Functions consolidated down to **35 deployed endpoints** (22 routers + 11 webhooks + 2 crons). All other ~180 functions are internal-only (accessed via router proxy, blocked from direct access by `requireRouterOrigin` guard). All routers include JWT verification and tier-aware rate limiting via shared middleware.

**Domain Routers**: `admin-router`, `ai-router`, `ai-proxy`, `booking-router`, `commerce-router`, `food-router`, `gdpr-router`, `identity-router`, `infra-router`, `logistics-router`, `marketplace-router`, `media-router`, `notification-router`, `orbit-router`, `rent-router`, `search-router`, `stripe-router`, `system-router`, `voice-router`, `wallet-router`, `webauthn-router`, `public-api`

**Shared Middleware** (`_shared/`):
- `edge-function-consolidation.ts` — EdgeRouter class with `requireAuthenticatedUser`, `checkUserRateLimit`, per-route `skipAuth`/`skipRateLimit`, `proxyToFunction` helper
- `domain-router.ts` — `createDomainRouter` with auth, rate limiting, metrics, CORS
- `edge-auth.ts` — JWT verification (`requireAuthenticatedUser`, `requireServiceRole`)
- `server-rate-limiter.ts` — Tier-aware rate limiting (free: 60/min, premium: 300/min, enterprise: 1000/min)

**ai-proxy** — Dedicated storefront AI endpoint: `describe-storefront`, `generate-tags`, `suggest-price`, `chat` (generic with tier-aware token limits)
**system-router** — Health, analytics, metrics, `firecrawl-usage` aggregation, `cache-metrics`

**Internal Function Guard** — All ~196 downstream functions enforce `requireRouterOrigin(req)` at entry: rejects direct public calls, only allows requests via routers (X-Router-Origin header) or service-role callers. `EDGE_ROUTER_SECRET` env var is **required** (fails closed if unset).

**Domain Boundary Enforcement** (`src/lib/architecture/domain-boundaries.ts`):
- `ARCHITECTURE_RULES` now includes `NO_DIRECT_DB_SERVICE_IN_PAGES`, `NO_DIRECT_STORAGE_IN_UI`, `NO_DIRECT_REALTIME_IN_UI`
- `checkImportViolation(filePath, importPath)` helper for programmatic checks
- `EDGE_FUNCTION_CONSOLIDATION_MAP` records which standalone functions each router absorbs

**CI Enforcement** — `scripts/check-domain-boundaries.sh` verifies all internal functions have the router-origin guard and checks UI-layer import rules. Run before merge.

Full routing map in `supabase/functions/NAMING_CONVENTION.md`.

### Edge Functions (Legacy Reference)
- `autonomous-cron-dispatcher` — Server-side pg_cron replacement, dispatches all scheduled jobs (including omega-server-loop, sentinel-server-guards, command-center-api)
- `omega-server-loop` — Server-side Omega intelligence cycle (KG scan, priority scoring, incident detection, prediction). Runs every 5 min via pg_cron. Writes to `server_events` + `omega_decisions`.
- `sentinel-server-guards` — 5 critical Sentinel engines (Health, Conflict, Healing, Validation, Invariants) with per-engine circuit breakers. Quarantines failing engines independently.
- `command-center-api` — RESTful API for engine governance: GET status, POST approve-repair, POST quarantine, POST release, GET history, GET agents, GET events
- `prayer-push-cron` — Scans `prayer_push_schedules` every 60s, sends push notifications for prayers within a 2-minute window. Dedicated pg_cron job (`prayer-push-cron-direct`) calls it every minute via `pg_net`, bypassing the 5-minute dispatcher cycle. Health check (`prayer-push-cron-health`) runs every 15 minutes and alerts via `server_events` on consecutive failures. **Retry logic**: Failed sends are tracked via `prayer_send_states` JSONB column with claimed/sent/failed states; failed prayers are retried on subsequent cron cycles up to `max_retry_count` (default 3). Stale claims (>5min) are automatically reclaimed. State transitions use `mark_prayer_sent`/`mark_prayer_failed` DB functions with guarded updates (only transitions from 'claimed' state).

### Unified Cron Response Reconciliation (migration: `20260417100000_unified_cron_response_reconciliation.sql`)
- `monitored_http_dispatch(job_name, endpoint, body, requires_auth)` — Generic reusable wrapper for all pg_net cron dispatches. Logs to `cron_execution_log`, stores `pg_net_request_id` in metadata, sends failures to DLQ. All pg_net cron jobs (prayer-push, job-runner, dlq-processor, watchdog, email-queue, etc.) now use this function
- `monitored_prayer_push_cron()` — Thin wrapper that delegates to `monitored_http_dispatch('prayer-push-cron', 'prayer-push-cron')` for backward compatibility
- `reconcile_cron_responses()` — Generic reconciliation for ALL pg_net dispatches. Checks `net._http_response` for completed dispatches, updates `cron_execution_log` status from 'success' to 'failure' when Edge Function returns non-2xx, fires `server_events` alerts and DLQ entries. Handles stale dispatches (>10 min no response), transport errors, and timeouts
- `check_cron_dispatch_health(job_name)` — Generic health check for any cron job. Returns healthy/warning/degraded/critical based on consecutive failures and 24h failure rate; inserts `server_events` alerts on degraded/critical
- `check_prayer_cron_health()` — Backward-compat thin wrapper around `check_cron_dispatch_health('prayer-push-cron')`
- pg_cron jobs: `prayer-push-cron-direct` (every minute), `prayer-push-cron-health` (every 15 minutes), `cron-response-reconcile` (every 2 minutes — replaces prayer-push-reconcile)
- All 11 pg_net cron dispatches now flow through `monitored_http_dispatch`: autonomous-cron-dispatcher, dlq-processor, watchdog-ping, job-queue-worker, cache-manager-refresh, backup-storage-nightly, external-health-check, email-queue-process, process-job-queue, expire-pending-referrals, cleanup-orphan-media
- `integration-health-cron` — Dedicated Edge Function for automated integration health checks (Plaid, LiveKit, Meilisearch). Runs every 5 minutes via pg_cron + pg_net (`monitored_integration_health_cron` wrapper). Logs results to `analytics.integration_health_log` for continuous uptime tracking. Cleanup job (`prune-integration-health-log`) runs weekly to remove rows older than 90 days. Migration: `20260417700000_integration_health_cron.sql`
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
   - **Gestion Immo** (`/property-hub`): Unified property management hub with 3 verticals — Hotel, Seasonal Rentals, Long Term Rentals + Tenant access
     - **Hotel section**: KPIs (occupancy, revenue, pending bookings), navigation to `/hotel/dashboard`, `/hotel/calendar`, `/hotel/rooms`, `/hotel/pricing`
     - **Seasonal Rentals section**: KPIs (active bookings, pending requests, revenue), navigation to `/dashboard/seasonal-rentals`, channel manager, dynamic pricing
     - **Long Term Rentals section**: Portfolio KPIs, property CRUD, navigation to tenants, leases, rent cockpit, maintenance, accounting, documents
     - **Tenant access**: Simplified view for tenants with rent, payments, documents, maintenance
     - Hub repository (`property-management-hub.repository.ts`) fetches aggregated KPIs across all 3 verticals
     - Old Zustand store (`propertyManagementStore.ts`) and local types (`lib/types/property-management.ts`) removed — all data flows through canonical DB services
     - Per-property detail (`/me/gestion-immo/:propertyId`): 5 tabs (Overview/Bail/Appels/Quittances/Paiements), auto-generate bail & quittances, mark payments
     - Tenant view (`/me/tenant-view`): Locataire dashboard using canonical `realEstateLeaseService` and `realEstatePaymentService`
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

### News / Actualités System
- **Edge Function Proxy**: `supabase/functions/rss-proxy/` — Server-side RSS proxy that fetches Google News RSS directly, parses XML, returns JSON. Eliminates rss2json.com dependency. 10-min server cache TTL.
- **News Provider**: `src/lib/intelligence/global/news-provider.ts` — Calls rss-proxy Edge Function instead of rss2json.com. MAX_ITEMS=20. Circuit breaker + client cache + rate limiter preserved.
- **NewsDashboardSection**: `src/components/dashboard/NewsDashboardSection.tsx` — Shows 5 latest articles on SmartHome dashboard with skeleton loaders and error retry. Placed below IntelligenceTicker.
- **NewsPage**: `src/pages/NewsPage.tsx` — Full news page with category filters. ArticleReader fetches full article content from source URL on open (via article-extractor), with graceful fallback to RSS summary. Paywall detection shows clear messaging with lock icon. "Lire sur le site source" external browser button always available.
- **Article Extractor**: `src/lib/utils/article-extractor.ts` — Smart article content fetcher with server-first strategy. Tries server-side extraction via `extract-article` Edge Function (handles JS-rendered pages via Firecrawl + direct fetch fallback), then falls back to client-side CORS proxy extraction. Paywall detection returns `paywallDetected` flag with user-facing message. In-memory cache with 10min TTL (1min for failures). Max 30 cached entries.
- **Extract Article Edge Function**: `supabase/functions/extract-article/index.ts` — Server-side article extraction endpoint. Uses Firecrawl API (when `FIRECRAWL_API_KEY` is set) for JS-rendered pages, falls back to direct HTTP fetch with content extraction heuristics. Detects paywalls via text indicators and meta patterns. Returns extracted HTML, text length, source, and paywall status.
- **ArticleBody Component**: `src/components/news/ArticleBody.tsx` — Renders article content with HTML sanitization. Shows paywall indicator (lock icon + message) when paywall is detected. Loading spinner during extraction.
- **useNewsData hook**: `src/hooks/useNewsData.ts` — Auto-refresh 5min, pull-to-refresh, category filtering.

### Integration in SmartHome.tsx
- NewsDashboardSection after IntelligenceTicker
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
- **useVisibilityAwareInterval** (`src/hooks/useVisibilityAwareInterval.ts`): Shared hook for interval-based polling that pauses when the tab is hidden (Page Visibility API). Returns `{ countdown, isVisible, reset }`. Used by all admin dashboards, health widgets, and polling pages to avoid wasted network requests in background tabs

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
Ultra-fluid mobility experience comparable to Uber/Careem/Bolt 2026:
- **Taxi Page** (`/mobility/taxi`): Fullscreen Mapbox map background with glassmorphism header overlay and draggable TaxiBottomSheet (peek/half/full snap points). 5-step flow: search → preview → requesting → tracking → completed. Map persists across search↔preview transitions.
- **TaxiSearchScreen**: Controls inside bottom sheet — pickup/destination inputs, recent destinations for 1-click rebook, Now/Schedule toggle. Map visible behind the sheet.
- **TaxiPreviewScreen**: Same fullscreen map + bottom sheet pattern. Route displayed with animated dash-array line + glow effect. Service options, fare breakdown, promo code, and confirm button in the bottom sheet. Map auto-fits to route with padding adapted to bottom sheet height.
- **TaxiRequestingScreen**: Animated radar with Jade ripple rings, status messages with check animations, cancel option
- **TaxiTrackingScreen**: Real RideLiveMap with driver/pickup/dropoff markers, full driver card (photo/name/vehicle/plate/rating), Call/Chat/Share buttons (Orbit integration), 8-step timeline (searching→accepted→arriving→at_pickup→picked_up→in_progress→arriving_dropoff→completed), live speed display
- **TaxiCompletedScreen**: Fare summary, 5-star rating, tip flow (0/5/10/20/50), bottom-sheet receipt with route details
- **TaxiBottomSheet**: Draggable bottom sheet component with 3 snap points (peek 220px, half 55vh, full 85vh), spring animation, grip handle
- **Delivery Page** (`/mobility/delivery`): Obsidian header, ActiveDeliveryTracker component per active job with progress bar + rider call/chat (Orbit integration), delivery statuses (finding→assigned→heading_to_pickup→at_pickup→picked_up→on_the_way→almost_there→delivered)
- **Dashboard Integration**: SuperServicesGrid shows active rides/deliveries banners with LIVE badge for quick access
- **MobilityLiveMap**: Fullscreen mode support, professional SVG car/pickup/dropoff markers (no more emoji), animated route with continuous dash-array animation + glow layer, shimmer loading skeleton, Mapbox preloading via `preloadMapbox()`, bottom-padding-aware fitBounds reactivity
- **Active Rides**: Floating card positioned above the bottom sheet under the glassmorphism header
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
- **PIN lockout**: Unified 15-minute lockout across all edge functions (wallet-pin, wallet-transfer, wallet-ops) using atomic RPCs
- **PIN hashing**: Argon2id via hash-wasm (WASM, edge-compatible) with backward-compatible verification for 4 hash formats (argon2id, pbkdf2-sha256, hmac-sha256 prefixed, legacy HMAC)
- **PIN source of truth**: `profiles.wallet_pin_hash` is the single source — wallet-ops reads from profiles (not wallet_pins). PIN actions (set/verify/check_status) live exclusively in wallet-pin edge function
- **PIN flow**: Server-side PIN management via wallet-pin edge function with actions: `set_pin`, `change_pin`, `verify_pin`, `check_status`, `request_reset`, `reset_pin`, `update_daily_limit`
- **PIN change security**: `change_pin` requires verification of current PIN before allowing a new PIN. `set_pin` is blocked if a PIN already exists (must use `change_pin`)
- **PIN reset**: OTP-based reset via email — `request_reset` generates OTP stored in Redis (10min TTL), `reset_pin` validates OTP before setting new PIN
- **PIN validation**: Server rejects sequential PINs (012345), repeated digits (111111), and non-6-digit values
- **Biometric**: WebAuthn-based with iframe detection — gracefully shows "not available in this environment" with PIN fallback messaging instead of error
- **Anti-fraud server-side**: wallet-transfer edge function enforces Redis-backed velocity checks, rate limiting, duplicate detection, rapid succession detection, hourly volume limits, and unique recipient caps — all trust-level adjusted
- **Client anti-fraud**: Kept as UX pre-check only (`anti-fraud-guard.ts`), not security barrier
- **Daily limit protection**: `daily_transfer_limit` UPDATE privilege revoked from client roles — must go through `update_daily_limit` action on wallet-pin edge function which validates against trust score
- **RLS hardening**: `wallet_pin_hash` column privilege revoked from authenticated/anon (REVOKE SELECT/UPDATE). `wallet_pins` table has no client-facing policies. `profiles_safe` view available for client queries
- **Atomic PIN lockout**: `atomic_pin_fail_increment` and `atomic_pin_success_reset` SQL RPCs (SECURITY DEFINER) used by both wallet-pin and wallet-transfer — single UPDATE...RETURNING eliminates race conditions on concurrent PIN attempts
- **Idempotency**: Transfer idempotency key generated at click time via `crypto.randomUUID()`, persisted in Redis for 5min dedup
- **Note validation**: wallet-transfer enforces max 500 chars for `note` field
- **Money formatting**: Canonical `formatMoney` from `@/lib/format` used everywhere (no inline `Intl.NumberFormat`)
- **Atomic wallet-ops**: SQL RPCs (`wallet_authorize`, `wallet_settle`, `wallet_reverse`) in migration `20260414210000_wallet_ops_atomic_rpcs.sql`. wallet-ops authorize uses atomic PIN RPCs and `profiles.wallet_pin_hash` with ownership check
- **wallet-engine.ts**: `setWalletPin`/`verifyWalletPin` delegate to `security-pin.repository.ts` which calls wallet-pin edge function (not wallet-ops)
- **Error feedback**: PinManagement.tsx shows server-side error messages directly, retry count tracker, and support link after 3+ failures

## Phone + OTP Identity Activation System
The app uses phone number + OTP as the root identity activation method. Phone is the default auth tab on both Login and Signup pages.

**Architecture** (Custom OTP — bypasses Supabase native phone auth entirely):
- `src/lib/auth/phone-identity.ts` — Phone verification service using custom edge functions (not `supabase.auth.signInWithOtp`)
- `src/lib/security/otp-hardened.ts` — SHA-256 hashed OTP creation, rate limiting (5 sessions/30min), 10min expiry
- `supabase/functions/send-otp/` — Edge function that sends SMS via Twilio REST API. Requires edge function secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Supports `{ probe: true }` for health checks without sending SMS. Fails closed if Twilio not configured (returns `SMS_NOT_CONFIGURED` error code).
- `supabase/functions/verify-otp/` — Edge function that validates OTP against `phone_otp_sessions`, creates/finds Supabase user via `auth.admin`, generates magic link for session establishment.
- `src/lib/auth/identity-activation-pipeline.ts` — Post-OTP chain with retry/backoff: account → orbit profile → wallet → contact sync offer
- `src/lib/contacts/contact-sync-service.ts` — Contact sync service for platform discovery (batch phone matching, native Contacts API)
- `src/components/auth/PhoneOTPFlow.tsx` — 3-step animated UI (phone input → 6-digit OTP → verified) with phone format validation, cooldown, provider health gating
- `src/components/auth/ContactSyncPrompt.tsx` — Post-signup contact sync prompt with privacy notice

**Flow**:
1. User enters phone number → `createOtpSession` generates OTP, stores SHA-256 hash in `phone_otp_sessions`, sends via `send-otp` edge function (Twilio)
2. User enters 6-digit code → `verify-otp` edge function compares hash, rate-limited (5 attempts, 10min expiry)
3. On verification: edge function creates/finds user via `auth.admin.createUser` or `auth.admin.listUsers`, generates magic link for session
4. Client establishes session via `auth.verifyOtp({ token_hash })`, then runs identity activation pipeline
5. New users get contact sync prompt before redirect; returning users redirect immediately

**Twilio Setup** (required for phone OTP to work):
- Set these as Supabase Edge Function secrets (NOT Replit env vars): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

## Auth Provider Health-Check System
- `src/lib/auth/provider-health.ts` — Checks availability of Phone/Google/Apple providers with 10min cache TTL + sessionStorage persistence
- `src/hooks/useAuthProviders.ts` — React hook exposing `{ phone, google, apple, loading, error, refresh }`
- Phone: probed via `send-otp` edge function with `{ probe: true }` (no SMS sent, checks Twilio config)
- Google/Apple: verified via dry-run OAuth (skipBrowserRedirect) and error detection
- `SocialLoginButtons` always shows Google/Apple buttons — greyed out with "Bientôt disponible" tooltip when not enabled (never hidden)
- `PhoneOTPFlow` shows disabled state with "service SMS en cours de configuration" when phone unavailable
- Google/Apple OAuth: requires enabling in Supabase Dashboard (Authentication → Providers). Code handles both enabled and disabled states gracefully.

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
- **Predictive preloading**: `src/lib/performance/predictive-preloader.ts` — NavigationPredictor tracks transition frequencies in an LRU model (200 entries), computes Markov-chain probabilities per route, preloads top-3 likely next routes with >15% confidence. Session-persisted. Integrated with PillarSuspenseBoundary and PrefetchEngine.
- **Per-module prefetching**: Adjacent routes preloaded when entering a module
- **Web Workers**: `src/workers/` — Comlink-based typed RPC messaging (worker-rpc.ts wraps Comlink expose/wrap). Four worker pools: search indexing (search.worker.ts, 2 workers, wired into search-resolver fallback), analytics batching (analytics-batch.worker.ts, 1 worker, wired into event-bus with PostHog delivery), data normalization (data-normalize.worker.ts, 2 workers), E2EE crypto (crypto.worker.ts, 2 workers, wired into message-e2ee encrypt/decrypt). Auto-scaling based on `navigator.hardwareConcurrency`, idle timeout cleanup, 30s RPC timeout.
- **Cross-tab sync**: `src/lib/cross-tab-sync.ts` + `src/workers/shared-tab-sync.worker.ts` — SharedWorker for cross-tab state. BroadcastChannel + sessionStorage hydration fallback. Subscribe-before-init lifecycle with pending subscriptions replay. Channels: `orbit:unread`, `wallet:balance`, `notifications:count`, `auth:state`. Wired into walletStore, notification.store, orbit-unread-counter via `src/lib/cross-tab-subscribers.ts`.
- **Pillar Suspense**: `src/components/navigation/PillarSuspenseBoundary.tsx` — React Suspense + useTransition at pillar level, pillar-aware skeleton shells, predictive route preloading on navigation.
- **Performance budget**: Per-pillar budgets (dashboard: 350KB, radar: 400KB, orbit: 300KB, wallet: 300KB, me: 350KB). JSON report output (`dist/budget-report.json`). CI enforcement via `CI=true` or `BUDGET_ENFORCE=true` env vars.
- **Service Worker caching**: Supabase REST API upgraded to StaleWhileRevalidate (10min, 200 entries). Auth/realtime/storage endpoints remain NetworkFirst (2min, 50 entries).
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
- **DLD API Client**: `supabase/functions/_shared/dld-api-client.ts` - Shared module for fetching and normalizing DLD API responses
- **Edge Function**: `supabase/functions/dld-analytics/index.ts` - Multi-endpoint router that:
  1. Tries to fetch fresh data from the live DLD API (when `DLD_API_KEY` is configured)
  2. Upserts fetched data into `analytics.dld_transactions` Supabase table
  3. Serves analytics queries from the database
- **Frontend Service**: `src/services/dld-analytics.service.ts` - Calls edge functions first, falls back to hardcoded demo data only when edge functions are unavailable
- **Fallback Data**: `src/data/fallback-dld-transactions.ts` - Realistic generated data used only when live API and database are both unavailable

### Environment Variables
- `DLD_API_KEY` - API key for the DLD REST API (required for live data)
- `DLD_API_URL` - Base URL for DLD API (defaults to `https://gateway.dubailand.gov.ae/open-data`)
- `VITE_SUPABASE_EDGE_URL` - Base URL for Supabase edge functions (frontend)

### Endpoints
- `sync` - Triggers a data sync from DLD API into Supabase (automated daily via `dld-data-sync` cron job in autonomous-cron-dispatcher)
- `backfill` - Historical backfill pulling up to 24 months of DLD data in monthly batches (admin auth required). Params: `months` (default 24, max 36). Uses upsert so safe to re-run; reports truncation if a month exceeds page cap
- `backfill-status` - Returns backfill run history and transaction date coverage
- `status` - Returns current data source configuration and record counts
- `kpis`, `districts`, `trends`, `transactions`, `top-transactions`, `building-history`, `comparables`, `buildings`, `summary` - Analytics query endpoints

### Scheduled Sync (Task #539)
- **Shared Sync Module**: `supabase/functions/_shared/dld-sync.ts` - Extracted sync/upsert/tryLiveDLDFetch logic shared by `dld-analytics` and `dld-sync-cron`
- **Cron Edge Function**: `supabase/functions/dld-sync-cron/index.ts` - Scheduled DLD data sync
  - Daily full sync at 03:00 UTC (`dld-sync-daily` pg_cron job)
  - Hourly recent-data sync at :15 past each hour (`dld-sync-hourly` pg_cron job, fetches last 7 days)
  - Auth: service role key or `DLD_SYNC_CRON_SECRET`
  - Respects existing 10-minute cooldown (bypassed for `fullSync` mode)
  - Logs all runs to `analytics.dld_sync_log` table
- **Migration**: `supabase/migrations/20260417500000_dld_sync_log_and_cron.sql` - Creates sync log table and pg_cron schedules

### Data Flow
```
DLD REST API -> Edge Function (fetch + normalize) -> Supabase DB -> Edge Function (query) -> Frontend
                                                                                          |
                                                                            Fallback Demo Data (if edge function unavailable)
     ^                                                                       
     |--- pg_cron (daily full + hourly recent) -> dld-sync-cron Edge Function
```

## Phase 2 Feature Expansion Engine

### ML Recommendation Engine (`src/engines/recommendations/recommendation-engine.ts`)
- pgvector cosine similarity RPC via `vector-similarity-search` edge function
- Open-Meteo weather API contextual signals (rainy/hot/cold/sunny boosts)
- Recency decay (7-day half-life exponential decay)
- `scoreRecommendationsAsync()` for async pgvector + weather pipeline
- Synchronous `scoreRecommendations()` fallback preserved

### Bank Linking — Plaid (`src/services/plaid.service.ts`, `src/components/payments/BankLinking.tsx`)
- Link token creation, public token exchange, ACH transfers via `plaid-link-token` edge function
- Income verification via edge function
- Real-time webhooks via `plaid-webhook` edge function — handles ITEM errors, TRANSACTIONS sync, AUTH updates
- Webhook verification using Plaid JWT (ES256 + SHA-256 body hash); required in production, optional in sandbox/development
- Webhook events logged to `plaid_webhook_events` table for audit trail
- UI: account cards, balance display, inline top-up with amount input
- Accounts stored in `plaid_items` table with AES-GCM encrypted access tokens
- `plaid_items` extended with `status`, `error_code`, `error_message`, `cached_balances`, `last_balance_refresh`, `last_auth_update` columns
- Supabase secrets: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_ENCRYPTION_KEY`
- Plaid webhook URL: `{SUPABASE_URL}/functions/v1/plaid-webhook`
- Setup: `./scripts/setup-integrations.sh set-plaid`

### E-Signatures (`src/services/e-signature.service.ts`, `src/components/payments/ESignatureFlow.tsx`)
- Persisted in `signature_envelopes` table (Task #537) — survives refresh/restart
- Signing envelope creation (landlord + tenant parties)
- Canvas signature pad with touch/mouse drawing
- Party-level status tracking (pending/signed/declined) stored as JSONB
- RLS: creator and parties (matched by email) can view/update
- Signed document download

### OCR for KYC (`src/services/ocr.service.ts`, `src/components/payments/KycDocumentScanner.tsx`)
- Tesseract.js worker integration with confidence scoring
- Field extraction: name, DOB, document number, expiry, nationality, gender
- Document type detection (passport, ID card, driver's license)
- Camera capture + file upload, editable review with re-scan

### LiveKit Video Infrastructure (`src/hooks/useLiveKitRoom.ts`, `src/lib/webrtc/peer.ts`)
- `useLiveKitRoom` hook: connect/disconnect, mute/camera/screen share toggles, recording
- `createLiveKitConnection()` and `connectToRoom()` with graceful fallback to raw WebRTC
- Adaptive streaming, dynacast, multi-participant support
- Edge function: `livekit-room-token` (create_room, join_room, start_recording, stop_recording)
- Server uses LiveKit's Twirp API for room management, HMAC-SHA256 JWT for auth tokens
- Supabase secrets: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
- Frontend env var: `VITE_LIVEKIT_WS_URL` (WebSocket URL, e.g. `wss://project.livekit.cloud`)
- Setup: `./scripts/setup-integrations.sh set-livekit`

### BNPL Checkout (`src/services/bnpl.service.ts`, `src/components/payments/BnplCheckout.tsx`)
- Persisted in `bnpl_plans` table (Task #537) — plans and installment schedule survive refresh/restart
- Eligibility check, installment count selector (3/4/6)
- Payment schedule preview with date/amount breakdown
- Installment payment tracking with auto-completion status
- 0% interest badge, expandable UI

### Micro-Insurance (`src/components/payments/MicroInsurance.tsx`)
- Toggle switch for package/trip protection at checkout
- Dynamic premium calculation based on order amount
- Coverage details accordion with line items

### Search Resolver Upgrade (`src/lib/search-engine/search-resolver.ts`)
- Meilisearch primary via `search-meilisearch` / `marketplace-router` edge functions
- Faceted filters (vertical, subcategory, city)
- Sort: price_asc/desc, rating, newest
- Graceful fallback: Meilisearch → search-global FTS → client-side
- Bulk sync via `sync-meilisearch` edge function (shops, products, properties, services, profiles)
- Automated incremental sync via `sync-meilisearch-cron` edge function (every 15 min via pg_cron + dispatcher)
- Near-real-time indexing via `search_sync_queue` table with DB triggers on all indexed tables
- Sync history tracked in `search_sync_log` table; visible in admin dashboard Health tab (`SearchSyncStatusWidget`)
- Supabase secrets: `MEILISEARCH_URL`, `MEILISEARCH_API_KEY`
- Setup: `./scripts/setup-integrations.sh set-meili`
- Post-deploy sync: `supabase functions invoke sync-meilisearch --body '{}'`

### i18n Expansion (`src/lib/i18n-data/translations-super-app.ts`)
- New feature keys for esign, OCR, bank, video, BNPL in 6 languages (en, fr, ar, es, pt, tr)
- Language selector component (`src/components/i18n/LanguageSelector.tsx`) with Intl.DisplayNames
- RTL support via `dir` attribute on document root + CSS logical properties (`-end`/`-start`)

### Social Graph Enrichment
- Mutual friend badge with `UserCheck` icon overlay on avatars
- i18n-aware `FollowersList` and `FollowingFeed` components
- Activity type label keys for feed items

## Layer 7 — DevOps & Infrastructure Automation (Task #574)

### Cron Job Scheduling & Monitoring
- **Stale referral expiry** runs daily at 02:00 UTC via pg_cron → `expire-pending-referrals` edge function
- Referral code owners receive notifications via `notification-dispatcher` when pending referrals expire
- **Referral channel tracking**: `channel` field on referral click events (WhatsApp, LinkedIn, copy, direct, etc.) with breakdown analytics in funnel service
- **Prayer schedule cleanup** monitored with autonomy status updates and cleaned count reporting; health check via `?check=health`
- **DLD sync** runs monthly (1st at 03:00 UTC) with health check endpoint and failure alerting via `alert-dispatcher`
- **Cron failure alerting**: `autonomous-cron-dispatcher` sends alert digest to opted-in admins via `alert-dispatcher` when jobs fail
- **Cooldown mechanism**: 30-minute cooldown on cron batch failure alerts via `admin_alert_log` dedup check; `alert-dispatcher` has 15-min throttle + 60-min flood suppression
- **Per-request data attribution**: `src/lib/analytics/request-attribution.ts` provides `startRequestAttribution()`, `getCurrentAttribution()`, `withAttribution()` for per-request source tracking instead of global counters
- **Referral dedup recovery**: In-memory referral dedup `Set` syncs back to `sessionStorage` on recovery via `_syncInMemoryToSession()`
- **Expired surah auto-cleanup**: `cleanupExpiredSurahs(retentionDays?)` removes unpinned expired surahs with configurable retention; runs automatically when offline manager opens
- **Failed surah auto-retry**: After bulk download completes with failures (<= 10), automatic retry after 5-second cooldown
- **Storage refresh optimization**: Read-only surah access throttles `accessedAt` updates to every 5 minutes (avoids unnecessary IndexedDB writes)
- **Health check endpoints**: All scheduled jobs have status visible via `/functions/v1/health-check` (authenticated), prayer and DLD sync have dedicated `?check=health` endpoints
- **Referral channel SQL reporting**: `referral_channel_stats` view aggregates click channels from `activity_logs`; `backfill_referral_clicks_channel()` function syncs channel data to `referral_clicks` table
- Migration `20260416800001_referral_channel_tracking.sql`: Adds `channel` column to `referral_clicks`, creates `cron_health_log` table, `referral_channel_stats` view, backfill function

## Frontend Speed Engine (Phase 1B)
... (rest of the file)

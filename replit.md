# Easy-Locs Super-App v3

## Overview
Easy-Locs is a world-class super-app built around 5 intelligently connected pillars: Dashboard, Radar, Orbit, Wallet, and Me. It aims to unify property management, a marketplace, communication, a digital wallet, and service discovery under one roof. The project's vision is to provide a comprehensive, production-ready solution for deployment in any country, supporting 12 pillars of global readiness. The business potential lies in its ability to offer a diverse range of services within a single platform, leveraging advanced AI and self-healing systems for a robust and scalable architecture.

## User Preferences
I prefer iterative development with a focus on clear, concise communication. Please ask before making major architectural changes or introducing new external dependencies. I value detailed explanations for complex features and design decisions.

## System Architecture

### Core Architecture
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion for UI/UX.
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RPC) for data persistence and serverless functions.
- **State Management**: React Query for data fetching, custom contexts (AuthContext, I18nContext) for global state.
- **i18n**: Custom system supporting 45 locales with dynamic loading, RTL support, and structured translation data.
- **Navigation**: 5-tab bottom navigation with a smart cross-pillar intent engine, overlay-first pattern, and return-to-origin functionality.
- **Autonomous Engine Systems**: 10 interconnected server-side systems (Omega Intelligence Loop, Sentinel Guards, Watchdog, Job Queue, etc.) for fully autonomous 24/7 operation.
- **Self-Healing Ultra Engine**: Predictive Anomaly Detector, Boundary Contract Validators, and Flow State Machines for proactive resilience and auto-correction.
- **Governance & Canonical Registries**: Centralized registries for domains, events, assets, UI contracts, data contracts, state machines, permissions, and routes, enforced by a Canonical Dedup Engine and Mapping Corrector.
- **Event System**: Platform Bus as the sole canonical event bus with traceId propagation, supporting both colon and legacy dot notation events.
- **Infrastructure Layer**: Distributed Tracing, Domain Circuit Breakers, Backpressure Manager, Flow Cycle Detector, Boot Integrity Gate, SLA Engine Contracts, Adaptive Storm Guard, and System Health Snapshot for ultra-solid infrastructure.
- **Cache Layer**: Three-tier cache (in-memory LRU, Upstash Redis, PostgreSQL `server_cache` table) with domain-based TTLs.
- **Job Queue**: Client-side with priority and concurrency control, server-side processing from Redis list with DB dual-write.
- **Rate Limiting**: Redis-backed sliding window rate limiter with per-endpoint and user-tier specific limits.
- **Realtime Hardener**: Robust WebSocket reconnection, heartbeat, and zombie channel detection.
- **Web Worker Pool**: Comlink-based typed Web Workers for off-thread processing of crypto, search, normalization, and analytics batching.
- **Cross-Tab Sync**: SharedWorker for multiplexing state (Orbit messages, wallet balance, notifications) across browser tabs.
- **Partytown**: Third-party script isolation for performance.
- **Predictive Prefetch Engine**: Tracks navigation patterns to preload likely next routes.
- **Segment CDP**: Unified analytics tracking with lazy initialization.

### UI/UX Design Standards
- **Visual Design System**: Apple/Tesla-inspired minimalist design with deep navy backgrounds, teal accents, and clear hierarchy.
- **Typography**: Plus Jakarta Sans, `rem` units for accessibility, `tabular-nums` for numeric displays.
- **Component System**: Unified `AppCard` system, consistent spacing, touch targets, and text overflow handling.
- **Dynamic Contextual Logo System**: Logo adapts based on section, time of day, and special events, with micro-icons and animations.
- **Mobile Native Engine**: Capacitor plugins for native camera, haptics, push notifications, keyboard management, status bar control, splash screen, network monitoring, and NFC.
- **Map Library**: MapLibre GL JS (open-source fork of Mapbox GL JS) with CARTO basemaps, Nominatim geocoding, and OSRM routing.
- **Map Error Handling**: Robust error analytics, hardening, and fallback UI for map components.

### Feature Specifications
- **5-Pillar Super-App**: Dashboard, Radar, Orbit, Wallet, Me with dedicated routing and features.
- **Admin Panel**: `/admin` for centralized control and monitoring.
- **Developer CLI**: Scaffolds domains, components, pages, and Edge Functions.
- **Internal Factory Labs**: 9 labs for performance, data, security, release, notification, experiment, API, architecture, and integration health monitoring.
- **Agent Powerup**: Infrastructure overhaul with Platform Bus Priority System, Cross-Domain Table Locking, Cross-Agent Typed Protocol, Continuous Wiring Verifier, and Quarantine Bridge.
- **Testing & Quality Gate**: Comprehensive Vitest unit/integration tests and Playwright E2E tests with nightly trend tracking and deterministic data seeding.
- **Live Integrations**: Plaid, LiveKit, Meilisearch, News APIs, with BNPL, E-Signature, and explicit error handling.
- **API Intelligence Gateway**: Read-only gateway connecting to internal and external APIs (DLD, Deliveroo, Talabat, Careem, Open-Meteo, Google News, Frankfurter Forex, Al-Adhan Prayer Times).
- **Onboarding Media Pipeline**: Server-side image processing (WebP conversion, thumbnail generation, quality scoring), photo merging, and deduplication.
- **Commerce + Services**: Product variants, detailed product pages, wishlist, returns, and service booking lifecycle.
- **C2C Classifieds Vertical ("Annonces")**: 9-step posting wizard, discovery hub, seller profiles, moderation, and notifications.
- **WhatsApp Ultra Pro Module**: Unified module for all WhatsApp functionality, including branded buttons and share previews.
- **Hotel Domain**: Hexagonal architecture for hotel booking with state machine, anti-overbooking, and dashboard pages.
- **Next-Gen Real Estate Analytics Platform**: Live Dubai Land Department (DLD) API integration for real-time transaction data, building price history, and comparable sales.
- **Dynamic OG Previews**: Section-specific OG images, meta tags, and enhanced social preview edge function.
- **Per-User Rate Limit Tiers**: `free`, `premium`, `enterprise` tiers with custom limits per endpoint.
- **Cache Performance Metrics**: Tracking cache hits/misses/evictions for article extraction, with diagnostic endpoints and dashboard widgets.
- **Referral Funnel Dashboard**: Visualization of referral performance from shares to conversions.
- **ML Recommendation Engine**: Vector similarity, collaborative filtering, and contextual boosting for personalized recommendations.
- **Social Graph**: Follow/unfollow, mutual detection, and activity feeds.
- **Virtual Card Issuance**: Create, freeze, unfreeze, cancel, fund virtual Visa cards.
- **Embedded Finance**: BNPL (3/4/6-month installment plans) and Micro-Insurance (package/trip protection).
- **Feature Flags**: Centralized management for new features.
- **Mobile Native Engine**: Capacitor plugins for device capabilities.
- **Unified Payment Pipeline**: Canonical pipeline for all verticals (fraud check, Stripe intent, webhooks, idempotency).
- **Global Deployment Readiness**: Country configuration engine, i18n completion, global payment providers, regional legal compliance, backend observability, PostGIS, PWA activation, notification system, CI/CD quality pipeline, locale codegen, SEO & Deep Linking.
- **In-App GPS Navigation**: Full-screen Mapbox navigation view with route polyline, distance, ETA, and transport mode selector.
- **Geographic Explorer Module**: 3-level hierarchical drill-down for country, city, and district data.
- **Taxi / Rider / Delivery Experience**: Ultra-fluid mobility experience with fullscreen map, draggable bottom sheets, live tracking, and smart ETA engine.
- **Intelligent Dispatch System**: Real-time matching, anti-conflict mechanisms, and continuous learning for ride-hailing and delivery.
- **Global Revenue Engine**: Comprehensive monetization layer computing commissions, fees, and margins across every module, adapted per country/market.
- **User Trust System**: 5-level trust system with weighted scoring, 7-level security flags, graduated action system, and fraud detection.
- **Phone + OTP Identity Activation System**: Custom OTP flow for phone number verification using Twilio, bypassing Supabase native phone auth.
- **Auth Provider Health-Check System**: Monitors availability of Phone, Google, and Apple auth providers.
- **Dashboard Intelligence Engine**: Context-aware content prioritization based on time-of-day, day-of-week, and user state.
- **News / Actualités System**: RSS proxy, article extractor with paywall detection, and full news pages.

## External Dependencies

- **Supabase**: Primary backend for database, authentication, and serverless Edge Functions.
- **Vercel**: Deployment and hosting for the frontend application.
- **GitHub**: Version control and CI/CD integration.
- **Plaid**: Banking API for account linking, token exchange, ACH transfers, and income verification.
- **LiveKit**: Real-time voice/video communication infrastructure.
- **Meilisearch**: Full-text search engine for various entities.
- **News APIs**: Google News RSS, GNews, NewsData.io for multi-source news aggregation.
- **Stripe**: Payment processing for cards, Apple Pay, Google Pay, and subscriptions.
- **Twilio**: SMS service for OTP delivery.
- **Open-Meteo**: Weather API for contextual data.
- **Frankfurter**: Forex API for currency exchange rates.
- **Al-Adhan API**: Prayer times API.
- **Firecrawl**: Web scraping API for extracting content from web pages.
- **Nominatim (OpenStreetMap)**: Geocoding for forward/reverse lookups.
- **OSRM**: Routing service for directions.
- **CARTO**: Basemap tiles for MapLibre GL JS.
- **Upstash Redis**: Redis database for caching, presence, and job queues.
- **AWS S3**: Primary storage for media assets.
- **AWS CloudFront**: CDN for delivering static assets.
- **AWS SES**: Primary email sending service.
- **AWS SQS**: Message queue for asynchronous processing.
- **AWS Lambda**: Serverless compute for AI, media processing, scraping, and analytics.
- **PostHog**: Analytics platform.
- **Sentry**: Error monitoring and performance tracking.
- **FCM (Firebase Cloud Messaging)**: Push notifications.
- **Flutterwave**: Mobile Money payment gateway.
- **Coinbase Commerce**: Crypto payment gateway.
# World-Scale Next-Generation Super-App Architecture Plan

---

# SECTION 1: CURRENT REALITY AUDIT

## 1.1 Engine System
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Engine Registry (88+ engines, 3 tiers) | **Production-ready** | Tiered boot (T1 immediate, T2 8s, T3 12s), BaseEngine with tick/health/observer, feature flag toggles |
| Self-Healing Engines (ErrorClassifier, AutoFix, Rollback, SilentRecovery) | **Production-ready** | T1 boot, 20-45s intervals, active error classification and auto-repair |
| Performance Engines (PerfAnalyzer, RenderOptimizer, QueryOptimizer, CachePolicy, NetworkLatency) | **Production-ready** | T1 boot, 15-120s intervals |
| Security Engines (ZeroTrust, Anomaly, SessionRisk, DeviceTrust, PolicyHardener) | **Production-ready** | T1 boot, 15-300s intervals |
| Governance Engines (13 engines: VerticalIsolation, Taxonomy, Media, Text, Layout, PageOpen, ActionWiring, RuntimeHealth, FlowClosure, Banner, Localization, AutoRemediation, AntiConflict) | **Usable with repair** | All registered T1, all extend BaseEngine, but most governance APIs (trackPageOpen, registerAction, validateMedia, etc.) have no external call sites — engines run with empty registries |
| Orbit Engines (MessageDelivery, MediaFlow, OptimisticUI, ConversationConsistency, GroupIntegrity) | **Production-ready** | T1 boot, 10-60s intervals, wired to realtime |
| Call Engines (CallHealth, Reconnect, NetworkAdaptation, MediaQuality) | **Production-ready** | T1/T2 boot, 5-10s intervals |
| Radar Engines (LocationIntegrity, GeocodeRepair, ProviderMatching, RoutingQuality, ETAAccuracy) | **Usable with repair** | T2 boot, geo-specific validation |
| Business Engines (FlowIntegrity, Conversion, FunnelDetection, DropoffRepair, Commission, RevenueIntelligence, GrowthIntelligence) | **Usable with repair** | T2 boot, flow stall detection works, but commission/revenue engines are telemetry-only |
| Quality Engines (Taxonomy, SEO, DeadCode, ProfileQuality, WalletQuality, etc.) | **Partial/fragmented** | T3 boot, primarily diagnostic — no enforcement actions |

## 1.2 Payment & Financial Systems
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Stripe Integration (create-stripe-intent, stripe-webhook) | **Production-ready** | 1500+ line webhook handler, handles subscriptions, checkout, payment success, post-payment automation |
| Unified Checkout (paymentService.ts) | **Production-ready** | Multi-provider (Stripe, Checkout.com), multi-method (Card, Wallet, Cash, Apple Pay) |
| Payment Intents (payment-intents.ts) | **Production-ready** | Full lifecycle tracking: created → paid/failed |
| Wallet Engine (wallet-engine.ts) | **Production-ready** | Authorize/capture/settle/reverse via wallet-ops edge function, PIN verification, 3-party splits |
| Ledger System (ledger.ts) | **Production-ready** | Low-level primitives for posting transactions, escrow release, refunds |
| Commission Split (commission-split edge function) | **Production-ready** | Calculates and records splits between platform/merchant/driver with rounding adjustments |
| Global Revenue Engine (global-revenue-engine.ts) | **Usable with repair** | Per-vertical compute functions (base rates: 20% taxi, 15% delivery), but hardcoded rates not country-aware |
| Order Settlement (orderSettlement.ts) | **Production-ready** | Automates escrow release to merchants, payout transactions to drivers |
| Payout Requests (payouts.ts + payout-request-create) | **Production-ready** | Merchant withdrawal with admin approval flow |
| Fraud Watch Engine | **Production-ready** | Monitors suspicious transaction patterns |
| Ledger Integrity Engine | **Production-ready** | Validates transaction sum = account balance |
| FX Consistency Engine | **Usable with repair** | Currency consistency checking exists but limited to 12 primary currencies |
| Wallet Transfer (wallet-transfer.ts) | **Production-ready** | P2P transfers within platform |

## 1.3 Realtime & Communication
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Supabase Realtime Factory (realtime.ts) | **Production-ready** | Centralized channel creation, anti-duplication |
| Subscription Registry (subscription-registry.ts) | **Production-ready** | Singleton, one-sub-per-key, health monitoring |
| Platform Bus (platform-bus.ts) | **Production-ready** | Canonical pub/sub, dot↔colon notation bridging, typed events |
| Event Priority Bus (event-priority-bus.ts) | **Production-ready** | Priority levels (critical/high/normal/low), dead event tracking, latency metrics |
| Orbit Realtime (orbit-realtime-owner.ts) | **Production-ready** | Chat/conversation sync, receipt handling, E2EE decryption at realtime layer |
| Radar Realtime Bridge (radar-realtime-bridge.ts) | **Production-ready** | rider_presence + mobility_jobs sync with health reporting |
| WebRTC Signaling (peer.ts + repositories) | **Production-ready** | RTCPeerConnection with dynamic TURN credentials |
| Cross-App Reactions (cross-app-reactions.ts) | **Production-ready** | wallet:payment_completed → Orbit message injection, Dashboard refresh |
| Presence Health Engine | **Production-ready** | Channel leak detection, connection state monitoring |
| Sync Repair Engine | **Production-ready** | State gap reconciliation after reconnection |

## 1.4 Geo, Location & Mobility
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| GPS Scheduler (gps-scheduler.ts) | **Production-ready** | Adaptive frequency: 20s idle → 4s close-to-pickup → 3s in-progress |
| Driver GPS Pusher (driver-gps-pusher.ts) | **Production-ready** | Upserts to trip_live_state + trip_location_points |
| Geo Store / Geo Service (lib/geo/) | **Production-ready** | SSOT for current user location |
| Map Engine (mapEngine.ts) via Mapbox GL JS | **Production-ready** | Merchant pins, nearby discovery, modular layer system |
| Geo Resolver (geo-resolver.ts) via Nominatim/OSM | **Production-ready** | Reverse geocoding |
| Mapbox Geocoding (geocoding.ts) | **Production-ready** | Forward + reverse geocoding |
| Address Engine (address-engine.ts) | **Usable with repair** | Structured validation and ranking, but no postal-code or district-level granularity |
| Ride Live Route Engine (ride-live-route-engine.ts) | **Production-ready** | Live polylines, traffic inference (low/moderate/heavy) |
| Route Preview Engine (route-preview-engine.ts) | **Production-ready** | Booking-phase distance/cost/time estimates |
| Geo Proximity (geo-proximity.ts) | **Production-ready** | Haversine, isWithinRadius, ETA estimation |
| Nearby Discovery Engine (nearby-discovery-engine.ts) | **Production-ready** | KM-radius merchant/service search |
| Smart Dispatch Controller (smart-dispatch-controller.ts) | **Production-ready** | Wave strategy (precision→expanded→wide→emergency), candidate scoring |
| Ride AI Orchestrator (ride-ai-orchestrator.ts) | **Production-ready** | End-to-end: pricing → idempotency → scoring → dispatch waves |
| Delivery Batch Engine (delivery-batch-engine.ts) | **Production-ready** | Multi-job route optimization with savings estimation |
| Unified ETA Engine (unified-eta-engine.ts) | **Production-ready** | Traffic levels, road factors, merchant prep times |
| Pricing AI Engine (pricing-ai-engine.ts) | **Production-ready** | Distance/duration/zone intelligence/weather surge |
| Status Machine (status-machine.ts) | **Production-ready** | searching→accepted→arriving→picked_up→in_progress→completed |
| District / Postal Code / Street-level geo | **Missing** | No structured geo hierarchy below city level |
| Zone Intelligence (geofenced service areas) | **Partial/fragmented** | Zone layers exist on map but no structured zone registry with rules |

## 1.5 Taxonomy & Categories
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Category Tree (category-tree.ts) — 14 primaries | **Production-ready** | SSOT for dashboard, search, scraping, fulfillment routing. Maps vertical → architecture → fulfillment → wallet flow → orbit context → map behavior → capabilities |
| World-Class Taxonomy (world-class-taxonomy.ts) | **Production-ready** | Enrichment layer: service modes, time relevance, clusters |
| Canonical Registry (canonical-registry.ts) | **Production-ready** | MediaKind per entity type, allowed media per category |
| Category Fulfillment Resolver | **Production-ready** | Dispatches correct fulfillment engine per category |
| CanonicalVertical type (canonical-types.ts) | **Usable with repair** | 20-value closed union, but vocabulary mismatch still exists in some corners (taxonomy uses "shops"/"stay"/"mobility" while some UI references old values) |
| Per-Vertical Canonical Entities | **Partial/fragmented** | 8 entity types defined (Food, Hotel, Service, Property, Flight, Ride, Delivery, Merchant) but CanonicalVerticalEntity discriminated union doesn't cover all 20 verticals |

## 1.6 Localization & i18n
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Translation System (i18n.tsx + i18n-data.ts) | **Production-ready** | 31 locales, 5100+ lines of translations, interpolation, pluralization, missing key tracker |
| RTL Support | **Production-ready** | Arabic + Hebrew trigger dir="rtl" on document root |
| Country-Currency Map (country-currency-map.ts) | **Production-ready** | ~100 country→currency mappings |
| Country System (country-system.ts) | **Partial/fragmented** | Only 6 core countries (AE, SA, EG, GB, FR, US) with full compliance (VAT, commissions, trade license) — need 190+ |
| Localization Governance Engine | **Usable with repair** | 10 countries, 12 currencies with formatting rules, violation detection — but only browser-side telemetry |
| Timezone Handling | **Partial/fragmented** | Per-country in country-system.ts but only for 6 countries |
| Locale-Aware Formatting (i18n-utils.ts) | **Production-ready** | Uses Intl API for dates, numbers, percentages, relative time |

## 1.7 Media Systems
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Media Upload Pipeline (MediaUploadQueue) | **Production-ready** | queued→preparing→compressing→uploading→processing→completed lifecycle |
| Transport Engine (transport-engine.ts) | **Production-ready** | Network-aware retry, exponential backoff |
| Image Compression (compress-image.ts) | **Production-ready** | OffscreenCanvas, JPEG/WebP, 2048px max, 0.82 quality |
| OptimizedImage (OptimizedImage.tsx) | **Production-ready** | Supabase URL transforms, responsive srcset |
| Media Truth Engine (media-truth-engine.ts) | **Production-ready** | Classification, cross-vertical detection, primary media selection |
| Media Relevance Governance Engine | **Usable with repair** | Quality thresholds, watermark/stock detection, vertical isolation — but validateMedia() not called from upload pipeline |

## 1.8 Banner & Advertising
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Banner Strategy Governance Engine | **Usable with repair** | Country/religion/season/cuisine scoring, 10+ national events — but banner registry not populated from real data |
| Canonical Boost Engine (canonical-boost-engine.ts) | **Production-ready** | Campaign management, geo-hierarchy targeting, taxonomy matching, weather/time context, budget pacing, impression/click/lead tracking |
| Promo Engine (promoEngine.ts) | **Production-ready** | Merchant promotions from seed_merchant_promos |
| Context Banner Engine (context-banner-engine.ts) | **Production-ready** | Dynamic banners: "Iftar Specials", "Beat the Heat", "Market Day" |

## 1.9 Weather, Time & Cultural Intelligence
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Live Weather Station (useLiveWeatherStation.ts) | **Partial/fragmented** | Open-Meteo API, 2-min refresh, but currently hardcoded to Dubai coordinates |
| Weather HUD (WeatherHUD.tsx) | **Production-ready** | Visual indicator on map |
| Weather Impact on Operations | **Production-ready** | ETA penalties, visibility scoring, dynamic pricing surcharge, rain radar overlay (RainViewer) |
| Time Context (timeContext.ts) | **Production-ready** | breakfast/lunch/snack/dinner/lateNight with boostedSubs per period |
| Dashboard Intelligence (dashboard-intelligence.ts) | **Production-ready** | DayPart (7 segments), DayType, section prioritization, contextual nudges |
| Predictive Demand (predictive-demand-engine.ts) | **Production-ready** | 24h demand patterns per vertical |
| Global Context Engine (global-context-engine.ts) | **Production-ready** | Ramadan/Eid/Christmas/UAE National Day detection by country |
| Global Event Registry (global-event-registry.ts) | **Partial/fragmented** | Religious + national + commercial events, but limited country coverage |
| Global Experience Orchestrator (global-experience-orchestrator.ts) | **Production-ready** | Combines all context into GlobalExperienceState (themes, motion presets, category priorities) |
| Seasonal Repository (seasonal-repository.ts) | **Usable with repair** | Seasonal rental management, but not connected to broader seasonal logic |

## 1.10 Onboarding & Auth
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Multi-Modal Login (Phone OTP, Password, Magic Link, Social) | **Production-ready** | Identity activation pipeline for new users |
| AuthContext (AuthContext.tsx) | **Production-ready** | Fast hydration from localStorage, timeout-wrapped DB queries, device tracking |
| Dual-Role Architecture (Landlord/Tenant) | **Production-ready** | activeRole/hasDualRole without re-auth |
| Onboarding Flow (Onboarding.tsx) | **Production-ready** | Step-based wizard adapted by user_type, progress persisted to DB |
| Identity Activation Pipeline | **Production-ready** | Profile sync, wallet account creation, Orbit identity provisioning, contact sync |
| Protected Routes + Permission/Role Gates | **Production-ready** | Subscription gating, admin gate, email/phone verification gate |

## 1.11 Flow Wiring & Lifecycle
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Cross-App Reactions (cross-app-reactions.ts) | **Production-ready** | Payment→Orbit message, booking→Dashboard refresh |
| Flow Integrity Engine (flow-integrity-engine.ts) | **Production-ready** | Stall detection for orders, bookings, payments within 5-min timeout |
| Flow Tracer (flow-tracer.ts) | **Production-ready** | Records atomic steps (db_write, validate) within business actions |
| Propagation Validator (propagation-validator.ts) | **Production-ready** | Chain-of-success: DB write → event emission → cache invalidation |
| Flow Closure Governance Engine | **Usable with repair** | Tracks onboarding/checkout/payment/publish closure rate, but registerFlow/updateFlowState have no external call sites |
| Close Flow Engine (close-flow-engine.ts) | **Production-ready** | Post-completion: Ride/Order/Delivery/Booking → settlement → rating → cleanup |
| Order Lifecycle (order-lifecycle.ts) | **Production-ready** | Strict VALID_TRANSITIONS map, flow-tracer wrapped |
| Booking Lifecycle (useBookingLifecycle.ts) | **Production-ready** | Booking → Payment → Confirmation with event emission |

## 1.12 Monitoring & Observability
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| Admin Control Room (AdminControlRoomPage.tsx) | **Production-ready** | 7 tabs: Overview, Core Status, Engines, Run Logs, Health, Governance, Config |
| Engine Observer (engine-observer.ts) | **Production-ready** | Records every tick, metrics, errors |
| Structured Logger (structured-logger.ts) | **Production-ready** | trace_id, request_id, PII scrubbing, domain-based logging |
| Sentry Integration (sentry.ts) | **Production-ready** | Error classification, custom sampler (wallet/payments at 0.8), noise reduction |
| Engine Supervisor (DB-backed) | **Production-ready** | engine_supervisor table tracks backend engines |
| Worker Health Monitor (edge function) | **Production-ready** | Periodic health snapshots |
| Governance Tab in Control Room | **Usable with repair** | Shows violation counts and stats, but data is ephemeral (browser session only) |

## 1.13 Adapters & Integration Patterns
| Subsystem | Status | Evidence |
|-----------|--------|----------|
| db() Service Layer (services/db.ts) | **Production-ready** | Enforced: no direct supabase imports in UI |
| Repository Pattern (customer-orders.repository.ts, etc.) | **Production-ready** | Centralized query logic |
| Edge Functions (Supabase) | **Production-ready** | stripe-webhook, commission-split, dispatch-ride, wallet-ops, payout-request-create, turn-credentials, worker-health-monitor |
| Category Fulfillment Resolver | **Production-ready** | Routes category → dispatch engine |

---

# SECTION 2: PLATFORM DANGER MAP

## 2.1 Payment / Payout / Commission Zone
**Danger Level: CRITICAL**
- **Why dangerous**: The Stripe webhook handler (1500+ lines) is the financial backbone. Commission splits involve 3-party math with rounding. Settlement releases escrow. Any engine that touches payment flow ordering, commission calculation, or payout timing could cause financial loss.
- **What could break**: Double charges, missed commissions, premature escrow release, incorrect payout amounts, broken refund flows, ledger inconsistency
- **Must stabilize first**: Ledger integrity engine must have 100% coverage, commission rates must be externalized to a country-aware config (currently hardcoded), payout approval flow must have audit trail

## 2.2 Realtime Subscription Zone
**Danger Level: HIGH**
- **Why dangerous**: The subscription registry enforces one-sub-per-key. Orbit realtime processes E2EE decryption. WebRTC signaling relies on DB-based state transitions. Adding new realtime channels or changing subscription patterns could create channel leaks, missed messages, or broken calls.
- **What could break**: Duplicate subscriptions, channel leaks, missed chat messages, broken E2EE, failed call reconnection, stale presence data
- **Must stabilize first**: Presence Health Engine must have full channel leak coverage, subscription registry health checks must be persisted (not ephemeral)

## 2.3 Orbit Messaging & Calls Zone
**Danger Level: HIGH**
- **Why dangerous**: E2EE at the realtime layer, optimistic UI with reconciliation, receipt handling with status machine, group integrity — all tightly coupled. Any engine that modifies message flow or conversation state must not break the receipt handler's `isReceiptOnlyUpdate` distinction.
- **What could break**: Lost messages, broken encryption, incorrect read receipts, group state corruption, call quality degradation
- **Must stabilize first**: Message delivery engine must have delivery guarantee metrics, optimistic UI reconciliation must be auditable

## 2.4 Authentication / Session Zone
**Danger Level: HIGH**
- **Why dangerous**: AuthContext hydrates from localStorage cache. Identity activation pipeline creates wallet accounts + Orbit identities. Session lifecycle cleanup drains action queues. Any engine touching auth flow could leave users in half-provisioned states.
- **What could break**: Users without wallet accounts, broken Orbit identities, orphaned sessions, failed cleanup on logout, dual-role state corruption
- **Must stabilize first**: Identity activation pipeline must be idempotent and retriable, session cleanup must be auditable

## 2.5 Mixed Taxonomy Zone
**Danger Level: HIGH**
- **Why dangerous**: CATEGORY_TREE uses vocabulary (shops, mobility, stay) that differs from per-vertical entity types. The TaxonomyGovernanceEngine uses `as CanonicalVertical` casts. Some UI pages search the tree by key ("shops") while canonical types use different values. Cross-vertical contamination (food card in hotel, gym in clinic) is still possible.
- **What could break**: Wrong fulfillment engine dispatched, wrong media rendered, wrong pricing applied, wrong wallet flow triggered, cross-vertical cards in search results
- **Must stabilize first**: Unify CanonicalVertical to exactly match CATEGORY_TREE keys, eliminate all `as CanonicalVertical` casts, ensure per-vertical entities cover all 14 categories

## 2.6 Media Rendering Zone
**Danger Level: MEDIUM-HIGH**
- **Why dangerous**: MediaTruthEngine classifies media by URL keywords. MediaRelevanceEngine validates quality/stock/watermark. But validateMedia() is never called from the actual upload pipeline. OptimizedImage uses Supabase URL transforms. Any engine that changes media classification or rendering could display wrong images per vertical.
- **What could break**: Stock photos in production listings, wrong-category hero images, watermarked images served, broken image transforms, incorrect primary media selection
- **Must stabilize first**: Wire MediaRelevanceEngine.validateMedia() into the actual upload pipeline, ensure MediaTruthEngine classification is tested against real media

## 2.7 Dashboard Aggregation Zone
**Danger Level: MEDIUM**
- **Why dangerous**: Dashboard Intelligence aggregates from multiple domains (time context, weather, user state, pending actions). SmartHome displays context-aware content. Any engine that changes section prioritization or data sources could show incorrect aggregations or wrong recommendations.
- **What could break**: Wrong time-of-day recommendations, stale data in quick actions, broken section ordering, incorrect pending action counts
- **Must stabilize first**: Dashboard intelligence sources must be documented and typed, section prioritization must be testable

## 2.8 Cross-Domain Action Zone
**Danger Level: MEDIUM-HIGH**
- **Why dangerous**: Cross-app reactions (wallet:payment_completed → Orbit message) and the platform bus bridge between dot-notation and colon-notation. Order handlers map ORDER_READY → MISSION_CREATED for dispatch. Any engine that adds new cross-domain reactions must not create circular event loops or race conditions.
- **What could break**: Duplicate Orbit messages, missed dispatch triggers, circular event loops, race conditions between settlement and notification
- **Must stabilize first**: Event priority bus dead-event tracking must be monitored, cross-app reactions must have idempotency guards

---

# SECTION 3: DEPENDENCY GRAPH

## 3.1 Foundation Layer (Must Come First)
```
CANONICAL CORE ──────────────────────────────────
  ├── CanonicalVertical (unified 20-value type)
  ├── Per-Vertical Entity Types (complete coverage)
  ├── GovernanceViolation schema
  └── CanonicalListing (uses CanonicalVertical)

TAXONOMY (depends on: Canonical Core)
  ├── CATEGORY_TREE (14 primaries)
  ├── World-Class Taxonomy (enrichment)
  ├── Canonical Registry (media rules per entity)
  └── Category Fulfillment Resolver
```

## 3.2 Context Layer (Can Be Parallelized After Foundation)
```
GEO HIERARCHY (depends on: Canonical Core)
  ├── Country → Region → City → District → Postal Code → Street → GPS
  ├── Zone Intelligence (geofenced service areas)
  └── Address Validation Engine

TEMPORAL ENGINE (depends on: Geo Hierarchy for timezone)
  ├── Time-of-day resolution
  ├── Day type (weekday/weekend/holiday)
  ├── Seasonal resolution (hemisphere-aware)
  └── Timezone management per geo context

WEATHER ENGINE (depends on: Geo Hierarchy for coordinates)
  ├── Live weather data (Open-Meteo, multi-city)
  ├── Weather impact scoring
  └── Weather-to-operations factor

CULTURAL CALENDAR (depends on: Geo Hierarchy, Temporal)
  ├── Religious events (Ramadan, Easter, Diwali, etc.)
  ├── National events per country
  ├── Commercial events (Black Friday, Singles Day)
  └── Local traditions per region

CUISINE/TRADITION (depends on: Geo Hierarchy, Cultural Calendar)
  ├── Regional cuisine profiles
  ├── Dietary traditions per religion/region
  └── Seasonal food patterns
```

## 3.3 Truth Layer (Depends on Context Layer)
```
LOCALIZATION ENGINE (depends on: Geo Hierarchy, Temporal, Cultural Calendar)
  ├── Language resolution per country
  ├── Currency formatting per country
  ├── RTL/calendar/unit system per locale
  └── Legal compliance per country

COUNTRY RULES ENGINE (depends on: Geo Hierarchy, Localization)
  ├── VAT rates per country
  ├── Commission rates per country/vertical
  ├── Compliance requirements (trade license, KYC levels)
  └── Payment method availability per country
```

## 3.4 Business Layer (Depends on Truth Layer)
```
PAYMENT ORCHESTRATION (depends on: Country Rules, Localization, Taxonomy)
  ├── Multi-provider routing (Stripe, Checkout.com, local gateways)
  ├── Currency conversion display
  ├── 3DS/SCA per country
  └── Wallet integration
  ⚠ MUST NEVER directly depend on: Weather, Cultural Calendar, Temporal
  ⚠ CONNECT ONLY THROUGH: Country Rules Engine, Policy Layer

PAYOUT/COMMISSION ENGINE (depends on: Payment Orchestration, Country Rules)
  ├── Commission calculation per vertical/country
  ├── Settlement timing rules
  ├── Payout approval with audit
  └── Third-party settlement
  ⚠ MUST NEVER directly depend on: Banners, Onboarding, User Optimization

DELIVERY/TAXI/GPS (depends on: Geo Hierarchy, Temporal, Weather)
  ├── Smart dispatch
  ├── ETA calculation
  ├── Dynamic pricing
  └── Route optimization
```

## 3.5 Optimization Layer (Must Come Last)
```
USER OPTIMIZATION (depends on: ALL truth layers stable)
  ├── Personalization
  ├── Recommendation engine
  └── User journey optimization

PROVIDER OPTIMIZATION (depends on: ALL truth layers stable)
  ├── Provider scoring
  ├── Service quality metrics
  └── Availability optimization

BANNER/CAMPAIGN INTELLIGENCE (depends on: Localization, Cultural Calendar, Geo, Temporal, Weather)
  ├── Targeting logic
  ├── Creative selection
  └── Budget pacing

ONBOARDING PERSONALIZATION (depends on: Geo Hierarchy, Localization, Country Rules)
  ├── Role-specific flows per country
  ├── KYC requirements per jurisdiction
  └── Feature discovery per vertical
```

## 3.6 Parallelization Rules
- **CAN PARALLELIZE**: Geo Hierarchy + Temporal Engine + Weather Engine (independent data sources)
- **CAN PARALLELIZE**: Cultural Calendar + Cuisine/Tradition (after Geo Hierarchy completes)
- **CAN PARALLELIZE**: User Optimization + Provider Optimization (after truth layers)
- **MUST SEQUENCE**: Canonical Core → Taxonomy → Localization → Country Rules → Payment
- **MUST SEQUENCE**: Geo Hierarchy → Temporal → Weather → Delivery/Taxi/GPS

## 3.7 Adapter-Only Connections (Never Direct Dependencies)
- Weather → Payment: NEVER direct. Weather affects pricing ONLY through the Pricing Engine's weather factor
- Cultural Calendar → Payment: NEVER direct. Ramadan affects banners, NOT payment processing
- Temporal → Commission: NEVER direct. Time-of-day NEVER changes commission rates
- Banner Intelligence → Payment: NEVER direct. Advertising NEVER triggers payments
- User Optimization → Payout: NEVER direct. Personalization NEVER changes payout logic
- All cross-domain connections MUST go through: Platform Bus events, Policy Layer rules, or Shared Registries

---

# SECTION 4: SAFE TARGET ARCHITECTURE

## 4.1 Architectural Principles
1. **Canonical Core as single source of truth** — All types, verticals, categories, and entities defined once in `canonical-types.ts` + `category-tree.ts`
2. **Strict domain boundaries** — Each domain (Payment, Orbit, Mobility, etc.) owns its data and exposes only typed contracts
3. **Event bus for cross-domain communication** — Platform Bus + Event Priority Bus, never direct function calls across domains
4. **Shared registries for discovery** — Engine Registry, Page Registry, Card Registry, Flow Registry, Zone Registry (new), Country Rules Registry (new)
5. **Policy layer for business rules** — Country-aware rules externalized from engine logic, queryable at runtime
6. **Observability layer for health** — Every engine tick recorded, every violation persisted, every flow traced
7. **Audit layer for compliance** — Every payment, payout, commission, and settlement auditable with rollback capability
8. **Rollback-safe integration** — Feature flags per engine, graceful degradation, no silent fallbacks

## 4.2 Target Layer Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│  Pages │ Components │ Hooks │ Stores                           │
│  (React + Vite + Tailwind + Framer Motion)                     │
├─────────────────────────────────────────────────────────────────┤
│                    ORCHESTRATION LAYER                          │
│  Cross-App Reactions │ Close Flow Engine │ Flow Tracer          │
│  Dashboard Intelligence │ Radar Brain │ Experience Orchestrator │
├─────────────────────────────────────────────────────────────────┤
│                    DOMAIN SERVICES LAYER                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Payment  │ │ Mobility │ │  Orbit   │ │ Wallet   │          │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │          │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤          │
│  │ Checkout │ │ Dispatch │ │ Realtime │ │ Ledger   │          │
│  │ Stripe   │ │ ETA      │ │ Messages │ │ Transfer │          │
│  │ Intents  │ │ Pricing  │ │ Calls    │ │ Escrow   │          │
│  │ Webhook  │ │ Routing  │ │ Groups   │ │ FX       │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                    POLICY & RULES LAYER (NEW)                  │
│  Country Rules │ Commission Policy │ Payment Policy │           │
│  Compliance Rules │ Payout Rules │ KYC Requirements             │
├─────────────────────────────────────────────────────────────────┤
│                    CONTEXT INTELLIGENCE LAYER                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Geo      │ │ Temporal │ │ Weather  │ │ Cultural │          │
│  │ Context  │ │ Context  │ │ Context  │ │ Context  │          │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤          │
│  │ Hierarchy│ │ Time     │ │ Live API │ │ Events   │          │
│  │ Zones    │ │ Season   │ │ Impact   │ │ Religion │          │
│  │ Address  │ │ Timezone │ │ Overlay  │ │ Cuisine  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                    GOVERNANCE LAYER                             │
│  13 Governance Engines │ Auto-Remediation │ Anti-Conflict       │
│  VerticalIsolation │ Taxonomy │ Media │ Text │ Layout           │
│  PageOpen │ ActionWiring │ RuntimeHealth │ FlowClosure          │
│  Banner │ Localization                                          │
├─────────────────────────────────────────────────────────────────┤
│                    CANONICAL FOUNDATION                         │
│  canonical-types.ts │ category-tree.ts │ canonical-registry.ts  │
│  CanonicalVertical │ Per-Vertical Entities │ GovernanceViolation │
├─────────────────────────────────────────────────────────────────┤
│          EVENT BUS          │       SHARED REGISTRIES           │
│  Platform Bus               │  Engine Registry                  │
│  Event Priority Bus         │  Page/Card/Flow Registry          │
│  Cross-App Reactions        │  Country Rules Registry (NEW)     │
│                             │  Zone Registry (NEW)              │
├─────────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY LAYER                          │
│  Engine Observer │ Structured Logger │ Sentry │ Trace Correlator│
│  Propagation Validator │ Admin Control Room                     │
├─────────────────────────────────────────────────────────────────┤
│                    DATA LAYER                                   │
│  db() Service │ Supabase (PostgreSQL + Auth + Storage + RPC)    │
│  Edge Functions │ Repositories                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# SECTION 5: MODULAR ENGINE BLUEPRINT

## 5.1 Engines to STRENGTHEN (Exist, Need Repair)

### A. Governance Engines (13 total)
- **Current state**: All registered T1, all extend BaseEngine, but operational APIs have no external call sites

**Governance Engine Classification:**

| Engine | Mode | Can Block Render | Can Block Actions | Can Auto-Remediate | Rationale |
|--------|------|-----------------|-------------------|-------------------|-----------|
| VerticalIsolationEngine | **OBSERVATIONAL** | NO | NO | NO | Detects cross-vertical contamination, emits violations. NEVER filters or hides cards — that would create invisible business logic in a governance layer. |
| TaxonomyGovernanceEngine | **OBSERVATIONAL** | NO | NO | NO | Validates vertical/category consistency, emits violations. NEVER modifies categories or reclassifies listings. |
| MediaRelevanceEngine | **ADVISORY** | NO | NO | NO | Scores media quality, detects watermarks/stock. Flags violations but NEVER deletes or replaces media. Upload pipeline may surface warnings to the user based on its output. |
| TextIntegrityEngine | **OBSERVATIONAL** | NO | NO | NO | Validates text length, language consistency, profanity. NEVER modifies text content. |
| LayoutConsistencyEngine | **OBSERVATIONAL** | NO | NO | NO | Detects layout rule violations per page type. NEVER forces layout changes. |
| PageOpenEngine | **OBSERVATIONAL** | NO | NO | NO | Tracks page open/close lifecycle, detects orphaned pages. NEVER blocks navigation. |
| ActionWiringEngine | **OBSERVATIONAL** | NO | NO | NO | Detects dead CTAs, unwired actions. NEVER disables buttons or redirects users. |
| RuntimeHealthEngine | **OBSERVATIONAL** | NO | NO | NO | Monitors runtime performance, detects degradation. NEVER throttles engines or kills processes. |
| FlowClosureEngine | **OBSERVATIONAL** | NO | NO | NO | Tracks flow completion rates, detects abandoned flows. NEVER forces flow completion or cancellation. |
| BannerStrategyEngine | **ADVISORY** | NO | NO | NO | Scores banner cultural appropriateness. Surfaces warnings. NEVER removes banners — the Campaign Intelligence Engine makes display decisions. |
| LocalizationEngine | **OBSERVATIONAL** | NO | NO | NO | Detects locale/currency/timezone mismatches. NEVER changes displayed locale. |
| AutoRemediationEngine | **AUTO-REMEDIATE (SCOPED)** | NO | NO | **YES — scoped to engine restarts and cache invalidation only** | May restart a crashed engine or invalidate a stale cache entry. NEVER modifies business data, user data, financial data, or domain-owned tables. Remediation actions are logged with before/after state. |
| AntiConflictEngine | **OBSERVATIONAL** | NO | NO | NO | Detects architecture debt and engine dependency conflicts. NEVER disables engines or modifies registries. |

**Governance-to-Domain Boundary Rule**: No governance engine directly blocks rendering or user actions. Governance engines emit typed violation events on the Platform Bus. The **owning domain's service layer** receives these events and makes the final block/allow decision based on its own domain logic. This ensures governance remains observational while domains retain full authority over their own rendering, actions, and data. Example: BannerStrategyEngine emits `governance.banner.violation` → Campaign Intelligence Engine (the domain owner) decides whether to suppress the banner. The governance engine never suppresses it directly.

- **Action**: Wire governance APIs into real runtime paths
  - Wire `trackPageOpen()` / `updatePageState()` into route lifecycle (React Router transitions)
  - Wire `registerAction()` / `trackActionClick()` into CTA components
  - Wire `validateMedia()` into media upload pipeline (advisory warnings, not blocking)
  - Wire `registerFlow()` / `updateFlowState()` into order/booking lifecycles
  - Wire `validateText()` into text rendering components (observational logging, not blocking)
- **Danger level**: LOW (additive, no business logic changes, all governance output is observational or advisory)
- **Dependencies**: None — these engines already exist
- **Best time**: Phase 2 (immediately after canonical normalization)

### B. Localization Engine
- **Current state**: 10 countries, 12 currencies, browser-only telemetry
- **Action**: Expand to 50+ countries with full compliance rules, persist violations to DB
- **Danger level**: LOW-MEDIUM (additive country configs, no logic changes)
- **Dependencies**: Country Rules Registry must exist first
- **Best time**: Phase 3

### C. Global Revenue Engine
- **Current state**: Hardcoded base rates per vertical (20% taxi, 15% delivery)
- **Action**: Externalize rates to country-aware config, make commission rates queryable from Country Rules Registry
- **Danger level**: HIGH (directly affects money)
- **Dependencies**: Country Rules Registry, Commission Policy
- **Best time**: Phase 5 (after policy layer is stable)

### D. Live Weather Station
- **Current state**: Hardcoded to Dubai coordinates
- **Action**: Make multi-city, driven by user's current geo context
- **Danger level**: LOW (no business logic change, just data source expansion)
- **Dependencies**: Geo Hierarchy engine
- **Best time**: Phase 3

## 5.2 Engines to MERGE

### A. Banner Strategy Engine + Context Banner Engine + Canonical Boost Engine
- **Current state**: Three separate systems doing overlapping banner/ad logic
  - BannerStrategyEngine (governance): country/religion/season scoring
  - ContextBannerEngine (dynamic): "Iftar Specials", "Beat the Heat"
  - CanonicalBoostEngine (advertising): paid campaigns, geo targeting, budget pacing
- **Action**: Keep CanonicalBoostEngine as the campaign/ad engine. Merge BannerStrategyEngine governance rules INTO the boost engine's scoring pipeline. Merge ContextBannerEngine's context-aware templates into the boost engine's creative system.
- **Result**: One unified Banner & Campaign Intelligence Engine with governance, context, and advertising in one pipeline
- **Danger level**: MEDIUM (must preserve all existing banner rendering)
- **Dependencies**: Cultural Calendar, Geo Hierarchy, Temporal Engine
- **Best time**: Phase 4

### B. Flow Integrity Engine + Flow Closure Engine + Close Flow Engine + Flow Tracer
- **Current state**: Four separate systems tracking flow health at different levels
- **Action**: Unify under one "Flow Lifecycle Engine" with three sub-modules: tracing, integrity, closure
- **Danger level**: MEDIUM (must preserve stall detection and closure tracking)
- **Dependencies**: Platform Bus event contracts must be stable
- **Best time**: Phase 4

## 5.3 Engines to CREATE

### A. Geo Hierarchy Engine (NEW — FOUNDATION-CRITICAL)
- **Role**: Provide structured geo resolution: Country → Region → City → District → Postal Code → Street → GPS radius
- **Inputs**: GPS coordinates, address strings, country codes
- **Outputs**: Structured GeoContext (countryCode, regionCode, cityId, districtId, postalCode, coordinates, radius)
- **Boundaries**: Read-only geo data provider. NEVER stores user data. NEVER touches payment or auth.
- **Danger level**: MEDIUM — While the engine itself is read-only and additive, it is **foundation-critical** because 8+ downstream systems depend on its output:
  - **Localization Engine** → needs countryCode for language/currency/RTL resolution
  - **Country Rules Registry** → needs countryCode for VAT/commission/compliance lookup
  - **Weather Engine** → needs coordinates for multi-city weather data
  - **Zone Intelligence Engine** → needs city/district for geofenced service zones
  - **Temporal Engine** → needs countryCode for timezone resolution
  - **Cultural Calendar** → needs countryCode for religious/national event filtering
  - **Onboarding** → needs countryCode for KYC/verification requirements
  - **Cross-Country Behavior** → needs home vs. visiting country distinction
- **Rollout caution**: Because downstream systems will bind to GeoContext output, the schema must be locked before any consumer is wired. Changes to the GeoContext schema after consumers are connected would cascade across the entire context intelligence layer.
  - GeoContext TypeScript interface must be reviewed and frozen before Phase 2 ends
  - Initial rollout must cover all 6 existing countries (AE, SA, EG, GB, FR, US) with verified geo data before any new country is added
  - Fallback for unresolvable coordinates must return a clearly typed `GeoContextUnresolved` (not a silent default country)
  - Unit tests must cover: valid resolution, unresolvable coordinates, boundary cases (country borders, international waters, VPN-spoofed locations)
- **Dependencies**: Canonical Core (for Country type), existing geo-resolver + geo-proximity
- **Best time**: Phase 2 (first engine built in this phase — all other Phase 2 work depends on it)

### B. Country Rules Registry (NEW — HIGH PRIORITY)
- **Role**: Externalize all country-specific business rules into a queryable registry
- **Inputs**: Country code, vertical, rule category
- **Outputs**: VAT rate, commission rate, compliance requirements, payment methods, payout schedule, KYC level
- **Boundaries**: Read-only configuration. NEVER executes business logic. NEVER directly calls payment APIs.
- **Danger level**: MEDIUM (existing hardcoded rules must be migrated without regression)
- **Dependencies**: Canonical Core, Geo Hierarchy
- **Best time**: Phase 3

### C. Zone Intelligence Engine (NEW — MEDIUM PRIORITY)
- **Role**: Manage geofenced service zones with rules (delivery radius, surge zones, restricted areas)
- **Inputs**: GPS coordinates, zone definitions, merchant coverage
- **Outputs**: Active zone ID, zone rules (delivery fee, surge multiplier, availability), zone boundaries
- **Boundaries**: Provides zone context. NEVER dispatches drivers. NEVER calculates prices directly.
- **Danger level**: LOW (new engine, feeds into existing dispatch/pricing)
- **Dependencies**: Geo Hierarchy Engine
- **Best time**: Phase 3

### D. Temporal Context Engine (NEW — LOW PRIORITY)
- **Role**: Unify time-of-day, day-of-week, seasonality, timezone logic into one source of truth
- **Inputs**: GPS coordinates (for timezone), date/time
- **Outputs**: TimeContext (dayPart, dayType, season, hemisphere, timezone, isHoliday, localTime)
- **Boundaries**: Read-only temporal data. NEVER triggers business actions.
- **Danger level**: LOW (consolidates existing scattered logic)
- **Dependencies**: Geo Hierarchy (for timezone resolution)
- **Best time**: Phase 3

### E. Cuisine & Tradition Engine (NEW — LOW PRIORITY)
- **Role**: Provide regional cuisine profiles, dietary traditions, seasonal food patterns
- **Inputs**: Country code, region, religion context, season
- **Outputs**: CuisineProfile (popular cuisines, dietary restrictions, seasonal specialties, mealtime patterns)
- **Boundaries**: Read-only cultural data. NEVER changes food ordering logic.
- **Danger level**: LOW (new data source, feeds into discovery/recommendation)
- **Dependencies**: Geo Hierarchy, Cultural Calendar, Temporal Engine
- **Best time**: Phase 5

### F. Verification & Compliance Engine (NEW — MEDIUM PRIORITY)
- **Role**: Automate KYC, trade license, and regulatory verification per country
- **Inputs**: User/merchant profile, country rules, document uploads
- **Outputs**: Verification status, compliance score, required actions
- **Boundaries**: Orchestrates verification. NEVER stores credentials. NEVER approves payments.
- **Danger level**: MEDIUM (regulatory requirements are country-specific and legally binding)
- **Dependencies**: Country Rules Registry, Identity Activation Pipeline
- **Best time**: Phase 5

## 5.4 Engines to DELAY

### A. User Optimization Engine
- **Why delay**: Requires stable truth layers (geo, temporal, cultural, localization, country rules) as inputs. Building on incomplete foundations would produce wrong recommendations.
- **Best time**: Phase 7 (after all context engines are stable)

### B. Provider Optimization Engine
- **Why delay**: Same as User Optimization — needs stable context. Also needs stable commission/revenue data from Country Rules Registry.
- **Best time**: Phase 7

### C. Advertising Intelligence Engine (beyond basic boost)
- **Why delay**: Advanced ad targeting (predictive, ML-based) requires stable user behavior data, which requires stable flow tracking, which requires stable flow wiring.
- **Best time**: Phase 8

### D. Digitalization Strategy Engine
- **Why delay**: This is a meta-engine that would orchestrate digitalization of offline businesses. Requires the full context stack (geo, country rules, onboarding, payment) to be operational.
- **Best time**: Phase 9 (or later)

## 5.5 Engines That Should NEVER Be Standalone

### A. "Payment Intelligence Engine"
- **Why not standalone**: Payment logic MUST remain in the payment service layer with edge functions. An "engine" that makes payment decisions outside the transaction flow would create a dangerous second source of truth for money.
- **Instead**: Strengthen existing payment service + add Payment Policy rules in Country Rules Registry

### B. "Security Intelligence Engine"
- **Why not standalone**: Security is already well-served by 5 dedicated engines (ZeroTrust, Anomaly, SessionRisk, DeviceTrust, PolicyHardener). A meta-engine would just add confusion.
- **Instead**: Strengthen existing security engines, add country-specific 3DS/SCA rules to Country Rules Registry

### C. "Real-Time Analytics Engine"
- **Why not standalone**: Analytics is an observability concern, not a domain. It should live in the observability layer (structured logger + Sentry + engine observer), not as a separate engine.
- **Instead**: Enhance structured logger with real-time aggregation capabilities

---

# SECTION 6: NEXT-GENERATION DIFFERENTIATORS

## 6.1 Near-Term Differentiators (0-3 months, buildable on current architecture)

### A. Context-Aware App Adaptation
- **Value**: HIGH — No mainstream super app today changes its entire UI, recommendations, and actions based on combined geo+time+weather+cultural context simultaneously. The platform already has Dashboard Intelligence, time context, weather station, and global context engine. Unifying them into a single "World Context" feed that drives all surfaces creates an experience that feels alive.
- **Difficulty**: LOW-MEDIUM — Pieces exist (timeContext.ts, useLiveWeatherStation.ts, global-context-engine.ts, global-experience-orchestrator.ts). The work is unification and multi-city expansion, not creation from scratch.
- **Risk**: LOW — Read-only context layer. Does not touch payments or realtime.
- **Timing**: Phase 3 (Context Intelligence Engines)
- **Fit**: EXCELLENT — GlobalExperienceOrchestrator already combines inputs into GlobalExperienceState (themes, motion presets, category priorities). Extending it with geo hierarchy + expanded weather = full context-aware adaptation.

### B. Self-Healing / Self-Optimizing Systems
- **Value**: HIGH — The platform already has 4 self-healing engines (ErrorClassifier, AutoFix, Rollback, SilentRecovery), auto-remediation governance, and flow integrity tracking. No other super app has this depth of self-repair. Making these visible to users ("Your issue was detected and fixed automatically") would be a powerful trust signal.
- **Difficulty**: LOW — Systems exist. The work is surfacing their output to users and persisting remediation history.
- **Risk**: LOW — Self-healing engines are already production-ready T1.
- **Timing**: Phase 2 (governance violation persistence enables this)
- **Fit**: EXCELLENT — Engine observer + auto-remediation engine + structured logger already produce the data. Just needs persistence + UI surface.

### C. Adaptive Onboarding by Country and Profile
- **Value**: MEDIUM-HIGH — Current onboarding adapts by user_type (Landlord/Tenant). Expanding to adapt by country (KYC requirements, local payment methods, relevant verticals, language, cultural norms) would dramatically improve first-session conversion.
- **Difficulty**: MEDIUM — Onboarding pipeline exists with step-based wizard. Need Country Rules Registry to feed country-specific steps.
- **Risk**: LOW — Onboarding is isolated from payment/realtime.
- **Timing**: Phase 6 (after Country Rules Registry is stable)
- **Fit**: GOOD — Identity activation pipeline already provisions wallet + Orbit identity. Adding country-specific steps is additive.

### D. Privacy-Premium Communication Modes
- **Value**: HIGH — Orbit already has E2EE at the realtime layer. Offering explicit "Privacy Mode" (ephemeral messages, no screenshot, no forwarding, encrypted media) as a premium feature differentiates from WeChat/Grab where messaging is plaintext. This is a Telegram-level privacy feature inside a super app.
- **Difficulty**: MEDIUM — E2EE infrastructure exists. Ephemeral messages need TTL enforcement. Screenshot prevention is platform-limited (CSS/API-level, not hardware-level).
- **Risk**: LOW-MEDIUM — Orbit is already isolated. Privacy mode is additive, doesn't change existing message flow.
- **Timing**: Phase 4 (after flow unification)
- **Fit**: GOOD — Orbit realtime owner already handles E2EE decryption. Privacy mode extends this with TTL + forwarding controls.

## 6.2 Mid-Term Strategic Advantages (3-9 months)

### E. Wallet Intelligence / Smart Economy Engine
- **Value**: VERY HIGH — The wallet engine (authorize/capture/settle/reverse), ledger, FX exchange, and P2P transfers already exist. Adding intelligence: spending pattern analysis, smart savings suggestions, predictive balance alerts, automatic bill splitting, cross-currency optimization for travelers — transforms the wallet from a payment tool into a financial intelligence layer.
- **Difficulty**: HIGH — Requires stable financial data pipeline, clean transaction categorization, and country-specific financial regulations.
- **Risk**: MEDIUM — Read-only analytics on financial data is safe. Any automated actions (auto-save, auto-split) need extreme caution and user consent.
- **Timing**: Phase 7 (after financial hardening in Phase 5)
- **Fit**: GOOD — Wallet engine + ledger + FX engine provide the foundation. Commission/revenue engines provide business-side data.

### F. Personal AI Assistant Per User
- **Value**: VERY HIGH — A contextual AI that knows your location, preferences, recent orders, upcoming bookings, weather, cultural events, and wallet balance. "It's raining and you usually order food at this time — want to reorder from your favorite restaurant?" No super app today has this level of integrated personal context.
- **Difficulty**: HIGH — Requires unified user behavior model, all context engines stable, and careful privacy controls.
- **Risk**: MEDIUM — Must NEVER auto-execute financial transactions. Must be advisory/suggestion-only until user explicitly confirms. Must comply with GDPR/privacy regulations per country.
- **Timing**: Phase 7-8 (after user optimization engine)
- **Fit**: MEDIUM — Dashboard Intelligence already does basic contextual nudges (getQuickSuggestion). Personal AI is the evolution: broader context, learning, and conversational interface.

### G. Predictive and Proactive Actions
- **Value**: HIGH — Predictive demand engine already exists (24h patterns per vertical). Extending to user-specific predictions: "Your usual grocery order is running low" (based on reorder patterns), "Traffic is heavy, book your ride 15 min earlier today" (based on historical commute + live traffic).
- **Difficulty**: MEDIUM-HIGH — Needs clean user behavior history + temporal engine + mobility intelligence.
- **Risk**: LOW-MEDIUM — Predictions are suggestions only. No financial impact if wrong.
- **Timing**: Phase 7 (after context engines + user optimization)
- **Fit**: GOOD — Predictive demand engine + time context + ETA engine already produce the raw signals.

### H. Dynamic Local Behavior Intelligence
- **Value**: HIGH — Understanding that Fridays in Dubai have different demand patterns than Fridays in Paris. That Ramadan shifts dinner to 9pm+. That Lagos market days affect delivery demand. This kind of city-level behavioral intelligence doesn't exist in any current super app.
- **Difficulty**: MEDIUM — Global event registry exists. Temporal engine + cultural calendar provide the inputs. Need data collection + pattern learning per city.
- **Risk**: LOW — Read-only intelligence. Feeds into recommendations, not business logic.
- **Timing**: Phase 5-6 (after geo hierarchy + cultural calendar + temporal engine)
- **Fit**: GOOD — Radar brain orchestrator + context banner engine already react to some local events. This is the formalization.

### I. Cross-Country Seamless Usage for Travelers/Expats
- **Value**: HIGH — A user registered in France traveling to Dubai should seamlessly see local merchants, local currency, local language option, AND retain their wallet balance in EUR with live FX display. No super app handles this gracefully today.
- **Difficulty**: HIGH — Requires real-time geo detection → country context switch → currency display toggle → local provider discovery → wallet multi-currency view.
- **Risk**: MEDIUM — Must NOT change the user's "home country" or wallet base currency. Must be a "visiting mode" overlay.
- **Timing**: Phase 6-7 (after geo hierarchy + country rules + localization expansion)
- **Fit**: MEDIUM — Country-currency map exists. Geo resolver exists. But "visiting mode" concept is new and touches wallet display, search, and localization simultaneously.

## 6.3 Long-Term Moonshot Ideas (9-18+ months)

### J. Autonomous Flows
- **Value**: EXTREMELY HIGH — Fully autonomous order-to-delivery flows where the system handles everything from reorder detection to payment to dispatch without user intervention (with pre-authorized consent). "Auto-replenish my weekly grocery basket every Saturday at 10am."
- **Difficulty**: VERY HIGH — Requires: stable payment orchestration, reliable dispatch, predictable pricing, user consent management, failure recovery, and regulatory compliance for automated payments per country.
- **Risk**: HIGH — Autonomous financial transactions are legally complex. Failed autonomous orders create negative user experience.
- **Timing**: Phase 9+ (after all truth layers, payment hardening, and user optimization are battle-tested)
- **Fit**: LOW (current) → GOOD (after Phase 8) — Flow closure engine + order lifecycle + settlement exist but aren't designed for unattended execution.

### K. Real-Time World Adaptation Engine
- **Value**: EXTREMELY HIGH — The platform adapts in real-time to world events: natural disaster → disable delivery in affected zone + offer emergency services. Major sporting event → surge pricing + targeted promotions. Political unrest → restrict certain services. COVID-like pandemic → contactless-only mode.
- **Difficulty**: VERY HIGH — Requires external event feeds, geo-zone intelligence, rapid policy deployment, and careful human-in-the-loop controls for sensitive decisions.
- **Risk**: HIGH — Automated responses to world events can be culturally insensitive or legally problematic if wrong.
- **Timing**: Phase 9+ (requires stable zone intelligence + country rules + policy layer)
- **Fit**: LOW — Weather station is the closest analogue. Would need entirely new event ingestion and policy deployment infrastructure.

### L. Self-Optimizing Platform Engine
- **Value**: EXTREMELY HIGH — The platform autonomously optimizes commission rates per city based on supply/demand, adjusts delivery radius based on driver density, tunes search ranking based on conversion rates, and allocates ad budget across regions. A "platform brain" that continuously improves business metrics.
- **Difficulty**: EXTREMELY HIGH — This is ML/AI territory requiring clean data pipelines, A/B testing infrastructure, causal inference, and careful guard rails against optimization spirals.
- **Risk**: VERY HIGH — Self-optimizing commission rates could destroy merchant relationships. Self-optimizing pricing could violate price-fixing regulations.
- **Timing**: Phase 10+ (moonshot — requires everything else to be stable)
- **Fit**: LOW — Commission engine + pricing engine exist, but have no feedback loops or optimization logic.

## 6.4 Differentiator Priority Matrix

| Concept | Value | Difficulty | Risk | Timing | Priority |
|---------|-------|------------|------|--------|----------|
| Context-Aware Adaptation | HIGH | LOW-MED | LOW | Phase 3 | **DO FIRST** |
| Self-Healing Visibility | HIGH | LOW | LOW | Phase 2 | **DO FIRST** |
| Privacy-Premium Messaging | HIGH | MEDIUM | LOW-MED | Phase 4 | **DO SECOND** |
| Adaptive Country Onboarding | MED-HIGH | MEDIUM | LOW | Phase 6 | **DO SECOND** |
| Wallet Intelligence | V.HIGH | HIGH | MEDIUM | Phase 7 | PLAN NOW, BUILD LATER |
| Personal AI Assistant | V.HIGH | HIGH | MEDIUM | Phase 7-8 | PLAN NOW, BUILD LATER |
| Predictive Actions | HIGH | MED-HIGH | LOW-MED | Phase 7 | PLAN NOW, BUILD LATER |
| Local Behavior Intelligence | HIGH | MEDIUM | LOW | Phase 5-6 | PLAN NOW, BUILD LATER |
| Cross-Country Seamless | HIGH | HIGH | MEDIUM | Phase 6-7 | PLAN NOW, BUILD LATER |
| Autonomous Flows | EXT.HIGH | V.HIGH | HIGH | Phase 9+ | DEFER |
| Real-Time World Adaptation | EXT.HIGH | V.HIGH | HIGH | Phase 9+ | DEFER |
| Self-Optimizing Platform | EXT.HIGH | EXT.HIGH | V.HIGH | Phase 10+ | DEFER |

---

# SECTION 7: GUARDRAILS BEFORE ANY BUILD

## 7.1 Hard Rules

1. **NO SILENT FALLBACKS** — Every failure must be logged, classified, and surfaced. No `catch {}` without structured error reporting. No default values that mask broken data.

2. **NO DUPLICATED SOURCE OF TRUTH** — One definition of CanonicalVertical. One CATEGORY_TREE. One commission rate per country/vertical (from Country Rules Registry). One currency format per currency code. One user session per device.

3. **NO UI DECIDING BUSINESS TRUTH** — React components NEVER calculate prices, commissions, or payout amounts. All business logic lives in service layer or edge functions. UI only renders pre-computed results.

4. **NO ENGINE BYPASSING TAXONOMY** — Every listing, entity, media, and banner MUST reference a valid CanonicalVertical + category from CATEGORY_TREE. No freeform category strings.

5. **NO ENGINE BYPASSING LOCALIZATION** — Every user-facing text must go through i18n. Every currency display must use formatCurrency() with the correct locale. Every date must use Intl API.

6. **NO ENGINE BYPASSING PAYMENT POLICY** — Commission rates, payout schedules, and payment methods come from Country Rules Registry. No engine may hardcode financial parameters.

7. **NO DIRECT CROSS-DOMAIN FUNCTION CALLS** — Domains communicate ONLY through Platform Bus events, shared registries, or typed adapter interfaces. Payment NEVER calls Orbit directly. Mobility NEVER calls Wallet directly.

8. **NO NEW ENGINE WITHOUT**: (a) health check endpoint, (b) tick logging via engine observer, (c) feature flag toggle, (d) GovernanceViolation emission for detected issues, (e) graceful degradation path, (f) documented rollback procedure.

9. **NO PAGE-LEVEL FIX CONTRADICTING PLATFORM RULES** — If a page needs special behavior, it must be declared in a page registry entry, not implemented as an exception in component code.

10. **NO `as CanonicalVertical` CASTS** — All vertical values must type-check naturally. Any cast is a type safety violation that masks a real mismatch.

11. **NO HARDCODED COUNTRY/CURRENCY LISTS** — All country-specific data must come from a registry (country-system.ts expanded, or Country Rules Registry). No `if (country === "AE")` scattered across engine code.

12. **NO ENGINE MODIFYING DATA IT DOESN'T OWN** — Governance engines observe and report. They NEVER write to tables owned by other domains (e.g., the TextIntegrityEngine NEVER modifies listing titles directly). Owning domains may choose to act on governance violation events, but the governance engine itself never performs the action.

13. **NO WEATHER/TEMPORAL DATA AFFECTING PAYMENT AMOUNTS** — Weather and time context affect discovery, recommendations, and delivery ETA. They NEVER directly change the price a user pays or the commission a merchant is charged. This connection goes through the Pricing Engine only.

14. **NO GOVERNANCE VIOLATION WITHOUT PERSISTENCE** — All violations must be written to a persistent store (not just browser-session arrays) so they survive page refreshes and are available for auditing.

---

# SECTION 8: PHASED IMPLEMENTATION ROADMAP

## Phase 0: FREEZE & SNAPSHOT (COMPLETED)
- [x] PLATFORM_SNAPSHOT_REPORT.md generated
- [x] All structural changes frozen under governance program

## Phase 1: CANONICAL FOUNDATION LOCK (COMPLETED)
- [x] CanonicalVertical expanded to 20 values
- [x] Per-vertical entity types defined
- [x] GovernanceViolation schema established
- [x] 13 governance engines created and registered

## Phase 2: CANONICAL NORMALIZATION + GEO FOUNDATION
**Priority**: IMMEDIATE
**Duration**: 1-2 weeks
**Risk**: LOW-MEDIUM (elevated from LOW due to Geo Hierarchy's foundation-critical role)

Tasks (strict order):
1. Eliminate all `as CanonicalVertical` casts — ensure CATEGORY_TREE keys exactly match CanonicalVertical values
2. Complete CanonicalVerticalEntity discriminated union to cover all 20 verticals
3. **Design and freeze GeoContext TypeScript interface** — review with all downstream consumer requirements before implementation
4. **Create Geo Hierarchy Engine** (Country → Region → City → District → Postal → GPS) — foundation-critical, must be stable before Phase 3 begins
5. Wire governance engine APIs into real runtime paths (trackPageOpen into Router, registerAction into CTA components, validateMedia into upload pipeline — all observational/advisory only)
6. Add governance violation persistence (write violations to DB, not just in-memory arrays)

**Must NOT do yet**: Country Rules Registry (needs Geo Hierarchy first), Payment changes, Commission changes
**Gate**: Phase 3 CANNOT begin until Geo Hierarchy Engine passes validation against all 6 existing countries with verified output

## Phase 3: CONTEXT INTELLIGENCE ENGINES
**Priority**: HIGH
**Duration**: 2-3 weeks
**Risk**: LOW-MEDIUM
**Depends on**: Phase 2

Tasks:
1. Create Country Rules Registry — externalize all country-specific rules from hardcoded values
2. Create Zone Intelligence Engine — geofenced service zones with rules
3. Create Temporal Context Engine — unify time/season/timezone logic
4. Expand Live Weather Station to multi-city (driven by Geo Hierarchy, not hardcoded coordinates)
5. Expand Localization Engine from 10 → 50+ countries
6. Expand Global Event Registry with comprehensive country coverage

**Can parallelize**: Zone Intelligence + Temporal Context + Weather expansion (independent)
**Must sequence**: Country Rules Registry depends on Geo Hierarchy from Phase 2

## Phase 4: ENGINE MERGERS + FLOW UNIFICATION
**Priority**: MEDIUM-HIGH
**Duration**: 2-3 weeks
**Risk**: MEDIUM
**Depends on**: Phase 3

Tasks:
1. Merge Banner Strategy + Context Banner + Boost Engine into unified Campaign Intelligence
2. Unify Flow Integrity + Flow Closure + Close Flow + Flow Tracer into Flow Lifecycle Engine
3. Wire Cultural Calendar + Cuisine/Tradition into unified Cultural Context (feeds into banners, discovery, recommendations)
4. Add observability persistence — engine health + governance violations written to DB for Control Room

**Must NOT do yet**: Commission changes, payout changes, payment routing changes

## Phase 5: POLICY LAYER + FINANCIAL HARDENING
**Priority**: HIGH (but must wait)
**Duration**: 3-4 weeks
**Risk**: HIGH
**Depends on**: Phase 3 (Country Rules Registry must be stable)

Tasks:
1. Externalize commission rates to Country Rules Registry (remove hardcoded 20%/15%)
2. Add per-country payment method availability rules
3. Add per-country 3DS/SCA requirements
4. Create Verification & Compliance Engine
5. Add Cuisine & Tradition Engine
6. Add payout schedule rules per country to Country Rules Registry
7. Ensure all financial changes have audit trail + rollback capability

**DANGER**: This phase touches money. Every change must be:
- Feature-flagged per country
- A/B testable with shadow mode
- Auditable with before/after comparison
- Rollback-safe within 5 minutes

## Phase 6: ONBOARDING PERSONALIZATION + PROVIDER INTELLIGENCE
**Priority**: MEDIUM
**Duration**: 2-3 weeks
**Risk**: MEDIUM
**Depends on**: Phase 5

Tasks:
1. Personalize onboarding by country (KYC requirements, role options, feature discovery)
2. Add provider scoring and quality metrics
3. Add merchant optimization (menu quality, response time, availability patterns)
4. Wire verification engine into onboarding pipeline

## Phase 7: USER + PROVIDER OPTIMIZATION
**Priority**: MEDIUM
**Duration**: 3-4 weeks
**Risk**: MEDIUM
**Depends on**: Phase 6

Tasks:
1. User optimization engine (personalization, recommendations, journey optimization)
2. Provider optimization engine (service quality, availability, pricing optimization)
3. Advanced discovery intelligence (geo + temporal + cultural + weather combined scoring)

**Must NOT do yet**: ML-based optimization (needs stable data pipeline first)

## Phase 8: ADVERTISING INTELLIGENCE + GLOBAL SCALING
**Priority**: LOWER
**Duration**: 3-4 weeks
**Risk**: MEDIUM
**Depends on**: Phase 7

Tasks:
1. Advanced ad targeting (predictive, behavioral)
2. Budget optimization across countries
3. Campaign ROI tracking
4. Multi-currency ad billing

## Phase 9: FULL GLOBAL ROLLOUT
**Priority**: FINAL
**Duration**: Ongoing
**Risk**: HIGH (scale)
**Depends on**: Phase 8

Tasks:
1. Country-by-country activation (feature flags)
2. Regional payment gateway integration
3. Local regulatory compliance verification
4. Performance optimization at scale
5. Digitalization strategy for offline businesses

---

# SECTION 9: RISK MATRIX AND PREVENTION STRATEGY

## R1: Engine Conflicts
- **Root cause**: Two engines modifying the same data or emitting contradictory events
- **Impact**: Unpredictable system behavior, data corruption
- **Probability**: MEDIUM (13 governance engines already running)
- **Severity**: HIGH
- **Prevention**: AntiConflictEngine already exists. Extend with engine dependency graph validation. No engine may write to another domain's tables.
- **Detection**: AntiConflictEngine's architecture debt tracking, platform bus dead-event monitoring
- **Rollback**: Feature flag per engine — disable conflicting engine immediately

## R2: Duplicate Truth
- **Root cause**: Commission rates in code AND in Country Rules Registry, vertical names in CanonicalVertical AND in CATEGORY_TREE with different values
- **Impact**: Wrong financial calculations, wrong category routing
- **Probability**: HIGH (already exists — hardcoded rates + upcoming registry)
- **Severity**: CRITICAL
- **Prevention**: Migration uses shadow-mode comparison — the new registry lookup runs alongside the existing hardcoded path. Both values are computed, compared, and the delta is logged. The hardcoded path remains the **sole active source** until shadow-mode confirms zero divergence for a sustained period (minimum 7 days per country). Only then does the registry become the active source, and the hardcoded path is **deleted entirely** in the same commit. At no point do two active sources of truth coexist.
- **Detection**: SSOTAuditor engine, compile-time type checking, shadow-mode delta logs with alerts on any non-zero divergence
- **Rollback**: If the registry produces incorrect values post-cutover, the registry entry is corrected (not replaced with hardcoded fallback). If correction is not immediately possible, the country is deactivated via feature flag until the registry entry is fixed. There is no "fallback to hardcoded" path — that would reintroduce duplicate truth.

## R3: Broken Categories / Cross-Vertical Contamination
- **Root cause**: CanonicalVertical values not matching CATEGORY_TREE keys, `as CanonicalVertical` casts masking mismatches
- **Impact**: Food cards in hotel search, gym subcategory in clinic, wrong fulfillment engine dispatched
- **Probability**: MEDIUM (partially fixed, casts still exist)
- **Severity**: HIGH
- **Prevention**: Eliminate all casts, ensure compile-time exhaustive checks
- **Detection**: TaxonomyGovernanceEngine + VerticalIsolationEngine
- **Rollback**: Owning domain service layer can suppress contaminated renders after receiving violation events from VerticalIsolationEngine

## R4: Wrong Media Per Category
- **Root cause**: MediaRelevanceEngine.validateMedia() not called from upload pipeline
- **Impact**: Stock photos with watermarks in production, food images on hotel listings
- **Probability**: HIGH (validateMedia has zero external call sites)
- **Severity**: MEDIUM
- **Prevention**: Wire validateMedia into upload pipeline in Phase 2
- **Detection**: MediaRelevanceEngine already detects violations — just needs to be connected
- **Rollback**: Media validation is advisory — can be disabled without blocking uploads

## R5: Wrong Weather/Time Logic
- **Root cause**: Weather station hardcoded to Dubai, seasonal logic not hemisphere-aware for all countries
- **Impact**: Wrong weather surcharges, wrong seasonal recommendations in southern hemisphere
- **Probability**: MEDIUM (currently only Dubai)
- **Severity**: MEDIUM
- **Prevention**: Multi-city weather in Phase 3, hemisphere-aware season resolution already exists in banner engine
- **Detection**: Governance localization violations when weather context doesn't match user's country
- **Rollback**: Weather features are non-critical — disable returns to static pricing

## R6: Wrong Banner Targeting
- **Root cause**: Three separate banner systems (BannerStrategy, ContextBanner, CanonicalBoost) with overlapping logic
- **Impact**: Ramadan banners in non-Muslim countries, Christmas ads during wrong season, culturally inappropriate content
- **Probability**: MEDIUM (limited country coverage in event registry)
- **Severity**: HIGH (cultural sensitivity)
- **Prevention**: Merge into one Campaign Intelligence Engine with explicit country whitelists
- **Detection**: BannerStrategyEngine's zero-tolerance rules
- **Rollback**: Banner features can be disabled per country via feature flags

## R7: Payment Errors
- **Root cause**: Commission rates changed without testing, payment gateway misconfiguration per country, currency conversion errors
- **Impact**: Overcharging customers, underpaying merchants, financial loss
- **Probability**: LOW (current system is stable for supported countries)
- **Severity**: CRITICAL
- **Prevention**: Shadow mode for commission changes, dual-compute during migration with delta logging, financial reconciliation engine (already exists)
- **Detection**: LedgerIntegrityEngine, FraudWatchEngine, reconciliation runs
- **Rollback**: Deactivate affected country via feature flag. Correct registry values. Re-validate with shadow-mode comparison before reactivation. Do NOT reintroduce hardcoded rates as a fallback — that creates exactly the duplicate truth this plan prohibits.

## R8: Payout/Commission Errors
- **Root cause**: Commission split calculation using wrong country rates, settlement timing mismatch
- **Impact**: Incorrect merchant payouts, platform revenue loss
- **Probability**: MEDIUM (commission-split edge function has rounding logic that could be affected by rate changes)
- **Severity**: CRITICAL
- **Prevention**: Commission changes go through A/B shadow mode first, dual-compute (old + new) with diff logging
- **Detection**: PayoutSafetyEngine, ledger reconciliation
- **Rollback**: Deactivate affected country's commission config via feature flag. Correct registry values and re-run shadow-mode comparison. Re-run settlement with corrected rates after validation. Do NOT fall back to a separate hardcoded rate path.

## R9: Runtime Regressions
- **Root cause**: New engine consuming too much CPU/memory, too many bus events causing lag
- **Impact**: Slow app, dropped frames, delayed realtime updates
- **Probability**: MEDIUM (88+ engines already running, adding more increases load)
- **Severity**: MEDIUM
- **Prevention**: Engine tick budgets (max duration), Event Priority Bus prioritization, lazy loading for non-critical engines
- **Detection**: PerfAnalyzer, NetworkLatencyEngine, RenderOptimizer
- **Rollback**: Feature flag disable per engine, tiered boot delays already exist

## R10: Dead Actions / Broken End-to-End Flows
- **Root cause**: CTA wired to route that doesn't exist, flow step missing handler, event emitted but no consumer
- **Impact**: Dead clicks, broken user journeys, abandoned checkouts
- **Probability**: MEDIUM
- **Severity**: HIGH
- **Prevention**: ActionWiringEngine validates all registered actions, FlowClosureEngine tracks completion rates
- **Detection**: ActionWiringEngine dead-click tracking, platform bus dead-event monitoring
- **Rollback**: Dead actions are detectable — redirect to safe fallback page

## R11: Cross-Country Contamination
- **Root cause**: User in France seeing UAE-specific content, commission rates from wrong country applied
- **Impact**: Wrong prices, wrong compliance requirements, cultural inappropriateness
- **Probability**: HIGH (country-system.ts only covers 6 countries, expanding to 50+ creates risk)
- **Severity**: HIGH
- **Prevention**: Country Rules Registry with strict country isolation, geo context always resolved from user's actual location
- **Detection**: LocalizationEngine violation detection
- **Rollback**: Country activation is feature-flagged — disable new country immediately

---

# SECTION 10: FIRST IMPLEMENTATION BATCH RECOMMENDATION

## What Should Be Built First (Phase 2 — Immediate)

### 1. Eliminate `as CanonicalVertical` casts (REPAIR)
- **Why first**: Type safety is the foundation. Every subsequent engine depends on correct vertical typing.
- **Effort**: Small (find & fix ~3 casts in taxonomy-governance-engine)
- **Risk**: LOW

### 2. Geo Hierarchy Engine (CREATE — FOUNDATION-CRITICAL)
- **Why first**: Every context engine (temporal, weather, cultural, country rules) depends on knowing WHERE the user is. This is the missing foundation layer. Its GeoContext schema must be frozen before any consumer is wired.
- **Effort**: Medium (build on existing geo-resolver + geo-proximity + country-currency-map)
- **Risk**: MEDIUM (foundation-critical — schema errors cascade to 8+ downstream systems)

### 3. Wire governance APIs into real runtime paths (REPAIR)
- **Why first**: 13 governance engines exist but run with empty data. Connecting them to real data transforms them from scaffolding into active protection. All wiring is observational/advisory — governance engines never block rendering or actions directly.
- **Effort**: Medium (instrument route lifecycle, CTA components, upload pipeline)
- **Risk**: LOW (purely observational — governance engines don't block operations)

### 4. Governance violation persistence (CREATE)
- **Why first**: Currently violations are browser-session arrays that vanish on refresh. Persisting to DB makes the Control Room authoritative.
- **Effort**: Small (add DB write alongside in-memory push in each engine's violation recorder)
- **Risk**: LOW (additive, no existing logic affected)

## What Should Be Repaired First

1. **Live Weather Station** — Remove Dubai hardcoding, accept coordinates from Geo Hierarchy
2. **Global Event Registry** — Expand country coverage beyond current limited set
3. **CanonicalVerticalEntity union** — Add missing vertical types to complete the discriminated union

## What Should Be Reused First

1. **Existing geo-resolver + geo-proximity** — Foundation for Geo Hierarchy Engine
2. **Existing country-currency-map** — Seed data for Country Rules Registry
3. **Existing country-system.ts** — Template for expanding to 50+ countries
4. **Existing engine-registry pattern** — Use same tiered boot for new engines
5. **Existing BaseEngine class** — All new engines extend this

## What Must Wait

1. **Commission rate externalization** — Wait for Country Rules Registry (Phase 3) + shadow mode testing (Phase 5)
2. **Payment gateway per-country routing** — Wait for Country Rules Registry + 3DS/SCA rules
3. **User/Provider optimization** — Wait for all truth layers to be stable (Phase 7)
4. **ML-based recommendations** — Wait for stable data pipeline

## External APIs to Use Instead of Building

1. **Weather**: Continue with Open-Meteo (free, no API key, global coverage) — do NOT build internal weather forecasting
2. **Geocoding**: Continue with Mapbox + Nominatim — do NOT build internal geocoding
3. **Maps**: Continue with Mapbox GL JS — do NOT build internal mapping
4. **Payment processing**: Continue with Stripe + Checkout.com — do NOT build internal payment processing
5. **Rain radar**: Continue with RainViewer — do NOT build internal weather visualization
6. **Religious calendar**: Use external Islamic calendar API (Aladhan or similar) for accurate Hijri date conversion — do NOT hardcode Islamic dates
7. **Currency exchange rates**: Use external FX API (exchangerate-api, fixer.io) — do NOT maintain internal rate tables

## What Core Intelligence Must Remain Internal

1. **Commission calculation** — Platform's revenue depends on this. Must be internal with full audit trail.
2. **Dispatch/routing logic** — Core competitive advantage. Must be internal.
3. **Pricing engine** — Dynamic pricing is core business logic. Must be internal.
4. **User/provider scoring** — Competitive advantage. Must be internal.
5. **Fraud detection** — Must be internal for security and speed.
6. **Cultural context engine** — Platform differentiation. Must be internal.
7. **Taxonomy/vertical logic** — Core platform architecture. Must be internal.

---

# SECTION 11: NO-GO AREAS FOR NOW

## 11.1 DO NOT build a Payment Orchestration Engine
- **Why**: The current Stripe webhook (1500+ lines) and wallet engine are production-ready. Creating a separate "Payment Orchestration Engine" that sits between the app and Stripe would create a dangerous second decision-maker for money.
- **When safe**: Only after Country Rules Registry is stable AND commission externalization is complete AND shadow-mode testing validates correctness (Phase 6+)

## 11.2 DO NOT build ML/AI-based recommendation engines
- **Why**: ML models need stable, clean training data. The current system doesn't persist governance violations, flow traces are ephemeral, and user behavior data isn't structured for ML consumption.
- **When safe**: After flow lifecycle unification + violation persistence + at least 3 months of clean data collection (Phase 8+)

## 11.3 DO NOT add new payment gateways per country
- **Why**: Each payment gateway (beyond Stripe/Checkout.com) requires: webhook handling, settlement logic, refund flow, dispute handling, 3DS integration, currency conversion. Adding without the Country Rules Registry would create country-specific payment code scattered across edge functions.
- **When safe**: After Country Rules Registry defines payment-method-per-country rules (Phase 5+)

## 11.4 DO NOT attempt real-time cross-country data synchronization
- **Why**: The current Supabase architecture is single-region. Multi-region data sync would require fundamental infrastructure changes (CRDTs, conflict resolution, eventual consistency) that would affect every part of the system.
- **When safe**: Only as a dedicated infrastructure project with database migration planning

## 11.5 DO NOT build a "Super Admin" engine that can override any domain
- **Why**: This would violate domain boundaries and create a single point of failure. An admin engine that can modify payments, override dispatching, and change user roles in one interface is a security and architectural nightmare.
- **When safe**: Never as a single engine. Admin capabilities should remain domain-specific (admin payment tools, admin dispatch tools, etc.)

## 11.6 DO NOT connect Weather Engine directly to Payment/Commission
- **Why**: Weather should affect delivery ETA and dynamic pricing through the Pricing Engine. It should NEVER directly change commission rates or payment amounts. This connection must go through the policy layer.
- **When safe**: Never directly. Always through Pricing Engine → Payment Service

## 11.7 DO NOT build blockchain/crypto payment support
- **Why**: Regulatory complexity varies wildly by country. Adding crypto would require compliance review in every target market, which doesn't exist yet. The wallet engine is not designed for blockchain transaction models.
- **When safe**: Only after regulatory compliance engine covers target markets AND wallet engine is refactored for multi-asset support

## 11.8 DO NOT attempt to auto-generate country configurations
- **Why**: Country-specific rules (VAT rates, compliance requirements, payout schedules) are legally binding. Auto-generating from scraped data risks regulatory violations.
- **When safe**: Never automatically. Each country configuration must be manually verified against local regulations.

## 11.9 DO NOT merge Orbit realtime with general platform realtime
- **Why**: Orbit has E2EE at the realtime layer, receipt handling with a specialized status machine, and group integrity logic. Merging it with general realtime channels (rider_presence, mobility_jobs) would compromise messaging security and reliability.
- **When safe**: Never merge. Keep Orbit realtime as a separate, hardened subsystem.

## 11.10 DO NOT build a "Universal Dashboard" that aggregates all verticals
- **Why**: Each vertical has fundamentally different KPIs (food: order time, hotel: occupancy rate, taxi: driver utilization, property: vacancy rate). A single dashboard that tries to unify all metrics would either be meaninglessly generic or impossibly complex.
- **When safe**: Build per-vertical dashboards that share common layout components but have vertical-specific metrics.

---

# SECTION 12: FINAL STRATEGIC RECOMMENDATION

## The Four Paths

### Path A: SAFEST PATH
**"Foundation First, Intelligence Later"**

Execute Phases 0-3 only. Lock the canonical core, build Geo Hierarchy, create Country Rules Registry, wire governance engines to real data, persist violations. Do NOT touch payments, commissions, or optimization engines. Timeline: 6-8 weeks.

- **Pros**: Zero risk to payments, realtime, or Orbit. Builds the foundation every subsequent engine needs. Control Room becomes authoritative.
- **Cons**: No user-visible next-gen features. No competitive differentiation. Platform improves internally but users don't see it.
- **Who it's for**: If the platform is under regulatory pressure or has active financial audits.

### Path B: SMARTEST PATH
**"Foundation + Near-Term Differentiators"**

Execute Phases 0-4 plus near-term differentiators (Context-Aware Adaptation, Self-Healing Visibility, Privacy-Premium Messaging). Timeline: 10-14 weeks.

- **Pros**: Gets the foundation right AND delivers visible next-gen features. Context-aware adaptation makes the app feel alive. Self-healing visibility builds user trust. Privacy-premium Orbit differentiates from all competitors.
- **Cons**: More surface area to manage. Privacy-premium messaging requires careful security review.
- **Who it's for**: If the platform is growing and needs to show differentiation while building carefully.

### Path C: MOST AMBITIOUS PATH
**"Full Intelligence Stack in 6 Months"**

Execute Phases 0-7 aggressively. Foundation + all context engines + policy layer + financial hardening + onboarding personalization + user/provider optimization. Timeline: 20-26 weeks.

- **Pros**: Delivers the complete intelligence platform. Every surface is context-aware, country-adapted, and optimized. Wallet intelligence and personal AI become possible.
- **Cons**: HIGH risk of moving too fast. Financial hardening (Phase 5) is dangerous if rushed. User optimization before truth layers are stable produces garbage recommendations.
- **Who it's for**: If there's strong competitive pressure and a large engineering team with dedicated QA.

### Path D: RECOMMENDED PATH
**"Smart Foundation with Strategic Differentiation"**

Execute Phases 0-5 carefully, with near-term differentiators woven into Phases 2-4. Defer user/provider optimization (Phase 7), advertising intelligence (Phase 8), and all moonshots (Phase 9+). Timeline: 14-18 weeks.

**Why this is the right path:**

1. **Phase 2** (2 weeks): Canonical normalization + Geo Hierarchy + governance wiring + violation persistence + self-healing visibility. This is pure foundation with zero business risk, and self-healing visibility is the first visible differentiator.

2. **Phase 3** (3 weeks): Country Rules Registry + Zone Intelligence + Temporal Engine + weather multi-city + localization expansion + cultural calendar expansion. The context intelligence stack comes alive. Context-aware adaptation (the highest-value, lowest-risk differentiator) becomes real.

3. **Phase 4** (3 weeks): Banner/campaign merger + flow unification + privacy-premium Orbit. Three mergers that reduce system complexity while adding the premium messaging differentiator.

4. **Phase 5** (4 weeks): Financial hardening — commission externalization, per-country payment methods, 3DS/SCA, verification engine. This is the DANGER PHASE and must not be rushed. Shadow mode, dual-compute, audit trail, rollback within 5 minutes.

**What this path achieves:**
- Canonical core is unified and type-safe (no more `as CanonicalVertical`)
- All 13 governance engines are actively protecting the platform with persisted data
- Geo hierarchy enables country-by-country, city-by-city, district-by-district intelligence
- Context-aware adaptation makes the app feel globally aware and locally relevant
- Self-healing is visible to users — a unique trust signal
- Privacy-premium Orbit differentiates from every competitor's messaging
- Financial system is hardened with country-aware rules, not hardcoded rates
- Banner/campaign system is unified instead of three overlapping systems
- Flow lifecycle is unified instead of four separate trackers

**What this path explicitly defers:**
- User/Provider optimization (Phase 7) — needs stable truth layers first
- Personal AI assistant (Phase 7-8) — needs user optimization first
- Advertising intelligence (Phase 8) — needs stable behavior data
- Autonomous flows (Phase 9+) — moonshot, needs everything else
- Real-time world adaptation (Phase 9+) — moonshot, needs event infrastructure
- Self-optimizing platform (Phase 10+) — moonshot, needs ML pipeline

**The key insight**: The platform already has 88+ engines, production-ready payments, Orbit with E2EE, and a sophisticated mobility stack. It is NOT lacking in features. What it lacks is: (a) unified type safety across verticals, (b) governance engines connected to real data instead of running empty, (c) externalized country rules instead of hardcoded values, (d) unified context intelligence from scattered engines, and (e) visible next-gen features that differentiate it. The recommended path fixes all five without touching the financial/realtime/messaging danger zones until they're properly hardened.

## Verdict

**Build the canonical truth first. Layer intelligence on stable truth. Show differentiation through context-awareness and self-healing visibility. Harden payments only when the policy layer is ready. Defer ML and autonomy until data pipelines are clean. The platform that wins is not the one with the most engines — it's the one where every engine runs on correct data and users can feel the intelligence.**

---

# VERIFICATION NEEDS

The following items could not be fully verified from the current codebase analysis and should be confirmed before Phase 2 begins:

1. **Supabase edge function count**: The analysis identified 7+ edge functions but the full list may be larger. Need to verify `supabase/functions/` directory completely.
2. **Database schema**: The analysis references tables (commission_rules, wallet_accounts, engine_supervisor, worker_health_snapshots) but the full schema wasn't audited. Need schema dump before creating governance violation persistence.
3. **Rider presence data model**: The `rider_presence` table structure needs verification to understand what geo fields are available for Zone Intelligence Engine.
4. **Commission split edge function rounding logic**: Before externalizing commission rates, the exact rounding behavior in the edge function must be documented and preserved.
5. **E2EE implementation**: Before any Orbit-adjacent work, the encryption key management approach needs to be understood (is it Signal Protocol? Custom? Where are keys stored?).
6. **Supabase region**: Need to verify which Supabase region the database is deployed in, as this affects latency for multi-country operations and determines if multi-region is needed.
7. **External API rate limits**: Open-Meteo (weather) and Nominatim (geocoding) have rate limits. Multi-city weather expansion needs to verify if current usage stays within free tier or requires paid plans.

---

# ADDENDUM A: DATA ARCHITECTURE

## A.1 Operational vs Analytical Data Separation

| Data Type | Purpose | Storage | Access Pattern | Retention |
|-----------|---------|---------|----------------|-----------|
| **Operational** | Real-time business execution (orders, payments, messages, sessions) | Supabase PostgreSQL (primary) | Read/write, low-latency, transactional | Active: indefinite. Soft-deleted: 90 days before hard delete. |
| **Analytical** | Reporting, trend analysis, optimization model training | Separate analytical store (future) or read replicas | Read-only, batch queries, aggregations | Raw: 12 months. Aggregated: indefinite. |
| **Governance/Audit** | Violation records, engine health, compliance trail | Supabase PostgreSQL (dedicated tables) | Append-only write, read for Control Room | 24 months minimum (regulatory requirement for financial audit trail) |
| **Context/Ephemeral** | Weather, GPS, time context, session state | In-memory + short-lived cache | Read-only, high-frequency refresh | Session duration only. Never persisted to user profile without explicit consent. |

**Hard rule**: Analytical queries NEVER run against operational tables in production. When analytical needs arise, they use read replicas, materialized views, or a dedicated analytical store. No analytical job may lock an operational table.

## A.2 Event Schema Principles

All events emitted on the Platform Bus or Event Priority Bus must follow this canonical schema:

```typescript
interface CanonicalEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  version: string;
  correlationId: string;
  userId?: string;
  countryCode?: string;
  vertical?: CanonicalVertical;
  payload: Record<string, unknown>;
  metadata: {
    priority: 'critical' | 'high' | 'normal' | 'low';
    idempotencyKey?: string;
    expiresAt?: string;
  };
}
```

**Rules**:
- Every event MUST include `eventId`, `eventType`, `timestamp`, `source`, `version`, `correlationId`
- Events MUST be backward-compatible within the same major version
- Breaking changes require a new major version AND a migration period where both versions are emitted
- No PII (name, email, phone, address) in event payloads — use canonical user ID only
- Financial amounts in events MUST include currency code and be in the smallest currency unit (cents/fils)

## A.3 Retention and Privacy Rules

| Data Category | Retention Period | Deletion Trigger | Privacy Level |
|---------------|-----------------|------------------|---------------|
| User profile data | Active account lifetime + 30 days post-deletion request | User deletion request (GDPR Art. 17) | HIGH — encrypted at rest |
| Payment/transaction records | 7 years (financial regulatory minimum) | Regulatory expiry only | CRITICAL — encrypted, audit-logged access |
| Chat messages (Orbit) | User-configurable (default: indefinite) | User deletion or conversation clear | HIGH — E2EE, server cannot read |
| GPS/location data | Session duration only (operational) | Session end | HIGH — never persisted to user profile without consent |
| Governance violations | 24 months | Automated expiry | LOW — no PII, system-only data |
| Engine health/telemetry | 90 days | Automated rotation | LOW — no PII |
| Search/browsing behavior | 12 months (if consented) | Consent withdrawal or expiry | MEDIUM — anonymized after 30 days |

## A.4 Consent Boundaries

| Data Usage | Requires Explicit Consent | Consent Type | Withdrawal Effect |
|------------|--------------------------|--------------|-------------------|
| Core service delivery (orders, payments, messaging) | NO — contractual necessity | Terms of Service | Cannot use platform |
| Location tracking for delivery/ride ETA | YES — per-session | Runtime permission (GPS) | Disable GPS features, manual address entry |
| Location tracking for recommendations | YES — opt-in | Settings toggle | Recommendations use country-level only, not GPS |
| Behavioral data for personalization | YES — opt-in | Settings toggle | No personalized recommendations, default experience |
| Behavioral data for AI assistant | YES — explicit opt-in | Separate consent screen | AI assistant disabled |
| Cross-country profile sharing | YES — opt-in | Settings toggle | Profile isolated to home country |
| Push notifications | YES — per-category | OS permission + in-app settings | Category-specific disable |
| Analytics/telemetry (anonymized) | Subject to jurisdiction — legitimate interest may apply in some regions, but explicit consent may be required in others (e.g., ePrivacy Directive). Each country activation must include legal review of analytics consent requirements before telemetry collection begins. | Privacy policy disclosure + jurisdiction-specific consent where required | N/A where legitimate interest applies; disable collection where consent is required and not granted |

**Hard rule**: No optimization engine (Phase 7+) or AI feature (Phase 7-8) may process user behavioral data without verified consent status. The consent check is a prerequisite function call, not an optional flag.

## A.5 Canonical IDs

| Entity | ID Format | Source of Truth | Used By |
|--------|-----------|----------------|---------|
| User | UUID (Supabase Auth `auth.users.id`) | Supabase Auth | All domains |
| Country | ISO 3166-1 alpha-2 (e.g., "AE", "FR") | Country Rules Registry | Geo, Localization, Payment, Onboarding |
| Currency | ISO 4217 (e.g., "AED", "EUR") | country-currency-map.ts | Wallet, Payment, Localization |
| Vertical | CanonicalVertical (20-value union) | canonical-types.ts | All domains |
| Category | CATEGORY_TREE key (14 primaries) | category-tree.ts | Taxonomy, Search, Fulfillment |
| Listing | UUID (DB-generated) | listings table | Search, Media, Taxonomy, Boost |
| Order | UUID (DB-generated) | orders table | Payment, Fulfillment, Settlement |
| Conversation | UUID (DB-generated) | orbit_conversations table | Orbit |
| GeoContext | Composite (countryCode + regionCode + cityId) | Geo Hierarchy Engine | Context Intelligence Layer |
| Engine | string (engine name from registry) | Engine Registry | Observability, Governance |
| Event | UUID v4 (per CanonicalEvent schema) | Emitting service | Platform Bus, Audit |

**Hard rule**: No domain may invent its own ID format for entities already covered by canonical IDs. All cross-domain references use canonical IDs only.

## A.6 Data Prerequisites for Optimization and AI Layers

Before any Phase 7+ engine (User Optimization, Provider Optimization, Personal AI, Predictive Actions) can be activated, the following data conditions must be verified:

| Prerequisite | Required State | Verification Method |
|-------------|---------------|-------------------|
| Governance violations persisted | 30+ days of continuous violation data in DB | Query governance_violations table for date range coverage |
| Flow lifecycle unified | All flows (order, booking, payment, onboarding) tracked through single Flow Lifecycle Engine | FlowClosureEngine reports >95% flow tracking coverage |
| User consent collected | Behavioral data consent status available for every active user | Consent table has entry for every user with `last_updated` within 90 days |
| GeoContext stable | Geo Hierarchy Engine resolving correctly for all active countries | Zero `GeoContextUnresolved` events for active countries over 14 days |
| Country Rules populated | All active countries have complete rule entries | Country Rules Registry validation reports zero missing fields for active countries |
| Event schema compliance | All Platform Bus events follow CanonicalEvent schema | Schema validation engine reports >99% compliance over 14 days |
| Transaction data clean | Ledger integrity engine reports zero discrepancies | LedgerIntegrityEngine audit pass for 30 consecutive days |

**Hard rule**: If any prerequisite fails verification, the dependent optimization/AI engine MUST NOT activate. It remains feature-flagged off until all prerequisites pass.

---

# ADDENDUM B: COUNTRY ROLLOUT FRAMEWORK

## B.1 Country Activation Checklist

Every new country activation must complete ALL items before the country feature flag is set to `active`:

### Legal & Compliance
- [ ] Business registration or entity established in country (or qualified cross-border arrangement)
- [ ] Data protection regulation identified (GDPR, PDPA, LGPD, etc.) and compliance verified
- [ ] Consumer protection laws reviewed for all active verticals
- [ ] Tax registration (VAT/GST/Sales Tax) completed where required
- [ ] Payment service provider license verified (or operating under Stripe/Checkout.com's license)
- [ ] Employment/contractor laws reviewed for driver/delivery partner classification
- [ ] Terms of Service and Privacy Policy translated and localized for jurisdiction

### Country Rules Registry
- [ ] VAT/tax rate entered and verified against official government source
- [ ] Commission rates per vertical defined and approved by business team
- [ ] Compliance requirements documented (trade license, KYC level, document types)
- [ ] Payment methods available in country confirmed with payment provider
- [ ] Payout schedule defined (daily/weekly/monthly, minimum threshold, currency)
- [ ] Operating hours / restricted hours defined (if applicable)

### Localization Completeness
- [ ] Primary language translation complete (100% of user-facing strings)
- [ ] Secondary language(s) translation complete (if applicable, minimum 95%)
- [ ] Currency formatting verified (symbol position, decimal separator, grouping)
- [ ] Date/time formatting verified (calendar system, date order, 12h/24h)
- [ ] Phone number format validated (country code, length, display format)
- [ ] Address format defined (field order, required fields, postal code format)
- [ ] RTL support verified (if applicable: Arabic, Hebrew, Urdu, Farsi)
- [ ] Number formatting verified (decimal/grouping separators)

### Payment & Payout Readiness
- [ ] Stripe or Checkout.com supports the country's currency
- [ ] Test payment completed successfully (create intent → charge → webhook → ledger entry)
- [ ] Test payout completed successfully (merchant withdrawal → admin approval → payout execution)
- [ ] Test commission split verified (3-party split matches expected rates from Country Rules Registry)
- [ ] 3DS/SCA requirements implemented if required by country regulation
- [ ] Refund flow tested end-to-end
- [ ] FX conversion display verified (if user currency ≠ merchant currency)
- [ ] Minimum/maximum transaction amounts defined per vertical

### Cultural & Banner Validation
- [ ] Religious events for country added to Global Event Registry
- [ ] National holidays added to Global Event Registry
- [ ] Commercial events relevant to country added (if applicable)
- [ ] Banner content reviewed for cultural appropriateness
- [ ] Food/cuisine categories relevant to country verified in taxonomy
- [ ] Time-of-day meal patterns adjusted for local customs (e.g., late dinner in Spain)
- [ ] Seasonal patterns configured for correct hemisphere
- [ ] Weather station verified for country's major cities

### Geo & Infrastructure
- [ ] Geo Hierarchy Engine resolves correctly for country's major cities
- [ ] Mapbox/Nominatim geocoding returns accurate results for country
- [ ] Address validation engine handles country's address format
- [ ] Timezone resolution correct for all regions within country

## B.2 Feature-Flag Rollout and Rollback Per Country

**Activation sequence** (each step must succeed before proceeding):

```
STAGE 1: INTERNAL ONLY
  └── Country feature flag: "internal_testing"
  └── Only team accounts can see the country
  └── Duration: minimum 3 days
  └── Gate: All checklist items verified, zero governance violations

STAGE 2: SHADOW MODE
  └── Country feature flag: "shadow"
  └── Country Rules Registry active, shadow-mode comparison running
  └── Commission calculations dual-computed (shadow vs expected)
  └── Duration: minimum 7 days
  └── Gate: Zero divergence in shadow-mode comparison logs

STAGE 3: SOFT LAUNCH
  └── Country feature flag: "soft_launch"
  └── Limited to specific cities or user cohort (invite-only or waitlist)
  └── Full payment/payout flow active but monitored closely
  └── Duration: minimum 14 days
  └── Gate: Zero critical governance violations, zero payment errors, >95% flow completion

STAGE 4: GENERAL AVAILABILITY
  └── Country feature flag: "active"
  └── Open to all users in country
  └── Standard monitoring applies
```

**Rollback procedure**:
1. Set country feature flag to `"suspended"` — immediately hides country from new users
2. Active orders/bookings in progress continue to completion, **UNLESS** the incident is classified as **legal, fraud, or payment-critical**, in which case domain-specific emergency rules apply (e.g., Payment domain may halt and refund in-flight transactions; Compliance domain may freeze affected accounts pending review)
3. Pending payouts for the country are held (not cancelled) pending review
4. Incident report generated with: trigger, affected users, financial impact, root cause
5. Country remains suspended until root cause is fixed and re-validated through Stage 1-3

**Hard rule**: No country may skip stages. No country may go from `internal_testing` directly to `active`.

---

# ADDENDUM C: ENGINE OWNERSHIP MATRIX

## C.1 Governance Engine Family

| Engine | Owner Domain | Read Dependencies | Write Permissions | Emitted Events | Can Block Render | Can Block Actions | Can Auto-Remediate | Rollback Switch |
|--------|-------------|-------------------|-------------------|----------------|-----------------|-------------------|--------------------|-----------------|
| VerticalIsolationEngine | Governance | canonical-types, category-tree, listings | governance_violations (append-only) | `governance.vertical.violation` | NO | NO | NO | Feature flag: `engine.vertical-isolation.enabled` |
| TaxonomyGovernanceEngine | Governance | canonical-types, category-tree, world-class-taxonomy | governance_violations (append-only) | `governance.taxonomy.violation` | NO | NO | NO | Feature flag: `engine.taxonomy-governance.enabled` |
| MediaRelevanceEngine | Governance | media uploads, canonical-registry | governance_violations (append-only) | `governance.media.violation` | NO | NO | NO | Feature flag: `engine.media-relevance.enabled` |
| TextIntegrityEngine | Governance | listing text, i18n config | governance_violations (append-only) | `governance.text.violation` | NO | NO | NO | Feature flag: `engine.text-integrity.enabled` |
| LayoutConsistencyEngine | Governance | page registry, component registry | governance_violations (append-only) | `governance.layout.violation` | NO | NO | NO | Feature flag: `engine.layout-consistency.enabled` |
| PageOpenEngine | Governance | route lifecycle events | governance_violations (append-only) | `governance.page.violation` | NO | NO | NO | Feature flag: `engine.page-open.enabled` |
| ActionWiringEngine | Governance | CTA registry, route map | governance_violations (append-only) | `governance.action.violation` | NO | NO | NO | Feature flag: `engine.action-wiring.enabled` |
| RuntimeHealthEngine | Governance | engine observer metrics | governance_violations (append-only) | `governance.runtime.violation` | NO | NO | NO | Feature flag: `engine.runtime-health.enabled` |
| FlowClosureEngine | Governance | flow lifecycle events | governance_violations (append-only) | `governance.flow.violation` | NO | NO | NO | Feature flag: `engine.flow-closure.enabled` |
| BannerStrategyEngine | Governance | cultural calendar, country rules, banner registry | governance_violations (append-only) | `governance.banner.violation` | NO | NO | NO | Feature flag: `engine.banner-strategy.enabled` |
| LocalizationEngine | Governance | i18n config, country-currency-map, geo context | governance_violations (append-only) | `governance.localization.violation` | NO | NO | NO | Feature flag: `engine.localization-governance.enabled` |
| AutoRemediationEngine | Governance | engine registry, engine health | engine_registry (restart only), cache (invalidate only) | `governance.remediation.applied` | NO | NO | **YES — engine restart + cache invalidation only** | Feature flag: `engine.auto-remediation.enabled` |
| AntiConflictEngine | Governance | engine dependency graph, platform bus events | governance_violations (append-only) | `governance.conflict.violation` | NO | NO | NO | Feature flag: `engine.anti-conflict.enabled` |

**Governance-to-Domain Boundary Rule**: No governance engine directly blocks rendering or user actions. Governance engines emit typed violation events on the Platform Bus. The **owning domain's service layer** receives these events and decides whether to block, suppress, or allow the affected render or action based on its own domain logic. This ensures governance remains observational while domains retain full authority over their own behavior. Example: BannerStrategyEngine emits `governance.banner.violation` → Campaign Intelligence Engine (the domain owner) decides whether to suppress the banner. The governance engine never suppresses it directly.

## C.2 Self-Healing Engine Family

| Engine | Owner Domain | Read Dependencies | Write Permissions | Emitted Events | Can Block Render | Can Block Actions | Can Auto-Remediate | Rollback Switch |
|--------|-------------|-------------------|-------------------|----------------|-----------------|-------------------|--------------------|-----------------|
| ErrorClassifierEngine | Platform Health | structured logger, error events | error_classifications (append-only) | `health.error.classified` | NO | NO | NO | Feature flag: `engine.error-classifier.enabled` |
| AutoFixEngine | Platform Health | error classifications, known fix patterns | Applies code-level fixes (retry, reconnect, cache clear) | `health.autofix.applied` | NO | NO | **YES — retry/reconnect/cache-clear only** | Feature flag: `engine.auto-fix.enabled` |
| RollbackEngine | Platform Health | deployment state, feature flags | feature_flags (toggle only) | `health.rollback.triggered` | NO | NO | **YES — feature flag toggles only** | Feature flag: `engine.rollback.enabled` |
| SilentRecoveryEngine | Platform Health | session state, connection state | session cache (refresh only) | `health.recovery.applied` | NO | NO | **YES — session refresh/reconnect only** | Feature flag: `engine.silent-recovery.enabled` |

## C.3 Payment & Financial Engine Family

| Engine | Owner Domain | Read Dependencies | Write Permissions | Emitted Events | Can Block Render | Can Block Actions | Can Auto-Remediate | Rollback Switch |
|--------|-------------|-------------------|-------------------|----------------|-----------------|-------------------|--------------------|-----------------|
| FraudWatchEngine | Payment | transactions, user patterns | fraud_alerts (append-only) | `payment.fraud.detected` | NO | **YES — can block suspicious transactions** | NO | Feature flag: `engine.fraud-watch.enabled` |
| LedgerIntegrityEngine | Payment | ledger entries, wallet accounts | ledger_audit (append-only) | `payment.ledger.discrepancy` | NO | NO | NO | Feature flag: `engine.ledger-integrity.enabled` |
| FXConsistencyEngine | Payment | currency rates, transaction currencies | governance_violations (append-only) | `payment.fx.inconsistency` | NO | NO | NO | Feature flag: `engine.fx-consistency.enabled` |
| CommissionEngine | Payment | country rules, vertical config | commission_calculations (append-only) | `payment.commission.calculated` | NO | NO | NO | Feature flag: `engine.commission.enabled` |
| RevenueIntelligenceEngine | Business | commission data, transaction volumes | analytics (append-only) | `business.revenue.report` | NO | NO | NO | Feature flag: `engine.revenue-intelligence.enabled` |

## C.4 Mobility Engine Family

| Engine | Owner Domain | Read Dependencies | Write Permissions | Emitted Events | Can Block Render | Can Block Actions | Can Auto-Remediate | Rollback Switch |
|--------|-------------|-------------------|-------------------|----------------|-----------------|-------------------|--------------------|-----------------|
| LocationIntegrityEngine | Mobility | GPS data, geo hierarchy | governance_violations (append-only) | `mobility.location.violation` | NO | NO | NO | Feature flag: `engine.location-integrity.enabled` |
| GeocodeRepairEngine | Mobility | geocoding results, address data | geocode_cache (update only) | `mobility.geocode.repaired` | NO | NO | **YES — geocode cache correction only** | Feature flag: `engine.geocode-repair.enabled` |
| ProviderMatchingEngine | Mobility | driver locations, job requirements | match_scores (append-only) | `mobility.provider.matched` | NO | NO | NO | Feature flag: `engine.provider-matching.enabled` |
| RoutingQualityEngine | Mobility | route data, ETA predictions vs actuals | routing_quality (append-only) | `mobility.routing.quality` | NO | NO | NO | Feature flag: `engine.routing-quality.enabled` |
| ETAAccuracyEngine | Mobility | ETA predictions, actual arrival times | eta_accuracy (append-only) | `mobility.eta.accuracy` | NO | NO | NO | Feature flag: `engine.eta-accuracy.enabled` |

## C.5 Orbit Engine Family

| Engine | Owner Domain | Read Dependencies | Write Permissions | Emitted Events | Can Block Render | Can Block Actions | Can Auto-Remediate | Rollback Switch |
|--------|-------------|-------------------|-------------------|----------------|-----------------|-------------------|--------------------|-----------------|
| MessageDeliveryEngine | Orbit | realtime channels, message queue | delivery_receipts (append-only) | `orbit.message.delivered` | NO | NO | NO | Feature flag: `engine.message-delivery.enabled` |
| MediaFlowEngine | Orbit | media uploads, compression queue | media_status (update only) | `orbit.media.processed` | NO | NO | NO | Feature flag: `engine.media-flow.enabled` |
| OptimisticUIEngine | Orbit | local message state, server state | local_message_cache (reconcile only) | `orbit.ui.reconciled` | NO | NO | **YES — local cache reconciliation only** | Feature flag: `engine.optimistic-ui.enabled` |
| ConversationConsistencyEngine | Orbit | conversation state, participant lists | governance_violations (append-only) | `orbit.conversation.inconsistency` | NO | NO | NO | Feature flag: `engine.conversation-consistency.enabled` |
| GroupIntegrityEngine | Orbit | group membership, group state | governance_violations (append-only) | `orbit.group.violation` | NO | NO | NO | Feature flag: `engine.group-integrity.enabled` |

## C.6 Context Intelligence Engine Family (New + Existing)

| Engine | Owner Domain | Read Dependencies | Write Permissions | Emitted Events | Can Block Render | Can Block Actions | Can Auto-Remediate | Rollback Switch |
|--------|-------------|-------------------|-------------------|----------------|-----------------|-------------------|--------------------|-----------------|
| GeoHierarchyEngine | Context | GPS, geo-resolver, country-currency-map | geo_context_cache (write) | `context.geo.resolved` | NO | NO | NO | Feature flag: `engine.geo-hierarchy.enabled` |
| TemporalContextEngine | Context | GPS (timezone), system clock | temporal_context_cache (write) | `context.temporal.resolved` | NO | NO | NO | Feature flag: `engine.temporal-context.enabled` |
| WeatherEngine | Context | coordinates (from Geo Hierarchy), Open-Meteo API | weather_cache (write) | `context.weather.updated` | NO | NO | NO | Feature flag: `engine.weather.enabled` |
| ZoneIntelligenceEngine | Context | coordinates, zone definitions | zone_context_cache (write) | `context.zone.resolved` | NO | NO | NO | Feature flag: `engine.zone-intelligence.enabled` |
| CulturalCalendarEngine | Context | country code, date, religious calendar APIs | cultural_context_cache (write) | `context.cultural.updated` | NO | NO | NO | Feature flag: `engine.cultural-calendar.enabled` |
| CountryRulesRegistry | Context | country configurations (DB or config file) | country_rules_cache (write) | `context.country-rules.loaded` | NO | NO | NO | Feature flag: `engine.country-rules.enabled` |

## C.7 Ownership Rules Summary

1. **Governance engines**: OBSERVE and REPORT only. Write to `governance_violations` table (append-only). ONE exception: AutoRemediationEngine may restart engines and invalidate caches. Governance engines never directly block rendering or user actions — they emit typed violation events, and the owning domain's service layer decides whether to block, suppress, or allow.
2. **Self-healing engines**: May perform scoped auto-remediation (retry, reconnect, cache clear, feature flag toggle). NEVER modify business data.
3. **Payment engines**: FraudWatchEngine is the ONLY engine that can block a user action (suspicious transaction). All others are observational.
4. **Mobility engines**: GeocodeRepairEngine may correct cached geocode results. All others are observational.
5. **Orbit engines**: OptimisticUIEngine may reconcile local cache with server state. All others are observational.
6. **Context engines**: Write to their own context caches. NEVER write to business tables. NEVER block render or actions.
7. **No engine in any family may write to a table owned by another domain.** Cross-domain effects happen through Platform Bus events only.

---

**END OF STRATEGIC ARCHITECTURE PLAN**

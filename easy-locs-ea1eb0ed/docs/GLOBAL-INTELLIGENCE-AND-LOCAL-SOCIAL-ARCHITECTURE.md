# Global Intelligence & Local Social Commerce — Architecture Document

> **Status**: Architecture-only. No code changes, no runtime modifications, no schema activations, no event activations, no route exposures, no provider integrations, no notification sending, no listing activation, no autonomous engine activation accompany this document.
> **Author**: Architecture team
> **Date**: 2026-04-12
> **Scope**: Unified world-scale architecture for a Global Country/City Intelligence Layer and a Zero-Search Local Social Commerce Engine within the Easy-Locs super-app.

---

### Table of Contents

### Core Sections
1. [Architecture-Only Declaration](#1-architecture-only-declaration)
2. [Executive Vision](#2-executive-vision)
3. [Global System Positioning](#3-global-system-positioning)
4. [Domain Separation and Boundaries](#4-domain-separation-and-boundaries)
5. [System A: Global Country/City Intelligence Layer](#5-system-a-global-countrycity-intelligence-layer)
6. [System B: Zero-Search Local Social Commerce Engine](#6-system-b-zero-search-local-social-commerce-engine)
7. [How Both Systems Coexist Without Conflict](#7-how-both-systems-coexist-without-conflict)
8. [Global Data Sources Strategy](#8-global-data-sources-strategy)
9. [Canonical Global Feed Model](#9-canonical-global-feed-model)
10. [Canonical Social Commerce Model](#10-canonical-social-commerce-model)
11. [Multi-Language and Localization Strategy](#11-multi-language-and-localization-strategy)
12. [Country / Region / City Intelligence Layer](#12-country--region--city-intelligence-layer)
13. [Personalization and AI Attention Engine](#13-personalization-and-ai-attention-engine)
14. [Live Ticker / Banner Architecture](#14-live-ticker--banner-architecture)
15. [AI Notification Architecture](#15-ai-notification-architecture)
16. [Religious Utility Module (Opt-In)](#16-religious-utility-module-opt-in)
17. [Nearby Mosques Module](#17-nearby-mosques-module)
18. [Zero-Search Local Matching Architecture](#18-zero-search-local-matching-architecture)
19. [Trust, Reputation, Moderation, and Anti-Scam Layer](#19-trust-reputation-moderation-and-anti-scam-layer)
20. [Orbit / Wallet / Dashboard / Search Integration Points](#20-orbit--wallet--dashboard--search-integration-points)
21. [Event Model and Platform Bus Alignment](#21-event-model-and-platform-bus-alignment)
22. [Scheduling, Automation, and 24/7 Operation](#22-scheduling-automation-and-247-operation)
23. [Fail-Safe, Non-Blocking, and Anti-Conflict Guarantees](#23-fail-safe-non-blocking-and-anti-conflict-guarantees)
24. [World-Scale Expansion Strategy](#24-world-scale-expansion-strategy)
25. [Implementation Phasing](#25-implementation-phasing)
26. [Risks and Guardrails](#26-risks-and-guardrails)
27. [Final Recommendation](#27-final-recommendation)
28. [Final Explicit Statement: No Implementation Performed](#28-final-explicit-statement-no-implementation-performed)

### Architecture Hardening Addendum
- [Addendum A: Canonical Identity and Profile Propagation](#addendum-a-canonical-identity-and-profile-propagation)
- [Addendum B: Privacy, Consent, and Sensitive Signal Boundaries](#addendum-b-privacy-consent-and-sensitive-signal-boundaries)
- [Addendum C: Priority Arbitration and Channel Allocation Model](#addendum-c-priority-arbitration-and-channel-allocation-model)
- [Addendum D: Strict Separation — Information Utility vs Commercial Opportunity](#addendum-d-strict-separation--information-utility-vs-commercial-opportunity)
- [Addendum E: Presentation Governance / Visual Surface Contracts](#addendum-e-presentation-governance--visual-surface-contracts)
- [Addendum F: Strict 24/7 Autonomous Operation Model](#addendum-f-strict-247-autonomous-operation-model)
- [Addendum G: Automation Governance Matrix](#addendum-g-automation-governance-matrix)
- [Addendum H: Explicit 5-Pillar Integration Discipline](#addendum-h-explicit-5-pillar-integration-discipline)
- [Section Compliance Checklist](#section-compliance-checklist)

---

## 1. Architecture-Only Declaration

**This document is architecture-only.** The following actions are explicitly forbidden in this phase:

1. **No live runtime behavior is changed.**
2. **No existing vertical, route, event, search, wallet, orbit, dashboard, marketplace, or travel flow is modified.**
3. **No code implementation is performed.**
4. **No provider integration is activated.**
5. **No notification engine is activated.**
6. **No social marketplace logic is activated.**
7. **No autonomous execution is activated.**
8. **No database schema changes are performed.**
9. **No feature flags are created or toggled.**
10. **No route exposures are made.**
11. **No event wiring is added to the platform bus.**

This document is for **design validation only**. Every recommendation herein is a design artifact. Implementation requires separate, tracked tasks with their own code review cycles, each subject to explicit approval before any build begins.

**DO NOT START BUILDING UNTIL THIS PLAN IS APPROVED.**

---

## 2. Executive Vision

**Easy-Locs Global Intelligence Layer** = A cross-domain, world-scale, continuously updated intelligence and local opportunity system composed of:

- **Global Personal Information Intelligence** (System A) — Live, contextualized information that matters to each user based on their location, language, preferences, and time: finance, forex, weather, news, traffic, events, religious utilities, and AI-driven notification intelligence.

- **Local Social Supply-Demand Intelligence** (System B) — A next-generation local social commerce engine where users discover nearby buying/selling opportunities without searching, powered by intelligent matching between expressed/inferred needs and hyper-local supply.

### 2.1 What This Is NOT

| This system is NOT... | Explanation |
|----------------------|-------------|
| A new marketplace vertical | It does not replace or compete with existing marketplace (`shops`, `services`, `food`) verticals in `CATEGORY_TREE` or `MODULE_WIRING`. |
| A replacement for Dashboard | Dashboard remains the primary user surface. These systems **contribute to** Dashboard as projection sources, they do not replace it. |
| Mobility | It has no dispatch, no driver assignment, no live tracking, no fare hold. |
| Travel | It does not manage bookings, flights, stays, or car rentals. |
| Wallet | It does not own payment state, ledger entries, or transaction truth. |
| Orbit | It does not own messaging, thread state, or communication infrastructure. |
| A search engine | It enhances search with intelligence items but does not replace `executeSearchIntelligence` or `resolveRadarMode` from `intelligence-orchestrator.ts`. |

These systems form a **cross-domain intelligence and opportunity layer** that enhances all existing pillars without owning their core business logic.

---

## 3. Global System Positioning

### 3.1 Architectural Position

```
┌─────────────────────────────────────────────────────────────┐
│                    EASY-LOCS SUPER-APP                       │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────┐  │
│  │Dashboard │ │  Radar   │ │  Orbit   │ │Wallet│ │  Me  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬───┘ └──┬───┘  │
│       │             │            │           │        │       │
│  ═══════════════════════════════════════════════════════════  │
│  │         CROSS-DOMAIN INTELLIGENCE LAYER           │       │
│  │  ┌─────────────────────┐ ┌────────────────────┐   │       │
│  │  │ System A:           │ │ System B:          │   │       │
│  │  │ Global Intelligence │ │ Local Social       │   │       │
│  │  │ (Info / Utility)    │ │ Commerce (C2C)     │   │       │
│  │  └─────────────────────┘ └────────────────────┘   │       │
│  ═══════════════════════════════════════════════════════════  │
│       │             │            │           │        │       │
│  ┌────┴─────────────┴────────────┴───────────┴────────┴───┐  │
│  │              EXISTING VERTICALS (Unchanged)             │  │
│  │  food │ grocery │ shops │ services │ beauty │ health    │  │
│  │  taxi │ delivery│property│ stay │ travel │ education    │  │
│  │  finance │ utility                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  PLATFORM INFRASTRUCTURE (Unchanged)                    │  │
│  │  platformBus │ notification-engine │ state-machines     │  │
│  │  category-tree │ module-wiring │ canonical-registry     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Key Positioning Rules

1. The intelligence layer sits **above** existing verticals but **below** the 5 pillars.
2. It **reads from** verticals and platform infrastructure; it **never writes to** their state.
3. It **projects into** Dashboard, Radar, and Orbit surfaces through governed adapters; it never owns those surfaces.
4. It operates on its own event namespaces (`global_intelligence.*`, `local_social_commerce.*`) with zero collision against existing platform bus events.
5. It is designed for future **autonomous 24/7 operation** under strict control, but this phase is architecture-only.

---

## 4. Domain Separation and Boundaries

### 4.1 System A: Global Intelligence — Ownership Table

| Dimension | Owns | Consumes (read-only) | Must NEVER Own |
|-----------|------|---------------------|----------------|
| **Feed items** | Global feed canonical objects (`CanonicalGlobalFeedItem`) | User profile (language, location, preferences) | Booking state, payment state, order state |
| **Source trust scores** | Trust scoring for external data sources | Platform health signals | Merchant trust scores (those belong to marketplace) |
| **Ticker/banner composition** | Feed rotation, prioritization, expiration | Dashboard layout configuration | Dashboard rendering logic |
| **Notification decisions** | When/whether to suggest an intelligence notification | `notification-engine.ts` insertion API | Notification delivery infrastructure |
| **Religious utility data** | Prayer times, calendar context, mosque data | User opt-in preferences from Me | Core app identity, profile truth |
| **Localized content** | Multi-language feed item translations | User language preference | Platform i18n infrastructure |
| **Geographic relevance** | Country/city feed filtering and ranking | `geo.position.updated` events | User location storage |

### 4.2 System B: Local Social Commerce — Ownership Table

| Dimension | Owns | Consumes (read-only) | Must NEVER Own |
|-----------|------|---------------------|----------------|
| **Local listings** | `CanonicalLocalListing` lifecycle | Marketplace category taxonomy for reference only | Professional marketplace listings (those belong to `shops`/`services`) |
| **Local intents** | `CanonicalLocalIntent` objects | Search history, favorites | Search infrastructure |
| **Matching** | `CanonicalLocalMatch` computation | Location, trust profile | Booking/order creation |
| **Seller/buyer profiles** | Social commerce projections | Canonical user identity | Core user profile |
| **Trust/reputation** | Local C2C trust scoring | Platform verification status | Platform-wide trust (belongs to existing moderation) |
| **Moderation** | Listing quality, spam detection | Report/block signals | Platform safety infrastructure |

### 4.3 Hard Boundaries Against All Existing Domains

| Domain | System A May... | System A Must NEVER... | System B May... | System B Must NEVER... |
|--------|----------------|----------------------|----------------|----------------------|
| **Dashboard** | Project summary cards, ticker modules | Own Dashboard rendering, layout, or routing | Project local opportunity cards | Replace Dashboard cards, own widget slots |
| **Radar** | Contribute POI-style intelligence pins (weather stations, etc.) | Own Radar discovery, map rendering, or filter logic | Show local listing proximity on map | Replace Radar entity discovery, own `entityType` |
| **Orbit** | Send intelligence notifications via `notification-engine.ts` (NOT via Orbit threads) | Own thread state, message delivery, or call infrastructure; create Orbit conversational threads | Provide safe seller/buyer chat channels via `local_exchange_chat` thread type | Own Orbit thread types beyond `local_exchange_chat`, bypass `OrbitWiring` |
| **Wallet** | Reference currency for localized finance display | Own payment flows, ledger, transactions, or balance | Conceptually support future escrow for local exchange | Own Wallet `paymentFlow`, `billingType`, or transaction state |
| **Me** | Contribute preference controls for intelligence modules | Own user profile fields, identity, or auth | Contribute local commerce preferences and history | Own user profile, identity, or verification |
| **Search** | Contribute intelligence items to search results | Own search ranking, index, or query infrastructure | Contribute local listings to search discovery | Own `executeSearchIntelligence`, search index, or result rendering |
| **Marketplace** | N/A (no overlap) | Classify items as marketplace listings | Offer C2C local exchange | Collapse into professional marketplace, share listing model with `shops` |
| **Mobility** | Display traffic intelligence | Own dispatch, driver state, or fare logic | N/A (no overlap) | Use `mobility_taxi` architecture or `fare_hold` flow |
| **Travel** | Display travel advisories, visa info | Own booking state, flight/hotel/car rental logic | N/A (no overlap) | Create travel bookings or interfere with `calendar_booking` |
| **Property** | Display local real estate trends | Own listing state, lease management | N/A (no overlap) | Create property listings, interfere with `property_listing` |

**Hard Rule**: The intelligence layer must **never** become the source of truth for bookings, payments, dispatch, or messaging. The social commerce layer must **never** collapse into generic marketplace logic without strict boundaries.

---

## 5. System A: Global Country/City Intelligence Layer

### 5.1 Purpose

A globally adaptive, locally intelligent, continuously updated information system that delivers personally relevant utility content to each user — 24/7, in their language, at their location, without noise.

### 5.2 Core Capabilities

| Capability | Description | Future Operation Mode |
|-----------|-------------|----------------------|
| **Live Ticker/Banner** | Rotating contextual information (forex, weather, news, events) displayed on Dashboard | Autonomous — continuous feed rotation with freshness expiration |
| **AI Notifications** | Intelligent, context-aware notifications based on location, time, and user behavior | Autonomous — automatic detection, ranking, delivery decision, suppression |
| **Country/City Intelligence** | Geographic context layer adapting content to country → region → city → district | Autonomous — per-country/city refresh cadence |
| **Multi-Language Delivery** | All outputs in user's chosen language with locale-specific formatting | Autonomous — automatic translation refresh |
| **Religious Utilities** | Prayer times, adhan reminders, Ramadan/Eid context (opt-in only) | Autonomous — location-aware timing engine |
| **Non-Blocking Rendering** | All intelligence surfaces degrade gracefully; never block core app flows | Guaranteed — circuit-breaker + fallback |
| **Safe Fallback** | If any source fails, system shows safe fallback or hides the surface silently | Guaranteed — stale data expiration + empty-state handling |

### 5.3 Architectural Location

System A lives as a **cross-domain service layer** — it does not belong to any single vertical. Architecturally:

- **NOT** inside `src/lib/taxonomy/` — it does not define verticals
- **NOT** inside `src/domains/` — it is not a domain-specific module
- Future implementation path: `src/lib/intelligence/global/` (sibling to existing `intelligence-orchestrator.ts`)
- It **reads from** the existing `IntelligenceOrchestrator` context (`UserContext`: currency, language, timeOfDay, city, activeIntent) but does not modify it
- It **emits** on `global_intelligence.*` event namespace only

### 5.4 User Interaction Model

| Aspect | Design |
|--------|--------|
| **Visibility** | Modular — each intelligence surface can be independently shown/hidden |
| **Opt-in** | Religious modules require explicit opt-in; all others are on by default with suppression controls |
| **Preference control** | Me pillar provides granular per-module, per-topic, per-channel controls |
| **Non-intrusive** | System respects silent mode, DND, and user fatigue signals |
| **Continuous** | Designed to run 24/7 in the future without becoming noisy; anti-fatigue models govern delivery |

### 5.5 Modular Composition

```
System A Modules:
├── Finance/Forex Module
│   ├── Currency rates relevant to user
│   ├── Stock market summaries
│   └── Crypto snapshots (if enabled)
├── Weather Module
│   ├── Current conditions
│   ├── Forecast summary
│   └── Severe weather alerts (critical priority)
├── News Module
│   ├── Country-level headlines
│   ├── City-level local news
│   └── Topic-filtered by user preferences
├── Traffic Module
│   ├── Real-time traffic conditions
│   └── Route suggestions
├── Events Module
│   ├── Local events/concerts/exhibitions
│   ├── City festivals
│   └── Public holidays
├── Religious Utility Module (opt-in)
│   ├── Prayer times
│   ├── Adhan reminders
│   ├── Ramadan/Eid calendar
│   └── Nearby mosques
└── Local Utility Module
    ├── Government service notices
    ├── Transportation updates
    └── Emergency information (critical priority)
```

---

## 6. System B: Zero-Search Local Social Commerce Engine

### 6.1 Purpose

A next-generation local C2C exchange system where the user does **not** need to search first. The system intelligently detects likely local relevance and suggests nearby opportunities **before** explicit demand is typed. This is a "living local exchange network" — more advanced than traditional classified ads or Leboncoin-style systems.

### 6.2 What Makes This Different from Traditional Classifieds

| Traditional Classifieds | Easy-Locs Zero-Search Commerce |
|------------------------|-------------------------------|
| User must search to find items | System proactively suggests relevant nearby items |
| Static listing index | Dynamic matching based on intent signals |
| No trust infrastructure | Built-in trust/reputation system |
| External communication (phone, email) | Orbit-native safe communication |
| No context awareness | Time, location, behavior, and preference-aware matching |
| Flat listing quality | AI-scored listing quality with anti-spam |
| No moderation beyond flagging | Active moderation pipeline with anomaly detection |
| Generic feed of all listings | Hyper-local, relevance-ranked, noise-suppressed suggestions |

### 6.3 Core Capabilities

| Capability | Description |
|-----------|-------------|
| **Local Supply Listings** | Users post items/services for local exchange with structured metadata |
| **Local Demand/Intent Signals** | System captures explicit wants ("looking for...") and inferred needs from behavior |
| **Zero-Search Matching** | Automatic matching between supply and demand without user-initiated search |
| **Hyper-Local Ranking** | Distance, timing, trust, and relevance score every potential match |
| **Trust & Reputation** | Verified profiles, transaction history, trust scores |
| **Anti-Scam** | Anomaly detection, suspicious pricing, duplicate detection, abuse throttling |
| **Orbit-Native Communication** | All seller/buyer conversations flow through Orbit with safe boundaries |
| **Local Suggestion Engine** | AI-powered recommendations: "something useful is nearby" / "you may want to list this" |
| **Map/Radar Proximity** | Optional map visualization of nearby listings and matches |

### 6.4 Architectural Location

- Future implementation path: `src/lib/commerce/local-social/` (sibling to existing `living-commerce-engine.ts`)
- It does **NOT** share listing models with `marketplace:listing_published` or `listing.created` events
- It uses its own canonical objects (`CanonicalLocalListing`, etc.)
- It emits on `local_social_commerce.*` namespace only
- It does NOT modify existing `composeLivingPage()` or `getContextualSection()` from `living-commerce-engine.ts`

### 6.5 Framing

This system is:
- **Local C2C social commerce** — person-to-person, neighborhood-level
- **NOT** a clone of the professional marketplace (shops/services verticals)
- **NOT** a generic feed of spam listings
- **NOT** a direct copy of Leboncoin or Craigslist
- A **future-ready "living local exchange network"** with intelligence, trust, and context

---

## 7. How Both Systems Coexist Without Conflict

### 7.1 Separate Ownership

| Dimension | System A (Global Intelligence) | System B (Local Social Commerce) |
|-----------|-------------------------------|----------------------------------|
| **Primary purpose** | Information utility and relevance | Opportunity and exchange |
| **Content type** | Informational (news, weather, forex, events) | Transactional (listings, intents, matches) |
| **User relationship** | Consumer of information | Participant in exchange |
| **Data source** | External feeds + platform signals | User-generated content |
| **Trust model** | Source trust (provider credibility) | Participant trust (seller/buyer reputation) |
| **Notification character** | Informational/advisory | Actionable/transactional |
| **Event namespace** | `global_intelligence.*` | `local_social_commerce.*` |

### 7.2 Shared Infrastructure (Read-Only)

Both systems may **read** from:
- User profile (language, location, preferences)
- `geo.position.updated` events
- Localization/i18n framework
- `notification-engine.ts` insertion API
- Dashboard projection surface (via governed adapters)
- Me preference storage

Neither system **writes** to or **owns** any shared infrastructure.

### 7.3 Shared Principles

- Relevance scoring: Both use locality, freshness, trust, and user-preference as ranking signals
- Anti-fatigue: Both respect user tolerance and suppress when engagement drops
- Localization: Both deliver in user's chosen language
- Non-blocking: Both degrade gracefully
- Trust: Both score sources/participants, but with separate trust models

### 7.4 Hard Anti-Conflict Matrix

| Conflict Type | Prevention Rule |
|--------------|-----------------|
| Ticker pollution by commerce | Local listings MUST NEVER appear in the live ticker/banner. Ticker is reserved for informational utility only. |
| Commerce suggestions as news | Local commerce suggestions MUST be visually and semantically distinct from intelligence items. Different card types, different badges. |
| Notification collision | System A and System B notifications MUST be independently suppressible. They MUST use different notification categories. Per-category cooldown timers are independent per system. A cross-system pacing rule (Addendum C.5) governs minimum spacing between an intelligence notification and a commerce suggestion, but this is a global pacing constraint, not a shared per-category timer. |
| Dashboard overload | Combined intelligence + commerce cards on Dashboard MUST NOT exceed a governed maximum. Priority arbitration (Addendum C) resolves conflicts. |
| Search contamination | Intelligence items and local listings MUST be separately typed in search results. Users MUST be able to filter between informational and commercial results. |
| Identity confusion | Both systems project the same canonical user identity through different governed projections (Addendum A). No ad-hoc profile reads. |
| Event loop risk | System A events MUST NOT trigger System B reactions, and vice versa, except through explicit, governed bridge points. |
| Ranking hijacking | Social commerce suggestions MUST pass stricter relevance thresholds than utility items if shown outside dedicated commerce surfaces. |
| Religious surface pollution | Religious utility surfaces MUST NEVER contain commercial content. Zero exceptions. |
| Map pin collision | Intelligence pins (weather, events) and commerce pins (listings) MUST use different pin types and layers on Radar. |

---

## 8. Global Data Sources Strategy

### 8.1 System A Source Families

| Source Family | Examples | Refresh Cadence | Trust Tier |
|--------------|----------|-----------------|------------|
| **Finance / Forex** | Currency rates, stock indices, crypto prices | 1-5 min (market hours), 30 min (off-hours) | Tier 1 (institutional feeds) |
| **Weather** | Current conditions, forecasts, severe alerts | 15 min (normal), real-time (severe) | Tier 1 (meteorological services) |
| **News** | Country/city headlines, breaking news | 5-15 min | Tier 2 (multi-source with trust scoring) |
| **Traffic** | Road conditions, congestion, incidents | 5 min | Tier 2 (aggregated signals) |
| **Events** | Concerts, exhibitions, festivals, public holidays | 1-6 hours | Tier 2 (verified calendars) |
| **Calendar / Holidays** | Public holidays, school schedules | Daily | Tier 1 (government sources) |
| **Religious Feeds** | Prayer times, Islamic calendar, mosque data | Daily (prayer times per location) | Tier 1 (established calculation libraries) |
| **App Behavior Signals** | Active verticals, search trends, engagement | Real-time (internal) | Tier 3 (internal signals only) |

### 8.2 System B Source Families

| Source Family | Examples | Trust Tier |
|--------------|----------|------------|
| **User-Created Listings** | Items for sale, services offered | Tier 3 (user-generated, requires moderation) |
| **User Intent Signals** | "Looking for..." posts, explicit wants | Tier 3 |
| **Search History** | Past searches indicating latent demand | Tier 4 (inferred, low confidence) |
| **Favorites / Saves** | Saved items indicating preferences | Tier 4 |
| **Dashboard / Local Behavior** | Category browsing patterns | Tier 4 |
| **Local Trust Signals** | Transaction completions, ratings, verifications | Tier 2 (verified signals) |
| **Moderation Signals** | Reports, blocks, quality scores | Tier 2 |
| **Engagement Signals** | Response rates, conversation completions | Tier 3 |

### 8.3 Cross-System Source Rules

| Rule | Details |
|------|---------|
| **Multi-provider strategy** | Every source family MUST support at least 2 provider candidates to avoid single-point failure |
| **Redundancy** | If primary source fails, secondary activates automatically with "source_fallback" flag |
| **Trust scoring** | Every source has a `sourceTrust` score (0.0-1.0). Items from sources below 0.3 are quarantined, not displayed |
| **Freshness scoring** | Every item has `freshnessScore` decaying over time. Stale items (score < 0.2) are auto-suppressed |
| **De-duplication** | Content-hash based de-duplication prevents the same information from appearing multiple times |
| **Source weighting** | Higher-trust sources outweigh lower-trust sources. Institutional feeds > aggregators > user-generated |
| **Source hierarchy** | Country-level → City-level → Global fallback. Local always preferred when available |
| **Fallback behavior** | If no local source is available, system shows regional → country → global fallback, or hides the module |
| **No provider schema leakage** | Raw provider data MUST be canonicalized before entering the system. No raw API responses stored in canonical objects |

---

## 9. Canonical Global Feed Model

### 9.1 CanonicalGlobalFeedItem

```typescript
interface CanonicalGlobalFeedItem {
  id: string;
  type: GlobalFeedType;
  subtype: string;

  country: string;
  region: string | null;
  city: string | null;
  district: string | null;

  language: string;
  source: string;
  sourceProvider: string;
  sourceTrust: number;

  freshnessScore: number;
  priorityScore: number;
  relevanceScore: number;

  title: string;
  shortContent: string;
  longSummary: string | null;

  tags: string[];
  startAt: string | null;
  expiresAt: string;

  actionTarget: ActionTarget | null;

  userScopeFlags: UserScopeFlags;
  optInRequired: boolean;
  optInModule: string | null;

  deliveryChannelEligibility: DeliveryChannelEligibility;
  suppressionRules: SuppressionRules;
  safeFallbackText: string | null;

  createdAt: string;
  updatedAt: string;
  canonicalizedAt: string;
}
```

### 9.2 Field Classification

| Category | Fields | Nature |
|----------|--------|--------|
| **Canonicalized** (from source, normalized) | `title`, `shortContent`, `longSummary`, `tags`, `startAt`, `expiresAt`, `source`, `sourceProvider` | Derived from external provider, canonicalized to standard format |
| **Source-linked** (provider metadata) | `sourceTrust`, `sourceProvider` | Computed from provider trust registry, not from item content |
| **Computed** (by intelligence engines) | `freshnessScore`, `priorityScore`, `relevanceScore`, `deliveryChannelEligibility` | Computed at ingestion time, refreshed on ranking passes |
| **User-specific** (personalized at delivery) | `relevanceScore` (final), `userScopeFlags`, `suppressionRules` | Adjusted per-user at delivery time; base scores are global |

### 9.3 Supporting Types

```typescript
type GlobalFeedType =
  | "finance_forex" | "finance_stock" | "finance_crypto"
  | "weather_current" | "weather_forecast" | "weather_severe"
  | "news_headline" | "news_breaking" | "news_local"
  | "traffic_congestion" | "traffic_incident"
  | "event_local" | "event_national" | "event_holiday"
  | "religious_prayer" | "religious_calendar" | "religious_reminder"
  | "utility_government" | "utility_transport" | "utility_emergency";

interface ActionTarget {
  type: "deeplink" | "url" | "module";
  value: string;
  label: string;
}

interface UserScopeFlags {
  requiresLocation: boolean;
  requiresLanguage: boolean;
  requiresOptIn: boolean;
  sensitivityLevel: "low" | "medium" | "high";
}

interface DeliveryChannelEligibility {
  ticker: boolean;
  banner: boolean;
  dashboardCard: boolean;
  pushNotification: boolean;
  inAppNotification: boolean;
  silent: boolean;
}

interface SuppressionRules {
  maxShowsPerDay: number;
  cooldownMinutes: number;
  suppressIfDismissed: boolean;
  suppressAfterExpiry: boolean;
}
```

---

## 10. Canonical Social Commerce Model

### 10.1 CanonicalLocalListing

**Purpose**: Represents an item or service offered for local exchange by a user.
**Lifecycle role**: Draft → Pending Review → Active → Reserved → Completed/Expired/Removed. Side-states: Flagged (from moderation action), Quarantined (from moderation — listing hidden from matching and display until review).

```typescript
interface CanonicalLocalListing {
  id: string;
  sellerId: string;
  status: "draft" | "pending_review" | "active" | "reserved" | "completed" | "expired" | "removed" | "flagged" | "quarantined";

  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  condition: "new" | "like_new" | "good" | "fair" | "parts";

  price: number | null;
  currency: string;
  priceType: "fixed" | "negotiable" | "free" | "swap" | "contact";

  images: string[];
  thumbnailUrl: string | null;

  country: string;
  region: string | null;
  city: string;
  district: string | null;
  coordinates: { lat: number; lng: number } | null;

  language: string;
  tags: string[];

  qualityScore: number;
  trustScore: number;
  freshnessScore: number;
  relevanceRadius: number;

  viewCount: number;
  inquiryCount: number;

  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}
```

**Required fields**: `id`, `sellerId`, `title`, `description`, `category`, `price`, `currency`, `country`, `city`, `language`
**Optional fields**: `subcategory`, `condition`, `images`, `coordinates`, `district`, `tags`
**Immutable fields**: `id`, `sellerId`, `createdAt`
**Mutable fields**: `status`, `title`, `description`, `price`, `images`, `qualityScore`, `trustScore`, `freshnessScore`, `viewCount`, `inquiryCount`
**Privacy-sensitive fields**: `coordinates` (coarsened for display; precise only for distance calculation)
**Locality fields**: `country`, `region`, `city`, `district`, `coordinates`, `relevanceRadius`
**Trust fields**: `qualityScore`, `trustScore`

**How listings differ from professional marketplace items**: Local listings are casual C2C exchanges. They do NOT use `listing.created` / `listing.published` events from the platform bus. They do NOT appear in `CATEGORY_TREE` categories. They have their own lifecycle and quality scoring separate from merchant storefronts.

### 10.2 CanonicalLocalIntent

**Purpose**: Represents a user's expressed or inferred desire for a specific item or service.
**Lifecycle role**: Created → Active → Matched → Fulfilled/Expired

```typescript
interface CanonicalLocalIntent {
  id: string;
  userId: string;
  status: "active" | "matched" | "fulfilled" | "expired" | "withdrawn";

  intentType: "explicit" | "inferred_search" | "inferred_behavior" | "inferred_favorite";
  description: string | null;
  category: string | null;
  keywords: string[];

  maxPrice: number | null;
  currency: string;

  country: string;
  city: string;
  searchRadius: number;
  coordinates: { lat: number; lng: number } | null;

  confidenceScore: number;
  matchCount: number;

  createdAt: string;
  expiresAt: string;
}
```

**How intents differ from normal search queries**: Intents are persistent signals that outlive a search session. A search query is ephemeral; an intent persists until fulfilled or expired. Inferred intents are system-generated based on behavior patterns, never shown to the user unless they produce a match above confidence threshold.

### 10.3 CanonicalLocalMatch

**Purpose**: Represents a computed match between a supply listing and a demand intent.
**Lifecycle role**: Computed → Suggested → Viewed → Contacted → Completed/Dismissed

```typescript
interface CanonicalLocalMatch {
  id: string;
  listingId: string;
  intentId: string | null;
  buyerId: string;
  sellerId: string;

  status: "computed" | "suggested" | "viewed" | "contacted" | "completed" | "dismissed";
  matchScore: number;
  matchReasons: string[];

  distanceMeters: number;
  priceMatch: boolean;
  categoryMatch: boolean;
  timingMatch: boolean;

  suggestedAt: string | null;
  viewedAt: string | null;
  contactedAt: string | null;

  createdAt: string;
}
```

**How matches are computed**: Matching considers: (1) category overlap, (2) geographic proximity, (3) price compatibility, (4) timing relevance, (5) trust compatibility, (6) listing quality. Matches below `matchScore` threshold are never surfaced.

**Spam/low-quality prevention**: Listings with `qualityScore` < 0.3 are excluded from matching. Sellers with `trustScore` < 0.2 are excluded. Matches require minimum `matchScore` of 0.5 to be suggested.

### 10.4 CanonicalSellerProfile

**Purpose**: Public-facing projection of a user acting as a seller in local social commerce.

```typescript
interface CanonicalSellerProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  memberSince: string;

  activeListingCount: number;
  completedTransactionCount: number;
  responseRate: number;
  averageResponseTime: number;

  trustScore: number;
  verificationLevel: "none" | "email" | "phone" | "identity";
  badges: string[];

  country: string;
  city: string;

  reportCount: number;
  blockCount: number;
  moderationStatus: "clean" | "warned" | "restricted" | "suspended";
}
```

### 10.5 CanonicalBuyerProfile

**Purpose**: Internal projection of a user acting as a buyer in local social commerce.

```typescript
interface CanonicalBuyerProfile {
  userId: string;
  displayName: string;

  completedPurchaseCount: number;
  responseRate: number;

  trustScore: number;
  verificationLevel: "none" | "email" | "phone" | "identity";

  country: string;
  city: string;

  reportCount: number;
  moderationStatus: "clean" | "warned" | "restricted" | "suspended";
}
```

### 10.6 CanonicalTrustProfile

**Purpose**: Unified trust assessment for a user across local social commerce interactions.

```typescript
interface CanonicalTrustProfile {
  userId: string;
  overallTrustScore: number;

  sellerTrustScore: number;
  buyerTrustScore: number;

  verificationLevel: "none" | "email" | "phone" | "identity";
  accountAge: number;
  completedTransactions: number;
  disputeCount: number;
  disputeResolutionRate: number;

  reportCount: number;
  blockCount: number;
  spamScore: number;

  lastUpdated: string;
}
```

### 10.7 CanonicalModerationState

**Purpose**: Tracks moderation state of a listing or user in the social commerce context.

```typescript
interface CanonicalModerationState {
  entityType: "listing" | "user";
  entityId: string;

  status: "pending_review" | "approved" | "flagged" | "quarantined" | "removed";
  flags: ModerationFlag[];

  autoScore: number;
  humanReviewRequired: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;

  escalationLevel: "none" | "auto" | "manual" | "admin";

  createdAt: string;
  updatedAt: string;
}

interface ModerationFlag {
  type: "spam" | "duplicate" | "suspicious_price" | "prohibited_item" | "offensive_content" | "scam" | "fake_image";
  confidence: number;
  detectedAt: string;
}
```

### 10.8 CanonicalLocalExchangeSummary

**Purpose**: Dashboard-friendly projection of a user's local social commerce activity.

```typescript
interface CanonicalLocalExchangeSummary {
  userId: string;

  activeListings: number;
  pendingMatches: number;
  activeConversations: number;
  completedExchanges: number;

  recentActivity: {
    type: "listing_created" | "match_received" | "conversation_started" | "exchange_completed";
    entityId: string;
    title: string;
    timestamp: string;
  }[];

  trustLevel: "new" | "established" | "trusted" | "verified";
  unreadNotifications: number;
}
```

**Orbit linkage**: All seller/buyer conversations are linked via Orbit thread type `local_exchange_chat` with entity link `listing`.
**Dashboard projection**: `CanonicalLocalExchangeSummary` feeds the Dashboard local commerce widget.
**Search/Radar projection**: Active listings are discoverable via local search and optional Radar proximity layer.

---

## 11. Multi-Language and Localization Strategy

### 11.1 Language Priority Chain

1. **User-selected language** (from Me preferences) — always first
2. **Country default language** — fallback if user hasn't selected
3. **Global fallback** — English (en) as last resort

### 11.2 Supported Languages (31)

The Easy-Locs app supports 31 languages. Both systems MUST deliver all outputs in the user's chosen language.

### 11.3 Localization Rules

| Rule | Details |
|------|---------|
| **Translation pipeline** | Source content → canonical English → target language translation. Never translate from a non-English intermediate. |
| **Translation caching** | Translated feed items are cached per-language per-item. Cache TTL matches item freshness. |
| **Localized formatting** | Numbers, dates, times, currencies MUST use locale-specific formatting (`Intl.NumberFormat`, `Intl.DateTimeFormat` patterns). |
| **No mixed-language feed** | A feed viewed in French MUST NOT contain English items unless no French translation exists, in which case the item is hidden or shows the `safeFallbackText`. |
| **No mixed-language notifications** | Every notification MUST be fully rendered in one language. No partial translations. |
| **RTL support** | Arabic, Hebrew, Urdu, Farsi, and other RTL languages MUST receive proper RTL rendering. |
| **Currency localization** | Finance/forex items MUST display amounts in locale-appropriate format with the user's home currency as reference. |

### 11.4 Applies To

- Ticker items
- Notifications (push and in-app)
- Local social commerce suggestions
- Religious utilities (prayer times, calendar)
- Dashboard summaries
- Proximity cards
- All card titles, descriptions, and CTAs

---

## 12. Country / Region / City Intelligence Layer

### 12.1 Geographic Resolution Hierarchy

```
Country (required)
  └── Region (optional, e.g., state/province/emirate)
       └── City (recommended)
            └── District (optional, for hyper-local precision)
```

### 12.2 Local Relevance Filtering

| Level | Content Scope | Example |
|-------|--------------|---------|
| **Global** | Applies to all users regardless of location | Major world events, global market trends |
| **Country** | Applies to all users in a specific country | National holidays, country-wide weather, national news |
| **Region** | Applies to users in a specific region | Regional weather, regional events, regional traffic |
| **City** | Applies to users in a specific city | City events, local traffic, city weather, local news |
| **District** | Applies to users in a specific neighborhood | Hyper-local events, nearby commerce, district-specific notices |

### 12.3 Merging Strategy

When composing a feed for a user, content is merged from all applicable levels:

1. **Critical items** from any level surface immediately (severe weather, emergency alerts)
2. **City-level** items are preferred over country-level for the same topic
3. **Country-level** fills gaps when no city-level content is available
4. **Global** items serve as fallback when no local/national content exists
5. Items MUST NOT duplicate across levels (de-duplication by content hash)

### 12.4 Country Profile Registry

Each supported country has a profile defining:

```typescript
interface CountryProfile {
  code: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultCurrency: string;
  timezones: string[];
  availableModules: string[];
  religionModuleAvailable: boolean;
  providerMatrix: ProviderAvailability;
  culturalFlags: CulturalFlags;
  complianceFlags: ComplianceFlags;
}
```

### 12.5 Culture/Compliance-Aware Configuration

| Aspect | Handling |
|--------|---------|
| **Religious sensitivity** | Modules that reference religion are only activated in countries/regions where configured AND with user opt-in |
| **Content restrictions** | Some countries may restrict certain news/financial content types; these are governed by `complianceFlags` |
| **Currency display** | Local currency is always primary; user can add secondary currencies |
| **Date/time formats** | Country-specific date and time formatting |
| **Local business/event intelligence** | Only available in cities where local data providers are onboarded |

---

## 13. Personalization and AI Attention Engine

### 13.1 Framing

This is an **AI Attention Engine**, not just a notification system. It decides **what is useful** for each person at each moment, across all intelligence and commerce surfaces.

### 13.2 Input Signals

| Signal | Source | Weight | Sensitivity |
|--------|--------|--------|-------------|
| Language | Me preferences | High | Low |
| Location (country/city) | Geo services | High | Medium (consent required) |
| App behavior (active verticals) | Session telemetry | Medium | Low |
| Search history | Search logs | Medium | Medium |
| Time of day / day of week | System clock | Medium | Low |
| Response history | Notification engagement | Medium | Low |
| Notification engagement rate | Engagement tracking | High | Low |
| Sensitivity to frequency | Fatigue model | High | Low |
| Opt-in modules | Me preferences | Critical | N/A (explicit) |
| Country/city context | Country profile registry | High | Low |
| Religious preferences | Me preferences (explicit opt-in) | Critical | High |
| Local commerce interests | Social commerce behavior | Medium | Medium |

### 13.3 Models

| Model | Purpose |
|-------|---------|
| **Scoring Model** | Assigns relevance score (0.0-1.0) to each candidate item based on user signals |
| **Ranking Model** | Orders scored items by combined relevance × priority × freshness |
| **Timing Model** | Determines optimal delivery time: morning digest vs real-time vs deferred |
| **Decay Model** | Reduces relevance score over time; steep decay for news, slow decay for events |
| **Tolerance Model** | Tracks per-user notification tolerance; reduces delivery rate when fatigue detected |
| **Anti-Fatigue Model** | Detects engagement drop and reduces frequency automatically |
| **Learning Loop** | Observes dismiss/engage/ignore signals to tune scoring weights |
| **Delivery Decision Model** | Decides channel: push notification vs in-app vs banner vs silent update |

### 13.4 Delivery Decision Matrix

| Condition | Channel |
|-----------|---------|
| Critical + real-time (severe weather, emergency) | Push notification (bypass fatigue) |
| Important + user online | In-app banner / dashboard highlight |
| Contextual + high relevance | Dashboard card / ticker item |
| Passive + moderate relevance | In-app notification (badge only) |
| Low relevance or fatigued user | Silent update (available on pull, not pushed) |
| Suppressed (dismissed, cooldown, or low tolerance) | Not delivered |

---

## 14. Live Ticker / Banner Architecture

### 14.1 Purpose

A continuous live ticker/banner system on Dashboard that displays rotating contextual information — finance, weather, news, events, local utility — designed for future 24/7 operation.

### 14.2 Design Rules

| Rule | Details |
|------|---------|
| **Feed rotation** | Items rotate at configurable interval (default 8s). Critical items hold longer. |
| **Prioritization** | Critical > Important > Contextual > Passive. Within same priority, freshness wins. |
| **Country/city composition** | Ticker sources local items first, fills with country/global items. Never shows only global items if local content exists. |
| **Dashboard integration** | Ticker is a governed Dashboard module, rendered via presentation adapter, positioned per Dashboard layout rules. |
| **Fail-safe rendering** | If no items available, ticker collapses (does not show empty/error state). |
| **Non-blocking UI** | Ticker MUST NOT block scrolling, navigation, or any core user interaction. Renders asynchronously. |
| **De-noising** | Items appearing more than `maxShowsPerDay` times are suppressed. |
| **Repeated item suppression** | Same content (by hash) is not shown twice within a cooldown window. |
| **Freshness expiration** | Items past `expiresAt` are immediately removed from rotation. Items with `freshnessScore` < 0.2 are deprioritized. |

### 14.3 Item Types for Ticker

| Type | Ticker-Eligible | Priority Tier |
|------|----------------|---------------|
| Weather (severe) | Yes | Critical |
| Emergency alerts | Yes | Critical |
| Finance/forex (significant moves) | Yes | Important |
| Breaking news | Yes | Important |
| Weather (normal) | Yes | Contextual |
| Local events | Yes | Contextual |
| Traffic updates | Yes | Contextual |
| General news | Yes | Passive |
| Religious reminders | Only if opted-in | Contextual |
| Local commerce suggestions | **NO** — forbidden in ticker | N/A |

### 14.4 Usefulness vs Spam

The ticker remains useful (not spammy) through:
1. Strict priority tiers prevent flood of low-value items
2. Freshness expiration removes stale content
3. Per-user suppression respects dismiss signals
4. Maximum rotation pool size (e.g., 20 items) prevents endless scrolling
5. Critical items break through only for genuine urgency (weather warnings, emergencies)
6. Commercial content is **categorically excluded** from the ticker

---

## 15. AI Notification Architecture

### 15.1 Notification Categories

| Category | Examples | Delivery | Suppressible |
|----------|----------|----------|-------------|
| **Critical** | Severe weather, emergency alerts, safety warnings | Push (immediate, bypasses fatigue) | No |
| **Contextual** | Relevant event nearby, prayer time reminder, traffic alert | Push or in-app (based on tolerance) | Yes |
| **Predictive** | "Rain expected this afternoon," "Forex shift for your currency" | In-app (proactive suggestion) | Yes |
| **Passive** | General news update, market summary | Badge/silent (available on pull) | Yes |

### 15.2 Anti-Spam Architecture

| Mechanism | Details |
|-----------|---------|
| **Cooldown** | Minimum interval between non-critical notifications per user (configurable, default 30 min) |
| **Delivery scoring** | Each candidate notification scores delivery likelihood; below threshold → suppressed |
| **Per-user tolerance** | System tracks engagement rate; low engagement → fewer notifications |
| **Category throttle** | Max notifications per category per day (e.g., max 3 finance, max 2 weather) |
| **Dismiss learning** | Dismissed notifications reduce score for similar future items |

### 15.3 Future Autonomous Operation

The notification engine is designed for future autonomous operation with these automatic behaviors:

1. **Automatic detection** — Monitoring feeds for notification-worthy events
2. **Automatic ranking** — Scoring candidates against user profile
3. **Automatic delivery decision** — Selecting channel based on context
4. **Automatic suppression** — Applying cooldown, fatigue, tolerance
5. **Automatic cooldown** — Spacing notifications to prevent bombardment
6. **Automatic learning** — Tuning weights based on engagement signals
7. **Automatic fail-safe downgrade** — If delivery fails, downgrades to lower-impact channel

**But this phase remains architecture-only. No notification sending is activated.**

---

## 16. Religious Utility Module (Opt-In)

### 16.1 Scope

An optional utility module providing practical religious timing and location information. This is a **utility service**, not a religious content platform.

### 16.2 Features

| Feature | Details |
|---------|---------|
| **Prayer times** | Calculated per user location using established astronomical algorithms. Shows 5 daily prayer times. |
| **Adhan reminders** | Optional notification before prayer time (configurable lead time). |
| **Ramadan/Eid context** | During Ramadan: iftar/suhoor times. During Eid: holiday greetings and timing context. |
| **Religious calendar** | Key Islamic calendar dates with local relevance (public holidays, observances). |

### 16.3 Strict Rules

| Rule | Enforcement |
|------|-------------|
| **User opt-in only** | Module is invisible until user explicitly enables it in Me → Preferences |
| **No assumption about religion** | System MUST NOT assume user's religion from any signal (name, country, language) |
| **No forced notifications** | Even when enabled, adhan reminders require separate notification opt-in |
| **No forced visibility** | Enabled module appears in designated surfaces only (Dashboard widget, ticker if opted-in) |
| **No coupling to core app** | Religious module failure MUST NOT affect any other app functionality |
| **No commerce pollution** | Religious surfaces MUST NEVER contain commercial content, ads, or local listings |

### 16.4 User Preference Control

| Setting | Options |
|---------|---------|
| Module enabled | On / Off |
| Prayer time calculation method | Standard options (MWL, ISNA, Egyptian, etc.) |
| Adhan reminder | On / Off, with lead time (5, 10, 15, 30 min) |
| Notification channel | Push / In-app / Silent |
| Calendar visibility | Dashboard widget / Ticker inclusion / Neither |

### 16.5 Delivery Channels

- Dashboard widget: Shows next prayer time when module is enabled
- Ticker: Prayer time items can appear in ticker rotation if user opted-in
- Push notification: Adhan reminder if explicitly enabled
- In-app notification: Calendar event reminders

### 16.6 Localization

- Prayer times are location-specific (latitude/longitude based calculation)
- Calendar dates follow Islamic (Hijri) calendar
- All text rendered in user's chosen language
- RTL layout for Arabic/Urdu/Farsi

---

## 17. Nearby Mosques Module

### 17.1 Scope

A location-based utility module for discovering nearby mosques. Optional extension of the religious utility module.

### 17.2 Features

| Feature | Details |
|---------|---------|
| **Location-based discovery** | Find mosques near user's current location or a specified location |
| **Country/city adaptation** | Data sources and availability vary by country |
| **Distance and travel time** | Show distance in user's preferred unit (km/miles) with estimated travel time |
| **Favorite mosque** | User can save preferred mosques for quick access |
| **Map/navigation integration** | "Navigate" action opens map with directions (concept only — no Radar ownership) |
| **Prayer-time linkage** | Shows next prayer time for each mosque if data available |
| **Contextual reminders** | "Friday prayer at your favorite mosque in 1 hour" (if reminder enabled) |
| **Local language** | Mosque names and addresses in local language with transliteration if available |

### 17.3 Strict Rules

| Rule | Enforcement |
|------|-------------|
| **Optional only** | Module requires opt-in and is hidden by default |
| **Preference-controlled** | All visibility settings are user-controlled |
| **Not always shown** | Only appears when user explicitly opens it or has active reminders |
| **Not assumed** | System MUST NOT suggest this module to users who haven't opted into religious utilities |
| **Not mixed into unrelated flows** | Mosque data MUST NOT appear in general Radar/search unless user has the module enabled and is explicitly searching |

---

## 18. Zero-Search Local Matching Architecture

### 18.1 Core Concept

The user does not search. The system **brings relevant local opportunities to the user** based on a continuously computed local relevance model.

### 18.2 Signal Types

| Signal Type | Description | Example |
|-------------|-------------|---------|
| **Active listings** | User-posted items currently for sale/swap nearby | "iPhone 14 Pro — 500 AED — 2km away" |
| **Passive demand signals** | Behavioral patterns suggesting latent need | User browsed electronics category 3 times this week |
| **Inferred needs** | System-predicted likely interests based on behavior clusters | User who just moved to a new city likely needs furniture |
| **Local intent graph** | Network of category ↔ user ↔ location connections | "Users in this district frequently look for baby items" |
| **Proximity graph** | Geographic clustering of supply and demand | Dense supply of furniture in district X matches demand in adjacent district Y |
| **Timing relevance** | Time-dependent matching | Seasonal items (AC units in summer, heaters in winter) |

### 18.3 Matching Pipeline (Conceptual)

```
Step 1: COLLECT
  ├── Active listings within relevance radius
  ├── Active intents (explicit + inferred)
  └── User context (location, time, history)

Step 2: FILTER
  ├── Remove expired/flagged/quarantined listings
  ├── Remove listings from blocked sellers
  ├── Remove listings below quality threshold
  └── Apply category/price compatibility filters

Step 3: SCORE
  ├── Category match score (0.0-1.0)
  ├── Proximity score (distance decay function)
  ├── Price compatibility score (within budget range)
  ├── Timing relevance score (seasonal, recency)
  ├── Trust compatibility score (seller trust × buyer trust)
  └── Listing quality score

Step 4: RANK
  ├── Combined match score (weighted sum)
  ├── Apply diversity rules (no single seller floods)
  └── Apply freshness boost (newer listings get slight boost)

Step 5: DELIVER
  ├── Above threshold → Dashboard suggestion card
  ├── High confidence → In-app notification
  ├── Medium confidence → Available on browse
  └── Below threshold → Not shown
```

### 18.4 Proactive Intelligence

| Direction | Concept |
|-----------|---------|
| **Buyer-side** | "Something useful is nearby" — Proactive notification when a high-confidence match is found for a user's inferred need |
| **Seller-side** | "You may want to list this" — Suggestion when system detects local demand matching items the user might have (based on category patterns) |
| **Timing-aware** | "Winter is coming — heating equipment sells fast in your area" — Seasonal prompts based on local climate and category trends |
| **Relocation-aware** | If future context suggests a user has moved cities, system can prompt: "New to [city]? People here often look for..." |

### 18.5 Beyond Standard Classifieds

This system exceeds standard classifieds by:
1. **Proactive** — Brings matches to users instead of requiring search
2. **Local** — Hyper-local (district-level) matching, not city-wide dumps
3. **Intelligent** — AI-scored relevance, not chronological listing
4. **Context-aware** — Time, season, user history, and location all factor in
5. **Trust-safe** — Built-in trust profiles prevent fraud
6. **Not creepy** — Inferred intents only surface matches above high confidence thresholds; user can see "why am I seeing this?" and suppress
7. **Not spammy** — Anti-fatigue model, category throttle, and freshness decay prevent notification flood

---

## 19. Trust, Reputation, Moderation, and Anti-Scam Layer

### 19.1 Trust Architecture

| Component | Purpose |
|-----------|---------|
| **Seller/buyer trust profile** | Composite trust score based on transaction history, verification, tenure, dispute rate |
| **Verification levels** | None → Email → Phone → Identity. Higher verification → higher trust weight |
| **OTP/account trust** | Leverages existing platform account verification. Social commerce trust builds on top of platform trust |
| **Transaction-based trust** | Completed exchanges with positive outcomes increase trust score |

### 19.2 Moderation Pipeline

```
Listing submitted
  → Auto-review engine
     ├── Content analysis (prohibited items, offensive language)
     ├── Image analysis (fake images, prohibited content)
     ├── Price anomaly detection (suspiciously low/high)
     ├── Duplicate detection (content hash against existing listings)
     └── Seller trust check (new account? low trust? high report count?)
  → Score: auto_approve / needs_review / auto_reject
     ├── auto_approve (score > 0.8, seller trusted) → Active
     ├── needs_review (score 0.4-0.8 or flagged) → Pending human review
     └── auto_reject (score < 0.4 or prohibited content) → Removed + seller notified
```

### 19.3 Anti-Scam Mechanisms

| Mechanism | Details |
|-----------|---------|
| **Suspicious price detection** | Items priced significantly below market average are flagged |
| **Suspicious behavior detection** | Rapid listing creation, copy-paste descriptions, identical images across listings |
| **Duplicate detection** | Content-hash and image-hash based detection of duplicate/near-duplicate listings |
| **Report/block mechanisms** | Users can report listings and block sellers. Reports feed moderation pipeline |
| **Abuse throttling** | Rate limits on listing creation, message sending, and contact requests |
| **Escalation flow** | Auto → Manual review → Admin escalation for serious violations |
| **Safe communication through Orbit** | All conversations go through Orbit. No blind external contact leakage (phone/email) by default |
| **Anomaly detection** | Statistical analysis of listing patterns, pricing distributions, and behavioral signals |

### 19.4 Why Stronger Than Traditional Classifieds

1. **Trust is built-in**: Every user has a computed trust score, not just a review count
2. **Moderation is proactive**: AI-assisted moderation catches issues before listings go live
3. **Communication is safe**: Orbit prevents contact information leakage
4. **Trust affects everything**: Low trust → lower ranking → fewer matches → harder to reach buyers
5. **AI moderation assists**: Future AI moderation can detect scam patterns, coordinate with reporting signals

---

## 20. Orbit / Wallet / Dashboard / Search Integration Points

### 20.1 Orbit Integration

| Aspect | System A (Intelligence) | System B (Commerce) |
|--------|------------------------|---------------------|
| **Thread types** | None — intelligence uses system notification channel, not conversational threads | `local_exchange_chat` (seller/buyer conversation) |
| **Entity link** | None (intelligence items are not Orbit entities) | `listing` (linked to `CanonicalLocalListing`) |
| **Use cases** | System-level notifications for critical alerts requiring user acknowledgment (delivered via `notification-engine.ts`, not Orbit threads) | Safe seller/buyer chat; listing inquiries; exchange coordination |
| **Message type** | System-generated notifications (not conversational) | User-to-user, transactional |
| **Assistant messaging** | N/A — intelligence surfaces through Dashboard/Ticker/Notifications, not Orbit | Optional AI assistant for listing suggestions (future) |
| **Strict rule** | Intelligence MUST NOT generate Orbit conversational threads; all intelligence delivery uses notifications, ticker, or Dashboard cards | Commerce conversations MUST go through Orbit, never external |

### 20.2 Wallet Integration

| Aspect | System A (Intelligence) | System B (Commerce) |
|--------|------------------------|---------------------|
| **Allowed** | Display finance/forex information using user's currency context | Future: conceptual escrow for local exchanges (architecture only) |
| **Not allowed** | Creating payments, owning transaction state | Owning payment flows, creating ledger entries |
| **Currency context** | Reads from Wallet's currency setting for display | Uses Wallet currency for listing prices |
| **Future concept** | N/A | Payment-assisted local exchange (buyer pays through platform → seller receives on pickup confirmation) |
| **Strict rule** | Intelligence layer MUST NOT interact with Wallet ledger | Social commerce MUST NOT own `WalletWiring.paymentFlow` or `billingType` |

### 20.3 Dashboard Integration

| Aspect | System A (Intelligence) | System B (Commerce) |
|--------|------------------------|---------------------|
| **Surfaces** | Ticker module, weather card, finance summary, local alerts | Local opportunities card, local exchange summary, active listings count |
| **Module type** | Intelligence modules (governed by `rankDashboardModules` in future) | Commerce summary module |
| **Priority** | Below core vertical modules (orders, bookings, rides), above generic info | Below intelligence modules, above empty-state filler |
| **Quick actions** | "See all alerts" → intelligence feed view | "Browse local" → local commerce feed |
| **Strict rule** | Intelligence cards MUST NOT replace or displace core booking/order/ride cards | Commerce cards MUST NOT appear above active orders or bookings |

### 20.4 Search Integration

| Aspect | System A (Intelligence) | System B (Commerce) |
|--------|------------------------|---------------------|
| **Searchable** | Intelligence items MAY appear in search results, clearly typed as "Info" | Local listings MAY appear in search results, clearly typed as "Local" |
| **Separation** | Search results MUST distinguish between intelligence items and transactional results | Search results MUST distinguish between local C2C listings and professional marketplace items |
| **Filtering** | Users MUST be able to exclude intelligence items from search | Users MUST be able to exclude local C2C items from search |
| **Ranking** | Intelligence items ranked by relevance and freshness, never by commercial interest | Local listings ranked by match score, never polluting professional results |
| **No contamination** | Informational feed MUST NOT mix with transactional inventory in unfiltered results | C2C listings MUST NOT appear as professional merchant listings |

---

## 21. Event Model and Platform Bus Alignment

### 21.1 Event Namespaces

Both systems use their own namespaces to avoid collision with existing platform bus events defined in `platform-bus.ts`:

**System A**: `global_intelligence.*` (dot-notation for internal domain events via `platformBus`). Note: the canonical `APP_EVENTS` constant in `src/lib/platform/events.ts` uses **colon-notation** (e.g., `"wallet:payment_success"`, `"orbit:message_sent"`). Domain events on `platformBus` use dot-notation (e.g., `wallet.payment.success`), while `APP_EVENTS` colon-notation serves as the canonical bridge layer. New intelligence events will follow the same dual-mode pattern: dot-notation on the bus, colon-notation constants in `APP_EVENTS` when registered.

**System B**: `local_social_commerce.*` (dot-notation on the bus; colon-notation constants when registered in `APP_EVENTS`)

### 21.2 System A Event Families

| Event | Emitter | Payload Concept | Consumer |
|-------|---------|----------------|----------|
| `global_intelligence.feed.refreshed` | Feed ingestion engine | `{ country, city, itemCount, sourceId }` | Ticker composer, dashboard |
| `global_intelligence.item.ranked` | Ranking engine | `{ itemId, priorityScore, relevanceScore }` | Ticker, notification decision engine |
| `global_intelligence.item.expired` | Freshness engine | `{ itemId, reason }` | Ticker (remove), cache invalidation |
| `global_intelligence.notification.considered` | AI attention engine | `{ itemId, userId, score, decision }` | Analytics, learning loop |
| `global_intelligence.notification.sent` | Notification adapter | `{ itemId, userId, channel }` | Engagement tracking |
| `global_intelligence.notification.dismissed` | User action | `{ itemId, userId }` | Learning loop, fatigue model |
| `global_intelligence.ticker.composed` | Ticker engine | `{ country, city, itemCount }` | Dashboard |
| `global_intelligence.religious.prayer_time` | Religious timing engine | `{ userId, prayer, time }` | Notification adapter |

### 21.3 System B Event Families

| Event | Emitter | Payload Concept | Consumer |
|-------|---------|----------------|----------|
| `local_social_commerce.listing.created` | Listing service | `{ listingId, sellerId, category, city }` | Moderation engine, match engine |
| `local_social_commerce.listing.approved` | Moderation engine | `{ listingId }` | Match engine, search index |
| `local_social_commerce.listing.flagged` | Moderation engine | `{ listingId, flags }` | Admin review queue |
| `local_social_commerce.listing.expired` | Expiration service | `{ listingId }` | Match engine, search cleanup |
| `local_social_commerce.intent.detected` | Intent detection engine | `{ intentId, userId, type }` | Match engine |
| `local_social_commerce.match.produced` | Match engine | `{ matchId, listingId, buyerId, score }` | Notification adapter, suggestion engine |
| `local_social_commerce.trust.updated` | Trust engine | `{ userId, newScore, reason }` | Ranking engine, listing quality |
| `local_social_commerce.moderation.action` | Moderation engine | `{ entityType, entityId, action }` | Listing service, trust engine |
| `local_social_commerce.conversation.opened` | Orbit adapter | `{ listingId, buyerId, sellerId }` | Analytics, trust engine |
| `local_social_commerce.exchange.completed` | Exchange service | `{ listingId, buyerId, sellerId }` | Trust engine, analytics |

### 21.4 Collision-Avoidance Rules

| Rule | Details |
|------|---------|
| **No existing namespace collision** | `global_intelligence.*` and `local_social_commerce.*` do not collide with existing namespaces: `wallet.*`, `orbit.*`, `marketplace.*`, `booking.*`, `listing.*`, `commerce:*`, `storefront:*`, `dispatch:*`, etc. |
| **Correlation IDs required** | All events MUST carry `correlationId` using `generateCorrelationId()` from `platform-bus.ts` |
| **No cross-domain pollution** | System A events MUST NOT trigger System B listeners, and vice versa, except through governed bridge adapters |
| **No event loops** | `__bridged` flag MUST be set on any event that crosses system boundaries to prevent re-emission loops (following existing `StorefrontOrderPayload.__bridged` pattern) |
| **Clear ownership** | Every event type has exactly one emitter. No event is emitted by both systems |
| **No provider-specific events** | Raw provider events (e.g., "reuters.feed.updated") MUST NOT leak to the bus. Only canonical events are emitted |
| **Dual-mode notation** | Domain events on `platformBus` use dot-notation (e.g., `wallet.payment.success`); canonical constants in `APP_EVENTS` use colon-notation (e.g., `"wallet:payment_success"`). Both namespaces follow this same dual-mode convention. |
| **Fan-out limits respected** | Total listener count per event type MUST stay within `MAX_LISTENERS_PER_EVENT` (50) and global listeners within `MAX_GLOBAL_LISTENERS` (30) as defined in `platform-bus.ts` |

---

## 22. Scheduling, Automation, and 24/7 Operation

### 22.1 Scheduled Operations

| Operation | Cadence | Mode |
|-----------|---------|------|
| **Finance/forex refresh** | 1-5 min (market hours), 30 min (off-hours) | Incremental |
| **Weather refresh** | 15 min (normal), real-time (severe) | Incremental |
| **News refresh** | 5-15 min | Incremental |
| **Traffic refresh** | 5 min | Full replace |
| **Event/calendar refresh** | 1-6 hours | Full replace |
| **Prayer time calculation** | Daily per location | Full replace |
| **Ticker composition** | Every rotation interval (8s) | Incremental |
| **Listing freshness decay** | Hourly | Incremental |
| **Match recomputation** | On listing create/update + hourly sweep | Incremental |
| **Trust score refresh** | On transaction completion + daily decay | Incremental |
| **Translation refresh** | On source content change | Incremental |
| **Stale data cleanup** | Hourly | Full sweep |

### 22.2 Streaming Candidates

Some feeds may transition to streaming (WebSocket/SSE) in the future:
- Finance/forex (real-time market data)
- Severe weather alerts
- Traffic incidents

### 22.3 Convergence Principles

1. **Idempotent operations**: Running the same refresh twice produces identical results
2. **Monotonic freshness**: Feed freshness scores only decrease (decay); they never artificially increase
3. **Convergent ranking**: Repeated ranking passes converge to stable order; no oscillation
4. **Bounded state**: Maximum feed size, maximum listing count, maximum match pool size — all bounded

### 22.4 Automation Guardrails

| Guardrail | Details |
|-----------|---------|
| **Lock/overlap prevention** | Only one instance of each scheduled job runs at a time. Job locking prevents overlap. |
| **Failover** | If a scheduled job fails, retry with exponential backoff (max 3 retries). After 3 failures, alert admin and skip until next cycle. |
| **Circuit-breaker** | If a data source fails >5 times consecutively, circuit-breaker opens. Source is skipped for a cooldown period. System uses cached/fallback data. |
| **Stale data suppression** | Items past `expiresAt` are hard-removed. Items with `freshnessScore` < 0.1 are soft-suppressed (available but not proactively shown). |
| **Anti-storm** | If ingestion produces >1000 items in a single cycle, system caps and alerts. Prevents source misbehavior from flooding the feed. |
| **Anti-loop** | Events emitted by automation jobs MUST carry `__automated: true` flag. Listeners MUST check this flag to prevent cascade loops. |
| **Duplicate run suppression** | If a job completes within its cadence, the next scheduled run is skipped (no double-processing). |

---

## 23. Fail-Safe, Non-Blocking, and Anti-Conflict Guarantees

### 23.1 Hard Guarantees

| Guarantee | Enforcement |
|-----------|-------------|
| System must never block core user flows | All intelligence/commerce rendering is async. Timeout after 2s → show empty state. |
| System must never own core booking/payment/dispatch state | Architectural boundary: no write access to booking/order/payment/driver tables |
| System must degrade gracefully | Every surface has a defined empty state. No error screens from intelligence failures. |
| System must fail safe | Source failure → fallback. Engine failure → hide surface. Never show stale-but-wrong data. |
| System must not crash UI surfaces | All rendering wrapped in error boundaries. Intelligence failure is invisible to user. |
| System must remain optional and modular | Each module can be independently disabled per user or per country |
| Social suggestions must not pollute critical utility banners | Typed separation: commerce items are `CanonicalLocalListing`, utility items are `CanonicalGlobalFeedItem`. Different rendering paths. |
| Religious utilities must remain opt-in | System-level gate: religious module code path requires `preferences.religious_utilities === true` |
| Automated suggestions must remain suppressible | Every suggestion includes dismiss/suppress action. Suppression feeds learning loop. |
| No source schema leakage | All external data goes through canonicalization layer before reaching any consumer |
| No cross-domain state confusion | Each system has its own state, events, and canonical objects. No shared mutable state. |
| No notification spam loops | Cooldown timers, category throttles, daily caps, and fatigue model all enforce limits |
| No runaway automation | Circuit-breakers, anti-storm caps, backoff rules, and job locking prevent unbounded execution |

### 23.2 Anti-Conflict Matrix (10-Way)

| Domain | Intelligence Layer | Local Social Commerce | Conflict Prevention |
|--------|-------------------|----------------------|---------------------|
| **Dashboard** | Projects cards/ticker via governed adapter | Projects opportunity/summary cards | Combined card count capped. Intelligence above commerce. Neither displaces core vertical cards. |
| **Orbit** | System notifications only (no conversations) | Seller/buyer chat threads | Different thread types. Intelligence uses system channel. Commerce uses user-to-user channel. |
| **Wallet** | Read-only currency display | Future escrow concept (no ownership) | Neither system creates payments, transactions, or ledger entries. |
| **Search** | Contributes info-typed results | Contributes listing-typed results | Separately typed, separately filterable. No cross-contamination. |
| **Mobility** | Traffic info display | N/A | Intelligence displays traffic but does not own dispatch, driver, or fare state. |
| **Travel** | Travel advisories, visa info | N/A | Intelligence displays info but does not own booking, flight, hotel, or car rental state. |
| **Marketplace** | N/A | C2C only; distinct from professional marketplace | Local listings use different canonical objects, different events, different categories. |
| **Religious Modules** | Owns religious utility content | Zero interaction | Commerce content NEVER appears on religious surfaces. |
| **Intelligence ↔ Commerce** | Provides context (time, location) | May consume location context | Separate namespaces, separate events, separate canonical objects. No mutual event listeners without `__bridged` flag. |
| **Me** | Preference/control surface for intelligence modules | Preference/control for commerce modules | Same Me pillar, different preference sections. No overlap in preference keys. |

---

## 24. World-Scale Expansion Strategy

### 24.1 Country Onboarding Model

```
Phase 1: Country Profile Created
  ├── Default language set
  ├── Currency configured
  ├── Timezone mapped
  ├── Available modules determined
  └── Compliance flags set

Phase 2: Data Sources Connected
  ├── Finance/forex provider mapped
  ├── Weather provider mapped
  ├── News sources identified
  └── Religious data availability checked

Phase 3: Validation
  ├── Feed quality verified
  ├── Translation quality checked
  ├── Cultural appropriateness reviewed
  └── Compliance verified

Phase 4: Soft Launch
  ├── Available to opted-in users
  ├── Monitoring enabled
  └── Feedback collection active

Phase 5: General Availability
  └── Available to all users in country
```

### 24.2 City Onboarding Model

Cities are onboarded within already-supported countries:
1. City profile created with region mapping
2. City-level data sources connected (local news, events, traffic)
3. Local social commerce enabled (if country supports it)
4. Mosque/religious data loaded (if applicable)
5. City-specific validation and soft launch

### 24.3 Provider Onboarding Model

Each external data provider follows:
1. API evaluation and trust scoring
2. Canonicalization adapter built (provider → `CanonicalGlobalFeedItem`)
3. Redundancy partner identified (minimum 2 per source family)
4. Rate limits and refresh cadence configured
5. Circuit-breaker thresholds set
6. Monitoring and alerting configured

### 24.4 Handling Variable Data Availability

| Scenario | Handling |
|----------|---------|
| Country with all sources available | Full module activation |
| Country with limited sources | Only available modules activated; others hidden |
| Country with no local news sources | News module shows country-level content only |
| City with no traffic data | Traffic module hidden for that city |
| Country with no religious data demand | Religious module not listed in available modules |

### 24.5 Scaling Architecture

The same architecture scales from one city to global coverage:
- Country profiles are additive (adding a country doesn't affect existing ones)
- Provider adapters are reusable across countries (same weather API, different location parameters)
- Localization is language-based, not country-based (one translation serves all countries with that language)
- Ranking models are universal (same algorithms, different local data)

---

## 25. Implementation Phasing

### 25.1 What Is Done Now (This Document)

- Architecture design for both systems
- Canonical model definitions
- Domain boundary specifications
- Event model design
- Automation design
- Anti-conflict design
- Scaling design
- Trust/moderation design
- Privacy/consent design (Addendum B)
- Priority arbitration design (Addendum C)
- Visual governance design (Addendum E)
- 24/7 autonomous operation design (Addendum F)
- Automation governance matrix (Addendum G)

### 25.2 Possible Future Phases

| Phase | Scope | Dependency |
|-------|-------|------------|
| **Phase 1** | Simple ticker + basic country info (weather, forex for user's country) | Country profile registry, 1-2 data providers |
| **Phase 2** | AI notification layer (contextual notifications for intelligence items) | Phase 1 + notification adapter + AI attention engine MVP |
| **Phase 3** | Religious opt-in modules (prayer times, Ramadan calendar, nearby mosques) | Phase 1 + religious data providers + opt-in UI |
| **Phase 4** | Local social commerce basics (listing creation, browsing, Orbit chat) | Listing service, moderation engine MVP, Orbit thread type |
| **Phase 5** | Zero-search predictive matching (intent detection, automatic matching) | Phase 4 + intent engine + match engine |
| **Phase 6** | Advanced trust + moderation + local graph intelligence | Phase 5 + trust engine + anomaly detection + local intent graph |

### 25.3 What MUST NOT Be Done Now

- **No runtime activation** of any intelligence or commerce system
- **No ticker activation** on Dashboard
- **No notification sending** from either system
- **No provider setup** or API key configuration
- **No listing system activation**
- **No map/Radar activation** for intelligence or commerce pins
- **No route changes** to expose new pages
- **No schema changes** in database
- **No event activation** on the platform bus
- **No hidden build** of any component described in this document

---

## 26. Risks and Guardrails

### 26.1 Risk Registry

| # | Risk | Danger | Prevention | Mandatory Guardrail |
|---|------|--------|------------|---------------------|
| 1 | **Spam** | Users flood local listings with low-quality content | Moderation pipeline, quality scoring, rate limits | Auto-reject below quality threshold + rate limit per user per day |
| 2 | **Notification fatigue** | Too many intelligence notifications annoy users | Anti-fatigue model, cooldown, daily caps | Hard daily cap per category (configurable, default 3-5) |
| 3 | **Wrong localization** | Content displayed in wrong language or locale | Language chain validation, no mixed-language output rule | Build-time check: every output path MUST specify language |
| 4 | **Cultural errors** | Content inappropriate for specific cultures/countries | Country profile compliance flags, content review pipeline | Country-specific content gates + human review for sensitive countries |
| 5 | **Religious sensitivity** | Incorrect prayer times, inappropriate religious content | Established calculation libraries, explicit opt-in, separation | Double-validation of prayer time calculations + zero commerce on religious surfaces |
| 6 | **Provider outages** | External data source goes down | Multi-provider strategy, circuit-breaker, cached fallback | Every source family MUST have 2+ providers + 30-min cache |
| 7 | **Stale data** | Expired/outdated information shown to users | Freshness scoring, expiration enforcement, stale suppression | Hard `expiresAt` enforcement: items past expiry are invisible |
| 8 | **Data inconsistency** | Conflicting information from different sources | De-duplication, source trust scoring, source hierarchy | Higher-trust source wins. Conflicting items flagged for review. |
| 9 | **Local commerce fraud** | Scam listings, fake items, price manipulation | Trust profiles, moderation pipeline, anomaly detection | New accounts restricted. Suspicious patterns auto-flagged. |
| 10 | **Over-personalization** | System becomes creepily accurate about user preferences | Sensitivity levels on signals, "why am I seeing this?" transparency | Inferred intents require high confidence. Users can reset personalization. |
| 11 | **Creepy inference** | System makes sensitive inferences (religion, health, finances) | No sensitive assumption rule, explicit opt-in for sensitive modules | Religious module ONLY activates on explicit opt-in. No inference from name/country. |
| 12 | **Trust abuse** | Users game trust scores through fake transactions | Transaction verification, anomaly detection, admin review | Trust score changes require verified events. Rapid score increases trigger review. |
| 13 | **Search/feed contamination** | Intelligence items pollute transactional search, or vice versa | Separate typing, separate filters, separate rendering paths | Every search result MUST carry a type badge. Users MUST be able to filter by type. |
| 14 | **Event collisions** | New event namespaces collide with existing platform bus events | Dedicated namespaces (`global_intelligence.*`, `local_social_commerce.*`) | Namespace validation: no event name may share prefix with existing namespaces. |
| 15 | **Dashboard overload** | Too many cards from intelligence + commerce crowd out core content | Card count caps, priority arbitration, governed module slots | Max combined intelligence+commerce cards = configurable (default 3). Core verticals always priority. |
| 16 | **Runaway automation** | 24/7 engines produce unbounded output or consume unbounded resources | Circuit-breakers, anti-storm caps, job locking, backoff rules | Per-cycle output caps + circuit-breaker after 5 consecutive failures. |

---

## 27. Final Recommendation

### 27.1 Architecture Position

Both systems should be implemented as a **cross-domain intelligence layer** that sits above existing verticals but below the 5 pillars. They must NEVER become verticals themselves, and NEVER own core business logic of any existing domain.

### 27.2 Automation Philosophy

Design for **autonomous operation** from day one, but implement with **progressive activation**: start with manual triggers, then scheduled cadence, then fully autonomous. Every autonomous engine must have a circuit-breaker and a human override.

### 27.3 Canonical Model Posture

All external data enters through **canonicalization adapters**. No raw provider data reaches any consumer. Canonical objects (`CanonicalGlobalFeedItem`, `CanonicalLocalListing`, etc.) are the only shapes that flow through the system.

### 27.4 Anti-Conflict Posture

**Hard boundaries are mandatory, not advisory.** The 10-way anti-conflict matrix (Section 23.2) and the utility-vs-commerce separation (Addendum D) define inviolable rules. No exception process — violations require architecture redesign.

### 27.5 Phased Rollout Philosophy

Start with the **simplest valuable surface** (ticker + country info) and expand only after validating that the intelligence layer adds value without disruption. Local social commerce starts only after the intelligence layer is proven stable.

### 27.6 Trust and Moderation Posture

Trust is **built-in from day one**, not bolted on later. Every listing, every user interaction, every match computation includes trust scoring. Moderation is **proactive** (AI-assisted pre-screening) rather than reactive (report-and-review only).

### 27.7 Local Intelligence Posture

Intelligence is **locally relevant first, globally complete second**. A user in Dubai sees Dubai-specific content. Global content fills gaps, never replaces local. The system is worthless if it only shows global news — local relevance is the value proposition.

---

## 28. Final Explicit Statement: No Implementation Performed

**NO IMPLEMENTATION HAS BEEN PERFORMED IN THIS PHASE.**
**NO LIVE RUNTIME BEHAVIOR IS CHANGED.**
**THIS DOCUMENT IS FOR DESIGN VALIDATION ONLY.**
**DO NOT START BUILDING UNTIL THIS PLAN IS APPROVED.**

No code has been written. No existing code, runtime, or schema files have been modified — only this architecture document was added. No database schemas have been altered. No feature flags have been created. No events have been emitted. No routes have been exposed. No provider APIs have been integrated. No notification engines have been activated. No listing systems have been launched. No autonomous engines have been started.

All recommendations require separate implementation tasks with their own code review cycles, each subject to explicit approval before any build begins.

---

# Architecture Hardening Addendum

---

## Addendum A: Canonical Identity and Profile Propagation

### A.1 Single Source of Truth

Every user in Easy-Locs has **one canonical identity** stored in the platform's auth/profile system. Both new systems (Intelligence and Social Commerce) MUST read from this single source. Neither system creates, modifies, or owns user identity.

### A.2 Identity Types

| Identity Type | Description | Source |
|--------------|-------------|--------|
| **Canonical User Identity** | Core user record (id, email, phone, auth state) | Platform auth system |
| **Canonical Owner Identity** | Business/organization identity (if applicable) | Platform org system |
| **Public Identity** | What other users see (display name, avatar) | Governed projection from canonical identity |
| **Private/Internal Identity** | Internal account identifiers, auth tokens | Platform auth (never exposed to surfaces) |
| **Payment Identity** | Wallet-linked identity (payment methods, balance reference) | Wallet system (never exposed to intelligence/commerce) |
| **Social Commerce Identity** | Seller/buyer persona in local exchange | Governed projection from canonical identity |
| **Trust Identity** | Trust score, verification level, reputation | Computed from canonical identity + behavior signals |
| **Dashboard Summary Identity** | What appears on Dashboard profile widgets | Governed projection from canonical identity |
| **Orbit Communication Identity** | Display identity in conversations | Governed projection from canonical identity |

### A.3 One Truth, Multiple Governed Projections

```
Canonical User Identity (single source of truth)
  │
  ├── Public Profile Projection
  │     └── displayName, avatar, city, memberSince
  │
  ├── Social Seller Profile Projection
  │     └── displayName, avatar, activeListings, completedTransactions, trustScore, responseRate
  │
  ├── Buyer Profile Projection
  │     └── displayName, purchaseCount, trustScore
  │
  ├── Trust Profile Projection
  │     └── overallTrustScore, verificationLevel, badges
  │
  ├── Notification Display Projection
  │     └── displayName (first name or display name), language, timezone
  │
  ├── Orbit Communication Identity Projection
  │     └── displayName, avatar, verificationBadge (governs how users appear in local_exchange_chat threads and any future Orbit surfaces)
  │
  └── Dashboard Summary Projection
        └── displayName, avatar, quickStats
```

### A.4 Anti-Drift Rules

| Rule | Prevents |
|------|----------|
| All projections derive from the SAME canonical identity record | One screen showing "John" while another shows "John's Shop" without governed logic |
| No projection may access raw profile fields directly | Profile truth being split across multiple ad-hoc database queries |
| Trust/reputation attaches to canonical user ID, not to any projection | Trust score being computed from the wrong identity layer |
| Social commerce `displayName` comes from the public profile projection, NOT from listing metadata | Commerce identity leaking internal account identifiers |
| Wallet/payment identity fields are NEVER included in social commerce or public projections | Payment identity being confused with social/public listing identity |
| All name/display changes propagate through the projection layer within one refresh cycle | Stale names appearing on one surface while updated on another |

### A.5 Hard Rule

**No UI or feature may read raw profile fields ad hoc.** Future implementation MUST use governed projection selectors/adapters that derive display values from the canonical identity through a single, auditable code path.

---

## Addendum B: Privacy, Consent, and Sensitive Signal Boundaries

### B.1 Why This Is Mandatory

This architecture includes location intelligence, personalization, inferred needs, religious modules, nearby mosques, proactive matching, behavioral scoring, and notification timing. Each of these touches user privacy. Strict boundaries are non-negotiable.

### B.2 Privacy Design Rules

| Rule | Details |
|------|---------|
| **User consent boundaries** | Every feature that uses personal data MUST have an explicit consent gate |
| **Geolocation sensitivity** | Precise coordinates are used for computation only; displayed locations are coarsened to city/district level |
| **City/region precision** | Suggestions show "in your area" or "near [district]", never exact coordinates |
| **Inferred-interest sensitivity** | Inferred intents require confidence > 0.7 to produce suggestions; below that, they remain silent |
| **Religious preference sensitivity** | Religious modules activate ONLY on explicit opt-in. No inference from name, country, or any other signal |
| **Opt-in/opt-out controls** | Every module, every notification category, and every suggestion type has an on/off toggle |
| **Notification permissions** | Follows OS-level notification permissions. No notification without platform permission + module permission |
| **Silent mode / DND** | System respects device DND. In-app silent mode suppresses all non-critical intelligence |
| **"Why am I seeing this?"** | Every suggestion card includes a transparency action showing the signals that produced it |
| **Personalization reset** | User can reset all personalization signals, returning to default state |
| **Personalization downgrade** | User can set personalization level: Full → Moderate → Minimal → Off |
| **Data minimization** | System retains only signals necessary for current operation; expired signals are purged |
| **Retention boundaries** | Search history: 90 days. Intent signals: 30 days. Engagement metrics: 180 days (all conceptual) |
| **No creepy inference** | System MUST NOT infer health conditions, financial status, relationship status, or other sensitive attributes |
| **No sensitive assumptions** | System MUST NOT assume religion, ethnicity, gender, or age from any behavioral signal |

### B.3 Consent Model (4 Layers)

| Layer | Scope | Examples |
|-------|-------|---------|
| **Global settings** | App-wide privacy level | Personalization level (Full/Moderate/Minimal/Off), Location sharing (On/Off) |
| **Per-module settings** | Individual module controls | Weather notifications (On/Off), Finance ticker (On/Off), Religious module (On/Off), Local commerce suggestions (On/Off) |
| **Per-channel settings** | Notification delivery preferences | Push notifications (On/Off per category), In-app notifications (On/Off), Ticker inclusion (On/Off per topic) |
| **Per-country/context overrides** | Country-specific sensitivity | Some countries may require stricter consent for location data; some may restrict religious module availability |

### B.4 Granular Control Matrix

Users MUST be able to independently control:
- Ticker topics (finance, weather, news, traffic, events)
- Notification categories (critical alerts, contextual updates, predictive suggestions)
- Local commerce suggestions (listing matches, opportunity cards)
- Religious utilities (prayer times, adhan, calendar, mosques)
- Finance/news/traffic modules (each independently toggleable)

### B.5 Data Deletion Rights (Right to Be Forgotten)

Users MUST be able to request full deletion of their personal data. This is a legal requirement in multiple jurisdictions (GDPR Article 17, CCPA, LGPD, POPIA, and equivalents). The architecture MUST support on-demand, user-triggered deletion with propagation across all layers.

**Deletion Scope:**

| Layer | Data Deleted | Anonymization Alternative |
|-------|-------------|--------------------------|
| **Intelligence layer** | Personalization signals, inferred intents, engagement metrics, attention history, search/browsing behavior used for ranking | Where deletion would break aggregate statistics, data is anonymized (user ID replaced with irreversible hash) instead of hard-deleted |
| **Social commerce** | Listings (set to `removed`), intent signals, match history, trust/reputation scores, transaction history | Completed transaction records may be anonymized (seller/buyer IDs replaced) rather than deleted to preserve counter-party records |
| **Notifications** | Notification history, delivery logs, preference snapshots | Delivery logs older than retention boundary (B.2) are already purged; on-demand deletion removes all remaining |
| **Orbit conversations** | Commerce thread content where user is a participant | Messages are redacted (replaced with "[deleted]") rather than removed, to preserve thread coherence for the other party. User identity is disassociated. |
| **Canonical identity** | All governed projections (A.3) are invalidated and purged. Canonical user record follows platform-level account deletion flow. | N/A — full deletion, not anonymization |
| **Logs** | Application-level logs containing user-identifiable data are purged or anonymized within 30 days of deletion request | Infrastructure/security logs required for legal compliance may be retained with user ID anonymized |

**Propagation Rules:**

1. Deletion requests propagate through a **deletion coordinator** (future: `src/lib/platform/deletion-coordinator.ts`) that notifies every subsystem holding user data.
2. Each subsystem acknowledges deletion completion. The coordinator tracks acknowledgments and retries failures.
3. Maximum propagation time: **72 hours** from request to full completion across all layers.
4. Deletion is irreversible. A confirmation gate (Me pillar) requires the user to confirm before initiating.

**Retention Override:**

| Override | Reason | Handling |
|----------|--------|---------|
| Legal hold | Active legal investigation or regulatory requirement | Deletion is suspended for the held data subset only. User is notified that some data is retained under legal obligation. |
| Financial records | Tax/accounting requirements in certain jurisdictions | Transaction amounts and dates may be retained (anonymized) per local tax law retention periods. |
| Safety/abuse records | Active moderation case or confirmed abuse finding | Abuse-related data is retained for platform safety. User is notified. |

**Per-Country Compliance:**

| Region | Key Requirements |
|--------|-----------------|
| **EU/EEA** | GDPR Article 17: Right to erasure. 30-day response deadline. Must confirm deletion to user. |
| **USA (California)** | CCPA/CPRA: Right to delete. Must provide two methods for request submission. |
| **Brazil** | LGPD: Right to deletion of unnecessary data. Must respond within 15 days. |
| **South Africa** | POPIA: Right to request deletion of personal information. |
| **MENA** | Varies by country. UAE PDPL, Saudi PDPL — deletion rights exist with sector-specific exceptions. `complianceFlags` per country (Section 12.4) governs specific handling. |
| **Other jurisdictions** | Default to GDPR-equivalent handling (most restrictive) unless `complianceFlags` specifies otherwise. |

**Hard Rule**: No subsystem may retain identifiable user data after a deletion request has been fully propagated, except under explicit legal override with user notification.

---

## Addendum C: Priority Arbitration and Channel Allocation Model

### C.1 Why This Is Needed

With 14+ signal types competing for user attention across multiple delivery channels, a formal arbitration model prevents every signal from becoming "high priority" and ensures the system remains useful rather than noisy.

### C.2 Priority Tiers

| Tier | Name | Criteria | Examples | Behavior |
|------|------|----------|----------|----------|
| P0 | **Critical** | Immediate safety/urgency | Severe weather, emergency alert, safety warning | Push immediately, bypass fatigue, bypass DND for safety |
| P1 | **Important** | Time-sensitive, significant impact | Breaking news, significant forex move, traffic incident on commute | Push if tolerance allows, otherwise in-app highlight |
| P2 | **Contextual** | Relevant to current context | Local event today, prayer time approaching, nearby listing match | In-app card/ticker, push only if high relevance + user online |
| P3 | **Passive** | Useful but not urgent | General news, market summary, new listing in area | Badge/silent update, available on pull |
| P4 | **Suppressed** | Below relevance threshold or fatigued | Low-relevance info, recently dismissed topics | Not shown; available only in dedicated feeds on explicit browse |

### C.3 Channel Allocation Matrix

| Signal Type | Live Ticker | Banner | Dashboard Card | Radar/Map | Orbit Message | Push Notification | In-App Only | Never Auto-Surface |
|-------------|------------|--------|---------------|-----------|---------------|-------------------|-------------|-------------------|
| Severe weather | ✅ | ✅ | ✅ | ❌ | Only if critical | ✅ (P0) | ✅ | ❌ |
| Emergency alert | ✅ | ✅ | ✅ | ❌ | If ack needed | ✅ (P0) | ✅ | ❌ |
| Breaking news | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ (P1) if enabled | ✅ | ❌ |
| Finance/forex | ✅ | ❌ | ✅ | ❌ | ❌ | Only significant moves | ✅ | ❌ |
| Weather normal | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Traffic update | ✅ | ❌ | ❌ | ✅ (map layer) | ❌ | Only if commute affected | ✅ | ❌ |
| Local event | ✅ | ❌ | ✅ | ✅ (event pin) | ❌ | If high relevance | ✅ | ❌ |
| Religious reminder | ✅ (if opted) | ❌ | ✅ (if opted) | ✅ (mosque) | ❌ | ✅ (if opted) | ✅ | ❌ |
| Local commerce match | ❌ | ❌ | ✅ | ✅ (listing pin) | ❌ | If high confidence | ✅ | ❌ |
| Commerce suggestion | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | Push notifications |
| Trust/safety warning | ❌ | ✅ | ✅ | ❌ | ✅ if relevant | ✅ (P1) | ✅ | ❌ |
| Personalized rec. | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | Push/banner |
| Dashboard summary | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | Push/ticker |
| Passive in-app | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | All active channels |

### C.4 Scoring Model (8 Factors)

| Factor | Weight | Description |
|--------|--------|-------------|
| **Channel eligibility** | Gate | Must be eligible for the target channel (matrix above) |
| **Priority score** | 0.25 | Base priority from P0-P4 tier |
| **Freshness score** | 0.20 | How new/relevant is this right now |
| **Trust score** | 0.10 | Source reliability (System A) or participant trust (System B) |
| **Fatigue weight** | 0.15 | User's current fatigue level (high fatigue → score penalty) |
| **User tolerance** | 0.10 | User's configured tolerance for this type of signal |
| **Locality weight** | 0.10 | How geographically relevant (city > country > global) |
| **Commercial-vs-utility balance** | 0.10 | Utility items get slight preference over commercial items in shared surfaces |

### C.5 Suppression and Cooldown

| Rule | Details |
|------|---------|
| **Repeated-item suppression** | Same content (by hash) not shown twice within 4 hours |
| **Category cooldown** | After showing a finance item, 5-min cooldown before next finance item in ticker |
| **Cross-system cooldown** | After an intelligence notification, 10-min cooldown before a commerce suggestion |
| **Daily cap per type** | Configurable per category (default: 3 finance, 2 weather, 5 news, 2 commerce, 1 religious) |
| **Fatigue escalation** | If user dismisses 3+ items in 1 hour, reduce all non-critical delivery for 2 hours |

### C.6 Hard Requirement

The system MUST prevent every signal from becoming "high priority." P0 (Critical) is reserved for genuine safety/urgency. At most 2 items per day should be P0. If more than 5 items per day are classified P0, the priority model is miscalibrated and must be tuned.

---

## Addendum D: Strict Separation — Information Utility vs Commercial Opportunity

### D.1 Definitions

- **Information Utility**: Content whose primary purpose is to inform, alert, or provide practical value (weather, news, finance, traffic, events, religious timing, emergency alerts)
- **Commercial Opportunity**: Content whose primary purpose is to facilitate a transaction or exchange (local listings, match suggestions, seller/buyer interactions)

### D.2 Anti-Contamination Policy

| Rule | Enforcement |
|------|-------------|
| A local listing MUST NEVER appear in a critical utility alert channel | Hard type check: only `CanonicalGlobalFeedItem` with `type ∈ critical_types` in alert channels |
| Religious utility surfaces MUST NEVER be polluted by commerce content | Rendering path for religious module excludes all `CanonicalLocalListing` and `CanonicalLocalMatch` objects |
| Ticker rotation MUST NEVER degrade into a classifieds stream | Ticker only accepts `CanonicalGlobalFeedItem`. No `CanonicalLocalListing` adapter exists for ticker. |
| Social commerce suggestions MUST pass stricter relevance thresholds than utility items when shown outside commerce surfaces | Commerce items on Dashboard require `relevanceScore > 0.7`; utility items require only `> 0.4` |
| Utility news/events and commerce opportunities MUST remain separately typed, separately ranked, and separately suppressible | Distinct canonical types, distinct ranking pipelines, distinct suppress controls in Me preferences |

### D.3 Allowed Bridges

| Bridge | Conditions |
|--------|-----------|
| Commerce listing appearing on Dashboard | Only in dedicated "Local Opportunities" card module, clearly badged as "Local Exchange" |
| Commerce listing appearing in Search | Only with explicit "Local" type filter, visually distinct from professional marketplace results |
| Intelligence item linking to commerce | Conceptually, a "weekend markets" event could reference that local commerce is available — but the event itself remains informational |

### D.4 Forbidden Bridges

| Bridge | Reason |
|--------|--------|
| Commerce listing in ticker | Ticker is utility-only. Commerce listings would degrade trust in ticker as information source. |
| Commerce listing as push notification without explicit user opt-in for commerce notifications | Unsolicited commerce push is spam behavior. |
| Commerce listing on religious surface | Religious module is a sacred utility space. Commerce pollutes its purpose. |
| Intelligence item with hidden commercial intent | "Sponsored" intelligence items (paid placement in news/weather feed) are prohibited. Information utility must remain unbiased. |
| Commerce suggestion that looks like a utility alert | Commerce cards MUST be visually distinct (different card type, different badge) from utility alerts. |

---

## Addendum E: Presentation Governance / Visual Surface Contracts

### E.1 Purpose

Define how both future systems appear across the app without degrading the premium Navy (`hsl(220 40% 18%)`) / Gold (`hsl(38 65% 56%)`) visual quality.

### E.2 Surface Contracts

| Surface | Max Lines | Max Chars | Badge | Touch Target | Card Type |
|---------|----------|-----------|-------|-------------|-----------|
| **Banner** (critical alert) | 2 | 120 | Priority icon + "Alert" | 48px min height | `AlertBanner` |
| **Ticker** (rotating info) | 1 | 80 | Source icon + type icon | Full ticker bar tap | `TickerItem` |
| **Local Opportunity Card** | 3 title + 2 description | 200 total | "Local" badge + category icon | 48px min CTA | `LocalOpportunityCard` |
| **Dashboard Module** | Per module spec | Per module spec | Module icon | 48px action buttons | `DashboardModule` |
| **Notification Copy** | 2 title + 3 body | 250 total | Category icon | Full notification tap | `NotificationCard` |
| **Social Listing Card** | 2 title + 3 description | 250 total | "C2C" badge + condition badge | 48px CTA + image tap | `ListingCard` |
| **Suggestion Card** | 2 title + 2 description | 180 total | "Suggested" badge | 48px action | `SuggestionCard` |
| **Radar/Map Bubble** | 1 title + 1 subtitle | 60 total | Pin type icon | Pin tap area ≥ 44px | `MapBubble` |
| **Religious Utility Card** | 2 title + 2 body | 150 total | Religious icon (neutral) | 48px action | `ReligiousUtilityCard` |

### E.3 Visual Rules

| Rule | Details |
|------|---------|
| **Spacing** | Minimum 8px between cards; 16px section gaps |
| **Text length** | All text fields respect contract max chars. Truncated with ellipsis. |
| **Line clamp** | Title: max 2 lines. Description: max 3 lines. Enforced via CSS line-clamp. |
| **Overflow** | No text overflow. No horizontal scroll. Truncation is mandatory. |
| **Badges** | Type badges (Alert, Local, C2C, Suggested) use standardized badge components with design tokens |
| **CTA placement** | Primary CTA right-aligned or bottom-aligned. Never inline with text. |
| **Touch targets** | Minimum 44px × 44px for all interactive elements (Apple HIG compliance) |
| **Icon alignment** | Icons left-aligned with text. Consistent 24px icon size. |
| **Hierarchy** | Critical > Important > Contextual > Passive reflected in visual weight (font size, color, badge) |
| **Multilingual resilience** | Cards MUST handle text expansion (German ~30% longer than English) without breaking layout |
| **Mobile-first** | All contracts designed for 320px minimum viewport. Desktop is expansion, not primary. |
| **Safe-area** | Respect device safe areas (notch, home indicator). No content under system bars. |
| **No noisy overload** | Maximum 3 intelligence/commerce items visible simultaneously in any viewport |
| **Visual consistency** | All cards use Navy/Gold design tokens. No custom colors per module. |

### E.4 Implementation Requirements (Future)

Future implementation MUST use:
- **Presentation adapters** — Components that accept canonical objects and render governed card types
- **Design tokens** — Navy/Gold color system, spacing scale, typography scale (existing tokens: Gold `hsl(38 65% 56%)`, Navy `hsl(220 40% 18%)`)
- **Card contracts** — Strict props/shape definitions matching the surface contracts above
- **Visual guardrails** — Automated checks that card rendering matches contract specifications
- **Screenshot diff** — Surface compliance review as part of PR review for any new intelligence/commerce surface
- **Anti-regression checks** — Visual regression tests for all governed surfaces

### E.5 Hard Rule

**No new intelligence or social commerce surface may be added later without a governed visual contract.** Every new card type, badge, or surface MUST be reviewed against the presentation governance rules before implementation.

---

## Addendum F: Strict 24/7 Autonomous Operation Model

### F.1 Purpose

Extends Section 22 with explicit design for future always-on autonomous engine behavior under strict control.

### F.2 Autonomous Operations Catalog

| Operation | Mode | Control Mechanism |
|-----------|------|-------------------|
| **Automatic ingestion** | Scheduled + event-triggered | Per-source cadence, circuit-breaker, anti-storm cap |
| **Automatic freshness refresh** | Time-decay function | Monotonic decay, no artificial refresh |
| **Automatic language update generation** | On source content change | Translation cache invalidation, quality gate |
| **Automatic ranking** | On ingestion + periodic sweep | Convergent algorithm, no oscillation, bounded iterations |
| **Automatic notification decisioning** | On item ranked + user context change | Fatigue model, cooldown, daily cap, tolerance check |
| **Automatic matching** | On listing create/update + hourly sweep | Confidence threshold, trust gate, quality gate |
| **Automatic trust scoring** | On transaction event + daily decay | Monotonic update, anomaly detection on rapid changes |
| **Automatic anomaly detection** | On listing create + periodic sweep | Statistical model, auto-flag + human escalation |
| **Automatic moderation assistance** | On listing submit | Quality scoring, auto-approve/flag/reject pipeline |
| **Automatic suppression/cooldown** | Continuous | Per-user fatigue tracking, category throttle |
| **Automatic repeated-run convergence** | Every scheduled cycle | Idempotent operations, bounded state, convergent ranking |

### F.3 Scheduler Hierarchy

```
Level 1: Global Scheduler
  ├── Controls all system-wide refresh cadences
  ├── Enforces lock/overlap prevention
  └── Manages circuit-breaker state

Level 2: Per-Country Scheduler
  ├── Controls country-specific source refresh
  ├── Respects country timezone for optimal cadence
  └── Manages country-specific provider pool

Level 3: Per-City Scheduler (where applicable)
  ├── Controls city-specific source refresh
  ├── Manages city-level data availability
  └── Activates only when city has local sources

Level 4: Per-Signal Scheduler
  ├── Controls individual signal type cadence
  ├── Finance: 1-5 min | Weather: 15 min | News: 5-15 min
  └── Adjusts based on market hours, weather severity, etc.
```

### F.4 Strict Control Mechanisms

| Mechanism | Details |
|-----------|---------|
| **Lock/overlap prevention** | Distributed lock per job type. Only one instance runs. |
| **Cooldown windows** | After job completion, minimum wait before re-execution (prevents tight loops) |
| **Anti-storm rules** | If output items > threshold per cycle, cap output and alert |
| **Anti-loop rules** | Events from automated jobs carry `__automated: true`. Listeners check flag. |
| **Duplicate run suppression** | Content-hash comparison: if output matches previous run, skip emission |
| **Backoff rules** | On failure: 1st retry at 30s, 2nd at 2min, 3rd at 10min. After 3: skip cycle. |
| **Failover strategy** | Primary source fails → secondary source activates automatically |
| **Circuit-breaker** | 5 consecutive failures → circuit opens → 15min cooldown → half-open test → close or re-open |
| **Stale data expiry** | Hard TTL per item type. Finance: 10min. Weather: 1hr. News: 6hr. Events: 48hr. |
| **Ranking rollback** | If ranking pass produces >50% score changes, flag as anomalous and hold previous ranking |
| **Notification auto-suppression** | If user fatigue score > 0.8, suppress all non-P0 notifications for 2 hours |
| **Commerce suggestion auto-suppression** | If trust confidence < 0.5 or match confidence < 0.6, suppress suggestion |

### F.5 How Engines Remain Controlled

1. **Non-blocking**: All engines run asynchronously, never blocking UI or API responses
2. **Non-flooding**: Per-cycle output caps prevent any engine from producing unbounded content
3. **Non-fighting**: Engines operate on separate data domains. No engine modifies another engine's state.
4. **Convergent**: Repeated runs produce stable results. Ranking converges, not oscillates.

### F.6 Central Engine Orchestrator

All 15 engines (Addendum G) are coordinated through a single **Central Engine Orchestrator** — the global scheduling and execution authority for both System A and System B autonomous operations.

**Responsibilities:**

| Responsibility | Details |
|----------------|---------|
| **Global scheduling authority** | The orchestrator owns the master schedule. No engine self-schedules. Every engine's cadence (Section 22.1) is registered with and dispatched by the orchestrator. |
| **Inter-engine coordination** | Engines declare their upstream dependencies (e.g., Priority Arbitration depends on Global Feed Ingestion output). The orchestrator ensures a downstream engine does not execute until its upstream dependency's current cycle is complete or timed out. |
| **Dependency graph** | Explicit DAG of engine dependencies using canonical G.1 names: Global Feed Ingestion → Source Trust Evaluation → Priority Arbitration → Ticker Composition → Notification Decision. Local Match Engine → Trust/Reputation → Notification Decision. Intent Detection → Local Match Engine. Local Listing Quality → Local Match Engine. Moderation/Anomaly runs independently (no downstream dependency). Anti-Spam/Fatigue feeds into Notification Decision. |
| **Backpressure handling** | If an upstream engine (e.g., Global Feed Ingestion) produces output exceeding its per-cycle cap (>1000 items), the orchestrator signals downstream engines to enter **throttled mode**: process at reduced batch size (50% of normal) until the backlog clears. |
| **Throttling** | The orchestrator enforces a global concurrency limit: at most 4 engines execute simultaneously. If all 4 slots are occupied, remaining engines queue with priority ordering (Tier 1 engines first: Global Feed Ingestion, Moderation/Anomaly, Notification Decision). |
| **Execution priority control** | Each engine has a priority tier using canonical G.1 names: **Tier 1 (Critical)** — Global Feed Ingestion (#1), Moderation/Anomaly (#12), Notification Decision (#6). **Tier 2 (High)** — Source Trust Evaluation (#2), Priority Arbitration (#4), Local Match Engine (#10), Trust/Reputation (#11). **Tier 3 (Normal)** — AI Attention Engine (#5), Ticker Composition (#7), Localization/Translation (#3), Local Listing Quality (#8), Intent Detection (#9), Anti-Spam/Fatigue (#15). **Tier 4 (Background)** — Religious Utility Timing (#13), Nearby Mosque Relevance (#14). Higher-tier engines preempt lower-tier engines for execution slots. |
| **Failure cascade prevention** | If an engine fails 3 consecutive cycles, the orchestrator: (1) marks the engine as **degraded**, (2) emits `system.engine.degraded` event, (3) signals all downstream engines to use their fail-safe (cached output), (4) alerts the operations team (see F.7). The degraded engine retries with exponential backoff (F.4). Downstream engines never stall waiting for a permanently failed upstream. |
| **Health tracking** | The orchestrator maintains a per-engine health score: last success time, consecutive failure count, average execution duration, output volume. This state is used for throttling decisions and degradation detection. |

**What the orchestrator must NEVER do:**
- Own any engine's business logic or output
- Modify canonical objects (feed items, listings, matches)
- Emit domain events on behalf of engines
- Override an engine's fail-safe behavior

**Orchestrator location**: Future implementation in `src/lib/intelligence/engine-orchestrator.ts`, sibling to `intelligence-orchestrator.ts`.

### F.7 Alerting and Operations Model

| Term | Definition |
|------|-----------|
| **"Admin"** | Three escalation tiers: (1) **Automated escalation queue** — receives all engine degradation events, applies auto-remediation rules (restart, skip, failover). (2) **Regional moderator** — human reviewer for content moderation escalations, scoped to country/region. (3) **Platform operations** — engineering on-call for infrastructure-level failures (circuit-breaker opens, orchestrator health check failures). |
| **Alerting mechanism** | Engine degradation events (`system.engine.degraded`) route through `notification-engine.ts` to an internal operations channel. Critical alerts (P0 engine failure, orchestrator health check failure) additionally trigger platform-level alerting (future: webhook to operations dashboard). |
| **On-call model** | Automated for Tier 1 (auto-remediation). Human for Tier 2 (moderation queue, async, regional business hours). Engineering for Tier 3 (platform incidents, 24/7 rotation — architecture only, not activated by this document). |

### F.8 `__automated` vs `__bridged` Flag Interaction

| Flag | Purpose | When Set |
|------|---------|----------|
| `__automated: true` | Marks events emitted by scheduled/autonomous engine jobs (not user-initiated). Listeners check this flag to prevent cascade loops (e.g., an automated ranking pass should not trigger another ranking pass). | Set by the Central Engine Orchestrator on every event emitted during an autonomous engine cycle. |
| `__bridged: true` | Marks events that have crossed a system boundary (System A → System B or vice versa) through a governed bridge adapter. Prevents re-emission loops at the bridge layer. | Set by the bridge adapter when forwarding an event across system boundaries. |
| **Both flags together** | An event can carry BOTH flags simultaneously. Example: an automated matching engine (System B) produces a match that triggers a cross-system notification (System A). The resulting notification event carries `__automated: true` (engine-originated) AND `__bridged: true` (crossed from commerce to intelligence). Listeners MUST check both flags independently — `__automated` prevents engine cascading, `__bridged` prevents bridge re-emission. |

---

## Addendum G: Automation Governance Matrix

### G.1 Engine Matrix

| # | Engine | Purpose | Inputs | Outputs | Refresh Mode | Risk if Noisy | Guardrails | Fail-Safe | Must Never Own | May Influence | Can Notify? | Can Suppress? | Admin Review Required? |
|---|--------|---------|--------|---------|-------------|---------------|------------|-----------|---------------|---------------|-------------|--------------|----------------------|
| 1 | **Global Feed Ingestion** | Fetch and canonicalize external data | Provider APIs | `CanonicalGlobalFeedItem` | Scheduled (per-source cadence) | Stale or wrong data | Circuit-breaker, source trust scoring | Show cached data, hide if all fail | Feed display | Ticker, dashboard | No (feeds only) | Can quarantine low-trust items | On circuit-breaker open |
| 2 | **Source Trust Evaluation** | Score provider reliability | Provider response history, accuracy signals | `sourceTrust` score | On ingestion + daily | Wrong trust calibration | Bounded range (0-1), slow decay | Default to medium trust (0.5) | Provider contracts | Which items display | No | Can downgrade low-trust source items | If trust drops below 0.2 |
| 3 | **Localization/Translation** | Translate feed items to user languages | Source content, target language | Translated text fields | On source change | Wrong translation | Quality gate, human-review for sensitive content | Show original language with disclaimer | User language settings | All displayed text | No | N/A | For sensitive/religious content |
| 4 | **Priority Arbitration** | Assign priority tiers and resolve conflicts | Scored items, channel matrix | Priority assignment, channel allocation | On ranking pass | Everything becomes P0 | P0 cap (max 2/day), tier distribution validation | Default to P2 (contextual) if scoring fails | Priority definitions | All delivery decisions | No (allocates only) | Can downgrade items to P4 | If P0 rate exceeds threshold |
| 5 | **AI Attention Engine** | Decide what matters for each user | User signals, ranked items | Relevance scores, delivery decisions | Per-user, on item arrival | User feels stalked | Sensitivity levels, "why am I seeing this?" | Reduce to generic popular items | User preferences | Notification delivery, card ranking | Indirectly (through notification engine) | Can suppress for fatigued users | No |
| 6 | **Notification Decision** | Decide whether to send notification | Ranked item + user profile + fatigue | Send/suppress decision + channel | On candidate item | Spam | Daily caps, cooldown, fatigue model | Suppress if unsure | Notification infrastructure | Whether user receives a notification | Yes (this is the notifier) | Yes (this is the suppressor) | No |
| 7 | **Ticker Composition** | Assemble rotating ticker content | Ranked feed items for user's location | Ticker item list | Every rotation interval | Stale/irrelevant items | Freshness gate, no commerce, max pool size | Show weather-only fallback | Ticker rendering | Dashboard ticker content | No | Can exclude low-freshness items | No |
| 8 | **Local Listing Quality** | Score listing quality | Listing metadata, images, seller trust | `qualityScore` | On listing submit + periodic | Low-quality listings shown | Auto-reject threshold, moderation pipeline | Quarantine if scoring fails | Listing creation | Match eligibility, display order | No | Can quarantine listings | For edge cases |
| 9 | **Intent Detection** | Identify user needs from behavior | Search history, favorites, browsing | `CanonicalLocalIntent` | On behavior event | Creepy inference | High confidence threshold (0.7), no sensitive inference | Generate no intents if confidence low | User behavior | Match engine input | No | N/A | No |
| 10 | **Local Match Engine** | Match supply with demand | Active listings + active intents | `CanonicalLocalMatch` | On listing change + hourly | Irrelevant suggestions | Score threshold, diversity rules, trust gate | Generate no matches if below threshold | Listing/intent ownership | Suggestion delivery | Indirectly (through notification) | Can exclude low-score matches | No |
| 11 | **Trust/Reputation** | Compute user trust scores | Transaction events, report signals, tenure | `trustScore` updates | On event + daily decay | Wrong trust calibration | Bounded range, anomaly detection on rapid changes | Freeze score if anomalous | User identity | Listing ranking, match priority | No | Can restrict untrusted users | On rapid score changes |
| 12 | **Moderation/Anomaly** | Detect problematic content/behavior | Listing content, user patterns | Moderation actions (approve/flag/reject) | On listing submit + periodic scan | False positives remove legitimate listings | Human review for flags, appeal process | Flag rather than auto-remove if unsure | Content creation | Listing visibility | No | Yes (can quarantine/remove) | Yes (for rejections) |
| 13 | **Religious Utility Timing** | Calculate prayer times and reminders | User location, calculation method | Prayer time schedule | Daily per location | Wrong prayer times | Dual-validation, established libraries | Show "times unavailable" if calculation fails | Religious doctrine | Notification timing | Yes (prayer reminders if opted in) | N/A | On calculation library changes |
| 14 | **Nearby Mosque Relevance** | Rank nearby mosques by relevance | User location, mosque database | Ranked mosque list | On location change | Irrelevant/distant results | Distance threshold, data freshness | Show "search for mosques" if no data | Mosque data management | Mosque discovery order | No | Can hide far/closed mosques | No |
| 15 | **Anti-Spam / Fatigue** | Prevent user overwhelm | Engagement signals, dismiss count | Fatigue score, suppression decisions | Continuous | Users miss important items | P0 bypass, minimum delivery rate | Default to moderate suppression | Content creation or ranking | Delivery frequency, notification throttle | No (suppresses only) | Yes (primary suppressor) | No |

---

## Addendum H: Explicit 5-Pillar Integration Discipline

### H.1 Dashboard

| Aspect | Details |
|--------|---------|
| **What new systems may contribute** | Ticker module, weather card, finance summary, local alerts card, local opportunities card, exchange summary, prayer time widget |
| **What they must never own** | Dashboard rendering, layout engine, module ordering, core vertical cards (orders, bookings, rides) |
| **Allowed surfaces** | Governed module slots below core vertical content |
| **Allowed events** | `dashboard.refresh` trigger after intelligence feed update (existing event, no new event needed) |
| **Identity projection** | Dashboard Summary Projection (display name, avatar, quick stats) |
| **Privacy rules** | Intelligence cards respect per-module visibility settings. Commerce cards respect local commerce toggle. |
| **Ranking/suppression** | Combined intelligence + commerce cards capped (default 3). Core vertical cards always display first. |

### H.2 Radar

| Aspect | Details |
|--------|---------|
| **What new systems may contribute** | Weather station pins (intelligence), event location pins (intelligence), listing proximity pins (commerce), mosque pins (religious) |
| **What they must never own** | Radar discovery mode, entity type system, filter logic, map rendering, `RadarWiring` definitions |
| **Allowed surfaces** | Optional map layers (toggleable); never replace primary entity discovery |
| **Allowed events** | Listen to `radar.pin.selected` for analytics only; never emit Radar events |
| **Identity projection** | Not applicable (Radar shows places, not people) |
| **Privacy rules** | Intelligence/commerce pins require location consent. Mosque pins require religious module opt-in. |
| **Ranking/suppression** | Intelligence/commerce pins on separate map layers. Never obscure primary merchant/listing pins. |

**Radar is an optional local proximity visualization layer, not a mandatory truth owner.**

### H.3 Orbit

| Aspect | Details |
|--------|---------|
| **What new systems may contribute** | Intelligence: system notifications via `notification-engine.ts` (not Orbit threads). Commerce: seller/buyer chat threads via `local_exchange_chat` thread type. |
| **What they must never own** | Thread lifecycle, message delivery, call infrastructure, `OrbitWiring` definitions |
| **Allowed surfaces** | Intelligence: notification channel only (no Orbit threads). Commerce: `local_exchange_chat` thread type (new, not conflicting with existing types). |
| **Allowed events** | Listen to `orbit.message.sent` for commerce thread analytics only; intelligence emits via `notification-engine.ts` insertion API, never via Orbit thread creation |
| **Identity projection** | Orbit Communication Identity (display name from governed projection) |
| **Privacy rules** | Commerce conversations are private to parties. No message content used for intelligence or recommendations. |
| **Ranking/suppression** | Intelligence system messages capped per day. Commerce threads follow existing Orbit limits. |

**Orbit is communication only.**

### H.4 Wallet

| Aspect | Details |
|--------|---------|
| **What new systems may contribute** | Intelligence: nothing (read-only currency display). Commerce: future conceptual escrow (architecture only). |
| **What they must never own** | Payment flows, ledger, transaction state, balance, `WalletWiring` definitions |
| **Allowed surfaces** | Intelligence reads `currency` from wallet context for forex display. Commerce may reference currency for listing prices. |
| **Allowed events** | Neither system emits wallet events. May listen to `wallet.loaded` for currency context only. |
| **Identity projection** | Payment Identity is NEVER exposed to intelligence or commerce surfaces |
| **Privacy rules** | Wallet balance, transaction history, and payment methods are invisible to both systems |
| **Ranking/suppression** | N/A — neither system writes to Wallet surfaces |

**Wallet does not own intelligence/commercial recommendation truth.**

### H.5 Me

| Aspect | Details |
|--------|---------|
| **What new systems may contribute** | Intelligence: preference controls (module toggles, notification settings, personalization level). Commerce: local exchange history, active listings, favorites, trust level display. |
| **What they must never own** | User identity, profile truth, auth state, verification level |
| **Allowed surfaces** | Intelligence: "Intelligence Settings" section in Me preferences. Commerce: "Local Exchange" section in Me profile/history. |
| **Allowed events** | Both systems listen to `me:refresh` for preference changes. Neither emits Me events. |
| **Identity projection** | Me is the source surface for all profile projections. Both systems READ from Me, never WRITE to Me core fields. |
| **Privacy rules** | Me is the control center for all privacy settings. Every toggle described in Addendum B lives in Me. |
| **Ranking/suppression** | N/A — Me is the user's control panel, not a content surface |

**Me is the preference and control center.**

---

### Section Compliance Checklist

| # | Required Section | Heading Anchor | Present |
|---|-----------------|----------------|---------|
| 1 | Architecture-Only Declaration | `#1-architecture-only-declaration` | ✅ |
| 2 | Executive Vision | `#2-executive-vision` | ✅ |
| 3 | Global System Positioning | `#3-global-system-positioning` | ✅ |
| 4 | Domain Separation and Boundaries | `#4-domain-separation-and-boundaries` | ✅ |
| 5 | System A: Global Country/City Intelligence Layer | `#5-system-a-global-countrycity-intelligence-layer` | ✅ |
| 6 | System B: Zero-Search Local Social Commerce Engine | `#6-system-b-zero-search-local-social-commerce-engine` | ✅ |
| 7 | How Both Systems Coexist Without Conflict | `#7-how-both-systems-coexist-without-conflict` | ✅ |
| 8 | Global Data Sources Strategy | `#8-global-data-sources-strategy` | ✅ |
| 9 | Canonical Global Feed Model | `#9-canonical-global-feed-model` | ✅ |
| 10 | Canonical Social Commerce Model | `#10-canonical-social-commerce-model` | ✅ |
| 11 | Multi-Language and Localization Strategy | `#11-multi-language-and-localization-strategy` | ✅ |
| 12 | Country / Region / City Intelligence Layer | `#12-country--region--city-intelligence-layer` | ✅ |
| 13 | Personalization and AI Attention Engine | `#13-personalization-and-ai-attention-engine` | ✅ |
| 14 | Live Ticker / Banner Architecture | `#14-live-ticker--banner-architecture` | ✅ |
| 15 | AI Notification Architecture | `#15-ai-notification-architecture` | ✅ |
| 16 | Religious Utility Module (Opt-In) | `#16-religious-utility-module-opt-in` | ✅ |
| 17 | Nearby Mosques Module | `#17-nearby-mosques-module` | ✅ |
| 18 | Zero-Search Local Matching Architecture | `#18-zero-search-local-matching-architecture` | ✅ |
| 19 | Trust, Reputation, Moderation, and Anti-Scam Layer | `#19-trust-reputation-moderation-and-anti-scam-layer` | ✅ |
| 20 | Orbit / Wallet / Dashboard / Search Integration Points | `#20-orbit--wallet--dashboard--search-integration-points` | ✅ |
| 21 | Event Model and Platform Bus Alignment | `#21-event-model-and-platform-bus-alignment` | ✅ |
| 22 | Scheduling, Automation, and 24/7 Operation | `#22-scheduling-automation-and-247-operation` | ✅ |
| 23 | Fail-Safe, Non-Blocking, and Anti-Conflict Guarantees | `#23-fail-safe-non-blocking-and-anti-conflict-guarantees` | ✅ |
| 24 | World-Scale Expansion Strategy | `#24-world-scale-expansion-strategy` | ✅ |
| 25 | Implementation Phasing | `#25-implementation-phasing` | ✅ |
| 26 | Risks and Guardrails | `#26-risks-and-guardrails` | ✅ |
| 27 | Final Recommendation | `#27-final-recommendation` | ✅ |
| 28 | Final Explicit Statement: No Implementation Performed | `#28-final-explicit-statement-no-implementation-performed` | ✅ |
| A | Canonical Identity and Profile Propagation | `#addendum-a-canonical-identity-and-profile-propagation` | ✅ |
| B | Privacy, Consent, and Sensitive Signal Boundaries | `#addendum-b-privacy-consent-and-sensitive-signal-boundaries` | ✅ |
| C | Priority Arbitration and Channel Allocation Model | `#addendum-c-priority-arbitration-and-channel-allocation-model` | ✅ |
| D | Strict Separation — Information Utility vs Commercial Opportunity | `#addendum-d-strict-separation--information-utility-vs-commercial-opportunity` | ✅ |
| E | Presentation Governance / Visual Surface Contracts | `#addendum-e-presentation-governance--visual-surface-contracts` | ✅ |
| F | Strict 24/7 Autonomous Operation Model | `#addendum-f-strict-247-autonomous-operation-model` | ✅ |
| G | Automation Governance Matrix | `#addendum-g-automation-governance-matrix` | ✅ |
| H | Explicit 5-Pillar Integration Discipline | `#addendum-h-explicit-5-pillar-integration-discipline` | ✅ |

**Total**: 28 core sections + 8 addendum sections = **36 section-level blocks** ✅

---

**Validated against**: `src/lib/shared/platform-bus.ts` (event bus conventions, fan-out limits, `__bridged` pattern, correlation IDs), `src/lib/platform/events.ts` (canonical `APP_EVENTS` colon-notation, existing namespaces), `src/lib/taxonomy/module-wiring.ts` (5-pillar wiring interfaces, `VerticalKey` union), `src/lib/taxonomy/category-tree.ts` (canonical taxonomy), `src/lib/taxonomy/canonical-registry.ts` (canonical families/types), `src/lib/taxonomy/world-class-taxonomy.ts` (backward-compatible adapter), `src/domains/shared/state-machines.ts` (state machine pattern, `safeTransition`, `TERMINAL_STATES`), `src/lib/shared/notification-engine.ts` (`createNotification`, `createDeepLinkMeta`), `src/lib/intelligence/intelligence-orchestrator.ts` (`UserContext`, ranking, feed assembly).

*End of Architecture Document — No Implementation Performed*

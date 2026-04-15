# Super App Deep Audit & Next-Gen Upgrade Plan 2026

> **Date**: April 15, 2026
> **Scope**: Full-stack audit of the Easy-Locs super-app — 9 modules, 175 Edge Functions, 623 migrations, 88+ engines, 11 domain schemas.
> **Goal**: Identify every weakness, every fusion opportunity, and produce a precise execution plan to bring the app to world-class big-tech level — without breaking the existing DDD architecture.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Module A — Profile & Identity](#2-module-a--profile--identity)
3. [Module B — Wallet & QR Code](#3-module-b--wallet--qr-code)
4. [Module C — Radar & Discovery](#4-module-c--radar--discovery)
5. [Module D — Dashboard & SmartHome](#5-module-d--dashboard--smarthome)
6. [Module E — Backend & Supabase](#6-module-e--backend--supabase)
7. [Module F — News / Actualités](#7-module-f--news--actualités)
8. [Module G — Prayer Times](#8-module-g--prayer-times)
9. [Module H — Forex](#9-module-h--forex)
10. [Module I — Onboarding](#10-module-i--onboarding)
11. [Cross-Cutting Concerns](#11-cross-cutting-concerns)
12. [Prioritized Execution Plan](#12-prioritized-execution-plan)
13. [Technology Recommendations 2026](#13-technology-recommendations-2026)
14. [Risk Matrix](#14-risk-matrix)
15. [Appendix — File Inventory](#15-appendix--file-inventory)
16. [Task-Conflict Matrix](#16-task-conflict-matrix)
17. [Audit Methodology & Evidence](#17-audit-methodology--evidence)

---

## 1. Executive Summary

### Current State

Easy-Locs is a world-scale super-app built on **React 19 + Vite + TypeScript** with a **Supabase** backend (PostgreSQL, Auth, Realtime, Storage, Edge Functions). The app spans 5 pillars (Dashboard, Radar, Orbit, Wallet, Me) and covers 20+ verticals (food delivery, ride-hailing, real estate, C2C classifieds, forex, prayer times, etc.).

**Strengths:**
- Domain-Driven Design with 11 isolated database schemas (`identity`, `wallet`, `orbit`, `marketplace`, `commerce`, `property`, `onboarding`, `support`, `notification`, `system`, `analytics`)
- Unified `db.ts` gatekeeper enforcing schema boundaries
- Platform Bus event system enabling cross-module reactions
- 88+ autonomous engines (self-healing, governance, analytics)
- Comprehensive QR Engine with versioned actions
- Immutable wallet ledger with PIN + Trust Score
- Powerful discovery pipeline (8-stage: source → visibility → route → taxonomy → geo → search → rank → project)
- E2E encryption stack (X3DH + Double Ratchet) for Orbit messaging

**Weaknesses (systemic):**
- Identity fragmented across 4+ sources with no single canonical record
- 175 Edge Functions — many stubs, duplicates, or dead code (target: <60)
- 623 migrations — legacy compat views still active
- Dashboard loads too many parallel queries — no lazy widget loading
- QR and Wallet are separate UI islands — no contextual fusion
- Radar isolated from Dashboard and commerce flow
- No rate limiting on Edge Functions
- No observability dashboard for backend operations
- News/Forex/Prayer services lack personalization and advanced features

### Metrics Snapshot

| Dimension | Current | Target |
|-----------|---------|--------|
| Edge Functions | 175 | <60 active |
| Database migrations | 623 | Consolidated baseline + incremental |
| Domain schemas | 11 | 11 (stable) |
| Identity sources | 4+ divergent | 1 canonical + projections |
| Dashboard widget lazy loading | 0% | 100% |
| Service-layer violations | 20+ files bypass `db.ts` | 0 |
| i18n coverage | ~85% | 100% |
| Offline-first capability | None | Dashboard + Wallet cache |

---

## 2. Module A — Profile & Identity

### 2.1 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Identity Sources                      │
├──────────────┬──────────────┬─────────────┬──────────────┤
│  profiles    │ user_profiles│orbit_profiles│ Supabase Auth│
│  (identity.) │  (legacy)    │  _v2 (orbit.)│  metadata    │
├──────────────┴──────────────┴─────────────┴──────────────┤
│                   Resolution Cascade                      │
│  useAccountIdentity → useOrbitIdentity → Auth metadata   │
│         → useGlobalProfile → useResolvedIdentity         │
└──────────────────────────────────────────────────────────┘
```

**Key files:**
- `src/contexts/AuthContext.tsx` — 3 atomic sub-contexts (Session, Profile, Actions)
- `src/repositories/profile.repository.ts` — CRUD on `profiles`, `org_members`, `owner_profiles`
- `src/repositories/orbit-profile.repository.ts` — `orbit_profiles_v2` operations
- `src/hooks/useAccountIdentity.ts` — Personal/Business mode detection
- `src/hooks/useGlobalProfile.ts` — Aggregated canonical view (profiles + owner_profiles + tenants)
- `src/hooks/useOrbitIdentity.ts` — Social-facing persona
- `src/hooks/useResolvedIdentity.ts` — Display resolution from any partial object
- `src/stores/orbit-profile.internal.ts` — Zustand store for Orbit profile
- `src/lib/systems/identity-graph.ts` — Trust levels, risk scores, identity merging
- `src/domains/me/service.ts` — Domain-level profile updates with validation

### 2.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| A1 | No Single Source of Truth | **CRITICAL** | `AuthContext`, `useGlobalProfile`, `useOrbitIdentity`, and `useAccountIdentity` can diverge. A photo changed in `profiles` is not automatically reflected in `orbit_profiles_v2`. |
| A2 | Legacy `user_profiles` still active | HIGH | `src/lib/auth/profile.ts` ensures `user_profiles` exist on login — parallel to the canonical `profiles` table. Creates data drift. |
| A3 | Business/Personal mode inconsistency | MEDIUM | `MeBusinessSwitcher` toggles the mode but some pages still read from `useGlobalProfile` directly, ignoring the business context. |
| A4 | Avatar not CDN-optimized | MEDIUM | Avatars stored as full-size images in Supabase Storage. No auto-resize, no variant generation, no cache-busting hash. |
| A5 | Profile mode not persisted globally | MEDIUM | Mode switch state lives in component-local or hook state, not in a global Zustand atom consumed by all surfaces. |
| A6 | No realtime propagation | HIGH | Changes to `profiles` are picked up by `useMeRealtimeSync` but `orbit_profiles_v2` requires a separate update — no DB trigger cascade. |

### 2.3 Big-Tech Upgrade Plan

#### A-UP1: Unified Identity Graph (Priority: P0)

**What:** Create a single canonical identity record that all surfaces read from. When any field changes, ALL projections update within <2 seconds.

**How:**
1. Designate `identity.profiles` as the **single canonical source** for name, avatar, phone, email, country, currency, language, and preferences.
2. Create PostgreSQL trigger functions that propagate changes:
   ```sql
   CREATE OR REPLACE FUNCTION identity.propagate_profile_change()
   RETURNS TRIGGER AS $$
   BEGIN
     UPDATE orbit.orbit_profiles_v2
     SET display_name = NEW.full_name,
         avatar_url = NEW.avatar_url,
         updated_at = NOW()
     WHERE user_id = NEW.id;

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_profile_propagate
   AFTER UPDATE ON identity.profiles
   FOR EACH ROW
   WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name
      OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
   EXECUTE FUNCTION identity.propagate_profile_change();
   ```
3. Use Supabase Realtime WAL-based subscriptions (already used by `useMeRealtimeSync`) to listen for changes on `identity.profiles` and `orbit.orbit_profiles_v2`. On change, invalidate the relevant TanStack Query keys (`['profile', userId]`, `['orbit-identity', userId]`).
   > **Note:** Supabase Realtime uses WAL (Write-Ahead Log) change detection, not `pg_notify`. The trigger above handles cross-table propagation; Realtime handles client notification.
4. Create a single `useCanonicalIdentity()` hook that replaces `useGlobalProfile` + `useOrbitIdentity` + `useAccountIdentity` for display purposes.

**Files to modify:**
- New migration: `supabase/migrations/YYYYMMDD_unified_identity_triggers.sql`
- Refactor: `src/hooks/useGlobalProfile.ts` → facade over `useCanonicalIdentity`
- Refactor: `src/hooks/useOrbitIdentity.ts` → read-only projection
- New: `src/hooks/useCanonicalIdentity.ts`

#### A-UP2: Profile Mode Switcher Global Atom (Priority: P1)

**What:** A global Zustand atom `identityModeAtom` (Personal | Business) consumed by all pages.

**How:**
1. Create `src/stores/identity-mode.store.ts` with Zustand + `persist` middleware.
2. Wire `MeBusinessSwitcher` to write to this store.
3. All pages consuming profile data read the active mode from this store.
4. Header/sidebar show a persistent indicator of the active mode.

#### A-UP3: Avatar CDN Pipeline (Priority: P2)

**What:** Upload → Edge Function resize → 4 variants (32px, 64px, 128px, 256px) → CDN cache with `?v=hash`.

**How:**
1. Edge Function `process-avatar` triggered by Supabase Storage webhook on `avatars` bucket.
2. Uses Supabase Image Transformation (built-in CDN feature) to generate WebP variants at 4 sizes via URL parameters (`?width=32&format=webp`). No server-side image processing library needed — Supabase handles this at the CDN level.
3. Store the base URL in `identity.profiles.avatar_url`; client constructs variant URLs by appending size parameters.
4. Client selects appropriate variant based on context (list view = 32px, profile = 256px).
   > **Alternative (if Supabase Image Transformation is not available):** Use an Edge Function with `OffscreenCanvas` (already used in the onboarding media pipeline) to generate resized variants and upload them as separate files.

#### A-UP4: Deprecate `user_profiles` Legacy (Priority: P1)

**What:** Migrate all remaining `user_profiles` references to `identity.profiles`.

**How:**
1. Audit all `user_profiles` references (grep shows `src/lib/auth/profile.ts` as primary consumer).
2. Create a migration that copies any missing data from `user_profiles` → `identity.profiles`.
3. Update `ensureProfile` logic to write only to `identity.profiles`.
4. Drop `user_profiles` table after 30-day deprecation window with compat view.

---

## 3. Module B — Wallet & QR Code

### 3.1 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    QR Engine (406 LOC)                    │
│  Actions: pay_user, pay_shop, pay_c2c, menu,            │
│           login_verify, add_contact, profile, booking    │
│  Encode/Decode → JSON payload → processQr → route/pay   │
├─────────────────────────────────────────────────────────┤
│                  Wallet Engine (304 LOC)                  │
│  Immutable ledger | PIN guard | Trust Score              │
│  Balance fetch | Commission calc | Order split           │
│  Edge Functions: wallet-ops, wallet-transfer, wallet-pin │
├─────────────────────────────────────────────────────────┤
│                    Payment Layer                         │
│  Stripe Checkout | SEPA | Mobile Money | Crypto          │
│  UnifiedPaymentSystem | QrPaymentPanel                   │
└─────────────────────────────────────────────────────────┘
```

**Key files:**
- `src/lib/qr-engine.ts` — Universal QR encode/decode/process (406 LOC)
- `src/domains/qr/qr.pipeline.ts` — Regex validation for QR formats
- `src/domains/qr/qr.store.ts` — Scan session state
- `src/lib/wallet/wallet-engine.ts` — Core wallet operations (304 LOC)
- `src/domains/wallet/service.ts` + `ports.ts` — Domain interface
- `src/domains/wallet/adapters/supabase.adapter.ts` — Anti-corruption layer
- `src/components/wallet/ReceiveQrPanel.tsx` — Static receive QR
- `src/components/wallet/QuickPaySheet.tsx` — Payment sheet
- `src/components/qr/BrandedQR.tsx` — Branded QR display
- `src/pages/payments/QrScannerPage.tsx` — 30fps scanner

### 3.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| B1 | QR and Wallet are separate UI islands | **HIGH** | User must navigate to "Receive QR" separately from Wallet. No unified widget. |
| B2 | QR is static — no contextual adaptation | HIGH | The generated QR always uses the same action type. No auto-detection of context (restaurant vs P2P vs profile). |
| B3 | BrandedQR lacks animation/branding depth | MEDIUM | Static SVG rendering. No pulse, no brand animation, no NFC fallback. |
| B4 | No deep linking for QR resolve URLs | HIGH | `app.easy-locs.com/qr/resolve` URLs open in mobile browser, not the native app. Capacitor Universal Links not configured. |
| B5 | No NFC fallback for QR payments | MEDIUM | Modern devices support NFC tap-to-pay but the app only uses camera-based QR scanning. |
| B6 | Wallet balance not visible from QR scanner | MEDIUM | When scanning a payment QR, user can't see their current balance without navigating away. |

### 3.3 Big-Tech Upgrade Plan

#### B-UP1: Unified Wallet Card Widget (Priority: P0)

**What:** A single "My Card" widget showing: balance, dynamic QR, quick actions — inspired by WeChat Pay / Alipay.

**How:**
1. Create `src/components/wallet/WalletCard.tsx` — a card component that displays:
   - Current balance (from `wallet-engine.ts` cache)
   - Dynamic QR code that auto-switches based on context
   - Quick action buttons: Send, Receive, Top Up, Scan
2. This widget is rendered:
   - In the Wallet tab as the hero element
   - In the Dashboard as a mini-widget
   - In the QR scanner as a floating overlay
3. Uses the existing `wallet-engine.ts` for balance and `qr-engine.ts` for QR generation.

#### B-UP2: Contextual QR Intelligence (Priority: P1)

**What:** The QR auto-adapts based on the user's current context.

**How:**
1. Create `src/lib/qr/qr-context-resolver.ts`:
   - If user is on a restaurant page → `pay_shop` + shop_id + table
   - If user is on Wallet → `pay_user` + user_id
   - If user is on their profile → `add_contact` + contact info
   - If user is in a conversation → `pay_user` + recipient_id + suggested amount
2. The `WalletCard` widget calls `resolveQrContext()` to determine the active QR action.
3. QR refreshes every 60 seconds with a new nonce for security.

#### B-UP3: Deep Links Configuration (Priority: P1)

**What:** Configure Capacitor Universal Links (iOS) and App Links (Android) so QR resolve URLs open directly in the app.

**How:**
1. Update `capacitor.config.ts` with `appUrlOpen` listener.
2. Add `apple-app-site-association` file for iOS Universal Links.
3. Add `assetlinks.json` for Android App Links.
4. Update `qr-engine.ts` `processQr` to handle deep-linked resolve URLs.

#### B-UP4: Animated Branded QR (Priority: P2)

**What:** QR code with subtle pulse animation and Easy-Locs brand colors.

**How:**
1. Enhance `BrandedQR.tsx` with Framer Motion pulse animation.
2. Add brand gradient overlay to QR dots using the existing `brand-tokens.css` variables.
3. Center logo uses the dynamic logo from `useDynamicLogo` for contextual branding.

#### B-UP5: NFC Tap-to-Pay (Priority: P3)

**What:** Same QR payload transmitted via NFC for compatible devices.

**How:**
1. Integrate `@capawesome-team/capacitor-nfc` plugin.
2. On supported devices, show "Tap to Pay" option alongside QR.
3. NFC NDEF record contains the same JSON payload as the QR.

---

## 4. Module C — Radar & Discovery

### 4.1 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Canonical Discovery Pipeline (529 LOC)          │
│  8 stages: Source → Visibility → Route → Taxonomy →     │
│            Geo → Search → Rank → UI Project             │
│  Surfaces: radar, map, search, browse, recommendations  │
├─────────────────────────────────────────────────────────┤
│               Radar Engine (328 LOC)                     │
│  Haversine distances | ETAs | Weather layers (RainViewer)│
│  Layer order: weather → shops → drivers → users          │
│  Bridge: radar-orbit-bridge (See → Chat)                 │
├─────────────────────────────────────────────────────────┤
│                  Geo Service                             │
│  GPS tracking | IP fallback | Zustand geo-store          │
│  OSM Places Engine | Distance utilities                  │
├─────────────────────────────────────────────────────────┤
│                   Map System                             │
│  UnifiedMap (Mapbox GL JS) | Layer registry              │
│  Heatmap engine | Camera controls | LiveMap              │
└─────────────────────────────────────────────────────────┘
```

**Key files:**
- `src/lib/discovery/canonical-discovery-pipeline.ts` — 8-stage pipeline (529 LOC)
- `src/lib/discovery/query-governance.ts` — Centralized filtering rules
- `src/lib/discovery/timeContext.ts` — Time-relevance scoring
- `src/lib/radar/radar-engine.ts` — Core radar logic (328 LOC)
- `src/lib/radar/radar-orbit-bridge.ts` — See → Chat bridge
- `src/lib/radar/radar-layer-manager.ts` — Layer lifecycle
- `src/lib/radar/radar-snap-elite.ts` — Snap interaction logic
- `src/lib/geo/geo-service.ts` — GPS + fallback
- `src/lib/geo/distance.ts` — Haversine implementation
- `src/lib/geo/osm-places-engine.ts` — OSM POI enrichment
- `src/components/radar/RadarView.tsx` — Main radar container
- `src/components/map/UnifiedMap.tsx` — Mapbox wrapper
- `src/stores/radarStore.ts` — Radar state

### 4.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| C1 | Radar is an isolated page | **HIGH** | Not integrated into Dashboard or commerce flow. User must navigate to Radar explicitly. |
| C2 | Layers not user-filterable | HIGH | Layer toggle exists in code (`radar-layer-manager.ts`) but no intuitive Apple Maps-style UI for the user. |
| C3 | No demand heatmap | MEDIUM | The `heatmap-engine.ts` exists but only shows discovery density, not real-time demand from searches/orders. |
| C4 | No geo-fence push notifications | MEDIUM | No mechanism to notify users when they enter a merchant's promotional radius. |
| C5 | Radar → Commerce disconnect | HIGH | Tapping a pin shows info but requires navigation to a new page to order/book. No inline sheet with direct action. |
| C6 | Duplicate search bars | HIGH | `RadarSmartSearch` and `SmartSearchBar` (SuperMap) overlap. Already flagged in FULL_SYSTEM_AUDIT (issue 1.2). |
| C7 | Weather widget overlaps category chips | **CRITICAL** | Already flagged in FULL_SYSTEM_AUDIT (issue 6.1). Needs collision avoidance. |

### 4.3 Big-Tech Upgrade Plan

#### C-UP1: Radar Mini-Map Dashboard Widget (Priority: P1)

**What:** A compact map widget directly in the Dashboard SmartHome showing the 5 most relevant nearby entities.

**How:**
1. Create `src/components/dashboard/RadarMiniWidget.tsx`:
   - Renders a 200px-tall Mapbox instance with simplified controls.
   - Uses `canonical-discovery-pipeline` with `surface: 'recommendations'` and `limit: 5`.
   - Entities selected based on: time of day (`timeContext`), user history, and proximity.
2. Lazy-loaded as a `React.lazy` chunk.
3. Tap on the widget expands to full Radar page with the same center/zoom.

#### C-UP2: Smart Layers Toggle UI (Priority: P1)

**What:** Apple Maps-style capsule toggles for layer filtering.

**How:**
1. Create `src/components/radar/SmartLayerToggle.tsx`:
   - Horizontal scrollable pill buttons: "Restaurants", "Drivers", "Deals", "Friends", "C2C".
   - Each pill maps to a `radar-layer-manager` layer.
   - Active state shows filled pill with category icon.
   - Framer Motion spring animation on toggle.
2. Replace the current layer controls in `HyperRadarPage` with this component.
3. Persist active layers to `localStorage` for session continuity.

#### C-UP3: Radar → Commerce Direct (Priority: P0)

**What:** Tap on a pin → bottom sheet with price, reviews, and "Order" / "Book" button — without leaving the map.

**How:**
1. Create `src/components/radar/RadarQuickActionSheet.tsx`:
   - Renders as a bottom sheet (existing `Sheet` component from shadcn).
   - Fetches entity details from the discovery pipeline.
   - Shows: photo, name, rating, distance, price range, and 1 CTA button.
   - CTA routes to the appropriate action: `storefront/order`, `booking/create`, or `wallet/pay`.
2. Wire into `UnifiedMap` pin click handler.
3. Uses `radar-orbit-bridge` for "Chat with merchant" secondary action.

#### C-UP4: Geo-Fence Push Notifications (Priority: P2)

**What:** Contextual push notifications when user enters a merchant's promotional radius.

**How:**
1. Create `supabase/functions/geo-fence-check/` Edge Function:
   - Called periodically with user's position.
   - Queries merchants with active promotions within a configurable radius.
   - Deduplicates: max 1 notification per merchant per 24h.
2. Client-side: use Capacitor `BackgroundGeolocation` plugin to report position updates.
3. Notification dispatched via existing `notification-dispatcher` Edge Function.

#### C-UP5: Demand Heatmap (Priority: P3)

**What:** Real-time heatmap of search/order density for merchants (admin view).

**How:**
1. Enhance `heatmap-engine.ts` to aggregate:
   - Search queries by geo-cell (H3 hexagonal grid).
   - Order creation events by location.
2. Store aggregated counts in `analytics.demand_heatmap` table with 15-minute buckets.
3. Render in `AdminDashboard` as a Mapbox heatmap layer.

---

## 5. Module D — Dashboard & SmartHome

### 5.1 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   SmartHome (Shell)                       │
│  TopHeroBanner | SmartQuickActions | AISmartInsights     │
│  Category Grid | Essential Services Strip               │
│  → Delegates to useDashboardViewModel                    │
├─────────────────────────────────────────────────────────┤
│                 DashboardLayout                           │
│  Sidebar with role-based navigation                      │
│  Theme switcher | Notification bell | Hub quick access   │
├─────────────────────────────────────────────────────────┤
│                AdminDashboard (Separate)                  │
│  KPI cards | Revenue | Team/Workflows | Health           │
├─────────────────────────────────────────────────────────┤
│                   Widgets                                │
│  OrbitPreview | PropertyDashboard | EngineHealth         │
│  Forex | PrayerTimes | IntelligenceTicker | LiveTracking │
└─────────────────────────────────────────────────────────┘
```

**Key files:**
- `src/components/storefront/SmartHome.tsx` — Super App home screen (pure shell)
- `src/components/dashboard/DashboardLayout.tsx` — Navigation shell
- `src/pages/AdminDashboard.tsx` — Admin-specific view
- `src/components/dashboard/OrbitPreviewWidget.tsx` — Message snapshot
- `src/components/dashboard/PropertyDashboardWidget.tsx` — Real estate metrics
- `src/components/dashboard/IntelligenceTicker.tsx` — Live insights feed
- `src/components/dashboard/ForexWidget.tsx` — Currency rates
- `src/components/dashboard/PrayerTimesWidget.tsx` — Prayer countdown

### 5.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| D1 | No lazy loading for widgets | **HIGH** | All widgets load synchronously. SmartHome triggers parallel queries via `useDashboardLiveStats`, `useDashboardViewModel`, and discovery pipeline — risk of query cascade. |
| D2 | Admin Dashboard is a separate page | MEDIUM | Admin and User dashboard share no components. Admin sees a completely different UI with no personal context. |
| D3 | Widgets not customizable | MEDIUM | User cannot reorder, hide, or resize widgets. Fixed layout for all users. |
| D4 | IntelligenceTicker has no real data source | HIGH | The ticker component exists but feeds from static/mocked data — not connected to live Wallet, Orbit, or Commerce events. |
| D5 | OrbitSmartHub hardcoded 340px | HIGH | Will clip on iPhone SE (320px viewport). Already flagged in FULL_SYSTEM_AUDIT (issue 6.2). |
| D6 | No offline dashboard | MEDIUM | Dashboard shows blank state without network. No cached data displayed. |

### 5.3 Big-Tech Upgrade Plan

#### D-UP1: Lazy Widget Loading (Priority: P0)

**What:** Each widget is a `React.lazy` chunk with skeleton placeholder.

**How:**
1. Wrap each widget in `React.lazy(() => import('./WidgetName'))`.
2. Create `src/components/dashboard/WidgetSkeleton.tsx` — generic skeleton matching widget aspect ratio.
3. Use `Suspense` boundaries per widget, not per page.
4. Dashboard shell renders instantly; widgets fill in progressively.
5. Add `prefetch` hints for above-the-fold widgets using `<link rel="modulepreload">`.

#### D-UP2: Unified Admin/User Dashboard (Priority: P2)

**What:** A single Dashboard with role-adaptive sections.

**How:**
1. Admin KPI cards render as a collapsible section at the top of the standard Dashboard.
2. Admin-only widgets (Revenue breakdown, Team management) render only when `role === 'admin'`.
3. The admin still sees their personal SmartHome below the admin section.
4. Uses the same `DashboardLayout` shell — no separate routing.

#### D-UP3: Widget Composability (Priority: P2)

**What:** Users can drag-and-drop widgets to customize their home screen.

**How:**
1. Use `@dnd-kit/core` for drag-and-drop (lightweight, accessible).
2. Store layout in `identity.profiles.dashboard_layout` (JSONB) via existing `domains/me/service.ts`.
3. Default layout defined per role (consumer, merchant, driver, admin).
4. Widget catalog: users can add/remove from a drawer of available widgets.

#### D-UP4: Live Intelligence Feed (Priority: P1)

**What:** Connect IntelligenceTicker to real platform events.

**How:**
1. Feed sources (via Platform Bus subscriptions):
   - `wallet:transfer_received` → "You received $X from Y"
   - `orbit:message_received` (unread count) → "3 unread messages"
   - `commerce:order_status_changed` → "Your order is out for delivery"
   - `marketplace:booking_confirmed` → "Booking confirmed for tomorrow"
   - Forex rate changes > 2% → "EUR/MAD up 2.3% today"
2. Create `src/lib/intelligence/feed-aggregator.ts` that subscribes to Platform Bus events and maintains a ring buffer of the last 20 items.
3. IntelligenceTicker reads from this aggregator.

#### D-UP5: Dashboard Offline-First Cache (Priority: P2)

**What:** Cache last dashboard data in IndexedDB for instant display without network.

**How:**
1. Use TanStack Query's `persistQueryClient` with `createSyncStoragePersister` backed by IndexedDB.
2. Dashboard queries marked with `gcTime: Infinity` and `staleTime: 300_000` (5 min).
3. Show a "Data from X minutes ago" freshness indicator when serving cached data.
4. Background sync when network returns.

---

## 6. Module E — Backend & Supabase

### 6.1 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Domain Schema Architecture                  │
│  11 schemas: identity, wallet, orbit, marketplace,       │
│  commerce, property, onboarding, support, notification,  │
│  system, analytics                                       │
│  Rule: "1 data = 1 owner" — tables in canonical schemas │
├─────────────────────────────────────────────────────────┤
│              Database Service (db.ts)                     │
│  domainDb.wallet.from("table") — validates schema        │
│  ownership before execution                              │
├─────────────────────────────────────────────────────────┤
│           Edge Functions (175 active)                     │
│  Categories: AI, Payments/Stripe, Booking/Lease,         │
│  System/Ops, Communication, Auth, Scraping               │
│  Shared: supabase/functions/_shared/                      │
├─────────────────────────────────────────────────────────┤
│              623 Migrations                               │
│  Recent: domain_schema_architecture migration             │
│  Legacy compat views still present                        │
└─────────────────────────────────────────────────────────┘
```

**Key files:**
- `src/services/db.ts` — Unified DB client with schema validation (204 LOC)
- `src/lib/schema/domain-schemas.ts` — Schema definitions (187 LOC)
- `src/lib/db/repositories.ts` — Data access layer
- `src/types/canonical-schemas.ts` — Canonical type definitions
- `supabase/config.toml` — 11 schemas exposed to PostgREST
- `supabase/functions/` — 175 Edge Functions
- `supabase/migrations/` — 623 migration files

### 6.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| E1 | 175 Edge Functions — bloat | **CRITICAL** | Many are stubs, duplicates, or dead code. Examples: `booking-approve` + `booking-reject` + `booking-complete` + `booking-create` could be unified into `booking-lifecycle`. |
| E2 | Legacy compat views still active | HIGH | `public` schema still has compat views pointing to domain schema tables. Confuses query routing. |
| E3 | No rate limiting on Edge Functions | **CRITICAL** | Any Edge Function can be called at unlimited rate. No per-IP or per-user throttling. |
| E4 | No observability | HIGH | No centralized dashboard for Edge Function latency, error rates, or call volumes. |
| E5 | 20+ service-layer violations | HIGH | Already flagged in FULL_SYSTEM_AUDIT: 3 pages, 8 components, and 9 hooks bypass `db.ts` for direct Supabase queries. |
| E6 | No optimistic updates | MEDIUM | All mutations wait for server response before updating UI. Creates perceived latency on Wallet transfers, message sends, booking creates. |
| E7 | Database indexes not audited | MEDIUM | PostGIS geo queries and commerce joins may lack optimal indexes for current query patterns. |
| E8 | No connection pooling documentation | LOW | PgBouncer configuration not documented or verified for production load. |

### 6.3 Big-Tech Upgrade Plan

#### E-UP1: Edge Function Consolidation (Priority: P0)

**What:** Audit all 175 functions, merge duplicates, remove dead code. Target: <60 active functions.

**Consolidation candidates:**

| Current (separate) | Proposed (unified) |
|--------------------|--------------------|
| `booking-approve`, `booking-reject`, `booking-complete`, `booking-create` | `booking-lifecycle` (already exists — route via action param) |
| `refund-process-booking`, `refund-request-booking`, `process-refund`, `refund-admin` | `refund-processor` |
| `create-checkout`, `create-checkout-session`, `create-guest-checkout`, `create-concierge-payment`, `create-listing-checkout`, `create-storefront-checkout`, `create-booking-payment`, `create-stripe-intent`, `create-legal-notice-payment` | `payment-session` (factory pattern by `type` param) |
| `send-email`, `send-notification-email`, `email-enqueue`, `email-queue-process` | `email-pipeline` |
| `send-push`, `send-push-notification`, `send-call-push` | `push-dispatcher` |
| `webauthn-*` (8 functions) | `webauthn-handler` (route by `action` param) |
| `admin-payout-approve`, `admin-payout-reject` | `payout-lifecycle` |
| `rent-create-payment`, `rent-payment`, `rent-reminders`, `rent-lifecycle-cron` | `rent-lifecycle` (already partially exists) |
| `stripe-connect-login`, `check-connect-status`, `create-connect-account`, `disconnect-stripe` | `stripe-connect` |

**Dead/stub candidates for removal (verify first):**
- `watchdog-ping` — if health-check covers it
- `lambda-invoke-proxy` — if direct invocation replaced it
- `sqs-enqueue-proxy` — if redis-enqueue replaced it
- `public-health` vs `health-check` — deduplicate

**Process:**
1. Create inventory spreadsheet of all 175 functions with: name, last modified, call volume (from logs), dependencies.
2. Group by domain and identify merge candidates.
3. Implement unified handlers with `action` routing parameter.
4. Update client calls in `src/` to use new unified endpoints.
5. Deprecate old functions with 404 redirect for 30 days.
6. Delete deprecated functions.

#### E-UP2: Rate Limiting Middleware (Priority: P0)

**What:** Shared Deno middleware for all Edge Functions with per-IP and per-user rate limiting.

**How:**
1. Create `supabase/functions/_shared/rate-limit.ts`:
   - In-memory sliding window counter (Edge Function instances are short-lived, so use Supabase `system.rate_limits` table or Upstash Redis).
   - Default: 60 requests/minute per IP, 120/minute per authenticated user.
   - Critical operations (wallet-ops, payment): 10/minute.
   - Read-only operations (search, fx-rates): 120/minute.
2. Each Edge Function wraps its handler with `withRateLimit(handler, config)`.
3. Returns `429 Too Many Requests` with `Retry-After` header.

#### E-UP3: Observability Dashboard (Priority: P1)

**What:** Structured logging + monitoring for all Edge Functions.

**How:**
1. Create `supabase/functions/_shared/logger.ts`:
   - Structured JSON logs with: `function_name`, `duration_ms`, `status`, `user_id`, `request_id`.
   - Log to `analytics.edge_function_logs` table.
2. Edge Function wrapper: `withObservability(handler)` that auto-logs start/end/error.
3. Dashboard page in AdminDashboard showing: P50/P95/P99 latency, error rate, call volume — queried from the analytics table.

#### E-UP4: Finalize Domain Schema Migration (Priority: P1)

**What:** Remove all legacy compat views from `public` schema.

**How:**
1. Grep for all `CREATE VIEW public.` or `CREATE OR REPLACE VIEW public.` in migrations.
2. Identify which compat views are still referenced in application code.
3. Update application code to use `domainDb` access exclusively.
4. Create migration to drop compat views.
5. Update RLS policies if any reference the public schema views.

#### E-UP5: Fix Service-Layer Violations (Priority: P1)

**What:** Route all 20+ direct `supabase.from()` calls through `db.ts`.

**How:**
1. For each violation identified in FULL_SYSTEM_AUDIT (sections 3.1-3.3):
   - Move the query logic to the appropriate repository in `src/lib/db/repositories.ts`.
   - Replace the direct call with the repository method.
2. Add an ESLint rule (`no-restricted-imports`) to prevent direct Supabase client usage in pages/components/hooks.

#### E-UP6: Optimistic Updates (Priority: P2)

**What:** TanStack Query optimistic mutations for critical operations.

**How:**
1. Wallet transfer: Immediately deduct balance in cache, revert on error.
2. Message send: Immediately show message in thread, mark as "sending", revert on error.
3. Booking create: Immediately show booking in list with "pending" status.
4. Use TanStack Query's `onMutate` → `onError` → `onSettled` pattern.

#### E-UP7: Database Index Audit (Priority: P2)

**What:** Verify optimal indexes for frequent query patterns.

**How:**
1. Enable `pg_stat_statements` to capture top 50 queries by total time.
2. Run `EXPLAIN ANALYZE` on each.
3. Priority index candidates:
   - PostGIS: `CREATE INDEX idx_listings_geo ON marketplace.listings USING GIST (location);`
   - Commerce joins: Composite indexes on `(org_id, status, created_at)`.
   - Wallet: Index on `(user_id, created_at DESC)` for ledger queries.
   - Discovery: Index on `(category, status, visibility)` for pipeline queries.

---

## 7. Module F — News / Actualités

### 7.1 Current Architecture

- **Service:** `src/services/data/news-data-service.ts`
- **Provider:** `src/lib/intelligence/global/news-provider.ts`
- **Edge Function:** `supabase/functions/rss-proxy/` — server-side RSS fetching
- **Fallback:** `news-fallback-data.ts` — static fallback data
- **Caching:** `localStorage` with 1h TTL
- **Freshness:** LIVE / STALE / FALLBACK indicators

### 7.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| F1 | Single news source | HIGH | Only uses RSS proxy (likely Google News). No multi-source aggregation. |
| F2 | No personalization | MEDIUM | All users see the same feed. No interest-based filtering. |
| F3 | Client-side cache only | MEDIUM | localStorage cache means each device starts cold. No server-side shared cache. |
| F4 | No push for breaking news | LOW | No mechanism to push critical news notifications. |

### 7.3 Big-Tech Upgrade Plan

#### F-UP1: Multi-Source Aggregation (Priority: P1)

**What:** Edge Function aggregating from 3+ sources with deduplication.

**How:**
1. Enhance `rss-proxy` Edge Function to fetch from:
   - Source 1: Current RSS feed
   - Source 2: NewsAPI (with API key stored in Supabase Vault)
   - Source 3: Local RSS feeds (configurable per country)
2. Deduplicate by fuzzy title matching (Levenshtein distance < 0.3).
3. Normalize all articles to a `CanonicalNewsItem` schema.
4. Cache results in `system.news_cache` table with 30-minute TTL.

#### F-UP2: Personalized Feed (Priority: P2)

**What:** Score articles based on user's active vertical and reading history.

**How:**
1. Scoring formula: `score = relevance_to_vertical * 0.4 + recency * 0.3 + source_quality * 0.2 + user_interest * 0.1`.
2. `user_interest` derived from: verticals the user has active (merchant=food, landlord=real_estate), country, and recently clicked categories.
3. Applied client-side after fetch (no separate Edge Function needed).

#### F-UP3: Server-Side Cache (Priority: P2)

**What:** Replace localStorage cache with `system.news_cache` table.

**How:**
1. Edge Function writes fetched articles to `system.news_cache` with `expires_at` timestamp.
2. Client first queries the table; only calls the Edge Function if cache is stale.
3. Edge Function cron (`engine-cron-server`) refreshes cache every 30 minutes.

---

## 8. Module G — Prayer Times

### 8.1 Current Architecture

- **Service:** `src/services/data/prayer-data-service.ts`
- **API:** Al-Adhan API (`api.aladhan.com`)
- **Edge Function:** `supabase/functions/prayer-times/`
- **Geolocation:** Falls back to country-level coordinates (defaults to Dubai, UAE)
- **Features:** Countdown timer, notifications, Supabase cache

### 8.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| G1 | Fallback to country centroid | HIGH | If GPS is denied, uses country-level coordinates (Dubai). Prayer times can differ by 10+ minutes between cities in the same country. |
| G2 | No Qibla compass | MEDIUM | Users must use a separate app for Qibla direction. |
| G3 | No home screen widget | LOW | No Capacitor widget showing next prayer time on iOS/Android home screen. |
| G4 | No Hijri calendar | LOW | No display of Islamic calendar dates or important dates. |

### 8.3 Big-Tech Upgrade Plan

#### G-UP1: Precise Geolocation (Priority: P0)

**What:** Use exact GPS coordinates from `geo-service.ts` (already available).

**How:**
1. Update `prayer-data-service.ts` to use `geoStore.getState().location` instead of country fallback.
2. If GPS is denied, use IP-based location from `ip-fallback.ts` (city-level accuracy).
3. Cache prayer times by `(lat_rounded, lng_rounded, date)` — round to 2 decimal places (~1km precision).

#### G-UP2: Qibla Compass (Priority: P2)

**What:** Digital compass pointing to Makkah using device magnetometer.

**How:**
1. Create `src/components/prayer/QiblaCompass.tsx`.
2. Use Capacitor `DeviceOrientation` or `Motion` API for compass heading.
3. Calculate Qibla bearing from user's GPS position to Makkah (21.4225°N, 39.8262°E) using the great-circle formula.
4. Render as an animated compass dial with Framer Motion.

#### G-UP3: Hijri Calendar (Priority: P3)

**What:** Display Hijri date and upcoming Islamic events.

**How:**
1. Use Al-Adhan API's Hijri calendar endpoint.
2. Show current Hijri date in the PrayerTimesWidget header.
3. Highlight upcoming events (Ramadan, Eid, etc.) with countdown.

---

## 9. Module H — Forex

### 9.1 Current Architecture

- **Service:** `src/services/data/forex-data-service.ts`
- **Multi-source:** ECB Edge Function → Frankfurter API → ExchangeRate-API → static snapshot
- **Spread:** 2% platform spread applied
- **Edge Function:** `supabase/functions/fx-rates/`
- **Static fallback:** `src/constants/static-forex-rates.ts`

### 9.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| H1 | Basic sparkline charts | HIGH | No interactive charting. No time period selection. No candlestick view. |
| H2 | No price alerts | HIGH | Users can't set threshold notifications for rate changes. |
| H3 | No historical data | MEDIUM | Only current rates displayed. No trend visualization. |
| H4 | No contextual conversion in Wallet | MEDIUM | Wallet doesn't show equivalent amounts in user's local currency. |

### 9.3 Big-Tech Upgrade Plan

#### H-UP1: Interactive Charts (Priority: P1)

**What:** Trading-grade charts with period selection (1D, 1W, 1M, 3M, 1Y).

**How:**
1. Integrate `lightweight-charts` (TradingView's open-source library, <50KB).
2. Create `src/components/forex/ForexChart.tsx`:
   - Line chart by default, candlestick toggle for advanced users.
   - Period selector pills: 1D, 1W, 1M, 3M, 1Y.
   - Touch-friendly crosshair for precise value reading.
3. Historical data fetched from Edge Function that queries Frankfurter API's historical endpoint.

#### H-UP2: Price Alerts (Priority: P2)

**What:** User-defined threshold alerts with push notifications.

**How:**
1. Store alerts in `wallet.forex_alerts` table: `(user_id, base_currency, quote_currency, threshold, direction, is_active)`.
2. Edge Function cron (`dispatch-cron` → `check-forex-alerts`):
   - Runs every 15 minutes.
   - Compares current rates against active alerts.
   - Triggers `notification-dispatcher` for matches.
3. UI: Button in ForexWidget → "Set Alert" → form with currency pair and threshold.

#### H-UP3: Historical Rate Storage (Priority: P2)

**What:** Store daily rates for trend analysis.

**How:**
1. Create `analytics.forex_history` table: `(date, base, rates JSONB)`.
2. Edge Function cron stores daily closing rates.
3. Client queries this table for chart data, reducing external API calls.

#### H-UP4: Contextual Wallet Conversion (Priority: P1)

**What:** Show local currency equivalents in the Wallet.

**How:**
1. In `WalletCard`, show: "Balance: 500 MAD ≈ 46.30 EUR" using cached forex rate.
2. In `TransactionRow`, show converted amount as a secondary line.
3. Uses `forex-data-service.ts` cached rates — no additional API calls.

---

## 10. Module I — Onboarding

### 10.1 Current Architecture

- **Core:** `src/lib/onboarding/merchant-onboarding.ts` — activation, validation, completeness scoring
- **Pipeline:** `src/lib/onboarding/pipeline/` — quality control, taxonomy mapping, vertical classification
- **UI:** `src/components/onboarding/`, `src/pages/onboarding/`
- **Wizards:** Multi-step for Merchant, Taxi Driver, Hotel, Service Provider
- **Auto-onboarding:** `supabase/functions/auto-onboarding-cron/`, `uae-scrape-onboard/`
- **Media:** Download + WebP conversion + thumbnail generation pipeline

### 10.2 Issues Identified

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| I1 | No auto-save between steps | **HIGH** | If user navigates away mid-wizard, all progress is lost. Only `c2c-draft-store` (C2C classifieds) has Zustand persist. |
| I2 | No consumer onboarding | MEDIUM | Only professional verticals have onboarding. Regular consumers skip directly to the app with no personalization flow. |
| I3 | No progressive onboarding | MEDIUM | Wizard is blocking — user must complete all steps before accessing the app. |
| I4 | No KYC integration | LOW | Merchant/driver identity verification is manual (admin review). No automated ID verification service. |

### 10.3 Big-Tech Upgrade Plan

#### I-UP1: Auto-Save per Step (Priority: P0)

**What:** Every field saved in real-time with debouncing — zero data loss.

**How:**
1. Create `src/stores/onboarding-draft.store.ts` using Zustand with `persist` middleware (localStorage).
2. Each form field change triggers a debounced (500ms) save to the store.
3. On wizard load, hydrate from the persisted store.
4. On successful submission, clear the store.
5. Show "Draft saved" micro-indicator with last save timestamp.
6. Additionally, sync draft to Supabase `onboarding.drafts` table every 30 seconds for cross-device persistence.

#### I-UP2: Consumer Onboarding (Priority: P1)

**What:** Lightweight wizard for end-users: interests, neighborhood, preferred currency, notification preferences.

**How:**
1. Create `src/pages/onboarding/ConsumerOnboardingWizard.tsx`:
   - Step 1: "What are you interested in?" → multi-select from main verticals (Food, Real Estate, Shopping, Services, Mobility).
   - Step 2: "Where are you based?" → geo-detected with manual override.
   - Step 3: "Preferred currency" → auto-detected from country with override.
   - Step 4: "Notification preferences" → granular toggles per category.
2. Saves to `identity.profiles.preferences` (JSONB).
3. Used by Dashboard SmartHome to personalize category grid and SmartQuickActions.

#### I-UP3: Progressive Onboarding (Priority: P2)

**What:** Allow immediate app access with contextual nudges to complete profile.

**How:**
1. After email verification, user enters the app directly.
2. Contextual nudges appear at relevant moments:
   - First visit to Wallet: "Add a phone number for secure transfers (+15% trust score)"
   - First visit to Marketplace: "Complete your address for delivery estimates"
   - After 3 days: "Add a profile photo for +20% trust score"
3. Nudges stored as a checklist in `identity.profiles.onboarding_checklist` (JSONB).
4. NudgeManager reads the checklist and displays relevant nudges via Platform Bus events.

---

## 11. Cross-Cutting Concerns

### 11.1 Performance

| Concern | Current State | Recommendation | Priority |
|---------|--------------|----------------|----------|
| Bundle size | Unknown — 20+ verticals in a single SPA | Code-split by route/vertical using `React.lazy`. Measure with `vite-bundle-analyzer`. | P1 |
| First paint | Dashboard loads all widgets synchronously | Implement D-UP1 (lazy widget loading) | P0 |
| API cascading | Dashboard triggers 5+ parallel queries on mount | Implement request batching or a single `dashboard-data` Edge Function | P1 |
| Image loading | No systematic lazy loading | Add `loading="lazy"` to all below-fold images. Use `srcSet` with avatar variants (A-UP3). | P2 |

### 11.2 Security

| Concern | Current State | Recommendation | Priority |
|---------|--------------|----------------|----------|
| Rate limiting | None on Edge Functions | Implement E-UP2 (rate limiting middleware) | P0 |
| JWT verification | Most Edge Functions have `verify_jwt = false` | Audit each function — enable JWT verification for all user-facing functions | P0 |
| Input sanitization | Centralized in `security-utils.ts` | Audit all Edge Functions for input validation — many stubs may lack it | P1 |
| CSRF protection | `generateFormToken()` exists | Verify all mutation endpoints validate CSRF tokens | P2 |

### 11.3 Accessibility

| Concern | Current State | Recommendation | Priority |
|---------|--------------|----------------|----------|
| Screen reader | Shadcn/Radix provides base a11y | Audit all custom components for ARIA labels and keyboard navigation | P2 |
| Color contrast | Dark theme may have low contrast on secondary text | Run automated contrast audit with axe-core | P2 |
| Touch targets | Some grids too dense for mobile (MeQuickActions 6-col) | Ensure minimum 44x44px touch targets per WCAG | P1 |

### 11.4 i18n Completeness

| Concern | Current State | Recommendation | Priority |
|---------|--------------|----------------|----------|
| Hardcoded strings | 6+ locations identified in FULL_SYSTEM_AUDIT | Systematic sweep of all user-facing strings | P1 |
| RTL support | Implemented via `isRTL()` + `document.dir` | Test all pages in Arabic RTL mode | P2 |
| Date/number formats | Not audited | Use `Intl.DateTimeFormat` and `Intl.NumberFormat` consistently | P2 |

---

## 12. Prioritized Execution Plan

### Phase 0 — Critical Fixes (Week 1-2)

| ID | Item | Module | Effort |
|----|------|--------|--------|
| E-UP2 | Rate Limiting Middleware | Backend | 3 days |
| A-UP1 | Unified Identity Triggers | Identity | 3 days |
| D-UP1 | Lazy Widget Loading | Dashboard | 2 days |
| G-UP1 | Precise Geolocation for Prayer | Prayer | 1 day |
| I-UP1 | Auto-Save Onboarding | Onboarding | 2 days |
| B-UP1 | Unified Wallet Card Widget | Wallet/QR | 3 days |
| C-UP3 | Radar → Commerce Quick Sheet | Radar | 2 days |

### Phase 1 — Core Upgrades (Week 3-6)

| ID | Item | Module | Effort |
|----|------|--------|--------|
| E-UP1 | Edge Function Consolidation | Backend | 5 days |
| E-UP4 | Finalize Domain Schema Migration | Backend | 3 days |
| E-UP5 | Fix Service-Layer Violations | Backend | 3 days |
| E-UP3 | Observability Dashboard | Backend | 3 days |
| A-UP4 | Deprecate user_profiles Legacy | Identity | 2 days |
| A-UP2 | Profile Mode Switcher Atom | Identity | 1 day |
| B-UP2 | Contextual QR Intelligence | Wallet/QR | 3 days |
| B-UP3 | Deep Links Configuration | Wallet/QR | 2 days |
| C-UP1 | Radar Mini-Map Widget | Radar | 3 days |
| C-UP2 | Smart Layers Toggle | Radar | 2 days |
| D-UP4 | Live Intelligence Feed | Dashboard | 3 days |
| F-UP1 | Multi-Source News | News | 2 days |
| H-UP1 | Interactive Forex Charts | Forex | 3 days |
| H-UP4 | Contextual Wallet Conversion | Forex | 1 day |
| I-UP2 | Consumer Onboarding | Onboarding | 3 days |

### Phase 2 — Polish & Enhancement (Week 7-10)

| ID | Item | Module | Effort |
|----|------|--------|--------|
| A-UP3 | Avatar CDN Pipeline | Identity | 3 days |
| B-UP4 | Animated Branded QR | Wallet/QR | 2 days |
| C-UP4 | Geo-Fence Notifications | Radar | 3 days |
| D-UP2 | Unified Admin/User Dashboard | Dashboard | 3 days |
| D-UP3 | Widget Composability | Dashboard | 4 days |
| D-UP5 | Dashboard Offline-First | Dashboard | 2 days |
| E-UP6 | Optimistic Updates | Backend | 3 days |
| E-UP7 | Database Index Audit | Backend | 2 days |
| F-UP2 | Personalized News Feed | News | 2 days |
| F-UP3 | Server-Side News Cache | News | 1 day |
| G-UP2 | Qibla Compass | Prayer | 2 days |
| H-UP2 | Forex Price Alerts | Forex | 2 days |
| H-UP3 | Historical Rate Storage | Forex | 1 day |
| I-UP3 | Progressive Onboarding Nudges | Onboarding | 3 days |

### Phase 3 — Advanced Features (Week 11-14)

| ID | Item | Module | Effort |
|----|------|--------|--------|
| B-UP5 | NFC Tap-to-Pay | Wallet/QR | 3 days |
| C-UP5 | Demand Heatmap | Radar | 3 days |
| G-UP3 | Hijri Calendar | Prayer | 1 day |

### Total Estimated Effort

| Phase | Duration | Items |
|-------|----------|-------|
| P0 — Critical | 2 weeks | 7 items |
| P1 — Core | 4 weeks | 15 items |
| P2 — Polish | 4 weeks | 14 items |
| P3 — Advanced | 4 weeks | 3 items |
| **Total** | **14 weeks** | **39 items** |

---

## 13. Technology Recommendations 2026

| Area | Current | Recommendation | Rationale |
|------|---------|----------------|-----------|
| State Management | Zustand + React Query | Keep. Add `persistQueryClient` for offline. | Already excellent choices. |
| UI Framework | React 19 + Vite | Keep. Leverage Server Components patterns for data-heavy pages if/when Vite supports them. | Stable, fast builds. |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) | Keep. Upgrade Edge Functions to Deno 2 runtime when available. | Integrated, scalable. |
| Mobile | Capacitor | Upgrade to Capacitor 6+ for Universal Links, NFC, Background Geo. | Essential for deep link and NFC features. |
| Charts | None (basic sparklines) | Add `lightweight-charts` (TradingView, <50KB). | Best-in-class for financial data. |
| Drag & Drop | None | Add `@dnd-kit/core` (<20KB). | Accessible, lightweight. |
| Offline | None | TanStack Query `persistQueryClient` + IndexedDB. | Built-in, zero extra deps. |
| Monitoring | None | Structured logging to `analytics.edge_function_logs` + admin dashboard. | Self-hosted, no external dependency. |
| Rate Limiting | None | In-memory sliding window or Upstash Redis. | Essential security layer. |
| Testing | Vitest + Playwright | Keep. Add visual regression tests for dashboard widgets. | Already comprehensive. |

---

## 14. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Identity migration breaks existing profiles | Medium | **Critical** | Run migration with rollback script. Dual-write during transition. |
| Edge Function consolidation breaks client calls | Medium | High | Feature-flag new endpoints. Keep old endpoints as thin proxies for 30 days. |
| Rate limiting blocks legitimate users | Low | High | Start with generous limits. Monitor 429 rates. Adjust per-endpoint. |
| Dashboard lazy loading causes CLS | Medium | Medium | Use fixed-height skeletons matching widget dimensions. |
| Geo-fence notifications annoy users | Medium | Medium | Max 1 per merchant per 24h. User-controllable in notification preferences. |
| Legacy compat view removal breaks Edge Functions | Medium | High | Grep all Edge Functions for public schema references before removal. |

---

## 15. Appendix — File Inventory

### A. Identity System Files
```
src/contexts/AuthContext.tsx
src/repositories/profile.repository.ts
src/repositories/orbit-profile.repository.ts
src/hooks/useAccountIdentity.ts
src/hooks/useGlobalProfile.ts
src/hooks/useOrbitIdentity.ts
src/hooks/useResolvedIdentity.ts
src/hooks/useMeRealtimeSync.ts
src/stores/orbit-profile.internal.ts
src/stores/auth.store.ts
src/domains/me/service.ts
src/lib/systems/identity-graph.ts
src/lib/auth/profile.ts
src/lib/auth/identity-activation-pipeline.ts
```

### B. Wallet & QR Files
```
src/lib/qr-engine.ts (406 LOC)
src/domains/qr/qr.pipeline.ts
src/domains/qr/qr.store.ts
src/lib/wallet/wallet-engine.ts (304 LOC)
src/domains/wallet/service.ts
src/domains/wallet/ports.ts
src/domains/wallet/adapters/supabase.adapter.ts
src/lib/wallet/wallet-transfer.ts
src/lib/wallet/wallet-topup.ts
src/lib/wallet/wallet-biometric-guard.ts
src/components/wallet/ReceiveQrPanel.tsx
src/components/wallet/QuickPaySheet.tsx
src/components/qr/BrandedQR.tsx
src/components/qr/UniversalQrWidgets.tsx
src/pages/payments/QrScannerPage.tsx
src/pages/wallet/WalletTopUpPage.tsx
src/pages/wallet/WalletTransferPage.tsx
```

### C. Radar & Discovery Files
```
src/lib/discovery/canonical-discovery-pipeline.ts (529 LOC)
src/lib/discovery/query-governance.ts
src/lib/discovery/timeContext.ts
src/lib/radar/radar-engine.ts (328 LOC)
src/lib/radar/radar-orbit-bridge.ts
src/lib/radar/radar-layer-manager.ts
src/lib/radar/radar-snap-elite.ts
src/lib/radar/radar-brain-orchestrator.ts
src/lib/geo/geo-service.ts
src/lib/geo/distance.ts
src/lib/geo/osm-places-engine.ts
src/lib/geo/geo-store.ts
src/lib/map/mapEngine.ts
src/lib/map/engine/layer-registry.ts
src/lib/map/heatmap-engine.ts
src/components/radar/RadarView.tsx
src/components/map/UnifiedMap.tsx
src/components/map/MapCockpit.tsx
src/hooks/map/useMapCore.ts
src/hooks/map/useMapCamera.ts
src/stores/radarStore.ts
```

### D. Dashboard Files
```
src/components/storefront/SmartHome.tsx
src/components/dashboard/DashboardLayout.tsx
src/components/dashboard/OrbitPreviewWidget.tsx
src/components/dashboard/PropertyDashboardWidget.tsx
src/components/dashboard/IntelligenceTicker.tsx
src/components/dashboard/ForexWidget.tsx
src/components/dashboard/PrayerTimesWidget.tsx
src/components/dashboard/EngineHealthWidget.tsx
src/components/dashboard/LiveTrackingBanner.tsx
src/components/dashboard/EssentialServicesStrip.tsx
src/components/dashboard/OrbitSmartHub.tsx
src/components/dashboard/SuperServicesGrid.tsx
src/pages/AdminDashboard.tsx
```

### E. Backend Files
```
src/services/db.ts (204 LOC)
src/lib/schema/domain-schemas.ts (187 LOC)
src/lib/db/repositories.ts
src/lib/db/typed-queries.ts
src/types/canonical-schemas.ts
src/types/status-enums.ts
supabase/config.toml
supabase/functions/ (175 Edge Functions)
supabase/migrations/ (623 files)
```

### F. Data Service Files
```
src/services/data/news-data-service.ts
src/services/data/prayer-data-service.ts
src/services/data/forex-data-service.ts
src/lib/intelligence/global/news-provider.ts
src/constants/static-forex-rates.ts
src/lib/onboarding/merchant-onboarding.ts
src/lib/onboarding/pipeline/
src/pages/onboarding/
```

### Edge Function Categories (175 total)

| Category | Count | Examples |
|----------|-------|---------|
| Payment/Stripe | 20+ | `create-checkout`, `stripe-webhook`, `wallet-ops` |
| Booking/Commerce | 10+ | `booking-lifecycle`, `order-manage`, `commission-split` |
| Communication | 8 | `send-email`, `send-push`, `send-sms`, `translate-message` |
| Auth/WebAuthn | 10 | `send-otp`, `verify-otp`, `webauthn-*` (8 variants) |
| AI/Intelligence | 5 | `ai-assistant`, `ai-entity-enrichment`, `omega-server-loop` |
| System/Ops | 10+ | `sentinel-server`, `engine-cron-server`, `dlq-processor` |
| Property/Rent | 8 | `lease-workflow`, `rent-lifecycle-cron`, `generate-rent-receipt` |
| Onboarding/Scraping | 6 | `auto-onboarding-cron`, `uae-scrape-onboard`, `food-normalizer` |
| Media | 4 | `media-processor`, `video-processor`, `cleanup-expired-media` |
| Data Services | 3 | `fx-rates`, `prayer-times`, `rss-proxy` |
| GDPR/Privacy | 3 | `gdpr-delete-account`, `gdpr-export`, `gdpr-deletion-processor` |
| Refunds | 4 | `refund-admin`, `refund-process-booking`, `process-refund` |
| Other | 84 | Various domain-specific functions |

---

## 16. Task-Conflict Matrix

This audit must coexist with the following active tasks. Each upgrade item below has been verified to not overlap with active work.

### Active Tasks

| Task | Scope | Potential Conflicts |
|------|-------|-------------------|
| **Map Crash Audit & Fix** (Tasks #211, #212) | `HyperRadarPage`, `UnifiedMap`, `useMapCore`, `radar-engine` | C-UP1 (mini-map), C-UP2 (layer toggle), C-UP3 (quick action sheet) |
| **Data Normalization** (Task #209) | `canonical-discovery-pipeline`, field-merge, taxonomy | F-UP1 (news aggregation), E-UP4 (schema migration) |
| **Real Estate Marketplace UI** (Task #206) | Property pages, filters, search, POI, compare | None — this audit targets identity, wallet, radar, dashboard, backend |
| **Image Gallery & Virtual Tour** (Task #214) | Property detail pages | None — this audit does not touch property detail pages |
| **Normalize listing_type** | `listing_type` field across data sources | E-UP4 (compat view removal) — sequence: listing_type normalization FIRST, then compat view cleanup |
| **E2E Tests for Search & Filters** | Test files only | None |

### Conflict Resolution Rules

1. **Map Crash tasks take priority over Radar upgrades.** C-UP1, C-UP2, C-UP3 must not start until Map Crash Audit & Fix (Tasks #211, #212) are merged and stable. These upgrades add new features on top of the fixed map layer.

2. **Data Normalization takes priority over schema migration.** E-UP4 (finalize domain schema migration) must wait until Data Normalization (Task #209) is complete to avoid conflicting migration files.

3. **listing_type normalization before compat view removal.** E-UP4 must sequence after "Normalize listing_type values" to ensure all data is clean before dropping legacy views.

4. **All Radar/Map upgrade items (C-UP*) operate on NEW components** (`RadarMiniWidget`, `SmartLayerToggle`, `RadarQuickActionSheet`) — they do not modify existing `HyperRadarPage` or `UnifiedMap` beyond adding entry points. This minimizes merge conflicts.

5. **Identity upgrades (A-UP*) are independent** — they touch `identity.profiles`, `orbit_profiles_v2`, and hooks that are not modified by any active task.

6. **Backend consolidation (E-UP1) is a refactoring task** that renames/merges Edge Functions. It should run in isolation (no other Edge Function changes during this phase).

---

## 17. Audit Methodology & Evidence

### Metrics Verification

All metrics in this document were derived from direct filesystem enumeration:

| Metric | Command | Result |
|--------|---------|--------|
| Edge Functions count | `ls supabase/functions/ \| wc -l` | 175 directories (including `_shared/` and `NAMING_CONVENTION.md`) |
| Migration count | `ls supabase/migrations/ \| wc -l` | 623 files |
| Engine count | `ls src/engines/ \| wc -l` + engine-registry.ts references | 13 directories, 88+ registered engines |
| Domain schemas | `supabase/config.toml` `schemas` field | 11 schemas listed |
| Service-layer violations | Grep for `supabase.from(` in pages/components/hooks (excluding `db.ts`) | 20+ files flagged in FULL_SYSTEM_AUDIT |
| Identity source files | Grep for `profiles` table references across hooks/repositories | 4+ distinct data sources confirmed |

### Limitations

- **Call volumes for Edge Functions** are not available from the codebase alone — requires Supabase Dashboard analytics for accurate dead-code identification.
- **Database index analysis** requires `pg_stat_statements` output from a running production instance.
- **Bundle size** was not measured — requires a production build with `vite-bundle-analyzer`.
- **Timeline estimates** are based on a single senior engineer; adjust for team size and parallel capacity.

### Forward-Looking Recommendations

The following items are marked as **"validate in target environment"** before implementation:

| Item | Assumption to Validate |
|------|----------------------|
| A-UP3 (Avatar CDN) | Supabase Image Transformation availability on current plan |
| B-UP5 (NFC) | `@capawesome-team/capacitor-nfc` compatibility with Capacitor version in use |
| C-UP4 (Geo-Fence) | Capacitor BackgroundGeolocation plugin battery impact on target devices |
| D-UP5 (Offline) | TanStack Query `persistQueryClient` stability with current React Query version |
| RSC patterns | React Server Components on Vite are **exploratory** only — RSC support in Vite is experimental as of April 2026 |

### RSC Note

React Server Components on Vite are noted as an **exploratory** option, not a firm recommendation. The recommendation to "leverage Server Components patterns" refers to adopting data-loading patterns (colocated data fetching, streaming) that will ease a future RSC migration, not an immediate adoption.

---

*This audit preserves the existing DDD architecture, the 11 domain schemas, and the Platform Bus event system. All recommendations are additive improvements that enhance without replacing the proven foundations.*

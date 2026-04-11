# EASY-LOCS AUTO-PILOT MONDIAL — AUDIT COMPLET

**Date**: 2026-04-11
**Scope**: Full platform audit — all domains, routes, services, cards, taxonomy, flows
**Goal**: Map every critical area, classify issues P0-P3, establish baseline for industrialization

---

## 1. ARCHITECTURE MAP

### 5 Pillars
| Pillar | Routes | Store | Service Layer | Status |
|--------|--------|-------|---------------|--------|
| Dashboard | `/`, `/dashboard`, `/dashboard/*` | `usePropertyManagementStore` | `propertyService`, `realEstatePropertyService` | ⚠️ Cards partially dead |
| Radar | `/radar`, `/explore`, `/food/*`, `/travel/*`, `/property-hub`, `/s/:slug` | `useRadarStore`, `useMapStore` | `canonical-discovery-pipeline` | ✅ Functional |
| Orbit | `/orbit`, `/orbit/:id`, `/orbit/contacts` | `useOrbitMessagingStore`, orbit/* stores | `orbit.service` (domain) | ✅ Hardened |
| Wallet | `/wallet`, `/wallet/top-up`, `/checkout`, `/pay`, `/pos` | `useWalletStore`, `useCartStore` | `wallet.service` (domain), edge functions | ✅ Hardened |
| Me | `/me`, `/settings/*`, `/merchant/*`, `/driver/*`, `/seller` | various | `userService`, `merchantService` | ⚠️ Partially wired |

### Domain Layers
- **Domains** (`src/domains/`): `wallet`, `orbit`, `cards`, `call` — Hexagonal architecture ✅
- **Services** (`src/services/`): 15+ service modules — Uses `db()` pattern ✅
- **Lib** (`src/lib/`): Core infrastructure — 30+ modules ✅
- **Stores** (`src/stores/`): 40+ Zustand stores — Some fragmentation ⚠️

---

## 2. CRITICAL FLOW INVENTORY

### P0 — Mission Critical
| Flow | Implementation | Instrumented | Tested | Status |
|------|---------------|--------------|--------|--------|
| OTP Login | `phone-identity.ts` + Edge Function | ✅ Rate-limited | ❌ No e2e | ⚠️ |
| Session Restore | Supabase Auth | Partial | ❌ | ⚠️ |
| Wallet Top-Up | `wallet-topup.ts` → Stripe → webhook | ✅ Idempotent | ❌ No e2e | ⚠️ |
| Wallet Transfer | `wallet-transfer.ts` → atomic RPC | ✅ PIN + audit | ❌ No e2e | ⚠️ |
| Payment Authorize/Capture/Settle | `wallet-ops` Edge Function | ✅ Anomaly scoring | ❌ No e2e | ⚠️ |
| Message Send | `orbit.service.ts` actionGuard | ✅ Single-path | ❌ | ⚠️ |
| Call Setup | Supabase Realtime broadcast | ✅ Signaling | ❌ | ⚠️ |

### P1 — Business Critical
| Flow | Status |
|------|--------|
| Contact Sync | ✅ Implemented, needs metrics |
| Dashboard Card Click → Destination | ⚠️ Some dead cards |
| Listing Publish (Gate Runner) | ✅ 7-gate pipeline |
| Food Order Flow | ⚠️ State machine exists, not fully wired |
| Hotel Booking | ⚠️ Partial |
| Service Booking | ⚠️ Partial |

---

## 3. DASHBOARD CARDS INVENTORY

### Card Registry Status
| Card | Classification | Wired | Adapter | DeepLink Works |
|------|---------------|-------|---------|---------------|
| Hero Banner | utility_navigation | ✅ | `useHeroBannerCard` | ✅ |
| Quick Actions | utility_navigation | ✅ | `useQuickActionsCard` | ✅ |
| Category Grid | utility_navigation | ✅ | `useCategoryGridCard` | ✅ |
| Trending Section | business_data | ✅ | `useTrendingSectionCard` | ✅ |
| Wallet Balance | business_data | ✅ | `useWalletBalanceCard` | ✅ |
| Orbit Recent Chats | business_data | ✅ | `useOrbitRecentChatsCard` | ✅ |
| Radar Preview | business_data | ✅ | Live map widget | ✅ |
| Currency Widget | business_data | ✅ | `CurrencyWalletWidget` | ✅ |
| Ops Metrics | business_data | ❌ ORPHAN | `useOpsMetricsCard` | ❌ Not rendered |
| Super Metrics | business_data | ❌ ORPHAN | Adapter exists | ❌ Not rendered |
| Driver Status | business_data | ❌ ORPHAN | `useDriverStatusCard` | ❌ Legacy fetch |
| Seller Businesses | business_data | ❌ ORPHAN | `useSellerBusinessesCard` | ❌ Legacy fetch |
| Onboarding Checklist | local_only_temporary | ⚠️ STUB | Returns static | N/A |

### Dead Card Issues
- **4 orphan cards** not connected to their dashboard pages
- **Admin/Driver/Seller dashboards** still use legacy direct-fetch instead of card registry
- **SmartQuickActions** lacks loading/error lifecycle states
- **Essential Services Strip** has no error boundary

---

## 4. TAXONOMY & VERTICAL AUDIT

### Canonical Verticals (13)
`food`, `grocery`, `shops`, `services`, `health`, `fitness`, `property`, `stay`, `mobility`, `utility`, `beauty`, `experiences`, `healthcare`

### Radar Categories (7)
`all`, `food`, `grocery`, `shops`, `services`, `property`, `utility`

### Conflicts Found
| Issue | Severity | Details |
|-------|----------|---------|
| DB stores "hotel" but canonical is "stay" | P2 | Fixed via VERTICAL_ALIASES + useHomeSections resolver |
| "healthcare" has no Radar category | P3 | Falls to "services" via default |
| "beauty", "fitness" have no Radar mapping | P3 | Not exposed in Radar UI |
| Some fallback data uses `vertical: "stay"` | P2 | Resolved via resolveHomeSection() |
| RadarMainCategory missing "healthcare" | P3 | Collapsed into "services" |

### Gate Runner Status: ✅ Operational
7 gates: schema → taxonomy → media → confidence → duplicate → canonical_integrity → publish

---

## 5. ARCHITECTURE VIOLATIONS

### Direct Supabase in UI (FORBIDDEN)
| Component | Line |
|-----------|------|
| `OrdersManager.tsx` | L2 |
| `AuctionManager.tsx` | L5 |
| `BuyerOrderTracker.tsx` | L5 |
| `BuyerDeliveryDashboard.tsx` | L6 |
| `FleetManagementDashboard.tsx` | L5 |
| `LiveDeliveryChat.tsx` | L13 |
| `MerchantPaymentHistory.tsx` | L5 |
| `MerchantKitchenQueue.tsx` | L5 |
| `KitchenQueue.tsx` | L5 |
| `SocialLoginButtons.tsx` | L2 |
| `ServiceBookingCalendar.tsx` | L1 |
| `RealtimeMessageToast.tsx` | L7 |

**Total: 12 violations** — All must migrate to service layer

---

## 6. OBSERVABILITY STATUS

### What Exists ✅
- Sentry frontend with PII scrubbing
- Auto-protect system (11 domains, 13 issue categories)
- Auto-heal engine
- Domain instrumentation
- Architecture quality gates
- Orbit-specific observability buffer
- Kill switches via engine_supervisor table
- Health check edge function
- Unified monitor with 3 modes

### What's Missing ❌
- **Structured JSON logger** (shared) — logs are ad-hoc console.log/warn
- **Platform event bus** — no canonical event system
- **Control plane** — no central nervous system
- **Domain health scores** — no aggregated scoring
- **Per-domain error boundaries** — only generic FeatureErrorBoundary
- **OpenTelemetry traces** — no trace propagation
- **Session replay** — Sentry Replay not configured
- **Release tagging** — no version correlation
- **Incident priority engine** — no automated triage
- **SLO / error budgets** — not defined

---

## 7. P0/P1/P2/P3 CLASSIFICATION

### P0 — IMMEDIATE (Security / Money / Auth / Core)
1. ❌ No structured logger — errors lost in noise
2. ❌ No platform event bus — domains can't communicate canonically
3. ❌ No control plane — no central oversight
4. ❌ 12 architecture violations (direct Supabase in UI)
5. ❌ No e2e tests on any critical flow
6. ❌ No session replay on critical paths
7. ❌ Wallet flows lack e2e test coverage

### P1 — URGENT (Business Critical)
1. ⚠️ 4 orphan dashboard cards not rendered
2. ⚠️ Admin/Driver/Seller dashboards bypass card registry
3. ⚠️ No domain-specific error boundaries
4. ⚠️ No domain health scoring
5. ⚠️ No incident priority engine
6. ⚠️ No feature flags/kill switches for UI features
7. ⚠️ Food/Hotel/Service booking flows partially wired

### P2 — IMPORTANT (Quality / Stability)
1. Taxonomy "hotel" vs "stay" naming inconsistency (fixed)
2. Radar categories missing healthcare/beauty/fitness
3. No OpenTelemetry trace propagation
4. No release tagging in Sentry
5. 40+ Zustand stores with some fragmentation
6. SmartQuickActions lacks lifecycle states

### P3 — BACKLOG (Polish / Tech Debt)
1. Documentation needs canonical taxonomy rules doc
2. Dead code in legacy dashboard pages
3. Storybook stories may be stale
4. Bundle size not monitored
5. No nightly audit jobs
6. No Lighthouse CI

---

## 8. EXECUTION ORDER

**Phase 1 — Foundation (This Session)**
1. ✅ Structured JSON logger
2. ✅ Platform event bus
3. ✅ Control plane core
4. ✅ Domain health system
5. ✅ Per-domain error boundaries
6. ✅ Architecture enforcement rules
7. ✅ Dashboard card registry hardening

**Phase 2 — Quality Gates (Next)**
- CI/CD pipelines
- Import boundary enforcement
- Coverage thresholds
- Architecture tests

**Phase 3 — Full Observability**
- OpenTelemetry integration
- Session replay activation
- Release tagging
- Alert routing

**Phase 4 — Critical Journeys**
- E2E tests for auth, orbit, wallet
- Booking flow completion
- Scraping publish gate testing

**Phase 5 — Auto-Pilot Mature**
- Canary releases
- Synthetic monitoring
- SLO/error budgets
- Anomaly detection

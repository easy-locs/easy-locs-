# Easy-Locs® Progressive Upgrade Plan — Business-Ready Edition
> Updated: 2026-03-10 — Non-destructive, 3-layer approach  
> Status: **VALIDATED by product owner**

---

## Philosophy

**Stabilize first → Reinforce second → Scale third**  
No full rewrites. Every change is additive and backward-compatible.

---

## Current State Assessment

### ✅ Already Solid (Keep as-is)
| Area | Status | Details |
|------|--------|---------|
| Lazy loading | ✅ | 90+ pages via React.lazy |
| Bundle splitting | ✅ | Manual chunks: React, Three.js, Radix, Recharts, Supabase, jsPDF |
| React Query | ✅ | 5min stale / 10min GC / no refetch on focus |
| Sync Engine | ✅ | 10 event types, 10s dedup, strict context validation |
| Communication Pipeline | ✅ | Triple-sync (DB + notification + email) centralized |
| Deep-link system | ✅ | Unified route resolution via `shared/routes.ts` |
| Auth hardening | ✅ | Retry logic, hydration guard, deferred subscription |
| PWA | ✅ | SW cleanup, Safari-safe |
| Permissions | ✅ | 6-level RBAC (owner→member), 30+ permissions, DB-enforced |
| Monitoring | ✅ | Runtime errors, network failures, long tasks, CLS, page load |
| Booking lifecycle | ✅ | 8 statuses: new→pending→awaiting_payment→confirmed→modified→cancelled→completed→refunded |

### ⚠️ Bottlenecks Requiring Action
| Area | Issue | Impact | Layer |
|------|-------|--------|-------|
| `useRentalData` | ~~N+1 queries for country filter~~ | High | ✅ Fixed |
| `shared/index.ts` | ~~Duplicate barrel exports~~ | Low | ✅ Fixed |
| `AuthContext` | 327 lines, 6+ queries on login | Medium | Layer 2 |
| `NotificationBell` | 457 lines, heavy imports | Medium | Layer 2 |
| Calendar sync | Seasonal + Marketplace query independently | Medium | Layer 2 |
| Image loading | No `loading="lazy"` on photos | Medium | Layer 1 |
| Explore page | No pagination on public queries | High | Layer 1 |
| Booking lifecycle | Logic duplicated across 3 components | High | Layer 2 |
| Mobile overflow | Some cards/tables break on 375px | Medium | Layer 1 |

---

## LAYER 1: Immediate Performance & Stability
> **Timeline:** This sprint  
> **Risk:** Low — no structural changes

### 1.1 Image Lazy Loading
- Add `loading="lazy"` to ServiceCard, ListingPhotoGallery, PropertyPhotos
- **Type:** Technical | **Affects:** UX (load speed) | **DB:** No | **QA:** Visual check on mobile

### 1.2 Explore Page Pagination
- Limit public queries to 50 results, add "Load more" button
- **Type:** Technical + UX | **Affects:** UX | **DB:** No | **QA:** Test all 3 tabs (Seasonal, Real Estate, Services)

### 1.3 Mobile-First Stability Audit
- **Text overflow:** Audit all cards/headers on 375px viewport
- **Button clickability:** Ensure all touch targets ≥ 44px
- **Card spacing:** Fix cramped margins on mobile grids
- **Headers/navigation:** Verify sidebar collapse and mobile menu
- **Form usability:** Test all booking/service forms on iPhone Safari
- **Type:** UX | **Affects:** UX | **DB:** No | **QA:** Full mobile pass on iPhone/Android

### 1.4 Public Pages & SEO Stability Guarantee
**Current state — all confirmed stable:**
- ✅ All public URLs (`/book/:slug`, `/listing/:slug`, `/store/:slug`, `/shop/:cat-:city`, etc.)
- ✅ Sitemap generation via `vite-plugin-sitemap.ts`
- ✅ Canonical tags via `SEOHead` component
- ✅ Meta/OG structure per page
- ✅ `hreflang` for 15 languages
- ✅ Programmatic SEO routes (`/country/:slug`, `/city/:slug`, `/services/:service/:city`)
- ✅ `SlugResolver` for clean short URLs

**Rule:** No SEO route changes during any refactor. All public URL patterns are frozen.
- **Type:** Constraint | **QA:** Run sitemap validator after each deploy

---

## LAYER 2: Structural Reinforcement
> **Timeline:** Next 2 sprints  
> **Risk:** Medium — partial refactors, no breaking changes

### 2.1 Marketplace End-to-End Lifecycle Centralization

**Current status of each step:**

| Step | Status | Where | Gap |
|------|--------|-------|-----|
| 1. Inquiry | ✅ | `PublicServiceBooking` → booking form | — |
| 2. Quotation/Approval | ⚠️ | Manual status change only | No structured quote flow |
| 3. Booking confirmation | ✅ | `BookingRequestCenter` → status update | — |
| 4. Payment link | ✅ | `PaymentMethodSelector` + Stripe/PayPal/Bank | — |
| 5. Payment status | ✅ | Webhook + manual confirmation | — |
| 6. Modification | ⚠️ | Status "modified" exists | No structured modification form |
| 7. Cancellation | ✅ | Status update + notification | — |
| 8. Refund logic | ⚠️ | Status "refunded" exists | No Stripe refund automation |
| 9. Provider confirmation | ✅ | In-app notification + email | — |
| 10. Communication history | ✅ | Grouped by `context_id` in messages | — |

**Action plan:**
- [ ] Create `useBookingLifecycle(bookingType)` hook — centralize status transitions
- [ ] Add structured quotation step (optional quote amount before confirmation)
- [ ] Add structured modification form (date/quantity change with re-notification)
- [ ] Wire Stripe refund API call for automated refunds
- [ ] All steps fire through `dispatchSyncEvent` — no duplicate triggers
- **Type:** Technical + UX | **Affects:** UX, DB (new columns for quotes) | **QA:** Full E2E test per booking type

### 2.2 Roles & Permissions Full Audit

**Current RBAC matrix (verified in `src/lib/permissions.ts`):**

| Permission | Owner | Admin | Agent | Staff | Accountant | Member |
|-----------|-------|-------|-------|-------|------------|--------|
| org:manage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org:billing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| org:invite | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| properties:write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| properties:delete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| tenants:write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| leases:write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| payments:write | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| accounting:write | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| bookings:manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| bookings:write | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| services:write | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| documents:sign | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| messages:write | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| leads:write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Cross-role portals:**
| Portal | Role | Detection | Status |
|--------|------|-----------|--------|
| `/dashboard/*` | Owner/Admin/Agent/Staff | `org_members` table | ✅ |
| `/tenant/*` | Tenant | `tenants.tenant_user_id` | ✅ |
| `/client/*` | Client | No org + no tenant link | ✅ |
| Dual role | Landlord+Tenant | Both detected | ✅ switchable |

**Gaps identified:**
- [ ] `PermissionGate` used in some pages but not all write actions — needs audit pass
- [ ] Staff can `bookings:write` but not `bookings:manage` — verify UI hides manage-only actions
- [ ] Accountant has no `messages:read` — may block communication visibility
- [ ] Provider profile (`marketplace_providers`) — no specific `provider` role in org_members
- [ ] RLS policies enforce `org_id` scoping but don't check role level for write operations
- **Type:** Security + UX | **Affects:** DB (RLS policies), UX | **QA:** Permission matrix E2E test per role

### 2.3 Calendar Data Unification
- Create `useCalendarData(propertyId)` merging:
  - Seasonal reservations (`booking_requests`)
  - iCal imports (`reservations`)
  - Marketplace bookings (`marketplace_bookings` with date ranges)
  - Concierge orders (`concierge_orders`)
- Single source for PropertyCalendar, ChannelManager, BookingAvailabilityCalendar
- **Type:** Technical | **Affects:** UX (unified availability) | **DB:** No (read-only) | **QA:** Calendar accuracy test

### 2.4 Auth Context Split
- Split `AuthContext` (327 lines) into 3 smaller contexts:
  - `AuthSessionContext`: session, user, signOut (rarely changes)
  - `ProfileContext`: userType, country, currency, orgId (changes on org switch)
  - `SubscriptionContext`: plan, trial, gating (changes on payment)
- Prevents full-tree re-renders when subscription check completes
- **Type:** Technical | **Affects:** UX (faster renders) | **DB:** No | **QA:** Auth flow regression test

### 2.5 Provider Data Caching
- Cache provider/storefront data in React Query (10min stale)
- Currently re-fetched on every public page visit
- **Type:** Technical | **Affects:** UX | **DB:** No | **QA:** Public page load test

---

## LAYER 3: Scalable Architecture
> **Timeline:** Q3-Q4 2026  
> **Risk:** Higher — requires careful migration

### 3.1 Move Heavy Logic to Edge Functions
- Receipt PDF generation → Edge Function (reduce bundle ~200KB)
- Invoice PDF generation → Edge Function
- Benefits: background processing, smaller client bundle
- **Type:** Technical | **Affects:** UX (speed), DB (storage) | **QA:** PDF output comparison test

### 3.2 Database Optimization
- Composite indexes: `(org_id, country)`, `(org_id, status)`, `(service_id, status)`
- Materialized views for dashboard KPIs
- RPC functions for complex aggregations (monthly revenue, occupancy rate)
- **Type:** Technical | **Affects:** DB | **QA:** Query performance benchmark

### 3.3 Real-time Subscriptions
- Add Supabase Realtime channels for:
  - Notifications (instant bell updates)
  - Messages (live chat)
  - Booking status changes (live dashboard)
- **Type:** Technical | **Affects:** UX | **DB:** Enable realtime on tables | **QA:** Concurrent user test

### 3.4 State Management Upgrade
- Consider Zustand for cross-component state
- Replace localStorage-based org/role switching
- Keep React Query for server state
- **Type:** Technical | **Affects:** UX | **DB:** No | **QA:** Full regression

---

## PRIORITY 5: Monitoring & Observability

### Current State (already implemented in `monitoring.ts`):
| Capability | Status | Details |
|-----------|--------|---------|
| Runtime error logging | ✅ | Global `window.onerror` + `unhandledrejection` |
| Network failure tracking | ✅ | Fetch interceptor catches 500+ errors |
| Long task detection | ✅ | PerformanceObserver > 200ms |
| CLS detection | ✅ | Layout shift > 0.25 flagged |
| Slow page load | ✅ | domContentLoaded > 3s flagged |
| Audit log persistence | ✅ | Critical errors saved to `audit_logs` table |
| Sync health checks | ✅ | 6 checks: booking-payment sync, notification queue, edge functions |

### Gaps to fill:
- [ ] **Failed payment tracking:** Add `pushEvent` call in Stripe webhook error paths
- [ ] **Failed email tracking:** Add error callback in `send-notification-email` edge function
- [ ] **Booking lifecycle failures:** Log when `dispatchSyncEvent` dedup rejects or context validation fails
- [ ] **Slow query visibility:** Add timing to `useRentalData.loadAll()` and flag if > 2s
- [ ] **Dashboard visibility:** Surface monitoring events in `HealthDashboard` component
- **Type:** Technical | **Affects:** DB (audit_logs) | **QA:** Simulate failures and verify logging

---

## Implementation Priority Order

| Priority | Action | Layer | Sprint |
|----------|--------|-------|--------|
| 1 | Mobile stability audit & fixes | L1 | Current |
| 2 | Image lazy loading | L1 | Current |
| 3 | Explore pagination | L1 | Current |
| 4 | Booking lifecycle hook | L2 | Next |
| 5 | Calendar unification | L2 | Next |
| 6 | Permission audit pass | L2 | Next |
| 7 | Monitoring gaps | L2 | Next |
| 8 | Auth context split | L2 | Sprint +2 |
| 9 | Quotation + modification flows | L2 | Sprint +2 |
| 10 | Edge Function PDFs | L3 | Q3 2026 |
| 11 | DB indexes + materialized views | L3 | Q3 2026 |
| 12 | Realtime subscriptions | L3 | Q4 2026 |

---

## Rules (Locked)

1. **No full rewrites** — progressive improvement only
2. **134+ Vitest tests must pass** after each change
3. **All public URLs frozen** — no SEO route changes
4. **Architecture freeze respected** — 3-level hierarchy (Org → Country → Module)
5. **Zero-commission model preserved** — no payment intermediation
6. **Mobile-first** — every UI change tested at 375px minimum
7. **Every sync event through `dispatchSyncEvent`** — no legacy duplicate triggers

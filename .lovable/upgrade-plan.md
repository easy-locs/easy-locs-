# Easy-Locs Progressive Upgrade Plan
> Updated: 2026-03-10 — Non-destructive, 3-layer approach

## Current State Assessment

### ✅ What's Already Solid (Keep)
- **Lazy loading**: All 90+ pages are lazy-loaded via `React.lazy`
- **Bundle splitting**: Manual chunks isolate React, Three.js, Radix, Recharts, Supabase
- **React Query**: Configured with 5min stale / 10min GC / no refetch on focus
- **Sync Engine**: Unified `dispatchSyncEvent` with deduplication (10s window)
- **Communication Pipeline**: Triple-sync (DB message + notification + email) centralized
- **Deep-link system**: Unified route resolution via `shared/routes.ts`
- **Auth hardening**: Retry logic, hydration guard, deferred subscription check
- **PWA**: Configured with SW cleanup, Safari-safe (no runtimeCaching)

### ⚠️ Bottlenecks Identified

| Area | Issue | Severity | Fix Layer |
|------|-------|----------|-----------|
| `useRentalData` | 555 lines, 3 sequential queries + N+1 for country filter | High | Layer 1 |
| `AuthContext` | 327 lines, 6+ queries on every login | Medium | Layer 2 |
| `NotificationBell` | 457 lines, imports framer-motion + 12 date-fns locales | Medium | Layer 1 |
| `shared/index.ts` | Duplicate barrel exports | Low | Layer 1 |
| `DashboardLayout` | Re-renders on every nav change (large component) | Medium | Layer 2 |
| Calendar sync | Seasonal + Marketplace calendars query independently | Medium | Layer 2 |
| Image loading | No `loading="lazy"` on property/service photos | Medium | Layer 1 |
| Explore page | Fetches all listings/services without pagination | High | Layer 1 |

---

## Layer 1: Immediate Performance (No Structure Change)

### 1.1 ✅ Fix barrel export duplicates in `shared/index.ts`
### 1.2 React Query stale time tuning — already at 5min (good)
### 1.3 Add `loading="lazy"` to photo-heavy components (ServiceCard, ListingPhotoGallery)
### 1.4 Reduce `useRentalData` N+1: batch country filter into single query
### 1.5 Memoize heavy computed values in NotificationBell
### 1.6 Add pagination to Explore page queries (limit 50)

## Layer 2: Structural Reinforcement (Partial Refactor)

### 2.1 Extract booking lifecycle logic into `useBookingLifecycle` hook
- Currently duplicated across SeasonalRentals, BookingsManager, ConciergeOperations
- Centralize status transitions: pending → confirmed → paid → completed → cancelled
- Single hook handles all 3 booking types via discriminated union

### 2.2 Split `AuthContext` into auth + profile + subscription contexts
- Auth: session, user, signOut (rarely changes)
- Profile: userType, country, currency, orgId (changes on switch)
- Subscription: plan, trial, gating (changes on payment)
- Prevents re-renders of entire tree when subscription checks complete

### 2.3 Unified calendar data layer
- Create `useCalendarData(propertyId)` that merges:
  - Seasonal reservations
  - iCal imported events
  - Marketplace bookings (date-range type)
  - Concierge orders
- Single source for PropertyCalendar, ChannelManager, BookingAvailabilityCalendar

### 2.4 Provider data caching
- Cache provider/storefront info in React Query with 10min stale
- Currently re-fetched on every public page load

### 2.5 Marketplace communication full sync
- Already wired via `dispatchSyncEvent` — verify all 8 lifecycle events fire correctly
- Add `booking_modified` event for date/quantity changes
- Ensure guest reply thread uses same `context_id` for grouping

## Layer 3: Future Scalability (Deeper Rebuild — Later)

### 3.1 Move heavy business logic to Edge Functions
- Receipt PDF generation (currently client-side in `useRentalData`)
- Invoice generation (currently client-side in `InvoicePdfGenerator`)
- Benefits: reduces bundle size, enables background processing

### 3.2 Database query optimization
- Create materialized views for dashboard stats (property count, rent totals)
- Add composite indexes for frequent queries (org_id + country, org_id + status)
- Consider RPC functions for complex aggregations

### 3.3 State management upgrade
- Consider Zustand for cross-component state (replaces localStorage-based org/role switching)
- Keep React Query for server state

### 3.4 Micro-frontend readiness
- Each pillar (Long-term, Seasonal, Marketplace) could become independent lazy chunks
- Shared foundation stays as common dependency
- Enables independent deployment per module

### 3.5 Real-time optimization
- Currently no Realtime subscriptions active
- Add selective Realtime for: notifications, messages, booking status changes
- Use Supabase channels with row-level filtering

---

## Priority Order

1. **Now**: Layer 1 fixes (this session)
2. **Next sprint**: Layer 2.1 (booking lifecycle) + 2.3 (calendar sync)
3. **Following sprint**: Layer 2.2 (context split) + 2.4 (provider cache)
4. **Q3 2026**: Layer 3.1 (edge functions for PDF) + 3.2 (DB optimization)
5. **Q4 2026**: Layer 3.3-3.5 (state management + real-time)

## Rules
- **No full rewrites** — progressive improvement only
- **Test after each layer** — 134+ Vitest tests must pass
- **Preserve all public URLs** — SEO routes are locked
- **Architecture freeze respected** — 3-level hierarchy unchanged

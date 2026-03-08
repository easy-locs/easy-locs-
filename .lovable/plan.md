

## Marketplace End-to-End Implementation Plan

### Current State Analysis

The codebase has **two parallel marketplace systems** that are disconnected:

1. **Concierge system** (`concierge_services` + `concierge_orders`) — fully typed, used by `ConciergeServices.tsx` and `PublicServiceBooking.tsx`
2. **Marketplace system** (`marketplace_providers` + `marketplace_services` + `marketplace_bookings`) — exists in DB but accessed via `as any` casts everywhere, used by `ActivitiesMarketplace.tsx`

The `orgs` table already acts as a "business space" with country, currency, payment settings, and branding. Each user can own multiple orgs. **This is the foundation** — no new business_spaces table is needed.

### Problem Summary

- Marketplace tables exist but queries use `as any` (no type safety, fragile)
- No unified booking slug on `marketplace_services` — public booking page (`/book/:slug`) only queries `concierge_services`
- Calendar/availability not enforced on marketplace bookings (no double-booking prevention)
- No post-booking notifications or messaging thread creation for marketplace bookings
- Store/Shop pages query both systems but marketplace services have no slugs for direct booking links
- No multi-org switcher in the dashboard (user sees only one org at a time)

### Implementation Plan (6 phases)

---

#### Phase 1: Database — Add missing columns + unify booking flow

**Migration 1**: Add `booking_slug` column to `marketplace_services` (unique, not null, with default generation trigger). This enables `/book/:slug` to resolve marketplace services too.

**Migration 2**: Add `date_from`, `date_to` columns to `marketplace_bookings` for date-range bookings (car rental, yacht). Add unique constraint to prevent overlapping bookings per service.

**Migration 3**: Create a DB function `check_availability(service_id, date_from, date_to)` that returns boolean, checking both `concierge_orders` and `marketplace_bookings` for conflicts.

**Migration 4**: Add RLS policies on `marketplace_providers`, `marketplace_services`, `marketplace_bookings` — currently missing or incomplete. Public read for active items, authenticated write scoped to `org_id`.

---

#### Phase 2: Unify Public Booking Page

Update `PublicServiceBooking.tsx` to query **both** `concierge_services` and `marketplace_services` by `booking_slug`. When the source is `marketplace_services`, insert into `marketplace_bookings` instead of `concierge_orders`. The UI stays identical — same calendar, same form, same payment flow.

This single change makes every marketplace listing bookable via `/book/:slug`.

---

#### Phase 3: Remove `as any` casts — Type-safe marketplace queries

The `marketplace_providers`, `marketplace_services`, and `marketplace_bookings` tables already exist in `types.ts`. Remove all `as any` casts in:
- `ActivitiesMarketplace.tsx`
- `ProviderStorefront.tsx`
- `StorePage.tsx`
- `ShopCategoryPage.tsx`

This gives compile-time safety and catches column mismatches immediately.

---

#### Phase 4: Calendar synchronization + double-booking prevention

Update `ServiceBookingCalendar.tsx` to:
1. Query existing bookings for the service (from both tables based on source)
2. Disable already-booked dates in the calendar picker
3. Before insert, call `check_availability()` DB function to prevent race conditions

For range-based categories (car rental, yacht, accommodation): calculate `days × price` dynamically and show total before submission.

---

#### Phase 5: Post-booking automation

After any successful booking insert (concierge or marketplace):
1. Call `send-notification-email` edge function to notify provider
2. Call `send-notification-email` to send guest confirmation
3. Insert a `messages` row to create a conversation thread linked to the booking
4. Invalidate calendar queries so availability updates in real-time

This is currently partially done for concierge but missing for marketplace.

---

#### Phase 6: Multi-org dashboard + store links

**Multi-org switcher**: Add an org selector in `DashboardLayout.tsx` header. Query all orgs where `owner_user_id = user.id`. Allow switching `orgId` in AuthContext.

**Store link generation**: Each org gets a store URL `/store/:org-slug` (using `orgs.name` slugified). The `StorePage.tsx` already supports this — just needs the org slug stored.

**Share links**: Ensure `BookingLinkShare.tsx` generates stable `/book/:slug` links for both concierge and marketplace services. Social preview edge function already handles og:image metadata.

---

### What this does NOT change

- Does not rebuild existing concierge or rental management modules
- Does not change the `orgs` table structure (it already has country, currency, payment fields)
- Does not create a separate "business spaces" table — `orgs` IS the business space
- Does not break existing booking flows or dashboard routes

### Files to modify

| File | Change |
|---|---|
| DB migrations (×4) | booking_slug, date columns, availability function, RLS |
| `PublicServiceBooking.tsx` | Dual-source lookup by slug |
| `ActivitiesMarketplace.tsx` | Remove `as any`, add slug generation |
| `ProviderStorefront.tsx` | Remove `as any` |
| `StorePage.tsx` | Remove `as any` |
| `ShopCategoryPage.tsx` | Remove `as any` |
| `ServiceBookingCalendar.tsx` | Fetch + block booked dates |
| `AuthContext.tsx` | Multi-org support |
| `DashboardLayout.tsx` | Org switcher UI |
| `BookingLinkShare.tsx` | Unified slug-based links |


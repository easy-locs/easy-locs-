# Easy-Locs® Progressive Upgrade Plan — Complete Business Edition
> Updated: 2026-03-10 — Non-destructive, 3-layer approach  
> Status: **VALIDATED by product owner**  
> Version: 3.0 — Includes provider model, payment architecture, QA scenarios, delivery checklist

---

## Philosophy

**Stabilize first → Reinforce second → Scale third**  
No full rewrites. Every change is additive and backward-compatible.

---

## PART A — Current State Assessment

### ✅ Already Solid (Keep as-is)
| Area | Status |
|------|--------|
| Lazy loading (90+ pages) | ✅ |
| Bundle splitting (7 vendor chunks) | ✅ |
| React Query (5min stale / 10min GC) | ✅ |
| Sync Engine (10 events, 10s dedup, strict validation) | ✅ |
| Triple-Sync Pipeline (DB + notification + email) | ✅ |
| Deep-link system (unified route resolution) | ✅ |
| Auth hardening (retry, hydration guard) | ✅ |
| PWA (SW cleanup, Safari-safe) | ✅ |
| RBAC (6 levels, 30+ permissions, DB-enforced) | ✅ |
| Monitoring (errors, network, long tasks, CLS) | ✅ |
| Booking lifecycle (8 statuses) | ✅ |
| N+1 query fix in useRentalData | ✅ Fixed |
| Barrel export cleanup | ✅ Fixed |

---

## PART B — CLARIFICATION 1: Provider Operational Model

### Definition
A **Provider** is any professional (freelancer, company, concierge) who publishes services on the marketplace. Providers operate within an **Organization** (`org_id`) and manage their own bookings.

### Provider = Organization Owner/Admin

There is **no separate "provider" role** in the RBAC system. Instead:
- A provider is an **org owner or admin** who has created a `marketplace_providers` record linked to their `org_id`
- The provider profile (`marketplace_providers`) stores public identity + payment config
- All booking data is scoped by `org_id`, not by provider role

### Provider Capabilities Matrix

| Capability | How it works | Status |
|-----------|-------------|--------|
| **Receive bookings** | Public booking form (`/book/:slug`) inserts into `marketplace_bookings` with provider's `org_id` | ✅ Working |
| **View own bookings** | Filtered by `org_id` in `ActivitiesMarketplace` query | ✅ Working |
| **Confirm bookings** | Status update `pending → confirmed` via `BookingDetailDrawer` actions | ✅ Working |
| **Modify bookings** | Status `modified` exists in `BookingStatusBadge` | ⚠️ Status only — no modification form yet |
| **Cancel bookings** | Status update `→ cancelled` + notification + email | ✅ Working |
| **Complete bookings** | Status update `→ completed` | ✅ Working |
| **Send payment links** | `PaymentMethodSelector` → Stripe/PayPal/Bank/Custom link sent via communication pipeline | ✅ Working |
| **Confirm payment** | Manual `payment_confirmed = true` update | ✅ Working |
| **Generate invoices** | `InvoicePdfGenerator` → PDF uploaded to storage → emailed to client | ✅ Working |
| **View communication history** | `BookingCommunicationThread` grouped by `context_id = booking.id` | ✅ Working |
| **View activity log** | `BookingActivityLog` shows all events for a booking | ✅ Working |
| **Only see own data** | All queries filtered by `org_id` + RLS enforced | ✅ Working |

### Provider Isolation Rules
- Provider A cannot see Provider B's bookings (RLS on `org_id`)
- Provider data is scoped per organization
- Public views (`marketplace_services_public`) mask private fields (bank details, commissions)

### Gap: No structured modification form
**Action (Layer 2):** Create a modification dialog that allows date/quantity changes, recalculates price, and triggers `booking_modified` sync event with re-notification to customer.

---

## PART C — CLARIFICATION 2: Zero-Commission Payment Architecture

### Core Principle
> The platform is a **SaaS tool**, NOT a payment intermediary. All payments flow directly between client and provider.

### Payment Flow Diagram

```
Client → [Selects payment method] → Provider's payment processor
                                    ↓
                              Stripe (provider's account)
                              PayPal (provider's email)
                              Bank Transfer (provider's IBAN)
                              Custom URL (provider's link)
```

### Who Collects Payment
| Method | Collector | Config Location |
|--------|-----------|-----------------|
| Credit Card | Provider's Stripe Connect account | `orgs.stripe_account_id` |
| PayPal | Provider's PayPal email | `marketplace_providers.payment_paypal_email` |
| Bank Transfer | Provider's bank account | `marketplace_providers.bank_iban/bic/holder/name` |
| Custom Link | Provider's custom URL | `marketplace_providers.payment_custom_url` |
| Cash | Provider directly (in person) | N/A — no digital flow |

### How Payment Links Are Generated

1. **Stripe:** Edge Function `create-booking-payment` creates a Checkout Session on the **provider's connected Stripe account** (using `stripe_account` parameter). Session URL is sent to client via email + in-app message.

2. **PayPal:** Direct link generated: `https://paypal.me/{paypal_email}/{amount}`. Sent via communication pipeline.

3. **Bank Transfer:** Provider's IBAN/BIC displayed to client after booking confirmation. Instructions sent via email.

4. **Custom URL:** Provider-configured external payment page URL sent to client.

### Payment Status Tracking

| Source | How tracked | Where stored |
|--------|------------|--------------|
| Stripe webhook | `stripe-webhook` Edge Function decodes `metadata.type` | Updates `payment_status` on booking record |
| Manual confirmation | Provider clicks "Confirm Payment" in BookingDetailDrawer | `payment_confirmed = true` on booking |
| PayPal/Bank/Cash | Provider manually confirms after receiving funds | Same manual confirmation |

### How the App Avoids Acting as Intermediary

1. **No platform Stripe account processes provider payments** — only provider's own connected account
2. **No funds flow through the platform** — Stripe Connect uses `transfer_data.destination` or direct charges
3. **No commission deduction** — `commission_rate = 0` by default (future-ready field exists)
4. **No escrow or holding** — payment goes directly to provider
5. **Invoice is between provider and client** — platform just generates the PDF document
6. **Platform revenue = SaaS subscription only** — billed separately via `create-checkout` Edge Function

### Refund Logic in Zero-Commission Model

| Step | Who | How |
|------|-----|-----|
| 1. Client requests refund | Client contacts provider via booking chat | Communication pipeline |
| 2. Provider approves refund | Provider clicks action in BookingDetailDrawer | Status → `refunded` |
| 3. Actual refund | **Provider initiates directly** in their Stripe dashboard / PayPal / bank | Platform does NOT process refunds |
| 4. Platform records status | Booking status updated to `refunded`, `refunded_at` timestamp set | Notification sent to client |

**Gap (Layer 2):** Add optional Stripe Refund API call via Edge Function (using provider's connected account) for automated card refunds. This is an enhancement, not a requirement — providers can always refund manually.

### Legal Compliance Checklist
- [x] Platform does not hold client funds
- [x] Platform does not process payments on behalf of providers
- [x] No payment splitting or commission deduction
- [x] Invoices clearly show provider as the seller
- [x] Provider configures their own payment methods
- [x] Platform subscription is billed separately

---

## PART D — CLARIFICATION 3: QA by Real Business Scenarios

### Scenario 1: Full Marketplace Booking Lifecycle

| Step | Actor | Action | Expected Result | Roles to Test |
|------|-------|--------|----------------|---------------|
| 1. Browse | Client | Opens `/explore` or `/book/:slug` | Service card displays with price, availability | Client, Anonymous |
| 2. Inquiry | Client | Fills booking form, selects dates/quantity | Booking created with status `pending` | Client, Anonymous |
| 3. Notification | System | Triple-sync fires | Provider gets: in-app notification + email + message in communication center | Provider (Owner) |
| 4. Review | Provider | Opens BookingDetailDrawer via notification deep-link | Sees customer info, service details, amount | Owner, Admin, Agent, Staff |
| 5. Quote (future) | Provider | Sets custom quote amount | Client notified with quote for approval | Owner, Admin |
| 6. Confirm | Provider | Clicks "Confirm" | Status → `confirmed`, client notified | Owner, Admin, Agent |
| 7. Send Payment | Provider | Clicks "Send Payment Link" | Payment link sent via email + message thread | Owner, Admin |
| 8. Pay | Client | Clicks payment link | Stripe Checkout / PayPal / Bank instructions shown | Client |
| 9. Payment Status | System | Webhook or manual confirmation | `payment_confirmed = true`, provider notified | System/Provider |
| 10. Modification | Client | Requests date change via chat | Provider reviews and approves modification | Provider + Client |
| 11. Complete | Provider | Marks booking as completed | Status → `completed`, activity logged | Owner, Admin, Agent |
| 12. Invoice | Provider | Generates invoice PDF | PDF emailed to client with attachment | Owner, Admin |
| 13. Cancel | Either | Cancellation request | Status → `cancelled`, both parties notified | Provider + Client |
| 14. Refund | Provider | Approves refund | Status → `refunded`, client notified | Owner, Admin |

### Scenario 2: Long-Term Rental — Landlord + Tenant

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Landlord | Adds property + tenant | Property and tenant created in DB |
| 2 | Landlord | Creates lease | Lease document generated |
| 3 | Landlord | Generates rent calls | Monthly rent_calls created |
| 4 | Tenant | Receives invitation email | Can create account and link |
| 5 | Tenant | Views dashboard | Sees rent due, documents, receipts |
| 6 | Landlord | Marks payment received | Receipt auto-generated + emailed |
| 7 | Tenant | Views receipt | PDF visible in tenant portal |
| 8 | Landlord | Creates intervention | Tenant notified |

**Roles:** Owner, Admin, Agent (write), Staff (read bookings), Accountant (read payments), Tenant

### Scenario 3: Seasonal Rental — Booking Request

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | Guest | Submits booking via `/listing/:slug` | `booking_requests` row created |
| 2 | Owner | Reviews in Seasonal dashboard | Sees request with dates, guest info |
| 3 | Owner | Confirms + sends payment link | Guest receives email with link |
| 4 | Guest | Pays | Webhook updates status |
| 5 | System | Pre-arrival email (J-2) | Automated via `booking-lifecycle` |
| 6 | Guest | Replies via guest portal | Message threaded to booking |

### Scenario 4: Permission Boundary Testing

| Test | Actor | Expected |
|------|-------|----------|
| Staff tries to delete property | Staff | Action blocked (no `properties:delete`) |
| Accountant tries to send message | Accountant | Action blocked (no `messages:write`) |
| Member tries to confirm booking | Member | Action blocked (no `bookings:write`) |
| Agent tries to manage org settings | Agent | Action blocked (no `org:manage`) |
| Client tries to access `/dashboard` | Client | Redirected to `/client/dashboard` |
| Tenant tries to access `/dashboard` | Tenant | Redirected to `/tenant` |

### Scenario 5: Mobile-First Validation

| Test | Device | Check |
|------|--------|-------|
| Booking form | iPhone 13 mini (375px) | No overflow, all fields reachable, calendar not cropped |
| Service card grid | iPhone 13 (390px) | Cards don't overflow, images lazy-loaded |
| BookingDetailDrawer | iPhone SE (320px) | Sheet scrollable, action buttons clickable (≥44px) |
| Navigation sidebar | Mobile | Collapses to hamburger, all items accessible |
| Payment method selector | Mobile | 2-column grid fits without horizontal scroll |
| Communication center | Mobile | Thread list scrollable, message input above keyboard |

---

## PART E — Delivery Checklist Template

Every implementation block MUST complete this checklist before merge:

```markdown
## Delivery Checklist — [Feature Name]

### What Changed
- [ ] List of files modified
- [ ] List of new files created
- [ ] Database migrations (if any)
- [ ] Edge functions modified (if any)

### What Was Tested
- [ ] Unit tests passing (134+ Vitest)
- [ ] Manual E2E scenario tested (reference scenario #)
- [ ] Error cases tested (invalid input, network failure)

### Roles Tested
- [ ] Owner
- [ ] Admin
- [ ] Agent
- [ ] Staff
- [ ] Accountant
- [ ] Member
- [ ] Tenant
- [ ] Client (free)
- [ ] Anonymous visitor

### Mobile Views Tested
- [ ] 375px (iPhone SE / 13 mini)
- [ ] 390px (iPhone 13/14)
- [ ] 402px (current preview viewport)
- [ ] 768px (tablet)
- [ ] Desktop (1280px+)

### Database Impact
- [ ] New tables: [list]
- [ ] New columns: [list]
- [ ] New RLS policies: [list]
- [ ] New indexes: [list]
- [ ] Migration file: [path]

### Rollback Path
- [ ] Revert commit hash: [hash]
- [ ] Database rollback SQL: [if applicable]
- [ ] Feature flag to disable: [if applicable]
- [ ] No data migration needed / Data migration reversible
```

---

## PART F — Implementation Layers (Updated)

### LAYER 1: Immediate (This Sprint)
| # | Action | Type | UX | DB | QA |
|---|--------|------|----|----|-----|
| 1.1 | Image lazy loading | Tech | ✅ Speed | No | Visual mobile check |
| 1.2 | Explore pagination (limit 50) | Tech+UX | ✅ Speed | No | 3 tabs tested |
| 1.3 | Mobile stability audit | UX | ✅ Layout | No | Full mobile pass |
| 1.4 | SEO stability guarantee | Constraint | No | No | Sitemap validator |

### LAYER 2: Reinforcement (Next 2 Sprints) ✅ COMPLETE
| # | Action | Type | UX | DB | QA | Status |
|---|--------|------|----|----|-----|--------|
| 2.1 | Booking lifecycle hook | Tech+UX | ✅ Consistency | No | Scenario 1 full | ✅ Done |
| 2.2 | Modification flow | Tech+UX | ✅ New feature | New columns | Scenario 1 step 10 | ✅ Done |
| 2.3 | Quotation flow | Tech+UX | ✅ New feature | New columns | Scenario 1 step 5 | ✅ Done |
| 2.4 | Permission audit pass | Security | ✅ Blocked actions | RLS updates | Scenario 4 full | ✅ Done |
| 2.5 | Calendar unification | Tech | ✅ Accuracy | No (read-only) | Calendar accuracy | ✅ Done |
| 2.6 | Auth context split | Tech | ✅ Speed | No | Auth regression | ✅ Done |
| 2.7 | Monitoring gaps | Tech | No | audit_logs | Simulate failures | ✅ Done |
| 2.8 | Stripe refund automation | Tech+UX | ✅ New feature | stripe_payment_intent_id | Scenario 1 step 14 | ✅ Done |

### LAYER 3: Scale (Q3-Q4 2026)
| # | Action | Type | UX | DB | QA | Status |
|---|--------|------|----|----|-----|--------|
| 3.1 | PDF generation → Edge Functions | Tech | ✅ Speed | Storage | PDF output comparison | ✅ Done |
| 3.2 | DB indexes on hot query paths | Tech | ✅ Speed | ✅ 60+ indexes | Query benchmark | ✅ Done |
| 3.3 | Realtime subscriptions | Tech | ✅ Live updates | Enable RT | Concurrent user | ✅ Done |
| 3.4 | State management (Zustand) | Tech | ✅ Speed | No | Full regression | ✅ Done |

---

## PART G — Locked Rules

1. **No full rewrites** — progressive improvement only
2. **134+ Vitest tests must pass** after each change
3. **All public URLs frozen** — no SEO route changes
4. **Architecture freeze** — 3-level hierarchy (Org → Country → Module)
5. **Zero-commission model** — no payment intermediation, ever
6. **Mobile-first** — every UI change tested at 375px minimum
7. **Every sync event through `dispatchSyncEvent`** — no legacy duplicates
8. **Delivery checklist required** for every implementation block
9. **Provider = Org Owner/Admin** — no separate provider role in RBAC
10. **Payment flows directly to provider** — platform never touches funds

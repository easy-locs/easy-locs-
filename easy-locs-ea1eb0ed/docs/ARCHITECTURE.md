# Architecture — Easy-Locs Platform

## ORBIT Architecture

ORBIT (Open Real-time Business Integration Transport) is the central nervous system connecting all modules.

### Platform Bus (`src/lib/shared/platform-bus.ts`)

The **Platform Bus** is a typed pub/sub event system. Every module emits and subscribes to events through a single bus instance.

```typescript
import { platformBus } from "@/lib/shared";

// Emit
platformBus.emit("wallet:payment_completed", { amount: 100, currency: "EUR" });

// Subscribe
platformBus.on("marketplace:booking_created", (payload) => {
  // React to event
});
```

#### Event Domains

| Domain | Events | Description |
|--------|--------|-------------|
| `wallet:*` | `balance_updated`, `payment_completed`, `payment_failed`, `locs_purchased`, `transfer_sent`, `transfer_received`, `payment_requested` | Wallet & payment lifecycle |
| `orbit:*` | `message_sent`, `call_started`, `call_ended`, `thread_created`, `notification_created` | Communication events |
| `marketplace:*` | `listing_published`, `listing_paused`, `booking_created`, `booking_confirmed`, `booking_paid`, `booking_completed`, `booking_cancelled` | Marketplace lifecycle |
| `property:*` | `lease_created`, `rent_paid`, `rent_overdue`, `document_generated`, `intervention_created`, `tenant_added` | Property management |
| `deal:*` | `deal_created`, `offer_sent`, `counter_offer_sent`, `deal_accepted`, `deal_rejected` | Negotiation room |

### Reactions (`installPlatformReactions`)

Auto-installed side effects that wire modules together:
- `wallet:payment_completed` → creates notification + updates booking status
- `marketplace:booking_confirmed` → triggers payment request
- `property:rent_overdue` → generates dunning letter + notification

---

## Shared Services Layer (`src/lib/shared/`)

### Types (`types.ts`)

Central type definitions used across all modules:

```typescript
type TargetType = "lease" | "tenant" | "booking_request" | "concierge_order" | "deal" | ...;
type AppModule = "long_term" | "seasonal" | "marketplace" | "real_estate";

interface DeepLinkMeta {
  target_type: TargetType;
  target_id: string;
  target_url: string;
  module: AppModule;
  country_code: string;
}
```

### Notification Engine (`notification-engine.ts`)

Centralized notification dispatch with:
- Multi-channel delivery (in-app, email, push)
- Severity levels and categorization
- Deep-link generation for every notification

### Communication Pipeline (`communication-pipeline.ts`)

Processes all messaging flows:
- Message validation and sanitization
- Attachment handling
- Thread creation and management
- Translation support via edge function

### Deep Link (`deep-link.ts`)

Generates deterministic URLs from any `DeepLinkMeta`:
```typescript
buildDeepLink({ target_type: "booking_request", target_id: "abc", module: "seasonal", ... })
// → /dashboard/seasonal?booking=abc
```

### Payment Request (`payment-request.ts`)

Unified payment flow for all modules:
- Stripe Checkout session creation
- SEPA direct debit support
- Multi-currency with FX conversion
- Payment link generation for guests

### Sync Engine (`sync-engine.ts`)

Handles external calendar synchronization:
- iCal import/export
- Availability conflict detection
- Periodic sync scheduling

---

## Security Architecture

### Input Sanitization (`src/lib/security-utils.ts`)

All user input passes through centralized sanitizers:

| Function | Purpose |
|----------|---------|
| `sanitizeText()` | XSS prevention — strips HTML, event handlers, JS protocol |
| `sanitizeEmail()` | Email validation and normalization |
| `sanitizePhone()` | International phone format validation |
| `sanitizeUrl()` | Protocol whitelist (http/https only) |
| `checkRateLimit()` | In-memory rate limiting per key |
| `generateFormToken()` | CSRF-like token generation |
| `isValidUUID()` | UUID format validation |
| `validateAmount()` | Monetary amount bounds checking |

### ORBIT Encryption (`src/lib/orbit-*.ts`)

End-to-end encrypted messaging stack:
- **X3DH** key agreement (`orbit-x3dh.ts`)
- **Double Ratchet** protocol (`orbit-double-ratchet.ts`)
- **File encryption** for attachments (`orbit-file-encryption.ts`)
- **Metadata guard** to minimize metadata leakage (`orbit-metadata-guard.ts`)
- **Secure audio** for voice messages (`orbit-secure-audio.ts`)

---

## AI Audit System (`src/lib/ai-audit/`)

15 specialized engines that score platform quality:

| Engine | Category | Checks |
|--------|----------|--------|
| UI/UX | `ui_ux` | Layout, accessibility, responsiveness |
| SEO | `seo` | Meta tags, sitemap, structured data |
| Technical | `technical` | Performance, errors, bundle size |
| Marketplace | `marketplace` | Listing quality, photos, pricing |
| International | `international` | i18n coverage, currency, date formats |
| Conversion | `conversion` | CTA placement, funnel analysis |
| Communication | `communication` | Response time, template quality |
| Security | `security` | Auth, XSS, CSRF, data exposure |
| Brand | `brand` | Color consistency, logo usage |
| Data Quality | `data_quality` | Completeness, duplicates, integrity |
| Analytics | `analytics` | Tracking coverage, event naming |
| Mobile | `mobile` | Touch targets, viewport, PWA |
| Payment | `payment` | Checkout flow, error handling |
| Booking | `booking` | Availability, confirmation flow |
| Content | `content` | Spelling, readability, freshness |

### Scoring

```
Global Score = average(module scores)
Module Score = 100 - sum(severity_weight per issue)
```

Severity weights: critical=25, high=15, medium=8, low=3, info=0

---

## Database Architecture

Multi-tenant design using `org_id` isolation:

- **orgs** — Organizations (landlords, agencies, concierge companies)
- **org_members** — User↔Org membership with roles
- **properties** — Real estate assets
- **tenants** — Tenant records linked to leases
- **leases** — Rental contracts
- **booking_requests** — Seasonal booking flow
- **concierge_services/orders** — Marketplace services
- **conversation_threads/messages** — ORBIT messaging
- **deal_rooms/deal_events** — Negotiation engine

All tables use **Row-Level Security** (RLS) with `org_id`-based policies.

# API Reference — Edge Functions

> All endpoints are invoked via `supabase.functions.invoke("function-name", { body })`.  
> Auth: Most require `Authorization: Bearer <jwt>` header (automatic via Supabase client).

---

## Payment & Billing

| Function | Auth | Description |
|----------|------|-------------|
| `create-checkout` | ✅ | Creates Stripe Checkout session for subscription plans |
| `create-rent-payment` | ✅ | Generates payment link for tenant rent collection |
| `create-booking-payment` | ✅ | Stripe session for seasonal booking payments |
| `create-concierge-payment` | ✅ | Payment for marketplace concierge orders |
| `create-legal-notice-payment` | ✅ | One-time payment for JAL legal notices |
| `orbit-payment` | ✅ | ORBIT wallet-to-wallet LOCS token transfers |
| `purchase-locs` | ✅ | Purchase LOCS tokens via Stripe |
| `customer-portal` | ✅ | Redirects to Stripe billing portal |
| `check-subscription` | ✅ | Returns current subscription status & plan details |
| `process-refund` | ✅ | Initiates Stripe refund for a payment |
| `collect-sepa-rents` | ⚙️ CRON | Automated SEPA direct debit rent collection |
| `stripe-webhook` | 🔑 Stripe | Handles all Stripe webhook events |

## Stripe Connect

| Function | Auth | Description |
|----------|------|-------------|
| `create-connect-account` | ✅ | Creates Stripe Connect account for org |
| `check-connect-status` | ✅ | Checks Connect onboarding completion status |
| `disconnect-stripe` | ✅ | Disconnects Stripe Connect from org |

## Communication

| Function | Auth | Description |
|----------|------|-------------|
| `send-email` | ✅ | Sends transactional email (Resend) |
| `send-notification-email` | ✅ | Notification-specific email dispatch |
| `receive-email` | 🔑 Webhook | Inbound email processing |
| `translate-message` | ✅ | AI-powered message translation |
| `voice-transcribe` | ✅ | Audio-to-text transcription |

## Booking & Calendar

| Function | Auth | Description |
|----------|------|-------------|
| `notify-booking` | ✅ | Sends booking confirmation notifications |
| `booking-lifecycle` | ✅ | Manages booking state transitions |
| `sync-ical` | ⚙️ CRON | Synchronizes external iCal calendars |
| `export-ical` | 🔓 Public | Exports property calendar as iCal feed |

## Documents & PDF

| Function | Auth | Description |
|----------|------|-------------|
| `generate-pdf` | ✅ | Generates PDF from document template |
| `generate-cv` | ✅ | Generates tenant CV/application PDF |
| `extract-document` | ✅ | AI document parsing (ID, contracts) |
| `generate-monthly-notices` | ⚙️ CRON | Automated monthly rent notice generation |
| `generate-monthly-report` | ⚙️ CRON | Monthly financial report generation |
| `lease-workflow` | ✅ | Lease document workflow management |

## Marketplace & SEO

| Function | Auth | Description |
|----------|------|-------------|
| `generate-seo` | ✅ | AI-generated SEO content for listings |
| `social-preview` | 🔓 Public | Open Graph image generation |
| `reveal-contact` | ✅ | Unlocks provider contact info (credit-based) |
| `dispatch-webhook` | ✅ | Forwards events to external webhook URLs |

## Authentication & Sessions

| Function | Auth | Description |
|----------|------|-------------|
| `guest-session` | 🔓 Public | Creates temporary guest sessions for chat/booking |
| `tenant-signup` | 🔓 Public | Tenant self-registration portal |
| `wallet-pin` | ✅ | Sets/verifies wallet PIN code |
| `get-turn-credentials` | ✅ | TURN server credentials for WebRTC calls |

## Infrastructure

| Function | Auth | Description |
|----------|------|-------------|
| `ai-assistant` | ✅ | AI chat assistant (Lovable AI models) |
| `public-api` | 🔑 API Key | External REST API for integrations |
| `fx-rates` | ⚙️ CRON | Currency exchange rate cache refresh |
| `cleanup-expired-media` | ⚙️ CRON | Removes expired media from storage |
| `cleanup-expired-messages` | ⚙️ CRON | Purges expired ephemeral messages |
| `rent-reminders` | ⚙️ CRON | Automated rent payment reminders |
| `run-scheduled-audit` | ⚙️ CRON | Periodic AI audit execution |

---

## Auth Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Requires authenticated user JWT |
| 🔓 Public | No auth required |
| 🔑 Webhook/API Key | Requires specific secret or API key |
| ⚙️ CRON | Triggered by scheduled job |

---

## Common Request Pattern

```typescript
import { supabase } from "@/integrations/supabase/client";

// Authenticated call
const { data, error } = await supabase.functions.invoke("function-name", {
  body: { key: "value" },
});

// Error handling
if (error) {
  console.error("Edge function error:", error.message);
}
```

## Common Response Format

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "error": "Human-readable error message"
}
```

HTTP status codes: `200` success, `401` unauthorized, `404` not found, `500` internal error, `503` service unavailable.

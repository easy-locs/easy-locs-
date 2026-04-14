# ORBIT Event Bus Conventions

## Overview
ORBIT (Open Real-time Business Integration Transport) is the central nervous system of the Easy-Locs platform. All inter-module communication flows through the Platform Bus singleton.

## Event Naming
- Format: `domain:action_in_snake_case`
- Use colon notation exclusively (dot notation is legacy/logging only)
- Never bridge between colon and dot notation buses

## Event Domains
| Domain | Scope |
|--------|-------|
| `wallet:*` | Payment lifecycle — balance_updated, payment_completed, payment_failed, locs_purchased, transfer_sent, transfer_received, payment_requested |
| `orbit:*` | Communication — message_sent, call_started, call_ended, thread_created, notification_created |
| `marketplace:*` | Marketplace lifecycle — listing_published, listing_paused, booking_created, booking_confirmed, booking_paid, booking_completed, booking_cancelled |
| `property:*` | Property management — lease_created, rent_paid, rent_overdue, document_generated, intervention_created, tenant_added |
| `deal:*` | Negotiation room — deal_created, offer_sent, counter_offer_sent, deal_accepted, deal_rejected |
| `dashboard:*` | UI refresh signals (dedup-eligible) |
| `notifications:*` | Notification refresh signals (dedup-eligible) |
| `me:*` | User profile refresh signals (dedup-eligible) |
| `system:*` | System-wide events — currency_changed |
| `storefront:*` | Shop/storefront operations |
| `booking:*` | Booking flow events |

## Anti-Storm Rules
- Events prefixed with `dashboard:`, `notifications:`, `me:` are dedup-eligible
- These are dropped if the same event type fired within 100ms
- Max 100 listeners per event type, 80 global listeners

## PlatformEvent Shape
```typescript
interface PlatformEvent<T = unknown> {
  type: string;
  payload: T;
  source: "wallet" | "orbit" | "marketplace" | "pm" | "system" | "tracking";
  userId?: string;
  orgId?: string;
  timestamp: number;
  correlationId?: string;
}
```

## Rules for Agents
1. Never create new event domains without Chief Architect approval
2. Always use correlationId for tracing event chains
3. Refresh events must be dedup-eligible (add prefix to DEDUP_EVENT_PREFIXES)
4. Never emit events in tight loops — batch or debounce
5. All event listeners must have error boundaries (try/catch)

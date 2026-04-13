# Domain Contract — Commerce (Revenue)

## Owner
Commerce & Payments Team

## Purpose
The Commerce domain (housed in `revenue/`) owns the end-to-end order lifecycle: cart → checkout → payment → fulfilment → refund. It bridges the Marketplace catalogue with Wallet payments and coordinates delivery via the Delivery domain.

## Canonical Invariants
- **An order transitions through a strict state machine**: `draft → pending_payment → paid → fulfilling → completed | cancelled | refunded`. No state may be skipped.
- **A single `rent-payment` edge function handles the full rent payment flow** via a `mode` parameter:
  - `mode: "schedule"` → creates a `rent_calls` DB record (pending payment, no external provider call).
  - `mode: "checkout"` → creates a Stripe Checkout Session and updates the `rent_calls` record with Stripe metadata.
  Both modes live in `supabase/functions/rent-payment/index.ts`. The two legacy functions (`create-rent-payment`, `rent-create-payment`) have been merged and removed.
- **Refunds are always initiated through the refund service**, not via direct payment-provider calls.
- **No commerce logic may execute in UI components**. All order mutations go through the service layer.

## Key Aggregates
| Aggregate | Description |
|---|---|
| `Order` | A customer purchase from one or more shops |
| `OrderItem` | A line item within an order |
| `PaymentRecord` | The platform-side record of a completed payment |
| `RefundRequest` | A request to reverse a completed payment |
| `Coupon` | A discount code applicable to an order |

## Public Interface (to be formalised in ports.ts)
| Method | Direction | Description |
|---|---|---|
| `createOrder` | Write | Creates a draft order from a cart |
| `scheduleRentPayment` | Write | Creates a pending rent_call record (mode: schedule) |
| `initiateRentCheckout` | Write | Creates Stripe Checkout Session (mode: checkout) |
| `confirmPayment` | Write | Marks order as paid, creates DB record |
| `requestRefund` | Write | Submits a refund request for admin review |
| `getOrderStatus` | Read | Returns current order state |
| `listOrders` | Read | Returns paginated order history for a user |

## Callers of rent-payment Edge Function
| Caller | Mode | Purpose |
|---|---|---|
| `src/lib/server-actions/rent.ts` | `schedule` | Create pending rent_call record |
| `src/repositories/payments.repository.ts` | `checkout` | Initiate Stripe payment for existing rent_call |
| `src/repositories/rental-data.repository.ts` | `checkout` | Initiate Stripe payment from rental data flow |
| `src/repositories/tenant.repository.ts` | `checkout` | Initiate Stripe payment from tenant portal |

## Domain Events (to be formalised)
- `commerce.order_created`
- `commerce.payment_confirmed`
- `commerce.order_fulfilled`
- `commerce.order_cancelled`
- `commerce.refund_requested`
- `commerce.refund_processed`

## Anti-Corruption Layer
- Stripe webhook payloads are normalised by the `rent-payment` edge function (mode: checkout) before writing to the domain.
- Commerce must not import from Orbit or Property domains directly.
- Commerce reads product data from Marketplace via read-models — it never writes to Marketplace tables.

## UI Rule
- Order status views are read-only.
- Checkout and payment forms call edge functions, not Supabase directly.

## Data Ownership
Tables: `orders`, `order_items`, `payment_records`, `refund_requests`, `coupons`, `rent_calls` — owned exclusively by this domain.

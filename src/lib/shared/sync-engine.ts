/**
 * Cross-Module Synchronization Engine
 * 
 * SINGLE SOURCE OF TRUTH for cross-module synchronization.
 * 
 * Ensures every important business event propagates correctly across:
 * - Communication Center (threaded messages with context)
 * - Notifications (in-app + email via triple-sync)
 * - Documents (auto-generation references)
 * - Finance (payment request linkage)
 * - Tenant/Client portal (visibility)
 * 
 * HARDENED RULES:
 * 1. NO DUPLICATE TRIGGERS — modules using dispatchSyncEvent() must not
 *    also fire legacy notification/message inserts for the same action.
 * 2. STRICT CONTEXT VALIDATION — each event type requires its critical IDs.
 * 3. IDEMPOTENCY — dedupe key prevents duplicate dispatches within a window.
 */

import { sendCommunicationEvent } from "./communication-pipeline";
import { createDeepLinkMeta } from "./notification-engine";
import { createPaymentRequest } from "./payment-request";
import type { TargetType, AppModule } from "./types";

// ═══════════════════════════════════════════════════════
// Deduplication — prevents double-sync from retries/clicks
// ═══════════════════════════════════════════════════════

const DEDUPE_WINDOW_MS = 10_000; // 10 seconds
const recentDispatches = new Map<string, number>();

function buildDedupeKey(event: SyncEvent): string {
  const ctx = event.context;
  const targetId = resolveTargetId(event);
  // For public visitors (no actorUserId), use targetEmail or a random suffix to avoid collisions
  const actorKey = event.actorUserId || event.targetEmail || crypto.randomUUID?.() || String(Date.now());
  return `${event.type}:${ctx.orgId}:${targetId}:${actorKey}`;
}

function isDuplicate(key: string): boolean {
  const lastTime = recentDispatches.get(key);
  if (lastTime && Date.now() - lastTime < DEDUPE_WINDOW_MS) {
    return true;
  }
  // Prune old entries periodically (keep map small)
  if (recentDispatches.size > 200) {
    const cutoff = Date.now() - DEDUPE_WINDOW_MS;
    for (const [k, v] of recentDispatches) {
      if (v < cutoff) recentDispatches.delete(k);
    }
  }
  recentDispatches.set(key, Date.now());
  return false;
}

// ═══════════════════════════════════════════════════════
// Context Reference — every sync event must carry this
// ═══════════════════════════════════════════════════════

export interface SyncContext {
  orgId: string;
  propertyId?: string;
  tenantId?: string;
  leaseId?: string;
  bookingId?: string;
  leadId?: string;
  documentId?: string;
  paymentRequestId?: string;
  countryCode?: string;
}

// ═══════════════════════════════════════════════════════
// Sync Event Types — one per business action
// ═══════════════════════════════════════════════════════

interface SyncEventBase {
  context: SyncContext;
  actorUserId: string;
  /** Target user who should receive notifications (org owner, tenant, etc.) */
  targetUserId?: string;
  targetEmail?: string;
  locale?: string;
}

interface LeaseCreatedEvent extends SyncEventBase {
  type: "lease_created";
  leaseType: string;
  startDate: string;
  tenantName: string;
  propertyLabel: string;
}

interface RentCallCreatedEvent extends SyncEventBase {
  type: "rent_call_created";
  month: string;
  totalAmount: number;
  currency: string;
  tenantName: string;
  propertyLabel: string;
  rentCallId: string;
}

interface ReceiptGeneratedEvent extends SyncEventBase {
  type: "receipt_generated";
  month: string;
  totalAmount: number;
  currency: string;
  tenantName: string;
  receiptId: string;
}

interface PaymentReceivedEvent extends SyncEventBase {
  type: "payment_received";
  month: string;
  totalAmount: number;
  currency: string;
  tenantName: string;
  paymentId: string;
}

interface LeadCreatedEvent extends SyncEventBase {
  type: "lead_created";
  leadName: string;
  leadEmail: string;
  leadMessage: string;
  listingTitle: string;
  listingId: string;
}

interface BookingRequestEvent extends SyncEventBase {
  type: "booking_request";
  guestName: string;
  checkIn: string;
  checkOut: string;
  listingTitle: string;
}

interface ServiceBookingEvent extends SyncEventBase {
  type: "service_booking";
  clientName: string;
  serviceTitle: string;
  serviceDate: string;
  totalPrice: number;
  currency: string;
}

interface DocumentSharedEvent extends SyncEventBase {
  type: "document_shared";
  documentTitle: string;
  documentType: string;
  documentUrl?: string;
}

interface PaymentRequestSentEvent extends SyncEventBase {
  type: "payment_request_sent";
  amount: number;
  currency: string;
  description: string;
  recipientName: string;
}

interface InterventionCreatedEvent extends SyncEventBase {
  type: "intervention_created";
  title: string;
  priority: string;
  propertyLabel: string;
}

interface DealCreatedEvent extends SyncEventBase {
  type: "deal_created";
  dealId: string;
  contextTitle: string;
  buyerName: string;
}

interface DealAcceptedEvent extends SyncEventBase {
  type: "deal_accepted";
  dealId: string;
  contextTitle: string;
  acceptedAmount: number;
  currency: string;
}

interface WalletPaymentCompletedEvent extends SyncEventBase {
  type: "wallet_payment_completed";
  amount: number;
  currency: string;
  paymentMethod: "locs" | "fiat";
  txnId: string;
  recipientName: string;
}

interface WalletPaymentFailedEvent extends SyncEventBase {
  type: "wallet_payment_failed";
  amount: number;
  currency: string;
  paymentMethod: "locs" | "fiat";
  reason: string;
}

export type SyncEvent =
  | LeaseCreatedEvent
  | RentCallCreatedEvent
  | ReceiptGeneratedEvent
  | PaymentReceivedEvent
  | LeadCreatedEvent
  | BookingRequestEvent
  | ServiceBookingEvent
  | DocumentSharedEvent
  | PaymentRequestSentEvent
  | InterventionCreatedEvent
  | DealCreatedEvent
  | DealAcceptedEvent
  | WalletPaymentCompletedEvent
  | WalletPaymentFailedEvent;

// ═══════════════════════════════════════════════════════
// Strict Context Validation — rejects incomplete events
// ═══════════════════════════════════════════════════════

const REQUIRED_CONTEXT: Record<SyncEvent["type"], (ctx: SyncContext, event: SyncEvent) => string | null> = {
  lease_created:        (ctx) => ctx.leaseId ? null : "lease_created requires context.leaseId",
  rent_call_created:    (ctx, e) => (e as RentCallCreatedEvent).rentCallId ? null : "rent_call_created requires rentCallId",
  receipt_generated:    (ctx, e) => (e as ReceiptGeneratedEvent).receiptId ? null : "receipt_generated requires receiptId",
  payment_received:     (ctx, e) => (e as PaymentReceivedEvent).paymentId ? null : "payment_received requires paymentId",
  lead_created:         (ctx) => ctx.leadId ? null : "lead_created requires context.leadId",
  booking_request:      (ctx) => ctx.bookingId ? null : "booking_request requires context.bookingId",
  service_booking:      (ctx) => ctx.bookingId ? null : "service_booking requires context.bookingId",
  document_shared:      (ctx) => ctx.documentId ? null : "document_shared requires context.documentId",
  payment_request_sent: (ctx) => (ctx.paymentRequestId || ctx.bookingId || ctx.leaseId || ctx.tenantId)
    ? null : "payment_request_sent requires paymentRequestId, bookingId, leaseId, or tenantId",
  intervention_created: (ctx) => ctx.propertyId ? null : "intervention_created requires context.propertyId",
  deal_created:         (ctx, e) => (e as DealCreatedEvent).dealId ? null : "deal_created requires dealId",
  deal_accepted:        (ctx, e) => (e as DealAcceptedEvent).dealId ? null : "deal_accepted requires dealId",
  wallet_payment_completed: (ctx, e) => (e as WalletPaymentCompletedEvent).txnId ? null : "wallet_payment_completed requires txnId",
  wallet_payment_failed:    () => null, // No strict requirement beyond orgId
};

// ═══════════════════════════════════════════════════════
// Event → Target Type / Module Mapping
// ═══════════════════════════════════════════════════════

const EVENT_CONFIG: Record<SyncEvent["type"], { targetType: TargetType; module: AppModule; notifType: string }> = {
  lease_created:        { targetType: "lease",              module: "long_term",    notifType: "document" },
  rent_call_created:    { targetType: "payment",            module: "long_term",    notifType: "payment" },
  receipt_generated:    { targetType: "receipt",             module: "long_term",    notifType: "receipt" },
  payment_received:     { targetType: "payment",            module: "long_term",    notifType: "payment" },
  lead_created:         { targetType: "real_estate_lead",    module: "real_estate",  notifType: "info" },
  booking_request:      { targetType: "booking_request",     module: "seasonal",     notifType: "request" },
  service_booking:      { targetType: "marketplace_booking", module: "marketplace",  notifType: "info" },
  document_shared:      { targetType: "document",            module: "long_term",    notifType: "document" },
  payment_request_sent: { targetType: "payment",            module: "long_term",    notifType: "payment" },
  intervention_created: { targetType: "intervention",        module: "long_term",    notifType: "request" },
  deal_created:         { targetType: "deal",                module: "marketplace",  notifType: "info" },
  deal_accepted:        { targetType: "deal",                module: "marketplace",  notifType: "payment" },
};

// Context-aware config resolution — certain events adapt based on context IDs
function resolveEffectiveConfig(
  event: SyncEvent,
  baseConfig: { targetType: TargetType; module: AppModule; notifType: string }
): { targetType: TargetType; module: AppModule; notifType: string } {
  // payment_request_sent adapts to the module of its parent context
  if (event.type === "payment_request_sent") {
    const ctx = event.context;
    // Marketplace context: has bookingId but no lease/tenant context
    if (ctx.bookingId && !ctx.leaseId && !ctx.tenantId) {
      return { targetType: "marketplace_booking", module: "marketplace", notifType: "payment" };
    }
    // Seasonal context: has bookingId + propertyId (from seasonal booking)
    if (ctx.bookingId && ctx.propertyId && !ctx.leaseId) {
      return { targetType: "booking_request", module: "seasonal", notifType: "payment" };
    }
  }
  // document_shared adapts to marketplace when bookingId is present without lease context
  if (event.type === "document_shared" && event.context.bookingId && !event.context.leaseId) {
    return { targetType: "marketplace_booking", module: "marketplace", notifType: "document" };
  }
  return baseConfig;
}

// ═══════════════════════════════════════════════════════
// Main Dispatch — single entry point for all sync events
// ═══════════════════════════════════════════════════════

/**
 * Dispatch a cross-module sync event.
 * 
 * HARDENED with:
 * - Strict context validation (rejects incomplete events)
 * - Deduplication (10s window prevents double-sync)
 * - Full context propagation (all IDs carried through)
 * 
 * IMPORTANT: When a module adopts dispatchSyncEvent(), it MUST remove
 * any legacy direct inserts to `messages` or `notifications` tables
 * for the same action to prevent duplicate triggers.
 * 
 * @returns true if dispatched, false if rejected (validation/dedupe)
 * 
 * @example
 * const sent = await dispatchSyncEvent({
 *   type: "lease_created",
 *   context: { orgId, propertyId, tenantId, leaseId: newLease.id, countryCode: "FR" },
 *   actorUserId: user.id,
 *   targetUserId: tenantUserId,
 *   targetEmail: tenant.email,
 *   leaseType: "furnished",
 *   startDate: "2026-04-01",
 *   tenantName: "Jean Dupont",
 *   propertyLabel: "Apt 3B - Rue de Paris",
 * });
 */
export async function dispatchSyncEvent(event: SyncEvent): Promise<boolean> {
  const config = EVENT_CONFIG[event.type];
  if (!config) {
    console.warn(`[sync-engine] Unknown event type: ${event.type}`);
    return false;
  }

  // 1. Validate orgId (always required)
  if (!event.context.orgId) {
    console.error(`[sync-engine] REJECTED ${event.type}: missing context.orgId`);
    return false;
  }

  // 2. Strict context validation per event type
  const validationError = REQUIRED_CONTEXT[event.type]?.(event.context, event);
  if (validationError) {
    console.error(`[sync-engine] REJECTED ${event.type}: ${validationError}`);
    return false;
  }

  // 3. Deduplication check
  const dedupeKey = buildDedupeKey(event);
  if (isDuplicate(dedupeKey)) {
    console.warn(`[sync-engine] DEDUPE blocked: ${event.type} (key: ${dedupeKey})`);
    return false;
  }

  const { subject, message } = buildEventContent(event);
  const targetId = resolveTargetId(event);

  // Resolve effective config — payment_request_sent is context-aware:
  // If context has bookingId but no leaseId/tenantId → marketplace context
  const effectiveConfig = resolveEffectiveConfig(event, config);

  const meta = createDeepLinkMeta({
    targetType: effectiveConfig.targetType,
    targetId,
    module: effectiveConfig.module,
    countryCode: event.context.countryCode,
    bookingId: event.context.bookingId,
    orgId: event.context.orgId,
    propertyId: event.context.propertyId,
    leaseId: event.context.leaseId,
  });

  // Triple-sync: message + notification + email
  await sendCommunicationEvent({
    orgId: event.context.orgId,
    senderId: event.actorUserId,
    recipientUserId: event.targetUserId,
    recipientEmail: event.targetEmail,
    subject,
    message,
    category: effectiveConfig.notifType,
    emailLocale: event.locale || "en",
    meta,
  });

  console.log(`[sync-engine] ✓ dispatched: ${event.type} → ${effectiveConfig.targetType}:${targetId}`);
  return true;
}

// ═══════════════════════════════════════════════════════
// Payment Request Sync (wraps payment-request utility)
// ═══════════════════════════════════════════════════════

/**
 * Send a payment request through the sync engine.
 * Uses org's own payment configuration (SaaS isolation).
 * 
 * NOTE: This calls dispatchSyncEvent internally — do NOT also call
 * dispatchSyncEvent separately for the same payment request.
 */
export async function syncPaymentRequest(
  event: PaymentRequestSentEvent
): Promise<{ success: boolean; instructions: string }> {
  // Dispatch handles validation + dedupe
  const dispatched = await dispatchSyncEvent(event);
  if (!dispatched) {
    return { success: false, instructions: "Event rejected (validation or dedupe)." };
  }

  // Create the actual payment request with org-specific instructions
  return createPaymentRequest({
    orgId: event.context.orgId,
    senderId: event.actorUserId,
    recipientEmail: event.targetEmail || "",
    recipientName: event.recipientName,
    amount: event.amount,
    currency: event.currency,
    description: event.description,
    contextType: resolveContextType(event),
    contextId: resolveTargetId(event),
  });
}

// ═══════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════

function resolveTargetId(event: SyncEvent): string {
  const ctx = event.context;
  switch (event.type) {
    case "lease_created":        return ctx.leaseId || "";
    case "rent_call_created":    return event.rentCallId;
    case "receipt_generated":    return event.receiptId;
    case "payment_received":     return event.paymentId;
    case "lead_created":         return ctx.leadId || event.listingId;
    case "booking_request":      return ctx.bookingId || "";
    case "service_booking":      return ctx.bookingId || "";
    case "document_shared":      return ctx.documentId || "";
    case "payment_request_sent": return ctx.paymentRequestId || ctx.bookingId || ctx.leaseId || "";
    case "intervention_created": return ctx.propertyId || "";
    case "deal_created":         return event.dealId;
    case "deal_accepted":        return event.dealId;
    default:                     return "";
  }
}

function resolveContextType(event: SyncEvent): string {
  if (event.context.bookingId) return "booking";
  if (event.context.leaseId) return "lease";
  if (event.context.leadId) return "lead";
  if (event.context.tenantId) return "tenant";
  return "general";
}

function buildEventContent(event: SyncEvent): { subject: string; message: string } {
  switch (event.type) {
    case "lease_created":
      return {
        subject: `📝 New lease created — ${event.tenantName}`,
        message: `Lease (${event.leaseType}) created for ${event.tenantName} at ${event.propertyLabel}, starting ${event.startDate}.`,
      };
    case "rent_call_created":
      return {
        subject: `🔔 Rent call — ${event.month}`,
        message: `Rent call for ${event.tenantName}: ${event.totalAmount} ${event.currency} for ${event.month} at ${event.propertyLabel}.`,
      };
    case "receipt_generated":
      return {
        subject: `🧾 Receipt generated — ${event.month}`,
        message: `Receipt for ${event.tenantName}: ${event.totalAmount} ${event.currency} for ${event.month}.`,
      };
    case "payment_received":
      return {
        subject: `💰 Payment received — ${event.month}`,
        message: `Payment of ${event.totalAmount} ${event.currency} received from ${event.tenantName} for ${event.month}.`,
      };
    case "lead_created":
      return {
        subject: `🏠 New inquiry — ${event.leadName}`,
        message: `${event.leadName} (${event.leadEmail}) is interested in "${event.listingTitle}".\n\nMessage: ${event.leadMessage}`,
      };
    case "booking_request":
      return {
        subject: `📩 Booking request — ${event.guestName}`,
        message: `${event.guestName} wants to book "${event.listingTitle}" from ${event.checkIn} to ${event.checkOut}.`,
      };
    case "service_booking":
      return {
        subject: `🎯 Service booking — ${event.clientName}`,
        message: `${event.clientName} booked "${event.serviceTitle}" on ${event.serviceDate} — ${event.totalPrice} ${event.currency}.`,
      };
    case "document_shared":
      return {
        subject: `📄 Document shared — ${event.documentTitle}`,
        message: `Document "${event.documentTitle}" (${event.documentType}) has been shared.${event.documentUrl ? `\n\nDownload: ${event.documentUrl}` : ""}`,
      };
    case "payment_request_sent":
      return {
        subject: `💳 Payment request — ${event.amount} ${event.currency}`,
        message: `Payment request of ${event.amount} ${event.currency} sent to ${event.recipientName}.\n\n${event.description}`,
      };
    case "intervention_created":
      return {
        subject: `🔧 New intervention — ${event.title}`,
        message: `Intervention "${event.title}" created for ${event.propertyLabel} — Priority: ${event.priority}.`,
      };
    case "deal_created":
      return {
        subject: `🤝 New inquiry — ${event.buyerName}`,
        message: `${event.buyerName} opened a Deal Room for "${event.contextTitle}".`,
      };
    case "deal_accepted":
      return {
        subject: `✅ Deal accepted — ${event.contextTitle}`,
        message: `Deal for "${event.contextTitle}" accepted at ${event.acceptedAmount} ${event.currency}. Payment request will follow.`,
      };
    default:
      return { subject: "Platform notification", message: "An event occurred." };
  }
}

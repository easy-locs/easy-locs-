/**
 * Cross-Module Synchronization Engine
 * 
 * Ensures every important business event propagates correctly across:
 * - Communication Center (threaded messages with context)
 * - Notifications (in-app + email via triple-sync)
 * - Documents (auto-generation references)
 * - Finance (payment request linkage)
 * - Tenant/Client portal (visibility)
 * 
 * RULE: Every entity must carry strong context references:
 *   org_id, property_id, tenant_id, lease_id, booking_id, lead_id, document_id
 * 
 * This engine does NOT replace database triggers — it complements them
 * with client-side orchestration for actions initiated from the UI.
 */

import { sendCommunicationEvent } from "./communication-pipeline";
import { createDeepLinkMeta, createNotification } from "./notification-engine";
import { createPaymentRequest } from "./payment-request";
import type { TargetType, AppModule } from "./types";

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
  | InterventionCreatedEvent;

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
};

// ═══════════════════════════════════════════════════════
// Main Dispatch — single entry point for all sync events
// ═══════════════════════════════════════════════════════

/**
 * Dispatch a cross-module sync event.
 * 
 * This orchestrates:
 * 1. Communication Center message (with context_type + context_id)
 * 2. In-app notification (with DeepLinkMeta)
 * 3. Email notification (via SendGrid)
 * 
 * All outputs carry the full SyncContext for traceability.
 * 
 * @example
 * await dispatchSyncEvent({
 *   type: "lease_created",
 *   context: { orgId, propertyId, tenantId, leaseId, countryCode: "FR" },
 *   actorUserId: user.id,
 *   targetUserId: tenantUserId,
 *   targetEmail: tenant.email,
 *   leaseType: "furnished",
 *   startDate: "2026-04-01",
 *   tenantName: "Jean Dupont",
 *   propertyLabel: "Apt 3B - Rue de Paris",
 * });
 */
export async function dispatchSyncEvent(event: SyncEvent): Promise<void> {
  const config = EVENT_CONFIG[event.type];
  if (!config) {
    console.warn(`[sync-engine] Unknown event type: ${event.type}`);
    return;
  }

  const { subject, message } = buildEventContent(event);
  const targetId = resolveTargetId(event);

  const meta = createDeepLinkMeta({
    targetType: config.targetType,
    targetId,
    module: config.module,
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
    category: config.notifType,
    emailLocale: event.locale || "en",
    meta,
  });

  console.log(`[sync-engine] dispatched: ${event.type} → ${config.targetType}:${targetId}`);
}

// ═══════════════════════════════════════════════════════
// Payment Request Sync (wraps payment-request utility)
// ═══════════════════════════════════════════════════════

/**
 * Send a payment request through the sync engine.
 * Uses org's own payment configuration (SaaS isolation).
 */
export async function syncPaymentRequest(
  event: PaymentRequestSentEvent
): Promise<{ success: boolean; instructions: string }> {
  // First dispatch the sync event for communication/notification
  await dispatchSyncEvent(event);

  // Then create the actual payment request with org-specific instructions
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

    default:
      return { subject: "Platform notification", message: "An event occurred." };
  }
}

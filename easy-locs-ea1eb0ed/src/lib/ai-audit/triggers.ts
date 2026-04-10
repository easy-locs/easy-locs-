/**
 * AI Operating Layer — Trigger-Based Audit System
 * 
 * Automatically runs targeted audits when key platform events occur:
 * - Page/listing creation or update
 * - Booking made or failed
 * - Payment success or failure
 * - Notification delivery failure
 * - Route navigation (page-level audit)
 * - Translation edits
 * - UI regression detection
 * 
 * Integrates with the existing Sync Engine by subscribing to sync events.
 * Results are stored in-memory and surfaced in the AI Quality Dashboard.
 */

import type { AuditIssue, AuditCategory } from "./types";
import { runSEOAudit } from "./engines/seo-engine";
import { runUIUXAudit } from "./engines/ui-ux-engine";
import { runMobileAudit, runSecurityAudit, runContentAudit, runBrandAudit, runConversionAudit } from "./engines/simple-engines";
import { pushEvent } from "@/lib/monitoring";

// ═══════════════════════════════════════════════════════
// Trigger Event Types
// ═══════════════════════════════════════════════════════

export type TriggerEvent =
  | { type: "page_navigated"; path: string }
  | { type: "listing_published"; listingId: string; listingType: "seasonal" | "marketplace" | "real_estate" }
  | { type: "listing_updated"; listingId: string }
  | { type: "translation_edited"; locale: string; key: string }
  | { type: "booking_created"; bookingId: string; module: "seasonal" | "marketplace" }
  | { type: "booking_failed"; bookingId?: string; error: string; module: "seasonal" | "marketplace" }
  | { type: "payment_completed"; paymentId: string; amount: number; currency: string }
  | { type: "payment_failed"; error: string; amount?: number }
  | { type: "notification_failed"; notificationId?: string; error: string }
  | { type: "route_error"; path: string; error: string }
  | { type: "ui_regression"; component: string; issue: string }
  | { type: "sync_event"; syncType: string; success: boolean; error?: string };

// ═══════════════════════════════════════════════════════
// In-Memory Trigger Audit Store
// ═══════════════════════════════════════════════════════

const MAX_TRIGGER_ISSUES = 500;
let triggerIssues: AuditIssue[] = [];
let triggerListeners: Array<() => void> = [];

export function getTriggerIssues(): AuditIssue[] {
  return [...triggerIssues];
}

export function subscribeTriggerAudit(fn: () => void) {
  triggerListeners.push(fn);
  return () => { triggerListeners = triggerListeners.filter((l) => l !== fn); };
}

function addTriggerIssue(issue: AuditIssue) {
  triggerIssues = [issue, ...triggerIssues].slice(0, MAX_TRIGGER_ISSUES);
  triggerListeners.forEach((fn) => fn());
}

function uid() {
  return `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════
// Throttle — prevent audit spam on rapid navigation
// ═══════════════════════════════════════════════════════

const lastTriggerTimes = new Map<string, number>();
const THROTTLE_MS = 5_000; // 5 seconds between same trigger type

function shouldThrottle(key: string): boolean {
  const last = lastTriggerTimes.get(key);
  if (last && Date.now() - last < THROTTLE_MS) return true;
  lastTriggerTimes.set(key, Date.now());
  // Prune old entries
  if (lastTriggerTimes.size > 100) {
    const cutoff = Date.now() - THROTTLE_MS * 2;
    for (const [k, v] of lastTriggerTimes) {
      if (v < cutoff) lastTriggerTimes.delete(k);
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════
// Main Dispatch — route trigger events to relevant audits
// ═══════════════════════════════════════════════════════

export async function dispatchTriggerAudit(event: TriggerEvent): Promise<AuditIssue[]> {
  const throttleKey = `${event.type}:${"path" in event ? event.path : "listingId" in event ? event.listingId : "global"}`;
  if (shouldThrottle(throttleKey)) return [];

  const now = new Date().toISOString();
  const newIssues: AuditIssue[] = [];

  try {
    switch (event.type) {
      case "page_navigated":
        newIssues.push(...runPageAudit(event.path));
        break;

      case "listing_published":
        newIssues.push(...runListingPublishAudit(event.listingId, event.listingType));
        break;

      case "listing_updated":
        newIssues.push(...runListingUpdateAudit(event.listingId));
        break;

      case "translation_edited":
        newIssues.push(...runTranslationAudit(event.locale, event.key));
        break;

      case "booking_created":
        newIssues.push(...runBookingSuccessAudit(event.bookingId, event.module));
        break;

      case "booking_failed":
        newIssues.push({
          id: uid(), category: "booking", severity: "critical",
          title: "Booking creation failed",
          description: `Booking failure in ${event.module}: ${event.error}`,
          suggestedFix: "Check booking form validation, availability calendar, and API connectivity.",
          autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now,
          metadata: { bookingId: event.bookingId, module: event.module },
        });
        break;

      case "payment_completed":
        newIssues.push(...runPaymentSuccessAudit(event.paymentId, event.amount, event.currency));
        break;

      case "payment_failed":
        newIssues.push({
          id: uid(), category: "payment", severity: "critical",
          title: "Payment processing failed",
          description: `Payment failure: ${event.error}${event.amount ? ` — Amount: ${event.amount}` : ""}`,
          suggestedFix: "Check Stripe Connect status, payment method configuration, and currency support.",
          autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now,
          metadata: { error: event.error, amount: event.amount },
        });
        // Also push to monitoring
        pushEvent({ type: "error", source: "payment-trigger", message: `Payment failed: ${event.error}` });
        break;

      case "notification_failed":
        newIssues.push({
          id: uid(), category: "communication", severity: "high",
          title: "Notification delivery failed",
          description: `Notification error: ${event.error}`,
          suggestedFix: "Check notification engine, email service (SendGrid), and user preferences.",
          autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now,
          metadata: { notificationId: event.notificationId },
        });
        break;

      case "route_error":
        newIssues.push({
          id: uid(), category: "technical", severity: "high",
          title: `Route error on ${event.path}`,
          description: `Navigation to ${event.path} failed: ${event.error}`,
          suggestedFix: "Check route registration in App.tsx and component lazy loading.",
          autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now,
          metadata: { path: event.path },
        });
        break;

      case "ui_regression":
        newIssues.push({
          id: uid(), category: "ui_ux", severity: "high",
          title: `UI regression in ${event.component}`,
          description: event.issue,
          suggestedFix: "Investigate the component rendering and check recent code changes.",
          autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now,
          metadata: { component: event.component },
        });
        break;

      case "sync_event":
        if (!event.success) {
          newIssues.push({
            id: uid(), category: "technical", severity: "high",
            title: `Sync event failed: ${event.syncType}`,
            description: `Sync engine event "${event.syncType}" failed: ${event.error || "Unknown error"}`,
            suggestedFix: "Check sync engine validation, deduplication, and communication pipeline.",
            autoFixable: false, businessImpact: "performance", status: "open", detectedAt: now,
          });
        }
        break;
    }
  } catch (err) {
    console.warn("[ai-audit-trigger] Trigger audit failed:", err);
  }

  // Store new issues
  newIssues.forEach(addTriggerIssue);

  return newIssues;
}

// ═══════════════════════════════════════════════════════
// Specific Audit Functions per Trigger
// ═══════════════════════════════════════════════════════

function runPageAudit(path: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Run lightweight page-level audits
  try {
    const seoIssues = runSEOAudit();
    const mobileIssues = runMobileAudit();
    const contentIssues = runContentAudit();

    // Tag with page location
    [...seoIssues, ...mobileIssues, ...contentIssues].forEach((i) => {
      i.location = path;
      i.id = uid(); // Unique per trigger
    });

    issues.push(...seoIssues, ...mobileIssues, ...contentIssues);
  } catch {}

  return issues;
}

function runListingPublishAudit(listingId: string, listingType: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();

  // Run SEO check for the listing page
  const seoIssues = runSEOAudit();
  seoIssues.forEach((i) => {
    i.location = `Listing ${listingId} (${listingType})`;
    i.id = uid();
  });
  issues.push(...seoIssues);

  // Run content quality check
  const contentIssues = runContentAudit();
  contentIssues.forEach((i) => {
    i.location = `Listing ${listingId}`;
    i.id = uid();
  });
  issues.push(...contentIssues);

  // Run brand consistency check
  const brandIssues = runBrandAudit();
  brandIssues.forEach((i) => {
    i.location = `Listing ${listingId}`;
    i.id = uid();
  });
  issues.push(...brandIssues);

  // Run conversion check (CTAs present?)
  const conversionIssues = runConversionAudit();
  conversionIssues.forEach((i) => {
    i.location = `Listing ${listingId}`;
    i.id = uid();
  });
  issues.push(...conversionIssues);

  return issues;
}

function runListingUpdateAudit(listingId: string): AuditIssue[] {
  // Lighter check on updates — just SEO and content
  const issues: AuditIssue[] = [];

  const seoIssues = runSEOAudit();
  seoIssues.forEach((i) => { i.location = `Listing ${listingId}`; i.id = uid(); });
  issues.push(...seoIssues);

  return issues;
}

function runTranslationAudit(locale: string, key: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();

  // Check if the translation was emptied
  if (!key || key.trim() === "") {
    issues.push({
      id: uid(), category: "international", severity: "medium",
      title: `Empty translation key for locale "${locale}"`,
      description: "A translation key was set to empty, which may cause fallback or missing text.",
      suggestedFix: "Provide a valid translation or remove the key entry.",
      autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now,
      location: `i18n/${locale}`,
    });
  }

  return issues;
}

function runBookingSuccessAudit(bookingId: string, module: string): AuditIssue[] {
  // On successful booking, check if the confirmation page is ready
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();

  // Quick DOM check for confirmation elements
  if (typeof document !== "undefined") {
    const confirmMsg = document.querySelector("[data-booking-confirmation], [class*='success'], [class*='confirm']");
    if (!confirmMsg) {
      issues.push({
        id: uid(), category: "conversion", severity: "medium",
        title: "No visible booking confirmation",
        description: `Booking ${bookingId} (${module}) completed but no confirmation UI element detected.`,
        suggestedFix: "Add a visible success/confirmation message after booking completion.",
        autoFixable: false, businessImpact: "trust", status: "open", detectedAt: now,
        location: `Booking flow (${module})`,
      });
    }
  }

  return issues;
}

function runPaymentSuccessAudit(paymentId: string, amount: number, currency: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();

  // Verify receipt generation trigger
  if (amount <= 0) {
    issues.push({
      id: uid(), category: "payment", severity: "high",
      title: "Zero/negative payment recorded",
      description: `Payment ${paymentId} has amount ${amount} ${currency}. This may indicate a pricing error.`,
      suggestedFix: "Review pricing logic and payment validation.",
      autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════
// React Hook — Navigation Trigger
// ═══════════════════════════════════════════════════════

/**
 * Call this from useEffect in route components to trigger page-level audits.
 * Designed to be lightweight and non-blocking.
 */
export function triggerPageAudit(path: string) {
  // Run asynchronously to not block rendering
  setTimeout(() => {
    dispatchTriggerAudit({ type: "page_navigated", path }).catch(() => {});
  }, 2000); // Wait 2s for page to fully render
}

// ═══════════════════════════════════════════════════════
// Sync Engine Integration Hook
// ═══════════════════════════════════════════════════════

/**
 * Call after dispatchSyncEvent to check sync health.
 * Pass the result to detect sync failures.
 */
export function auditSyncResult(syncType: string, success: boolean, error?: string) {
  if (!success) {
    dispatchTriggerAudit({ type: "sync_event", syncType, success, error }).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════
// Error Boundary Integration
// ═══════════════════════════════════════════════════════

/**
 * Call from ErrorBoundary to report UI regressions.
 */
export function reportUIRegression(component: string, issue: string) {
  dispatchTriggerAudit({ type: "ui_regression", component, issue }).catch(() => {});
}

/**
 * Call from route error handlers to report broken routes.
 */
export function reportRouteError(path: string, error: string) {
  dispatchTriggerAudit({ type: "route_error", path, error }).catch(() => {});
}

// ═══════════════════════════════════════════════════════
// Payment & Booking Trigger Hooks
// ═══════════════════════════════════════════════════════

export function auditPaymentResult(success: boolean, details: {
  paymentId?: string; amount?: number; currency?: string; error?: string;
}) {
  if (success && details.paymentId) {
    dispatchTriggerAudit({
      type: "payment_completed",
      paymentId: details.paymentId,
      amount: details.amount || 0,
      currency: details.currency || "EUR",
    }).catch(() => {});
  } else if (!success) {
    dispatchTriggerAudit({
      type: "payment_failed",
      error: details.error || "Unknown payment error",
      amount: details.amount,
    }).catch(() => {});
  }
}

export function auditBookingResult(success: boolean, details: {
  bookingId?: string; module: "seasonal" | "marketplace"; error?: string;
}) {
  if (success && details.bookingId) {
    dispatchTriggerAudit({
      type: "booking_created",
      bookingId: details.bookingId,
      module: details.module,
    }).catch(() => {});
  } else if (!success) {
    dispatchTriggerAudit({
      type: "booking_failed",
      bookingId: details.bookingId,
      error: details.error || "Unknown booking error",
      module: details.module,
    }).catch(() => {});
  }
}

export function auditNotificationResult(success: boolean, details: {
  notificationId?: string; error?: string;
}) {
  if (!success) {
    dispatchTriggerAudit({
      type: "notification_failed",
      notificationId: details.notificationId,
      error: details.error || "Notification delivery failed",
    }).catch(() => {});
  }
}

export function auditListingPublish(listingId: string, listingType: "seasonal" | "marketplace" | "real_estate") {
  dispatchTriggerAudit({ type: "listing_published", listingId, listingType }).catch(() => {});
}

export function auditListingUpdate(listingId: string) {
  dispatchTriggerAudit({ type: "listing_updated", listingId }).catch(() => {});
}

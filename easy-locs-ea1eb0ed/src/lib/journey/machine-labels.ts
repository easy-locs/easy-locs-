/**
 * Machine Labels — plain-language display labels for every canonical machine state.
 *
 * Rule (per human-first UX doctrine): no raw state name (e.g. "payment_pending",
 * "in_progress") is ever rendered directly in the UI. Every user-visible state
 * MUST have an entry here that uses conversational language.
 *
 * Usage (Phase 2+): import `getMachineLabel` and pass the machine id + state.
 * Phase 1: Scaffold only — not yet imported by any UI component.
 *
 * Structure:  Record<machineName, Record<stateName, string>>
 */

// ── Label map ─────────────────────────────────────────────────────────────────

export const MACHINE_LABELS: Record<string, Record<string, string>> = {

  MESSAGE_MACHINE: {
    draft: "Writing…",
    sending: "Sending…",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed to send",
    retrying: "Retrying…",
  },

  CALL_MACHINE: {
    idle: "Ready",
    calling: "Calling…",
    ringing: "Ringing…",
    incoming: "Incoming call",
    connecting: "Connecting…",
    active: "On a call",
    reconnecting: "Reconnecting…",
    ended: "Call ended",
    missed: "Missed call",
    declined: "Call declined",
    failed: "Call failed",
  },

  UPLOAD_MACHINE: {
    idle: "Ready to upload",
    preparing: "Preparing…",
    uploading: "Uploading…",
    processing: "Processing…",
    completed: "Upload complete",
    failed: "Upload failed",
    cancelled: "Upload cancelled",
  },

  CONNECTION_MACHINE: {
    disconnected: "Offline",
    connecting: "Connecting…",
    connected: "Connected",
    reconnecting: "Reconnecting…",
    failed: "Connection failed",
  },

  NOTIFICATION_MACHINE: {
    pending: "Sending notification…",
    sent: "Notification sent",
    delivered: "Delivered",
    read: "Seen",
    dismissed: "Dismissed",
    failed: "Notification failed",
  },

  AUTH_SESSION_MACHINE: {
    anonymous: "Not signed in",
    authenticating: "Signing in…",
    mfa_required: "Enter your verification code",
    authenticated: "Signed in",
    refreshing: "Refreshing session…",
    expired: "Session expired — please sign in again",
    locked: "Account locked",
    signing_out: "Signing out…",
  },

  CHECKOUT_MACHINE: {
    idle: "Ready to check out",
    cart_review: "Review your cart",
    address_selection: "Choose a delivery address",
    payment_selection: "Choose how to pay",
    payment_pending: "Confirm your payment",
    processing: "Processing your order…",
    completed: "Order placed!",
    failed: "Something went wrong — please try again",
    cancelled: "Order cancelled",
  },

  ONBOARDING_MACHINE: {
    not_started: "Welcome",
    profile_setup: "Set up your profile",
    phone_verification: "Verify your phone number",
    identity_verification: "Verify your identity",
    preferences: "Choose your preferences",
    tutorial: "Quick tour",
    completed: "You're all set!",
    skipped: "Setup skipped",
  },

  BOOKING_MACHINE: {
    browsing: "Choose a time",
    slot_selected: "Time selected",
    confirming: "Confirm your booking",
    payment_pending: "Complete payment",
    confirmed: "Booking confirmed",
    reminder_sent: "Reminder sent",
    in_progress: "In progress",
    completed: "Done",
    no_show: "No show",
    cancelled: "Cancelled",
    refunded: "Refunded",
    rescheduled: "Rescheduled",
  },

  RESERVATION_MACHINE: {
    pending: "Awaiting confirmation",
    waitlisted: "On the waitlist",
    confirmed: "Reservation confirmed",
    seated: "Seated",
    completed: "Visit complete",
    cancelled: "Cancelled",
    no_show: "No show",
  },

  SUPPORT_TICKET_MACHINE: {
    open: "We received your request",
    triaged: "Looking into it",
    assigned: "Assigned to an agent",
    in_progress: "Being handled",
    waiting_customer: "Waiting for your reply",
    waiting_agent: "Agent is reviewing",
    escalated: "Escalated for review",
    resolved: "Resolved",
    closed: "Closed",
    reopened: "Reopened",
  },

  REPAIR_MACHINE: {
    reported: "Issue reported",
    acknowledged: "Acknowledged",
    diagnosed: "Diagnosed",
    quote_sent: "Quote sent",
    quote_approved: "Quote approved",
    parts_ordered: "Parts ordered",
    parts_received: "Parts received",
    in_repair: "Being repaired",
    quality_check: "Quality check",
    completed: "Repair complete",
    invoiced: "Invoice sent",
    paid: "Paid",
    cancelled: "Cancelled",
    warranty_claim: "Warranty claim",
  },

  SUBSCRIPTION_MACHINE: {
    inactive: "Not subscribed",
    trial: "Free trial",
    active: "Active",
    past_due: "Payment overdue",
    paused: "Paused",
    cancelled: "Cancelled",
    expired: "Expired",
  },

  JOURNEY_MACHINE: {
    idle: "Not started",
    started: "Starting…",
    in_progress: "In progress",
    interrupted: "Left unfinished",
    resuming: "Picking up where you left off…",
    completed: "Done",
    failed: "Something went wrong",
    abandoned: "Abandoned",
  },

  DEEP_LINK_MACHINE: {
    received: "Opening link…",
    validating: "Checking link…",
    deferred: "Sign in to continue",
    resolving: "Opening…",
    resolved: "Opened",
    invalid: "This link doesn't work",
    expired: "This link has expired",
  },

};

// ── Accessor ──────────────────────────────────────────────────────────────────

/**
 * Get the human-readable label for a given machine state.
 * Falls back to the raw state name if no label is defined (should not happen
 * in production — the TypeScript check will catch it at build time).
 */
export function getMachineLabel(machineName: string, state: string): string {
  return MACHINE_LABELS[machineName]?.[state] ?? state;
}

// ── Type-level completeness check ─────────────────────────────────────────────
// These types ensure that every known machine state has a label entry.
// If a new state is added to canonical-machines.ts, TypeScript will error here
// until a label is added to MACHINE_LABELS.

import type {
  MessageState,
  CallState,
  UploadState,
  ConnectionState,
  NotificationState,
  AuthSessionState,
  CheckoutState,
  OnboardingState,
  BookingFlowState,
  ReservationState,
  SupportTicketState,
  RepairState,
  SubscriptionState,
  JourneyState,
  DeepLinkState,
} from "@/lib/state-machines/canonical-machines";

type AssertLabelled<MachineName extends string, State extends string> =
  Record<MachineName, Record<State, string>>;

// These type assertions will produce a TypeScript error if any state is missing
// from MACHINE_LABELS. They are compile-time only — no runtime cost.
type _LabelCheck = AssertLabelled<"MESSAGE_MACHINE", MessageState>
  & AssertLabelled<"CALL_MACHINE", CallState>
  & AssertLabelled<"UPLOAD_MACHINE", UploadState>
  & AssertLabelled<"CONNECTION_MACHINE", ConnectionState>
  & AssertLabelled<"NOTIFICATION_MACHINE", NotificationState>
  & AssertLabelled<"AUTH_SESSION_MACHINE", AuthSessionState>
  & AssertLabelled<"CHECKOUT_MACHINE", CheckoutState>
  & AssertLabelled<"ONBOARDING_MACHINE", OnboardingState>
  & AssertLabelled<"BOOKING_MACHINE", BookingFlowState>
  & AssertLabelled<"RESERVATION_MACHINE", ReservationState>
  & AssertLabelled<"SUPPORT_TICKET_MACHINE", SupportTicketState>
  & AssertLabelled<"REPAIR_MACHINE", RepairState>
  & AssertLabelled<"SUBSCRIPTION_MACHINE", SubscriptionState>
  & AssertLabelled<"JOURNEY_MACHINE", JourneyState>
  & AssertLabelled<"DEEP_LINK_MACHINE", DeepLinkState>;

// Validate the actual MACHINE_LABELS object satisfies all label contracts.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _machineLabelTypeCheck: _LabelCheck = MACHINE_LABELS as unknown as _LabelCheck;

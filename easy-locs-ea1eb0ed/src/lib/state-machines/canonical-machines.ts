/**
 * Canonical State Machines — Strict transition rules for critical entities.
 * No state transition outside these definitions is allowed.
 */

/** Lightweight machine definition for canonical entities */
export interface StateNode<S extends string> {
  on?: Record<string, S>;
}

export interface CanonicalMachineDef<S extends string> {
  initial: S;
  states: Record<S, StateNode<S>>;
}

export interface TransitionRejection {
  currentState: string;
  event: string;
  validEvents: string[];
  timestamp: number;
}

let _strictMode = false;
let _onInvalidTransition: ((rejection: TransitionRejection) => void) | null = null;
const _transitionLog: TransitionRejection[] = [];
const MAX_TRANSITION_LOG = 200;

export function enableStrictMode(callback?: (rejection: TransitionRejection) => void): void {
  _strictMode = true;
  _onInvalidTransition = callback ?? null;
}

export function disableStrictMode(): void {
  _strictMode = false;
  _onInvalidTransition = null;
}

export function getTransitionLog(): TransitionRejection[] {
  return [..._transitionLog];
}

export function clearTransitionLog(): void {
  _transitionLog.length = 0;
}

export function transition<S extends string>(
  machine: CanonicalMachineDef<S>,
  currentState: S,
  event: string,
): S | null {
  const node = machine.states[currentState];
  if (!node?.on) {
    const rejection: TransitionRejection = {
      currentState,
      event,
      validEvents: [],
      timestamp: Date.now(),
    };
    _transitionLog.push(rejection);
    if (_transitionLog.length > MAX_TRANSITION_LOG) _transitionLog.shift();

    if (import.meta.env?.DEV) {
      console.warn(
        `[state-machine] Invalid transition: state="${currentState}" event="${event}" — no transitions defined for this state`,
      );
    }

    if (_strictMode) {
      _onInvalidTransition?.(rejection);
      import("@/lib/shared/platform-bus").then(({ platformBus }) => {
        platformBus.emit("system:invalid_transition", rejection, "system");
      }).catch((err) => {
        console.error("[state-machine] Failed to emit invalid_transition event:", err);
      });
    }

    _recordTransitionTrace(currentState, event, null);
    return null;
  }
  const next = node.on[event];
  if (next !== undefined) {
    _recordTransitionTrace(currentState, event, next);
    return next;
  }

  const validEvents = Object.keys(node.on);
  const rejection: TransitionRejection = {
    currentState,
    event,
    validEvents,
    timestamp: Date.now(),
  };
  _transitionLog.push(rejection);
  if (_transitionLog.length > MAX_TRANSITION_LOG) _transitionLog.shift();

  if (import.meta.env?.DEV) {
    console.warn(
      `[state-machine] Invalid transition: state="${currentState}" event="${event}" — valid events: [${validEvents.join(", ")}]`,
    );
  }

  if (_strictMode) {
    _onInvalidTransition?.(rejection);
    import("@/lib/shared/platform-bus").then(({ platformBus }) => {
      platformBus.emit("system:invalid_transition", rejection, "system");
    }).catch((err) => {
      console.error("[state-machine] Failed to emit invalid_transition event:", err);
    });
  }

  _recordTransitionTrace(currentState, event, null);
  return null;
}

let _transitionTracer: ((from: string, event: string, to: string | null) => void) | null = null;

export function setTransitionTracer(tracer: (from: string, event: string, to: string | null) => void): () => void {
  _transitionTracer = tracer;
  return () => { _transitionTracer = null; };
}

function _recordTransitionTrace(from: string, event: string, to: string | null): void {
  if (_transitionTracer) {
    try {
      _transitionTracer(from, event, to);
    } catch (err) {
      console.error("[state-machine] Transition trace recording failed:", err);
    }
  }
}

export function validateMachineGraph<S extends string>(
  machine: CanonicalMachineDef<S>,
): { orphanStates: S[]; terminalStates: S[]; unreachableStates: S[]; cycles: S[][]; valid: boolean } {
  const allStates = Object.keys(machine.states) as S[];
  const reachable = new Set<S>();
  const terminalStates: S[] = [];

  const queue: S[] = [machine.initial];
  reachable.add(machine.initial);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = machine.states[current];
    if (!node?.on || Object.keys(node.on).length === 0) {
      terminalStates.push(current);
      continue;
    }
    for (const target of Object.values(node.on) as S[]) {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  const unreachableStates = allStates.filter((s) => !reachable.has(s));

  const isTargeted = new Set<S>();
  isTargeted.add(machine.initial);
  for (const [, node] of Object.entries(machine.states) as [S, StateNode<S>][]) {
    if (node.on && Object.keys(node.on).length > 0) {
      for (const target of Object.values(node.on) as S[]) {
        isTargeted.add(target);
      }
    }
  }

  const orphanStates = allStates.filter(
    (s) => !isTargeted.has(s) && s !== machine.initial,
  );

  const cycles: S[][] = [];
  const visited = new Set<S>();
  const recStack = new Set<S>();

  function dfs(state: S, path: S[]): void {
    visited.add(state);
    recStack.add(state);
    path.push(state);

    const node = machine.states[state];
    if (node?.on) {
      for (const target of Object.values(node.on) as S[]) {
        if (!visited.has(target)) {
          dfs(target, [...path]);
        } else if (recStack.has(target)) {
          const cycleStart = path.indexOf(target);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), target]);
          }
        }
      }
    }

    recStack.delete(state);
  }

  for (const state of allStates) {
    if (!visited.has(state)) {
      dfs(state, []);
    }
  }

  return {
    orphanStates,
    terminalStates,
    unreachableStates,
    cycles,
    valid: orphanStates.length === 0 && unreachableStates.length === 0,
  };
}

export function validateAllCanonicalMachines(): {
  machineName: string;
  valid: boolean;
  orphanStates: string[];
  unreachableStates: string[];
  cycles: string[][];
}[] {
  const machines: [string, CanonicalMachineDef<string>][] = [
    ["MESSAGE_MACHINE", MESSAGE_MACHINE],
    ["CALL_MACHINE", CALL_MACHINE],
    ["UPLOAD_MACHINE", UPLOAD_MACHINE],
    ["CONNECTION_MACHINE", CONNECTION_MACHINE],
    ["NOTIFICATION_MACHINE", NOTIFICATION_MACHINE],
    ["AUTH_SESSION_MACHINE", AUTH_SESSION_MACHINE],
    ["CHECKOUT_MACHINE", CHECKOUT_MACHINE],
    ["ONBOARDING_MACHINE", ONBOARDING_MACHINE],
    ["BOOKING_MACHINE", BOOKING_MACHINE],
    ["SUPPORT_TICKET_MACHINE", SUPPORT_TICKET_MACHINE],
    ["REPAIR_MACHINE", REPAIR_MACHINE],
    ["SUBSCRIPTION_MACHINE", SUBSCRIPTION_MACHINE],
  ];

  return machines.map(([name, machine]) => {
    const result = validateMachineGraph(machine);
    return {
      machineName: name,
      valid: result.valid,
      orphanStates: result.orphanStates,
      unreachableStates: result.unreachableStates,
      cycles: result.cycles,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type MessageState = "draft" | "sending" | "sent" | "delivered" | "read" | "failed" | "retrying";

export const MESSAGE_MACHINE: CanonicalMachineDef<MessageState> = {
  initial: "draft",
  states: {
    draft: { on: { SEND: "sending" } },
    sending: { on: { ACK: "sent", FAIL: "failed" } },
    sent: { on: { DELIVER: "delivered", READ: "read" } },
    delivered: { on: { READ: "read" } },
    read: {},     // terminal
    failed: { on: { RETRY: "retrying" } },
    retrying: { on: { ACK: "sent", FAIL: "failed" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// CALL STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type CallState =
  | "idle" | "calling" | "ringing" | "incoming"
  | "connecting" | "active" | "reconnecting"
  | "ended" | "missed" | "declined" | "failed";

export const CALL_MACHINE: CanonicalMachineDef<CallState> = {
  initial: "idle",
  states: {
    idle: { on: { INITIATE: "calling", INCOMING: "incoming" } },
    calling: { on: { RING: "ringing", FAIL: "failed", CANCEL: "ended", TIMEOUT: "missed" } },
    ringing: { on: { ACCEPT: "connecting", DECLINE: "declined", TIMEOUT: "missed", CANCEL: "ended" } },
    incoming: { on: { ACCEPT: "connecting", DECLINE: "declined", TIMEOUT: "missed" } },
    connecting: { on: { CONNECTED: "active", FAIL: "failed" } },
    active: { on: { HANGUP: "ended", DISCONNECT: "reconnecting", FAIL: "failed" } },
    reconnecting: { on: { RECONNECTED: "active", FAIL: "failed", TIMEOUT: "ended" } },
    ended: {},    // terminal
    missed: {},   // terminal
    declined: {}, // terminal
    failed: { on: { RETRY: "calling" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// UPLOAD STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type UploadState = "idle" | "preparing" | "uploading" | "processing" | "completed" | "failed" | "cancelled";

export const UPLOAD_MACHINE: CanonicalMachineDef<UploadState> = {
  initial: "idle",
  states: {
    idle: { on: { START: "preparing" } },
    preparing: { on: { READY: "uploading", FAIL: "failed", CANCEL: "cancelled" } },
    uploading: { on: { PROGRESS: "uploading", DONE: "processing", FAIL: "failed", CANCEL: "cancelled" } },
    processing: { on: { COMPLETE: "completed", FAIL: "failed" } },
    completed: {}, // terminal
    failed: { on: { RETRY: "preparing" } },
    cancelled: {}, // terminal
  },
};

// ═══════════════════════════════════════════════════════════════
// CONNECTION STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";

export const CONNECTION_MACHINE: CanonicalMachineDef<ConnectionState> = {
  initial: "disconnected",
  states: {
    disconnected: { on: { CONNECT: "connecting" } },
    connecting: { on: { CONNECTED: "connected", FAIL: "failed", TIMEOUT: "failed" } },
    connected: { on: { DISCONNECT: "disconnected", DROP: "reconnecting" } },
    reconnecting: { on: { CONNECTED: "connected", FAIL: "failed", TIMEOUT: "failed" } },
    failed: { on: { RETRY: "connecting" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION DELIVERY STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type NotificationState = "pending" | "sent" | "delivered" | "read" | "dismissed" | "failed";

export const NOTIFICATION_MACHINE: CanonicalMachineDef<NotificationState> = {
  initial: "pending",
  states: {
    pending: { on: { SEND: "sent", FAIL: "failed" } },
    sent: { on: { DELIVER: "delivered", FAIL: "failed" } },
    delivered: { on: { READ: "read", DISMISS: "dismissed" } },
    read: {},       // terminal
    dismissed: {},  // terminal
    failed: { on: { RETRY: "pending" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// AUTH / SESSION STATE MACHINE
// Task #65 — Covers authentication and session lifecycle
// ═══════════════════════════════════════════════════════════════

export type AuthSessionState =
  | "anonymous"
  | "authenticating"
  | "mfa_required"
  | "authenticated"
  | "refreshing"
  | "expired"
  | "locked"
  | "signing_out";

export const AUTH_SESSION_MACHINE: CanonicalMachineDef<AuthSessionState> = {
  initial: "anonymous",
  states: {
    anonymous: { on: { LOGIN: "authenticating", SSO: "authenticating" } },
    authenticating: { on: { SUCCESS: "authenticated", MFA: "mfa_required", FAIL: "anonymous" } },
    mfa_required: { on: { VERIFY: "authenticated", FAIL: "anonymous", CANCEL: "anonymous" } },
    authenticated: { on: { EXPIRE: "expired", REFRESH: "refreshing", LOCK: "locked", LOGOUT: "signing_out" } },
    refreshing: { on: { SUCCESS: "authenticated", FAIL: "expired" } },
    expired: { on: { LOGIN: "authenticating", REFRESH: "refreshing" } },
    locked: { on: { UNLOCK: "authenticated", LOGOUT: "signing_out", TIMEOUT: "anonymous" } },
    signing_out: { on: { DONE: "anonymous" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// CHECKOUT STATE MACHINE
// Task #65 — Covers the complete checkout flow
// ═══════════════════════════════════════════════════════════════

export type CheckoutState =
  | "idle"
  | "cart_review"
  | "address_selection"
  | "payment_selection"
  | "payment_pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export const CHECKOUT_MACHINE: CanonicalMachineDef<CheckoutState> = {
  initial: "idle",
  states: {
    idle: { on: { START: "cart_review" } },
    cart_review: { on: { PROCEED: "address_selection", CANCEL: "cancelled" } },
    address_selection: { on: { CONFIRM_ADDRESS: "payment_selection", BACK: "cart_review", CANCEL: "cancelled" } },
    payment_selection: { on: { CONFIRM_PAYMENT: "payment_pending", BACK: "address_selection", CANCEL: "cancelled" } },
    payment_pending: { on: { PAY: "processing", CANCEL: "cancelled", FAIL: "failed" } },
    processing: { on: { SUCCESS: "completed", FAIL: "failed" } },
    completed: {},   // terminal
    failed: { on: { RETRY: "payment_pending", CANCEL: "cancelled" } },
    cancelled: {},   // terminal
  },
};

// ═══════════════════════════════════════════════════════════════
// ONBOARDING STATE MACHINE
// Task #65 — Covers user onboarding flow
// ═══════════════════════════════════════════════════════════════

export type OnboardingState =
  | "not_started"
  | "profile_setup"
  | "phone_verification"
  | "identity_verification"
  | "preferences"
  | "tutorial"
  | "completed"
  | "skipped";

export const ONBOARDING_MACHINE: CanonicalMachineDef<OnboardingState> = {
  initial: "not_started",
  states: {
    not_started: { on: { START: "profile_setup", SKIP: "skipped" } },
    profile_setup: { on: { NEXT: "phone_verification", SKIP: "skipped" } },
    phone_verification: { on: { VERIFY: "identity_verification", SKIP: "preferences" } },
    identity_verification: { on: { VERIFY: "preferences", SKIP: "preferences" } },
    preferences: { on: { NEXT: "tutorial", SKIP: "completed" } },
    tutorial: { on: { FINISH: "completed", SKIP: "completed" } },
    completed: {},   // terminal
    skipped: {},     // terminal
  },
};

// ═══════════════════════════════════════════════════════════════
// BOOKING / AVAILABILITY STATE MACHINE
// Task #65 — Covers booking lifecycle
// ═══════════════════════════════════════════════════════════════

export type BookingFlowState =
  | "browsing"
  | "slot_selected"
  | "confirming"
  | "payment_pending"
  | "confirmed"
  | "reminder_sent"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled"
  | "refunded"
  | "rescheduled";

export const BOOKING_MACHINE: CanonicalMachineDef<BookingFlowState> = {
  initial: "browsing",
  states: {
    browsing: { on: { SELECT_SLOT: "slot_selected" } },
    slot_selected: { on: { CONFIRM: "confirming", CANCEL: "browsing" } },
    confirming: { on: { REQUIRE_PAYMENT: "payment_pending", CONFIRM: "confirmed", CANCEL: "browsing" } },
    payment_pending: { on: { PAY: "confirmed", FAIL: "confirming", CANCEL: "cancelled" } },
    confirmed: { on: { REMIND: "reminder_sent", START: "in_progress", CANCEL: "cancelled", RESCHEDULE: "rescheduled", NO_SHOW: "no_show" } },
    reminder_sent: { on: { START: "in_progress", CANCEL: "cancelled", NO_SHOW: "no_show" } },
    in_progress: { on: { COMPLETE: "completed", CANCEL: "cancelled" } },
    completed: { on: { REFUND: "refunded" } },
    no_show: { on: { REFUND: "refunded" } },
    cancelled: { on: { REFUND: "refunded" } },
    refunded: {},    // terminal
    rescheduled: { on: { CONFIRM: "confirmed", CANCEL: "cancelled" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// SUPPORT TICKET STATE MACHINE
// Task #65 — Covers support ticket lifecycle
// ═══════════════════════════════════════════════════════════════

export type SupportTicketState =
  | "open"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "waiting_customer"
  | "waiting_agent"
  | "escalated"
  | "resolved"
  | "closed"
  | "reopened";

export const SUPPORT_TICKET_MACHINE: CanonicalMachineDef<SupportTicketState> = {
  initial: "open",
  states: {
    open: { on: { TRIAGE: "triaged", ASSIGN: "assigned", AUTO_RESOLVE: "resolved" } },
    triaged: { on: { ASSIGN: "assigned", ESCALATE: "escalated" } },
    assigned: { on: { START: "in_progress", REASSIGN: "assigned", ESCALATE: "escalated" } },
    in_progress: { on: { ASK_CUSTOMER: "waiting_customer", RESOLVE: "resolved", ESCALATE: "escalated" } },
    waiting_customer: { on: { CUSTOMER_REPLY: "in_progress", TIMEOUT: "closed", ESCALATE: "escalated" } },
    waiting_agent: { on: { AGENT_REPLY: "in_progress", TIMEOUT: "escalated" } },
    escalated: { on: { ASSIGN: "assigned", RESOLVE: "resolved" } },
    resolved: { on: { CLOSE: "closed", REOPEN: "reopened" } },
    closed: {},      // terminal
    reopened: { on: { ASSIGN: "assigned", TRIAGE: "triaged" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// REPAIR LIFECYCLE STATE MACHINE
// Task #65 — Covers repair/maintenance lifecycle
// ═══════════════════════════════════════════════════════════════

export type RepairState =
  | "reported"
  | "acknowledged"
  | "diagnosed"
  | "quote_sent"
  | "quote_approved"
  | "parts_ordered"
  | "parts_received"
  | "in_repair"
  | "quality_check"
  | "completed"
  | "invoiced"
  | "paid"
  | "cancelled"
  | "warranty_claim";

export const REPAIR_MACHINE: CanonicalMachineDef<RepairState> = {
  initial: "reported",
  states: {
    reported: { on: { ACKNOWLEDGE: "acknowledged", CANCEL: "cancelled" } },
    acknowledged: { on: { DIAGNOSE: "diagnosed", CANCEL: "cancelled" } },
    diagnosed: { on: { SEND_QUOTE: "quote_sent", CANCEL: "cancelled" } },
    quote_sent: { on: { APPROVE_QUOTE: "quote_approved", REJECT: "cancelled" } },
    quote_approved: { on: { ORDER_PARTS: "parts_ordered", START_REPAIR: "in_repair" } },
    parts_ordered: { on: { RECEIVE_PARTS: "parts_received", CANCEL: "cancelled" } },
    parts_received: { on: { START_REPAIR: "in_repair" } },
    in_repair: { on: { QC: "quality_check", FAIL: "diagnosed" } },
    quality_check: { on: { PASS: "completed", FAIL: "in_repair" } },
    completed: { on: { INVOICE: "invoiced", WARRANTY: "warranty_claim" } },
    invoiced: { on: { PAY: "paid" } },
    paid: {},        // terminal
    cancelled: {},   // terminal
    warranty_claim: { on: { DIAGNOSE: "diagnosed", RESOLVE: "completed" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION STATE MACHINE
// Task #65 — Covers subscription lifecycle
// ═══════════════════════════════════════════════════════════════

export type SubscriptionState =
  | "inactive"
  | "trial"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired";

export const SUBSCRIPTION_MACHINE: CanonicalMachineDef<SubscriptionState> = {
  initial: "inactive",
  states: {
    inactive: { on: { START_TRIAL: "trial", SUBSCRIBE: "active" } },
    trial: { on: { CONVERT: "active", EXPIRE: "expired", CANCEL: "cancelled" } },
    active: { on: { PAYMENT_FAIL: "past_due", PAUSE: "paused", CANCEL: "cancelled", EXPIRE: "expired" } },
    past_due: { on: { PAY: "active", CANCEL: "cancelled", EXPIRE: "expired" } },
    paused: { on: { RESUME: "active", CANCEL: "cancelled", EXPIRE: "expired" } },
    cancelled: {},   // terminal
    expired: { on: { RESUBSCRIBE: "active" } },
  },
};

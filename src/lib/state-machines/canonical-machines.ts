/**
 * Canonical State Machines — Strict transition rules for critical entities.
 * No state transition outside these definitions is allowed.
 */

/** Lightweight machine definition for canonical entities */
interface StateNode<S extends string> {
  on?: Record<string, S>;
}

interface CanonicalMachineDef<S extends string> {
  initial: S;
  states: Record<S, StateNode<S>>;
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type MessageState = "draft" | "sending" | "sent" | "delivered" | "read" | "failed";

export const MESSAGE_MACHINE: StateMachineDefinition<MessageState> = {
  initial: "draft",
  states: {
    draft: { on: { SEND: "sending" } },
    sending: { on: { ACK: "sent", FAIL: "failed" } },
    sent: { on: { DELIVER: "delivered" } },
    delivered: { on: { READ: "read" } },
    read: {},     // terminal
    failed: { on: { RETRY: "sending" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// CALL STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type CallState =
  | "idle" | "calling" | "ringing" | "incoming"
  | "connecting" | "active" | "reconnecting"
  | "ended" | "missed" | "declined" | "failed";

export const CALL_MACHINE: StateMachineDefinition<CallState> = {
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

export const UPLOAD_MACHINE: StateMachineDefinition<UploadState> = {
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

export const CONNECTION_MACHINE: StateMachineDefinition<ConnectionState> = {
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

export const NOTIFICATION_MACHINE: StateMachineDefinition<NotificationState> = {
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

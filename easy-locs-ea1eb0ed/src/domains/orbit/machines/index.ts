/**
 * Orbit Machines — Re-export canonical state machines relevant to Orbit.
 * These are the ONLY valid transition rules.
 */
export {
  transition,
  MESSAGE_MACHINE,
  CALL_MACHINE,
  UPLOAD_MACHINE,
  CONNECTION_MACHINE,
} from "@/lib/state-machines/canonical-machines";

export type {
  MessageState,
  CallState,
  UploadState,
  ConnectionState,
} from "@/lib/state-machines/canonical-machines";

// ══════════════════════════════════════════════
// DRAFT STATE MACHINE (Orbit-specific)
// ══════════════════════════════════════════════

import { transition as t } from "@/lib/state-machines/canonical-machines";

export type DraftState = "empty" | "dirty" | "saved" | "cleared";

export const DRAFT_MACHINE = {
  initial: "empty" as DraftState,
  states: {
    empty:   { on: { TYPE: "dirty" as DraftState } },
    dirty:   { on: { SAVE: "saved" as DraftState, CLEAR: "cleared" as DraftState, SEND: "cleared" as DraftState } },
    saved:   { on: { TYPE: "dirty" as DraftState, CLEAR: "cleared" as DraftState, SEND: "cleared" as DraftState } },
    cleared: { on: { TYPE: "dirty" as DraftState } },
  },
};

// ══════════════════════════════════════════════
// EPHEMERAL LIFECYCLE MACHINE
// ══════════════════════════════════════════════

export type EphemeralState = "created" | "active" | "expiring" | "expired" | "cleaned";

export const EPHEMERAL_MACHINE = {
  initial: "created" as EphemeralState,
  states: {
    created:  { on: { ACTIVATE: "active" as EphemeralState } },
    active:   { on: { EXPIRE_SOON: "expiring" as EphemeralState, FORCE_EXPIRE: "expired" as EphemeralState } },
    expiring: { on: { EXPIRE: "expired" as EphemeralState } },
    expired:  { on: { CLEAN: "cleaned" as EphemeralState } },
    cleaned:  {},
  },
};

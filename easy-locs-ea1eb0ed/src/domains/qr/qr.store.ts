/**
 * QR Store — Single owner for all QR scan state.
 *
 * States: idle → scanning → resolved → executing → done | invalid | failed
 */
import { create } from "zustand";

export type QrScanStatus = "idle" | "scanning" | "resolved" | "invalid" | "executing" | "done" | "failed";

export type QrActionType =
  | "open_conversation"
  | "open_entity"
  | "add_contact"
  | "join_group"
  | "open_menu"
  | "pay"
  | "open_location"
  | "unknown";

export interface QrResolvedPayload {
  raw: string;
  actionType: QrActionType;
  targetId: string | null;
  metadata: Record<string, unknown>;
}

interface QrStoreState {
  status: QrScanStatus;
  payload: QrResolvedPayload | null;
  error: string | null;

  // Actions
  startScan: () => void;
  resolve: (payload: QrResolvedPayload) => void;
  markInvalid: (error: string) => void;
  startExecute: () => void;
  complete: () => void;
  fail: (error: string) => void;
  reset: () => void;
}

/** Transition table for QR state machine */
const QR_TRANSITIONS: Record<QrScanStatus, QrScanStatus[]> = {
  idle: ["scanning"],
  scanning: ["resolved", "invalid", "failed", "idle"],
  resolved: ["executing", "idle"],
  invalid: ["idle", "scanning"],
  executing: ["done", "failed"],
  done: ["idle", "scanning"],
  failed: ["idle", "scanning"],
};

function canTransition(from: QrScanStatus, to: QrScanStatus): boolean {
  return QR_TRANSITIONS[from]?.includes(to) ?? false;
}

export const useQrStore = create<QrStoreState>((set, get) => ({
  status: "idle",
  payload: null,
  error: null,

  startScan: () => {
    if (!canTransition(get().status, "scanning")) return;
    set({ status: "scanning", payload: null, error: null });
  },

  resolve: (payload) => {
    if (!canTransition(get().status, "resolved")) return;
    set({ status: "resolved", payload, error: null });
  },

  markInvalid: (error) => {
    if (!canTransition(get().status, "invalid")) return;
    set({ status: "invalid", error });
  },

  startExecute: () => {
    if (!canTransition(get().status, "executing")) return;
    set({ status: "executing" });
  },

  complete: () => {
    if (!canTransition(get().status, "done")) return;
    set({ status: "done" });
  },

  fail: (error) => {
    const current = get().status;
    if (!canTransition(current, "failed")) return;
    set({ status: "failed", error });
  },

  reset: () => set({ status: "idle", payload: null, error: null }),
}));

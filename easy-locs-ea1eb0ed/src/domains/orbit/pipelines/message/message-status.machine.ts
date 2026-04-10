/**
 * message-status.machine — SINGLE source of truth for message status transitions.
 *
 * ALLOWED TRANSITIONS:
 *   sending  → sent | failed
 *   sent     → delivered
 *   delivered→ read
 *   failed   → retrying
 *   retrying → sent | failed
 *
 * FORBIDDEN (examples):
 *   delivered → sending
 *   read      → sent
 *   failed    → delivered (must go through retrying → sent first)
 *
 * Every status update in the entire codebase MUST call canTransition / transitionMessageStatus.
 */
import type { MessageStatus } from "@/domains/orbit/types";

const TRANSITION_TABLE: Record<MessageStatus, MessageStatus[]> = {
  sending:   ["sent", "failed"],
  sent:      ["delivered", "read"],   // read allowed directly for server-echo shortcut
  delivered: ["read"],
  read:      [],                       // terminal
  failed:    ["retrying"],
  retrying:  ["sent", "failed"],
};

/**
 * Can the message legally move from `from` → `to`?
 */
export function canTransitionMessageStatus(from: MessageStatus, to: MessageStatus): boolean {
  if (from === to) return false; // no-op
  return TRANSITION_TABLE[from]?.includes(to) ?? false;
}

/**
 * DEV assertion — logs error if transition is illegal.
 */
export function assertMessageStatusTransition(from: MessageStatus, to: MessageStatus, context?: string): boolean {
  const ok = canTransitionMessageStatus(from, to);
  if (!ok && import.meta.env.DEV) {
    console.error(`[MessageStatusMachine] BLOCKED transition ${from} → ${to}`, { context });
  }
  return ok;
}

/**
 * Compute next status for a message, or return null if transition is illegal.
 */
export function resolveNextStatus(current: MessageStatus, requested: MessageStatus): MessageStatus | null {
  if (current === requested) return null;
  if (canTransitionMessageStatus(current, requested)) return requested;

  if (import.meta.env.DEV) {
    console.warn(`[MessageStatusMachine] transition_blocked`, { from: current, to: requested });
  }
  return null;
}

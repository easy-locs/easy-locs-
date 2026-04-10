/**
 * callLifecyclePipeline — Canonical call state transitions.
 * All call state changes MUST go through this pipeline.
 */
import { transition, CALL_MACHINE } from "../../machines";
import type { CallState } from "../../machines";

export interface CallTransitionResult {
  ok: boolean;
  newState: CallState | null;
  error?: string;
}

/**
 * Attempt a call state transition through the canonical machine.
 */
export function attemptCallTransition(
  currentState: CallState,
  event: string,
): CallTransitionResult {
  const newState = transition(CALL_MACHINE, currentState, event);
  if (newState === null) {
    return {
      ok: false,
      newState: null,
      error: `Invalid transition: ${currentState} + ${event}`,
    };
  }
  return { ok: true, newState };
}

/**
 * Check if a call state is terminal.
 */
export function isCallTerminal(state: CallState): boolean {
  return ["ended", "missed", "declined"].includes(state);
}

/**
 * Determine if a ringing timeout should trigger.
 */
export function shouldTimeoutRinging(startedAt: number, timeoutMs = 30_000): boolean {
  return Date.now() - startedAt > timeoutMs;
}

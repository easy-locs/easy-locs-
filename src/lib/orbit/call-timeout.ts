/**
 * Call Timeout — Auto-decline call sessions after a timeout period.
 */
import { declineCallSession } from "@/lib/orbit/call-session";

const DEFAULT_RING_TIMEOUT_MS = 30_000; // 30 seconds

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Start a ring timeout for a call session.
 * If not answered within the timeout, automatically declines.
 */
export function startRingTimeout(
  callSessionId: string,
  onTimeout?: () => void,
  timeoutMs = DEFAULT_RING_TIMEOUT_MS
) {
  clearRingTimeout(callSessionId);

  const timer = setTimeout(async () => {
    activeTimers.delete(callSessionId);
    try {
      await declineCallSession(callSessionId);
      onTimeout?.();
    } catch (err) {
      console.error("[call-timeout] Failed to auto-decline", err);
    }
  }, timeoutMs);

  activeTimers.set(callSessionId, timer);
}

/**
 * Clear the ring timeout (call was answered or manually declined).
 */
export function clearRingTimeout(callSessionId: string) {
  const timer = activeTimers.get(callSessionId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(callSessionId);
  }
}

/**
 * Clear all active ring timers.
 */
export function clearAllRingTimeouts() {
  activeTimers.forEach((timer) => clearTimeout(timer));
  activeTimers.clear();
}

/**
 * ephemeral.events — Canonical system events for timer changes.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import type { DisappearTimer } from "./ephemeral-policy";

export const EphemeralEvents = {
  /** Emit timer changed event (for system notice in thread) */
  emitTimerChanged(conversationId: string, userId: string, newTimer: DisappearTimer): void {
    platformBus.emit("orbit:ephemeral_timer_changed", {
      conversationId,
      userId,
      timer: newTimer,
    }, "orbit", { userId });
  },

  /** Build system message body for timer change */
  getTimerChangeBody(displayName: string, timer: DisappearTimer): string {
    if (timer === "off") return `${displayName} turned off disappearing messages`;
    const labels: Record<string, string> = {
      "5m": "5 minutes",
      "1h": "1 hour",
      "24h": "24 hours",
      "7d": "7 days",
      "90d": "90 days",
    };
    return `${displayName} set disappearing messages to ${labels[timer] || timer}`;
  },
};

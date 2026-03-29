/**
 * ephemeral.message — Canonical ephemeral message metadata attachment.
 */
import type { DisappearTimer } from "./ephemeral-policy";
import { EphemeralPolicy } from "./ephemeral-policy";

export const EphemeralMessage = {
  /** Build ephemeral metadata to attach to a message */
  buildMetadata(timer: DisappearTimer, createdAt?: string): Record<string, any> {
    if (timer === "off") return {};
    const created = createdAt || new Date().toISOString();
    return {
      ephemeral: true,
      disappear_timer: timer,
      disappear_at: EphemeralPolicy.computeDisappearAt(created, timer),
    };
  },

  /** Check if a message is ephemeral from its metadata */
  isEphemeral(metadata: any): boolean {
    return !!metadata?.ephemeral || !!metadata?.disappear_at;
  },

  /** Check if a message has disappeared */
  hasDisappeared(metadata: any): boolean {
    return EphemeralPolicy.isDisappeared(metadata?.disappear_at || null);
  },

  /** Get the timer setting from message metadata */
  getTimer(metadata: any): DisappearTimer {
    return metadata?.disappear_timer || "off";
  },
};

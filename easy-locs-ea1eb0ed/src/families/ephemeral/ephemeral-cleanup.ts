/**
 * ephemeral.cleanup — Canonical local cleanup of expired ephemeral messages.
 */
import { EphemeralMessage } from "./ephemeral-message";

export const EphemeralCleanup = {
  /** Filter out disappeared messages from a list */
  filterVisible<T extends { metadata?: any; metadata_json?: any }>(messages: T[]): T[] {
    return messages.filter((msg) => {
      const meta = msg.metadata || msg.metadata_json;
      if (!meta) return true;
      return !EphemeralMessage.hasDisappeared(meta);
    });
  },

  /** Get IDs of messages that should be cleaned up */
  getExpiredIds<T extends { id: string; metadata?: any; metadata_json?: any }>(messages: T[]): string[] {
    return messages
      .filter((msg) => {
        const meta = msg.metadata || msg.metadata_json;
        return meta && EphemeralMessage.hasDisappeared(meta);
      })
      .map((msg) => msg.id);
  },

  /** Get next expiry time for scheduling cleanup */
  getNextExpiryMs<T extends { metadata?: any; metadata_json?: any }>(messages: T[]): number | null {
    const now = Date.now();
    let nearest: number | null = null;

    for (const msg of messages) {
      const meta = msg.metadata || msg.metadata_json;
      const disappearAt = meta?.disappear_at;
      if (!disappearAt) continue;
      const ms = new Date(disappearAt).getTime();
      if (ms > now && (nearest === null || ms < nearest)) {
        nearest = ms;
      }
    }

    return nearest ? nearest - now : null;
  },
};

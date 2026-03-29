/**
 * story.expiry — Canonical story expiration logic.
 */

export const StoryExpiry = {
  /** Compute expiration timestamp */
  computeExpiresAt(createdAt: string | Date, hoursToLive = 24): string {
    const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    const expires = new Date(created.getTime() + hoursToLive * 60 * 60 * 1000);
    return expires.toISOString();
  },

  /** Check if a story is expired */
  isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() <= Date.now();
  },

  /** Get remaining time in seconds */
  getRemainingSeconds(expiresAt: string): number {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  },

  /** Get human-readable remaining time */
  getTimeLeftLabel(expiresAt: string): string {
    const secs = StoryExpiry.getRemainingSeconds(expiresAt);
    if (secs <= 0) return "Expired";
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    return `${Math.floor(secs / 3600)}h`;
  },
};

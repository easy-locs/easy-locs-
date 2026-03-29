/**
 * ephemeral.policy — Canonical disappearing message timer rules.
 */

export type DisappearTimer = "off" | "24h" | "7d" | "90d" | "1h" | "5m";

export interface EphemeralConfig {
  timer: DisappearTimer;
  setByUserId?: string;
  setAt?: string;
}

const TIMER_MS: Record<DisappearTimer, number> = {
  off: 0,
  "5m": 5 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export const EphemeralPolicy = {
  /** Get available timer options */
  getTimerOptions(): { value: DisappearTimer; label: string }[] {
    return [
      { value: "off", label: "Off" },
      { value: "5m", label: "5 minutes" },
      { value: "1h", label: "1 hour" },
      { value: "24h", label: "24 hours" },
      { value: "7d", label: "7 days" },
      { value: "90d", label: "90 days" },
    ];
  },

  /** Compute disappear_at from created_at + timer */
  computeDisappearAt(createdAt: string | Date, timer: DisappearTimer): string | null {
    if (timer === "off") return null;
    const ms = TIMER_MS[timer];
    const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    return new Date(created.getTime() + ms).toISOString();
  },

  /** Check if message should be hidden based on disappear_at */
  isDisappeared(disappearAt: string | null): boolean {
    if (!disappearAt) return false;
    return new Date(disappearAt).getTime() <= Date.now();
  },

  /** Get remaining time label */
  getRemainingLabel(disappearAt: string | null): string | null {
    if (!disappearAt) return null;
    const remaining = new Date(disappearAt).getTime() - Date.now();
    if (remaining <= 0) return "Expired";
    if (remaining < 60_000) return `${Math.ceil(remaining / 1000)}s`;
    if (remaining < 3_600_000) return `${Math.ceil(remaining / 60_000)}m`;
    if (remaining < 86_400_000) return `${Math.ceil(remaining / 3_600_000)}h`;
    return `${Math.ceil(remaining / 86_400_000)}d`;
  },

  /** Get timer duration in ms */
  getTimerMs(timer: DisappearTimer): number {
    return TIMER_MS[timer];
  },
};

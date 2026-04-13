import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

const CORRECTION_COOLDOWN_MS = 60_000;

export class UnreadIntegrityEngine extends BaseEngine {
  private lastUnreadCount: number | null = null;
  private lastCorrectionTime = 0;

  constructor() {
    super({
      id: "rt-unread-integrity",
      name: "Unread Integrity Engine",
      category: "realtime",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const badges = document.querySelectorAll("[data-unread-count]");
    let totalBadgeUnread = 0;
    badges.forEach(el => {
      const count = parseInt(el.getAttribute("data-unread-count") || "0", 10);
      if (!isNaN(count)) totalBadgeUnread += count;
    });

    if (this.lastUnreadCount !== null) {
      const jump = Math.abs(totalBadgeUnread - this.lastUnreadCount);
      if (jump > 50) {
        findings.push(`Unread count jump: ${this.lastUnreadCount} → ${totalBadgeUnread} (Δ${jump})`);
      }
    }

    if (totalBadgeUnread > 9999) {
      findings.push(`Unrealistic unread count: ${totalBadgeUnread}`);
      const now = Date.now();
      if (now - this.lastCorrectionTime > CORRECTION_COOLDOWN_MS) {
        this.lastCorrectionTime = now;
        badges.forEach(el => {
          const count = parseInt(el.getAttribute("data-unread-count") || "0", 10);
          if (count > 9999) {
            el.setAttribute("data-unread-count", "0");
            if (el instanceof HTMLElement) {
              el.textContent = "";
              el.style.display = "none";
            }
          }
        });
        platformBus.emit("orbit:unread_corrected", {
          timestamp: now,
          previousCount: totalBadgeUnread,
          correctedTo: 0,
          reason: "unrealistic_count",
        }, "orbit");
        actions.push(`Corrected unrealistic unread count ${totalBadgeUnread} → 0`);
      }
    }

    const negBadges = document.querySelectorAll("[data-unread-count]");
    negBadges.forEach(el => {
      const count = parseInt(el.getAttribute("data-unread-count") || "0", 10);
      if (count < 0) {
        el.setAttribute("data-unread-count", "0");
        if (el instanceof HTMLElement) el.textContent = "";
        findings.push(`Negative unread count corrected: ${count} → 0`);
        actions.push(`Fixed negative unread badge`);
      }
    });

    this.lastUnreadCount = totalBadgeUnread;

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}

import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class UnreadIntegrityEngine extends BaseEngine {
  private lastUnreadCount: number | null = null;

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
    this.lastUnreadCount = totalBadgeUnread;

    if (totalBadgeUnread > 9999) {
      findings.push(`Unrealistic unread count: ${totalBadgeUnread}`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}

import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

const CORRECTION_COOLDOWN_MS = 60_000;

export class FraudDetectionEngine extends BaseEngine {
  private lastUnreadCount: number | null = null;
  private lastCorrectionTime = 0;

  constructor() {
    super({
      id: "fraud-detection-engine",
      name: "Fraud Detection Engine",
      category: "fraud-detection",
      domain: "security",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    const findings: string[] = [];

    this.tickUnreadIntegrity(findings, actions);
    await this.tickSentinelConflict(findings, actions);
    await this.tickSentinelValidation(findings, actions);
    await this.tickSentinelInvariants(findings, actions);
    await this.tickSecurityEnforcement(findings, actions);

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }

  private tickUnreadIntegrity(findings: string[], actions: string[]): void {
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
          }
        });
        platformBus.emit("orbit:unread_corrected", {
          timestamp: now, previousCount: totalBadgeUnread, correctedTo: 0, reason: "unrealistic_count",
        }, "orbit");
        actions.push(`Corrected unrealistic unread count ${totalBadgeUnread} → 0`);
      }
    }

    const negBadges = document.querySelectorAll("[data-unread-count]");
    negBadges.forEach(el => {
      const count = parseInt(el.getAttribute("data-unread-count") || "0", 10);
      if (count < 0) {
        el.setAttribute("data-unread-count", "0");
        findings.push(`Negative unread count corrected: ${count} → 0`);
        actions.push(`Fixed negative unread badge`);
      }
    });

    this.lastUnreadCount = totalBadgeUnread;
  }

  private async tickSentinelConflict(findings: string[], actions: string[]): Promise<void> {
    try {
      const { sentinelConflictEngine } = await import("@/core/sentinel/conflict/sentinel-conflict-engine");
      const conflicts = sentinelConflictEngine.runFullScan();
      if (conflicts.length > 0) {
        findings.push(`${conflicts.length} conflicts detected`);
        actions.push(`CONFLICTS: ${conflicts.length} found`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[fraud_detection] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickSentinelValidation(findings: string[], actions: string[]): Promise<void> {
    try {
      const { sentinelValidationEngine } = await import("@/core/sentinel/validation/sentinel-validation-engine");
      const results = sentinelValidationEngine.runAll();
      const failed = results.filter((r: { valid: boolean }) => !r.valid).length;
      if (failed > 0) {
        findings.push(`${failed} validation failures`);
        actions.push(`VALIDATION_FAILURES: ${failed}`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[fraud_detection] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickSentinelInvariants(findings: string[], actions: string[]): Promise<void> {
    try {
      const { sentinelInvariantEngine } = await import("@/core/sentinel/invariants/invariant-engine");
      const results = sentinelInvariantEngine.checkAll();
      const failed = results.filter((r: { passed: boolean }) => !r.passed).length;
      if (failed > 0) {
        findings.push(`${failed} invariant violations`);
        actions.push(`INVARIANT_VIOLATIONS: ${failed}`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[fraud_detection] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickSecurityEnforcement(findings: string[], actions: string[]): Promise<void> {
    try {
      const { sentinelEngineRegistry } = await import("@/core/sentinel/registry/module-tracker");
      const selfEntry = sentinelEngineRegistry.get("fraud-detection-engine");
      if (selfEntry && selfEntry.status !== "healthy") {
        findings.push(`Fraud detection sentinel status: ${selfEntry.status}`);
      }
      const engines = sentinelEngineRegistry.getAll();
      const unhealthy = engines.filter(e => e.status !== "healthy" && e.engine_type === "module");
      if (unhealthy.length > 0) {
        findings.push(`${unhealthy.length} core sentinel engine(s) unhealthy`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[fraud_detection] sub-module error', err instanceof Error ? err.message : err); }
  }
}

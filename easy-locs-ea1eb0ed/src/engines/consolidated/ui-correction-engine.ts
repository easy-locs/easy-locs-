import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { getMediaViolations } from "../governance/media-relevance-engine";
import { getTextViolations } from "../governance/text-integrity-engine";
import { getPageOpenStats } from "../governance/page-open-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class UICorrectionEngine extends BaseEngine {
  constructor() {
    super({
      id: "ui-correction-engine",
      name: "UI Correction Engine",
      category: "ui-correction",
      domain: "platform",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    let totalFindings = 0;

    const mediaFindings = this.tickMediaRelevance(actions);
    totalFindings += mediaFindings;

    const textFindings = this.tickTextIntegrity(actions);
    totalFindings += textFindings;

    const pageFindings = this.tickPageOpen(actions);
    totalFindings += pageFindings;

    await this.tickLiveSurfaceSanitizer(actions);
    await this.tickSearchHygiene(actions);
    await this.tickDashboardCards(actions);

    return {
      level: actions.length > 0 ? "act" : totalFindings > 0 ? "detect" : "observe",
      findings: totalFindings,
      actions: actions.slice(0, 8),
      duration: 0,
    };
  }

  private tickMediaRelevance(actions: string[]): number {
    const violations = getMediaViolations();
    const recent = violations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );
    const criticals = recent.filter((v) => v.severity === "critical");
    criticals.forEach((v) => actions.push(`BLOCK_MEDIA: ${v.message}`));
    return recent.length;
  }

  private tickTextIntegrity(actions: string[]): number {
    const violations = getTextViolations();
    const recent = violations.filter(
      (v) => Date.now() - new Date(v.detectedAt).getTime() < this.intervalMs
    );
    if (recent.length > 0) {
      platformBus.emit("text:integrity_violation", {
        violations: recent.map(v => ({
          id: v.id, type: v.type, severity: v.severity, message: v.message, source: v.source, code: v.code,
        })),
        count: recent.length,
        timestamp: Date.now(),
      }, "system");
    }
    recent.filter((v) => v.severity === "error").forEach((v) => actions.push(`TEXT_FIX: ${v.message}`));
    return recent.length;
  }

  private tickPageOpen(actions: string[]): number {
    const stats = getPageOpenStats();
    if (stats.topBrokenRoutes.length > 0) {
      stats.topBrokenRoutes.slice(0, 3).forEach((r) =>
        actions.push(`BROKEN_ROUTE: ${r.route} (${r.failures} failures)`)
      );
    }
    return stats.failed;
  }

  private async tickLiveSurfaceSanitizer(actions: string[]): Promise<void> {
    try {
      const { LiveSurfaceSanitizerEngine } = await import("@/lib/data-quality/engines/live-surface-sanitizer-engine");
      const engine = new LiveSurfaceSanitizerEngine();
      const scanFindings = engine.scan("SAFE_AUTO");
      if (scanFindings.length > 0) {
        actions.push(`Surface sanitizer: ${scanFindings.length} findings`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[ui_correction] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickSearchHygiene(actions: string[]): Promise<void> {
    try {
      const { SearchHygieneEngine } = await import("@/lib/data-quality/engines/search-hygiene-engine");
      const engine = new SearchHygieneEngine();
      const scanFindings = engine.scan("SAFE_AUTO");
      if (scanFindings.length > 0) {
        actions.push(`Search hygiene: ${scanFindings.length} findings`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[ui_correction] sub-module error', err instanceof Error ? err.message : err); }
  }

  private async tickDashboardCards(actions: string[]): Promise<void> {
    try {
      const { sentinelCardRegistry } = await import("@/core/sentinel/registry/card-registry");
      const cards = sentinelCardRegistry.getAll();
      let missingStates = 0;
      for (const card of cards) {
        if (!card.empty_state_defined || !card.loading_state_defined || !card.error_state_defined) missingStates++;
      }
      if (missingStates > 0) {
        actions.push(`Dashboard: ${missingStates} cards missing states`);
      }
    } catch (err) { if (import.meta.env.DEV) console.warn('[ui_correction] sub-module error', err instanceof Error ? err.message : err); }
  }
}

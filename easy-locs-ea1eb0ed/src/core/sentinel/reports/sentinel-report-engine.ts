import type {
  SentinelFinalReport, SentinelVerdict, EngineInventorySection, CronInventorySection,
  FlowHealthSection, SourceOfTruthSection, ConflictReportSection,
  PageHealthSection, SecurityHealthSection, MaintenanceHealthSection, SentinelStatus,
} from "../types";
import { sentinelEngineRegistry } from "../registry/module-tracker";
import { sentinelCronRegistry } from "../registry/cron-registry";
import { sentinelSourceOfTruthRegistry } from "../registry/source-of-truth-registry";
import { sentinelPageRegistry } from "../registry/page-registry";
import { sentinelConflictEngine } from "../conflict/sentinel-conflict-engine";
import { sentinelHealingEngine } from "../healing/sentinel-healing-engine";
import { sentinelIncidentEngine } from "../incidents/sentinel-incident-engine";
import { sentinelScoringEngine } from "../scoring/sentinel-scoring-engine";

const FLOW_DOMAINS = ["wallet", "orbit", "search", "listing_publish", "delivery", "booking", "flight", "media_pipeline"];

class SentinelReportEngine {
  private reports: SentinelFinalReport[] = [];
  private readonly MAX_REPORTS = 20;

  generate(): SentinelFinalReport {
    const scores = sentinelScoringEngine.calculate();

    const engineInventory = this.buildEngineInventory();
    const cronInventory = this.buildCronInventory();
    const flowHealth = this.buildFlowHealth();
    const sourceOfTruth = this.buildSourceOfTruth();
    const conflictReport = this.buildConflictReport();
    const pageHealth = this.buildPageHealth();
    const securityHealth = this.buildSecurityHealth();
    const maintenanceHealth = this.buildMaintenanceHealth();

    const blockingReasons: string[] = [];
    const warnings: string[] = [];

    if (engineInventory.unhealthy > 0) blockingReasons.push(`${engineInventory.unhealthy} unhealthy engine(s)`);
    if (conflictReport.critical > 0) blockingReasons.push(`${conflictReport.critical} critical conflict(s)`);
    const criticalIncidents = sentinelIncidentEngine.getCritical();
    if (criticalIncidents.length > 0) blockingReasons.push(`${criticalIncidents.length} critical incident(s)`);

    if (engineInventory.degraded > 0) warnings.push(`${engineInventory.degraded} degraded engine(s)`);
    if (conflictReport.major > 0) warnings.push(`${conflictReport.major} major conflict(s)`);
    if (cronInventory.failed > 0) warnings.push(`${cronInventory.failed} failed cron(s)`);
    if (maintenanceHealth.fixes_blocked > 0) warnings.push(`${maintenanceHealth.fixes_blocked} blocked fixes`);

    let verdict: SentinelVerdict;
    if (blockingReasons.length > 0) verdict = "BLOCKED";
    else if (warnings.length > 0) verdict = "PASS_WITH_WARNINGS";
    else verdict = "PASS";

    const report: SentinelFinalReport = {
      generated_at: Date.now(),
      sentinel_version: "1.0.0",
      sections: {
        engine_inventory: engineInventory,
        cron_inventory: cronInventory,
        flow_health: flowHealth,
        source_of_truth_map: sourceOfTruth,
        conflict_report: conflictReport,
        page_health: pageHealth,
        security_health: securityHealth,
        maintenance_health: maintenanceHealth,
        global_scores: scores,
      },
      verdict,
      blocking_reasons: blockingReasons,
      warnings,
    };

    this.reports.push(report);
    if (this.reports.length > this.MAX_REPORTS) {
      this.reports.splice(0, this.reports.length - this.MAX_REPORTS);
    }

    return report;
  }

  private buildEngineInventory(): EngineInventorySection {
    const summary = sentinelEngineRegistry.getSummary();
    const engines = sentinelEngineRegistry.getAll().map((e) => ({
      id: e.engine_id,
      name: e.engine_name,
      status: e.status,
      criticality: e.criticality,
      heartbeat_ok: Date.now() - e.last_heartbeat_at < e.heartbeat_interval_sec * 2000,
      owner: e.owner_domain,
    }));
    return { ...summary, engines };
  }

  private buildCronInventory(): CronInventorySection {
    const summary = sentinelCronRegistry.getSummary();
    const collisions = sentinelCronRegistry.getCollisions();
    const collisionSet = new Set(collisions.flatMap((c) => [c.a, c.b]));
    const jobs = sentinelCronRegistry.getAll().map((j) => ({
      id: j.cron_id,
      name: j.job_name,
      schedule: j.schedule,
      last_status: j.last_status,
      failure_count: j.failure_count,
      collisions: collisionSet.has(j.cron_id) ? 1 : 0,
    }));
    return { total: summary.total, running: summary.enabled, failed: summary.failed, skipped: jobs.filter((j) => j.last_status === "skipped").length, jobs };
  }

  private buildFlowHealth(): FlowHealthSection {
    const flows: Record<string, { status: SentinelStatus; open_incidents: number; last_audit: number }> = {};
    for (const domain of FLOW_DOMAINS) {
      const incidents = sentinelIncidentEngine.getByCategory(domain);
      const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "investigating");
      flows[domain] = {
        status: openIncidents.some((i) => i.severity === "critical") ? "unhealthy" : openIncidents.length > 0 ? "degraded" : "healthy",
        open_incidents: openIncidents.length,
        last_audit: 0,
      };
    }
    return { flows };
  }

  private buildSourceOfTruth(): SourceOfTruthSection {
    const entries = sentinelSourceOfTruthRegistry.getAll();
    const conflicts = sentinelSourceOfTruthRegistry.detectConflicts();
    return { entries, conflicts_remaining: conflicts.length };
  }

  private buildConflictReport(): ConflictReportSection {
    const summary = sentinelConflictEngine.getSummary();
    const open = sentinelConflictEngine.getOpen();
    return {
      critical: open.filter((c) => c.severity === "critical").length,
      major: open.filter((c) => c.severity === "high").length,
      auto_fixes: summary.auto_fixable,
      non_safe_reviews: open.filter((c) => !c.auto_fixable && c.severity !== "low").length,
      conflicts: open.slice(0, 50),
    };
  }

  private buildPageHealth(): PageHealthSection {
    const pages = sentinelPageRegistry.getAll().slice(0, 50).map((p) => ({
      route: p.route,
      seo_status: p.seo_template ? "ok" : "missing",
      perf_status: p.performance_budget > 0 ? "ok" : "unset",
      render_status: p.status,
    }));
    return { pages };
  }

  private buildSecurityHealth(): SecurityHealthSection {
    const incidents = sentinelIncidentEngine.getByCategory("security");
    const open = incidents.filter((i) => i.status === "open" || i.status === "investigating");
    return {
      exposed: open.filter((i) => i.title.toLowerCase().includes("expos")).length,
      drift: open.filter((i) => i.title.toLowerCase().includes("drift")).length,
      permissions_issues: open.filter((i) => i.title.toLowerCase().includes("permission")).length,
      dependency_vulnerabilities: open.filter((i) => i.title.toLowerCase().includes("dependency") || i.title.toLowerCase().includes("vulnerability")).length,
    };
  }

  private buildMaintenanceHealth(): MaintenanceHealthSection {
    const stats = sentinelHealingEngine.getStats();
    return {
      auto_fixes_applied: stats.safe_fixes,
      fixes_blocked: stats.pending_review,
      regressions: sentinelIncidentEngine.getRecurring().length,
    };
  }

  getLastReport(): SentinelFinalReport | null {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null;
  }

  getReportHistory(): SentinelFinalReport[] {
    return [...this.reports];
  }
}

export const sentinelReportEngine = new SentinelReportEngine();

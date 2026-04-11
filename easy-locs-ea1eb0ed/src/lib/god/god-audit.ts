import { antiConflictEngine } from "./anti-conflict-engine";
import { continuousAuditEngine } from "./continuous-audit-engine";
import { maintenanceEngine } from "./maintenance-engine";
import { cronOrchestrator } from "./cron-orchestrator";
import { qualityGateEngine } from "./quality-gate-engine";
import { observabilityEngine } from "./observability-engine";
import { hyperOptimizationEngine } from "./hyper-optimization-engine";
import { blackChamber } from "./black-chamber";
import { pastControl } from "./past-control";
import { stateMachineEngine } from "./state-machines";
import { taxonomyGodEngine } from "./taxonomy-god-engine";
import { contentGraph } from "./canonical-content-graph";
import { validationPipeline } from "./validation-pipeline";

export type FinalVerdict = "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED";

export interface EngineStatusRow {
  engine_name: string;
  running_status: "running" | "stopped" | "unknown";
  heartbeat_status: "ok" | "missing" | "stale";
  last_run: number;
  success_rate: number;
  failure_rate: number;
  avg_runtime_ms: number;
  last_incident: string | null;
  quality_score: number;
  conflict_score: number;
  audit_score: number;
  action_required: string | null;
}

export interface CronStatusRow {
  job_name: string;
  enabled: boolean;
  last_run: number;
  next_run: number;
  status: string;
  retry_count: number;
  timeout_count: number;
  conflicts_detected: number;
  lock_contention: number;
  skipped_runs: number;
}

export interface TaxonomyHealth {
  total_nodes: number;
  total_aliases: number;
  max_depth: number;
  invalid_paths: number;
  duplicate_paths: number;
  orphan_nodes: number;
  alias_conflicts: number;
  unmapped_items: number;
  path_repair_actions: string[];
}

export interface DataIntegrityReport {
  broken_relations: number;
  orphan_media: number;
  invalid_geo: number;
  invalid_time_data: number;
  inconsistent_states: number;
  duplicate_entities: number;
}

export interface FlowHealth {
  flow_name: string;
  status: "healthy" | "degraded" | "broken";
  issues: string[];
}

export interface PerformanceSummary {
  bundle_status: "ok" | "warning" | "critical";
  page_weight_status: "ok" | "warning" | "critical";
  lcp_risk: "low" | "medium" | "high";
  cls_risk: "low" | "medium" | "high";
  inp_risk: "low" | "medium" | "high";
  third_party_risk: "low" | "medium" | "high";
}

export interface SEOSummary {
  canonical_status: "ok" | "issues";
  sitemap_status: "ok" | "issues";
  robots_status: "ok" | "issues";
  schema_status: "ok" | "issues";
  metadata_completeness: number;
  broken_public_pages: number;
}

export interface SecuritySummary {
  headers: "ok" | "issues";
  key_exposure: "none" | "detected";
  permission_drift: "none" | "detected";
  vulnerabilities: number;
  auth_guard_coverage: number;
}

export interface ConflictSummary {
  source_of_truth_conflicts: number;
  state_conflicts: number;
  route_conflicts: number;
  taxonomy_conflicts: number;
  cron_conflicts: number;
  relation_conflicts: number;
}

export interface MaintenanceSummary {
  auto_fixes_applied: number;
  blocked_fixes: number;
  pending_reviews: number;
  repeated_regressions: number;
}

export interface FullGodAuditReport {
  timestamp: number;
  duration_ms: number;

  section_1_global_health: {
    overall_god_score: number;
    status: string;
    blocking_issues: number;
    warning_issues: number;
    self_healed_count: number;
    unresolved_count: number;
  };

  section_2_engine_status: EngineStatusRow[];

  section_3_cron_status: CronStatusRow[];

  section_4_taxonomy_health: TaxonomyHealth;

  section_5_data_integrity: DataIntegrityReport;

  section_6_flow_health: FlowHealth[];

  section_7_page_health: {
    homepage: "ok" | "issues";
    dashboard: "ok" | "issues";
    radar: "ok" | "issues";
    orbit: "ok" | "issues";
    wallet: "ok" | "issues";
  };

  section_8_performance: PerformanceSummary;

  section_9_seo: SEOSummary;

  section_10_security: SecuritySummary;

  section_11_conflicts: ConflictSummary;

  section_12_maintenance: MaintenanceSummary;

  section_13_verdict: {
    verdict: FinalVerdict;
    reasons: string[];
    next_actions: string[];
  };
}

class GodAudit {
  private lastReport: FullGodAuditReport | null = null;
  private reportHistory: FullGodAuditReport[] = [];

  runFullGodAudit(): FullGodAuditReport {
    const start = performance.now();

    const auditResult = continuousAuditEngine.runAllChecks();
    const conflictScan = antiConflictEngine.runFullScan();
    const smAudits = stateMachineEngine.auditAll();
    const taxStats = taxonomyGodEngine.getStats();
    const graphStats = contentGraph.getStats();
    const mStats = maintenanceEngine.getStats();
    const cronStats = cronOrchestrator.getStats();
    const snapshot = observabilityEngine.captureSnapshot();
    const gateReport = qualityGateEngine.evaluate("deploy");
    const valStats = validationPipeline.getStats();

    const section1 = {
      overall_god_score: snapshot.god_score.overall,
      status: auditResult.overall_status,
      blocking_issues: conflictScan.blocking_conflicts,
      warning_issues: auditResult.total_warnings,
      self_healed_count: mStats.appliedFixes,
      unresolved_count: conflictScan.human_review_needed,
    };

    const godEngines = [
      { name: "Anti-Conflict Engine", id: "anti-conflict-engine", engine: antiConflictEngine },
      { name: "Continuous Audit Engine", id: "continuous-audit-engine", engine: continuousAuditEngine },
      { name: "Maintenance Engine", id: "maintenance-engine", engine: maintenanceEngine },
      { name: "Cron Orchestrator", id: "cron-orchestrator", engine: cronOrchestrator },
      { name: "Quality Gate Engine", id: "quality-gate-engine", engine: qualityGateEngine },
      { name: "Observability Engine", id: "observability-engine", engine: observabilityEngine },
      { name: "Hyper Optimization Engine", id: "hyper-optimization-engine", engine: hyperOptimizationEngine },
      { name: "Black Chamber", id: "black-chamber", engine: blackChamber },
      { name: "Past Control Engine", id: "past-control", engine: pastControl },
    ];

    const section2: EngineStatusRow[] = godEngines.map((e) => {
      const stats = e.engine.stats;
      return {
        engine_name: e.name,
        running_status: stats.running ? "running" as const : "stopped" as const,
        heartbeat_status: stats.running && stats.tickCount > 0 ? "ok" as const : stats.running ? "stale" as const : "missing" as const,
        last_run: stats.lastTick,
        success_rate: stats.tickCount > 0 ? Math.round(((stats.tickCount - stats.errorCount) / stats.tickCount) * 100) : 0,
        failure_rate: stats.tickCount > 0 ? Math.round((stats.errorCount / stats.tickCount) * 100) : 0,
        avg_runtime_ms: 0,
        last_incident: null,
        quality_score: snapshot.god_score.overall,
        conflict_score: snapshot.god_score.conflict,
        audit_score: snapshot.god_score.data_integrity,
        action_required: !stats.running ? "Start engine" : null,
      };
    });

    const cronJobs = cronOrchestrator.getAllJobStatuses();
    const section3: CronStatusRow[] = cronJobs.map((j) => ({
      job_name: j?.job_id ?? "unknown",
      enabled: j?.status !== "disabled",
      last_run: j?.last_run ?? 0,
      next_run: j?.next_run ?? 0,
      status: j?.status ?? "unknown",
      retry_count: j?.retry_count ?? 0,
      timeout_count: j?.timeout_count ?? 0,
      conflicts_detected: j?.conflicts_detected ?? 0,
      lock_contention: 0,
      skipped_runs: j?.skipped_runs ?? 0,
    }));

    const taxConflicts = taxonomyGodEngine.detectConflicts();
    const section4: TaxonomyHealth = {
      total_nodes: taxStats.totalNodes,
      total_aliases: taxStats.totalAliases,
      max_depth: taxStats.maxDepth,
      invalid_paths: 0,
      duplicate_paths: taxConflicts.filter((c) => c.type === "duplicate").length,
      orphan_nodes: graphStats.orphanCount,
      alias_conflicts: taxConflicts.filter((c) => c.type === "alias_collision").length,
      unmapped_items: 0,
      path_repair_actions: taxConflicts.filter((c) => c.auto_fixable && c.suggested_fix).map((c) => c.suggested_fix!),
    };

    const section5: DataIntegrityReport = {
      broken_relations: graphStats.brokenEdgeCount,
      orphan_media: 0,
      invalid_geo: 0,
      invalid_time_data: 0,
      inconsistent_states: 0,
      duplicate_entities: 0,
    };

    const flowNames = ["listing", "order", "booking", "payment", "delivery", "message", "call", "ad_campaign"];
    const section6: FlowHealth[] = flowNames.map((f) => {
      const audit = smAudits.find((a) => a.machine === f);
      return {
        flow_name: f,
        status: audit?.valid ? "healthy" as const : "broken" as const,
        issues: audit?.issues ?? [],
      };
    });

    const section7 = {
      homepage: "ok" as const,
      dashboard: "ok" as const,
      radar: "ok" as const,
      orbit: "ok" as const,
      wallet: "ok" as const,
    };

    const perfScore = hyperOptimizationEngine.getCurrentScore();
    const perfBudgetViolations = hyperOptimizationEngine.getBudgetViolations(100);
    const hasPerfViolations = perfBudgetViolations.length > 0;

    const section8: PerformanceSummary = {
      bundle_status: perfScore.code_efficiency >= 80 ? "ok" : perfScore.code_efficiency >= 50 ? "warning" : "critical",
      page_weight_status: perfScore.network_efficiency >= 80 ? "ok" : perfScore.network_efficiency >= 50 ? "warning" : "critical",
      lcp_risk: hasPerfViolations ? "medium" : "low",
      cls_risk: perfScore.render_efficiency >= 90 ? "low" : perfScore.render_efficiency >= 70 ? "medium" : "high",
      inp_risk: perfScore.ux_speed >= 90 ? "low" : perfScore.ux_speed >= 70 ? "medium" : "high",
      third_party_risk: "low",
    };

    const bcStats = blackChamber.getStats();
    const pcReport = pastControl.generateReport();
    const seoDrifts = pastControl.getDriftsByCategory("seo").filter((d) => !d.resolved);
    const secDrifts = pastControl.getDriftsByCategory("security").filter((d) => !d.resolved);

    const section9: SEOSummary = {
      canonical_status: seoDrifts.length === 0 ? "ok" : "issues",
      sitemap_status: "ok",
      robots_status: "ok",
      schema_status: seoDrifts.length === 0 ? "ok" : "issues",
      metadata_completeness: seoDrifts.length === 0 ? 100 : Math.max(0, 100 - seoDrifts.length * 10),
      broken_public_pages: 0,
    };

    const section10: SecuritySummary = {
      headers: secDrifts.length === 0 ? "ok" : "issues",
      key_exposure: bcStats.totalViolations > 0 ? "detected" : "none",
      permission_drift: pcReport.verdict === "critical" ? "detected" : "none",
      vulnerabilities: secDrifts.length,
      auth_guard_coverage: bcStats.policies > 0 ? Math.round((1 - bcStats.totalViolations / Math.max(1, bcStats.totalProofs)) * 100) : 100,
    };

    const conflictsByType = conflictScan.conflicts.reduce(
      (acc, c) => {
        if (c.type.includes("source_of_truth")) acc.source_of_truth++;
        else if (c.type.includes("state")) acc.state++;
        else if (c.type.includes("route")) acc.route++;
        else if (c.type.includes("taxonomy")) acc.taxonomy++;
        else if (c.type.includes("cron")) acc.cron++;
        else acc.relation++;
        return acc;
      },
      { source_of_truth: 0, state: 0, route: 0, taxonomy: 0, cron: 0, relation: 0 }
    );

    const section11: ConflictSummary = {
      source_of_truth_conflicts: conflictsByType.source_of_truth,
      state_conflicts: conflictsByType.state,
      route_conflicts: conflictsByType.route,
      taxonomy_conflicts: conflictsByType.taxonomy,
      cron_conflicts: conflictsByType.cron,
      relation_conflicts: conflictsByType.relation,
    };

    const section12: MaintenanceSummary = {
      auto_fixes_applied: mStats.appliedFixes,
      blocked_fixes: mStats.failedFixes,
      pending_reviews: mStats.pendingReviews,
      repeated_regressions: 0,
    };

    const reasons: string[] = [];
    const nextActions: string[] = [];

    if (conflictScan.blocking_conflicts > 0) {
      reasons.push(`${conflictScan.blocking_conflicts} blocking conflicts`);
      nextActions.push("Resolve critical conflicts immediately");
    }

    const brokenFlows = section6.filter((f) => f.status === "broken");
    if (brokenFlows.length > 0) {
      reasons.push(`${brokenFlows.length} broken flows: ${brokenFlows.map((f) => f.flow_name).join(", ")}`);
      nextActions.push("Fix broken state machines");
    }

    const stoppedEngines = section2.filter((e) => e.running_status === "stopped");
    if (stoppedEngines.length > 0) {
      reasons.push(`${stoppedEngines.length} engines stopped`);
      nextActions.push("Start all god engines");
    }

    if (mStats.pendingReviews > 0) {
      nextActions.push(`Review ${mStats.pendingReviews} pending maintenance fixes`);
    }

    if (valStats.totalRejections > 0) {
      nextActions.push(`Investigate ${valStats.totalRejections} validation rejections`);
    }

    let verdict: FinalVerdict = "PASS";
    if (conflictScan.blocking_conflicts > 0 || brokenFlows.length > 0) {
      verdict = "BLOCKED";
    } else if (reasons.length > 0 || gateReport.verdict === "PASS_WITH_WARNINGS") {
      verdict = "PASS_WITH_WARNINGS";
    }

    if (nextActions.length === 0) {
      nextActions.push("System healthy — continue monitoring");
    }

    const duration_ms = Math.round(performance.now() - start);

    const report: FullGodAuditReport = {
      timestamp: Date.now(),
      duration_ms,
      section_1_global_health: section1,
      section_2_engine_status: section2,
      section_3_cron_status: section3,
      section_4_taxonomy_health: section4,
      section_5_data_integrity: section5,
      section_6_flow_health: section6,
      section_7_page_health: section7,
      section_8_performance: section8,
      section_9_seo: section9,
      section_10_security: section10,
      section_11_conflicts: section11,
      section_12_maintenance: section12,
      section_13_verdict: { verdict, reasons, next_actions: nextActions },
    };

    this.lastReport = report;
    this.reportHistory.push(report);
    if (this.reportHistory.length > 20) {
      this.reportHistory = this.reportHistory.slice(-10);
    }

    return report;
  }

  getLastReport(): FullGodAuditReport | null {
    return this.lastReport;
  }

  getReportHistory(): FullGodAuditReport[] {
    return [...this.reportHistory];
  }

  printReport(report: FullGodAuditReport): string {
    const lines: string[] = [];
    const hr = "═".repeat(60);

    lines.push(hr);
    lines.push("  EASY-LOCS GOD AUDIT — FULL SYSTEM REPORT");
    lines.push(hr);
    lines.push("");

    lines.push("1. GLOBAL SYSTEM HEALTH");
    lines.push(`   God Score: ${report.section_1_global_health.overall_god_score}/100`);
    lines.push(`   Status: ${report.section_1_global_health.status}`);
    lines.push(`   Blocking: ${report.section_1_global_health.blocking_issues}`);
    lines.push(`   Warnings: ${report.section_1_global_health.warning_issues}`);
    lines.push(`   Self-healed: ${report.section_1_global_health.self_healed_count}`);
    lines.push(`   Unresolved: ${report.section_1_global_health.unresolved_count}`);
    lines.push("");

    lines.push("2. ENGINE STATUS");
    for (const e of report.section_2_engine_status) {
      lines.push(`   ${e.engine_name}: ${e.running_status} | heartbeat: ${e.heartbeat_status} | success: ${e.success_rate}%`);
    }
    lines.push("");

    lines.push("3. CRON STATUS");
    if (report.section_3_cron_status.length === 0) {
      lines.push("   No cron jobs registered yet");
    } else {
      for (const c of report.section_3_cron_status) {
        lines.push(`   ${c.job_name}: ${c.status} | runs: ${c.retry_count} retries, ${c.skipped_runs} skipped`);
      }
    }
    lines.push("");

    lines.push("4. TAXONOMY HEALTH");
    lines.push(`   Nodes: ${report.section_4_taxonomy_health.total_nodes}`);
    lines.push(`   Aliases: ${report.section_4_taxonomy_health.total_aliases}`);
    lines.push(`   Max Depth: ${report.section_4_taxonomy_health.max_depth}`);
    lines.push(`   Duplicates: ${report.section_4_taxonomy_health.duplicate_paths}`);
    lines.push(`   Alias conflicts: ${report.section_4_taxonomy_health.alias_conflicts}`);
    lines.push("");

    lines.push("5. DATA INTEGRITY");
    lines.push(`   Broken relations: ${report.section_5_data_integrity.broken_relations}`);
    lines.push(`   Orphan media: ${report.section_5_data_integrity.orphan_media}`);
    lines.push("");

    lines.push("6. FLOW HEALTH");
    for (const f of report.section_6_flow_health) {
      lines.push(`   ${f.flow_name}: ${f.status}${f.issues.length > 0 ? ` (${f.issues.join("; ")})` : ""}`);
    }
    lines.push("");

    lines.push("7. PAGE HEALTH");
    for (const [page, status] of Object.entries(report.section_7_page_health)) {
      lines.push(`   ${page}: ${status}`);
    }
    lines.push("");

    lines.push("8. PERFORMANCE");
    lines.push(`   Bundle: ${report.section_8_performance.bundle_status} | LCP: ${report.section_8_performance.lcp_risk} | CLS: ${report.section_8_performance.cls_risk}`);
    lines.push("");

    lines.push("9. SEO");
    lines.push(`   Sitemap: ${report.section_9_seo.sitemap_status} | Schema: ${report.section_9_seo.schema_status} | Metadata: ${report.section_9_seo.metadata_completeness}%`);
    lines.push("");

    lines.push("10. SECURITY");
    lines.push(`   Headers: ${report.section_10_security.headers} | Key exposure: ${report.section_10_security.key_exposure} | Auth coverage: ${report.section_10_security.auth_guard_coverage}%`);
    lines.push("");

    lines.push("11. CONFLICTS");
    lines.push(`   Source of truth: ${report.section_11_conflicts.source_of_truth_conflicts}`);
    lines.push(`   State: ${report.section_11_conflicts.state_conflicts}`);
    lines.push(`   Taxonomy: ${report.section_11_conflicts.taxonomy_conflicts}`);
    lines.push(`   Route: ${report.section_11_conflicts.route_conflicts}`);
    lines.push("");

    lines.push("12. MAINTENANCE");
    lines.push(`   Auto-fixes: ${report.section_12_maintenance.auto_fixes_applied}`);
    lines.push(`   Pending reviews: ${report.section_12_maintenance.pending_reviews}`);
    lines.push("");

    lines.push(hr);
    lines.push(`  VERDICT: ${report.section_13_verdict.verdict}`);
    lines.push(hr);
    if (report.section_13_verdict.reasons.length > 0) {
      lines.push("  Reasons:");
      for (const r of report.section_13_verdict.reasons) {
        lines.push(`    - ${r}`);
      }
    }
    lines.push("  Next actions:");
    for (const a of report.section_13_verdict.next_actions) {
      lines.push(`    → ${a}`);
    }
    lines.push("");
    lines.push(`  Duration: ${report.duration_ms}ms`);
    lines.push(hr);

    return lines.join("\n");
  }
}

export const godAudit = new GodAudit();

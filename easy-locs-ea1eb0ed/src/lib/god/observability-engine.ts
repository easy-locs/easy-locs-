import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";
import { antiConflictEngine } from "./anti-conflict-engine";
import { continuousAuditEngine } from "./continuous-audit-engine";
import { maintenanceEngine } from "./maintenance-engine";
import { cronOrchestrator } from "./cron-orchestrator";
import { qualityGateEngine } from "./quality-gate-engine";
import { stateMachineEngine } from "./state-machines";
import { taxonomyGodEngine } from "./taxonomy-god-engine";
import { contentGraph } from "./canonical-content-graph";

export type IncidentSeverity = "info" | "warning" | "error" | "critical";
export type IncidentStatus = "open" | "acknowledged" | "resolving" | "resolved" | "closed";

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: string;
  title: string;
  description: string;
  created_at: number;
  updated_at: number;
  resolved_at?: number;
  auto_healed: boolean;
}

export interface GodScore {
  overall: number;
  taxonomy: number;
  conflict: number;
  state_machines: number;
  data_integrity: number;
  maintenance: number;
  cron_health: number;
  quality_gate: number;
  engine_health: number;
}

export interface SystemSnapshot {
  timestamp: number;
  god_score: GodScore;
  incidents_open: number;
  incidents_total: number;
  engines_running: string[];
  engines_stopped: string[];
  cron_jobs_active: number;
  cron_jobs_failed: number;
  taxonomy_nodes: number;
  graph_nodes: number;
  graph_edges: number;
  conflicts_blocking: number;
  conflicts_total: number;
  maintenance_fixes: number;
  maintenance_pending_reviews: number;
  quality_gate_verdict: string;
  uptime_ms: number;
}

class ObservabilityEngine extends BaseEngine {
  private incidents: Incident[] = [];
  private snapshots: SystemSnapshot[] = [];
  private startTime = Date.now();
  private incidentCounter = 0;

  constructor() {
    super({
      id: "observability-engine",
      name: "Observability Engine",
      category: "god",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const snapshot = this.captureSnapshot();
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 1440) {
      this.snapshots = this.snapshots.slice(-720);
    }

    const actions: string[] = [];
    let findings = 0;

    if (snapshot.conflicts_blocking > 0) {
      findings += snapshot.conflicts_blocking;
      actions.push(`${snapshot.conflicts_blocking} blocking conflicts`);
    }

    if (snapshot.cron_jobs_failed > 0) {
      findings += snapshot.cron_jobs_failed;
      actions.push(`${snapshot.cron_jobs_failed} failed cron jobs`);
    }

    const openIncidents = this.incidents.filter((i) => i.status === "open");
    if (openIncidents.length > 0) {
      findings += openIncidents.length;
      actions.push(`${openIncidents.length} open incidents`);
    }

    if (snapshot.god_score.overall < 80) {
      actions.push(`God score: ${snapshot.god_score.overall}/100`);
    }

    return {
      level: snapshot.god_score.overall < 50 ? "act" : findings > 0 ? "detect" : "observe",
      findings,
      actions,
      duration: Math.round(performance.now() - start),
    };
  }

  captureSnapshot(): SystemSnapshot {
    const conflictStats = antiConflictEngine.getStats();
    const auditReport = continuousAuditEngine.getLastReport();
    const maintenanceStats = maintenanceEngine.getStats();
    const cronStats = cronOrchestrator.getStats();
    const gateReport = qualityGateEngine.getLastReport();
    const taxonomyStats = taxonomyGodEngine.getStats();
    const graphStats = contentGraph.getStats();

    const godEngines = [
      { id: "anti-conflict", running: antiConflictEngine.isRunning },
      { id: "continuous-audit", running: continuousAuditEngine.isRunning },
      { id: "maintenance", running: maintenanceEngine.isRunning },
      { id: "cron-orchestrator", running: cronOrchestrator.isRunning },
      { id: "quality-gate", running: qualityGateEngine.isRunning },
      { id: "observability", running: this.isRunning },
    ];

    const smAudits = stateMachineEngine.auditAll();
    const smScore = smAudits.every((a) => a.valid) ? 100 : Math.round((smAudits.filter((a) => a.valid).length / smAudits.length) * 100);

    const godScore: GodScore = {
      overall: 0,
      taxonomy: Math.min(100, 100 - taxonomyStats.conflictCount * 10),
      conflict: Math.max(0, 100 - conflictStats.totalConflicts * 5),
      state_machines: smScore,
      data_integrity: auditReport ? auditReport.overall_score : 100,
      maintenance: maintenanceStats.pendingReviews > 5 ? 70 : 100,
      cron_health: cronStats.totalFailure > 0 ? Math.max(0, 100 - (cronStats.totalFailure / Math.max(1, cronStats.totalRuns)) * 100) : 100,
      quality_gate: gateReport ? gateReport.overall_score : 100,
      engine_health: Math.round((godEngines.filter((e) => e.running).length / godEngines.length) * 100),
    };

    godScore.overall = Math.round(
      (godScore.taxonomy * 0.15 +
        godScore.conflict * 0.2 +
        godScore.state_machines * 0.15 +
        godScore.data_integrity * 0.15 +
        godScore.maintenance * 0.05 +
        godScore.cron_health * 0.1 +
        godScore.quality_gate * 0.1 +
        godScore.engine_health * 0.1)
    );

    return {
      timestamp: Date.now(),
      god_score: godScore,
      incidents_open: this.incidents.filter((i) => i.status === "open").length,
      incidents_total: this.incidents.length,
      engines_running: godEngines.filter((e) => e.running).map((e) => e.id),
      engines_stopped: godEngines.filter((e) => !e.running).map((e) => e.id),
      cron_jobs_active: cronStats.runningJobs,
      cron_jobs_failed: cronStats.totalFailure,
      taxonomy_nodes: taxonomyStats.totalNodes,
      graph_nodes: graphStats.totalNodes,
      graph_edges: graphStats.totalEdges,
      conflicts_blocking: conflictStats.blockingConflicts,
      conflicts_total: conflictStats.totalConflicts,
      maintenance_fixes: maintenanceStats.totalFixes,
      maintenance_pending_reviews: maintenanceStats.pendingReviews,
      quality_gate_verdict: gateReport?.verdict ?? "UNKNOWN",
      uptime_ms: Date.now() - this.startTime,
    };
  }

  createIncident(
    severity: IncidentSeverity,
    source: string,
    title: string,
    description: string
  ): Incident {
    this.incidentCounter++;
    const incident: Incident = {
      id: `INC-${this.incidentCounter.toString().padStart(5, "0")}`,
      severity,
      status: "open",
      source,
      title,
      description,
      created_at: Date.now(),
      updated_at: Date.now(),
      auto_healed: false,
    };
    this.incidents.push(incident);
    if (this.incidents.length > 1000) {
      this.incidents = this.incidents.slice(-500);
    }
    return incident;
  }

  resolveIncident(id: string, autoHealed = false): boolean {
    const incident = this.incidents.find((i) => i.id === id);
    if (!incident) return false;
    incident.status = "resolved";
    incident.resolved_at = Date.now();
    incident.updated_at = Date.now();
    incident.auto_healed = autoHealed;
    return true;
  }

  getOpenIncidents(): Incident[] {
    return this.incidents.filter((i) => i.status === "open" || i.status === "acknowledged");
  }

  getIncidentTimeline(limit = 50): Incident[] {
    return this.incidents.slice(-limit);
  }

  getGodScore(): GodScore {
    const latest = this.snapshots[this.snapshots.length - 1];
    if (latest) return latest.god_score;
    return this.captureSnapshot().god_score;
  }

  getLatestSnapshot(): SystemSnapshot {
    if (this.snapshots.length > 0) return this.snapshots[this.snapshots.length - 1];
    return this.captureSnapshot();
  }

  getSnapshotHistory(limit = 60): SystemSnapshot[] {
    return this.snapshots.slice(-limit);
  }
}

export const observabilityEngine = new ObservabilityEngine();

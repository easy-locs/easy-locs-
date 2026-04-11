import { sentinelEngineRegistry } from "./registry/engine-registry";
import { sentinelCronRegistry } from "./registry/cron-registry";
import { sentinelTaxonomyRegistry } from "./registry/taxonomy-registry";
import { sentinelConflictEngine } from "./conflict/sentinel-conflict-engine";
import { sentinelValidationEngine } from "./validation/sentinel-validation-engine";
import { sentinelHealthEngine } from "./health/sentinel-health-engine";
import { sentinelHealingEngine } from "./healing/sentinel-healing-engine";
import { sentinelWorkflowEngine } from "./workflows/sentinel-workflow-engine";
import { sentinelCronOrchestrator } from "./scheduling/sentinel-cron-orchestrator";
import { sentinelAuditEngine } from "./audit/sentinel-audit-engine";
import { sentinelQualityGate } from "./quality-gates/sentinel-quality-gate";
import { sentinelTelemetryEngine } from "./telemetry/sentinel-telemetry-engine";
import { sentinelIncidentEngine } from "./incidents/sentinel-incident-engine";
import { sentinelScoringEngine } from "./scoring/sentinel-scoring-engine";
import { sentinelReportEngine } from "./reports/sentinel-report-engine";
import { sentinelInvariantEngine } from "./invariants/invariant-engine";
import { sentinelSourceOfTruthRegistry } from "./registry/source-of-truth-registry";

type SentinelPhase = "idle" | "initializing" | "running" | "degraded" | "stopped";

class SentinelCore {
  private _phase: SentinelPhase = "idle";
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _initialAuditTimer: ReturnType<typeof setTimeout> | null = null;
  private _bootedAt = 0;
  private _lastHeartbeat = 0;

  get phase(): SentinelPhase { return this._phase; }
  get uptime(): number { return this._bootedAt > 0 ? Date.now() - this._bootedAt : 0; }

  async boot(): Promise<void> {
    if (this._phase !== "idle") return;
    this._phase = "initializing";
    this._bootedAt = Date.now();

    sentinelTelemetryEngine.emit("sentinel:boot_start", "sentinel-core");

    this.registerCoreEngines();
    this.registerSourceOfTruth();
    sentinelInvariantEngine.registerBuiltins();
    sentinelCronOrchestrator.registerBuiltinJobs();
    this.registerCronHandlers();

    sentinelAuditEngine.start();
    sentinelCronOrchestrator.startAll();

    this._phase = "running";
    sentinelTelemetryEngine.emit("sentinel:boot_complete", "sentinel-core", { boot_time_ms: Date.now() - this._bootedAt });

    this._heartbeatTimer = setInterval(() => this.heartbeat(), 30_000);

    this._initialAuditTimer = setTimeout(() => {
      this._initialAuditTimer = null;
      this.initialAudit();
    }, 8_000);
  }

  private registerCoreEngines(): void {
    const coreEngines: Array<{ id: string; name: string; domain: string; type: "core" | "infrastructure" | "audit"; crit: "critical" | "high" | "medium" }> = [
      { id: "sentinel-conflict", name: "Sentinel Conflict Engine", domain: "conflict", type: "core", crit: "critical" },
      { id: "sentinel-validation", name: "Sentinel Validation Engine", domain: "validation", type: "core", crit: "critical" },
      { id: "sentinel-health", name: "Sentinel Health Engine", domain: "health", type: "infrastructure", crit: "critical" },
      { id: "sentinel-healing", name: "Sentinel Healing Engine", domain: "healing", type: "infrastructure", crit: "high" },
      { id: "sentinel-workflow", name: "Sentinel Workflow Engine", domain: "workflows", type: "core", crit: "critical" },
      { id: "sentinel-audit", name: "Sentinel Audit Engine", domain: "audit", type: "audit", crit: "critical" },
      { id: "sentinel-quality", name: "Sentinel Quality Gate", domain: "quality", type: "core", crit: "critical" },
      { id: "sentinel-telemetry", name: "Sentinel Telemetry Engine", domain: "telemetry", type: "infrastructure", crit: "high" },
      { id: "sentinel-incidents", name: "Sentinel Incident Engine", domain: "incidents", type: "infrastructure", crit: "critical" },
      { id: "sentinel-scoring", name: "Sentinel Scoring Engine", domain: "scoring", type: "infrastructure", crit: "high" },
      { id: "sentinel-cron", name: "Sentinel Cron Orchestrator", domain: "scheduling", type: "infrastructure", crit: "critical" },
      { id: "sentinel-taxonomy", name: "Sentinel Taxonomy Registry", domain: "taxonomy", type: "core", crit: "high" },
      { id: "sentinel-invariants", name: "Sentinel Invariant Engine", domain: "invariants", type: "core", crit: "critical" },
      { id: "sentinel-report", name: "Sentinel Report Engine", domain: "reports", type: "audit", crit: "medium" },
    ];

    for (const e of coreEngines) {
      sentinelEngineRegistry.register({
        engine_id: e.id,
        engine_name: e.name,
        engine_domain: e.domain,
        engine_type: e.type,
        owner_domain: "sentinel",
        criticality: e.crit,
        enabled: true,
        heartbeat_interval_sec: 60,
        last_heartbeat_at: Date.now(),
        status: "healthy",
        version: "1.0.0",
        source_of_truth: "sentinel-core",
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }

    const domainEngines: Array<{ id: string; name: string; domain: string; crit: "critical" | "high" | "medium" }> = [
      { id: "food-engine", name: "Food Engine", domain: "food", crit: "high" },
      { id: "hotel-engine", name: "Hotel Engine", domain: "hotel", crit: "high" },
      { id: "service-engine", name: "Service Engine", domain: "service", crit: "high" },
      { id: "real-estate-engine", name: "Real Estate Engine", domain: "real-estate", crit: "medium" },
      { id: "delivery-engine", name: "Delivery Engine", domain: "delivery", crit: "critical" },
      { id: "flight-engine", name: "Flight Engine", domain: "flight", crit: "high" },
      { id: "health-engine", name: "Health Engine", domain: "health", crit: "medium" },
      { id: "shop-engine", name: "Shop Engine", domain: "shop", crit: "medium" },
      { id: "wallet-integrity-engine", name: "Wallet Integrity Engine", domain: "wallet", crit: "critical" },
      { id: "orbit-integrity-engine", name: "Orbit Integrity Engine", domain: "orbit", crit: "critical" },
      { id: "dashboard-card-engine", name: "Dashboard Card Engine", domain: "dashboard", crit: "high" },
      { id: "radar-sync-engine", name: "Radar Sync Engine", domain: "radar", crit: "high" },
      { id: "media-intelligence-engine", name: "Media Intelligence Engine", domain: "media", crit: "high" },
      { id: "search-ranking-engine", name: "Search & Ranking Engine", domain: "search", crit: "high" },
      { id: "seo-engine", name: "SEO Engine", domain: "seo", crit: "high" },
      { id: "perf-engine", name: "Performance Engine", domain: "performance", crit: "high" },
      { id: "security-engine", name: "Security Enforcement Engine", domain: "security", crit: "critical" },
    ];

    for (const e of domainEngines) {
      sentinelEngineRegistry.register({
        engine_id: e.id,
        engine_name: e.name,
        engine_domain: e.domain,
        engine_type: "domain",
        owner_domain: e.domain,
        criticality: e.crit,
        enabled: true,
        heartbeat_interval_sec: 120,
        last_heartbeat_at: Date.now(),
        status: "healthy",
        version: "1.0.0",
        source_of_truth: e.domain,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  }

  private registerSourceOfTruth(): void {
    const entries: Array<{ entity: string; field: string; table: string; domain: string }> = [
      { entity: "listing", field: "status", table: "listings", domain: "listing" },
      { entity: "listing", field: "canonical_path", table: "listings", domain: "taxonomy" },
      { entity: "message", field: "delivery_status", table: "messages", domain: "orbit" },
      { entity: "wallet", field: "balance", table: "wallet_accounts", domain: "wallet" },
      { entity: "transaction", field: "settlement_state", table: "transactions", domain: "wallet" },
      { entity: "order", field: "status", table: "orders", domain: "order" },
      { entity: "booking", field: "status", table: "bookings", domain: "booking" },
      { entity: "delivery", field: "status", table: "deliveries", domain: "delivery" },
      { entity: "payment", field: "status", table: "payments", domain: "wallet" },
      { entity: "user", field: "profile", table: "profiles", domain: "user" },
      { entity: "page", field: "canonical_meta", table: "page_registry", domain: "seo" },
      { entity: "card", field: "data_source", table: "card_registry", domain: "dashboard" },
      { entity: "media", field: "processing_status", table: "media_assets", domain: "media" },
      { entity: "taxonomy", field: "canonical_path", table: "taxonomy_registry", domain: "taxonomy" },
    ];

    for (const e of entries) {
      sentinelSourceOfTruthRegistry.register({
        entity_type: e.entity,
        field_name: e.field,
        owner_table: e.table,
        owner_domain: e.domain,
        fallback_source: null,
        notes: `Source of truth for ${e.entity}.${e.field}`,
        updated_at: Date.now(),
      });
    }
  }

  private registerCronHandlers(): void {
    sentinelCronOrchestrator.registerHandler("engine_heartbeat_check", async () => {
      const result = sentinelHealthEngine.checkAllHeartbeats();
      return { summary: `Healthy: ${result.healthy.length}, Degraded: ${result.degraded.length}, Unhealthy: ${result.unhealthy.length}` };
    });

    sentinelCronOrchestrator.registerHandler("conflict_scan", async () => {
      const conflicts = sentinelConflictEngine.runFullScan();
      return { summary: `Found ${conflicts.length} conflicts` };
    });

    sentinelCronOrchestrator.registerHandler("invariant_check", async () => {
      const results = sentinelInvariantEngine.checkAll();
      const failed = results.filter((r) => !r.passed);
      return { summary: `Checked ${results.length} invariants, ${failed.length} failed` };
    });

    sentinelCronOrchestrator.registerHandler("observability_snapshot", async () => {
      const scores = sentinelScoringEngine.calculate();
      const openIncidents = sentinelIncidentEngine.getOpen().length;
      sentinelTelemetryEngine.takeSnapshot(scores, openIncidents);
      return { summary: `Snapshot taken, global score: ${scores.global_score}` };
    });

    sentinelCronOrchestrator.registerHandler("quality_gate_refresh", async () => {
      const result = sentinelQualityGate.evaluate("deploy");
      return { summary: `Quality gate: ${result.verdict}, score: ${result.score}` };
    });

    sentinelCronOrchestrator.registerHandler("full_god_audit", async () => {
      const report = sentinelReportEngine.generate();
      return { summary: `Full audit: ${report.verdict}, global score: ${report.sections.global_scores.global_score}` };
    });

    sentinelCronOrchestrator.registerHandler("healing_scan", async () => {
      const healable = sentinelInvariantEngine.getAutoHealable();
      let healed = 0;
      for (const inv of healable) {
        try {
          await sentinelHealingEngine.heal("recalculate_quality_score", inv.invariant_id, inv.affected_entities[0] || "");
          healed++;
        } catch {}
      }
      return { summary: `Healed ${healed}/${healable.length} auto-healable issues` };
    });
  }

  private async heartbeat(): Promise<void> {
    this._lastHeartbeat = Date.now();

    for (const entry of sentinelEngineRegistry.getAll()) {
      if (entry.owner_domain === "sentinel") {
        sentinelEngineRegistry.updateHeartbeat(entry.engine_id);
      }
    }

    sentinelTelemetryEngine.increment("sentinel.heartbeats");

    const scores = sentinelScoringEngine.calculate();
    if (scores.global_score < 40 && this._phase === "running") {
      this._phase = "degraded";
      sentinelIncidentEngine.open("critical", "sentinel", "sentinel-core", "Sentinel Core degraded", `Global score dropped to ${scores.global_score}`);
      sentinelTelemetryEngine.emit("sentinel:degraded", "sentinel-core", { score: scores.global_score });
    } else if (scores.global_score >= 60 && this._phase === "degraded") {
      this._phase = "running";
      sentinelTelemetryEngine.emit("sentinel:recovered", "sentinel-core", { score: scores.global_score });
    }
  }

  private async initialAudit(): Promise<void> {
    sentinelTelemetryEngine.emit("sentinel:initial_audit_start", "sentinel-core");

    sentinelInvariantEngine.checkAll();
    sentinelConflictEngine.runFullScan();

    sentinelHealthEngine.checkAllHeartbeats();

    const scores = sentinelScoringEngine.calculate();
    sentinelTelemetryEngine.takeSnapshot(scores, sentinelIncidentEngine.getOpen().length);

    const report = sentinelReportEngine.generate();

    sentinelTelemetryEngine.emit("sentinel:initial_audit_complete", "sentinel-core", {
      verdict: report.verdict,
      global_score: scores.global_score,
      engines: sentinelEngineRegistry.size,
      crons: sentinelCronRegistry.getAll().length,
      invariants: sentinelInvariantEngine.getAll().length,
    });

    console.log(`[SENTINEL CORE] Initial audit: ${report.verdict} | Global Score: ${scores.global_score} | Engines: ${sentinelEngineRegistry.size} | Crons: ${sentinelCronRegistry.getAll().length}`);
  }

  shutdown(): void {
    this._phase = "stopped";
    sentinelAuditEngine.stop();
    sentinelCronOrchestrator.stopAll();
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._initialAuditTimer) {
      clearTimeout(this._initialAuditTimer);
      this._initialAuditTimer = null;
    }
    sentinelTelemetryEngine.emit("sentinel:shutdown", "sentinel-core", { uptime_ms: this.uptime });
  }

  getStatus(): {
    phase: SentinelPhase;
    uptime_ms: number;
    last_heartbeat: number;
    engines: number;
    crons: number;
    invariants: number;
    open_incidents: number;
    scores: ReturnType<typeof sentinelScoringEngine.getLastScores>;
  } {
    return {
      phase: this._phase,
      uptime_ms: this.uptime,
      last_heartbeat: this._lastHeartbeat,
      engines: sentinelEngineRegistry.size,
      crons: sentinelCronRegistry.getAll().length,
      invariants: sentinelInvariantEngine.getAll().length,
      open_incidents: sentinelIncidentEngine.getOpen().length,
      scores: sentinelScoringEngine.getLastScores(),
    };
  }

  async validate(entityType: string, entityId: string, domain: string, payload: Record<string, unknown>) {
    return sentinelValidationEngine.validate(entityType, entityId, domain, payload);
  }

  async checkQualityGate(checkpoint: "build" | "deploy" | "migration" | "import" | "taxonomy_publish" | "media_publish" | "banner_publish" | "route_change" | "schema_change") {
    return sentinelQualityGate.evaluate(checkpoint);
  }

  async runAudit(type?: string) {
    if (type) return sentinelAuditEngine.runAudit(type);
    return sentinelReportEngine.generate();
  }

  async heal(actionType: string, targetType: string, targetId: string) {
    return sentinelHealingEngine.heal(actionType, targetType, targetId);
  }

  async startWorkflow(workflowId: string, entityType: string, entityId: string, initialState?: Record<string, unknown>) {
    return sentinelWorkflowEngine.startWorkflow(workflowId, entityType, entityId, initialState);
  }
}

export const sentinelCore = new SentinelCore();

import { structuredLogger } from "@/lib/observability/structured-logger";
import { sentinelEngineRegistry } from "./registry/engine-registry";
import { sentinelCronRegistry } from "./registry/cron-registry";
import { sentinelTaxonomyRegistry } from "./registry/taxonomy-registry";
import { sentinelPageRegistry } from "./registry/page-registry";
import { sentinelCardRegistry } from "./registry/card-registry";
import { sentinelWorkflowRegistry } from "./registry/workflow-registry";
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
import { verificationRunner } from "./verification/verification-runner";
import type { VerificationFinalReport } from "./verification/verification-types";

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

    sentinelCronOrchestrator.registerHandler("taxonomy_integrity_scan", async () => {
      const allTaxonomies = sentinelTaxonomyRegistry.getAll();
      let orphans = 0;
      let duplicates = 0;
      const seen = new Set<string>();
      for (const t of allTaxonomies) {
        const key = `${t.family}:${t.canonical_path}`;
        if (seen.has(key)) duplicates++;
        seen.add(key);
        if (!t.parent_path && t.canonical_path.includes("/")) orphans++;
      }
      sentinelTelemetryEngine.emit("cron:taxonomy_integrity", "sentinel-cron", { total: allTaxonomies.length, orphans, duplicates });
      if (duplicates > 0) sentinelIncidentEngine.open("medium", "taxonomy", "taxonomy_integrity_scan", "Taxonomy duplicates", `${duplicates} duplicate paths`);
      return { summary: `Taxonomy: ${allTaxonomies.length} entries, ${orphans} orphans, ${duplicates} duplicates` };
    });

    sentinelCronOrchestrator.registerHandler("data_integrity_scan", async () => {
      const sotEntries = sentinelSourceOfTruthRegistry.getAll();
      let driftCount = 0;
      for (const entry of sotEntries) {
        if (!entry.owner_domain || !entry.owner_table) driftCount++;
      }
      sentinelTelemetryEngine.emit("cron:data_integrity", "sentinel-cron", { entries: sotEntries.length, drifts: driftCount });
      return { summary: `Data integrity: ${sotEntries.length} SOT entries checked, ${driftCount} drifts` };
    });

    sentinelCronOrchestrator.registerHandler("media_relevance_scan", async () => {
      const engines = sentinelEngineRegistry.getAll();
      const mediaEngine = engines.find((e) => e.engine_id === "media-intelligence-engine");
      const status = mediaEngine ? mediaEngine.status : "not_registered";
      sentinelTelemetryEngine.emit("cron:media_relevance", "sentinel-cron", { engine_status: status });
      return { summary: `Media relevance: engine ${status}, scan complete` };
    });

    sentinelCronOrchestrator.registerHandler("seo_public_page_scan", async () => {
      const pages = sentinelPageRegistry.getAll();
      let missingMeta = 0;
      let missingCanonical = 0;
      for (const page of pages) {
        if (!page.seo_template) missingMeta++;
        if (!page.canonical_id) missingCanonical++;
      }
      sentinelTelemetryEngine.emit("cron:seo_scan", "sentinel-cron", { pages: pages.length, missing_meta: missingMeta, missing_canonical: missingCanonical });
      return { summary: `SEO: ${pages.length} pages, ${missingMeta} missing meta, ${missingCanonical} missing canonical` };
    });

    sentinelCronOrchestrator.registerHandler("performance_budget_scan", async () => {
      const pages = sentinelPageRegistry.getAll();
      let overBudget = 0;
      for (const page of pages) {
        if (page.performance_budget > 0 && page.performance_budget < 1000) overBudget++;
      }
      sentinelTelemetryEngine.emit("cron:performance_budget", "sentinel-cron", { pages: pages.length, over_budget: overBudget });
      return { summary: `Performance: ${pages.length} pages scanned, ${overBudget} tight budgets` };
    });

    sentinelCronOrchestrator.registerHandler("route_integrity_scan", async () => {
      const pages = sentinelPageRegistry.getAll();
      const routes = new Set<string>();
      let duplicateRoutes = 0;
      for (const page of pages) {
        if (routes.has(page.route)) duplicateRoutes++;
        routes.add(page.route);
      }
      sentinelTelemetryEngine.emit("cron:route_integrity", "sentinel-cron", { routes: routes.size, duplicates: duplicateRoutes });
      return { summary: `Routes: ${routes.size} unique, ${duplicateRoutes} duplicates` };
    });

    sentinelCronOrchestrator.registerHandler("dashboard_card_integrity_scan", async () => {
      const cards = sentinelCardRegistry.getAll();
      let missingSource = 0;
      let missingStates = 0;
      for (const card of cards) {
        if (!card.data_source) missingSource++;
        if (!card.empty_state_defined || !card.loading_state_defined || !card.error_state_defined) missingStates++;
      }
      sentinelTelemetryEngine.emit("cron:card_integrity", "sentinel-cron", { cards: cards.length, missing_source: missingSource, missing_states: missingStates });
      return { summary: `Cards: ${cards.length} total, ${missingSource} missing source, ${missingStates} missing states` };
    });

    sentinelCronOrchestrator.registerHandler("wallet_integrity_scan", async () => {
      const engine = sentinelEngineRegistry.get("wallet-integrity-engine");
      const status = engine ? engine.status : "not_registered";
      const heartbeat = engine ? engine.last_heartbeat_at : 0;
      const staleSec = heartbeat > 0 ? Math.floor((Date.now() - heartbeat) / 1000) : -1;
      sentinelTelemetryEngine.emit("cron:wallet_integrity", "sentinel-cron", { status, stale_sec: staleSec });
      if (staleSec > 300) sentinelIncidentEngine.open("high", "wallet", "wallet_integrity_scan", "Wallet engine stale", `Last heartbeat ${staleSec}s ago`);
      return { summary: `Wallet: engine ${status}, heartbeat ${staleSec}s ago` };
    });

    sentinelCronOrchestrator.registerHandler("orbit_integrity_scan", async () => {
      const engine = sentinelEngineRegistry.get("orbit-integrity-engine");
      const status = engine ? engine.status : "not_registered";
      const heartbeat = engine ? engine.last_heartbeat_at : 0;
      const staleSec = heartbeat > 0 ? Math.floor((Date.now() - heartbeat) / 1000) : -1;
      sentinelTelemetryEngine.emit("cron:orbit_integrity", "sentinel-cron", { status, stale_sec: staleSec });
      if (staleSec > 300) sentinelIncidentEngine.open("high", "orbit", "orbit_integrity_scan", "Orbit engine stale", `Last heartbeat ${staleSec}s ago`);
      return { summary: `Orbit: engine ${status}, heartbeat ${staleSec}s ago` };
    });

    sentinelCronOrchestrator.registerHandler("delivery_integrity_scan", async () => {
      const engine = sentinelEngineRegistry.get("delivery-engine");
      const status = engine ? engine.status : "not_registered";
      const heartbeat = engine ? engine.last_heartbeat_at : 0;
      const staleSec = heartbeat > 0 ? Math.floor((Date.now() - heartbeat) / 1000) : -1;
      sentinelTelemetryEngine.emit("cron:delivery_integrity", "sentinel-cron", { status, stale_sec: staleSec });
      return { summary: `Delivery: engine ${status}, heartbeat ${staleSec}s ago` };
    });

    sentinelCronOrchestrator.registerHandler("flight_integrity_scan", async () => {
      const engine = sentinelEngineRegistry.get("flight-engine");
      const status = engine ? engine.status : "not_registered";
      const heartbeat = engine ? engine.last_heartbeat_at : 0;
      const staleSec = heartbeat > 0 ? Math.floor((Date.now() - heartbeat) / 1000) : -1;
      sentinelTelemetryEngine.emit("cron:flight_integrity", "sentinel-cron", { status, stale_sec: staleSec });
      return { summary: `Flight: engine ${status}, heartbeat ${staleSec}s ago` };
    });

    sentinelCronOrchestrator.registerHandler("security_scan", async () => {
      const engine = sentinelEngineRegistry.get("security-engine");
      const status = engine ? engine.status : "not_registered";
      const conflicts = sentinelConflictEngine.getByDomain("security");
      const openIncidents = sentinelIncidentEngine.getOpen().filter((i) => i.category === "security").length;
      sentinelTelemetryEngine.emit("cron:security_scan", "sentinel-cron", { engine_status: status, conflicts: conflicts.length, incidents: openIncidents });
      return { summary: `Security: engine ${status}, ${conflicts.length} conflicts, ${openIncidents} incidents` };
    });

    sentinelCronOrchestrator.registerHandler("dependency_scan", async () => {
      const allEngines = sentinelEngineRegistry.getAll();
      let deprecated = 0;
      let outdated = 0;
      for (const eng of allEngines) {
        if (eng.version && eng.version < "1.0.0") outdated++;
        if (!eng.enabled) deprecated++;
      }
      sentinelTelemetryEngine.emit("cron:dependency_scan", "sentinel-cron", { total: allEngines.length, deprecated, outdated });
      return { summary: `Dependencies: ${allEngines.length} engines, ${deprecated} disabled, ${outdated} pre-1.0` };
    });

    sentinelCronOrchestrator.registerHandler("stale_data_cleanup", async () => {
      const telemetryStats = sentinelTelemetryEngine.getStats();
      const cronHistory = sentinelCronOrchestrator.getRunHistory(500);
      const staleThreshold = Date.now() - 86_400_000;
      let cleaned = 0;
      for (const run of cronHistory) {
        if (run.ended_at < staleThreshold && run.status === "failed") cleaned++;
      }
      sentinelTelemetryEngine.emit("cron:stale_cleanup", "sentinel-cron", { events: telemetryStats.total_events, stale_runs: cleaned });
      return { summary: `Stale cleanup: ${cleaned} old failed runs identified, ${telemetryStats.total_events} telemetry events` };
    });

    sentinelCronOrchestrator.registerHandler("orphan_cleanup", async () => {
      const taxonomies = sentinelTaxonomyRegistry.getAll();
      let orphanCount = 0;
      for (const t of taxonomies) {
        if (!t.parent_path && t.canonical_path.includes("/")) orphanCount++;
      }
      sentinelTelemetryEngine.emit("cron:orphan_cleanup", "sentinel-cron", { orphans: orphanCount });
      return { summary: `Orphan cleanup: ${orphanCount} orphan taxonomy entries found` };
    });

    sentinelCronOrchestrator.registerHandler("cache_revalidate", async () => {
      const engines = sentinelEngineRegistry.getAll();
      let revalidated = 0;
      for (const eng of engines) {
        if (eng.owner_domain === "sentinel") {
          sentinelEngineRegistry.updateHeartbeat(eng.engine_id);
          revalidated++;
        }
      }
      sentinelTelemetryEngine.emit("cron:cache_revalidate", "sentinel-cron", { revalidated });
      return { summary: `Cache revalidate: ${revalidated} sentinel engines refreshed` };
    });

    sentinelCronOrchestrator.registerHandler("workflow_health_check", async () => {
      const workflows = sentinelWorkflowRegistry.getAll();
      let healthy = 0;
      let stale = 0;
      for (const wf of workflows) {
        if (wf.enabled) healthy++;
        else stale++;
      }
      const activeRuns = sentinelWorkflowEngine.getActiveRuns();
      sentinelTelemetryEngine.emit("cron:workflow_health", "sentinel-cron", { total: workflows.length, healthy, stale, active_runs: activeRuns.length });
      return { summary: `Workflows: ${workflows.length} registered, ${healthy} healthy, ${stale} disabled, ${activeRuns.length} active runs` };
    });

    sentinelCronOrchestrator.registerHandler("incident_check", async () => {
      const openIncidents = sentinelIncidentEngine.getOpen();
      const criticalCount = openIncidents.filter((i) => i.severity === "critical").length;
      const highCount = openIncidents.filter((i) => i.severity === "high").length;
      sentinelTelemetryEngine.emit("cron:incident_check", "sentinel-cron", { open: openIncidents.length, critical: criticalCount, high: highCount });
      if (criticalCount > 3) {
        sentinelTelemetryEngine.emit("sentinel:incident_surge", "sentinel-cron", { critical: criticalCount });
      }
      return { summary: `Incidents: ${openIncidents.length} open (${criticalCount} critical, ${highCount} high)` };
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

    structuredLogger.info("system", "sentinel_initial_audit", `Initial audit: ${report.verdict} | Global Score: ${scores.global_score} | Engines: ${sentinelEngineRegistry.size} | Crons: ${sentinelCronRegistry.getAll().length}`);
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

  async runVerification(): Promise<VerificationFinalReport> {
    sentinelTelemetryEngine.emit("sentinel:verification_start", "sentinel-core");
    const report = await verificationRunner.runFullVerification();
    sentinelTelemetryEngine.emit("sentinel:verification_complete", "sentinel-core", {
      verdict: report.verdict,
      global_score: report.global_score,
      phases: report.phases_completed.length,
      tests_run: report.total_tests_run,
      tests_passed: report.total_tests_passed,
      tests_failed: report.total_tests_failed,
      blockers: report.critical_blockers.length,
    });
    structuredLogger.info("system", "sentinel_verification", `${report.verdict} | Score: ${report.global_score}/100 | Tests: ${report.total_tests_passed}/${report.total_tests_run} | Phases: ${report.phases_completed.length}/8 | Blockers: ${report.critical_blockers.length} | Proofs: ${report.proofs.length}`);
    return report;
  }
}

export const sentinelCore = new SentinelCore();

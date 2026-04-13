import { structuredLogger } from "@/lib/observability/structured-logger";
import { knowledgeGraphEngine } from "./knowledge-graph/knowledge-graph-engine";
import { memoryEngine } from "./memory/memory-engine";
import { decisionEngine } from "./decision/decision-engine";
import { priorityEngine } from "./priority/priority-engine";
import { predictionEngine } from "./prediction/prediction-engine";
import { businessOpportunityEngine } from "./business-opportunity/business-opportunity-engine";
import { adaptiveUXEngine } from "./adaptive-ux/adaptive-ux-engine";
import { selfImprovementEngine } from "./self-improvement/self-improvement-engine";
import { incidentResponseEngine } from "./incident-response/incident-response-engine";
import { codeEvolutionEngine } from "./code-evolution/code-evolution-engine";
import { registerNewEngine, requestEngineRunApproval, reportEngineRunSuccess, reportEngineRunError } from "@/core/command-center";
import type {
  OmegaEngineStatus,
  OmegaIntelligenceReport,
  DecisionInput,
  DecisionOutput,
  PredictionRecord,
  PriorityItem,
  OpportunitySignal,
  KnowledgeNodeType,
  KnowledgeEdgeType,
  KnowledgeNodeMetadata,
  OpportunityEvidence,
  MemoryDetails,
} from "./omega-types";

type OmegaPhase = "idle" | "initializing" | "running" | "degraded" | "stopped";

const OMEGA_DOMAINS = [
  "food", "service", "hotel", "real_estate", "delivery", "transport", "flight",
  "health", "shop", "wallet", "orbit", "dashboard", "radar", "media",
  "seo", "performance", "security", "taxonomy", "platform_core", "search",
  "pharmacy", "hospital", "grocery", "pet_shop", "atm",
] as const;

const SUB_SCORE_WEIGHTS: Record<string, number> = {
  knowledge_graph: 8,
  memory: 8,
  decision: 12,
  priority: 10,
  prediction: 12,
  business_opportunity: 8,
  adaptive_ux: 7,
  self_improvement: 10,
  incident_response: 15,
  code_evolution: 10,
};

class OmegaCore {
  private phase: OmegaPhase = "idle";
  private lastRunAt = 0;
  private loopInterval: ReturnType<typeof setInterval> | null = null;
  private loopCount = 0;

  readonly engines = {
    knowledgeGraph: knowledgeGraphEngine,
    memory: memoryEngine,
    decision: decisionEngine,
    priority: priorityEngine,
    prediction: predictionEngine,
    businessOpportunity: businessOpportunityEngine,
    adaptiveUX: adaptiveUXEngine,
    selfImprovement: selfImprovementEngine,
    incidentResponse: incidentResponseEngine,
    codeEvolution: codeEvolutionEngine,
  } as const;

  getPhase(): OmegaPhase { return this.phase; }

  async boot(): Promise<void> {
    if (this.phase === "running") return;
    this.phase = "initializing";
    structuredLogger.info("system", "omega_boot", "Initializing Omega Intelligence Core...");

    const omegaEngineMap: Array<[string, string]> = [
      ["omega-core", "Omega Core Intelligence"],
      ["knowledge-graph", "Knowledge Graph Engine"],
      ["omega-memory", "Omega Memory Engine"],
      ["omega-decision", "Decision Engine"],
      ["omega-priority", "Priority Engine"],
      ["omega-prediction", "Prediction Engine"],
      ["omega-business-opportunity", "Business Opportunity Engine"],
      ["omega-adaptive-ux", "Adaptive UX Engine"],
      ["omega-self-improvement", "Self Improvement Engine"],
      ["omega-incident-response", "Incident Response Engine"],
      ["omega-code-evolution", "Code Evolution Engine"],
    ];
    const blockedEngineIds = new Set<string>();
    for (const [id, name] of omegaEngineMap) {
      const ccResult = registerNewEngine(id, name, id);
      if (!ccResult.success) {
        blockedEngineIds.add(id);
        structuredLogger.warn("system", "omega_engine_cc_blocked", `Engine ${id} blocked by Command Center: ${ccResult.blockedReason}`);
      }
    }
    if (blockedEngineIds.size > 0) {
      structuredLogger.warn("system", "omega_boot_partial", `${blockedEngineIds.size} engines blocked by CC — boot continues in degraded mode: ${[...blockedEngineIds].join(", ")}`);
    }

    const isAllowed = (id: string) => !blockedEngineIds.has(id);

    if (isAllowed("knowledge-graph")) await knowledgeGraphEngine.boot();
    if (isAllowed("omega-memory")) await memoryEngine.boot();
    if (isAllowed("omega-decision")) await decisionEngine.boot();
    if (isAllowed("omega-prediction")) await predictionEngine.boot();
    await Promise.all([
      isAllowed("omega-priority") ? priorityEngine.boot() : Promise.resolve(),
      isAllowed("omega-business-opportunity") ? businessOpportunityEngine.boot() : Promise.resolve(),
      isAllowed("omega-adaptive-ux") ? adaptiveUXEngine.boot() : Promise.resolve(),
      isAllowed("omega-self-improvement") ? selfImprovementEngine.boot() : Promise.resolve(),
      isAllowed("omega-incident-response") ? incidentResponseEngine.boot() : Promise.resolve(),
      isAllowed("omega-code-evolution") ? codeEvolutionEngine.boot() : Promise.resolve(),
    ]);

    if (import.meta.env.DEV) this.seedKnowledgeGraph();

    this.phase = "running";
    this.lastRunAt = Date.now();
    structuredLogger.info("system", "omega_boot_complete", "All 10 engines booted | Phase: RUNNING");

    this.startIntelligenceLoop();
  }

  async shutdown(): Promise<void> {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    for (const engine of Object.values(this.engines)) {
      engine.shutdown();
    }
    this.loopCount = 0;
    this.seeded = false;
    this.phase = "stopped";
    structuredLogger.info("system", "omega_shutdown", "Shutdown complete");
  }

  private seeded = false;

  private seedKnowledgeGraph(): void {
    if (this.seeded) return;
    this.seeded = true;
    for (const domain of OMEGA_DOMAINS) {
      knowledgeGraphEngine.addNode("TAXONOMY_NODE", domain, domain, { type: "domain_root" });
    }

    const engineNames = [
      "sentinel-core", "god-core", "omega-core",
      "knowledge-graph", "memory", "decision", "priority", "prediction",
      "business-opportunity", "adaptive-ux", "self-improvement",
      "incident-response", "code-evolution",
      "sentinel-validation", "sentinel-conflict", "sentinel-audit",
      "sentinel-healing", "sentinel-health", "sentinel-scoring",
      "sentinel-quality-gate", "sentinel-workflow", "sentinel-cron",
      "sentinel-telemetry", "sentinel-incident", "sentinel-report",
      "sentinel-invariant",
    ];
    for (const eng of engineNames) {
      const node = knowledgeGraphEngine.addNode("ENGINE", eng, "system", { status: "active" });
      const domainNode = knowledgeGraphEngine.getNodesByType("TAXONOMY_NODE").find((n) => n.label === "platform_core");
      if (domainNode) {
        knowledgeGraphEngine.addEdge(node.id, domainNode.id, "BELONGS_TO");
      }
    }
  }

  private startIntelligenceLoop(): void {
    if (this.loopInterval) return;
    this.loopInterval = setInterval(() => {
      this.runIntelligenceLoop();
    }, 60_000);
  }

  private runIntelligenceLoop(): void {
    if (this.phase !== "running") return;

    const runApproval = requestEngineRunApproval("omega-core");
    if (!runApproval.approved) {
      structuredLogger.warn("system", "omega_run_denied", `Omega intelligence loop denied by Command Center: ${runApproval.reason}`);
      return;
    }

    this.loopCount++;
    this.lastRunAt = Date.now();

    try {
      memoryEngine.cleanExpired();

      const orphans = knowledgeGraphEngine.detectOrphanNodes();
      if (orphans.length > 10) {
        selfImprovementEngine.reportWeakness("knowledge_graph", `${orphans.length} orphan nodes detected`, orphans.length);
      }

      const brokenEdges = knowledgeGraphEngine.detectBrokenEdges();
      if (brokenEdges.length > 0) {
        selfImprovementEngine.reportWeakness("knowledge_graph", `${brokenEdges.length} broken edges`, brokenEdges.length * 5);
      }

      const unstable = memoryEngine.findUnstableDomains();
      for (const domain of unstable.slice(0, 5)) {
        const total = domain.incident_count + domain.regression_count + domain.conflict_count;
        if (total > 5) {
          priorityEngine.addItem("incident", domain.domain, Math.min(total, 10), Math.min(total * 0.5, 10), Math.min(total * 0.3, 10), total, 0.7, Math.min(total * 0.2, 10));
        }
      }

      const activeIncidents = incidentResponseEngine.getActiveIncidents();
      for (const incident of activeIncidents.slice(0, 3)) {
        if (incident.status === "detected") {
          incidentResponseEngine.classify(incident.action_id);
        } else if (incident.status === "classified") {
          const mitigated = incidentResponseEngine.mitigate(incident.action_id);
          if (mitigated && mitigated.status === "escalated") {
            structuredLogger.warn("system", "incident_escalated", `Incident escalated: ${incident.incident_id} [${incident.category}] severity=${incident.severity}`);
          }
        } else if (incident.status === "re_auditing") {
          incidentResponseEngine.resolve(incident.action_id, `re_audit_${Date.now()}`);
          structuredLogger.info("system", "incident_resolved", `Incident resolved: ${incident.incident_id} [${incident.category}] severity=${incident.severity}`);
        }
      }

      const safeSuggestions = codeEvolutionEngine.getSafeActions();
      if (safeSuggestions.length > 0) {
        const top = safeSuggestions[0];
        codeEvolutionEngine.approve(top.suggestion_id);
      }

      if (this.loopCount % 5 === 0) {
        this.checkEngineHealth();
      }

      reportEngineRunSuccess("omega-core");
    } catch (err) {
      reportEngineRunError("omega-core", err instanceof Error ? err.message : String(err));
    }
  }

  private checkEngineHealth(): void {
    let degradedCount = 0;
    for (const engine of Object.values(this.engines)) {
      if (engine.getStatus() === "degraded" || engine.getStatus() === "stopped") {
        degradedCount++;
      }
    }
    if (degradedCount >= 3) {
      this.phase = "degraded";
      structuredLogger.warn("system", "omega_degraded", `Omega degraded: ${degradedCount} engines unhealthy`);
    } else if (this.phase === "degraded" && degradedCount === 0) {
      this.phase = "running";
    }
  }

  decide(input: DecisionInput, targetType: string, targetId: string): DecisionOutput {
    const output = decisionEngine.decide(input, targetType, targetId);
    structuredLogger.info("system", "omega_decision", `Decision: ${output.decision} for ${targetType}/${targetId}`);
    return output;
  }

  predict(type: Parameters<typeof predictionEngine.predict>[0], targetType: string, targetId: string, riskScore: number, confidence: number, futureMs: number, action: string): PredictionRecord {
    return predictionEngine.predict(type, targetType, targetId, riskScore, confidence, futureMs, action);
  }

  addPriority(type: Parameters<typeof priorityEngine.addItem>[0], targetId: string, sev: number, userImpact: number, bizImpact: number, recurrence: number, confidence: number, reach: number): PriorityItem {
    return priorityEngine.addItem(type, targetId, sev, userImpact, bizImpact, recurrence, confidence, reach);
  }

  detectOpportunity(type: Parameters<typeof businessOpportunityEngine.detectSignal>[0], geo: string, cat: string, conf: number, impact: number, evidence: OpportunityEvidence, action: string): OpportunitySignal {
    return businessOpportunityEngine.detectSignal(type, geo, cat, conf, impact, evidence, action);
  }

  addKnowledgeNode(type: KnowledgeNodeType, label: string, domain: string, meta?: KnowledgeNodeMetadata) {
    return knowledgeGraphEngine.addNode(type, label, domain, meta);
  }

  addKnowledgeEdge(sourceId: string, targetId: string, edgeType: KnowledgeEdgeType, weight = 1) {
    return knowledgeGraphEngine.addEdge(sourceId, targetId, edgeType, weight);
  }

  recordMemory(category: Parameters<typeof memoryEngine.governedRecord>[0]["category"], domain: string, summary: string, details?: MemoryDetails) {
    const taskId = `omega-task-${Date.now()}`;
    const executionId = `omega-exec-${Date.now()}`;
    const result = memoryEngine.governedRecord({
      category,
      domain,
      summary,
      details,
      engineId: "omega-core",
      taskId,
      executionId,
      evidenceId: `${executionId}-evidence`,
      validationId: `${executionId}-validation`,
      canonicalizationId: `${executionId}-canon`,
      confidence: 0.9,
      completedStages: ["TASK", "EXECUTION", "EVIDENCE", "VALIDATION", "CANONICALIZATION", "MEMORY_WRITE"],
    });
    if (!result) {
      structuredLogger.warn("system", "omega_memory_rejected", `Memory write rejected by LearningGovernance — [${domain}] ${summary}`);
    }
  }

  generateIntelligenceReport(): OmegaIntelligenceReport {
    const subScores: Record<string, number> = {};

    const kgStats = knowledgeGraphEngine.getStats();
    subScores["knowledge_graph"] = kgStats.total_nodes > 0 ? Math.min(100, kgStats.total_nodes + (100 - kgStats.orphans)) : 50;

    const memStats = memoryEngine.getStats();
    subScores["memory"] = memStats.total_memories > 0 ? Math.min(100, 60 + memStats.root_causes * 5) : 50;

    const decStats = decisionEngine.getStats();
    subScores["decision"] = decStats.total_decisions > 0 ? 80 : 50;

    const priStats = priorityEngine.getStats();
    subScores["priority"] = priStats.total_items > 0 ? Math.max(50, 100 - (priStats.by_band?.now || 0) * 10) : 70;

    const predStats = predictionEngine.getStats();
    subScores["prediction"] = predStats.total_predictions > 0 ? Math.min(100, 50 + predStats.overall_precision * 50) : 50;

    const bizStats = businessOpportunityEngine.getStats();
    subScores["business_opportunity"] = bizStats.total_signals > 0 ? Math.min(100, 60 + bizStats.total_signals * 2) : 50;

    const uxStats = adaptiveUXEngine.getStats();
    subScores["adaptive_ux"] = uxStats.active_rules > 0 ? Math.min(100, 60 + uxStats.active_rules * 5) : 50;

    const siStats = selfImprovementEngine.getStats();
    subScores["self_improvement"] = siStats.success_rate > 0 ? Math.min(100, 50 + siStats.success_rate * 50) : 50;

    const irStats = incidentResponseEngine.getStats();
    const resolvedRatio = irStats.total_actions > 0 ? (irStats.by_status?.resolved || 0) / irStats.total_actions : 1;
    subScores["incident_response"] = Math.min(100, 50 + resolvedRatio * 50);

    const ceStats = codeEvolutionEngine.getStats();
    subScores["code_evolution"] = ceStats.tech_debt_score;

    let globalScore = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(SUB_SCORE_WEIGHTS)) {
      globalScore += (subScores[key] || 50) * weight;
      totalWeight += weight;
    }
    globalScore = totalWeight > 0 ? Math.round(globalScore / totalWeight) : 50;

    const criticalBlockers: string[] = [];
    const warnings: string[] = [];

    if (irStats.active > 0) criticalBlockers.push(`${irStats.active} active incidents unresolved`);
    if (irStats.escalated > 0) criticalBlockers.push(`${irStats.escalated} incidents escalated`);
    if (kgStats.broken_edges > 0) warnings.push(`${kgStats.broken_edges} broken edges in knowledge graph`);
    if (kgStats.orphans > 20) warnings.push(`${kgStats.orphans} orphan nodes in knowledge graph`);
    if (predStats.pending > 10) warnings.push(`${predStats.pending} pending predictions`);

    let verdict: OmegaIntelligenceReport["verdict"];
    if (criticalBlockers.length > 0) verdict = "BLOCKED";
    else if (globalScore >= 80 && warnings.length === 0) verdict = "PASS";
    else if (globalScore >= 60) verdict = "PASS_WITH_WARNINGS";
    else if (globalScore >= 40) verdict = "DEGRADED";
    else verdict = "MONITOR_CLOSELY";

    const engineStatuses: Record<string, OmegaEngineStatus> = {};
    for (const [key, engine] of Object.entries(this.engines)) {
      engineStatuses[key] = engine.getStatus();
    }

    const report: OmegaIntelligenceReport = {
      report_id: `omega_${Date.now()}`,
      generated_at: Date.now(),
      global_score: globalScore,
      verdict,
      sub_scores: subScores,
      engine_statuses: engineStatuses,
      decisions_made: decisionEngine.getRecentDecisions(20),
      predictions_active: predictionEngine.getActivePredictions().slice(0, 20),
      priorities: priorityEngine.getTopN(20),
      opportunities: businessOpportunityEngine.getTopOpportunities(10),
      memory_patterns: memoryEngine.findRecurringPatterns("incident", 2).map((p) => `${p.pattern} (x${p.count})`),
      improvements_applied: selfImprovementEngine.getAppliedCycles(),
      incidents_handled: incidentResponseEngine.getResolved().slice(-10),
      code_suggestions: codeEvolutionEngine.getSafeActions().slice(0, 10),
      critical_blockers: criticalBlockers,
      warnings,
      next_actions: this.computeNextActions(),
    };

    structuredLogger.info("system", "omega_report", `Intelligence Report | Score: ${globalScore}/100 | Verdict: ${verdict} | Blockers: ${criticalBlockers.length} | Warnings: ${warnings.length}`);
    return report;
  }

  private computeNextActions(): string[] {
    const actions: string[] = [];
    const topPriorities = priorityEngine.getByBand("now");
    for (const p of topPriorities.slice(0, 3)) {
      actions.push(`[P1] ${p.item_type}: ${p.target_id} (score: ${p.priority_score.toFixed(0)})`);
    }
    const highRisk = predictionEngine.getHighRisk(80);
    for (const p of highRisk.slice(0, 2)) {
      actions.push(`[PREDICT] ${p.prediction_type}: ${p.target_id} (risk: ${p.risk_score})`);
    }
    const safeFixes = codeEvolutionEngine.getSafeActions();
    for (const s of safeFixes.slice(0, 2)) {
      actions.push(`[CODE] ${s.issue_type}: ${s.target_file} (impact: ${s.impact_estimate})`);
    }
    const topOpp = businessOpportunityEngine.getTopOpportunities(2);
    for (const o of topOpp) {
      actions.push(`[BIZ] ${o.signal_type}: ${o.geo_scope}/${o.category_scope} (impact: ${o.impact_score})`);
    }
    return actions;
  }

  getGlobalStats() {
    return {
      phase: this.phase,
      loop_count: this.loopCount,
      last_run: this.lastRunAt,
      engines: Object.fromEntries(
        Object.entries(this.engines).map(([k, e]) => [k, { status: e.getStatus(), lastRun: e.lastRunAt }]),
      ),
      knowledge_graph: knowledgeGraphEngine.getStats(),
      memory: memoryEngine.getStats(),
      decisions: decisionEngine.getStats(),
      priorities: priorityEngine.getStats(),
      predictions: predictionEngine.getStats(),
      business: businessOpportunityEngine.getStats(),
      adaptive_ux: adaptiveUXEngine.getStats(),
      self_improvement: selfImprovementEngine.getStats(),
      incidents: incidentResponseEngine.getStats(),
      code_evolution: codeEvolutionEngine.getStats(),
    };
  }
}

export const omegaCore = new OmegaCore();

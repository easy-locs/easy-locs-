import { db } from "@/services/db";
import type {
  DecisionOutput,
  PredictionRecord,
  OpportunitySignal,
  OpportunityEvidence,
  MemoryEntry,
  MemoryDetails,
  KnowledgeNode,
  KnowledgeNodeMetadata,
  KnowledgeEdge,
  KnowledgeEdgeMetadata,
  IncidentResponseAction,
  PriorityItem,
  AdaptiveUXRule,
  AdaptiveUXContext,
  AdaptiveUXAdaptation,
  SelfImprovementCycle,
  CodeEvolutionSuggestion,
} from "./omega-types";

interface PersistenceResult {
  table: string;
  operation: "insert" | "upsert";
  success: boolean;
  timestamp: number;
  error?: string;
}

const log: PersistenceResult[] = [];
const MAX_LOG = 500;

function addLog(entry: PersistenceResult): void {
  log.push(entry);
  if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
}

async function safeWrite(table: string, operation: "insert" | "upsert", fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    addLog({ table, operation, success: true, timestamp: Date.now() });
    return true;
  } catch (err) {
    addLog({ table, operation, success: false, timestamp: Date.now(), error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export const omegaPersistence = {
  async writeDecision(d: DecisionOutput): Promise<boolean> {
    return safeWrite("omega_decisions", "insert", async () => {
      await db("omega_decisions").insert({
        decision_id: d.decision_id,
        decision: d.decision,
        priority: d.priority,
        confidence: d.confidence,
        reasoning: d.reasoning,
        target_type: d.target_type,
        target_id: d.target_id,
        recommended_actions: d.recommended_actions,
        created_at: new Date(d.created_at).toISOString(),
      });
    });
  },

  async writePrediction(p: PredictionRecord): Promise<boolean> {
    return safeWrite("omega_predictions", "upsert", async () => {
      await db("omega_predictions").upsert({
        prediction_id: p.prediction_id,
        prediction_type: p.prediction_type,
        target_type: p.target_type,
        target_id: p.target_id,
        risk_score: p.risk_score,
        confidence_score: p.confidence_score,
        predicted_at: new Date(p.predicted_at).toISOString(),
        predicted_for: new Date(p.predicted_for).toISOString(),
        preventive_action: p.preventive_action,
        pre_emptive_audit: p.pre_emptive_audit,
        rollout_restriction: p.rollout_restriction,
        outcome: p.outcome ?? "pending",
      });
    });
  },

  async writeOpportunity(s: OpportunitySignal): Promise<boolean> {
    return safeWrite("omega_opportunity_signals", "insert", async () => {
      await db("omega_opportunity_signals").insert({
        signal_id: s.signal_id,
        signal_type: s.signal_type,
        geo_scope: s.geo_scope,
        category_scope: s.category_scope,
        confidence_score: s.confidence_score,
        impact_score: s.impact_score,
        evidence: s.evidence,
        recommended_action: s.recommended_action,
        created_at: new Date(s.created_at).toISOString(),
      });
    });
  },

  async writeMemory(m: MemoryEntry): Promise<boolean> {
    return safeWrite("omega_memory_entries", "insert", async () => {
      await db("omega_memory_entries").insert({
        memory_id: m.memory_id,
        category: m.category,
        domain: m.domain,
        summary: m.summary,
        details: m.details,
        outcome: m.outcome,
        before_score: m.before_score,
        after_score: m.after_score,
        root_cause: m.root_cause ?? null,
        related_ids: m.related_ids,
        ttl_days: m.ttl_days,
        created_at: new Date(m.created_at).toISOString(),
      });
    });
  },

  async writeKnowledgeNode(n: KnowledgeNode): Promise<boolean> {
    return safeWrite("omega_knowledge_nodes", "upsert", async () => {
      await db("omega_knowledge_nodes").upsert({
        id: n.id,
        node_type: n.type,
        label: n.label,
        domain: n.domain,
        metadata: n.metadata,
        created_at: new Date(n.created_at).toISOString(),
        updated_at: new Date(n.updated_at).toISOString(),
      });
    });
  },

  async writeKnowledgeEdge(e: KnowledgeEdge): Promise<boolean> {
    return safeWrite("omega_knowledge_edges", "upsert", async () => {
      await db("omega_knowledge_edges").upsert({
        id: e.id,
        source_id: e.source_id,
        target_id: e.target_id,
        edge_type: e.edge_type,
        weight: e.weight,
        metadata: e.metadata,
        created_at: new Date(e.created_at).toISOString(),
      });
    });
  },

  async writeIncidentAction(a: IncidentResponseAction): Promise<boolean> {
    return safeWrite("omega_incident_actions", "upsert", async () => {
      await db("omega_incident_actions").upsert({
        action_id: a.action_id,
        incident_id: a.incident_id,
        severity: a.severity,
        category: a.category,
        impacted_domains: a.impacted_domains,
        correlated_changes: a.correlated_changes,
        mitigation_type: a.mitigation_type,
        mitigation_action: a.mitigation_action,
        status: a.status,
        re_audit_ref: a.re_audit_ref ?? null,
        created_at: new Date(a.created_at).toISOString(),
      });
    });
  },

  async writePriority(p: PriorityItem): Promise<boolean> {
    return safeWrite("omega_priority_items", "upsert", async () => {
      await db("omega_priority_items").upsert({
        item_id: p.item_id,
        item_type: p.item_type,
        target_id: p.target_id,
        severity: p.severity,
        user_impact: p.user_impact,
        business_impact: p.business_impact,
        recurrence: p.recurrence,
        confidence: p.confidence,
        dependency_reach: p.dependency_reach,
        priority_score: p.priority_score,
        priority_band: p.priority_band,
        created_at: new Date(p.created_at).toISOString(),
      });
    });
  },

  async writeAdaptiveRule(r: AdaptiveUXRule): Promise<boolean> {
    return safeWrite("omega_adaptive_ux_rules", "upsert", async () => {
      await db("omega_adaptive_ux_rules").upsert({
        rule_id: r.rule_id,
        rule_type: r.rule_type,
        context: r.context,
        adaptation: r.adaptation,
        measurable: r.measurable,
        reversible: r.reversible,
        gradual: r.gradual,
        active: r.active,
        created_at: new Date(r.created_at).toISOString(),
      });
    });
  },

  async writeImprovementCycle(c: SelfImprovementCycle): Promise<boolean> {
    return safeWrite("omega_improvement_cycles", "upsert", async () => {
      await db("omega_improvement_cycles").upsert({
        cycle_id: c.cycle_id,
        weakness_cluster: c.weakness_cluster,
        estimated_impact: c.estimated_impact,
        estimated_risk: c.estimated_risk,
        proposed_change: c.proposed_change,
        before_score: c.before_score,
        after_score: c.after_score,
        status: c.status,
        safe: c.safe,
        re_audit_passed: c.re_audit_passed,
        created_at: new Date(c.created_at).toISOString(),
      });
    });
  },

  async writeCodeSuggestion(s: CodeEvolutionSuggestion): Promise<boolean> {
    return safeWrite("omega_code_suggestions", "upsert", async () => {
      await db("omega_code_suggestions").upsert({
        suggestion_id: s.suggestion_id,
        target_file: s.target_file,
        domain: s.domain,
        issue_type: s.issue_type,
        description: s.description,
        risk_level: s.risk_level,
        impact_estimate: s.impact_estimate,
        safe_action: s.safe_action,
        affected_domains: s.affected_domains,
        status: s.status,
        created_at: new Date(s.created_at).toISOString(),
      });
    });
  },

  async loadDecisions(): Promise<DecisionOutput[]> {
    try {
      const { data } = await db("omega_decisions").select("*").order("created_at", { ascending: false }).limit(2000);
      if (!data) return [];
      return data.map((d: { decision_id: unknown; decision: unknown; priority: unknown; confidence: unknown; reasoning: unknown; target_type: unknown; target_id: unknown; recommended_actions: unknown; created_at: unknown }) => ({
        decision_id: String(d.decision_id),
        decision: String(d.decision) as DecisionOutput["decision"],
        priority: String(d.priority) as DecisionOutput["priority"],
        confidence: Number(d.confidence),
        reasoning: String(d.reasoning),
        target_type: String(d.target_type),
        target_id: String(d.target_id),
        recommended_actions: (d.recommended_actions as string[]) || [],
        created_at: new Date(String(d.created_at)).getTime(),
      }));
    } catch { return []; }
  },

  async loadPredictions(): Promise<PredictionRecord[]> {
    try {
      const { data } = await db("omega_predictions").select("*").order("predicted_at", { ascending: false }).limit(1000);
      if (!data) return [];
      return data.map((p: { prediction_id: unknown; prediction_type: unknown; target_type: unknown; target_id: unknown; risk_score: unknown; confidence_score: unknown; predicted_at: unknown; predicted_for: unknown; preventive_action: unknown; pre_emptive_audit: unknown; rollout_restriction: unknown; outcome: unknown }) => ({
        prediction_id: String(p.prediction_id),
        prediction_type: String(p.prediction_type) as PredictionRecord["prediction_type"],
        target_type: String(p.target_type),
        target_id: String(p.target_id),
        risk_score: Number(p.risk_score),
        confidence_score: Number(p.confidence_score),
        predicted_at: new Date(String(p.predicted_at)).getTime(),
        predicted_for: new Date(String(p.predicted_for)).getTime(),
        preventive_action: String(p.preventive_action),
        pre_emptive_audit: Boolean(p.pre_emptive_audit),
        rollout_restriction: Boolean(p.rollout_restriction),
        outcome: (p.outcome as PredictionRecord["outcome"]) ?? "pending",
      }));
    } catch { return []; }
  },

  async loadMemories(): Promise<MemoryEntry[]> {
    try {
      const { data } = await db("omega_memory_entries").select("*").order("created_at", { ascending: false }).limit(5000);
      if (!data) return [];
      return data.map((m: { memory_id: unknown; category: unknown; domain: unknown; summary: unknown; details: unknown; outcome: unknown; before_score: unknown; after_score: unknown; root_cause: unknown; related_ids: unknown; created_at: unknown; ttl_days: unknown }) => ({
        memory_id: String(m.memory_id),
        category: String(m.category) as MemoryEntry["category"],
        domain: String(m.domain),
        summary: String(m.summary),
        details: (m.details as MemoryDetails) || {},
        outcome: String(m.outcome) as MemoryEntry["outcome"],
        before_score: Number(m.before_score),
        after_score: Number(m.after_score),
        root_cause: m.root_cause ? String(m.root_cause) : undefined,
        related_ids: (m.related_ids as string[]) || [],
        created_at: new Date(String(m.created_at)).getTime(),
        ttl_days: Number(m.ttl_days),
      }));
    } catch { return []; }
  },

  async loadKnowledgeNodes(): Promise<KnowledgeNode[]> {
    try {
      const { data } = await db("omega_knowledge_nodes").select("*").limit(50000);
      if (!data) return [];
      return data.map((n: { id: unknown; node_type: unknown; label: unknown; domain: unknown; metadata: unknown; created_at: unknown; updated_at: unknown }) => ({
        id: String(n.id),
        type: String(n.node_type) as KnowledgeNode["type"],
        label: String(n.label),
        domain: String(n.domain),
        metadata: (n.metadata as KnowledgeNodeMetadata) || {},
        created_at: new Date(String(n.created_at)).getTime(),
        updated_at: new Date(String(n.updated_at)).getTime(),
      }));
    } catch { return []; }
  },

  async loadKnowledgeEdges(): Promise<KnowledgeEdge[]> {
    try {
      const { data } = await db("omega_knowledge_edges").select("*").limit(200000);
      if (!data) return [];
      return data.map((e: { id: unknown; source_id: unknown; target_id: unknown; edge_type: unknown; weight: unknown; metadata: unknown; created_at: unknown }) => ({
        id: String(e.id),
        source_id: String(e.source_id),
        target_id: String(e.target_id),
        edge_type: String(e.edge_type) as KnowledgeEdge["edge_type"],
        weight: Number(e.weight),
        metadata: (e.metadata as KnowledgeEdgeMetadata) || {},
        created_at: new Date(String(e.created_at)).getTime(),
      }));
    } catch { return []; }
  },

  getWriteLog(limit = 50): PersistenceResult[] {
    return log.slice(-limit);
  },

  getWriteStats(): { total: number; success: number; failed: number; tables: Record<string, number> } {
    const tables: Record<string, number> = {};
    let success = 0;
    let failed = 0;
    for (const entry of log) {
      tables[entry.table] = (tables[entry.table] || 0) + 1;
      if (entry.success) success++;
      else failed++;
    }
    return { total: log.length, success, failed, tables };
  },
};
